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
	function isRecord(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value)
	}

	// Helper: recursively assert that no object with $ref has forbidden siblings
	function assertNoInvalidRefSiblings(node: unknown, path: string[] = []): void {
		if (isRecord(node)) {
			if ("$ref" in node) {
				expect(node).not.toHaveProperty("default")
				expect(node).not.toHaveProperty("description")
			}
			for (const [key, value] of Object.entries(node)) {
				assertNoInvalidRefSiblings(value, [...path, key])
			}
		} else if (Array.isArray(node)) {
			for (let i = 0; i < node.length; i++) {
				assertNoInvalidRefSiblings(node[i], [...path, String(i)])
			}
		}
	}

	// Helper: recursively assert no "default" keys exist anywhere
	function assertNoDefaults(node: unknown, path: string[] = []): void {
		if (isRecord(node)) {
			expect(node).not.toHaveProperty("default")
			for (const [key, value] of Object.entries(node)) {
				assertNoDefaults(value, [...path, key])
			}
		} else if (Array.isArray(node)) {
			for (let i = 0; i < node.length; i++) {
				assertNoDefaults(node[i], [...path, String(i)])
			}
		}
	}

	const schemasToTest = {
		InlineContentSchema: InlineContentSchema,
		BlockContentSchema: BlockContentSchema,
		AssessmentItemSchema: AssessmentItemSchema,
		AnyInteractionSchema: AnyInteractionSchema,
		AssessmentItemShellSchema: AssessmentItemShellSchema
	}

	for (const [schemaName, zodSchema] of Object.entries(schemasToTest)) {
		test(`${schemaName} should be OpenAI compatible (no defaults; no invalid $ref siblings)`, () => {
			const responseFormat = zodResponseFormat(zodSchema, `qti_${schemaName}`)
			const jsonSchema = responseFormat.json_schema?.schema
			expect(jsonSchema).toBeDefined()
			assertNoDefaults(jsonSchema)
			assertNoInvalidRefSiblings(jsonSchema)
		})
	}

	test("createDynamicAssessmentItemSchema should be OpenAI compatible (no defaults; no invalid $ref siblings)", () => {
		// Test with a sample widget mapping
		const widgetMapping: Record<string, keyof typeof typedSchemas> = {
			widget1: "threeDIntersectionDiagram",
			widget2: "angleDiagram",
			widget3: "barChart"
		}

		const { AssessmentItemSchema: DynamicSchema } = createDynamicAssessmentItemSchema(widgetMapping)

		const responseFormat = zodResponseFormat(DynamicSchema, "dynamic_assessment_item")
		const jsonSchema = responseFormat.json_schema?.schema
		expect(jsonSchema).toBeDefined()
		assertNoDefaults(jsonSchema)
		assertNoInvalidRefSiblings(jsonSchema)
	})

	test("Deeply nested content structures should be OpenAI compatible (no defaults; no invalid $ref siblings)", () => {
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
		expect(jsonSchema).toBeDefined()
		assertNoDefaults(jsonSchema)
		assertNoInvalidRefSiblings(jsonSchema)
	})

	// Test individual interaction schemas that are used within AnyInteractionSchema
	test("Individual interaction schemas should be OpenAI compatible (no defaults; no invalid $ref siblings)", () => {
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
			expect(jsonSchema).toBeDefined()
			assertNoDefaults(jsonSchema)
			assertNoInvalidRefSiblings(jsonSchema)
		}
	})

	test("Interaction collection schema used for generation should be OpenAI compatible", () => {
		// Build a collection schema similar to interaction_content_generator
		const InteractionCollectionSchema = z
			.object({
				interaction_1: AnyInteractionSchema,
				interaction_2: AnyInteractionSchema
			})
			.describe("A collection of fully-defined QTI interaction objects.")

		const responseFormat = zodResponseFormat(InteractionCollectionSchema, "interaction_content_generator")
		const jsonSchema = responseFormat.json_schema?.schema
		expect(jsonSchema).toBeDefined()
		assertNoDefaults(jsonSchema)
		assertNoInvalidRefSiblings(jsonSchema)
	})
})
