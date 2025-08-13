"use server"

import type { AssessmentResult } from "@/lib/oneroster"

/**
 * Checks if a result's sourcedId strictly matches the attempt-based ID pattern
 * for interactive assessments (Quizzes, Tests, Exercises).
 *
 * Pattern: `nice_${userSourcedId}_${lineItemId}_attempt_${n}`
 *
 * This is the single source of truth for identifying interactive assessment attempts.
 *
 * @param result The OneRoster result object.
 * @param userSourcedId The OneRoster user sourcedId.
 * @param lineItemId The OneRoster assessment line item sourcedId.
 * @returns True if the result matches the interactive attempt pattern.
 */
export function isInteractiveAttemptResult(
	result: AssessmentResult,
	userSourcedId: string,
	lineItemId: string
): boolean {
	const id = result.sourcedId
	if (typeof id !== "string") {
		return false
	}

	const baseIdPrefix = `nice_${userSourcedId}_${lineItemId}_attempt_`
	if (!id.startsWith(baseIdPrefix)) {
		return false
	}

	const suffix = id.slice(baseIdPrefix.length)
	return /^\d+$/.test(suffix)
}

/**
 * Checks if a result's sourcedId strictly matches the base ID pattern for
 * passive content (Articles, Videos).
 *
 * Pattern: `nice_${userSourcedId}_${lineItemId}`
 *
 * @param result The OneRoster result object.
 * @param userSourcedId The OneRoster user sourcedId.
 * @param lineItemId The OneRoster assessment line item sourcedId.
 * @returns True if the result matches the passive content pattern.
 */
export function isPassiveContentResult(result: AssessmentResult, userSourcedId: string, lineItemId: string): boolean {
	const id = result.sourcedId
	if (typeof id !== "string") {
		return false
	}

	const baseId = `nice_${userSourcedId}_${lineItemId}`
	return id === baseId
}

/**
 * Filters a list of OneRoster results to find only those matching the strict,
 * attempt-based ID pattern for a specific user and line item.
 *
 * @param results An array of OneRoster results.
 * @param userSourcedId The OneRoster user sourcedId.
 * @param lineItemId The OneRoster assessment line item sourcedId.
 * @returns A filtered array of results representing interactive attempts.
 */
export function filterInteractiveAttemptResults(
	results: AssessmentResult[],
	userSourcedId: string,
	lineItemId: string
): AssessmentResult[] {
	return results.filter((r) => isInteractiveAttemptResult(r, userSourcedId, lineItemId))
}

/**
 * Finds the most recent, valid assessment result for an *interactive assessment*
 * from a list, based on scoreDate.
 *
 * @param allUserResults An array of all results for a user.
 * @param userSourcedId The OneRoster user sourcedId.
 * @param lineItemId The specific OneRoster assessment line item sourcedId to check.
 * @returns The latest result object for that line item, or undefined if none found.
 */
export function findLatestInteractiveAttempt(
	allUserResults: AssessmentResult[],
	userSourcedId: string,
	lineItemId: string
): AssessmentResult | undefined {
	const validAttempts = filterInteractiveAttemptResults(allUserResults, userSourcedId, lineItemId)

	if (validAttempts.length === 0) {
		return undefined
	}

	// Sort by scoreDate descending to find the most recent result.
	const sortedAttempts = [...validAttempts].sort(
		(a, b) => new Date(b.scoreDate || 0).getTime() - new Date(a.scoreDate || 0).getTime()
	)

	return sortedAttempts[0]
}
