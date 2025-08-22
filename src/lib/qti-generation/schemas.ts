import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { typedSchemas } from "@/lib/widgets/generators"
import { MATHML_INNER_PATTERN } from "@/lib/widgets/utils/mathml"

// Safe identifier pattern: strictly alphanumeric and underscores, starting with letter or underscore
const SAFE_IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/

// LEVEL 2: INLINE CONTENT (for paragraphs, prompts, etc.)
// Factory functions to create fresh schema instances (avoids $ref in JSON Schema)
function createInlineContentItemSchema() {
	return z
		.discriminatedUnion("type", [
			z
				.object({
					type: z.literal("text").describe("Identifies this as plain text content"),
					content: z.string().describe("The actual text content to display")
				})
				.strict()
				.describe("Plain text content that will be rendered as-is"),
			z
				.object({
					type: z.literal("math").describe("Identifies this as mathematical content"),
					mathml: z
						.string()
						.regex(MATHML_INNER_PATTERN, "invalid mathml snippet; must be inner MathML without outer <math> wrapper")
						.describe("Inner MathML markup (no outer <math> element)")
				})
				.strict()
				.describe("Mathematical content represented in MathML format"),
			z
				.object({
					type: z
						.literal("inlineSlot")
						.describe("Identifies this as an inline placeholder for widgets or interactions"),
					slotId: z.string().describe("Unique identifier that matches a widget or interaction key")
				})
				.strict()
				.describe("Placeholder for inline content that will be filled with a widget or interaction")
		])
		.describe("Union type representing any inline content element")
}

export function createInlineContentSchema() {
	return z
		.array(createInlineContentItemSchema())
		.describe("Array of inline content items that can be rendered within a paragraph or prompt")
}

export const InlineContentSchema = createInlineContentSchema()
export type InlineContent = z.infer<typeof InlineContentSchema>

// LEVEL 1: BLOCK CONTENT (for body, feedback, choice content, etc.)
// Factory functions for block content
function createBlockContentItemSchema() {
	return z
		.discriminatedUnion("type", [
			z
				.object({
					type: z.literal("paragraph").describe("Identifies this as a paragraph block"),
					content: createInlineContentSchema().describe("The inline content contained within this paragraph")
				})
				.strict()
				.describe("A paragraph block containing inline content"),
			z
				.object({
					type: z.literal("blockSlot").describe("Identifies this as a block-level placeholder"),
					slotId: z.string().describe("Unique identifier that matches a widget or interaction key")
				})
				.strict()
				.describe("Placeholder for block-level content that will be filled with a widget or interaction")
		])
		.describe("Union type representing any block-level content element")
}

export function createBlockContentSchema() {
	return z
		.array(createBlockContentItemSchema())
		.describe("Array of block content items representing the document structure")
}

export const BlockContentSchema = createBlockContentSchema()
export type BlockContent = z.infer<typeof BlockContentSchema>

