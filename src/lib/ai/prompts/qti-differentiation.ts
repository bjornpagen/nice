export function produceQtiVariationsPrompt(
	sourceQtiXml: string,
	numberOfVariations: number
): { developer: string; user: string } {
	const developer =
		"You are an expert QTI 3.0 assessment item author, specializing in creating diverse, high-quality, and valid educational questions based on a single source item. Your generated XML is always perfectly-formed and adheres to all specified constraints."

	const user = `
<task_definition>
  # Task
  Your task is to generate exactly ${numberOfVariations} new, distinct variations of the provided QTI 3.0 assessment item. Each variation MUST be a complete, valid QTI XML document.
</task_definition>

<additional_requirements>
  # Output Format
  You MUST return a single JSON object. This object will have one key, "differentiatedQuestions", which is an array of strings. Each string in the array MUST be a complete and valid QTI XML document for one of the generated question variations.
  - Example: \`{ "differentiatedQuestions": ["<qti-assessment-item>...</qti-assessment-item>", "<qti-assessment-item>...</qti-assessment-item>"] }\`
</additional_requirements>

<inputs>
  <main_input_data>
    <source_qti_xml>
      ${sourceQtiXml}
    </source_qti_xml>
  </main_input_data>
  <configuration_parameters>
    <number_of_variations_to_generate>${numberOfVariations}</number_of_variations_to_generate>
  </configuration_parameters>
</inputs>

<instructions_and_constraints>
  # Instructions & Rules
  1.  **Understand the Core Skill:** First, deeply analyze the \`<source_qti_xml>\` to understand the specific educational skill being tested (e.g., calculating area, identifying a verb, historical knowledge).
  2.  **Generate Distinct Variations:** Create ${numberOfVariations} new questions that test the *same core skill* but use different numbers, scenarios, contexts, or wording. Do NOT simply rephrase the source question.
  3.  **Target Common Misconceptions:** For multiple-choice questions, the incorrect answers (distractors) are critical. They MUST NOT be random. Each distractor should target a common student misconception related to the skill. For example, if the skill is calculating area (length × width), a distractor could be the result of calculating perimeter (2 × (length + width)).
  4.  **Preserve Image References:** If the source question contains \`<img ... />\` tags, you MUST reuse the exact same \`src\` attribute in your generated variations. Do NOT attempt to create or find new images.
  5.  **Maintain QTI Structure:** The generated XML for each variation MUST follow the same basic structure as the source (e.g., \`qti-choice-interaction\`, \`qti-text-entry-interaction\`), unless a structural change is a valid way to create a variation.
  6.  **Preserve Feedback Structure:** If the source item includes \`<qti-feedback-inline>\` for each choice, your variations MUST also include a unique and relevant \`<qti-feedback-inline>\` for every single choice. The feedback should be appropriate to the new context and explain why each answer is correct or incorrect.
  7.  **Absolute XML Well-Formedness:** This is your highest priority. Every generated XML string MUST be perfectly well-formed.
      *   Every opened tag must have a corresponding full closing tag (e.g., \`<p>\` requires \`</p>\`).
      *   Lazy closing tags like \`</>\` or \`</_>\` are STRICTLY FORBIDDEN and will cause a critical failure.
      *   Ensure all attribute values are correctly quoted.
      *   Escape special characters in text content (e.g., use \`&lt;\` for \`<\`).
  8.  **Unique Identifiers:** Each generated \`<qti-assessment-item>\` MUST have a new, unique \`identifier\` attribute (e.g., "generated-item-1", "generated-item-2"). Do NOT reuse the source identifier.
  9.  **Strict JSON Output:** The final output MUST be a single JSON object with the specified structure. Do not add any explanatory text, markdown, or anything outside of this JSON object.
</instructions_and_constraints>

<examples>
  # Positive Examples

  <positive_example>
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
      1.  **Analyze Skill:** The source question tests the calculation of the area of a rectangle (length × width). The numbers are 8 and 5. The correct answer is 8 * 5 = 40.
      2.  **Identify Misconceptions:**
          *   Distractor 'ChoiceB' (26 cm²) comes from the perimeter formula: 2 * (8 + 5) = 26. This is a classic area vs. perimeter confusion.
          *   Distractor 'ChoiceC' (13 cm) comes from simply adding the length and width: 8 + 5 = 13. This also has incorrect units.
      3.  **Plan Variation:** I will create one new question.
          *   **New Scenario:** A rectangular field.
          *   **New Numbers:** Length = 12 meters, Width = 10 meters.
          *   **Correct Answer:** 12 * 10 = 120 m².
          *   **New Distractors based on Misconceptions:**
              *   Perimeter: 2 * (12 + 10) = 44 m².
              *   Addition: 12 + 10 = 22 m (incorrect units).
              *   Magnitude Error: 12 * 100 = 1200 m² (common mistake with powers of 10).
      4.  **Construct XML:** I will build a new, complete \`<qti-assessment-item>\` XML.
          *   Update the \`identifier\` to "generated-item-1".
          *   Update the \`title\`.
          *   Update the prompt text with the new scenario and numbers.
          *   Create new \`<qti-simple-choice>\` elements for the new correct answer and distractors.
          *   Update the \`<qti-correct-response>\` to point to the new correct choice's identifier.
          *   Ensure every tag is correctly opened and closed.
          *   Wrap the final array of XML strings in the required JSON object structure.
    </thinking>
    <answer>
      {
        "differentiatedQuestions": [
          "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\\n<qti-assessment-item xmlns=\\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\\" xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xsi:schemaLocation=\\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\\" identifier=\\"generated-item-1\\" title=\\"Area of a Larger Rectangle\\" adaptive=\\"false\\" time-dependent=\\"false\\">\\n  <qti-response-declaration identifier=\\"RESPONSE\\" cardinality=\\"single\\" base-type=\\"identifier\\">\\n    <qti-correct-response><qti-value>ChoiceC</qti-value></qti-correct-response>\\n  </qti-response-declaration>\\n  <qti-outcome-declaration identifier=\\"SCORE\\" cardinality=\\"single\\" base-type=\\"float\\">\\n    <qti-default-value><qti-value>0.0</qti-value></qti-default-value>\\n  </qti-outcome-declaration>\\n  <qti-item-body>\\n    <p>What is the area of a rectangular field with a length of 12 meters and a width of 10 meters?</p>\\n    <qti-choice-interaction response-identifier=\\"RESPONSE\\" shuffle=\\"true\\" max-choices=\\"1\\">\\n      <qti-simple-choice identifier=\\"ChoiceA\\">44 m²</qti-simple-choice>\\n      <qti-simple-choice identifier=\\"ChoiceB\\">22 m</qti-simple-choice>\\n      <qti-simple-choice identifier=\\"ChoiceC\\">120 m²</qti-simple-choice>\\n      <qti-simple-choice identifier=\\"ChoiceD\\">1200 m²</qti-simple-choice>\\n    </qti-choice-interaction>\\n  </qti-item-body>\\n  <qti-response-processing template=\\"http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct\\"/>\\n</qti-assessment-item>"
        ]
      }
    </answer>
  </positive_example>
</examples>

<thinking>
  <!-- My detailed plan for the live request will go here, following the example's thought process. -->
</thinking>
`
	return { developer, user }
}
