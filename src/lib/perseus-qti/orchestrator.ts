import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import { generateXml } from "./client"
import { runValidationPipeline } from "./validator"

const MAX_CONVERSION_ATTEMPTS = 2

type ConversionOptions = {
	id: string
	type: "assessmentItem" | "stimulus"
	title: string
	perseusContent: unknown
	logger: logger.Logger
}

export async function orchestratePerseusToQtiConversion(options: ConversionOptions): Promise<string> {
	const { id, type, perseusContent, logger, title } = options
	const rootTag = type === "stimulus" ? "qti-assessment-stimulus" : "qti-assessment-item"

	let lastXml = ""
	let lastError: Error | null = null

	for (let attempt = 1; attempt <= MAX_CONVERSION_ATTEMPTS; attempt++) {
		logger.info("starting qti conversion attempt", { type, id, attempt, maxAttempts: MAX_CONVERSION_ATTEMPTS })

		// ✅ CORRECT: Explicit check for lastError. No optional chaining or fallbacks.
		let regenerationContext: { flawedXml: string; errorReason: string } | undefined
		if (attempt > 1 && lastError) {
			regenerationContext = {
				flawedXml: lastXml,
				errorReason: lastError.message
			}
		}

		// 1. Generation Attempt (or Regeneration Attempt)
		const generationPromise: Promise<string> = regenerationContext
			? generateXml(logger, perseusContent, { type }, regenerationContext)
			: generateXml(logger, perseusContent, { type })

		const generationResult = await errors.try(generationPromise)

		if (generationResult.error) {
			lastError = generationResult.error
			lastXml = ""
			logger.error("xml generation/regeneration failed", { attempt, error: lastError })
			continue // Go to next attempt
		}
		const generatedXml = generationResult.data
		lastXml = generatedXml

		// 2. Full Validation Pass
		const validationResult = await runValidationPipeline(generatedXml, { id, rootTag, title, logger, perseusContent })
		if (validationResult.isValid) {
			logger.info("xml generation and validation successful", { type, id, attempt })
			return generatedXml
		}

		// 3. Handle any Validation Failure
		const combinedErrorMessages = validationResult.errors.map((e) => e.message).join("\n- ")
		lastError = errors.new(
			`Validation failed with ${validationResult.errors.length} errors:\n- ${combinedErrorMessages}`
		)

		logger.warn("xml validation failed, preparing for regeneration", {
			type,
			id,
			attempt,
			errorCount: validationResult.errors.length,
			firstError: validationResult.errors[0]?.message
		})

		if (attempt === MAX_CONVERSION_ATTEMPTS) {
			break
		}
	}

	// ✅ CORRECT: Explicit check for lastError before wrapping to prevent null pointer exceptions.
	if (!lastError) {
		logger.error("CRITICAL: Conversion loop finished without a final error", { type, id })
		throw errors.new(
			`all ${MAX_CONVERSION_ATTEMPTS} attempts to convert perseus content failed without a specific error`
		)
	}
	logger.error("all qti conversion attempts failed", { type, id, lastError })
	throw errors.wrap(lastError, `all ${MAX_CONVERSION_ATTEMPTS} attempts to convert perseus content failed`)
}
