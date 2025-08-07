import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"

import { AnyInteractionSchema } from "@/lib/qti-generation/schemas"

async function main(): Promise<void> {
	// Build a minimal interaction collection schema with two slots to reproduce the issue
	const shape: Record<string, z.ZodType> = {
		interaction_1: AnyInteractionSchema,
		interaction_2: AnyInteractionSchema
	}
	const InteractionCollectionSchema = z.object(shape).describe("A collection of fully-defined QTI interaction objects.")

	const responseFormat = zodResponseFormat(InteractionCollectionSchema, "interaction_content_generator")

	const schema = responseFormat.json_schema?.schema
	if (!schema) {
		throw errors.new("missing json schema from response format")
	}

	logger.info("generated interaction collection json schema", {
		schema: JSON.stringify(schema, null, 2)
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("failed to generate interaction collection schema", { error: result.error })
	process.exit(1)
}
