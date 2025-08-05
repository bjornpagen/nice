#!/usr/bin/env bun
/**
 * Script to test zodResponseFormat with AssessmentItemSchema
 * This will help us inspect what JSON schema is generated from our Zod schema
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { zodResponseFormat } from "openai/helpers/zod"
import { AssessmentItemSchema } from "@/lib/qti-generation/schemas"

async function main() {
	logger.info("starting zodResponseFormat test")

	const formatResult = errors.trySync(() => zodResponseFormat(AssessmentItemSchema, "qti_assessment_item_generator"))
	if (formatResult.error) {
		logger.error("failed to generate zodResponseFormat", { error: formatResult.error })
		throw errors.wrap(formatResult.error, "zodResponseFormat generation")
	}

	const responseFormat = formatResult.data
	logger.info("zodResponseFormat generated successfully")
	logger.debug("response format structure", {
		type: responseFormat.type,
		name: responseFormat.json_schema?.name,
		strict: responseFormat.json_schema?.strict
	})

	// The main thing we want to inspect - the actual JSON schema
	const jsonSchema = responseFormat.json_schema?.schema

	if (jsonSchema) {
		logger.info("JSON schema generated from AssessmentItemSchema", {
			schema: JSON.stringify(jsonSchema, null, 2)
		})

		// Also write to a file for easier inspection
		const fs = require("node:fs")
		const outputPath = "assessment-item-schema-output.json"

		const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, JSON.stringify(jsonSchema, null, 2)))
		if (writeResult.error) {
			logger.error("failed to write schema to file", { error: writeResult.error })
			throw errors.wrap(writeResult.error, "file write")
		}

		logger.info("JSON schema written to file", { file: outputPath })
	} else {
		logger.error("no JSON schema found in response format")
		throw errors.new("missing json schema in response format")
	}

	// Let's also inspect the full response format object
	logger.debug("full response format object", {
		responseFormat: JSON.stringify(responseFormat, null, 2)
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script execution failed", { error: result.error })
	process.exit(1)
}
