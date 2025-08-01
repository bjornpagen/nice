"use server"

import { auth, currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createQuestionFeedback } from "@/lib/actions/feedback"
import { oneroster, powerpath, qti } from "@/lib/clients"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"

/**
 * IMPORTANT NOTE ABOUT POWERPATH TERMINOLOGY:
 *
 * PowerPath's API uses the term "lesson" for what OneRoster calls a "componentResource".
 * This is a naming mismatch between the two systems:
 * - OneRoster hierarchy: Course → CourseComponent → ComponentResource
 * - PowerPath terminology: "lesson" = OneRoster's ComponentResource
 *
 * In this file, we use OneRoster's correct terminology in our function parameters
 * (onerosterComponentResourceSourcedId) but pass it to PowerPath's "lesson" field.
 */

/**
 * Processes a question response using the QTI API and optionally logs to PowerPath.
 * This server action wraps the API calls that should never be called from client components.
 *
 * @param qtiItemId - The QTI assessment item ID (e.g., nice_question123)
 * @param selectedResponse - The user's selected response
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId - used by PowerPath
 * @param isInteractiveAssessment - Whether this is a quiz or test (vs exercise)
 * @param assessmentAttemptNumber - The attempt number (0 = first attempt)
 */
export async function processQuestionResponse(
	qtiItemId: string,
	selectedResponse: string | unknown[] | Record<string, unknown>,
	responseIdentifier: string,
	onerosterUserSourcedId?: string,
	onerosterComponentResourceSourcedId?: string,
	isInteractiveAssessment?: boolean,
	assessmentAttemptNumber?: number
) {
	logger.debug("processing question response", {
		qtiItemId,
		responseIdentifier,
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		isInteractiveAssessment,
		assessmentAttemptNumber
	})

	let isCorrect = false

	// Handle fill-in-the-blank questions with multiple responses
	if (typeof selectedResponse === "object" && !Array.isArray(selectedResponse) && selectedResponse !== null) {
		// This is a fill-in-the-blank question with multiple inputs.
		// The QTI API expects each response to be processed in a separate API call.
		const responseEntries = Object.entries(selectedResponse)

		logger.info("processing multi-input question", {
			qtiItemId,
			responseCount: responseEntries.length,
			responseIdentifiers: responseEntries.map(([id]) => id)
		})

		const results = await Promise.all(
			responseEntries.map(([identifier, value]) =>
				errors.try(
					qti.processResponse(qtiItemId, {
						responseIdentifier: identifier,
						value: String(value) // Ensure value is a string
					})
				)
			)
		)

		// Check for any failed API calls
		const anyErrors = results.some((r) => r.error)
		if (anyErrors) {
			const failedResponses = results.filter((r) => r.error)
			logger.error("one or more qti response processing calls failed for multi-input question", {
				failedResponses: failedResponses.map((r, _idx) => ({
					identifier: responseEntries[results.indexOf(r)]?.[0],
					error: r.error
				})),
				qtiItemId,
				selectedResponse
			})
			throw errors.new("qti response processing failed for multi-input question")
		}

		// The entire question is correct only if ALL individual responses are correct.
		isCorrect = results.every((r) => r.data && r.data.score > 0)

		logger.info("multi-input question processing complete", {
			qtiItemId,
			isCorrect,
			individualScores: results.map((r, idx) => ({
				identifier: responseEntries[idx]?.[0],
				score: r.data?.score
			}))
		})
	} else {
		// Single response or array response (multi-select)
		const qtiResult = await errors.try(qti.processResponse(qtiItemId, { responseIdentifier, value: selectedResponse }))
		if (qtiResult.error) {
			logger.error("qti response processing failed", { error: qtiResult.error, qtiItemId })
			throw errors.wrap(qtiResult.error, "qti response processing")
		}

		isCorrect = qtiResult.data.score > 0
	}

	// CRITICAL: Only log to PowerPath on the FIRST attempt (assessmentAttemptNumber === 0)
	// This matches Khan Academy's behavior where only first attempts count for proficiency
	if (
		isInteractiveAssessment &&
		onerosterUserSourcedId &&
		onerosterComponentResourceSourcedId &&
		assessmentAttemptNumber === 0
	) {
		logger.info("logging first attempt response to powerpath", {
			qtiItemId,
			isCorrect,
			assessmentAttemptNumber
		})

		// Convert response to string or string array for PowerPath
		let powerpathResponse: string | string[]
		if (typeof selectedResponse === "object" && !Array.isArray(selectedResponse)) {
			// For multi-input questions, send as array of values
			powerpathResponse = Object.values(selectedResponse).map(String)
		} else if (Array.isArray(selectedResponse)) {
			powerpathResponse = selectedResponse.map(String)
		} else {
			powerpathResponse = String(selectedResponse)
		}

		powerpath
			.updateStudentQuestionResponse({
				student: onerosterUserSourcedId,
				lesson: onerosterComponentResourceSourcedId,
				question: qtiItemId,
				response: powerpathResponse
			})
			.catch((err) => {
				logger.error("failed to log question response to powerpath", { error: err, qtiItemId, onerosterUserSourcedId })
			})
	} else if (assessmentAttemptNumber && assessmentAttemptNumber > 0) {
		logger.debug("skipping powerpath logging for retry attempt", {
			qtiItemId,
			assessmentAttemptNumber,
			isCorrect
		})
	}

	// For fill-in-the-blank questions, we don't have a single score/feedback
	// Return a simplified response
	return {
		isCorrect,
		score: isCorrect ? 1 : 0,
		feedback: isCorrect ? "Correct!" : "Not quite right. Try again."
	} as const
}

