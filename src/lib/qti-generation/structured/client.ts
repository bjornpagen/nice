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
	type AssessmentItemShell,
	AssessmentItemShellSchema,
	type BlockContent,
	type InlineContent
} from "@/lib/qti-generation/schemas"
import { buildImageContext, type ImageContext } from "@/lib/qti-generation/structured/perseus-image-resolver"
// ✅ UPDATE: Import from the new, co-located prompts file.
import {
	createAssessmentShellPrompt,
	createInteractionContentPrompt,
	createWidgetContentPrompt,
	createWidgetMappingPrompt
} from "@/lib/qti-generation/structured/prompts"
import type { WidgetCollectionName } from "@/lib/widget-collections"
import { allWidgetSchemas, type WidgetInput } from "@/lib/widgets/generators"

const OPENAI_MODEL = "gpt-5"
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

// Removed ErrWidgetNotFound: all slots must map to a concrete widget type

export const ErrUnsupportedInteraction = errors.new("unsupported interaction type found")

// Use the AssessmentItemShellSchema from schemas.ts

/**
 * Dynamically creates a Zod schema for a collection of widgets based on a mapping.
 * @param widgetMapping A map of slot names to widget type names.
 * @returns A Zod object schema for the widget collection.
 */
function createWidgetCollectionSchema(widgetMapping: Record<string, keyof typeof allWidgetSchemas>) {
	const shape: Record<string, z.ZodType> = {}
	for (const [slotName, widgetType] of Object.entries(widgetMapping)) {
		const schema = allWidgetSchemas[widgetType]
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
	slotNames: string[], // ✅ Takes the parsed slot names to generate the prompt.
	widgetCollectionName: WidgetCollectionName
): Promise<Record<string, keyof typeof allWidgetSchemas>> {
	// ✅ The prompt and the schema are now generated together dynamically.
	const { systemInstruction, userContent, WidgetMappingSchema } = createWidgetMappingPrompt(
		perseusJson,
		assessmentBody,
		slotNames,
		widgetCollectionName
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
	const isValidWidgetType = (val: unknown): val is keyof typeof allWidgetSchemas => {
		return typeof val === "string" && val in allWidgetSchemas
	}

	// Validate and build the properly typed mapping
	const mapping: Record<string, keyof typeof allWidgetSchemas> = {}
	for (const [key, value] of Object.entries(rawMapping)) {
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
): Promise<AssessmentItemShell> {
	// Assumes a new prompt function is created for this shot.
	const { systemInstruction, userContent } = createAssessmentShellPrompt(perseusJson, imageContext)

	const responseFormat = zodResponseFormat(AssessmentItemShellSchema, "assessment_shell_generator")
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
	assessmentShell: AssessmentItemShell,
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
	assessmentShell: AssessmentItemShell,
	widgetMapping: Record<string, keyof typeof allWidgetSchemas>,
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
	perseusData: unknown,
	options: { widgetCollectionName?: WidgetCollectionName } = {}
): Promise<AssessmentItemInput> {
	// Default to "math-core" to ensure backward compatibility and no disruption.
	const { widgetCollectionName = "math-core" } = options
	const perseusJsonString = JSON.stringify(perseusData, null, 2)
	logger.info("starting structured qti generation process", { widgetCollection: widgetCollectionName })

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

	// FIX: Replace the incomplete slot checker with a comprehensive one.
	logger.debug("validating consistency between declared slots and body content")

	function collectAllSlotIds(shell: AssessmentItemShell): Set<string> {
		const ids = new Set<string>()
		const _seenInteractions = new Set<string>()

		function walkInline(items: InlineContent | null | undefined) {
			if (!items) return
			for (const item of items) {
				if (item.type === "inlineSlot") ids.add(item.slotId)
			}
		}

		function walkBlock(items: BlockContent | null | undefined) {
			if (!items) return
			for (const item of items) {
				if (item.type === "blockSlot") ids.add(item.slotId)
				else if (item.type === "paragraph") walkInline(item.content)
			}
		}

		walkBlock(shell.body)
		walkBlock(shell.feedback.correct)
		walkBlock(shell.feedback.incorrect)

		if (shell.interactions) {
			// Also check for slots inside interaction definitions passed in the shell if any
			// Although the shell's interactions is just string[], this ensures future-proofing
			// if the shell becomes more complex. We check the final generated interactions.
		}

		return ids
	}

	const allDeclaredSlots = new Set([...assessmentShell.widgets, ...assessmentShell.interactions])
	const slotsUsedInContent = collectAllSlotIds(assessmentShell)

	if (
		allDeclaredSlots.size !== slotsUsedInContent.size ||
		![...allDeclaredSlots].every((slot) => slotsUsedInContent.has(slot)) ||
		![...slotsUsedInContent].every((slot) => allDeclaredSlots.has(slot))
	) {
		const undeclaredSlots = [...slotsUsedInContent].filter((slot) => !allDeclaredSlots.has(slot))
		const unusedSlots = [...allDeclaredSlots].filter((slot) => !slotsUsedInContent.has(slot))
		const errorMessage = `Slot declaration mismatch detected after shell generation.
- Slots used in content but not declared in widget/interaction arrays: [${undeclaredSlots.join(", ")}]
- Slots declared in arrays but not used in any content field: [${unusedSlots.join(", ")}]`

		logger.error("slot consistency validation failed", { undeclaredSlots, unusedSlots })
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
			const emptyMapping: Record<string, keyof typeof allWidgetSchemas> = {}
			return { data: emptyMapping, error: null }
		}
		// Only make the AI call if there are widgets to map
		// Convert structured body to string representation for widget mapping prompt
		const bodyString = assessmentShell.body ? JSON.stringify(assessmentShell.body) : ""
		return errors.try(mapSlotsToWidgets(logger, perseusJsonString, bodyString, widgetSlotNames, widgetCollectionName))
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
