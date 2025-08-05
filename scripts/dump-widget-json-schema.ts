#!/usr/bin/env bun
/**
 * Script to dump the entire JSON schema for all QTI widgets.
 *
 * This utility converts the Zod schemas for all defined widgets into their
 * JSON schema representation and prints the result to the console. This is
 * useful for inspection and for analyzing the total size of the schema definitions.
 *
 * Usage:
 *   bun run scripts/dump-widget-json-schema.ts | wc -c
 *   bun run scripts/dump-widget-json-schema.ts > widget-schemas.json
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { zodResponseFormat } from "openai/helpers/zod"
// Import the typedSchemas object which contains all widget Zod schemas.
import { typedSchemas } from "@/lib/widgets/generators"

async function main() {
	logger.info("Starting widget JSON schema dump")

	// This object will hold the final JSON schema for each widget type.
	const allWidgetJsonSchemas: Record<string, unknown> = {}

	const conversionResult = errors.trySync(() => {
		// Iterate over each widget's Zod schema defined in typedSchemas.
		for (const [widgetType, widgetSchema] of Object.entries(typedSchemas)) {
			// Use zodResponseFormat to convert the Zod schema into the format
			// that includes the JSON schema representation.
			const responseFormat = zodResponseFormat(widgetSchema, `widget_${widgetType}_generator`)

			// Extract the generated JSON schema.
			const jsonSchema = responseFormat.json_schema?.schema

			if (jsonSchema) {
				allWidgetJsonSchemas[widgetType] = jsonSchema
			} else {
				logger.warn("Could not extract JSON schema for widget", { widgetType })
			}
		}
	})

	if (conversionResult.error) {
		logger.error("Failed to convert one or more Zod schemas to JSON schema", {
			error: conversionResult.error
		})
		throw errors.wrap(conversionResult.error, "Zod to JSON schema conversion")
	}

	logger.info("Successfully converted all widget schemas", {
		widgetCount: Object.keys(allWidgetJsonSchemas).length
	})

	// Stringify the final object with pretty printing for readability.
	const finalJsonString = JSON.stringify(allWidgetJsonSchemas, null, 2)

	// Dump the entire schema to the console.
	// biome-ignore lint/suspicious/noConsole: This script's purpose is to dump to stdout.
	console.log(finalJsonString)
}

// Execute the main function and handle any top-level errors.
const result = await errors.try(main())
if (result.error) {
	logger.error("Script execution failed with a critical error", { error: result.error })
	process.exit(1)
}

logger.info("Script finished successfully. The complete widget JSON schema has been printed to the console.")
process.exit(0)
