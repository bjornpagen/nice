#!/usr/bin/env bun

import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { ZodTypeAny } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"
import { typedSchemas } from "@/lib/widgets/generators"

// Function to convert a single schema to JSON Schema
function schemaToJson(name: string, schema: ZodTypeAny) {
	const jsonSchema = zodToJsonSchema(schema, {
		name,
		$refStrategy: "none", // Inline all definitions for clarity
		errorMessages: true,
		markdownDescription: true
	})
	return jsonSchema
}

// Output file path
const outputPath = path.join(process.cwd(), "src/lib/widgets/todo/current-widget-schemas.json")

// Convert all schemas to JSON
const allSchemas: Record<string, unknown> = {}

logger.info("starting widget schema conversion", {
	totalSchemas: Object.keys(typedSchemas).length,
	outputPath
})

for (const [name, schema] of Object.entries(typedSchemas)) {
	logger.debug("converting schema", { name })
	allSchemas[name] = schemaToJson(name, schema)
}

// Write the schemas to file
const writeResult = errors.trySync(() => {
	const dir = path.dirname(outputPath)
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
	}
	fs.writeFileSync(outputPath, JSON.stringify(allSchemas, null, 2))
})
if (writeResult.error) {
	logger.error("failed to write schemas", { error: writeResult.error, outputPath })
	throw errors.wrap(writeResult.error, "writing widget schemas")
}

// Log summary
logger.info("widget schemas written successfully", {
	totalWidgetTypes: Object.keys(allSchemas).length,
	outputPath,
	widgetTypes: Object.keys(allSchemas)
})
