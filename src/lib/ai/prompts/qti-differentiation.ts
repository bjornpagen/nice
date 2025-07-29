export function produceQtiVariationsPrompt(
	sourceQtiXml: string,
	numberOfVariations: number,
	khanId: string,
	startingIndex = 1
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
  
  ## ⚠️ CRITICAL: Structure Preservation Rules
  4. **NEVER Modify QTI XML Structure:** The QTI XML structure (tags, attributes, nesting, organization) MUST remain exactly the same as the source. You may ONLY change:
     - Text content within tags
     - Numbers and values
     - Choice identifiers and content
     - Image sources (following image rules below, including converting external CDN URLs to inline content)
     - Mathematical expressions within existing math tags
  5. **Forbidden Structure Changes:** You MUST NOT add, remove, or rearrange:
     - QTI tags (qti-choice-interaction, qti-simple-choice, etc.)
     - XML attributes or namespaces
     - Response declarations or outcome declarations
     - Feedback blocks or processing templates
     - The overall XML hierarchy and nesting

  ## Image Handling Rules
  6. **External CDN Image References:** If the source contains external image URLs (especially Khan Academy CDN links like "https://cdn.kastatic.org/ka-perseus-graphie/*.svg" or "https://cdn.kastatic.org/*.png"), you MUST either:
     - **Option A:** Remove the image entirely and replace with descriptive text that captures the visual information needed for the question
     - **Option B:** Create a simple, self-contained inline SVG using data:image/svg+xml encoding that represents the essential visual elements
     - **Never keep external URL references** - all images must be either removed or converted to inline content
     - **CRITICAL: Never reveal the answer** - descriptive text must provide enough context for students to solve the problem but MUST NOT contain, hint at, or make obvious the correct answer
     - Ensure any replacement preserves the educational value and accessibility of the visual information
  7. **PNG Image Replacement:** If the source contains PNG images (<img src="*.png" />), you SHOULD replace them with appropriate emojis or Unicode symbols that match the new content context. For example:
     - Science concepts: use 🔬, ⚗️, 🧪, 🧬, ⚡, 🌍, 🌊, 🌟
     - General objects: use relevant emojis (🍎 for apple, 🏠 for house, 🚗 for car, etc.)
     - Replace the entire <img> tag with the emoji/symbol directly in the text
  8. **SVG Image Editing:** If the source contains SVG images, you MUST modify the SVG content to match your new question variation while keeping the same SVG structure:
     - Update text labels within SVG to match new context
     - Modify numbers, dimensions, or values shown in the SVG
     - Change colors, shapes, or diagram elements as needed for the new scenario
     - Ensure the SVG remains valid and well-formed XML
  9. **Image Content Alignment:** All image replacements or edits MUST align perfectly with the new question content and context.

  ## Quality Assurance Rules
  9. **Preserve Feedback Structure:** If the source includes <qti-feedback-inline> for choices, provide unique, relevant feedback for every choice in variations, explaining correctness or errors in the new context.
  10. **Absolute XML Well-Formedness:** Prioritize perfect XML: Open tags must have matching closing tags, attributes quoted, special characters escaped (e.g., &lt; for <).
  11. **Unique Identifiers:** For each variation, assign a unique identifier in this exact format: "nice:${khanId}:XXXX" where XXXX is a 4-digit number starting from ${String(startingIndex).padStart(4, "0")} (e.g., "nice:${khanId}:${String(startingIndex).padStart(4, "0")}", "nice:${khanId}:${String(startingIndex + 1).padStart(4, "0")}", etc.).
  12. **Strict JSON Output:** Output only the specified JSON object without extra text.
</instructions_and_constraints>

<thinking_instructions>
  # Reasoning Process
  For each variation, reason step-by-step in <thinking> tags before generating:
  1. Analyze core skill and misconceptions.
  2. Plan distinct variation (new elements, distractors).
  3. Identify any images that need replacement/editing and plan appropriate substitutions:
     - Check for external CDN URLs (especially Khan Academy links) and plan removal or inline SVG replacement
     - Ensure descriptive text replacements provide context without revealing the answer
     - Plan PNG-to-emoji replacements
     - Plan SVG content modifications
  4. Verify structure preservation, feedback alignment, and XML validity.
  Generate 2-3 reasoning paths if needed and select the most consistent. After all variations, critique in <self_review> tags: Check XML validity, skill alignment, distinctness, structure preservation, image handling, and ensure no descriptive text reveals answers. Refine if issues found (but output only final JSON).
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
      4. **Structure Check:** Same XML structure, only changing text content and numbers.
      5. **Construct XML:** New identifier "nice:${khanId}:0001", update title/prompt/choices/correct-response. Ensure tags match exactly.
    </thinking>
    <answer>
      {
        "differentiatedQuestions": [
          "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\\n<qti-assessment-item xmlns=\\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\\" xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xsi:schemaLocation=\\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0_v1p0.xsd\\" identifier=\\"nice:${khanId}:0001\\" title=\\"Area of a Rectangular Field\\" adaptive=\\"false\\" time-dependent=\\"false\\">\\n  <qti-response-declaration identifier=\\"RESPONSE\\" cardinality=\\"single\\" base-type=\\"identifier\\">\\n    <qti-correct-response><qti-value>ChoiceA</qti-value></qti-correct-response>\\n  </qti-response-declaration>\\n  <qti-outcome-declaration identifier=\\"SCORE\\" cardinality=\\"single\\" base-type=\\"float\\">\\n    <qti-default-value><qti-value>0.0</qti-value></qti-default-value>\\n  </qti-outcome-declaration>\\n  <qti-item-body>\\n    <p>A rectangular field has a length of 12 meters and a width of 10 meters. What is its area?</p>\\n    <qti-choice-interaction response-identifier=\\"RESPONSE\\" shuffle=\\"false\\" max-choices=\\"1\\">\\n      <qti-simple-choice identifier=\\"ChoiceA\\">120 m²</qti-simple-choice>\\n      <qti-simple-choice identifier=\\"ChoiceB\\">44 m²</qti-simple-choice>\\n      <qti-simple-choice identifier=\\"ChoiceC\\">22 m</qti-simple-choice>\\n    </qti-choice-interaction>\\n  </qti-item-body>\\n  <qti-response-processing template=\\"http://www.imsglobal.org/question/qti_v3p0/rptemplates/match_correct\\"/>\\n</qti-assessment-item>"
        ]
      }
    </answer>
  </positive_example>

  <positive_example index="2">
    <example_inputs>
      <main_example_input>
        <source_qti_xml>
          <![CDATA[
            <?xml version="1.0" encoding="UTF-8"?>
            <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="counting-apples" title="Counting Apples">
              <qti-item-body>
                <p>Look at the picture: <img src="apple-basket.png" alt="basket of apples" /> How many apples are there?</p>
                <qti-choice-interaction response-identifier="RESPONSE">
                  <qti-simple-choice identifier="A">5 apples</qti-simple-choice>
                  <qti-simple-choice identifier="B">7 apples</qti-simple-choice>
                </qti-choice-interaction>
              </qti-item-body>
            </qti-assessment-item>
          ]]>
        </source_qti_xml>
      </main_example_input>
    </example_inputs>
    <thinking>
      1. **Analyze Skill:** Counting objects. Source uses apple image.
      2. **Image Replacement:** PNG image should be replaced with emoji. "apple-basket.png" → use 🍎 emojis to show countable apples.
      3. **Plan Variation:** Change to counting oranges with 🍊 emojis, different quantities.
      4. **Structure Preservation:** Keep exact same XML structure, only change text content and replace img tag with emojis.
    </thinking>
    <answer>
      {
        "differentiatedQuestions": [
          "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\\n<qti-assessment-item xmlns=\\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\\" identifier=\\"nice:${khanId}:0001\\" title=\\"Counting Oranges\\">\\n  <qti-item-body>\\n    <p>Look at the oranges: 🍊🍊🍊🍊🍊🍊 How many oranges are there?</p>\\n    <qti-choice-interaction response-identifier=\\"RESPONSE\\">\\n      <qti-simple-choice identifier=\\"A\\">6 oranges</qti-simple-choice>\\n      <qti-simple-choice identifier=\\"B\\">8 oranges</qti-simple-choice>\\n    </qti-choice-interaction>\\n  </qti-item-body>\\n</qti-assessment-item>"
        ]
      }
    </answer>
  </positive_example>

  <positive_example index="3">
    <example_inputs>
      <main_example_input>
        <source_qti_xml>
          <?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
    identifier="nice:x63fb91da26c0313c:0004"
    title="Identify the Missing Jersey Number"
    time-dependent="false"
    xml:lang="en-US">

    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
        <qti-correct-response>
            <qti-value>43</qti-value>
        </qti-correct-response>
    </qti-response-declaration>

    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
        <qti-default-value>
            <qti-value>0</qti-value>
        </qti-default-value>
    </qti-outcome-declaration>
    <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier"/>

    <qti-item-body>
        <qti-prompt>Which jersey number is missing from the team lineup?</qti-prompt>
        <div id="reference_text">
            <img src="data:image/svg+xml,%3Csvg%20width%3D%22320%22%20height%3D%22220%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%0A%20%20%3Cdefs%3E%0A%20%20%20%20%3Cstyle%3E%0A%20%20%20%20%20%20.jersey-box%20%7B%0A%20%20%20%20%20%20%20%20fill%3A%20%23ffffff%3B%0A%20%20%20%20%20%20%20%20stroke%3A%20%23000000%3B%0A%20%20%20%20%20%20%20%20stroke-width%3A%202%3B%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%20%20.jersey-number%20%7B%0A%20%20%20%20%20%20%20%20font-family%3A%20Arial%2C%20sans-serif%3B%0A%20%20%20%20%20%20%20%20font-size%3A%2048px%3B%0A%20%20%20%20%20%20%20%20text-anchor%3A%20middle%3B%0A%20%20%20%20%20%20%20%20dominant-baseline%3A%20middle%3B%0A%20%20%20%20%20%20%7D%0A%20%20%20%20%3C/style%3E%0A%20%20%3C/defs%3E%0A%0A%20%20%3C!--%20Row%201%20--%3E%0A%20%20%3Cg%3E%0A%20%20%20%20%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%22100%22%20height%3D%22100%22%20class%3D%22jersey-box%22%20/%3E%0A%20%20%20%20%3Ctext%20x%3D%2260%22%20y%3D%2260%22%20class%3D%22jersey-number%22%3E40%3C/text%3E%0A%20%20%3C/g%3E%0A%20%20%3Cg%3E%0A%20%20%20%20%3Crect%20x%3D%22110%22%20y%3D%2210%22%20width%3D%22100%22%20height%3D%22100%22%20class%3D%22jersey-box%22%20/%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%2260%22%20class%3D%22jersey-number%22%3E41%3C/text%3E%0A%20%20%3C/g%3E%0A%20%20%3Cg%3E%0A%20%20%20%20%3Crect%20x%3D%22210%22%20y%3D%2210%22%20width%3D%22100%22%20height%3D%22100%22%20class%3D%22jersey-box%22%20/%3E%0A%20%20%20%20%3Ctext%20x%3D%22260%22%20y%3D%2260%22%20class%3D%22jersey-number%22%3E42%3C/text%3E%0A%20%20%3C/g%3E%0A%0A%20%20%3C!--%20Row%202%20--%3E%0A%20%20%3Cg%3E%0A%20%20%20%20%3Crect%20x%3D%2210%22%20y%3D%22110%22%20width%3D%22100%22%20height%3D%22100%22%20class%3D%22jersey-box%22%20/%3E%0A%20%20%20%20%3Crect%20x%3D%2260%22%20y%3D%22160%22%20class%3D%22jersey-number%22%20/%3E%0A%20%20%3C/g%3E%0A%20%20%3Cg%3E%0A%20%20%20%20%3Crect%20x%3D%22110%22%20y%3D%22110%22%20width%3D%22100%22%20height%3D%22100%22%20class%3D%22jersey-box%22%20/%3E%0A%20%20%20%20%3Ctext%20x%3D%22160%22%20y%3D%22160%22%20class%3D%22jersey-number%22%3E44%3C/text%3E%0A%20%20%3C/g%3E%0A%20%20%3Cg%3E%0A%20%20%20%20%3Crect%20x%3D%22210%22%20y%3D%22110%22%20width%3D%22100%22%20height%3D%22100%22%20class%3D%22jersey-box%22%20/%3E%0A%20%20%20%20%3Ctext%20x%3D%22260%22%20y%3D%22160%22%20class%3D%22jersey-number%22%3E45%3C/text%3E%0A%20%20%3C/g%3E%0A%3C/svg%3E" alt="A grid of jersey numbers from 40 to 45 with the box for number 43 left blank." width="400" height="300"/>
            <p><span class="qti-italic">Note: The lineup shows jersey numbers in order, except one missing number between 42 and 44.</span></p>
        </div>
        <p>
            <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/>
        </p>

        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
            <p><span class="qti-keyword-emphasis">Correct!</span> The missing jersey number is 43.</p>
        </qti-feedback-block>
        <qti-feedback-block outcome-identifier="FEEDBACK" identifier="INCORRECT" show-hide="show">
            <p><span class="qti-keyword-emphasis">Not quite.</span> Look closely at the sequence; after 42, the next number should be 43.</p>
        </qti-feedback-block>
    </qti-item-body>

    <qti-response-processing>
        <qti-response-condition>
            <qti-response-if>
                <qti-match>
                    <qti-variable identifier="RESPONSE"/>
                    <qti-correct identifier="RESPONSE"/>
                </qti-match>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">1</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">CORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE">
                    <qti-base-value base-type="float">0</qti-base-value>
                </qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK">
                    <qti-base-value base-type="identifier">INCORRECT</qti-base-value>
                </qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>

</qti-assessment-item>
        </source_qti_xml>
      </main_example_input>
    </example_inputs>
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
      This example demonstrates several anti-patterns: excessive MathML usage for simple numbers that could be plain text, overly complex feedback structure with both inline and block feedback, inconsistent identifier patterns (using single letters vs descriptive names), and missing context about what number Olaf started from (365 is referenced but not established). When creating variations, you must preserve ALL structural elements exactly as they appear in the source, including the complex MathML tags, all feedback blocks, and the specific identifier patterns. Do not simplify the structure - only change the content within the existing structure.
    </why_this_is_bad>
  </negative_example>
</examples>

<thinking>
  <!-- Your detailed plan for the live request, following the thinking instructions. -->
</thinking>
`
	return { developer, user }
}
