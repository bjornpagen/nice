import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { env } from "@/env"
import type { AssessmentItemInput } from "@/lib/qti-generation/schemas"
import { generateZodSchemaFromObject } from "./zod-runtime-generator"

const OPENAI_MODEL = "o3"
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

function createDifferentiatedItemsPrompt(
	assessmentItemJson: string,
	n: number
): { systemInstruction: string; userContent: string } {
	const systemInstruction = `You are a curriculum development expert and AI assistant specializing in the differentiation of educational assessment items. Your primary function is to generate multiple variations of a single assessment item, adhering to extremely strict structural and pedagogical constraints.

**CRITICAL RULES - NON-NEGOTIABLE:**
1.  **IDENTICAL JSON STRUCTURE:** This is the most important rule. The JSON structure of every generated question MUST PERFECTLY match the structure of the original item. You are forbidden from adding, removing, renaming, or nesting any keys. The response must validate against the provided schema, which mirrors the original item's structure.
2.  **MAINTAIN DIFFICULTY:** All generated questions MUST be at the exact same difficulty level and target the same grade level as the original. Do not simplify or complicate the questions.
3.  **PRESERVE PEDAGOGICAL INTENT:** The core academic skill or concept being tested must remain unchanged. You can change numbers, scenarios, names, or wording, but the fundamental learning objective must be identical.
4.  **VALID MATHML:** All mathematical content MUST be valid MathML. Preserve the original MathML structure as much as possible, only changing numerical values or variables as needed for differentiation.
5.  **PRESERVE "type" FIELDS:** The "type" field within widget and interaction objects (e.g., "doubleNumberLine", "choiceInteraction") MUST NOT be changed.
6.  **FINAL OUTPUT FORMAT:** Your entire response must be a single JSON object containing one key, "differentiated_items", which holds an array of the newly generated assessment item objects.`

	const userContent = `Please differentiate the following assessment item JSON into exactly ${n} new, unique variations.

**Original Assessment Item JSON:**
\`\`\`json
${assessmentItemJson}
\`\`\`

**Strict Instructions:**
1.  Generate exactly ${n} new assessment item objects.
2.  Each new object must be a unique variation of the original but test the identical concept at the same difficulty.
3.  For EACH new item, the JSON structure, including all keys and nesting, MUST perfectly mirror the original item provided above.
4.  Place all ${n} generated items into a JSON array, and return it within a parent object under the key "differentiated_items".`

	return { systemInstruction, userContent }
}

/**
 * Differentiates a single structured assessment item into 'n' similar items using an AI model.
 * It dynamically generates a robust Zod schema from the input to ensure the AI's output
 * perfectly matches the original structure.
 *
 * @param logger A logger instance.
 * @param assessmentItem The structured assessment item to differentiate.
 * @param n The number of differentiated items to generate.
 * @returns A promise that resolves to an array of 'n' differentiated assessment items.
 */
export async function differentiateAssessmentItem(
	logger: logger.Logger,
	assessmentItem: AssessmentItemInput,
	n: number
): Promise<AssessmentItemInput[]> {
	logger.info("starting assessment item differentiation", { identifier: assessmentItem.identifier, variations: n })

	// Step 1: Generate a robust Zod schema from the input object at runtime.
	const runtimeSchema = generateZodSchemaFromObject(assessmentItem)
	const DifferentiatedItemsSchema = z.object({
		differentiated_items: z.array(runtimeSchema).length(n, `Expected exactly ${n} differentiated items.`)
	})

	// Step 2: Create the AI prompt.
	const assessmentItemJson = JSON.stringify(assessmentItem, null, 2)
	const { systemInstruction, userContent } = createDifferentiatedItemsPrompt(assessmentItemJson, n)

	// Step 3: Call the AI with the dynamic schema for structured, reliable output.
	const responseFormat = zodResponseFormat(DifferentiatedItemsSchema, "differentiated_items_generator")

	logger.debug("calling openai for item differentiation", { model: OPENAI_MODEL })
	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: userContent }
			],
			response_format: responseFormat,
			reasoning_effort: "high"
		})
	)
	if (response.error) {
		logger.error("failed to generate differentiated items via openai", { error: response.error })
		throw errors.wrap(response.error, "ai item differentiation")
	}

	const choice = response.data.choices[0]
	if (!choice?.message?.parsed) {
		logger.error("CRITICAL: OpenAI differentiation returned no parsed content")
		throw errors.new("empty ai response: no parsed content for differentiation")
	}
	if (choice.message.refusal) {
		logger.error("openai refused differentiation request", { refusal: choice.message.refusal })
		throw errors.new(`ai refused request: ${choice.message.refusal}`)
	}

	const result = choice.message.parsed.differentiated_items
	logger.info("successfully generated and validated differentiated items", { count: result.length })

	return result
}
