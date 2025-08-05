import { describe, expect, test } from "bun:test"
import { zodResponseFormat } from "openai/helpers/zod"
import { typedSchemas } from "@/lib/widgets/generators"

describe("Zod Schema to OpenAI JSON Schema Conversion", () => {
	// This test is critical for ensuring compatibility with the OpenAI API.
	// The `zodResponseFormat` helper function converts our Zod schemas into a JSON schema
	// that we send to OpenAI to enforce a structured response.
	// However, if the Zod schema is complex (e.g., contains nested objects defined separately
	// and reused), the resulting JSON schema may contain `$ref` properties, which act as
	// pointers to other parts of the schema. The OpenAI API does not support these `$ref`
	// properties and will fail if they are present.
	// This test proactively detects any `$ref` properties in the generated schemas,
	// ensuring that all our widget schemas are directly usable with the API.
	// If this test fails, it means a Zod schema needs to be refactored (e.g., by inlining
	// the nested schema definition) to remove the reference.
	for (const [widgetType, zodSchema] of Object.entries(typedSchemas)) {
		test(`should generate a zodResponseFormat for '${widgetType}' without any '$ref' properties`, () => {
			// Generate the response format object that would be sent to OpenAI.
			const responseFormat = zodResponseFormat(zodSchema, `zod_schema_for_${widgetType}`)

			// Extract the JSON schema part of the response format.
			const jsonSchema = responseFormat.json_schema?.schema

			// Convert the JSON schema to a string for easy searching.
			const schemaString = JSON.stringify(jsonSchema, null, 2)

			// Assert that the string representation of the schema does not contain the "$ref" key.
			expect(schemaString).not.toInclude(`"$ref"`)
		})
	}
})
