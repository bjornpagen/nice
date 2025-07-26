import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import {
	validateHtmlEntities,
	validateImageUrls,
	validatePerseusArtifacts,
	validateRootElement,
	validateTruncatedTags,
	validateWithQtiApi
} from "./rules"

type ValidationContext = {
	id: string
	rootTag: string
	title: string // Title is required
	logger: logger.Logger
}

type SyncValidationPass = (xml: string, context: ValidationContext) => void
type AsyncValidationPass = (xml: string, context: ValidationContext) => Promise<void>

export async function runValidationPipeline(
	xml: string,
	context: ValidationContext
): Promise<{ isValid: boolean; errors: Error[] }> {
	const collectedErrors: Error[] = []

	const syncPasses: SyncValidationPass[] = [
		validateRootElement,
		validateTruncatedTags,
		validatePerseusArtifacts,
		validateHtmlEntities
	]

	for (const pass of syncPasses) {
		const result = errors.trySync(() => pass(xml, context))
		if (result.error) {
			collectedErrors.push(result.error)
		}
	}

	const asyncPasses: AsyncValidationPass[] = [validateImageUrls, validateWithQtiApi]
	for (const pass of asyncPasses) {
		const result = await errors.try(pass(xml, context))
		if (result.error) {
			collectedErrors.push(result.error)
		}
	}

	return { isValid: collectedErrors.length === 0, errors: collectedErrors }
}
