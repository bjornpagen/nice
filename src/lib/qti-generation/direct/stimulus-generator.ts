import * as errors from "@superbuilders/errors"
import type * as logger from "@superbuilders/slog"
import OpenAI from "openai"
import { zodResponseFormat } from "openai/helpers/zod"
import { z } from "zod"
import { env } from "@/env"
import { loadConversionExamples } from "@/lib/qti-stimulus/utils/examples-loader"
import {
	convertHtmlEntities,
	fixInequalityOperators,
	fixKhanGraphieUrls,
	fixMathMLOperators,
	stripXmlComments
} from "@/lib/qti-stimulus/utils/xml-fixes"
import { resolveRelativeLinksToCanonicalDomain } from "@/lib/qti-stimulus/utils/link-resolver"

const OPENAI_MODEL = "gpt-5"
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const QtiGenerationSchema = z.object({
	qti_xml: z.string().describe("The single, complete, and perfectly-formed QTI 3.0 XML string.")
})

interface RegenerationContext {
	flawedXml: string
	errorReason: string
}

/**
 * Generates QTI XML for a stimulus (article) from Perseus content.
 * This uses the old direct XML generation approach which works well for stimuli.
 */
export async function generateXmlForStimulus(
	logger: logger.Logger,
	perseusContent: unknown,
	title: string,
	regenerationContext?: RegenerationContext
): Promise<string> {
	const perseusJsonString = JSON.stringify(perseusContent, null, 2)
	const { systemInstruction, userContent } = await createStimulusConversionPrompt(
		logger,
		perseusJsonString,
		title,
		regenerationContext
	)

	const responseFormat = zodResponseFormat(QtiGenerationSchema, "qti_generator")
	logger.debug("generated json schema for openai", {
		functionName: "generateXmlForStimulus",
		generatorName: "qti_generator",
		schema: JSON.stringify(responseFormat.json_schema?.schema, null, 2)
	})

	logger.debug("calling openai for qti stimulus generation", { model: OPENAI_MODEL })
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
		logger.error("failed to generate qti stimulus xml from perseus via openai", { error: response.error })
		throw errors.wrap(response.error, "ai qti stimulus generation")
	}

	logger.debug("received openai response", {
		fullResponse: response.data,
		choiceCount: response.data.choices.length,
		finishReason: response.data.choices[0]?.finish_reason,
		message: response.data.choices[0]?.message,
		parsed: response.data.choices[0]?.message?.parsed,
		usage: response.data.usage
	})

	const choice = response.data.choices[0]
	if (!choice) {
		logger.error("CRITICAL: OpenAI response contained no choices")
		throw errors.new("openai returned no choices")
	}
	const message = choice.message
	if (!message) {
		logger.error("CRITICAL: OpenAI choice contained no message")
		throw errors.new("empty ai response")
	}
	if (message.refusal) {
		logger.error("openai refused to generate qti stimulus xml", { refusal: message.refusal })
		throw errors.new(`ai refused request: ${message.refusal}`)
	}
	if (!message.parsed) {
		logger.error("CRITICAL: OpenAI returned no parsed content for qti stimulus conversion")
		throw errors.new("empty ai response: no parsed content")
	}

	const qtiXml = message.parsed.qti_xml
	if (!qtiXml) {
		logger.error("CRITICAL: OpenAI returned an empty qti_xml string in response")
		throw errors.new("empty ai response: qti_xml string is empty")
	}

	// Apply standard XML cleanup
	let cleanedXml = convertHtmlEntities(qtiXml, logger)
	cleanedXml = fixMathMLOperators(cleanedXml, logger)
	cleanedXml = fixInequalityOperators(cleanedXml, logger)
	cleanedXml = fixKhanGraphieUrls(cleanedXml, logger)

	const extracted = extractAndValidateXml(cleanedXml, "qti-assessment-stimulus", logger)
	const withCanonicalLinks = await resolveRelativeLinksToCanonicalDomain(extracted, logger)
	return withCanonicalLinks
}

/**
 * Extracts and validates the XML from the AI response
 */
