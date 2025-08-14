import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"
import { filterInteractiveAttemptResults } from "@/lib/utils/assessment-results"

/**
 * Service for managing assessment attempt numbers.
 * This module is responsible for determining the next attempt number
 * for a user's assessment based on their previous attempts.
 */

/**
 * Computes the next attempt number for a user's assessment.
 * Queries OneRoster to find existing attempts and returns the next sequential number.
 *
 * @param userSourcedId - The OneRoster user sourcedId
 * @param resourceSourcedId - The OneRoster resource sourcedId
 * @returns The next attempt number (1-based)
 */
export async function getNext(userSourcedId: string, resourceSourcedId: string): Promise<number> {
	logger.info("computing next attempt number from oneroster", {
		userSourcedId,
		resourceSourcedId
	})

	const lineItemId = getAssessmentLineItemId(resourceSourcedId)
	const filter = `status='active' AND student.sourcedId='${userSourcedId}' AND assessmentLineItem.sourcedId='${lineItemId}'`
	const resultsResult = await errors.try(oneroster.getAllResults({ filter }))
	if (resultsResult.error) {
		logger.error("failed to fetch results for attempt derivation", {
			error: resultsResult.error,
			lineItemId
		})
		// Fail fast per no-fallbacks policy
		throw errors.wrap(resultsResult.error, "attempt number derivation")
	}

	// Use the centralized utility to filter results
	if (!Array.isArray(resultsResult.data)) {
		logger.error("invalid oneroster results shape for attempt derivation", { lineItemId })
		throw errors.new("attempt number derivation: invalid results shape")
	}
	const validAttempts = filterInteractiveAttemptResults(resultsResult.data, userSourcedId, lineItemId)

	const count = validAttempts.length
	const nextAttempt = count + 1
	logger.info("derived next attempt number", { lineItemId, existingResults: count, nextAttempt })

	return nextAttempt
}
