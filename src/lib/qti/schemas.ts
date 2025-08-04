import { z } from "zod"
import { WidgetSchema } from "@/lib/widgets/generators" // Note: We don't need WidgetInput here anymore

// 1. Schemas for various content types and interactions

// Replace z.custom with the actual WidgetSchema. This is the correct foundation.
const SimpleContentSchema = z.union([z.string(), WidgetSchema])

const SimpleChoiceSchema = z.object({
	identifier: z.string(),
	content: SimpleContentSchema,
	feedback: z.string().nullable()
})

const InlineChoiceSchema = z.object({
	identifier: z.string(),
	content: z.string()
})

const ChoiceInteractionSchema = z.object({
	type: z.literal("choiceInteraction"),
	responseIdentifier: z.string(),
	prompt: z.string(),
	choices: z.array(SimpleChoiceSchema),
	shuffle: z
		.boolean()
		.nullable()
		.transform((val) => val ?? true),
	minChoices: z.number().int().min(0).describe("The minimum number of choices the user must select."),
	maxChoices: z.number().int().min(1).describe("The maximum number of choices the user can select.")
})

const InlineChoiceInteractionSchema = z.object({
	type: z.literal("inlineChoiceInteraction"),
	responseIdentifier: z.string(),
	choices: z.array(InlineChoiceSchema),
	shuffle: z
		.boolean()
		.nullable()
		.transform((val) => val ?? false)
})

const TextEntryInteractionSchema = z.object({
	type: z.literal("textEntryInteraction"),
	responseIdentifier: z.string(),
	expectedLength: z.number().int().nullable()
})

const OrderInteractionSchema = z.object({
	type: z.literal("orderInteraction"),
	responseIdentifier: z.string(),
	prompt: z.string(),
	choices: z.array(SimpleChoiceSchema),
	shuffle: z
		.boolean()
		.nullable()
		.transform((val) => val ?? true),
	orientation: z
		.enum(["horizontal", "vertical"])
		.nullable()
		.transform((val) => val ?? "horizontal")
})

export const AnyInteractionSchema = z.discriminatedUnion("type", [
	ChoiceInteractionSchema,
	InlineChoiceInteractionSchema,
	TextEntryInteractionSchema,
	OrderInteractionSchema
])
export type AnyInteraction = z.infer<typeof AnyInteractionSchema>

// This allows mixing content (like <p> or <img>) with interactions in a single array.
const ItemBodyElementSchema = z.union([SimpleContentSchema, AnyInteractionSchema])

// 2. Schemas for Item Structure
const ResponseDeclarationSchema = z.object({
	identifier: z.string(),
	cardinality: z.enum(["single", "multiple", "ordered"]),
	baseType: z.enum(["identifier", "string", "integer", "float"]),
	correct: z.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())]),
	mapping: z.record(z.string(), z.union([z.string(), z.number()])).nullable()
})

// 3. Top-level schema for a complete QTI Assessment Item
export const AssessmentItemSchema = z.object({
	identifier: z.string(),
	title: z.string(),
	responseDeclarations: z.array(ResponseDeclarationSchema),
	body: z.array(ItemBodyElementSchema),
	feedback: z.object({
		correct: z.string(),
		incorrect: z.string()
	})
})

// EXPORT BOTH THE INPUT AND OUTPUT TYPES
export type AssessmentItem = z.infer<typeof AssessmentItemSchema> // The parsed data with defaults
export type AssessmentItemInput = z.input<typeof AssessmentItemSchema> // The raw data before parsing
