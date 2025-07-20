"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { powerpath, qti } from "@/lib/clients"

/**
 * Processes a question response using the QTI API and optionally logs to PowerPath.
 * This server action wraps the API calls that should never be called from client components.
 */
export async function processQuestionResponse(
	questionId: string,
	selectedResponse: string,
	userSourcedId?: string,
	assessmentId?: string,
	isInteractiveAssessment?: boolean,
	attemptCount?: number
) {
	logger.debug("processing question response", {
		questionId,
		userSourcedId,
		assessmentId,
		isInteractiveAssessment,
		attemptCount
	})

	// Get immediate correctness feedback from QTI
	const qtiResult = await errors.try(
		qti.processResponse(questionId, { responseIdentifier: "RESPONSE", value: selectedResponse })
	)
	if (qtiResult.error) {
		logger.error("qti response processing failed", { error: qtiResult.error, questionId })
		throw errors.wrap(qtiResult.error, "qti response processing")
	}

	const isCorrect = qtiResult.data.score > 0

	// CRITICAL: Only log to PowerPath on the FIRST attempt (attemptCount === 0)
	// This matches Khan Academy's behavior where only first attempts count for proficiency
	if (isInteractiveAssessment && userSourcedId && assessmentId && attemptCount === 0) {
		logger.info("logging first attempt response to powerpath", {
			questionId,
			isCorrect,
			attemptCount
		})

		powerpath
			.updateStudentQuestionResponse({
				student: userSourcedId,
				lesson: assessmentId,
				question: questionId,
				response: selectedResponse
			})
			.catch((err) => {
				logger.error("failed to log question response to powerpath", { error: err, questionId, userSourcedId })
			})
	} else if (attemptCount && attemptCount > 0) {
		logger.debug("skipping powerpath logging for retry attempt", {
			questionId,
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
 * Creates a new, distinct attempt for an assessment in PowerPath.
 * This MUST be called before a user begins a retake of a finalized assessment.
 *
 * @param {string} userSourcedId - The user's OneRoster sourcedId.
 * @param {string} assessmentId - The assessment's (lesson) sourcedId.
 * @returns The new attempt details.
 */
export async function createNewAssessmentAttempt(userSourcedId: string, assessmentId: string) {
	logger.info("creating new assessment attempt", { userSourcedId, assessmentId })

	const result = await errors.try(powerpath.createNewAttempt({ student: userSourcedId, lesson: assessmentId }))
	if (result.error) {
		logger.error("failed to create new assessment attempt in powerpath", {
			userSourcedId,
			assessmentId,
			error: result.error
		})
		throw errors.wrap(result.error, "create new assessment attempt")
	}

	logger.info("successfully created new assessment attempt", {
		userSourcedId,
		assessmentId,
		newAttemptNumber: result.data.attempt.attempt
	})

	return result.data
}

/**
 * Checks the current assessment progress and creates a new attempt if the assessment
 * is already finalized (completed). Returns the current attempt number.
 *
 * @param {string} userSourcedId - The user's OneRoster sourcedId.
 * @param {string} assessmentId - The assessment's (lesson) sourcedId.
 * @returns The current attempt number to use
 */
export async function checkAndCreateNewAttemptIfNeeded(userSourcedId: string, assessmentId: string): Promise<number> {
	logger.info("checking if new assessment attempt is needed", { userSourcedId, assessmentId })

	// Get the current assessment progress
	const progressResult = await errors.try(powerpath.getAssessmentProgress(userSourcedId, assessmentId))
	if (progressResult.error) {
		logger.error("failed to check assessment progress", { error: progressResult.error, assessmentId })
		// If we can't check, assume it's the first attempt
		return 1
	}

	const { finalized, attempt } = progressResult.data
	const currentAttempt = attempt || 1

	// If the assessment is already finalized, we need to create a new attempt
	if (finalized) {
		logger.info("assessment is finalized, creating new attempt", {
			assessmentId,
			currentAttempt,
			finalized
		})

		const newAttemptResult = await errors.try(createNewAssessmentAttempt(userSourcedId, assessmentId))
		if (newAttemptResult.error) {
			logger.error("failed to create new attempt", { error: newAttemptResult.error })
			// Return the current attempt on error to avoid blocking the user
			return currentAttempt
		}

		const newAttemptNumber = newAttemptResult.data.attempt.attempt
		if (typeof newAttemptNumber === "number") {
			logger.info("new attempt created successfully", {
				assessmentId,
				oldAttempt: currentAttempt,
				newAttempt: newAttemptNumber
			})
			return newAttemptNumber
		}
	}

	logger.info("using existing attempt", { assessmentId, attemptNumber: currentAttempt })
	return currentAttempt
}

/**
 * Finalizes an assessment in PowerPath to ensure all responses are graded
 * and ready for proficiency analysis.
 *
 * @param {string} userSourcedId - The user's OneRoster sourcedId.
 * @param {string} assessmentId - The assessment's (lesson) sourcedId.
 */
export async function finalizeAssessment(userSourcedId: string, assessmentId: string) {
	logger.info("finalizing assessment responses", { userSourcedId, assessmentId })

	const result = await errors.try(
		powerpath.finalStudentAssessmentResponse({
			student: userSourcedId,
			lesson: assessmentId
		})
	)

	if (result.error) {
		logger.error("failed to finalize assessment in powerpath", {
			userSourcedId,
			assessmentId,
			error: result.error
		})
		throw errors.wrap(result.error, "finalize assessment")
	}

	logger.info("successfully finalized assessment", {
		userSourcedId,
		assessmentId,
		finalized: result.data.finalized
	})

	return result.data
}

/**
 * Processes a skipped question by logging it as incorrect to PowerPath.
 * This is used for summative assessments (quizzes, tests) where skipping
 * should count as an incorrect answer.
 *
 * @param {string} questionId - The question that was skipped
 * @param {string} userSourcedId - The user's OneRoster sourcedId
 * @param {string} assessmentId - The assessment's (lesson) sourcedId
 * @param {number} attemptNumber - The current attempt number
 */
export async function processSkippedQuestion(
	questionId: string,
	userSourcedId: string,
	assessmentId: string,
	attemptNumber: number
) {
	logger.info("logging skipped question as incorrect", {
		questionId,
		userSourcedId,
		assessmentId,
		attemptNumber
	})

	// Only log to PowerPath on the FIRST attempt (attemptNumber === 0)
	// This matches our existing logic for regular responses
	if (attemptNumber === 0) {
		logger.info("logging first attempt skip to powerpath", {
			questionId,
			attemptNumber
		})

		// Send a special "SKIPPED" response that PowerPath will score as incorrect
		const result = await errors.try(
			powerpath.updateStudentQuestionResponse({
				student: userSourcedId,
				lesson: assessmentId,
				question: questionId,
				response: "SKIPPED" // Conventional value to indicate a skip
			})
		)

		if (result.error) {
			logger.error("failed to log skipped question to powerpath", {
				error: result.error,
				questionId,
				userSourcedId
			})
			// Don't throw - this is a best-effort operation
		}
	} else {
		logger.debug("skipping powerpath logging for retry skip", {
			questionId,
			attemptNumber
		})
	}
}