function extractAndValidateXml(xml: string, rootTag: string, logger: logger.Logger): string {
	// Check for XML declaration (optional)
	const xmlDeclMatch = xml.match(/^(?<declaration><\?xml[^>]*\?>)?/s)
	const hasXmlDeclaration = !!xmlDeclMatch?.groups?.declaration

	logger.debug("xml declaration check", {
		hasXmlDeclaration,
		declaration: xmlDeclMatch?.groups?.declaration?.substring(0, 50)
	})

	// Extract the root element with robust named capture groups
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

	const rootMatch = xml.match(rootElementRegex)

	if (!rootMatch || !rootMatch.groups) {
		// Try to find ANY qti root element for better error reporting
		const anyQtiMatch = xml.match(/<(?<anyRoot>qti-[a-z-]+)(?:\s+[^>]*)?>/)

		logger.error("robust extraction failed: ai response did not contain valid qti xml", {
			expectedRootTag: rootTag,
			foundRootTag: anyQtiMatch?.groups?.anyRoot,
			response: xml.substring(0, 200),
			responseEnd: xml.substring(xml.length - 200)
		})
		throw errors.new(
			`invalid ai xml output: expected ${rootTag} but ${anyQtiMatch?.groups?.anyRoot ? `found ${anyQtiMatch.groups.anyRoot}` : "found no valid QTI root element"}`
		)
	}

	const { content, rootTag: extractedRootTag, attributes } = rootMatch.groups

	// Validate the content doesn't have truncated closing tags
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

	// Reconstruct the complete XML with declaration if present
	const extractedXml = (
		(hasXmlDeclaration && xmlDeclMatch?.groups?.declaration ? xmlDeclMatch.groups.declaration : "") +
		rootMatch[0].trim()
	).trim()

	// Strip all XML comments to prevent malformed comment errors
	let strippedXml = stripXmlComments(extractedXml, logger)

	// Fix unescaped angle brackets in MathML mo elements
	strippedXml = fixMathMLOperators(strippedXml, logger)

	// Fix unescaped inequality operators throughout the XML
	strippedXml = fixInequalityOperators(strippedXml, logger)

	// Fix Khan Academy graphie URLs by appending .svg extension
	strippedXml = fixKhanGraphieUrls(strippedXml, logger)

	logger.debug("successfully generated and extracted qti stimulus xml", {
		xmlLength: strippedXml.length,
		rootTag: extractedRootTag,
		hasAttributes: !!attributes?.trim(),
		hasXmlDeclaration
	})

	return strippedXml
}

/**
 * Creates the structured prompt for the AI model to convert Perseus JSON to QTI Stimulus XML
 */
