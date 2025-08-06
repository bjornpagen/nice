import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { env } from "@/env"
import {
	type AnyInteraction,
	AnyInteractionSchema,
	type AssessmentItemInput,
	AssessmentItemSchema
} from "@/lib/qti-generation/schemas"
import { typedSchemas, type WidgetInput } from "@/lib/widgets/generators"
import { buildImageContext, type ImageContext } from "./perseus-image-resolver"
// ✅ UPDATE: Import from the new, co-located prompts file.
import {
	createAssessmentShellPrompt,
	createInteractionContentPrompt,
	createWidgetContentPrompt,
	createWidgetMappingPrompt
} from "./prompts"

const OPENAI_MODEL = "o3"
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

// ADD: New exported constant error for standardized identification.
export const ErrWidgetNotFound = errors.new("widget not found")

// A new schema is needed for the shell from Shot 1.
// It defines widgets and interactions as maps of empty objects.
const AssessmentShellSchema = AssessmentItemSchema.extend({
	widgets: z.array(z.string()).describe("A list of unique identifiers for widget slots that must be filled."),
	interactions: z.array(z.string()).describe("A list of unique identifiers for interaction slots that must be filled.")
})
type AssessmentShell = z.infer<typeof AssessmentShellSchema>

/**
 * Dynamically creates a Zod schema for a collection of widgets based on a mapping.
 * @param widgetMapping A map of slot names to widget type names.
 * @returns A Zod object schema for the widget collection.
 */
function createWidgetCollectionSchema(widgetMapping: Record<string, keyof typeof typedSchemas>) {
	const shape: Record<string, z.ZodType> = {}
	for (const [slotName, widgetType] of Object.entries(widgetMapping)) {
		const schema = typedSchemas[widgetType]
		if (!schema) {
			// This check ensures we don't proceed with an invalid type from the mapping.
			throw errors.new(`unknown widget type in mapping: ${widgetType}`)
		}
		shape[slotName] = schema
	}
	// Ensure the schema is properly structured to avoid OpenAI API interpretation issues
	return z
		.object(shape)
		.strict()
		.describe("A collection of fully-defined widget objects corresponding to the provided slots.")
}

/**
 * NEW: Dynamically creates a Zod schema for a collection of interactions.
 * @param interactionSlotNames A list of interaction slot names from the shell.
 * @returns A Zod object schema for the interaction collection.
 */
function createInteractionCollectionSchema(interactionSlotNames: string[]) {
	const shape: Record<string, z.ZodType> = {}
	for (const slotName of interactionSlotNames) {
		// All interactions must conform to the AnyInteractionSchema.
		shape[slotName] = AnyInteractionSchema
	}
	return z.object(shape).describe("A collection of fully-defined QTI interaction objects.")
}

/**
 * ✅ REFACTORED: This is the new Shot 2 function.
 */
