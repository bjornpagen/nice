import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import {
	validateDecimalAnswerFormats,
	validateEquationAnswerReversibility,
	validateHtmlEntities,
	validateImageUrls,
	validateInteractionAttributes,
	validateNoMfencedElements,
	validateNoSvgInStimulusBody,
	validatePerseusArtifacts,
	validatePromptPlacement,
	validateRootElement,
	validateStimulusBodyContent,
	validateSvgDataUris,
	validateTextEntryInteractionPlacement,
	validateTitleAttribute,
	validateTruncatedTags,
	validateWithQtiApi
} from "./rules"
import { checkNoLatex } from "./utils"

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
		validateHtmlEntities,
		(xml, context) => checkNoLatex(xml, context.logger),
		validateNoMfencedElements,
		validateSvgDataUris,
		validateDecimalAnswerFormats,
		validateEquationAnswerReversibility
	]

	for (const pass of syncPasses) {
		const result = errors.trySync(() => pass(xml, context))
		if (result.error) {
			collectedErrors.push(result.error)
		}
	}

	const asyncPasses: AsyncValidationPass[] = [validateImageUrls, validateWithQtiApi]

	// NOTE: validateContentSufficiency has been removed as it's not needed for the new structured flow.

	for (const pass of asyncPasses) {
		const result = await errors.try(pass(xml, context))
		if (result.error) {
			collectedErrors.push(result.error)
		}
	}

	return { isValid: collectedErrors.length === 0, errors: collectedErrors, xml }
}
