import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import { correctXml, generateXml } from "./client"
import { runValidationPipeline } from "./validator"

type ConversionOptions =
	| {
			id: string
			type: "assessmentItem"
			title: string // Title is REQUIRED - we get it from the database join
			perseusContent: unknown
			logger: logger.Logger
	  }
	| {
			id: string
			type: "stimulus"
			title: string // Title is required for stimuli
			perseusContent: unknown
			logger: logger.Logger
	  }

export async function orchestratePerseusToQtiConversion(options: ConversionOptions): Promise<string> {
	const { id, type, perseusContent, logger } = options
	const rootTag = type === "stimulus" ? "qti-assessment-stimulus" : "qti-assessment-item"

	// Extract title - it's required for both types, enforced by the type system and validation
	const title = options.title

	// 1. Initial Generation Attempt
	const initialXmlResult = await errors.try(generateXml(logger, perseusContent, { type }))
	if (initialXmlResult.error) {
		logger.error("initial xml generation failed", { error: initialXmlResult.error })
		throw errors.wrap(initialXmlResult.error, "initial xml generation")
	}
	const initialXml = initialXmlResult.data

	// 2. First Validation Pass
	const initialValidation = await runValidationPipeline(initialXml, { id, rootTag, title, logger })
	if (initialValidation.isValid) {
		logger.info("initial xml generation was valid", { type })
		return initialXml
	}

	logger.warn("initial xml generation failed validation, attempting correction", {
		type,
		errors: initialValidation.errors.map((e) => e.toString())
	})

	// 3. Correction Attempt
	const correctedXmlResult = await errors.try(
		correctXml(logger, {
			invalidXml: initialXml,
			// Pass a JSON string array of error messages, fulfilling the prompt's contract.
			errorMessage: JSON.stringify(initialValidation.errors.map((e) => e.toString())),
			rootTag
		})
	)
	if (correctedXmlResult.error) {
		logger.error("xml correction failed", { error: correctedXmlResult.error })
		throw errors.wrap(correctedXmlResult.error, "xml correction")
	}
	const correctedXml = correctedXmlResult.data

	// 4. Final Validation Pass
	const finalValidation = await runValidationPipeline(correctedXml, { id, rootTag, title, logger })
	if (!finalValidation.isValid) {
		logger.error("corrected xml failed validation again", {
			type,
			errors: finalValidation.errors.map((e) => e.toString())
		})
		throw errors.new("corrected xml failed validation")
	}

	logger.info("successfully corrected and validated xml", { type })
	return correctedXml
}
