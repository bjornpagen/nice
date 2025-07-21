"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { powerpath, qti } from "@/lib/clients"

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
 * @param qtiItemId - The QTI assessment item ID (e.g., nice:question123)
 * @param selectedResponse - The user's selected response
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId (e.g., nice:user456)
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId (e.g., nice:cr789) - used by PowerPath
 * @param isInteractiveAssessment - Whether this is a quiz or test (vs exercise)
 * @param attemptCount - The attempt number (0 = first attempt)
 */
export async function processQuestionResponse(
	qtiItemId: string,
	selectedResponse: string,
	onerosterUserSourcedId?: string,
	onerosterComponentResourceSourcedId?: string,
	isInteractiveAssessment?: boolean,
	attemptCount?: number
) {
	logger.debug("processing question response", {
		qtiItemId,
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		isInteractiveAssessment,
		attemptCount
	})

	// Get immediate correctness feedback from QTI
	const qtiResult = await errors.try(
		qti.processResponse(qtiItemId, { responseIdentifier: "RESPONSE", value: selectedResponse })
	)
	if (qtiResult.error) {
		logger.error("qti response processing failed", { error: qtiResult.error, qtiItemId })
		throw errors.wrap(qtiResult.error, "qti response processing")
	}

	const isCorrect = qtiResult.data.score > 0

	// CRITICAL: Only log to PowerPath on the FIRST attempt (attemptCount === 0)
	// This matches Khan Academy's behavior where only first attempts count for proficiency
	if (isInteractiveAssessment && onerosterUserSourcedId && onerosterComponentResourceSourcedId && attemptCount === 0) {
		logger.info("logging first attempt response to powerpath", {
			qtiItemId,
			isCorrect,
			attemptCount
		})

		powerpath
			.updateStudentQuestionResponse({
				student: onerosterUserSourcedId,
				lesson: onerosterComponentResourceSourcedId,
				question: qtiItemId,
				response: selectedResponse
			})
			.catch((err) => {
				logger.error("failed to log question response to powerpath", { error: err, qtiItemId, onerosterUserSourcedId })
			})
	} else if (attemptCount && attemptCount > 0) {
		logger.debug("skipping powerpath logging for retry attempt", {
			qtiItemId,
			attemptCount,
			isCorrect
		})
	}

	return {
		isCorrect,
		score: qtiResult.data.score,
		feedback: qtiResult.data.feedback
	} as const
}

/**
 * Creates a new attempt for an assessment in PowerPath.
 * This allows users to retake assessments multiple times.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId (e.g., nice:user123)
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId (e.g., nice:cr456)
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
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId (e.g., nice:user123)
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId (e.g., nice:cr456)
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
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId (e.g., nice:user123)
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId (e.g., nice:cr456)
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
 * @param qtiItemId - The QTI assessment item ID that was skipped (e.g., nice:question123)
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId (e.g., nice:user123)
 * @param onerosterComponentResourceSourcedId - The OneRoster componentResource sourcedId (e.g., nice:cr456)
 * @param attemptNumber - The current attempt number
 */
export async function processSkippedQuestion(
	qtiItemId: string,
	onerosterUserSourcedId: string,
	onerosterComponentResourceSourcedId: string,
	attemptNumber: number
) {
	logger.info("logging skipped question as incorrect", {
		qtiItemId,
		onerosterUserSourcedId,
		onerosterComponentResourceSourcedId,
		attemptNumber
	})

	// Only log to PowerPath on the FIRST attempt (attemptNumber === 0)
	// This matches our existing logic for regular responses
	if (attemptNumber === 0) {
		logger.info("logging first attempt skip to powerpath", {
			qtiItemId,
			attemptNumber
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
			attemptNumber
		})
	}
}
