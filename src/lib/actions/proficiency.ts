"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { saveAssessmentResult } from "@/lib/actions/tracking"
import { oneroster, qti } from "@/lib/clients"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"

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
	onerosterUserSourcedId: string,
	onerosterComponentResourceSourcedId: string,
	attemptNumber: number,
	sessionResults: QuestionResult[],
	onerosterCourseSourcedId: string
) {
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
		throw errors.new("resource data is null")
	}

	const metadataResult = ResourceMetadataSchema.safeParse(resourceResult.data.metadata)
	if (!metadataResult.success) {
		logger.error("invalid resource metadata", { resourceSourcedId, error: metadataResult.error })
		throw errors.wrap(metadataResult.error, "invalid resource metadata")
	}
	// Default to 'exercise' if khanLessonType is not present, though it should be for quizzes/tests.
	const lessonType =
		metadataResult.data.type === "qti" ? (metadataResult.data.khanLessonType ?? "exercise") : "exercise"

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
	if (lessonType === "unittest") {
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

			// Get the most recent result
			const results = resultsResult.data
			if (results.length > 0) {
				const latestResult = results.sort(
					(a, b) => new Date(b.scoreDate || 0).getTime() - new Date(a.scoreDate || 0).getTime()
				)[0]

				if (latestResult && typeof latestResult.score === "number") {
					return { onerosterResourceSourcedId, currentScore: latestResult.score }
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
		const percentageCorrect = performance.correctCount / performance.totalCount
		const isUnitTest = lessonType === "unittest"

		// Calculate proficiency score for this exercise
		let proficiencyScore = percentageCorrect // Store the EXACT percentage, not discrete levels

		// Special case: Unit test mastery upgrade
		// If student was already at 100% (1.0) and gets unit test question correct → Mastered (1.1)
		if (lessonType === "unittest" && percentageCorrect === 1.0) {
			const currentScore = currentProficiencyMap.get(exerciseId)
			if (currentScore && currentScore >= 1.0) {
				proficiencyScore = 1.1 // Mastered level
				logger.info("upgrading skill to mastered", {
					exerciseId,
					previousScore: currentScore,
					newScore: proficiencyScore,
					reason: "perfect skill maintained on unit test"
				})
			}
		}

		// ADDED: Special case - Unit test softer penalty for wrong answers
		// Only apply penalty if they got 0% correct (typically 1 question wrong)
		// This handles both single-question (common) and multi-question (rare) unit tests:
		// - Single question: 0/1 = 0% → Apply penalty
		// - Multiple questions: Only if ALL wrong (0/2, 0/3, etc) → Apply penalty
		// - Partial credit (1/2, 2/3): Normal percentage calculation applies
		if (lessonType === "unittest" && percentageCorrect === 0) {
			const currentScore = currentProficiencyMap.get(exerciseId)
			if (currentScore !== undefined && currentScore > 0) {
				// Apply softer penalty based on current proficiency level
				if (currentScore >= 1.0) {
					// Was proficient (100%) → Drop to familiar (70%)
					proficiencyScore = 0.7
					logger.info("applying softer unit test penalty", {
						exerciseId,
						previousScore: currentScore,
						newScore: proficiencyScore,
						reason: "proficient to familiar on unit test miss"
					})
				} else if (currentScore >= 0.7) {
					// Was familiar (70-99%) → Drop to attempted (50%)
					proficiencyScore = 0.5
					logger.info("applying softer unit test penalty", {
						exerciseId,
						previousScore: currentScore,
						newScore: proficiencyScore,
						reason: "familiar to attempted on unit test miss"
					})
				} else {
					// Was attempted or lower → Keep their current score (no further penalty)
					proficiencyScore = currentScore
					logger.info("maintaining current score on unit test miss", {
						exerciseId,
						previousScore: currentScore,
						newScore: proficiencyScore,
						reason: "already at attempted level or below"
					})
				}
			}
		}

		logger.info("calculated exercise proficiency", {
			exerciseId,
			score: proficiencyScore,
			performance,
			currentScore: currentProficiencyMap.get(exerciseId),
			isUnitTest
		})

		// Only save if there's a meaningful update
		// We save if:
		// 1. Score is greater than 0 (any positive progress)
		// 2. Unit test with penalty to apply (softer penalty logic)
		// 3. Score is 0 but user had previous progress (downgrade)
		// 4. Score is 0 and this is from a quiz/test (new failure to record)
		if (
			proficiencyScore > 0 ||
			(lessonType === "unittest" && percentageCorrect === 0 && currentProficiencyMap.has(exerciseId)) ||
			(proficiencyScore === 0 && currentProficiencyMap.has(exerciseId)) ||
			(proficiencyScore === 0 && (lessonType === "quiz" || lessonType === "unittest"))
		) {
			updatePromises.push(
				saveAssessmentResult(
					exerciseId,
					proficiencyScore,
					performance.correctCount,
					performance.totalCount,
					onerosterUserSourcedId,
					onerosterCourseSourcedId
				)
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
