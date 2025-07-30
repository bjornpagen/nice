import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import {
	validateContentSufficiency,
	validateHtmlEntities,
	validateImageUrls,
	validateInteractionAttributes,
	validateNoSvgInStimulusBody,
	validatePerseusArtifacts,
	validatePromptPlacement,
	validateRootElement,
	validateStimulusBodyContent,
	validateTextEntryInteractionPlacement,
	validateTitleAttribute,
	validateTruncatedTags,
	validateWithQtiApi
} from "./rules"

type ValidationContext = {
	id: string
	rootTag: string
	title: string
	logger: logger.Logger
	perseusContent?: unknown // UPDATED: Make perseusContent optional.
}

type SyncValidationPass = (xml: string, context: ValidationContext) => void
type AsyncValidationPass = (xml: string, context: ValidationContext) => Promise<void>

export async function runValidationPipeline(
	xml: string,
	context: ValidationContext
): Promise<{ isValid: boolean; errors: Error[]; xml: string }> {
	const collectedErrors: Error[] = []

	const syncPasses: SyncValidationPass[] = [
		validateRootElement,
		validateTitleAttribute,
		validateTruncatedTags,
		validatePerseusArtifacts,
		validatePromptPlacement,
		validateInteractionAttributes,
		validateTextEntryInteractionPlacement,
		validateStimulusBodyContent,
		validateNoSvgInStimulusBody,
		validateHtmlEntities
	]

	for (const pass of syncPasses) {
		const result = errors.trySync(() => pass(xml, context))
		if (result.error) {
			collectedErrors.push(result.error)
		}
	}

	const asyncPasses: AsyncValidationPass[] = [validateImageUrls, validateWithQtiApi]

	// Only run solvability validation for assessment items, not stimuli (performance optimization)
	if (context.rootTag === "assessmentItem") {
		asyncPasses.push(validateContentSufficiency)
	}

	for (const pass of asyncPasses) {
		const result = await errors.try(pass(xml, context))
		if (result.error) {
			collectedErrors.push(result.error)
		}
	}

	return { isValid: collectedErrors.length === 0, errors: collectedErrors, xml }
}
