"use server"

import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster, qti } from "@/lib/clients"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"

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
 * Processes a question response using the QTI API.
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
	assessmentAttemptNumber?: number,
	_isLastQuestion?: boolean
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

	// External per-question logging and finalize removed

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
// createNewAssessmentAttempt removed

/**
 * Checks the current assessment progress and creates a new attempt if the assessment
 * is already finalized (completed). Returns the current attempt number.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 * @returns The current attempt number to use
 */
// checkAndCreateNewAttemptIfNeeded removed

/**
 * Finalizes an assessment in PowerPath to ensure all responses are graded
 * and ready for proficiency analysis.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId
 */
// finalizeAssessment removed

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
// processSkippedQuestion removed

/**
 * Computes the next attempt number for a user on an assessment resource using OneRoster.
 * Attempt number is defined as 1 + count of existing AssessmentResults for the line item.
 */
export async function getNextAttemptNumber(
	onerosterUserSourcedId: string,
	onerosterResourceSourcedId: string
): Promise<number> {
	logger.info("computing next attempt number from oneroster", {
		onerosterUserSourcedId,
		onerosterResourceSourcedId
	})

	const lineItemId = getAssessmentLineItemId(onerosterResourceSourcedId)
	const filter = `status='active' AND student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${lineItemId}'`
	const resultsResult = await errors.try(oneroster.getAllResults({ filter }))
	if (resultsResult.error) {
		logger.error("failed to fetch results for attempt derivation", {
			error: resultsResult.error,
			lineItemId
		})
		// Fail fast per no-fallbacks policy
		throw errors.wrap(resultsResult.error, "attempt number derivation")
	}
	// Only consider results written by our system (sourcedId starting with "nice_")
	const count = Array.isArray(resultsResult.data)
		? resultsResult.data.filter((r) => typeof r.sourcedId === "string" && r.sourcedId.startsWith("nice_")).length
		: 0
	const nextAttempt = count + 1
	logger.info("derived next attempt number", { lineItemId, existingResults: count, nextAttempt })
	return nextAttempt
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
			filter: `student.sourcedId='${onerosterUserSourcedId}' AND assessmentLineItem.sourcedId='${getAssessmentLineItemId(onerosterAssessmentSourcedId)}'`
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

	// Only consider results written by our system (sourcedId starting with "nice_")
	const results = resultsResult.data.filter((r) => typeof r.sourcedId === "string" && r.sourcedId.startsWith("nice_"))
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
 * Flags a question as reported in the QTI API by updating its metadata.
 * This is the primary server action for the "Report an issue" feature.
 * @param questionId The QTI AssessmentItem identifier (e.g., "nice_x...").
 * @param report The user's report message describing the issue.
 */
export async function flagQuestionAsReported(questionId: string, report: string): Promise<{ success: boolean }> {
	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) {
		throw errors.new("user not authenticated")
	}

	logger.info("flagging question as reported", { clerkUserId, questionId, report })

	const flagResult = await errors.try(
		(async () => {
			const existingItem = await qti.getAssessmentItem(questionId)

			const updatedMetadata = {
				...existingItem.metadata,
				status: "reported",
				report: report.trim(),
				lastReported: new Date().toISOString(),
				reportedBy: clerkUserId
			}

			logger.info("updating question metadata", { questionId, updatedMetadata })

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

	logger.info("successfully flagged question as reported", { clerkUserId, questionId })
	return { success: true }
}
