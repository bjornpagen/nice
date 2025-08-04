import { z } from "zod"
import { WidgetSchema } from "@/lib/widgets/generators" // Note: We don't need WidgetInput here anymore

// 1. Schemas for various content types and interactions

// Replace z.custom with the actual WidgetSchema. This is the correct foundation.
const SimpleContentSchema = z
	.union([z.string(), WidgetSchema])
	.describe("Content that can be either plain text/MathML or a structured widget visualization.")

const SimpleChoiceSchema = z
	.object({
		identifier: z.string().describe("Unique identifier for this choice option, used for response matching."),
		content: SimpleContentSchema.describe(
			"The visible content of this choice, supporting text/MathML or rich widgets."
		),
		feedback: z.string().nullable().describe("Optional feedback text shown when this choice is selected.")
	})
	.strict() // ADD: Enforce strict schema
	.describe("Represents a single choice option in a multiple choice or ordering question.")

const InlineChoiceSchema = z
	.object({
		identifier: z.string().describe("Unique identifier for this inline choice option."),
		content: z.string().describe("The text content displayed in the dropdown menu.")
	})
	.strict() // ADD: Enforce strict schema
	.describe("Represents a single option within an inline dropdown choice interaction.")

const ChoiceInteractionSchema = z
	.object({
		type: z.literal("choiceInteraction").describe("Identifies this as a multiple choice interaction."),
		responseIdentifier: z.string().describe("Links this interaction to its response declaration for scoring."),
		prompt: z.string().describe("The question or instruction text presented to the user."),
		choices: z.array(SimpleChoiceSchema).describe("Array of selectable choice options."),
		shuffle: z
			.boolean()
			.nullable()
			.transform((val) => val ?? true)
			.describe("Whether to randomize the order of choices. Defaults to true for fairness."),
		minChoices: z.number().int().min(0).describe("The minimum number of choices the user must select."),
		maxChoices: z.number().int().min(1).describe("The maximum number of choices the user can select.")
	})
	.strict() // ADD: Enforce strict schema
	.describe("A multiple choice question where users select one or more options from a list.")

const InlineChoiceInteractionSchema = z
	.object({
		type: z.literal("inlineChoiceInteraction").describe("Identifies this as an inline dropdown interaction."),
		responseIdentifier: z.string().describe("Links this interaction to its response declaration for scoring."),
		choices: z.array(InlineChoiceSchema).describe("Array of options available in the dropdown menu."),
		shuffle: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe("Whether to randomize dropdown options. Defaults to false for consistency.")
	})
	.strict() // ADD: Enforce strict schema
	.describe("An inline dropdown menu embedded within text, ideal for fill-in-the-blank questions.")

const TextEntryInteractionSchema = z
	.object({
		type: z.literal("textEntryInteraction").describe("Identifies this as a text input interaction."),
		responseIdentifier: z.string().describe("Links this interaction to its response declaration for scoring."),
		expectedLength: z.number().int().nullable().describe("Optional hint for expected answer length in characters.")
	})
	.strict() // ADD: Enforce strict schema
	.describe("A text input field where users type their answer, supporting both short and long responses.")

const OrderInteractionSchema = z
	.object({
		type: z.literal("orderInteraction").describe("Identifies this as an ordering/sequencing interaction."),
		responseIdentifier: z.string().describe("Links this interaction to its response declaration for scoring."),
		prompt: z.string().describe("Instructions asking the user to arrange items in correct order."),
		choices: z.array(SimpleChoiceSchema).describe("Array of items to be arranged in order."),
		shuffle: z
			.boolean()
			.nullable()
			.transform((val) => val ?? true)
			.describe("Whether to randomize initial order. Defaults to true to ensure varied starting points."),
		orientation: z
			.enum(["horizontal", "vertical"])
			.nullable()
			.transform((val) => val ?? "horizontal")
			.describe("Visual layout direction for the orderable items.")
	})
	.strict() // ADD: Enforce strict schema
	.describe("An interaction where users arrange items in a specific sequence or order.")

export const AnyInteractionSchema = z.discriminatedUnion("type", [
	ChoiceInteractionSchema,
	InlineChoiceInteractionSchema,
	TextEntryInteractionSchema,
	OrderInteractionSchema
])
export type AnyInteraction = z.infer<typeof AnyInteractionSchema>

// This allows mixing content (like <p> or <img>) with interactions in a single array.
const ItemBodyElementSchema = z
	.union([SimpleContentSchema, AnyInteractionSchema])
	.describe("A flexible element that can be either static content or an interactive component.")

// 2. Schemas for Item Structure
const ResponseDeclarationSchema = z
	.object({
		identifier: z.string().describe("Unique ID linking an interaction to this response declaration."),
		cardinality: z
			.enum(["single", "multiple", "ordered"])
			.describe("Defines response structure: single value, multiple values, or ordered sequence."),
		baseType: z
			.enum(["identifier", "string", "integer", "float"])
			.describe("Data type of the response values for validation and scoring."),
		correct: z
			.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())])
			.describe("The correct answer(s). Format depends on cardinality: single value or array."),
		mapping: z
			.record(z.string(), z.union([z.string(), z.number()]))
			.nullable()
			.describe("Optional score mapping for partial credit, mapping responses to point values.")
	})
	.strict() // ADD: Enforce strict schema
	.describe("Defines correct answers and scoring rules for an interaction.")

// Define feedback schema separately to avoid inline object issues with o3 model
const FeedbackSchema = z
	.object({
		correct: z.string().describe("Encouraging message shown when the user answers correctly."),
		incorrect: z.string().describe("Helpful feedback shown when the user answers incorrectly.")
	})
	.strict() // ADD: Enforce strict schema
	.describe("Feedback messages displayed based on answer correctness.")

// 3. Top-level schema for a complete QTI Assessment Item
export const AssessmentItemSchema = z
	.object({
		identifier: z.string().describe("Unique identifier for this assessment item."),
		title: z.string().describe("Human-readable title of the assessment item."),
		responseDeclarations: z
			.array(ResponseDeclarationSchema)
			.describe("Defines correct answers and scoring for all interactions in this item."),
		body: z.array(ItemBodyElementSchema).describe("The item content: mix of text, media, and interactive elements."),
		feedback: FeedbackSchema.describe("Global feedback messages for the entire assessment item.")
	})
	.strict() // ADD: Enforce strict schema
	.describe("A complete QTI 3.0 assessment item with content, interactions, and scoring rules.")

// EXPORT BOTH THE INPUT AND OUTPUT TYPES
export type AssessmentItem = z.infer<typeof AssessmentItemSchema> // The parsed data with defaults
export type AssessmentItemInput = z.input<typeof AssessmentItemSchema> // The raw data before parsing