async function mapSlotsToWidgets(
	logger: logger.Logger,
	perseusJson: string,
	assessmentBody: string,
	slotNames: string[] // ✅ Takes the parsed slot names to generate the prompt.
): Promise<Record<string, keyof typeof typedSchemas>> {
	// ✅ The prompt and the schema are now generated together dynamically.
	const { systemInstruction, userContent, WidgetMappingSchema } = createWidgetMappingPrompt(
		perseusJson,
		assessmentBody,
		slotNames
	)

	const responseFormat = zodResponseFormat(WidgetMappingSchema, "widget_mapper")
	logger.debug("generated json schema for openai", {
		functionName: "mapSlotsToWidgets",
		generatorName: "widget_mapper",
		schema: JSON.stringify(responseFormat.json_schema?.schema, null, 2)
	})

	logger.debug("calling openai for slot-to-widget mapping", { slotNames })
	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: userContent }
			],
			// ✅ The dynamically generated, constrained schema is used here.
			response_format: responseFormat
		})
	)
	if (response.error) {
		logger.error("failed to map slots to widgets via openai", { error: response.error })
		throw errors.wrap(response.error, "ai widget mapping")
	}

	const choice = response.data.choices[0]
	if (!choice?.message?.parsed) {
		logger.error("CRITICAL: OpenAI widget mapping returned no parsed content")
		throw errors.new("empty ai response: no parsed content for widget mapping")
	}
	if (choice.message.refusal) {
		logger.error("openai refused widget mapping request", { refusal: choice.message.refusal })
		throw errors.new(`ai refused request: ${choice.message.refusal}`)
	}

	const rawMapping = choice.message.parsed.widget_mapping

	// Type guard to check if a value is a valid widget type
	const isValidWidgetType = (val: unknown): val is keyof typeof typedSchemas => {
		return typeof val === "string" && val in typedSchemas
	}

	// Validate and build the properly typed mapping
	const mapping: Record<string, keyof typeof typedSchemas> = {}
	for (const [key, value] of Object.entries(rawMapping)) {
		// ADD: Check for the WIDGET_NOT_FOUND signal from the AI.
		if (value === "WIDGET_NOT_FOUND") {
			const errorMessage = `AI determined no suitable widget exists for slot: '${key}'. This item is not migratable.`
			logger.error("ai determined no suitable widget exists", { slot: key, value, errorMessage })
			// Throw our new constant error, wrapping it to add context.
			throw errors.wrap(ErrWidgetNotFound, errorMessage)
		}

		if (isValidWidgetType(value)) {
			mapping[key] = value
		} else {
			logger.error("invalid widget type in mapping", { slot: key, type: value })
			throw errors.new(`invalid widget type "${value}" for slot "${key}"`)
		}
	}

	logger.info("successfully mapped slots to widgets", { mapping, count: Object.keys(mapping).length })
	return mapping
}

/**
 * NEW - Shot 1: Generate Content Shell & Plan.
 */
async function generateAssessmentShell(
	logger: logger.Logger,
	perseusJson: string,
	imageContext: ImageContext
): Promise<AssessmentShell> {
	// Assumes a new prompt function is created for this shot.
	const { systemInstruction, userContent } = createAssessmentShellPrompt(perseusJson, imageContext)

	const responseFormat = zodResponseFormat(AssessmentShellSchema, "assessment_shell_generator")
	logger.debug("generated json schema for openai", {
		functionName: "generateAssessmentShell",
		generatorName: "assessment_shell_generator",
		schema: JSON.stringify(responseFormat.json_schema?.schema, null, 2)
	})

	const messageContent: OpenAI.ChatCompletionContentPart[] = [{ type: "text", text: userContent }]
	for (const imageUrl of imageContext.rasterImageUrls) {
		messageContent.push({ type: "image_url", image_url: { url: imageUrl } })
	}

	logger.debug("calling openai for assessment shell with multimodal input")
	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: messageContent }
			],
			response_format: responseFormat
		})
	)
	if (response.error) {
		logger.error("failed to generate assessment shell", { error: response.error })
		throw errors.wrap(response.error, "ai shell generation")
	}

	const choice = response.data.choices[0]
	if (!choice) {
		logger.error("CRITICAL: OpenAI response contained no choices")
		throw errors.new("openai returned no choices")
	}

	const message = choice.message
	if (!message.parsed) {
		logger.error("CRITICAL: OpenAI returned no parsed content for shell generation")
		throw errors.new("empty ai response: no parsed content")
	}

	return message.parsed
}

/**
 * ✅ NEW: This is Shot 3. It generates ONLY the interaction content.
 */
