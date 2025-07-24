import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { env } from "@/env"
import { loadConversionExamples } from "./qti-examples"
import { VALID_QTI_TAGS } from "./qti-tags"

const OPENAI_MODEL = "o3"

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const QtiGenerationSchema = z.object({
	qti_xml: z.string().describe("The single, complete, and perfectly-formed QTI 3.0 XML string.")
})

const QtiCorrectionSchema = z.object({
	corrected_xml: z.string().describe("The single, complete, and perfectly-formed QTI 3.0 XML string.")
})

/**
 * Creates the structured prompt for the AI model to convert Perseus JSON to QTI XML,
 * including a rich set of few-shot examples.
 * @param logger The logger instance.
 * @param perseusJsonString The stringified Perseus JSON data for the current conversion task.
 * @param options An object to specify the conversion type. Defaults to 'assessmentItem'.
 * @returns The system instruction and user content for the AI prompt.
 */
export async function createQtiConversionPrompt(
	logger: logger.Logger,
	perseusJsonString: string,
	options: { type: "assessmentItem" | "stimulus" } = { type: "assessmentItem" }
) {
	const { type } = options
	const rootTag = type === "stimulus" ? "qti-assessment-stimulus" : "qti-assessment-item"

	logger.debug("creating qti conversion prompt", {
		type,
		rootTag,
		perseusDataLength: perseusJsonString.length
	})

	const systemInstruction = `You are an expert XML generator for educational content. Your primary and most critical function is to convert a Perseus JSON object into a single, well-formed QTI 3.0 XML \`${rootTag}\`. Your output MUST be only the raw XML. The XML MUST be perfect and parseable. The most common and catastrophic failure is an incomplete or malformed closing tag. You are STRICTLY FORBIDDEN from using partial or lazy closing tags like \`</_>\` or \`</>\`. Every single XML element, such as \`<p>\`, must have a corresponding full closing tag, \`</p>\`. This rule is absolute and cannot be violated.`

	logger.debug("loading conversion examples", { type })
	const examples = await loadConversionExamples({ type })
	logger.debug("loaded conversion examples", {
		exampleCount: examples.length,
		exampleNames: examples.map((e) => e.name),
		positiveCount: examples.filter((e) => e.type === "positive").length,
		negativeCount: examples.filter((e) => e.type === "negative").length
	})

	// Separate positive and negative examples
	const positiveExamples = examples.filter((e) => e.type === "positive")
	const negativeExamples = examples.filter((e) => e.type === "negative")

	const positiveExamplesXml = positiveExamples
		.map(
			(example) => `
<example name="${example.name}">
  <perseus_json>
${JSON.stringify(example.perseus, null, 2)}
  </perseus_json>
  <qti_xml>
${example.qti}
  </qti_xml>
</example>
`
		)
		.join("\n")

	// Format negative examples to show the malformed XML
	const negativeExamplesFromData = negativeExamples
		.map(
			(example) => `
<negative_example_from_data name="${example.name}">
  <perseus_json>
${JSON.stringify(example.perseus, null, 2)}
  </perseus_json>
  <malformed_qti_xml>
${example.qti}
  </malformed_qti_xml>
</negative_example_from_data>
`
		)
		.join("\n")

	const userContent = `
<examples>
${positiveExamplesXml}
</examples>

<negative_examples_from_filesystem>
<!-- THESE ARE REAL EXAMPLES OF MALFORMED QTI XML LOADED FROM OUR NEGATIVE EXAMPLES DIRECTORY -->
<!-- Each example contains an XML comment explaining why it is incorrect -->
${negativeExamplesFromData}
</negative_examples_from_filesystem>

<critical_negative_examples>
<!-- THESE ARE EXAMPLES OF WHAT MUST NEVER APPEAR IN QTI XML -->
<negative_example reason="Perseus widget artifacts cause QTI API to return 'unknown' type and fail validation">
  <perseus_artifact>[[☃ plotter 1]]</perseus_artifact>
  <explanation>This is a Perseus-specific interactive plotter widget. It MUST be completely removed or converted to a standard QTI interaction.</explanation>
</negative_example>
<negative_example reason="Perseus interactive graphs are not valid QTI">
  <perseus_artifact>[[☃ interactive-graph 1]]</perseus_artifact>
  <explanation>Perseus interactive graph widgets have no QTI equivalent and MUST be removed.</explanation>
</negative_example>
<negative_example reason="Perseus number line widgets are not QTI standard">
  <perseus_artifact>[[☃ number-line 1]]</perseus_artifact>
  <explanation>Number line widgets from Perseus cannot be represented in QTI and MUST be removed.</explanation>
</negative_example>
<negative_example reason="Perseus table widgets are not QTI interactions">
  <perseus_artifact>[[☃ table 1]]</perseus_artifact>
  <explanation>Perseus table widgets must be converted to static HTML tables or removed entirely.</explanation>
</negative_example>
<negative_example reason="Any Perseus widget notation will break QTI">
  <perseus_artifact>[[☃ ANY_WIDGET_NAME ANY_NUMBER]]</perseus_artifact>
  <explanation>ANY text matching the pattern [[☃ ...]] is a Perseus widget and MUST be removed. The QTI API cannot process these and will return 'unknown' type, causing system failures.</explanation>
</negative_example>
<negative_example reason="CDATA sections are not allowed in QTI XML">
  <perseus_artifact><![CDATA[{"maxY":7,"type":"pic"}]]></perseus_artifact>
  <explanation>CDATA sections are FORBIDDEN in QTI. All data must be properly XML-encoded. Never use <![CDATA[...]]> anywhere.</explanation>
</negative_example>
<negative_example reason="Perseus markdown image syntax is not valid QTI">
  <perseus_artifact>![](web+graphie://cdn.kastatic.org/ka-perseus-graphie/example.svg)</perseus_artifact>
  <explanation>This is Perseus-specific markdown syntax. Convert to proper HTML img tag: <img src="https://cdn.kastatic.org/ka-perseus-graphie/example.svg" alt="description"/></explanation>
</negative_example>
<negative_example reason="Perseus URL schemes must be converted">
  <perseus_artifact>web+graphie://cdn.kastatic.org/...</perseus_artifact>
  <explanation>Perseus uses custom URL schemes like 'web+graphie://'. These MUST be converted to standard 'https://' URLs.</explanation>
</negative_example>
<negative_example reason="Non-standard QTI elements are AI hallucinations">
  <perseus_artifact><qti-plotter-interaction response-identifier="RESPONSE"></perseus_artifact>
  <explanation>There is NO such element as qti-plotter-interaction in QTI 3.0. This is an AI hallucination. Use only standard QTI elements like qti-choice-interaction, qti-text-entry-interaction, etc.</explanation>
</negative_example>
<negative_example reason="More non-standard QTI elements">
  <perseus_artifact><qti-graphing-interaction><qti-graphing-category>...</perseus_artifact>
  <explanation>qti-graphing-interaction, qti-plotter-graph, qti-plotter-axis, qti-graphing-category are ALL INVALID. These do not exist in QTI 3.0.</explanation>
</negative_example>
<negative_example reason="Object tags for plotters are not QTI">
  <perseus_artifact><object data-type="plotter" type="application/json"><param name="options">...</perseus_artifact>
  <explanation>This is NOT a valid QTI interaction. The object element cannot be used to create interactive assessments in QTI.</explanation>
</negative_example>
</critical_negative_examples>

<instructions>
Below is a Perseus JSON object. Your task is to provide the corresponding QTI 3.0 XML. Use the PERFECT examples above to inform your output. Respond with ONLY the XML content.

Your output will be fed directly into an automated XML parser. If the XML is not well-formed, the entire system will crash. Pay extreme attention to the rules below.

---
### CRITICAL: PERSEUS ARTIFACTS REMOVAL ###

**THE MOST CRITICAL RULE: NO PERSEUS WIDGET ARTIFACTS**

Perseus uses special notation like [[☃ widget-name 1]] for interactive widgets. These MUST NEVER appear in your QTI output. If you include ANY Perseus widget notation:
- The QTI API will fail to recognize the interaction type
- The system will receive "unknown" as the interaction type
- The entire processing pipeline will fail

When you encounter Perseus widgets:
1. If it's a graph/plotter/drawing widget asking students to create something, you MUST either:
   - Remove the interaction entirely and make it an informational item
   - Convert it to a text-entry asking for coordinates or values
   - Convert it to multiple-choice if there are discrete answer options
2. NEVER output the [[☃ ...]] notation itself
3. NEVER reference Perseus-specific features that have no QTI equivalent

**ADDITIONAL CRITICAL BANS:**

1. **NO CDATA SECTIONS**: Never use \`<![CDATA[...]]>\` anywhere in the XML. All content must be properly XML-encoded.

2. **NO PERSEUS MARKDOWN IMAGES**: Convert any \`![alt text](url)\` syntax to proper HTML: \`<img src="url" alt="alt text"/>\`

3. **NO PERSEUS URL SCHEMES**: Convert \`web+graphie://\` to \`https://\`. Perseus uses custom URL protocols that are invalid in standard web contexts.

4. **NO INVENTED QTI ELEMENTS**: Do NOT create elements like:
   - \`<qti-plotter-interaction>\` (DOES NOT EXIST)
   - \`<qti-graphing-interaction>\` (DOES NOT EXIST)
   - \`<qti-plotter-graph>\` (DOES NOT EXIST)
   - \`<qti-plotter-axis>\` (DOES NOT EXIST)
   - \`<qti-graphing-category>\` (DOES NOT EXIST)
   - \`<object data-type="plotter">\` (NOT A VALID QTI INTERACTION)
   
   These are AI hallucinations. Use ONLY the standard QTI 3.0 elements shown in the examples.

5. **WHEN YOU CAN'T CONVERT**: If a Perseus widget has no QTI equivalent, you MUST:
   - Remove the interactive element entirely
   - Keep any instructional text
   - Add a note in the prompt like "Students should work this problem on paper"
   - Set the response type to text-entry where they can enter their final answer

---
### CRITICAL: BAR CHART TO TABLE CONVERSION ###

**MANDATORY RULE: ALL BAR CHARTS MUST BE CONVERTED TO TABLES**

Due to technical limitations, bar chart images from Perseus (identified by phrases like "bar graph", "vertical bar graph", "horizontal bar graph" in alt text or content) do NOT render with visible numbers, axis labels, or data values. The bars appear blank and unlabeled, making the questions unsolvable.

**CONVERSION REQUIREMENTS:**

1. **DETECT BAR CHARTS**: Look for:
   - Images with alt text containing "bar graph", "bar chart", or similar terms
   - Questions asking about data from a "bar graph" or "chart"
   - Perseus graphie images that represent bar charts

2. **EXTRACT DATA**: The actual data values are typically found in:
   - The image's alt text (e.g., "Lions, 14. Tigers, 2. Bears, 7.")
   - Hint content that reveals the values
   - The correct answer value

3. **CREATE HTML TABLE**: Replace the bar chart image with a properly structured HTML table:
   \`\`\`xml
   <table>
       <thead>
           <tr>
               <th>[Category Name]</th>
               <th style="text-align:center;">[Value Label]</th>
           </tr>
       </thead>
       <tbody>
           <tr>
               <td>[Item 1]</td>
               <td style="text-align:center;"><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>[Value 1]</mn></math></td>
           </tr>
           <!-- Additional rows as needed -->
       </tbody>
   </table>
   \`\`\`

4. **UPDATE WORDING**: Change all references:
   - "bar graph" → "table"
   - "bar chart" → "table"
   - "graph shows" → "table shows"
   - "look at the bar graph" → "look at the table"
   - In feedback: "The bar for X shows..." → "The table shows that X..."

5. **PRESERVE QUESTION INTENT**: The core question remains the same - students still need to read data, just from a table instead of a graph.

**EXAMPLE CONVERSION:**

Perseus: "This bar graph shows how many games each team won. [[☃ image 1]] How many games did the Lions win?"
With alt text: "A vertical bar graph... Lions, 14. Tigers, 2. Bears, 7."

QTI Output:
\`\`\`xml
<p>The Lions, Tigers, and Bears won baseball games last summer.</p>
<p>The table below shows how many games each team won.</p>
<table>
    <thead>
        <tr>
            <th>Team</th>
            <th style="text-align:center;">Games Won</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Lions</td>
            <td style="text-align:center;"><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>14</mn></math></td>
        </tr>
        <tr>
            <td>Tigers</td>
            <td style="text-align:center;"><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn></math></td>
        </tr>
        <tr>
            <td>Bears</td>
            <td style="text-align:center;"><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn></math></td>
        </tr>
    </tbody>
</table>
<qti-prompt>How many games did the Lions win?</qti-prompt>
\`\`\`

**THIS IS NON-NEGOTIABLE**: If you encounter ANY bar chart problem, you MUST convert it to a table format. Never output a bar chart image in the final QTI, as it will be unusable.

---
### ABSOLUTE XML RULES - NON-NEGOTIABLE ###

1.  **THE MOST IMPORTANT RULE: FULL CLOSING TAGS ONLY.**
    Every tag you open MUST be closed with its full, complete name. Truncated or lazy tags are strictly forbidden and will cause a catastrophic failure.

    - ✅ **CORRECT:** \`</qti-simple-choice>\`, \`</p>\`, \`</math>\`, \`</div>\`
    - ❌ **ABSOLUTELY FORBIDDEN:** \`</_>\`, \`</>\`, \`</qti-simple-cho... \`

2.  **NO TRUNCATED OUTPUT.**
    Your response must be the complete XML file from start to finish. Do not stop generating mid-tag or mid-file. Ensure the final \`</${rootTag}>\` tag is present and correct.

3.  **MENTAL CHECK.**
    Before you output your final answer, perform a mental check: "Did I close every single tag I opened with its full name? Is the final closing tag present?"

4.  **ESCAPE XML-RESERVED CHARACTERS IN CONTENT ONLY.**
    In text content and attribute values, you must escape special XML characters. However, do NOT escape the XML tags themselves.
    - ✅ **CORRECT:** \`<mo>&lt;</mo>\` (for less-than symbol), \`<mo>&gt;</mo>\` (for greater-than symbol), \`title="AT&amp;T"\`
    - ❌ **FORBIDDEN:** \`<mo><</mo>\` (raw less-than), \`title="AT&T"\` (raw ampersand)
    - ❌ **FORBIDDEN:** \`&lt;mo&gt;&lt;/mo&gt;\` (do NOT escape the actual XML tags)

---

### Other Content Rules:
- NEVER place MathML within <qti-correct-response>. Correct responses must be simple values (e.g., "A", "7/4", "42").
- When Perseus JSON shows answerForms as ["proper", "improper"], the response MUST be a fraction.
- Remember: Users must be able to type or select the correct answer - they cannot input MathML markup!

FINAL REMINDER: The examples demonstrate PERFECT QTI 3.0 XML output. Follow their patterns exactly. Your top priority is generating a well-formed XML document with complete closing tags.
</instructions>

<perseus_json>
${perseusJsonString}
</perseus_json>

# FINAL OUTPUT
Return a single JSON object with the final generated XML, as per the specified schema.
`

	logger.debug("prompt created", {
		systemInstructionLength: systemInstruction.length,
		userContentLength: userContent.length,
		totalPromptLength: systemInstruction.length + userContent.length
	})

	return { systemInstruction, userContent, rootTag }
}

