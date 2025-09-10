import { z } from "zod"
import { type WidgetCollectionName, widgetCollections } from "../widgets/collections"
import { allWidgetSchemas } from "../widgets/registry"

function createWidgetMappingSchema(slotNames: string[], allowedWidgetKeys: readonly string[]) {
	const shape: Record<string, z.ZodType<string>> = {}
	for (const slotName of slotNames) {
		// MODIFIED: Allow the schema to accept either a valid widget type
		// from the collection OR the specific "WIDGET_NOT_FOUND" bail string for ALL collections.
		const validTypesAndBail = [...allowedWidgetKeys, "WIDGET_NOT_FOUND"]
		shape[slotName] = z.string().refine((val) => validTypesAndBail.includes(val), {
			message: `Must be one of: ${validTypesAndBail.join(", ")}`
		})
	}
	return z.object({
		widget_mapping: z
			.object(shape)
			.describe("A JSON object mapping each widget slot name to one of the allowed widget types or WIDGET_NOT_FOUND.")
	})
}
export function createWidgetMappingPrompt(
	perseusJson: string,
	assessmentBody: string,
	slotNames: string[],
	widgetCollectionName: WidgetCollectionName
) {
	const collection = widgetCollections[widgetCollectionName]

	function buildWidgetTypeDescriptions(): string {
		// Use spread operator to convert readonly array to regular array
		const sortedKeys = [...collection.widgetTypeKeys].sort()
		return sortedKeys
			.map((typeName) => {
				// Type narrowing by iterating through the object
				const schemaEntries = Object.entries(allWidgetSchemas)
				const schemaEntry = schemaEntries.find(([key]) => key === typeName)
				if (schemaEntry) {
					const [, schema] = schemaEntry
					const description = schema?._def.description ?? "No description available."
					return `- ${typeName}: ${description}`
				}
				return `- ${typeName}: No description available.`
			})
			.join("\n")
	}
	// MODIFIED: Create a base instruction and then conditionally add the refined, collection-specific rule.
	let systemInstruction = `You are an expert in educational content and QTI standards. Your task is to analyze an assessment item's body content and the original Perseus JSON to map widget slots to the most appropriate widget type from a given list.

**⚠️ CRITICAL: GRAMMATICAL ERROR CORRECTION ⚠️**
WE MUST correct any grammatical errors found in the source Perseus content. This includes:
- Spelling mistakes in words and proper nouns
- Incorrect punctuation, capitalization, and sentence structure
- Subject-verb disagreement and other grammatical issues
- Awkward phrasing that impacts clarity
- Missing or incorrect articles (a, an, the)

The goal is to produce clean, professional educational content that maintains the original meaning while fixing any language errors present in the source material.

**CRITICAL RULE: WIDGET_NOT_FOUND BAIL**
This is your most important instruction. If you determine that a widget slot **CANNOT** be reasonably mapped to any of the available widget types, you **MUST** use the exact string literal **"WIDGET_NOT_FOUND"** as its type. Do not guess or force a fit.

Use "WIDGET_NOT_FOUND" if:
1.  There is no semantically appropriate widget type in the provided list for the given Perseus content.
2.  A slot clearly represents an interactive element that was misclassified as a widget.`

	// MODIFIED: Conditionally append the highly specific and clarified simple-visual instruction.
	if (widgetCollectionName === "simple-visual") {
		systemInstruction += `
3.  **For this 'simple-visual' collection ONLY**: Your task is to map Perseus \`image\` widgets to our \`urlImage\` widget. To do this, you must look at the **original Perseus JSON** for the specific widget slot. If the corresponding Perseus \`image\` widget definition is **missing its \`url\` property** or the \`url\` is an empty string, you **MUST** output \`WIDGET_NOT_FOUND\`.
    - **NOTE**: You will be provided a context map of working URLs. **Assume all URLs in that context map are valid and functional.** Your job is not to validate them, but to recognize when a URL is completely absent from the source Perseus JSON in the first place.

4.  **Reference Resources Preference (periodic table, formula sheets)**: When the assessment body or Perseus JSON clearly indicates a standard reference resource (e.g., "periodic table", "periodic table of the elements"), and this collection includes a specific widget type for it (e.g., \`periodicTable\`), you **MUST** map the corresponding slot to that specific widget type rather than a generic \`urlImage\`. This ensures consistent rendering and behavior for reference materials.`
	}

	// Conditionally add widget selection rules when urlImage is available in the collection
	const hasUrlImage = [...collection.widgetTypeKeys].includes("urlImage")
	if (hasUrlImage) {
		systemInstruction += `

**WIDGET SELECTION RULES (urlImage is a STRICT last resort)**
- **CRITICAL HIERARCHY** for visual content:
  1. FIRST: Map to a semantically specific widget that matches the content
  2. SECOND: If no specific widget fits, and the content is a truly static, non-semantic visual, then use \`urlImage\`
  3. LAST: Only use \`WIDGET_NOT_FOUND\` if the content cannot be represented by any widget including \`urlImage\`
- **Aggressive preference**: Always choose a purpose-built widget over \`urlImage\` whenever a match exists in the available list.

- Prefer specific widgets over \`urlImage\`:
  - Graphs/charts/plots: choose graph/plot widgets (e.g., \`barChart\`, \`lineGraph\`, \`conceptualGraph\`, \`scatterPlot\`, \`populationBarChart\`, etc.)
  - Tables: choose \`dataTable\`
  - Set comparisons: choose \`vennDiagram\`
  - Reference resources: choose specific resource widgets (e.g., \`periodicTable\`)
  - Emoji-only assets: choose \`emojiImage\`

- When \`urlImage\` MAY be acceptable (still last resort):
  - A plain photograph or illustration (e.g., a whale, a cat, a lab apparatus) where no more specific widget exists in this collection
  - Visual content that does not match any specific widget but can be displayed as a static image

**DO NOT USE urlImage for Graphie-generated graphs/charts**
- If the Perseus JSON indicates that an \`image\` is actually a graph/chart produced by Graphie, you MUST map to a graph widget and NOT to \`urlImage\`.
- Treat any \`image\` with a \`backgroundImage.url\` starting with \`web+graphie://\` (or containing \`ka-perseus-graphie\`) as a graph/chart with programmatic overlays.
- If the alt text or problem text clearly describes a graph/chart (e.g., "bar graph", "line graph", "scatter plot", axes, ticks), then map to a specific graph widget even if numbers/labels are not baked into the underlying bitmap.
- Rationale: Graphie overlays axes, ticks, and labels dynamically; we already have graph widgets that render these semantics natively and accessibly.

Example — Graphie bar graph (DO NOT map to urlImage):
\`\`\`json
{
  "widgets": {
    "image 1": {
      "type": "image",
      "options": {
        "alt": "A bar graph is shown...",
        "backgroundImage": {
          "url": "web+graphie://cdn.kastatic.org/ka-perseus-graphie/65b7bb67f52aaaa9932dc39482e8f2e516840676",
          "width": 300,
          "height": 270
        }
      }
    }
  }
}
\`\`\`
Correct mapping when graph widgets are available:
\`\`\`json
{
  "widget_mapping": {
    "image 1": "barChart" // or another specific graph widget listed in this collection
  }
}
\`\`\`

- **IMPORTANT**: Only use \`urlImage\` for graphs if and only if the collection provides no graph-capable widgets at all. Prefer domain-specific graph widgets whenever available.`
	}

	systemInstruction += `

**CRITICAL RULE**: You MUST choose a widget type from the list (or "WIDGET_NOT_FOUND") for every slot. Do not refuse or omit any slot.

**STRICT NAMING-BASED MAPPING RULES (DO NOT VIOLATE):**
- For science collection free-body-diagram conversions, any slot whose name starts with \`fbd_\` MUST be mapped to \`freeBodyDiagram\`.
  - Specifically: \`fbd_choice_a\`, \`fbd_choice_b\`, \`fbd_choice_c\` → \`freeBodyDiagram\`.
  - NEVER return \`WIDGET_NOT_FOUND\` for these slots.
- Choice-level visual widgets declared for multiple choice interactions (e.g., names ending with \`_choice_a\`, \`_choice_b\`, \`_choice_c\`) MUST be mapped to a concrete widget type, not \`WIDGET_NOT_FOUND\`. Inspect the scenario and choose the correct type from the allowed list.

Widget Type Options:
${[...collection.widgetTypeKeys].sort().join("\n")}`

	const userContent = `Based on the Perseus JSON and assessment body below, create a JSON object that maps each widget slot name to the most appropriate widget type.

Perseus JSON:
\`\`\`json
${perseusJson}
\`\`\`

Assessment Item Body (as structured JSON):
\`\`\`json
${assessmentBody}
\`\`\`

 MANDATORY RULES FOR CHOICE-LEVEL VISUALS:
 - Some widget slot names may follow the convention \`<responseIdentifier>__<choiceLetter>__v<index>\`. These are widgets reserved for visuals that appear INSIDE interaction choices (e.g., images/diagrams in radio choices).
 - You MUST map these choice-level widget slots to the correct widget types by inspecting the Perseus JSON for the corresponding choice content.
 - Do NOT assume these appear in the top-level body; they are intentionally absent from body and will be inserted inside choices later.

  Available Widget Types and Descriptions:
${buildWidgetTypeDescriptions()}

Your response must be a JSON object with a single key "widget_mapping", mapping every slot name from the list below to its type. If no suitable type is found, you MUST use the string "WIDGET_NOT_FOUND". However, for FBD slots (names starting with \`fbd_\`), you MUST map to \`freeBodyDiagram\` and MUST NOT use \`WIDGET_NOT_FOUND\`.

Slot Names to Map:
${slotNames.join("\n")}`

	const WidgetMappingSchema = createWidgetMappingSchema(slotNames, collection.widgetTypeKeys)
	// Resource mapping guidance (collection-aware): When Perseus includes reference resources
	// such as periodic tables and the collection supports a corresponding widget type
	// (e.g., 'periodicTable'), prefer mapping the slot to that type instead of bailing.

	return { systemInstruction, userContent, WidgetMappingSchema }
}
