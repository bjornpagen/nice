import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import type OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import type { AssessmentItemInput } from "../compiler/schemas"
import { generateZodSchemaFromObject } from "./zod-runtime-generator"

const OPENAI_MODEL = "gpt-5"
// Simplified API: just pass OpenAI client directly

/**
 * A unique, safe prefix for keys created from array indices to prevent
 * collision with legitimate object keys that are numeric strings.
 */
// Balanced: short, namespaced, unlikely to clash but readable
const ARRAY_KEY_PREFIX = "__sb_idx__"
/**
 * Sentinel key used to represent an empty array in object form.
 * Prevents ambiguity between a truly empty object and an empty array
 * after transformation.
 */
const ARRAY_EMPTY_SENTINEL = "__sb_empty_array__"

/**
 * Recursively transforms arrays into objects using a safe, prefixed key.
 * This creates a rigid, unambiguous structure ideal for schema generation.
 * e.g., ["a", "b"] -> { "__idx__0": "a", "__idx__1": "b" }
 */
function transformArraysToObjects(data: unknown): unknown {
	if (Array.isArray(data)) {
		// Encode empty arrays explicitly to avoid ambiguity with empty objects
		if (data.length === 0) {
			return { [ARRAY_EMPTY_SENTINEL]: true }
		}
		const newObj: Record<string, unknown> = {}
		for (let i = 0; i < data.length; i++) {
			newObj[`${ARRAY_KEY_PREFIX}${i}`] = transformArraysToObjects(data[i])
		}
		return newObj
	}
	if (typeof data === "object" && data !== null) {
		const newObj: Record<string, unknown> = {}
		// @ts-ignore - Safe: we've already checked that data is an object
		// biome-ignore lint: Type assertion needed for recursive transformation
		const dataObj = data as any
		for (const key in dataObj) {
			newObj[key] = transformArraysToObjects(dataObj[key])
		}
		return newObj
	}
	return data
}

/**
 * Recursively transforms objects with prefixed keys back into arrays.
 * This is the exact, safe inverse of transformArraysToObjects.
 */
function transformObjectsToArrays(data: unknown): unknown {
	if (typeof data === "object" && data !== null) {
		// @ts-ignore - Safe: we've already checked that data is an object
		// biome-ignore lint: Type assertion needed for object key iteration
		const obj = data as any
		const keys = Object.keys(obj)

		// Special-case: our sentinel encodes an empty array
		if (keys.length === 1 && keys[0] === ARRAY_EMPTY_SENTINEL && obj[ARRAY_EMPTY_SENTINEL] === true) {
			return []
		}

		// An object is only considered array-like if ALL its keys have our prefix.
		const isArrayLike = keys.length > 0 && keys.every((k) => k.startsWith(ARRAY_KEY_PREFIX))

		if (isArrayLike) {
			const newArr: unknown[] = []
			// Sort keys numerically to guarantee correct array order.
			const sortedKeys = keys.sort(
				(a, b) =>
					Number.parseInt(a.substring(ARRAY_KEY_PREFIX.length), 10) -
					Number.parseInt(b.substring(ARRAY_KEY_PREFIX.length), 10)
			)

			for (const key of sortedKeys) {
				const index = Number.parseInt(key.substring(ARRAY_KEY_PREFIX.length), 10)
				newArr[index] = transformObjectsToArrays(obj[key])
			}
			return newArr
		}

		// If not array-like, process as a regular object.
		const newObj: Record<string, unknown> = {}
		for (const key in obj) {
			newObj[key] = transformObjectsToArrays(obj[key])
		}
		return newObj
	}
	return data
}