/**
 * Converts a Perseus JSON object into a QTI 3.0 XML string using the Gemini AI model.
 * @param logger The logger instance.
 * @param perseusData The Perseus question data as a JavaScript object.
 * @param options An object to specify the conversion type. Defaults to 'assessmentItem'.
 * @returns A promise that resolves to the QTI XML string.
 */
export async function generateQtiFromPerseus(
	logger: logger.Logger,
	perseusData: unknown,
	options: { type: "assessmentItem" | "stimulus" } = { type: "assessmentItem" }
): Promise<string> {
	logger.debug("starting qti generation from perseus with openai", { type: options.type })

	const perseusJsonString = JSON.stringify(perseusData, null, 2)
	logger.debug("stringified perseus data", { jsonLength: perseusJsonString.length })

	const { systemInstruction, userContent, rootTag } = await createQtiConversionPrompt(
		logger,
		perseusJsonString,
		options
	)

	logger.debug("calling openai for qti generation", { model: OPENAI_MODEL, rootTag })

	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{ role: "system", content: systemInstruction },
				{ role: "user", content: userContent }
			],
			response_format: zodResponseFormat(QtiGenerationSchema, "qti_generator"),
			reasoning_effort: "high"
		})
	)
	if (response.error) {
		logger.error("failed to generate qti xml from perseus via openai", { error: response.error })
		throw errors.wrap(response.error, "ai qti generation")
	}

	logger.debug("received openai response", {
		choiceCount: response.data.choices.length,
		finishReason: response.data.choices[0]?.finish_reason
	})

	const message = response.data.choices[0]?.message
	if (!message) {
		logger.error("openai returned no message")
		throw errors.new("empty ai response")
	}

	// Handle refusals
	if (message.refusal) {
		logger.error("openai refused to generate qti xml", { refusal: message.refusal })
		throw errors.new(`ai refused request: ${message.refusal}`)
	}

	// Access the automatically parsed data
	if (!message.parsed) {
		logger.error("openai returned no parsed content for qti conversion")
		throw errors.new("empty ai response")
	}

	const qtiXml = message.parsed.qti_xml
	if (!qtiXml) {
		logger.warn("openai returned an empty qti_xml in response")
		throw errors.new("empty ai response")
	}

	// ROBUST XML VALIDATION AND EXTRACTION:
	// Step 1: Check for XML declaration (optional)
	const xmlDeclMatch = qtiXml.match(/^(?<declaration><\?xml[^>]*\?>)?/s)
	const hasXmlDeclaration = !!xmlDeclMatch?.groups?.declaration

	logger.debug("xml declaration check", {
		hasXmlDeclaration,
		declaration: xmlDeclMatch?.groups?.declaration?.substring(0, 50)
	})

	// Step 2: Extract the root element with robust named capture groups
	// This regex ensures we match the complete XML document with proper opening and closing tags
	const rootElementRegex = new RegExp(
		"(?:^|\\s)" + // Start of string or whitespace
			`<(?<rootTag>${rootTag})` + // Opening tag must match our expected root
			"(?<attributes>(?:\\s+[^>]*)?)" + // Optional attributes
			">" + // Close opening tag
			"(?<content>[\\s\\S]*?)" + // Content (non-greedy)
			"</\\k<rootTag>>" + // Closing tag with backreference to ensure it matches
			"(?:\\s*$)?", // Optional trailing whitespace
		"s" // Dot matches newline
	)

	const rootMatch = qtiXml.match(rootElementRegex)

	if (!rootMatch || !rootMatch.groups) {
		// Try to find ANY qti root element for better error reporting
		const anyQtiMatch = qtiXml.match(/<(?<anyRoot>qti-[a-z-]+)(?:\s+[^>]*)?>/)

		logger.error("robust extraction failed: ai response did not contain valid qti xml", {
			expectedRootTag: rootTag,
			foundRootTag: anyQtiMatch?.groups?.anyRoot,
			response: qtiXml.substring(0, 200),
			responseEnd: qtiXml.substring(qtiXml.length - 200)
		})
		throw errors.new(
			`invalid ai xml output: expected ${rootTag} but ${anyQtiMatch?.groups?.anyRoot ? `found ${anyQtiMatch.groups.anyRoot}` : "found no valid QTI root element"}`
		)
	}

	// TypeScript now knows rootMatch.groups is defined
	const { content, rootTag: extractedRootTag, attributes } = rootMatch.groups

	// Step 3: Validate the content doesn't have truncated closing tags
	if (!content) {
		logger.error("extracted xml has no content", { rootTag })
		throw errors.new("invalid ai xml output: empty content")
	}

	const truncatedTagMatch = content.match(/<\/(?:_|\s*>|\.\.\.)/)
	if (truncatedTagMatch) {
		const matchIndex = truncatedTagMatch.index ?? 0
		logger.error("detected truncated closing tag in xml content", {
			truncatedTag: truncatedTagMatch[0],
			context: content.substring(Math.max(0, matchIndex - 50), Math.min(content.length, matchIndex + 50))
		})
		throw errors.new("invalid ai xml output: contains truncated closing tags")
	}

	// Step 4: Reconstruct the complete XML with declaration if present
	const extractedXml = (
		(hasXmlDeclaration && xmlDeclMatch?.groups?.declaration ? xmlDeclMatch.groups.declaration : "") +
		rootMatch[0].trim()
	).trim()

	// Step 5: Check for Perseus artifacts that should never appear in QTI
	// This regex captures Perseus widget notation like [[☃ widget-name 1]]
	// Named groups: fullMatch, widgetName, widgetNumber (optional), widgetContent (fallback for any remaining content)
	const perseusArtifactRegex =
		/\[\[☃\s*(?<widgetName>[a-zA-Z0-9_-]+)(?:\s+(?<widgetNumber>\d+))?(?:\s+(?<widgetContent>[^\]]+))?\]\]/
	const perseusArtifactMatch = extractedXml.match(perseusArtifactRegex)
	if (perseusArtifactMatch) {
		logger.error("detected perseus widget artifact in generated qti xml", {
			artifact: perseusArtifactMatch[0],
			widgetType: perseusArtifactMatch.groups?.widgetName,
			widgetNumber: perseusArtifactMatch.groups?.widgetNumber,
			extraContent: perseusArtifactMatch.groups?.widgetContent,
			context: extractedXml.substring(
				Math.max(0, (perseusArtifactMatch.index ?? 0) - 100),
				Math.min(extractedXml.length, (perseusArtifactMatch.index ?? 0) + 100)
			)
		})
		throw errors.new(
			`invalid ai xml output: contains perseus widget artifact '${perseusArtifactMatch[0]}' which will cause qti api to fail`
		)
	}

	logger.debug("successfully generated and extracted qti xml from openai", {
		xmlLength: extractedXml.length,
		rootTag: extractedRootTag,
		hasAttributes: !!attributes?.trim(),
		hasXmlDeclaration
	})

	return extractedXml
}

