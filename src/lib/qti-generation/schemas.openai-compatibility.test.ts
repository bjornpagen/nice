import { describe, expect, test } from "bun:test"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import {
	AnyInteractionSchema,
	AssessmentItemSchema,
	AssessmentItemShellSchema,
	BlockContentSchema,
	createBlockContentSchema,
	createDynamicAssessmentItemSchema,
	createInlineContentSchema,
	InlineContentSchema
} from "@/lib/qti-generation/schemas"
import type { typedSchemas } from "@/lib/widgets/generators"

describe("QTI Compiler Schema OpenAI Compatibility", () => {
	// This test ensures all QTI generation schemas are compatible with OpenAI's structured outputs.
	// OpenAI's API does not support JSON Schema `$ref` properties, which can appear when
	// Zod schemas have complex nested structures or circular references.
	// This test proactively detects any `$ref` properties to ensure our schemas work with OpenAI.

	const schemasToTest = {
		InlineContentSchema: InlineContentSchema,
		BlockContentSchema: BlockContentSchema,
		AssessmentItemSchema: AssessmentItemSchema,
		AnyInteractionSchema: AnyInteractionSchema,
		AssessmentItemShellSchema: AssessmentItemShellSchema
	}

	for (const [schemaName, zodSchema] of Object.entries(schemasToTest)) {
		test(`${schemaName} should not contain $ref properties`, () => {
			const responseFormat = zodResponseFormat(zodSchema, `qti_${schemaName}`)
			const jsonSchema = responseFormat.json_schema?.schema
			const schemaString = JSON.stringify(jsonSchema, null, 2)

			expect(schemaString).not.toInclude(`"$ref"`)
		})
	}

	test("createDynamicAssessmentItemSchema should generate schemas without $ref properties", () => {
		// Test with a sample widget mapping
		const widgetMapping: Record<string, keyof typeof typedSchemas> = {
			widget1: "3dIntersectionDiagram",
			widget2: "angleDiagram",
			widget3: "barChart"
		}

		const { AssessmentItemSchema: DynamicSchema } = createDynamicAssessmentItemSchema(widgetMapping)

		const responseFormat = zodResponseFormat(DynamicSchema, "dynamic_assessment_item")
		const jsonSchema = responseFormat.json_schema?.schema
		const schemaString = JSON.stringify(jsonSchema, null, 2)

		expect(schemaString).not.toInclude(`"$ref"`)
	})

	test("Deeply nested content structures should not produce $ref properties", () => {
		// Create a complex nested structure to stress-test the schemas
		const ComplexNestedSchema = z.object({
			title: z.string(),
			body: createBlockContentSchema(),
			sections: z.array(
				z.object({
					heading: createInlineContentSchema(),
					content: createBlockContentSchema(),
					subsections: z.array(
						z.object({
							title: createInlineContentSchema(),
							paragraphs: createBlockContentSchema()
						})
					)
				})
			)
		})

		const responseFormat = zodResponseFormat(ComplexNestedSchema, "complex_nested")
		const jsonSchema = responseFormat.json_schema?.schema
		const schemaString = JSON.stringify(jsonSchema, null, 2)

		expect(schemaString).not.toInclude(`"$ref"`)
	})

	// Test individual interaction schemas that are used within AnyInteractionSchema
	test("Individual interaction schemas should not contain $ref properties", () => {
		// We'll create minimal versions of each interaction type to test
		const interactionExamples = [
			{
				name: "ChoiceInteraction",
				schema: z.object({
					type: z.literal("choiceInteraction"),
					prompt: createInlineContentSchema(),
					choices: z.array(
						z.object({
							identifier: z.string(),
							content: createBlockContentSchema(),
							feedback: createInlineContentSchema().nullable()
						})
					)
				})
			},
			{
				name: "OrderInteraction",
				schema: z.object({
					type: z.literal("orderInteraction"),
					prompt: createInlineContentSchema(),
					choices: z.array(
						z.object({
							identifier: z.string(),
							content: createBlockContentSchema(),
							feedback: createInlineContentSchema().nullable()
						})
					)
				})
			},
			{
				name: "InlineChoiceInteraction",
				schema: z.object({
					type: z.literal("inlineChoiceInteraction"),
					prompt: createInlineContentSchema(),
					choices: z.array(
						z.object({
							identifier: z.string(),
							content: createInlineContentSchema()
						})
					)
				})
			},
			{
				name: "TextEntryInteraction",
				schema: z.object({
					type: z.literal("textEntryInteraction"),
					prompt: createInlineContentSchema(),
					expectedLength: z.number()
				})
			}
		]

		for (const { name, schema } of interactionExamples) {
			const responseFormat = zodResponseFormat(schema, `interaction_${name}`)
			const jsonSchema = responseFormat.json_schema?.schema
			const schemaString = JSON.stringify(jsonSchema, null, 2)

			expect(schemaString).not.toInclude(`"$ref"`)
		}
	})
})