/**
 * Creates a new attempt for an assessment in PowerPath.
 * This allows users to retake assessments multiple times.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 * @returns The new attempt information
 */
export async function createNewAssessmentAttempt(
	onerosterUserSourcedId: string,
	onerosterComponentResourceSourcedId: string
) {
	logger.info("creating new assessment attempt", { onerosterUserSourcedId, onerosterComponentResourceSourcedId })

	const result = await errors.try(
		powerpath.createNewAttempt({
			student: onerosterUserSourcedId,
			lesson: onerosterComponentResourceSourcedId
		})
	)

	if (result.error) {
		logger.error("failed to create new assessment attempt", {
			onerosterUserSourcedId,
			onerosterComponentResourceSourcedId,
			error: result.error
		})
		throw errors.wrap(result.error, "create assessment attempt")
	}

	logger.info("successfully created new assessment attempt", {
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		attempt: result.data
	})

	return result.data
}

/**
 * Checks the current assessment progress and creates a new attempt if the assessment
 * is already finalized (completed). Returns the current attempt number.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 * @returns The current attempt number to use
 */
export async function checkAndCreateNewAttemptIfNeeded(
	onerosterUserSourcedId: string,
	onerosterComponentResourceSourcedId: string
): Promise<number> {
	logger.info("checking if new assessment attempt is needed", {
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId
	})

	// Get the current assessment progress
	const progressResult = await errors.try(
		powerpath.getAssessmentProgress(onerosterUserSourcedId, onerosterComponentResourceSourcedId)
	)
	if (progressResult.error) {
		logger.error("failed to check assessment progress", {
			error: progressResult.error,
			onerosterComponentResourceSourcedId
		})
		// If we can't check, assume it's the first attempt
		return 1
	}

	const { finalized, attempt } = progressResult.data
	const currentAttempt = attempt || 1

	// If the assessment is already finalized, we need to create a new attempt
	if (finalized) {
		logger.info("assessment is finalized, creating new attempt", {
			onerosterComponentResourceSourcedId,
			currentAttempt,
			finalized
		})

		const newAttemptResult = await errors.try(
			createNewAssessmentAttempt(onerosterUserSourcedId, onerosterComponentResourceSourcedId)
		)
		if (newAttemptResult.error) {
			logger.error("failed to create new attempt", { error: newAttemptResult.error })
			// Return the current attempt on error to avoid blocking the user
			return currentAttempt
		}

		const newAttemptData = newAttemptResult.data
		const newAttemptNumber = newAttemptData.attempt.attempt
		if (typeof newAttemptNumber === "number") {
			logger.info("new attempt created successfully", {
				onerosterComponentResourceSourcedId,
				oldAttempt: currentAttempt,
				newAttempt: newAttemptNumber
			})
			return newAttemptNumber
		}
	}

	logger.info("using existing attempt", { onerosterComponentResourceSourcedId, attemptNumber: currentAttempt })
	return currentAttempt
}