/**
 * Attempts to fix invalid QTI XML using a more powerful AI model.
 * @param {logger.Logger} logger - The logger instance.
 * @param {object} input - The input object.
 * @param {string} input.invalidXml - The malformed XML string.
 * @param {string} input.errorMessage - The error message from the QTI API.
 * @param {'qti-assessment-item' | 'qti-assessment-stimulus'} input.rootTag - The expected root tag.
 * @returns {Promise<string>} A promise that resolves to the corrected QTI XML string.
 */
export async function fixInvalidQtiXml(
	logger: logger.Logger,
	input: {
		invalidXml: string
		errorMessage: string
		rootTag: "qti-assessment-item" | "qti-assessment-stimulus"
	}
): Promise<string> {
	const { invalidXml, errorMessage, rootTag } = input
	logger.debug("attempting to fix invalid qti xml", {
		rootTag,
		error: errorMessage,
		invalidXmlLength: invalidXml.length
	})

	const userPrompt = `You are an expert XML developer specializing in the QTI 3.0 standard. You have been given a piece of XML that was rejected by an API, along with the API's error message. Your task is to analyze the XML and the error, fix the XML so that it is perfectly well-formed and valid according to the QTI 3.0 standard, and return the corrected XML.

# CONTEXT
<invalid_xml>
${invalidXml}
</invalid_xml>

<api_error_message>
${errorMessage}
</api_error_message>

# VALID QTI TAGS
The only valid QTI tags for this application are:
[${VALID_QTI_TAGS.join(", ")}]

# INSTRUCTIONS & RULES
1.  **Primary Goal: Fix the XML.** Your only job is to produce a valid, well-formed QTI 3.0 XML document.
2.  **Analyze the Error:** Use the <api_error_message> to diagnose the problem. Common issues include unclosed tags, incorrect attributes, or invalid structure.
3.  **Enforce Correct Tag Names:** The generated XML MUST only use tags from the provided valid tag list. You will often see tags like \`assessmentItem\` or \`choiceInteraction\`; these are incorrect and MUST be corrected to \`qti-assessment-item\` and \`qti-choice-interaction\`, respectively. The \`qti-\` prefix is mandatory for all QTI elements.
4.  **Remove Hallucinated Tags:** The invalid XML might contain hallucinated, non-standard tags like \`<contentBody>\`. These tags must be completely removed, but their inner content (e.g., the \`<p>\` tags within them) must be preserved and correctly placed within the parent element.
5.  **THE MOST IMPORTANT RULE: FULL CLOSING TAGS ONLY.** Every tag you open MUST be closed with its full, complete name. Truncated or lazy tags like \`</_>\` are strictly forbidden. For example, \`<p>\` must be closed with \`</p>\`.
6.  **NO TRUNCATED OUTPUT.** Your response must be the complete XML file from start to finish, beginning with \`<?xml ...?>\` and ending with the final \`</${rootTag}>\` tag.
7.  **Return ONLY XML:** Your final output must be a single JSON object containing only the corrected XML string, as per the specified schema.

# FINAL OUTPUT
Return a single JSON object with the final corrected XML.
`

	logger.debug("calling openai for xml correction", {
		model: OPENAI_MODEL,
		promptLength: userPrompt.length,
		validTagCount: VALID_QTI_TAGS.length
	})

	const response = await errors.try(
		openai.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [{ role: "user", content: userPrompt }],
			response_format: zodResponseFormat(QtiCorrectionSchema, "qti_corrector"),
			reasoning_effort: "high"
		})
	)
	if (response.error) {
		logger.error("failed to fix qti xml", { error: response.error })
		throw errors.wrap(response.error, "qti xml correction")
	}

	logger.debug("received openai response", {
		choiceCount: response.data.choices.length,
		finishReason: response.data.choices[0]?.finish_reason
	})

	const message = response.data.choices[0]?.message
	if (!message) {
		logger.error("openai returned no message")
		throw errors.new("qti xml correction returned no content")
	}

	// Handle refusals
	if (message.refusal) {
		logger.error("openai refused to correct qti xml", { refusal: message.refusal })
		throw errors.new(`ai refused request: ${message.refusal}`)
	}

	// Access the automatically parsed data
	if (!message.parsed) {
		logger.error("qti xml correction returned no parsed content")
		throw errors.new("qti xml correction returned no content")
	}

	const correctedXml = message.parsed.corrected_xml
	if (!correctedXml) {
		logger.error("qti xml correction returned empty corrected_xml")
		throw errors.new("qti xml correction returned no content")
	}

	logger.info("successfully corrected qti xml", {
		rootTag,
		correctedXmlLength: correctedXml.length
	})

	// ROBUST XML VALIDATION AND EXTRACTION:
	// Step 1: Check for XML declaration (optional)
	const xmlDeclMatch = correctedXml.match(/^(?<declaration><\?xml[^>]*\?>)?/s)
	const hasXmlDeclaration = !!xmlDeclMatch?.groups?.declaration

	logger.debug("xml declaration check for corrected xml", {
		hasXmlDeclaration,
		declaration: xmlDeclMatch?.groups?.declaration?.substring(0, 50)
	})

	// Step 2: Extract the root element with robust named capture groups
	const rootElementRegex = new RegExp(
		"(?:^|\\s)" + // Start of string or whitespace
			`<(?<rootTag>${rootTag})` + // Opening tag must match our expected root
			"(?<attributes>(?:\\s+[^>]*)?)" + // Optional attributes
			">" + // Close opening tag
			"(?<content>[\\s\\S]*?)" + // Content (non-greedy)
			"</\\k<rootTag>>" + // Closing tag with backreference to ensure it matches
			"(?:\\s*$)?", // Optional trailing whitespace
		"s" // Dot matches newline
	)

	const rootMatch = correctedXml.match(rootElementRegex)

	if (!rootMatch || !rootMatch.groups) {
		// Try to find ANY qti root element for better error reporting
		const anyQtiMatch = correctedXml.match(/<(?<anyRoot>qti-[a-z-]+)(?:\s+[^>]*)?>/)

		logger.error("robust extraction failed: corrected xml is not valid", {
			expectedRootTag: rootTag,
			foundRootTag: anyQtiMatch?.groups?.anyRoot,
			response: correctedXml.substring(0, 200),
			responseEnd: correctedXml.substring(correctedXml.length - 200)
		})
		throw errors.new(
			`invalid corrected xml output: expected ${rootTag} but ${anyQtiMatch?.groups?.anyRoot ? `found ${anyQtiMatch.groups.anyRoot}` : "found no valid QTI root element"}`
		)
	}

	// TypeScript now knows rootMatch.groups is defined
	const { content, rootTag: extractedRootTag, attributes } = rootMatch.groups

	// Step 3: Validate the content doesn't have truncated closing tags
	if (!content) {
		logger.error("corrected xml has no content", { rootTag })
		throw errors.new("invalid corrected xml output: empty content")
	}

	const truncatedTagMatch = content.match(/<\/(?:_|\s*>|\.\.\.)/)
	if (truncatedTagMatch) {
		const matchIndex = truncatedTagMatch.index ?? 0
		logger.error("detected truncated closing tag in corrected xml content", {
			truncatedTag: truncatedTagMatch[0],
			context: content.substring(Math.max(0, matchIndex - 50), Math.min(content.length, matchIndex + 50))
		})
		throw errors.new("invalid corrected xml output: contains truncated closing tags")
	}

	// Step 4: Reconstruct the complete XML with declaration if present
	const extractedXml = (
		(hasXmlDeclaration && xmlDeclMatch?.groups?.declaration ? xmlDeclMatch.groups.declaration : "") +
		rootMatch[0].trim()
	).trim()

	// Step 5: Check for Perseus artifacts that should never appear in QTI
	// This regex captures Perseus widget notation like [[☃ widget-name 1]]
	// Named groups: fullMatch, widgetName, widgetNumber (optional), widgetContent (fallback for any remaining content)
	const perseusArtifactRegex =
		/\[\[☃\s*(?<widgetName>[a-zA-Z0-9_-]+)(?:\s+(?<widgetNumber>\d+))?(?:\s+(?<widgetContent>[^\]]+))?\]\]/
	const perseusArtifactMatch = extractedXml.match(perseusArtifactRegex)
	if (perseusArtifactMatch) {
		logger.error("detected perseus widget artifact in generated qti xml", {
			artifact: perseusArtifactMatch[0],
			widgetType: perseusArtifactMatch.groups?.widgetName,
			widgetNumber: perseusArtifactMatch.groups?.widgetNumber,
			extraContent: perseusArtifactMatch.groups?.widgetContent,
			context: extractedXml.substring(
				Math.max(0, (perseusArtifactMatch.index ?? 0) - 100),
				Math.min(extractedXml.length, (perseusArtifactMatch.index ?? 0) + 100)
			)
		})
		throw errors.new(
			`invalid ai xml output: contains perseus widget artifact '${perseusArtifactMatch[0]}' which will cause qti api to fail`
		)
	}

	logger.debug("correction complete", {
		originalLength: invalidXml.length,
		correctedLength: extractedXml.length,
		lengthDiff: extractedXml.length - invalidXml.length,
		rootTag: extractedRootTag,
		hasAttributes: !!attributes?.trim(),
		hasXmlDeclaration
	})

	return extractedXml
}
