export function produceQtiParaphrasingPrompt(sourceQtiXml: string): { developer: string; user: string } {
	const developer =
		"You are an expert QTI 3.0 assessment stimulus author, specializing in paraphrasing educational content while preserving its structural, semantic, and pedagogical integrity. Your generated XML is always perfectly-formed and adheres to all specified constraints."

	const user = `
<task_definition>
  # Task
  Your task is to generate a single, high-quality, paraphrased version of the provided QTI 3.0 assessment stimulus. The new version must be a complete, valid QTI XML document. The goal is to create a new article with unique wording that is not a direct copy, while retaining the original educational meaning, title, images, and instructional style.
</task_definition>

<additional_requirements>
  # Output Format
  You MUST return a single JSON object. This object will have one key, "paraphrasedStimulus", which is a string containing the complete and valid QTI XML document for the generated variation.
  - Example: \`{ "paraphrasedStimulus": "<qti-assessment-stimulus>...</qti-assessment-stimulus>" }\`
</additional_requirements>

<inputs>
  <main_input_data>
    <source_qti_xml>
      ${sourceQtiXml}
    </source_qti_xml>
  </main_input_data>
</inputs>

<instructions_and_constraints>
  # Instructions & Rules
  1.  **Preserve Core Elements:** The following elements and their attributes from the source XML MUST remain completely unchanged in your output:
      *   The \`title\` attribute of the root \`<qti-assessment-stimulus>\` tag.
      *   All \`<img>\` tags, including their \`src\`, \`alt\`, \`width\`, and \`height\` attributes. Do NOT change image references.
  2.  **Paraphrase Textual Content:** You MUST rewrite and rephrase all other textual content inside the \`<qti-stimulus-body>\`. The new wording should be substantially different, but the educational meaning and key concepts must be preserved.
  3.  **Maintain Instructional Style and Tone (CRITICAL):** You MUST analyze the original text's tone, complexity, and teaching method (e.g., procedural, conceptual, narrative). The paraphrased version MUST match this style. If the original uses simple language and procedural steps (like "skip count by 5s"), your version must also use simple language and procedural steps. Do NOT replace a simple method with a more complex or abstract one (e.g., changing "skip counting" to a formal multiplication explanation). The goal is to create a new version for the *same target audience*.
  4.  **Maintain XML Structure:** The entire XML structure, including all tags, nesting, and attributes (like those in MathML \`<math>\` tags), MUST be perfectly preserved.
  5.  **Absolute XML Well-Formedness:** This is your highest priority. Every generated XML string MUST be perfectly well-formed.
      *   Every opened tag must have a corresponding full closing tag (e.g., \`<p>\` requires \`</p>\`).
      *   Lazy closing tags like \`</>\` or \`</_>\` are STRICTLY FORBIDDEN.
  6.  **Do Not Change the Identifier:** The \`identifier\` attribute of the root \`<qti-assessment-stimulus>\` tag MUST remain unchanged.
  7.  **Strict JSON Output:** The final output MUST be a single JSON object with the specified structure. Do not add any explanatory text, markdown, or anything outside of this JSON object.
</instructions_and_constraints>

<examples>
  # Positive Example (Preserving Instructional Style)
  <positive_example>
    <example_inputs>
      <source_qti_xml>
        <![CDATA[
          <?xml version="1.0" encoding="UTF-8"?>
          <qti-assessment-stimulus identifier="counting-coins-stimulus" title="Counting Coins">
            <qti-stimulus-body>
              <p>A nickel is 5 cents, and there are 2 nickels. Skip count by 5s two times from 45 cents:</p>
              <p>45, 50, 55 cents</p>
            </qti-stimulus-body>
          </qti-assessment-stimulus>
        ]]>
      </source_qti_xml>
    </example_inputs>
    <thinking>
      1.  **Analyze Task:** I need to paraphrase the text while preserving the title, identifier, and instructional style.
      2.  **Analyze Style:** The source text uses a simple, procedural method: "Skip count by 5s". This is likely for a younger audience. My paraphrase must also use a similar procedural approach. I will avoid introducing more complex concepts like multiplication.
      3.  **Identify Elements to Preserve:** The \`identifier\` and \`title\` attributes. The XML structure (\`<p>\`, then another \`<p>\` with the count).
      4.  **Paraphrase Content:**
          *   Rewrite the first \`<p>\`: "There are 2 nickels, and each nickel is worth 5 cents. Let's count up by 5s twice, starting from 45 cents:"
          *   The second \`<p>\` contains the result of the procedure, so it should remain the same to be factually correct.
      5.  **Construct Final XML:** Assemble the new text into the original structure, ensuring it is well-formed.
    </thinking>
    <answer>
      {
        "paraphrasedStimulus": "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\n<qti-assessment-stimulus identifier=\\"counting-coins-stimulus\\" title=\\"Counting Coins\\">\n  <qti-stimulus-body>\n    <p>There are 2 nickels, and each nickel is worth 5 cents. Let's count up by 5s twice, starting from 45 cents:</p>\n    <p>45, 50, 55 cents</p>\n  </qti-stimulus-body>\n</qti-assessment-stimulus>"
      }
    </answer>
  </positive_example>

  # Negative Example (Incorrectly Changing Instructional Style)
  <negative_example>
    <example_inputs>
      <source_qti_xml>
        <![CDATA[
          <?xml version="1.0" encoding="UTF-8"?>
          <qti-assessment-stimulus identifier="counting-coins-stimulus" title="Counting Coins">
            <qti-stimulus-body>
              <p>A nickel is 5 cents, and there are 2 nickels. Skip count by 5s two times from 45 cents:</p>
              <p>45, 50, 55 cents</p>
            </qti-stimulus-body>
          </qti-assessment-stimulus>
        ]]>
      </source_qti_xml>
    </example_inputs>
    <thinking>
      1.  **Analyze Task:** I need to paraphrase the text.
      2.  **Analyze Style:** The "skip count" method seems too simple. I will "improve" it by explaining the multiplication. **<-- THIS IS A VIOLATION.**
      3.  **Paraphrase Content:**
          *   Rewrite the first \`<p>\` to be more conceptual: "With two nickels (2 * 5 cents), we add 10 cents to the previous total."
          *   Create a new paragraph to show the calculation: "This brings the total to 55 cents (45 + 10)."
      4.  **Construct Final XML:** Assemble the new, more complex explanation.
    </thinking>
    <answer>
      {
        "paraphrasedStimulus": "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\n<qti-assessment-stimulus identifier=\\"counting-coins-stimulus\\" title=\\"Counting Coins\\">\n  <qti-stimulus-body>\n    <p>With two nickels (2 * 5 cents), we add 10 cents to the previous total.</p>\n    <p>This brings the total to 55 cents (45 + 10).</p>\n  </qti-stimulus-body>\n</qti-assessment-stimulus>"
      }
    </answer>
    <reason_for_failure>
      The negative example is incorrect because it violates the critical rule of maintaining instructional style. It replaced the simple, procedural "skip counting" method with a more complex, conceptual explanation involving multiplication and explicit addition. This changes the pedagogical approach and may confuse the original target audience. The goal is to paraphrase, not to re-teach the concept differently.
    </reason_for_failure>
  </negative_example>
</examples>

<thinking>
  <!-- My detailed plan for the live request will go here, following the example's thought process. I will first identify the instructional style of the source text, then identify what to preserve and what to paraphrase, ensuring my paraphrasing matches the original style before constructing the final, well-formed XML. -->
</thinking>
`
	return { developer, user }
}