/**
 * Finalizes an assessment in PowerPath to ensure all responses are graded
 * and ready for proficiency analysis.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 */
export async function finalizeAssessment(onerosterUserSourcedId: string, onerosterComponentResourceSourcedId: string) {
	logger.info("finalizing assessment responses", { onerosterUserSourcedId, onerosterComponentResourceSourcedId })

	const result = await errors.try(
		powerpath.finalStudentAssessmentResponse({
			student: onerosterUserSourcedId,
			lesson: onerosterComponentResourceSourcedId
		})
	)

	if (result.error) {
		logger.error("failed to finalize assessment in powerpath", {
			onerosterUserSourcedId,
			onerosterComponentResourceSourcedId,
			error: result.error
		})
		throw errors.wrap(result.error, "finalize assessment")
	}

	logger.info("successfully finalized assessment", {
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		finalized: result.data.finalized
	})

	return result.data
}

/**
 * Processes a skipped question by logging it as incorrect to PowerPath.
 * This is used for summative assessments (quizzes, tests) where skipping
 * should count as an incorrect answer.
 *
 * @param qtiItemId - The QTI assessment item ID that was skipped (e.g., nice_question123)
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 * @param attemptNumber - The current attempt number
 */
export async function processSkippedQuestion(
	qtiItemId: string,
	onerosterUserSourcedId: string,
	onerosterComponentResourceSourcedId: string,
	assessmentAttemptNumber: number
) {
	logger.info("logging skipped question as incorrect", {
		qtiItemId,
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		assessmentAttemptNumber
	})

	// Only log to PowerPath on the FIRST attempt (assessmentAttemptNumber === 0)
	// This matches our existing logic for regular responses
	if (assessmentAttemptNumber === 0) {
		logger.info("logging first attempt skip to powerpath", {
			qtiItemId,
			assessmentAttemptNumber
		})

		// Send a special "SKIPPED" response that PowerPath will score as incorrect
		const result = await errors.try(
			powerpath.updateStudentQuestionResponse({
				student: onerosterUserSourcedId,
				lesson: onerosterComponentResourceSourcedId,
				question: qtiItemId,
				response: "SKIPPED" // Conventional value to indicate a skip
			})
		)

		if (result.error) {
			logger.error("failed to log skipped question to powerpath", {
				error: result.error,
				qtiItemId,
				onerosterUserSourcedId
			})
			// Don't throw - this is a best-effort operation
		}
	} else {
		logger.debug("skipping powerpath logging for retry skip", {
			qtiItemId,
			assessmentAttemptNumber
		})
	}
}

/**
 * Checks if a user has already achieved proficiency (80%+) on an assessment.
 * This is used to prevent XP farming by checking BEFORE saving a new result.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterAssessmentSourcedId - The OneRoster assessment resource sourcedId
 * @returns Whether the user is already proficient (true) or not (false)
 */