async function generateInteractionContent(
	logger: logger.Logger,
	perseusJson: string,
	assessmentShell: AssessmentShell,
	imageContext: ImageContext
): Promise<Record<string, AnyInteraction>> {
	const interactionSlotNames = assessmentShell.interactions
	if (interactionSlotNames.length === 0) {
		logger.debug("no interactions to generate, skipping shot 3")
		return {}
	}

	// This new prompt function instructs the AI to generate the interaction objects.
	const { systemInstruction, userContent } = createInteractionContentPrompt(perseusJson, assessmentShell, imageContext)

	// Create a precise schema asking ONLY for the interactions.
	const InteractionCollectionSchema = createInteractionCollectionSchema(interactionSlotNames)
	const responseFormat = zodResponseFormat(InteractionCollectionSchema, "interaction_content_generator")

	logger.debug("generated json schema for openai", {
		functionName: "generateInteractionContent",
		generatorName: "interaction_content_generator",
		schema: JSON.stringify(responseFormat.json_schema?.schema, null, 2)
	})

	const messageContent: OpenAI.ChatCompletionContentPart[] = [{ type: "text", text: userContent }]
	for (const imageUrl of imageContext.rasterImageUrls) {
		messageContent.push({ type: "image_url", image_url: { url: imageUrl } })
	}

	logger.debug("calling openai for interaction content generation with multimodal input", { interactionSlotNames })
	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: messageContent }
			],
			response_format: responseFormat
		})
	)
	if (response.error) {
		logger.error("failed to generate interaction content", { error: response.error })
		throw errors.wrap(response.error, "ai interaction generation")
	}

	const choice = response.data.choices[0]
	if (!choice?.message?.parsed) {
		logger.error("CRITICAL: OpenAI interaction generation returned no parsed content")
		throw errors.new("empty ai response: no parsed content for interaction generation")
	}

	return choice.message.parsed
}

/**
 * NEW - Shot 4: Generate ONLY the widget objects.
 */
async function generateWidgetContent(
	logger: logger.Logger,
	perseusJson: string,
	assessmentShell: AssessmentShell,
	widgetMapping: Record<string, keyof typeof typedSchemas>,
	generatedInteractions: Record<string, AnyInteraction>,
	imageContext: ImageContext
): Promise<Record<string, WidgetInput>> {
	const widgetSlotNames = Object.keys(widgetMapping)
	if (widgetSlotNames.length === 0) {
		logger.debug("no widgets to generate, skipping shot 4")
		return {}
	}

	// This new prompt function instructs the AI to generate the widget objects.
	const { systemInstruction, userContent } = createWidgetContentPrompt(
		perseusJson,
		assessmentShell,
		widgetMapping,
		generatedInteractions,
		imageContext
	)

	// Create a precise schema asking ONLY for the widgets.
	const WidgetCollectionSchema = createWidgetCollectionSchema(widgetMapping)
	const responseFormat = zodResponseFormat(WidgetCollectionSchema, "widget_content_generator")

	logger.debug("generated json schema for openai", {
		functionName: "generateWidgetContent",
		generatorName: "widget_content_generator",
		schema: JSON.stringify(responseFormat.json_schema?.schema, null, 2)
	})

	const messageContent: OpenAI.ChatCompletionContentPart[] = [{ type: "text", text: userContent }]
	for (const imageUrl of imageContext.rasterImageUrls) {
		messageContent.push({ type: "image_url", image_url: { url: imageUrl } })
	}

	logger.debug("calling openai for widget content generation with multimodal input", { widgetSlotNames })
	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: messageContent }
			],
			response_format: responseFormat
		})
	)
	if (response.error) {
		logger.error("failed to generate widget content", { error: response.error })
		throw errors.wrap(response.error, "ai widget generation")
	}

	const choice = response.data.choices[0]
	if (!choice?.message?.parsed) {
		logger.error("CRITICAL: OpenAI widget generation returned no parsed content")
		throw errors.new("empty ai response: no parsed content for widget generation")
	}

	return choice.message.parsed
}

/**
 * Main entry point for the structured pipeline: generateStructuredQtiItem.
 * This orchestrates the 4-shot process and merges the results.
 */
