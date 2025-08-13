import * as errors from "@superbuilders/errors"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"

/**
 * Centralized policy for all assessment-related identifiers.
 */

// Attempt Policy: All attempt numbers must be integers greater than or equal to 1.
const AttemptPolicy = {
	validate: (attempt: number) => {
		if (!Number.isInteger(attempt) || attempt < 1) {
			throw errors.new("attempt number must be a positive integer")
		}
	}
}

/**
 * Generates the sourcedId for an assessment result.
 * Interactive assessments (exercises, quizzes, tests) must have an attempt number.
 * Passive content (videos, articles) do not have an attempt number.
 *
 * @returns The final result sourcedId for the gradebook.
 */
export function generateResultSourcedId(
	userSourcedId: string,
	resourceSourcedId: string,
	isInteractive: boolean,
	attemptNumber?: number
): string {
	const lineItemId = getAssessmentLineItemId(resourceSourcedId)
	const baseId = `nice_${userSourcedId}_${lineItemId}`

	if (isInteractive) {
		if (typeof attemptNumber !== "number") {
			throw errors.new("attempt number required for interactive assessments")
		}
		AttemptPolicy.validate(attemptNumber)
		return `${baseId}_attempt_${attemptNumber}`
	}

	return baseId
}