export function createDynamicAssessmentItemSchema(widgetMapping: Record<string, keyof typeof typedSchemas>) {
	// Dynamically build the Zod shape for the 'widgets' property.
	const widgetShape: Record<string, z.ZodType> = {}
	for (const [slotName, widgetType] of Object.entries(widgetMapping)) {
		const schema = typedSchemas[widgetType]
		if (schema) {
			widgetShape[slotName] = schema
		} else {
			// Safeguard against invalid widget types.
			logger.error("unknown widget type in mapping", {
				slotName,
				widgetType,
				availableTypes: Object.keys(typedSchemas)
			})
			throw errors.new(`unknown widget type specified in mapping: ${widgetType}`)
		}
	}

	const DynamicWidgetsSchema = z.object(widgetShape).describe("Map of widget slot IDs to their widget definitions")

	const InlineChoiceSchema = z
		.object({
			identifier: z
				.string()
				.regex(SAFE_IDENTIFIER_REGEX, "invalid identifier: must match [A-Za-z_][A-Za-z0-9._-]*")
				.describe("Unique identifier for this inline choice option."),
			content: createInlineContentSchema().describe("The inline content displayed in the dropdown menu.")
		})
		.strict()
		.describe("Represents a single option within an inline dropdown choice interaction.")

	const ChoiceInteractionSchema = z
		.object({
			type: z.literal("choiceInteraction").describe("Identifies this as a multiple choice interaction."),
			responseIdentifier: z
				.string()
				.regex(SAFE_IDENTIFIER_REGEX, "invalid response identifier")
				.describe("Links this interaction to its response declaration for scoring."),
			prompt: createInlineContentSchema().describe("The question or instruction presented to the user."),
			choices: z
				.array(
					z
						.object({
							identifier: z
								.string()
								.regex(SAFE_IDENTIFIER_REGEX, "invalid identifier: must match [A-Za-z_][A-Za-z0-9._-]*")
								.describe("Unique identifier for this choice option, used for response matching."),
							content: createBlockContentSchema().describe(
								"Rich content for this choice option, supporting text, math, and embedded widgets."
							),
							feedback: createInlineContentSchema()
								.nullable()
								.describe("Optional feedback shown when this choice is selected.")
						})
						.strict()
						.describe("A single choice option with content and optional feedback")
				)
				// NOTE: OpenAI structured outputs don't support .min() constraints, so we validate length at runtime
				.describe("Array of selectable choice options."),
			shuffle: z.literal(true).describe("Whether to randomize the order of choices. Always true to ensure fairness."),
			minChoices: z.number().int().min(0).describe("The minimum number of choices the user must select."),
			maxChoices: z.number().int().min(1).describe("The maximum number of choices the user can select.")
		})
		.strict()
		.describe("A multiple choice question where users select one or more options from a list.")

	const InlineChoiceInteractionSchema = z
		.object({
			type: z.literal("inlineChoiceInteraction").describe("Identifies this as an inline dropdown interaction."),
			responseIdentifier: z
				.string()
				.regex(SAFE_IDENTIFIER_REGEX, "invalid response identifier")
				.describe("Links this interaction to its response declaration for scoring."),
			choices: z
				.array(InlineChoiceSchema)
				.describe("Array of options available in the dropdown menu."),
			shuffle: z.literal(true).describe("Whether to randomize dropdown options. Always true to ensure fairness.")
		})
		.strict()
		.describe("An inline dropdown menu embedded within text, ideal for fill-in-the-blank questions.")

	const TextEntryInteractionSchema = z
		.object({
			type: z.literal("textEntryInteraction").describe("Identifies this as a text input interaction."),
			responseIdentifier: z.string().describe("Links this interaction to its response declaration for scoring."),
			expectedLength: z.number().int().nullable().describe("Optional hint for expected answer length in characters.")
		})
		.strict()
		.describe("A text input field where users type their answer, supporting both short and long responses.")

	const OrderInteractionSchema = z
		.object({
			type: z.literal("orderInteraction").describe("Identifies this as an ordering/sequencing interaction."),
			responseIdentifier: z.string().describe("Links this interaction to its response declaration for scoring."),
			prompt: createInlineContentSchema().describe(
				"Explicit instructions for arranging items that MUST: (1) name the sort property (e.g., density, size, value), (2) state the sort direction using unambiguous phrases like 'least to greatest' or 'greatest to least', and (3) include the axis phrase '(top to bottom)' to match the enforced vertical orientation."
			),
			choices: z
				.array(
					z
						.object({
							identifier: z.string().describe("Unique identifier for this choice option, used for response matching."),
							content: createBlockContentSchema().describe("Rich content for this orderable item."),
							feedback: createInlineContentSchema().nullable().describe("Optional feedback shown for this item.")
						})
						.strict()
						.describe("An orderable item with content and optional feedback")
				)
				// NOTE: OpenAI structured outputs don't support .min() constraints, so we validate length at runtime
				.describe("Array of items to be arranged in order."),
			shuffle: z
				.literal(true)
				.describe("Whether to randomize initial order. Always true to ensure varied starting points."),
			orientation: z
				.literal("vertical")
				.describe(
					"Visual layout direction for the orderable items. Only vertical orientation is supported. Prompts MUST include '(top to bottom)'."
				)
		})
		.strict()
		.describe(
			"An interaction where users arrange items in a specific sequence or order. Prompts must never be vague (e.g., 'Arrange the items in correct order'). They must specify the sort property, the direction (ascending/descending using 'least to greatest'/'greatest to least'), and include the axis phrase '(top to bottom)'."
		)

	const UnsupportedInteractionSchema = z
		.object({
			type: z
				.literal("unsupportedInteraction")
				.describe("Identifies this as an interaction type that is not supported."),
			perseusType: z.string().describe("The original Perseus widget type that was identified as unsupported."),
			responseIdentifier: z.string().describe("Placeholder for the response identifier from the shell.")
		})
		.strict()
		.describe(
			"A placeholder for Perseus widgets that require interactive features not supported by the QTI schema, such as drawing or graphing."
		)

	const AnyInteractionSchema = z
		.discriminatedUnion("type", [
			ChoiceInteractionSchema,
			InlineChoiceInteractionSchema,
			TextEntryInteractionSchema,
			OrderInteractionSchema,
			UnsupportedInteractionSchema
		])
		.describe("A discriminated union representing any possible QTI interaction type supported by the system.")

	const ResponseDeclarationSchema = z
		.object({
			identifier: z
				.string()
				.regex(SAFE_IDENTIFIER_REGEX, "invalid response identifier")
				.describe("Unique ID linking an interaction to this response declaration."),
			cardinality: z
				.enum(["single", "multiple", "ordered"])
				.describe("Defines response structure: single value, multiple values, or ordered sequence."),
			baseType: z
				.enum(["identifier", "string", "integer", "float"])
				.describe("Data type of the response values for validation and scoring."),
			correct: z
				.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())])
				.describe("The correct answer(s). For multiple correct answers, provide an array of values.")
		})
		.strict()
		.describe("Defines the correct answer(s) for an interaction.")

	const FeedbackSchema = z
		.object({
			correct: createBlockContentSchema().describe("Encouraging message shown when the user answers correctly."),
			incorrect: createBlockContentSchema().describe("Helpful feedback shown when the user answers incorrectly.")
		})
		.strict()
		.describe("Feedback messages displayed based on answer correctness.")

	// The FINAL schema used by the compiler. It expects full widget/interaction objects.
	const AssessmentItemSchema = z
		.object({
			identifier: z.string().describe("Unique identifier for this assessment item."),
			title: z.string().describe("Human-readable title of the assessment item."),
			responseDeclarations: z
				.array(ResponseDeclarationSchema)
				.describe("Defines correct answers and scoring for all interactions in this item."),
			body: createBlockContentSchema().nullable().describe("The main content of the item as structured blocks."),
			widgets: DynamicWidgetsSchema.nullable().describe(
				"A map of widget identifiers to their full widget object definitions."
			),
			interactions: z
				.record(AnyInteractionSchema)
				.nullable()
				.describe("A map of interaction identifiers to their full interaction object definitions."),
			feedback: FeedbackSchema.describe("Global feedback messages for the entire assessment item.")
		})
		.strict()
		.describe("A complete QTI 3.0 assessment item with content, interactions, and scoring rules.")

	// The SHELL schema produced by Shot 1 of the AI pipeline.
	// It has a structured body but only lists the *names* of slots to be filled.
	const AssessmentItemShellSchema = AssessmentItemSchema.extend({
		body: createBlockContentSchema().nullable().describe("The main content with slot placeholders."),
		widgets: z.array(z.string()).describe("A list of unique identifiers for widget slots that must be filled."),
		interactions: z
			.array(z.string())
			.describe("A list of unique identifiers for interaction slots that must be filled.")
	})
		.strict()
		.describe("Initial assessment item structure with slot placeholders from the first AI generation shot.")

	return { AssessmentItemSchema, AnyInteractionSchema, AssessmentItemShellSchema }
}

const {
	AssessmentItemSchema: BaseAssessmentItemSchema,
	AnyInteractionSchema: BaseAnyInteractionSchema,
	AssessmentItemShellSchema: BaseAssessmentItemShellSchema
} = createDynamicAssessmentItemSchema({})

export const AssessmentItemSchema = BaseAssessmentItemSchema
export const AnyInteractionSchema = BaseAnyInteractionSchema
export const AssessmentItemShellSchema = BaseAssessmentItemShellSchema

export type AnyInteraction = z.infer<typeof AnyInteractionSchema>
export type AssessmentItem = z.infer<typeof AssessmentItemSchema>
export type AssessmentItemInput = z.input<typeof AssessmentItemSchema>
export type AssessmentItemShell = z.infer<typeof AssessmentItemShellSchema>
export type Widget = z.infer<(typeof typedSchemas)[keyof typeof typedSchemas]>
