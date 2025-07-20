"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { saveAssessmentResult } from "@/lib/actions/tracking"
import { oneroster, powerpath, qti } from "@/lib/clients"

interface ExercisePerformance {
	exerciseId: string
	correctCount: number
	totalCount: number
}

/**
 * Analyzes an assessment completion and updates individual exercise proficiency
 * based on granular question-level performance. This implements Khan Academy-style
 * mastery learning where performance on comprehensive assessments updates the
 * proficiency of individual skills that were tested.
 *
 * @param {string} userSourcedId - The OneRoster sourcedId of the user.
 * @param {string} assessmentSourcedId - The OneRoster sourcedId of the completed assessment.
 * @param {number} attemptNumber - The specific attempt number to analyze.
 */
export async function updateProficiencyFromAssessment(
	userSourcedId: string,
	assessmentSourcedId: string,
	attemptNumber: number // ADDED: This is the crucial new parameter
) {
	logger.info("starting granular proficiency analysis", { userSourcedId, assessmentSourcedId, attemptNumber })

	// Step 1: Get the graded results from PowerPath for the SPECIFIC attempt
	// Note: PowerPath auto-finalizes assessments when all questions are answered,
	// so we don't need to explicitly finalize. This also allows retakes to work smoothly.
	const progressResult = await errors.try(
		powerpath.getAssessmentProgress(userSourcedId, assessmentSourcedId, attemptNumber)
	)
	if (progressResult.error) {
		logger.error("failed to get assessment progress for proficiency analysis", {
			assessmentSourcedId,
			attemptNumber,
			error: progressResult.error
		})
		// Return early but don't throw - we've done our best
		return { success: true, exercisesUpdated: 0 }
	}
	const { questions: questionResults, lessonType, finalized, score } = progressResult.data

	// ADDED: Log the raw PowerPath response to debug scoring issues
	logger.info("powerpath assessment progress response", {
		assessmentSourcedId,
		attemptNumber,
		finalized,
		score,
		questionCount: questionResults.length,
		questions: questionResults
	})

	// Early return if assessment isn't finalized or has no question results
	if (!finalized || score === undefined || questionResults.some((q) => q.correct === undefined)) {
		logger.warn("assessment not fully graded yet, skipping proficiency analysis", {
			assessmentSourcedId,
			finalized,
			hasScore: score !== undefined,
			questionsWithResults: questionResults.filter((q) => q.correct !== undefined).length,
			totalQuestions: questionResults.length
		})
		return { success: true, exercisesUpdated: 0 }
	}

	// Step 2: Map questions to exercises using QTI metadata
	const questionIdToExerciseIdMap = new Map<string, string>()

	// Fetch QTI metadata for all questions in parallel for better performance
	const qtiMetadataPromises = questionResults.map(async (question) => {
		const itemResult = await errors.try(qti.getAssessmentItem(question.id))
		if (itemResult.error) {
			logger.warn("failed to fetch QTI item metadata for question", {
				questionId: question.id,
				error: itemResult.error
			})
			return null
		}

		const exerciseId = itemResult.data.metadata?.khanExerciseId
		if (!exerciseId) {
			logger.warn("question missing exercise ID in QTI metadata", {
				questionId: question.id,
				metadata: itemResult.data.metadata
			})
			return null
		}

		// Convert from raw exercise ID to OneRoster sourcedId format
		const oneRosterExerciseId = `nice:${exerciseId}`

		logger.debug("mapped question to exercise", {
			questionId: question.id,
			rawExerciseId: exerciseId,
			oneRosterExerciseId
		})

		return { questionId: question.id, exerciseId: oneRosterExerciseId }
	})

	// Wait for all QTI metadata fetches to complete
	const qtiMetadataResults = await Promise.all(qtiMetadataPromises)

	// Build the mapping from successful results
	for (const result of qtiMetadataResults) {
		if (result) {
			questionIdToExerciseIdMap.set(result.questionId, result.exerciseId)
		}
	}

	if (questionIdToExerciseIdMap.size === 0) {
		logger.info("no questions could be mapped to exercises", { assessmentSourcedId })
		return { success: true, exercisesUpdated: 0 }
	}

	// Step 3: Get current proficiency levels for mastery upgrade logic
	const currentProficiencyMap = new Map<string, number>()
	if (lessonType === "unit-test") {
		// For unit tests, we need to check current proficiency to handle mastery upgrades
		const exerciseIds = Array.from(new Set(questionIdToExerciseIdMap.values()))

		// Get current results for all exercises being tested
		const currentResultsPromises = exerciseIds.map(async (exerciseId) => {
			const resultsResult = await errors.try(
				oneroster.getAllResults({
					filter: `student.sourcedId='${userSourcedId}' AND assessmentLineItem.sourcedId='${exerciseId}'`
				})
			)

			if (resultsResult.error) {
				logger.warn("failed to fetch current proficiency for mastery check", {
					exerciseId,
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
					return { exerciseId, currentScore: latestResult.score }
				}
			}

			return null
		})

		const currentResults = await Promise.all(currentResultsPromises)
		for (const result of currentResults) {
			if (result) {
				currentProficiencyMap.set(result.exerciseId, result.currentScore)
			}
		}
	}

	// Step 4: Aggregate performance by exercise
	const performanceMap = new Map<string, ExercisePerformance>()

	for (const question of questionResults) {
		const exerciseId = questionIdToExerciseIdMap.get(question.id)
		if (!exerciseId) {
			logger.warn("could not map question to exercise", { questionId: question.id, assessmentSourcedId })
			continue
		}

		if (!performanceMap.has(exerciseId)) {
			performanceMap.set(exerciseId, { exerciseId, correctCount: 0, totalCount: 0 })
		}

		const performance = performanceMap.get(exerciseId)
		if (performance) {
			performance.totalCount++
			if (question.correct) {
				performance.correctCount++
			}

			// ADDED: Log each question's contribution to help debug
			logger.debug("processing question for exercise", {
				questionId: question.id,
				exerciseId,
				isCorrect: question.correct,
				runningCorrect: performance.correctCount,
				runningTotal: performance.totalCount
			})
		}
	}

	if (performanceMap.size === 0) {
		logger.info("no exercises found with answered questions to update", { assessmentSourcedId })
		return { success: true, exercisesUpdated: 0 }
	}

	// Step 5: Calculate proficiency scores with mastery upgrade logic
	const updatePromises: Promise<unknown>[] = []
	for (const [exerciseId, performance] of performanceMap.entries()) {
		const percentageCorrect = performance.correctCount / performance.totalCount
		const isUnitTest = lessonType === "unit-test"

		// Calculate proficiency score for this exercise
		let proficiencyScore = percentageCorrect // Store the EXACT percentage, not discrete levels

		// Special case: Unit test mastery upgrade
		// If student was already at 100% (1.0) and gets unit test question correct → Mastered (1.1)
		if (lessonType === "unit-test" && percentageCorrect === 1.0) {
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

		logger.info("calculated exercise proficiency", {
			exerciseId,
			score: proficiencyScore,
			performance,
			currentScore: currentProficiencyMap.get(exerciseId),
			isUnitTest
		})

		// Only save if there's a meaningful update (score > 0)
		if (proficiencyScore > 0) {
			updatePromises.push(
				saveAssessmentResult(
					exerciseId,
					proficiencyScore,
					performance.correctCount,
					performance.totalCount,
					userSourcedId
				)
			)
		}
	}

	const results = await Promise.allSettled(updatePromises)
	const successfulUpdates = results.filter((r) => r.status === "fulfilled").length

	logger.info("granular proficiency analysis complete", {
		assessmentSourcedId,
		exercisesAnalyzed: performanceMap.size,
		exercisesUpdated: successfulUpdates,
		questionsMapped: questionIdToExerciseIdMap.size,
		totalQuestions: questionResults.length
	})

	return { success: true, exercisesUpdated: successfulUpdates }
}
