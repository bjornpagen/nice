"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"
import type { CreateFeedbackInput } from "@/lib/qti"

/**
 * Server action to create feedback for a question.
 * This function wraps the QTI client call for use in other server actions.
 *
 * @param input - The feedback data.
 * @returns The created feedback object from the API.
 */
export async function createQuestionFeedback(input: CreateFeedbackInput) {
	logger.info("server action: creating question feedback", { userId: input.userId, questionId: input.questionId })

	const result = await errors.try(qti.feedback.create(input))
	if (result.error) {
		logger.error("failed to create question feedback via qti client", {
			userId: input.userId,
			questionId: input.questionId,
			error: result.error
		})
		throw errors.wrap(result.error, "create question feedback")
	}

	logger.info("successfully created question feedback", { feedbackId: result.data.id })
	return result.data
}