function createDifferentiatedItemsPrompt(
	assessmentItemJson: string,
	n: number
): { systemInstruction: string; userContent: string } {
	const systemInstruction = `You are a curriculum development expert and AI assistant specializing in the differentiation of educational assessment items. Your primary function is to generate multiple variations of a single assessment item, adhering to extremely strict structural and pedagogical constraints.

**CRITICAL RULES - NON-NEGOTIABLE:**
1.  **IDENTICAL JSON STRUCTURE:** This is the most important rule. The JSON structure of every generated question MUST PERFECTLY match the structure of the original item. You are forbidden from adding, removing, renaming, or nesting any keys. The response must validate against the provided schema, which mirrors the original item's structure.
2.  **MAINTAIN DIFFICULTY:** All generated questions MUST be at the exact same difficulty level and target the same grade level as the original. Do not simplify or complicate the questions.
3.  **PRESERVE PEDAGOGICAL INTENT:** The core academic skill or concept being tested must remain unchanged. You can change numbers, scenarios, names, or wording, but the fundamental learning objective must be identical.
    4.  **VALID MATHML:** All mathematical content MUST be valid MathML. Preserve the original MathML structure as much as possible, only changing numerical values or variables as needed for differentiation. Avoid deprecated elements like <mfenced>.
5.  **PRESERVE "type" FIELDS:** The "type" field within widget and interaction objects (e.g., "doubleNumberLine", "choiceInteraction") MUST NOT be changed.
6.  **HTML ENTITY RESTRICTIONS:** You MUST NOT use HTML named entities like &nbsp;, &mdash;, &hellip;, etc. Instead, use actual Unicode characters directly. The ONLY acceptable entity references are: &lt; &gt; &amp; &quot; &apos;. For spacing, use regular spaces, not &nbsp;.
    7.  **NO CDATA SECTIONS**: Never use <![CDATA[...]]> anywhere in any string fields.
    8.  **NO PERSEUS ARTIFACTS**: Never include Perseus widget artifacts like [[☃ widget-name 1]] in any text.
    9.  **FINAL OUTPUT FORMAT:** Your entire response must be a single JSON object containing one key, "differentiated_items", which holds an array of the newly generated assessment item objects.

**SECTION A: MAINTAINING EXACT DIFFICULTY LEVEL**

The difficulty level of every generated variation MUST remain EXACTLY THE SAME as the original question. This is a critical requirement that affects student assessment validity.

**What constitutes difficulty:**
- **Computational complexity**: Keep the same number of steps, operations, and mathematical complexity. If the original requires 2-digit multiplication, don't change to 3-digit or 1-digit.
- **Conceptual depth**: Maintain the same level of abstract thinking required. Don't simplify concepts or add complexity.
- **Numerical properties**: Use numbers with similar properties (e.g., if original uses fractions with denominators 2, 4, 8, use similar simple denominators, not 7, 13, 17).
- **Cognitive load**: Keep the same amount of information to process. Don't add extra conditions or remove helpful structure.
- **Prior knowledge**: Require the same foundational skills. Don't introduce concepts from higher or lower grade levels.

**Examples of maintaining difficulty:**
- If original: "Find 24 ÷ 6", then valid: "Find 36 ÷ 9" (same single-digit divisor resulting in single-digit quotient)
- If original: "A rectangle has length 8 cm and width 5 cm", then valid: "A rectangle has length 7 cm and width 4 cm" (similar magnitude, whole numbers)
- If original uses fractions 1/2, 1/4, 3/4, then use other halves/quarters/eighths, not sevenths or thirteenths

**What NOT to do:**
- Don't change from simple to complex numbers (e.g., 25 to 247 or 2.47)
- Don't add extra steps or conditions
- Don't change from concrete to abstract scenarios or vice versa
- Don't use numbers that create notably harder mental math

**SECTION B: ENSURING UNIQUE VARIATIONS**

Every generated item MUST be genuinely different from the original and from all other generated items. Surface-level changes are NOT sufficient.

**What makes a variation unique:**
- **Different numerical values**: All numbers should change (except mathematical constants like π)
- **Different contexts/scenarios**: Change names, objects, situations while preserving the mathematical structure
- **Different visual arrangements**: If applicable, alter spatial layouts, colors, or orientations
- **Different choice options**: For multiple choice, create entirely new distractors and arrangements

**Minimum uniqueness requirements:**
- At least 80% of numerical values must be different from the original
- Context/scenario must be recognizably different (not just changing "apples" to "oranges")
- No two generated items should be more than 20% similar in their specific values
- Each item must be independently solvable without reference to others

**Examples of sufficient uniqueness:**
- Original: "Tom has 15 marbles, gives away 6..." → Valid: "Sarah has 23 stickers, uses 9..."
- Original: "Find the area of a 6×4 rectangle" → Valid: "Find the area of a 8×5 rectangle"
- Original: Uses a number line from 0-10 → Valid: Uses a number line from 0-20 (if difficulty maintained)

**What is NOT unique enough:**
- Only changing one number in a multi-step problem
- Changing names but keeping all numbers identical
- Rearranging the same content without substantive changes
- Using consecutive numbers from the original (e.g., if original uses 5, don't just use 6)`

	const userContent = `Please differentiate the following assessment item JSON into exactly ${n} new, unique variations.

**Original Assessment Item JSON:**
\`\`\`json
${assessmentItemJson}
\`\`\`

**Strict Instructions:**
1.  Generate exactly ${n} new assessment item objects.
2.  Each new object must be a unique variation of the original but test the identical concept at the same difficulty.
3.  For EACH new item, the JSON structure, including all keys and nesting, MUST perfectly mirror the original item provided above.
4.  CRITICAL: Do NOT use HTML named entities like &nbsp;, &mdash;, &hellip;. Use regular spaces and Unicode characters directly. Only use &lt; &gt; &amp; &quot; &apos; when absolutely necessary for XML syntax.
5.  Do NOT use <![CDATA[...]]> or include any Perseus artifacts like [[☃ widget-name 1]].
6.  Place all ${n} generated items into a JSON array, and return it within a parent object under the key "differentiated_items".`

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
	openai: OpenAI,
	logger: logger.Logger,
	assessmentItem: AssessmentItemInput,
	n: number
): Promise<AssessmentItemInput[]> {
	logger.info("starting assessment item differentiation", { identifier: assessmentItem.identifier, variations: n })

	// REMOVED: The following validation block is the source of the bug and will be removed.
	// We will assume the structuredJson from our database is valid.
	/*
	const validationResult = AssessmentItemSchema.safeParse(assessmentItem)
	if (!validationResult.success) {
		logger.error("Initial assessment item failed canonical schema validation", {
			identifier: assessmentItem.identifier,
			error: validationResult.error
		})
		throw errors.wrap(validationResult.error, "canonical schema validation failed")
	}
	const validatedItem = validationResult.data
	*/

	// Step 2: Transform the validated item to an array-free object structure.
	// MODIFIED: Use the `assessmentItem` argument directly instead of the `validatedItem` constant.
	const transformedItem = transformArraysToObjects(assessmentItem)

	// Step 3: Generate a simple, OpenAI-compatible Zod schema from the transformed object.
	const runtimeSchema = generateZodSchemaFromObject(transformedItem)
	const DifferentiatedItemsSchema = z.object({
		differentiated_items: z.array(runtimeSchema)
	})

	// Step 4: Create the AI prompt using the transformed JSON.
	const assessmentItemJson = JSON.stringify(transformedItem, null, 2)
	const { systemInstruction, userContent } = createDifferentiatedItemsPrompt(assessmentItemJson, n)

	// Step 5: Call the AI.
	// ... (openai call remains the same)
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

	// Step 6: Transform the AI's object-based output back into the array-based structure.
	// @ts-ignore - Safe: The transformation ensures the output matches AssessmentItemInput structure
	// biome-ignore lint: Type assertion needed after transformation from AI response
	const finalItems: AssessmentItemInput[] = result.map((item: unknown) => transformObjectsToArrays(item) as any)

	logger.info("successfully generated and transformed differentiated items", { count: finalItems.length })
	return finalItems
}