async function createStimulusConversionPrompt(
	logger: logger.Logger,
	perseusJsonString: string,
	title: string,
	regenerationContext?: RegenerationContext
) {
	const rootTag = "qti-assessment-stimulus"

	logger.debug("creating qti stimulus conversion prompt", {
		rootTag,
		perseusDataLength: perseusJsonString.length,
		isRegeneration: !!regenerationContext
	})

	const systemInstruction = `You are an expert XML generator for educational content. Your primary and most critical function is to convert a Perseus JSON article object into a single, well-formed QTI 3.0 XML \`${rootTag}\`. Your output MUST be only the raw XML. The XML MUST be perfect and parseable. The most common and catastrophic failure is an incomplete or malformed closing tag. You are STRICTLY FORBIDDEN from using partial or lazy closing tags like \`</_>\` or \`</>\`. Every single XML element, such as \`<p>\`, must have a corresponding full closing tag, \`</p>\`. This rule is absolute and cannot be violated.`

	logger.debug("loading conversion examples", { type: "stimulus" })
	const examples = await loadConversionExamples()
	logger.debug("loaded conversion examples", {
		exampleCount: examples.length,
		exampleNames: examples.map((e) => e.name),
		positiveCount: examples.filter((e) => e.type === "positive").length,
		negativeCount: examples.filter((e) => e.type === "negative").length
	})

	// Separate positive and negative examples
	const positiveExamples = examples.filter((e) => e.type === "positive")
	const negativeExamples = examples.filter((e) => e.type === "negative")

	// Always include positive examples
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

	// Conditionally build negative examples block
	let negativeExamplesBlock = ""
	if (!regenerationContext) {
		const negativeExamplesFromData = negativeExamples
			.map(
				(example) => `
<negative_example_from_data name="${example.name}">
${
	example.perseus !== null
		? `  <perseus_json>
${JSON.stringify(example.perseus, null, 2)}
  </perseus_json>`
		: "  <!-- No Perseus source - this is a QTI-only negative example -->"
}
  <malformed_qti_xml>
${example.qti}
  </malformed_qti_xml>
</negative_example_from_data>
`
			)
			.join("\n")

		negativeExamplesBlock = `
<negative_examples_from_filesystem>
<!-- THESE ARE REAL EXAMPLES OF MALFORMED QTI XML LOADED FROM OUR NEGATIVE EXAMPLES DIRECTORY -->
<!-- Each example contains an XML comment explaining why it is incorrect -->
${negativeExamplesFromData}
</negative_examples_from_filesystem>
`
	}

	const regenerationBlock = regenerationContext
		? `
<regeneration_context>
### REGENERATION TASK ###
The previous attempt to generate this QTI XML failed validation for the following reason.
Your task is to regenerate the XML, fixing this specific error while preserving the original intent.

**Reason for Failure:**
${regenerationContext.errorReason}

**Flawed XML from Previous Attempt:**
\`\`\`xml
${regenerationContext.flawedXml}
\`\`\`

**Instructions for Correction:**
1. Analyze the provided reason and the flawed XML.
2. Identify the mistake in the previous attempt (e.g., missing context, incorrect structure, invalid XML).
3. **Pay close attention to the positive examples provided below to understand the correct structure and content fidelity required.**
4. Generate a new, completely valid QTI XML that corrects the error and fully represents the source Perseus JSON.
</regeneration_context>
`
		: ""

	const userContent = `
${regenerationBlock}
<examples>
${positiveExamplesXml}
</examples>
${negativeExamplesBlock}
<critical_negative_examples>
<!-- THESE ARE EXAMPLES OF WHAT MUST NEVER APPEAR IN QTI STIMULUS XML -->
<negative_example reason="Perseus widget artifacts cause QTI API to return 'unknown' type and fail validation">
  <perseus_artifact>[[☃ plotter 1]]</perseus_artifact>
  <explanation>This is a Perseus-specific interactive plotter widget. It MUST be completely removed from stimulus content.</explanation>
</negative_example>
<negative_example reason="QTI elements are forbidden in stimulus body">
  <malformed_qti>
    <qti-stimulus-body>
      <qti-prompt>Read the following passage:</qti-prompt>
      <p>This is an informational text about photosynthesis...</p>
      <qti-text-entry-interaction response-identifier="RESPONSE">
        <qti-prompt>What did you learn?</qti-prompt>
      </qti-text-entry-interaction>
    </qti-stimulus-body>
  </malformed_qti>
  <explanation>The qti-stimulus-body contains QTI elements (qti-prompt and qti-text-entry-interaction). This is INVALID. The qti-stimulus-body must contain ONLY standard HTML elements. Stimulus items are purely informational and cannot contain any interactions or QTI-specific elements. Use <p>, <h2>, <ul>, <li>, <div>, <img>, <a>, <strong>, <em>, <code>, <pre>, <math>, etc., but NEVER any qti-* elements.</explanation>
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
</critical_negative_examples>

<instructions>
### PREAMBLE: THE GOAL OF THIS CONVERSION ###

You are converting from Perseus JSON, a proprietary format from Khan Academy, to QTI 3.0 XML stimulus format. The ultimate goal is to produce a **high-quality, informational QTI stimulus item.** Stimuli are purely informational content that provide context for assessment items.

Below is a Perseus JSON article object with the title "${title}". Your task is to provide the corresponding QTI 3.0 XML. Use the PERFECT examples above to inform your output. Respond with ONLY the XML content.

<perseus_json>
${perseusJsonString}
</perseus_json>

Your output will be fed directly into an automated XML parser. If the XML is not well-formed, the entire system will crash. Pay extreme attention to the rules below.

---
### CRITICAL RULE 1: Worked Problem and Answer Formatting ###

**ABSOLUTE RULE: ALL WORKED SOLUTIONS AND ANSWERS MUST BE HIDDEN BY DEFAULT**

To preserve the educational value of the content, it is imperative that students are not immediately shown the answer to a problem. When you identify a question, worked problem, or any challenge followed by its solution, you MUST use the HTML \`<details>\` and \`<summary>\` elements.

1.  **The Question/Problem:** The question or prompt text MUST be visible. It can be a standalone \`<p>\` tag or placed inside the \`<summary>\` element.
2.  **The Answer/Solution:** The entire worked-out solution, final answer, or explanation MUST be placed inside the \`<details>\` tag, immediately following the question or summary. The summary text should be "Solution" or "View Answer".

**EXAMPLE OF A FAILURE CASE (BANNED):**
This is an example of what you MUST NOT produce. The solution is visible immediately, which destroys the educational purpose.
\`\`\`xml
<!-- ❌ BANNED: The answer is immediately visible. -->
<h4>Problem 1.1</h4>
<p><strong>Evaluate.</strong></p>
<p>
  <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><msup><mn>3</mn><mn>4</mn></msup></math>
</p>
<div>
  <h5>Solution</h5>
  <math xmlns="http://www.w3.org/1998/Math/MathML">
    <mtable columnalign="left center left">
      <mtr>
        <mtd><mrow><mo>-</mo><msup><mn>3</mn><mn>4</mn></msup></mrow></mtd>
        <mtd><mo>=</mo></mtd>
        <mtd><mrow><mo>-</mo><mo>(</mo><mn>3</mn><mo>⋅</mo><mn>3</mn><mo>⋅</mo><mn>3</mn><mo>⋅</mo><mn>3</mo><mo>)</mo></mrow></mtd>
        <mtd><mtext>Evaluate the power.</mtext></mtd>
      </mtr>
      <mtr>
        <mtd><mrow><mo>-</mo><mn>81</mn></mrow></mtd>
        <mtd></mtd>
        <mtd></mtd>
        <mtd><mtext>Take the opposite.</mtext></mtd>
      </mtr>
    </mtable>
  </math>
</div>
\`\`\`

**EXAMPLE OF THE CORRECT IMPLEMENTATION (REQUIRED):**
This is the required format. The solution is hidden within a \`<details>\` tag, forcing the student to engage with the problem first.
\`\`\`xml
<!-- ✅ CORRECT: The solution is hidden and only revealed on user interaction. -->
<h4>Problem 1.1</h4>
<p><strong>Evaluate.</strong></p>
<p>
  <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><msup><mn>3</mn><mn>4</mn></msup></math>
</p>
<details>
  <summary>Solution</summary>
  <math xmlns="http://www.w3.org/1998/Math/MathML">
    <mtable columnalign="left center left">
      <mtr>
        <mtd><mrow><mo>-</mo><msup><mn>3</mn><mn>4</mn></msup></mrow></mtd>
        <mtd><mo>=</mo></mtd>
        <mtd><mrow><mo>-</mo><mo>(</mo><mn>3</mn><mo>⋅</mo><mn>3</mn><mo>⋅</mo><mn>3</mn><mo>⋅</mo><mn>3</mn><mo>)</mo></mrow></mtd>
        <mtd><mtext>Evaluate the power.</mtext></mtd>
      </mtr>
      <mtr>
        <mtd><mrow><mo>-</mo><mn>81</mn></mrow></mtd>
        <mtd></mtd>
        <mtd></mtd>
        <mtd><mtext>Take the opposite.</mtext></mtd>
      </mtr>
    </mtable>
  </math>
</details>
\`\`\`
Apply this rule to ANY content that presents a problem and its corresponding solution. This is a non-negotiable requirement.

---
### CRITICAL RULE 2: Minimal Paraphrasing and Editorial Pass ###

In addition to converting the format, you are required to perform a light editorial pass on the text content. The goal is to create a version that is not an exact copy of the source while preserving the original educational intent and meaning.

**Your editorial tasks are:**
1.  **Correct Grammar and Spelling:** Fix any grammatical errors, spelling mistakes, or awkward phrasing in the original Perseus content.
2.  **Improve Clarity:** If a sentence is unclear or convoluted, rewrite it to be more direct and understandable for the target grade level.
3.  **Perform Minimal Paraphrasing:** Make subtle changes to the text. This includes:
    *   Swapping proper nouns where appropriate (e.g., change "Maria" to "James", "a bakery in Paris" to "a shop in London"). Do not change names or places if they are central to the problem's context (e.g., historical figures).
    *   Slightly reordering sentence clauses.
    *   Replacing some words with synonyms where it does not change the meaning.
4.  **Preserve Core Meaning:** You MUST NOT change the core facts, numbers, mathematical operations, or educational concepts of the problem. The paraphrasing is stylistic, not substantive.

**EXAMPLE OF MINIMAL PARAPHRASING:**

**Original Perseus Text:** "When there are lots of operations in an expression, we need to agree on which to evaluate first. That way, we will all agree that the expression has the same value."

**Acceptable Paraphrased QTI Output:** "When an expression contains multiple operations, it is essential to have a standard order for evaluating them. This ensures that everyone arrives at the same value for the expression."

This is a critical step. The final XML content should be clear, grammatically correct, and distinct from the source Perseus JSON.

---
### CRITICAL: STIMULUS BODY RULES ###

**ABSOLUTE RULE: <qti-stimulus-body> MUST CONTAIN ONLY HTML**

When generating a \`qti-assessment-stimulus\`, the \`<qti-stimulus-body>\` element has extremely strict content rules:

1. **NO QTI ELEMENTS ALLOWED**: The stimulus body must NEVER contain any QTI-specific elements. This includes:
   - NO \`<qti-prompt>\` elements (use \`<p>\` or \`<h2>\` instead)
   - NO interaction elements (\`<qti-choice-interaction>\`, \`<qti-text-entry-interaction>\`, etc.)
   - NO QTI structural elements
   - NO elements starting with \`qti-\`

2. **ONLY HTML ELEMENTS**: You may ONLY use standard HTML elements inside \`<qti-stimulus-body>\`:
   - Text formatting: \`<p>\`, \`<h1>\`, \`<h2>\`, \`<h3>\`, \`<strong>\`, \`<em>\`, \`<span>\`, \`<code>\`, \`<pre>\`
   - Lists: \`<ul>\`, \`<ol>\`, \`<li>\`, \`<dl>\`, \`<dt>\`, \`<dd>\`
   - Structure: \`<div>\`, \`<section>\`, \`<article>\`, \`<aside>\`, \`<header>\`, \`<footer>\`, \`<hr>\`
   - Media: \`<img>\`, \`<figure>\`, \`<figcaption>\`
   - Links: \`<a>\`
   - Tables: \`<table>\`, \`<tr>\`, \`<td>\`, \`<th>\`, \`<thead>\`, \`<tbody>\`, \`<tfoot>\`
   - Math: \`<math>\` (MathML is allowed)
   - Others: \`<blockquote>\`, \`<cite>\`, \`<br>\`

3. **PURPOSE**: Stimulus items are purely informational. They provide context, passages, or reference material for other assessment items. They CANNOT contain questions or interactions.

4. **COMMON MISTAKES TO AVOID**:
   - Do NOT use \`<qti-prompt>\` for headings or questions in stimulus - use \`<h2>\` or \`<p>\`
   - Do NOT include any interactive elements - stimulus is read-only
   - Do NOT try to collect responses within a stimulus

**Example of CORRECT stimulus body:**
\`\`\`xml
<qti-stimulus-body>
  <h2>The Water Cycle</h2>
  <p>Water continuously moves through different states in nature...</p>
  <figure>
    <img src="https://example.com/water-cycle.png" alt="Diagram of the water cycle"/>
    <figcaption>The water cycle showing evaporation, condensation, and precipitation</figcaption>
  </figure>
  <p>This process is essential for all life on Earth.</p>
</qti-stimulus-body>
\`\`\`

---
### CRITICAL: PERSEUS ARTIFACTS REMOVAL ###

**THE MOST CRITICAL RULE: NO PERSEUS WIDGET ARTIFACTS**

Perseus uses special notation like [[☃ widget-name 1]] for interactive widgets. These MUST NEVER appear in your QTI stimulus output. When you encounter Perseus widgets in article content:
1. Remove them entirely - stimuli cannot have interactive elements
2. If they contain important informational content, convert to static HTML
3. NEVER output the [[☃ ...]] notation itself

---
### ADDITIONAL CRITICAL RULES ###

1. **NO CDATA SECTIONS**: Never use \`<![CDATA[...]]>\` anywhere in the XML. All content must be properly XML-encoded.

2. **NO PERSEUS MARKDOWN IMAGES**: Convert any \`![alt text](url)\` syntax to proper HTML: \`<img src="url" alt="alt text"/>\`

3. **NO PERSEUS URL SCHEMES**: Convert \`web+graphie://\` to \`https://\`. Perseus uses custom URL protocols that are invalid in standard web contexts.

4. **Convert All LaTeX to MathML:** Any text enclosed in \`$...$\` is LaTeX and MUST be converted to \`<math>...</math>\`.

5. **REQUIRED XML ESCAPING:** Only use the absolute minimum XML character escaping required for well-formed XML. The ONLY acceptable entity references are:
    - \`&lt;\` for less-than symbol (<) when it appears in content
    - \`&gt;\` for greater-than symbol (>) when it appears in content
    - \`&amp;\` for ampersand (&) when it appears in content
    - \`&quot;\` for double quote (") when it appears in content or attribute values
    - \`&apos;\` for single quote/apostrophe (') when it appears in content or attribute values

6. **WORKS-CITED LISTS MUST BE ORDERED:** Works-cited lists MUST use ordered lists (\`<ol>\`), never unordered lists (\`<ul>\`). This should only be for works cited sections, NOT for anything else like lists of references, attributions, etc.

7. **DROPDOWNS MUST USE DETAILS/SUMMARY:** Convert Perseus explanation widgets (e.g., \`[[☃ explanation X]]\`) into semantic HTML5 \`<details>\` with a \`<summary>\` for the prompt and the explanation content inside \`<details>\`. Do NOT use generic \`<div>\`/\`<h3>\` structures.

---
### ABSOLUTE XML RULES - NON-NEGOTIABLE ###

1.  **THE MOST IMPORTANT RULE: FULL CLOSING TAGS ONLY.**
    Every tag you open MUST be closed with its full, complete name. Truncated or lazy tags are strictly forbidden and will cause a catastrophic failure.

    - ✅ **CORRECT:** \`</p>\`, \`</math>\`, \`</div>\`, \`</qti-stimulus-body>\`
    - ❌ **ABSOLUTELY FORBIDDEN:** \`</_>\`, \`</>\`, \`</qti-stimulus-bo... \`

2.  **NO TRUNCATED OUTPUT.**
    Your response must be the complete XML file from start to finish. Do not stop generating mid-tag or mid-file. Ensure the final \`</${rootTag}>\` tag is present and correct.

3.  **MENTAL CHECK.**
    Before you output your final answer, perform a mental check: "Did I close every single tag I opened with its full name? Is the final closing tag present?"

FINAL REMINDER: The examples demonstrate PERFECT QTI 3.0 XML stimulus output. Follow their patterns exactly. Your top priority is generating a well-formed XML document with complete closing tags.
`

	logger.debug("prompt created", {
		systemInstructionLength: systemInstruction.length,
		userContentLength: userContent.length,
		totalPromptLength: systemInstruction.length + userContent.length
	})

	return { systemInstruction, userContent }
}
