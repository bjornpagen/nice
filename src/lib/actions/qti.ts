"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"
import type { ProcessResponseInput } from "@/lib/qti"

// The transformed result that matches what our components expect
export interface CheckAnswerResult {
	isCorrect: boolean
	feedbackIdentifier?: string
	feedbackValue?: string
}

/**
 * Server action to process a user's response for a QTI assessment item.
 * @param identifier The unique identifier of the assessment item.
 * @param response The user's response object.
 * @returns The result of the response processing.
 */
export async function processQtiResponse(
	identifier: string,
	response: ProcessResponseInput
): Promise<CheckAnswerResult> {
	logger.info("server action: processing qti response", { identifier })

	// Debug logging to understand what we're receiving
	logger.warn("DEBUG: processQtiResponse received data", {
		identifier,
		response,
		responseIdentifier: response.responseIdentifier,
		responseValue: response.value,
		hasResponseIdentifier: !!response.responseIdentifier,
		responseIdentifierLength: response.responseIdentifier?.length,
		responseIdentifierType: typeof response.responseIdentifier
	})

	const result = await errors.try(qti.processResponse(identifier, response))
	if (result.error) {
		logger.error("server action: failed to process qti response", {
			identifier,
			error: result.error
		})
		// The error is wrapped and re-thrown to be handled by the client.
		throw errors.wrap(result.error, "qti response processing")
	}

	// Transform the API response to match what our components expect
	const transformedResult = {
		isCorrect: result.data.score > 0,
		feedbackIdentifier: result.data.feedback?.identifier,
		feedbackValue: result.data.feedback?.value
	}

	logger.info("server action: successfully processed qti response", {
		identifier,
		isCorrect: transformedResult.isCorrect,
		score: result.data.score
	})

	return transformedResult
}
