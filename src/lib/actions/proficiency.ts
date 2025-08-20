"use server"

import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { saveAssessmentResult } from "@/lib/actions/tracking"
import { getCurrentUserSourcedId } from "@/lib/authorization"
import { oneroster, qti } from "@/lib/clients"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import { calculateProficiencyScore } from "@/lib/proficiency/core"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
import { assertPercentageInteger } from "@/lib/utils/score"

interface ExercisePerformance {
	exerciseId: string
	correctCount: number
	totalCount: number
}

interface QuestionResult {
	qtiItemId: string
	isCorrect: boolean | null
	isReported?: boolean
}

/**
 * Analyzes an assessment completion and updates individual exercise proficiency
 * based on granular question-level performance. This implements Khan Academy-style
 * mastery learning where performance on comprehensive assessments updates the
 * proficiency of individual skills that were tested.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 * @param attemptNumber - The specific attempt number to analyze.
 * @param sessionResults - An array of question results from the client session.
 * @param onerosterCourseSourcedId - The sourcedId of the course for cache invalidation.
 */
export async function updateProficiencyFromAssessment(
	onerosterComponentResourceSourcedId: string,
	attemptNumber: number,
	sessionResults: QuestionResult[],
	onerosterCourseSourcedId: string
) {
	const { userId } = await auth()
	if (!userId) {
		logger.error("updateProficiencyFromAssessment failed: user not authenticated")
		throw errors.new("user not authenticated")
	}
	const onerosterUserSourcedId = await getCurrentUserSourcedId(userId)
	logger.info("starting granular proficiency analysis from session results", {
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		attemptNumber,
		sessionResultCount: sessionResults.length
	})

	// Step 1: Fetch the lessonType from the resource's metadata in OneRoster
	const componentResourceResult = await errors.try(oneroster.getComponentResource(onerosterComponentResourceSourcedId))
	if (componentResourceResult.error) {
		logger.error("failed to fetch component resource for proficiency analysis", {
			onerosterComponentResourceSourcedId,
			error: componentResourceResult.error
		})
		throw errors.wrap(componentResourceResult.error, "fetch component resource")
	}
	if (!componentResourceResult.data) {
		logger.error("component resource data is null", { componentResourceId: onerosterComponentResourceSourcedId })
		throw errors.new("component resource data is null")
	}
	const resourceSourcedId = componentResourceResult.data.resource.sourcedId

	const resourceResult = await errors.try(oneroster.getResource(resourceSourcedId))
	if (resourceResult.error) {
		logger.error("failed to fetch resource for proficiency analysis", {
			resourceSourcedId,
			error: resourceResult.error
		})
		throw errors.wrap(resourceResult.error, "fetch resource")
	}
	if (!resourceResult.data) {
		logger.error("resource data is null", { resourceSourcedId })
		throw errors.new("resource data is null")
	}

	const metadataResult = ResourceMetadataSchema.safeParse(resourceResult.data.metadata)
	if (!metadataResult.success) {
		logger.error("invalid resource metadata", { resourceSourcedId, error: metadataResult.error })
		throw errors.wrap(metadataResult.error, "invalid resource metadata")
	}
	// Map khanActivityType to lesson type for proficiency tracking
	let lessonType = "exercise"
	if (metadataResult.data.khanActivityType === "Quiz") {
		lessonType = "quiz"
	} else if (metadataResult.data.khanActivityType === "UnitTest") {
		lessonType = "unittest"
	} else if (metadataResult.data.khanActivityType === "CourseChallenge") {
		lessonType = "coursechallenge"
	}

	// Step 2: Map questions to exercises using QTI metadata
	const qtiItemIdToOneRosterResourceSourcedIdMap = new Map<string, string>()
	const questionResultsFromSession = sessionResults
		.filter((q) => !q.isReported)
		.map((q) => ({ id: q.qtiItemId, correct: q.isCorrect }))

	const qtiMetadataPromises = questionResultsFromSession.map(async (question) => {
		const itemResult = await errors.try(qti.getAssessmentItem(question.id))
		if (itemResult.error) {
			logger.warn("failed to fetch QTI item metadata for question", {
				qtiItemId: question.id,
				error: itemResult.error
			})
			return null
		}

		const khanExerciseId = itemResult.data.metadata?.khanExerciseId
		if (!khanExerciseId) {
			logger.warn("question missing exercise ID in QTI metadata", {
				qtiItemId: question.id,
				metadata: itemResult.data.metadata
			})
			return null
		}

		const onerosterResourceSourcedId = `nice_${khanExerciseId}`
		logger.debug("mapped question to exercise", {
			qtiItemId: question.id,
			khanExerciseId,
			onerosterResourceSourcedId
		})
		return { qtiItemId: question.id, onerosterResourceSourcedId }
	})

	const qtiMetadataResults = await Promise.all(qtiMetadataPromises)
	for (const result of qtiMetadataResults) {
		if (result) {
			qtiItemIdToOneRosterResourceSourcedIdMap.set(result.qtiItemId, result.onerosterResourceSourcedId)
		}
	}

	if (qtiItemIdToOneRosterResourceSourcedIdMap.size === 0) {
		logger.info("no questions could be mapped to exercises", { onerosterComponentResourceSourcedId })
		return { success: true, exercisesUpdated: 0 }
	}

	// Step 3: Get current proficiency levels for mastery upgrade logic
	const currentProficiencyMap = new Map<string, number>()
	if (lessonType === "unittest" || lessonType === "coursechallenge") {
		// For unit tests, we need to check current proficiency to handle mastery upgrades
		const onerosterResourceSourcedIds = Array.from(new Set(qtiItemIdToOneRosterResourceSourcedIdMap.values()))

		// Get current results for all exercises being tested
		const currentResultsPromises = onerosterResourceSourcedIds.map(async (onerosterResourceSourcedId) => {
			const resultsResult = await errors.try(
				oneroster.getAllResults({
					filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${getAssessmentLineItemId(onerosterResourceSourcedId)}'`
				})
			)

			if (resultsResult.error) {
				logger.warn("failed to fetch current proficiency for mastery check", {
					onerosterResourceSourcedId,
					error: resultsResult.error
				})
				return null
			}

			// Strictly consider only new attempt-based IDs for interactive assessments
			const strictLineItemId = getAssessmentLineItemId(onerosterResourceSourcedId)
			const baseIdPrefix = `nice_${onerosterUserSourcedId}_${strictLineItemId}_attempt_`
			const results = resultsResult.data.filter((r) => {
				if (typeof r.sourcedId !== "string") return false
				if (!r.sourcedId.startsWith(baseIdPrefix)) return false
				const suffix = r.sourcedId.slice(baseIdPrefix.length)
				return /^\d+$/.test(suffix)
			})
			// Get the most recent result
			if (results.length > 0) {
				const latestResult = results.sort(
					(a, b) => new Date(b.scoreDate || 0).getTime() - new Date(a.scoreDate || 0).getTime()
				)[0]

				if (latestResult && typeof latestResult.score === "number") {
					const normalized = latestResult.score <= 1.1 ? latestResult.score * 100 : latestResult.score
					return { onerosterResourceSourcedId, currentScore: normalized }
				}
			}

			return null
		})

		const currentResults = await Promise.all(currentResultsPromises)
		for (const result of currentResults) {
			if (result) {
				currentProficiencyMap.set(result.onerosterResourceSourcedId, result.currentScore)
			}
		}
	}

	// Step 4: Aggregate performance by exercise
	const performanceMap = new Map<string, ExercisePerformance>()

	for (const question of questionResultsFromSession) {
		const onerosterResourceSourcedId = qtiItemIdToOneRosterResourceSourcedIdMap.get(question.id)
		if (!onerosterResourceSourcedId) {
			logger.warn("could not map question to exercise", { qtiItemId: question.id, onerosterComponentResourceSourcedId })
			continue
		}

		if (!performanceMap.has(onerosterResourceSourcedId)) {
			performanceMap.set(onerosterResourceSourcedId, {
				exerciseId: onerosterResourceSourcedId,
				correctCount: 0,
				totalCount: 0
			})
		}

		const performance = performanceMap.get(onerosterResourceSourcedId)
		if (performance) {
			performance.totalCount++
			if (question.correct) {
				performance.correctCount++
			}

			// ADDED: Log each question's contribution to help debug
			logger.debug("processing question for exercise", {
				qtiItemId: question.id,
				onerosterResourceSourcedId,
				isCorrect: question.correct,
				runningCorrect: performance.correctCount,
				runningTotal: performance.totalCount
			})
		}
	}

	if (performanceMap.size === 0) {
		logger.info("no exercises found with answered questions to update", { onerosterComponentResourceSourcedId })
		return { success: true, exercisesUpdated: 0 }
	}

	// Step 5: Calculate proficiency scores with mastery upgrade logic
	const updatePromises: Promise<unknown>[] = []
	for (const [exerciseId, performance] of performanceMap.entries()) {
		const percentageCorrect = performance.totalCount > 0 ? performance.correctCount / performance.totalCount : 0

		// REFACTORED: Use the centralized proficiency calculation service
		const proficiencyScore = calculateProficiencyScore({
			percentageCorrect,
			lessonType,
			currentScore: currentProficiencyMap.get(exerciseId)
		})

		logger.info("calculated exercise proficiency", {
			exerciseId,
			score: proficiencyScore,
			performance,
			currentScore: currentProficiencyMap.get(exerciseId),
			lessonType
		})

		// Only save if there's a meaningful update
		const shouldSaveResult =
			proficiencyScore > 0 ||
			(percentageCorrect === 0 &&
				(lessonType === "unittest" || lessonType === "coursechallenge") &&
				currentProficiencyMap.has(exerciseId)) ||
			(proficiencyScore === 0 && currentProficiencyMap.has(exerciseId)) ||
			(proficiencyScore === 0 &&
				(lessonType === "quiz" || lessonType === "unittest" || lessonType === "coursechallenge"))

		if (shouldSaveResult) {
			updatePromises.push(
				saveAssessmentResult({
					onerosterResourceSourcedId: exerciseId,
					score: assertPercentageInteger(proficiencyScore, "proficiency score"),
					correctAnswers: performance.correctCount,
					totalQuestions: performance.totalCount,
					onerosterCourseSourcedId
				})
			)
		}
	}

	const results = await Promise.allSettled(updatePromises)
	const successfulUpdates = results.filter((r) => r.status === "fulfilled").length

	logger.info("granular proficiency analysis complete", {
		onerosterComponentResourceSourcedId,
		exercisesAnalyzed: performanceMap.size,
		exercisesUpdated: successfulUpdates,
		questionsMapped: qtiItemIdToOneRosterResourceSourcedIdMap.size,
		totalQuestions: questionResultsFromSession.length
	})

	return { success: true, exercisesUpdated: successfulUpdates }
}
