export function produceQtiVariationsPrompt(
	sourceQtiXml: string,
	numberOfVariations: number
): { developer: string; user: string } {
	const developer =
		"You are an expert QTI 3.0 assessment item author with 10+ years in educational assessment, specializing in creating diverse, high-quality, and valid educational questions based on a single source item. You focus on misconception-targeted distractors, skill alignment, and perfectly-formed XML that adheres to all specified constraints. Your responses mimic structured inputs for precision."

	const user = `
<source_qti_xml><![CDATA[
${sourceQtiXml}
]]></source_qti_xml>

<task_definition>
  # Task
  Your task is to generate exactly ${numberOfVariations} new, distinct variations of the provided QTI 3.0 assessment item. Each variation MUST be a complete, valid QTI XML document that tests the same core skill but with new scenarios, numbers, contexts, or wording.
</task_definition>

<additional_requirements>
  # Output Format
  You MUST return a single JSON object. This object will have one key, "differentiatedQuestions", which is an array of strings. Each string in the array MUST be a complete and valid QTI XML document for one of the generated question variations.
  - Example: { "differentiatedQuestions": ["<qti-assessment-item>...</qti-assessment-item>", "<qti-assessment-item>...</qti-assessment-item>"] }
</additional_requirements>

<configuration_parameters>
  <number_of_variations_to_generate>${numberOfVariations}</number_of_variations_to_generate>
</configuration_parameters>

<instructions_and_constraints>
  # Instructions & Rules
  1. **Understand the Core Skill:** Deeply analyze the <source_qti_xml> to identify the specific educational skill being tested (e.g., calculating area, identifying a verb, historical knowledge).
  2. **Generate Distinct Variations:** Create ${numberOfVariations} new questions that test the same core skill using fresh numbers, scenarios, contexts, or wording. Ensure variations are meaningfully different while preserving alignment.
  3. **Target Common Misconceptions:** For multiple-choice questions, design incorrect answers (distractors) to target common student misconceptions related to the skill. Base them on logical errors, not randomness (e.g., for area calculation, use perimeter result as a distractor).
  4. **Preserve Image References:** If the source contains <img ... /> tags, reuse the exact src attribute in variations without creating new images.
  5. **Maintain QTI Structure:** Follow the source's basic structure (e.g., qti-choice-interaction, qti-text-entry-interaction) unless a valid structural change enhances variation.
  6. **Preserve Feedback Structure:** If the source includes <qti-feedback-inline> for choices, provide unique, relevant feedback for every choice in variations, explaining correctness or errors in the new context.
  7. **Absolute XML Well-Formedness:** Prioritize perfect XML: Open tags must have matching closing tags, attributes quoted, special characters escaped (e.g., &lt; for <).
  8. **Unique Identifiers:** Assign new, unique identifier attributes to each <qti-assessment-item> (e.g., "generated-item-1").
  9. **Strict JSON Output:** Output only the specified JSON object without extra text.
</instructions_and_constraints>

<thinking_instructions>
  # Reasoning Process
  For each variation, reason step-by-step in <thinking> tags before generating:
  1. Analyze core skill and misconceptions.
  2. Plan distinct variation (new elements, distractors).
  3. Verify structure, feedback, and XML validity.
  Generate 2-3 reasoning paths if needed and select the most consistent. After all variations, critique in <self_review> tags: Check XML validity, skill alignment, distinctness, and refine if issues found (but output only final JSON).
</thinking_instructions>

<examples>
  # Positive Examples

  <positive_example index="1">
    <example_inputs>
      <main_example_input>
        <source_qti_xml>
          <![CDATA[
            <?xml version="1.0" encoding="UTF-8"?>
            <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd"
              identifier="source-item-123" title="Area of a Rectangle" adaptive="false" time-dependent="false">
              <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
                <qti-correct-response><qti-value>ChoiceA</qti-value></qti-correct-response>
              </qti-response-declaration>
              <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
                <qti-default-value><qti-value>0.0</qti-value></qti-default-value>
              </qti-outcome-declaration>
              <qti-item-body>
                <p>A rectangle has a length of 8 cm and a width of 5 cm. What is its area?</p>
                <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
                  <qti-simple-choice identifier="ChoiceA">40 cm²</qti-simple-choice>
                  <qti-simple-choice identifier="ChoiceB">26 cm²</qti-simple-choice>
                  <qti-simple-choice identifier="ChoiceC">13 cm</qti-simple-choice>
                </qti-choice-interaction>
              </qti-item-body>
              <qti-response-processing template="http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct"/>
            </qti-assessment-item>
          ]]>
        </source_qti_xml>
      </main_example_input>
      <example_configuration_parameters>
        <number_of_variations_to_generate>1</number_of_variations_to_generate>
      </example_configuration_parameters>
    </example_inputs>
    <thinking>
      1. **Analyze Skill:** Tests rectangle area (length × width). Numbers: 8 and 5. Correct: 40.
      2. **Misconceptions:** ChoiceB: perimeter (2×(8+5)=26). ChoiceC: addition (8+5=13, wrong units).
      3. **Plan Variation:** New: rectangular field, 12m × 10m. Correct: 120 m². Distractors: perimeter (44 m²), addition (22 m), magnitude error (1200 m²).
      4. **Construct XML:** New identifier "generated-item-1", update title/prompt/choices/correct-response. Ensure tags match.
    </thinking>
    <answer>
      {
        "differentiatedQuestions": [
          "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\\n<qti-assessment-item xmlns=\\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\\" xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xsi:schemaLocation=\\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\\" identifier=\\"generated-item-1\\" title=\\"Area of a Larger Rectangle\\" adaptive=\\"false\\" time-dependent=\\"false\\">\\n  <qti-response-declaration identifier=\\"RESPONSE\\" cardinality=\\"single\\" base-type=\\"identifier\\">\\n    <qti-correct-response><qti-value>ChoiceC</qti-value></qti-correct-response>\\n  </qti-response-declaration>\\n  <qti-outcome-declaration identifier=\\"SCORE\\" cardinality=\\"single\\" base-type=\\"float\\">\\n    <qti-default-value><qti-value>0.0</qti-value></qti-default-value>\\n  </qti-outcome-declaration>\\n  <qti-item-body>\\n    <p>What is the area of a rectangular field with a length of 12 meters and a width of 10 meters?</p>\\n    <qti-choice-interaction response-identifier=\\"RESPONSE\\" shuffle=\\"true\\" max-choices=\\"1\\">\\n      <qti-simple-choice identifier=\\"ChoiceA\\">44 m²</qti-simple-choice>\\n      <qti-simple-choice identifier=\\"ChoiceB\\">22 m</qti-simple-choice>\\n      <qti-simple-choice identifier=\\"ChoiceC\\">120 m²</qti-simple-choice>\\n      <qti-simple-choice identifier=\\"ChoiceD\\">1200 m²</qti-simple-choice>\\n    </qti-choice-interaction>\\n  </qti-item-body>\\n  <qti-response-processing template=\\"http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct\\"/>\\n</qti-assessment-item>"
        ]
      }
    </answer>
  </positive_example>

  <positive_example index="2">
    <!-- Add a diverse example, e.g., for text-entry interaction with feedback -->
    <!-- Omitted for brevity; include a full example here in practice -->
  </positive_example>

  # Negative Examples

  <negative_example index="1">
    <example_inputs>
      <main_example_input>
        <source_qti_xml>
          <![CDATA[
            <?xml version="1.0" encoding="UTF-8"?><qti-assessment-item
                xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
                identifier="nice-tmp:x0d18927f62bed18d"
                title="Skip-count by 5s"
                time-dependent="false"
                xml:lang="en-US">

                <qti-response-declaration base-type="identifier" cardinality="single" identifier="RESPONSE">
                    <qti-correct-response>
                        <qti-value>C</qti-value>
                    </qti-correct-response>
                </qti-response-declaration>

                <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>
                <qti-outcome-declaration identifier="FEEDBACK-INLINE" cardinality="single" base-type="identifier"/>

                <qti-item-body>
                    <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" max-choices="1">
                        <qti-prompt>What two numbers does Olaf count next?</qti-prompt>
                        <qti-simple-choice identifier="A">
                            <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>375</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>385</mn></math>
                            <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="A">Not quite. Olaf is skip counting by fives, so after 365 comes 370 then 375, not 385.</qti-feedback-inline>
                        </qti-simple-choice>
                        <qti-simple-choice identifier="B">
                            <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>370</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>380</mn></math>
                            <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="B">Not quite. After 370, Olaf counts 375, not 380.</qti-feedback-inline>
                        </qti-simple-choice>
                        <qti-simple-choice identifier="C">
                            <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>370</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>375</mn></math>
                            <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="C">Correct! Olaf adds 5 to 365 to get 370, then 5 to 370 to get 375.</qti-feedback-inline>
                        </qti-simple-choice>
                        <qti-simple-choice identifier="D">
                            <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>370</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>385</mn></math>
                            <qti-feedback-inline outcome-identifier="FEEDBACK-INLINE" identifier="D">Not quite. After 370 comes 375, not 385.</qti-feedback-inline>
                        </qti-simple-choice>
                    </qti-choice-interaction>

                    <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
                        <qti-content-body>
                            <p><strong>Correct!</strong> Olaf adds 5 to 365 to get <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>370</mn></math>, then adds 5 to get <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>375</mn></math>.</p>
                        </qti-content-body>
                    </qti-feedback-block>
                    <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
                        <qti-content-body>
                            <p><strong>Not quite.</strong> Remember, skip counting by fives means you keep adding 5 to each previous number, so the next numbers are 370 and 375.</p>
                        </qti-content-body>
                    </qti-feedback-block>
                </qti-item-body>

                <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>

            </qti-assessment-item>
          ]]>
        </source_qti_xml>
      </main_example_input>
      <example_configuration_parameters>
        <number_of_variations_to_generate>2</number_of_variations_to_generate>
      </example_configuration_parameters>
    </example_inputs>
    <why_this_is_bad>
      This example demonstrates several anti-patterns: excessive MathML usage for simple numbers that could be plain text, overly complex feedback structure with both inline and block feedback, inconsistent identifier patterns (using single letters vs descriptive names), and missing context about what number Olaf started from (365 is referenced but not established). Variations should use simpler markup, clearer identifiers, and provide complete context.
    </why_this_is_bad>
  </negative_example>
</examples>

<thinking>
  <!-- Your detailed plan for the live request, following the thinking instructions. -->
</thinking>
`
	return { developer, user }
}
