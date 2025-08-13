import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"
import { type AssessmentResultMetadata, AssessmentResultMetadataSchema } from "@/lib/constants/assessment"
import { assertPercentageInteger } from "@/lib/utils/score"

/**
 * Saves a fully-formed assessment result to the gradebook via an idempotent PUT operation.
 * This is the sole entry point for writing grades. It enforces score and metadata normalization.
 *
 * @returns The sourcedId of the created/updated result.
 */
export async function saveResult(options: {
	resultSourcedId: string
	lineItemSourcedId: string
	userSourcedId: string
	score: number
	comment: string
	metadata: AssessmentResultMetadata
	correlationId: string
}): Promise<string> {
	const metadataValidation = AssessmentResultMetadataSchema.safeParse(options.metadata)
	if (!metadataValidation.success) {
		logger.error("invalid assessment result metadata", {
			error: metadataValidation.error,
			correlationId: options.correlationId
		})
		throw errors.wrap(metadataValidation.error, "gradebook metadata validation")
	}
	const validatedMetadata = metadataValidation.data
	const finalScore = assertPercentageInteger(options.score, "gradebook score")

	const payload = {
		result: {
			assessmentLineItem: { sourcedId: options.lineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: options.userSourcedId, type: "user" as const },
			scoreStatus: "fully graded" as const,
			scoreDate: validatedMetadata.completedAt,
			score: finalScore,
			comment: options.comment,
			metadata: validatedMetadata
		}
	}

	const result = await errors.try(oneroster.putResult(options.resultSourcedId, payload))
	if (result.error) {
		logger.error("failed to save result via gradebook port", {
			resultSourcedId: options.resultSourcedId,
			error: result.error,
			correlationId: options.correlationId
		})
		throw errors.wrap(result.error, "gradebook port: save result failed")
	}

	return result.data.sourcedId
}
