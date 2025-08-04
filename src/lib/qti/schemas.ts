import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { typedSchemas } from "@/lib/widgets/generators"

// NEW: Define a type alias for any possible widget schema for clarity and reuse.
type AnyWidgetSchema = (typeof typedSchemas)[keyof typeof typedSchemas]

// A factory function to dynamically create the schema with a subset of widgets.
// It's renamed to createDynamicSchemas to reflect that it creates multiple related schemas.
export function createDynamicSchemas(widgetKeys: (keyof typeof typedSchemas)[]) {
	// REFACTORED: Use .reduce() for a more robust and correctly typed filter.
	// This replaces the faulty .map().filter() chain.
	const selectedWidgetSchemas = widgetKeys.reduce<AnyWidgetSchema[]>((acc, key) => {
		const schema = typedSchemas[key]
		if (schema) {
			acc.push(schema)
		}
		return acc
	}, [])

	// Safely construct the discriminated union for widgets.
	// This now correctly handles cases for 0, 1, or 2+ selected widgets without non-null assertions.
	let DynamicWidgetSchema: z.ZodType
	if (selectedWidgetSchemas.length === 0) {
		// If no widgets, create a schema that will always fail for widget objects
		DynamicWidgetSchema = z
			.object({ type: z.string() })
			.refine(() => false, "No widgets were selected for this dynamic schema")
	} else if (selectedWidgetSchemas.length === 1) {
		// If one widget, it's just that widget's schema
		const schema = selectedWidgetSchemas[0]
		// This explicit check satisfies the compiler that the schema is not undefined.
		if (!schema) {
			throw errors.new("Impossible state: schema is undefined despite length check.")
		}
		DynamicWidgetSchema = schema
	} else {
		// If 2+ widgets, create the discriminated union.
		const [first, second, ...rest] = selectedWidgetSchemas
		// This explicit check is required to satisfy TypeScript's strict type requirements
		// for z.discriminatedUnion, which expects a tuple of at least two elements.
		if (!first || !second) {
			throw errors.new("Impossible state: schemas are undefined despite length check.")
		}
		DynamicWidgetSchema = z.discriminatedUnion("type", [first, second, ...rest])
	}

	const SimpleContentSchema = z
		.union([z.string(), DynamicWidgetSchema])
		.describe("Content that can be either plain text/MathML or a structured widget visualization.")

	// All dependent schemas must be defined *inside* this factory to use the dynamic SimpleContentSchema
	const SimpleChoiceSchema = z
		.object({
			identifier: z.string().describe("Unique identifier for this choice option, used for response matching."),
			content: SimpleContentSchema.describe(
				"The visible content of this choice, supporting text/MathML or rich widgets."
			),
			feedback: z.string().nullable().describe("Optional feedback text shown when this choice is selected.")
		})
		.strict()
		.describe("Represents a single choice option in a multiple choice or ordering question.")

	const InlineChoiceSchema = z
		.object({
			identifier: z.string().describe("Unique identifier for this inline choice option."),
			content: z.string().describe("The text content displayed in the dropdown menu.")
		})
		.strict()
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
		.strict()
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
		.strict()
		.describe("An interaction where users arrange items in a specific sequence or order.")

	const AnyInteractionSchema = z.discriminatedUnion("type", [
		ChoiceInteractionSchema,
		InlineChoiceInteractionSchema,
		TextEntryInteractionSchema,
		OrderInteractionSchema
	])

	const ItemBodyElementSchema = z
		.union([SimpleContentSchema, AnyInteractionSchema])
		.describe("A flexible element that can be either static content or an interactive component.")

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
		.strict()
		.describe("Defines correct answers and scoring rules for an interaction.")

	const FeedbackSchema = z
		.object({
			correct: z.string().describe("Encouraging message shown when the user answers correctly."),
			incorrect: z.string().describe("Helpful feedback shown when the user answers incorrectly.")
		})
		.strict()
		.describe("Feedback messages displayed based on answer correctness.")

	const AssessmentItemSchema = z
		.object({
			identifier: z.string().describe("Unique identifier for this assessment item."),
			title: z.string().describe("Human-readable title of the assessment item."),
			responseDeclarations: z
				.array(ResponseDeclarationSchema)
				.describe("Defines correct answers and scoring for all interactions in this item."),
			body: z.array(ItemBodyElementSchema).describe("The item content: mix of text, media, and interactive elements."),
			feedback: FeedbackSchema.describe("Global feedback messages for the entire assessment item.")
		})
		.strict()
		.describe("A complete QTI 3.0 assessment item with content, interactions, and scoring rules.")

	return { AssessmentItemSchema, AnyInteractionSchema }
}

// Create the default schemas using all available widgets.
// Get the widget keys with proper typing
const allWidgetKeys: (keyof typeof typedSchemas)[] = [
	"absoluteValueNumberLine",
	"barChart",
	"boxPlot",
	"compositeShapeDiagram",
	"coordinatePlane",
	"dataTable",
	"discreteObjectRatioDiagram",
	"dotPlot",
	"doubleNumberLine",
	"geometricSolidDiagram",
	"hangerDiagram",
	"histogram",
	"inequalityNumberLine",
	"numberLine",
	"numberLineForOpposites",
	"numberLineWithAction",
	"numberLineWithFractionGroups",
	"numberSetDiagram",
	"parallelLinesTransversal",
	"partitionedShape",
	"pictograph",
	"polyhedronDiagram",
	"polyhedronNetDiagram",
	"pythagoreanProofDiagram",
	"scatterPlot",
	"stackedItemsDiagram",
	"tapeDiagram",
	"unitBlockDiagram",
	"vennDiagram",
	"verticalArithmeticSetup"
]
const { AssessmentItemSchema: DefaultAssessmentItemSchema, AnyInteractionSchema: DefaultAnyInteractionSchema } =
	createDynamicSchemas(allWidgetKeys)

// Export the default schemas and their derived types.
export const AssessmentItemSchema = DefaultAssessmentItemSchema
export const AnyInteractionSchema = DefaultAnyInteractionSchema
export type AnyInteraction = z.infer<typeof AnyInteractionSchema>
export type AssessmentItem = z.infer<typeof AssessmentItemSchema>
export type AssessmentItemInput = z.input<typeof AssessmentItemSchema>
