import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import {
	validateContentSufficiency,
	validateHtmlEntities,
	validateImageUrls,
	validatePerseusArtifacts,
	validateRootElement,
	validateTitleAttribute,
	validateTruncatedTags,
	validateWithQtiApi
} from "./rules"

type ValidationContext = {
	id: string
	rootTag: string
	title: string
	logger: logger.Logger
	perseusContent: unknown // UPDATED: Add perseusContent to the context.
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
		validateTitleAttribute,
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

	const asyncPasses: AsyncValidationPass[] = [
		validateImageUrls,
		validateContentSufficiency, // ADDED: The new AI validation pass.
		validateWithQtiApi
	]
	for (const pass of asyncPasses) {
		const result = await errors.try(pass(xml, context))
		if (result.error) {
			collectedErrors.push(result.error)
		}
	}

	return { isValid: collectedErrors.length === 0, errors: collectedErrors }
}