export async function generateStructuredQtiItem(
	logger: logger.Logger,
	perseusData: unknown
): Promise<AssessmentItemInput> {
	const perseusJsonString = JSON.stringify(perseusData, null, 2)
	logger.info("starting structured qti generation process")

	const imageContext = await buildImageContext(perseusData)

	// Shot 1: Generate the content shell and plan.
	logger.debug("shot 1: generating assessment shell")
	const shellResult = await errors.try(generateAssessmentShell(logger, perseusJsonString, imageContext))
	if (shellResult.error) {
		logger.error("shot 1 failed: shell generation pass failed", { error: shellResult.error })
		throw shellResult.error
	}
	const assessmentShell = shellResult.data
	logger.debug("shot 1 complete", {
		identifier: assessmentShell.identifier,
		widgetSlots: assessmentShell.widgets,
		interactionSlots: assessmentShell.interactions
	})

	// NEW: Strict validation of slot consistency.
	logger.debug("validating consistency between declared slots and body content")
	const allDeclaredSlots = new Set([...assessmentShell.widgets, ...assessmentShell.interactions])
	// FIX: Use a more robust regex that handles both single and double quotes,
	// as well as potential whitespace variations. This prevents false positives.
	const slotNameRegex = /<slot\s+name\s*=\s*(["'])(.*?)\1/g
	const slotsUsedInBody = new Set(
		// The match index is changed from 1 to 2 to capture the slot name correctly.
		[...assessmentShell.body.matchAll(slotNameRegex)]
			.map((match) => match[2])
			.filter((slot): slot is string => slot !== undefined)
	)

	if (
		allDeclaredSlots.size !== slotsUsedInBody.size ||
		![...allDeclaredSlots].every((slot) => slotsUsedInBody.has(slot))
	) {
		const undeclaredSlots = [...slotsUsedInBody].filter((slot): slot is string => !allDeclaredSlots.has(slot))
		const unusedSlots = [...allDeclaredSlots].filter((slot): slot is string => !slotsUsedInBody.has(slot))
		const errorMessage = `Slot declaration mismatch detected.
- Undeclared in body: [${undeclaredSlots.join(", ")}]
- Unused in declaration: [${unusedSlots.join(", ")}]`

		logger.error("slot consistency validation failed, will throw retriable error", { undeclaredSlots, unusedSlots })
		// Throw a standard, retriable error.
		throw errors.new(errorMessage)
	}
	logger.debug("slot consistency validation successful")

	// Step 2: Map widget slot names to widget types.
	const widgetSlotNames = assessmentShell.widgets
	logger.debug("shot 2: mapping slots to widgets", { count: widgetSlotNames.length })

	const widgetMappingResult = await (async () => {
		if (widgetSlotNames.length === 0) {
			logger.info("no widget slots found, skipping ai widget mapping call")
			// Return a successful result with empty data, mimicking the `errors.try` output
			const emptyMapping: Record<string, keyof typeof typedSchemas> = {}
			return { data: emptyMapping, error: null }
		}
		// Only make the AI call if there are widgets to map
		return errors.try(mapSlotsToWidgets(logger, perseusJsonString, assessmentShell.body, widgetSlotNames))
	})()

	if (widgetMappingResult.error) {
		logger.error("shot 2 failed: widget mapping pass failed", { error: widgetMappingResult.error })
		throw widgetMappingResult.error
	}
	const widgetMapping = widgetMappingResult.data
	logger.debug("shot 2 complete", { mapping: widgetMapping })

	// ✅ NEW - Shot 3: Generate the full interaction objects.
	logger.debug("shot 3: generating interaction content")
	const interactionContentResult = await errors.try(
		generateInteractionContent(logger, perseusJsonString, assessmentShell, imageContext)
	)
	if (interactionContentResult.error) {
		logger.error("shot 3 failed: interaction content generation failed", { error: interactionContentResult.error })
		throw interactionContentResult.error
	}
	const generatedInteractions = interactionContentResult.data
	logger.debug("shot 3 complete", { generatedInteractionKeys: Object.keys(generatedInteractions) })

	// Shot 4: Generate ONLY the widget content based on the mapping.
	logger.debug("shot 4: generating widget content")
	const widgetContentResult = await errors.try(
		generateWidgetContent(
			logger,
			perseusJsonString,
			assessmentShell,
			widgetMapping,
			generatedInteractions,
			imageContext
		)
	)
	if (widgetContentResult.error) {
		logger.error("shot 4 failed: widget content generation failed", { error: widgetContentResult.error })
		throw widgetContentResult.error
	}
	const generatedWidgets = widgetContentResult.data
	logger.debug("shot 4 complete", { generatedWidgetKeys: Object.keys(generatedWidgets) })

	// Final Step: Deterministically merge the shell, interactions, and widgets.
	const finalAssessmentItem: AssessmentItemInput = {
		...assessmentShell,
		// Replace the string arrays from the shell with the generated objects.
		interactions: generatedInteractions,
		widgets: generatedWidgets
	}

	logger.info("structured qti generation process successful", { identifier: finalAssessmentItem.identifier })
	return finalAssessmentItem
}