export async function checkExistingProficiency(
	onerosterUserSourcedId: string,
	onerosterAssessmentSourcedId: string
): Promise<boolean> {
	logger.info("checking existing proficiency", {
		onerosterUserSourcedId,
		onerosterAssessmentSourcedId
	})

	const resultsResult = await errors.try(
		oneroster.getAllResults({
			filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${onerosterAssessmentSourcedId}'`
		})
	)

	if (resultsResult.error) {
		logger.error("failed to check existing proficiency", {
			onerosterUserSourcedId,
			onerosterAssessmentSourcedId,
			error: resultsResult.error
		})
		// NO FALLBACK - if we can't check, we throw
		throw errors.wrap(resultsResult.error, "proficiency check")
	}

	const results = resultsResult.data
	if (results.length === 0) {
		logger.debug("no existing results found", {
			onerosterUserSourcedId,
			onerosterAssessmentSourcedId
		})
		return false
	}

	// Get the most recent result
	const latestResult = results.sort(
		(a, b) => new Date(b.scoreDate || 0).getTime() - new Date(a.scoreDate || 0).getTime()
	)[0]

	if (!latestResult) {
		throw errors.new("proficiency check: sorted results array is empty")
	}

	if (typeof latestResult.score !== "number") {
		logger.error("proficiency check: invalid score type", {
			onerosterUserSourcedId,
			onerosterAssessmentSourcedId,
			scoreType: typeof latestResult.score,
			score: latestResult.score
		})
		throw errors.new("proficiency check: score must be a number")
	}

	const isProficient = latestResult.score >= 0.8

	logger.info("proficiency check complete", {
		onerosterUserSourcedId,
		onerosterAssessmentSourcedId,
		currentScore: latestResult.score,
		isProficient
	})

	return isProficient
}

/**
 * Flags a question as buggy in the QTI API and logs user feedback.
 * This is the primary server action for the "Report an issue" feature.
 * @param questionId The QTI AssessmentItem identifier (e.g., "nice_x...").
 * @param feedback The text feedback provided by the user.
 * @param lessonId The ID of the lesson containing the question, required for feedback logging.
 */
export async function flagAndReportQuestion(
	questionId: string,
	feedback: string,
	lessonId: string
): Promise<{ success: boolean }> {
	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) {
		throw errors.new("user not authenticated")
	}

	logger.info("flagging and reporting buggy question", { clerkUserId, questionId })

	// Step 1: Flag the question in the QTI API by updating its metadata.
	// This is the source of truth for the question's status.
	const flagResult = await errors.try(
		(async () => {
			const existingItem = await qti.getAssessmentItem(questionId)
			const updatedMetadata = {
				...existingItem.metadata,
				status: "buggy_reported",
				lastReported: new Date().toISOString()
			}
			const updatePayload = {
				identifier: existingItem.identifier,
				xml: existingItem.rawXml,
				metadata: updatedMetadata
			}
			await qti.updateAssessmentItem(updatePayload)
		})()
	)

	if (flagResult.error) {
		logger.error("failed to flag question in qti api", { clerkUserId, questionId, error: flagResult.error })
		throw errors.wrap(flagResult.error, "flagging question in qti api")
	}

	// Step 2: Log the user's feedback via the new feedback action.
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not found after auth check")
	}

	const metadataResult = errors.trySync(() => parseUserPublicMetadata(user.publicMetadata))
	if (metadataResult.error) {
		throw errors.wrap(metadataResult.error, "clerk user metadata validation")
	}

	const { sourceId } = metadataResult.data
	if (!sourceId) {
		throw errors.new("user does not have a sourceId")
	}

	const feedbackResult = await errors.try(
		createQuestionFeedback({
			userId: sourceId,
			questionId,
			feedback,
			lessonId,
			humanApproved: false
		})
	)

	if (feedbackResult.error) {
		logger.error("failed to log question feedback after successful flagging", {
			clerkUserId,
			questionId,
			error: feedbackResult.error
		})
		// Do not throw; the primary action of flagging succeeded.
	}

	logger.info("successfully flagged and reported buggy question", { clerkUserId, questionId })
	return { success: true }
}
