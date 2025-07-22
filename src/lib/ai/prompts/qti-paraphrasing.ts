export function produceQtiParaphrasingPrompt(sourceQtiXml: string): { developer: string; user: string } {
	const developer =
		"You are an expert QTI 3.0 assessment stimulus author, specializing in paraphrasing educational content while preserving its structural and semantic integrity. Your generated XML is always perfectly-formed and adheres to all specified constraints."

	const user = `
<task_definition>
  # Task
  Your task is to generate a single, high-quality, paraphrased version of the provided QTI 3.0 assessment stimulus. The new version must be a complete, valid QTI XML document. The goal is to create a new article with unique wording that is not a direct copy, while retaining the original educational meaning, title, and all images.
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
  2.  **Paraphrase Textual Content:** You MUST rewrite and rephrase all other textual content inside the \`<qti-stimulus-body>\`. This includes text within tags like \`<p>\`, \`<h1>\`, \`<h2>\`, \`<li>\`, \`<strong>\`, \`<em>\`, etc. The new wording should be substantially different to avoid copyright issues, but the educational meaning, key concepts, and terminology must be preserved.
  3.  **Maintain XML Structure:** The entire XML structure, including all tags (except for their textual content), nesting, and attributes (like those in MathML \`<math>\` tags), MUST be perfectly preserved.
  4.  **Absolute XML Well-Formedness:** This is your highest priority. Every generated XML string MUST be perfectly well-formed.
      *   Every opened tag must have a corresponding full closing tag (e.g., \`<p>\` requires \`</p>\`).
      *   Lazy closing tags like \`</>\` or \`</_>\` are STRICTLY FORBIDDEN and will cause a critical failure.
      *   Ensure all attribute values are correctly quoted.
      *   Escape special characters in text content (e.g., use \`&lt;\` for \`<\`).
  5.  **Do Not Change the Identifier:** The \`identifier\` attribute of the root \`<qti-assessment-stimulus>\` tag MUST remain unchanged.
  6.  **Strict JSON Output:** The final output MUST be a single JSON object with the specified structure. Do not add any explanatory text, markdown, or anything outside of this JSON object.
</instructions_and_constraints>

<examples>
  # Positive Example
  <positive_example>
    <example_inputs>
      <source_qti_xml>
        <![CDATA[
          <?xml version="1.0" encoding="UTF-8"?>
          <qti-assessment-stimulus xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
            identifier="stimulus-supply-demand-intro" title="Introduction to Supply and Demand">
            <qti-stimulus-body>
              <h1>What are supply and demand?</h1>
              <p>In economics, supply and demand is a model that explains how prices are formed in a market. The model predicts that in a competitive market, the price of a good will function to equalize the quantity demanded by consumers and the quantity supplied by producers, resulting in an economic equilibrium of price and quantity.</p>
              <img src="https://cdn.example.com/supply_demand_graph.png" alt="A standard supply and demand graph showing the equilibrium point." width="400" height="300"/>
              <p>The two key factors are the law of demand, which states that prices and quantity demanded are inversely related, and the law of supply, which states that prices and quantity supplied are directly related.</p>
            </qti-stimulus-body>
          </qti-assessment-stimulus>
        ]]>
      </source_qti_xml>
    </example_inputs>
    <thinking>
      1.  **Analyze Task:** The goal is to paraphrase the text content of the provided QTI stimulus XML while preserving its core structure, title, identifier, and images.
      2.  **Identify Elements to Preserve:**
          *   Root tag: \`<qti-assessment-stimulus ...>\`
          *   Identifier: \`identifier="stimulus-supply-demand-intro"\`
          *   Title: \`title="Introduction to Supply and Demand"\`
          *   Image tag: The entire \`<img ... />\` tag must be copied verbatim.
          *   XML structure: The \`<h1>\` followed by two \`<p>\` tags, with the image in between, must be maintained.
      3.  **Identify Content to Paraphrase:**
          *   The text inside the \`<h1>\`: "What are supply and demand?"
          *   The text inside the first \`<p>\`: "In economics, supply and demand is a model..."
          *   The text inside the second \`<p>\`: "The two key factors are the law of demand..."
      4.  **Paraphrase Content Section-by-Section:**
          *   Rewrite \`<h1>\`: "Understanding the concepts of supply and demand"
          *   Rewrite first \`<p>\`: "The supply and demand model is a fundamental concept in economics used to describe the determination of prices. According to this model, within a competitive marketplace, a product's price will adjust to a point where the amount consumers wish to purchase matches the amount producers are willing to sell. This balance point is known as the economic equilibrium."
          *   Rewrite second \`<p>\`: "This equilibrium is governed by two principles: the law of demand, where higher prices lead to lower consumer demand, and the law of supply, where higher prices encourage producers to supply more."
      5.  **Construct Final XML:** Assemble the preserved elements and the new, paraphrased text into a single, well-formed XML string. Ensure all tags are correctly closed. The final output must be wrapped in the specified JSON structure.
    </thinking>
    <answer>
      {
        "paraphrasedStimulus": "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\n<qti-assessment-stimulus xmlns=\\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\\" identifier=\\"stimulus-supply-demand-intro\\" title=\\"Introduction to Supply and Demand\\">\n  <qti-stimulus-body>\n    <h1>Understanding the concepts of supply and demand</h1>\n    <p>The supply and demand model is a fundamental concept in economics used to describe the determination of prices. According to this model, within a competitive marketplace, a product's price will adjust to a point where the amount consumers wish to purchase matches the amount producers are willing to sell. This balance point is known as the economic equilibrium.</p>\n    <img src=\\"https://cdn.example.com/supply_demand_graph.png\\" alt=\\"A standard supply and demand graph showing the equilibrium point.\\" width=\\"400\\" height=\\"300\\"/>\n    <p>This equilibrium is governed by two principles: the law of demand, where higher prices lead to lower consumer demand, and the law of supply, where higher prices encourage producers to supply more.</p>\n  </qti-stimulus-body>\n</qti-assessment-stimulus>"
      }
    </answer>
  </positive_example>

  # Negative Example
  <negative_example>
    <example_inputs>
       <source_qti_xml>
        <![CDATA[
          <?xml version="1.0" encoding="UTF-8"?>
          <qti-assessment-stimulus xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
            identifier="stimulus-supply-demand-intro" title="Introduction to Supply and Demand">
            <qti-stimulus-body>
              <h1>What are supply and demand?</h1>
              <p>In economics, supply and demand is a model that explains how prices are formed in a market. The model predicts that in a competitive market, the price of a good will function to equalize the quantity demanded by consumers and the quantity supplied by producers, resulting in an economic equilibrium of price and quantity.</p>
              <img src="https://cdn.example.com/supply_demand_graph.png" alt="A standard supply and demand graph showing the equilibrium point." width="400" height="300"/>
              <p>The two key factors are the law of demand, which states that prices and quantity demanded are inversely related, and the law of supply, which states that prices and quantity supplied are directly related.</p>
            </qti-stimulus-body>
          </qti-assessment-stimulus>
        ]]>
      </source_qti_xml>
    </example_inputs>
    <thinking>
      1.  **Analyze Task:** I need to paraphrase the stimulus.
      2.  **Identify Elements to Preserve:** I will keep the identifier and the image.
      3.  **Identify Content to Change:** I will change the title to be more engaging and rewrite the paragraphs.
      4.  **Paraphrase Content:**
          *   Change \`title\` to "The Basics of Market Prices". **<-- THIS IS A VIOLATION.**
          *   Rewrite \`<h1>\`: "Exploring Supply and Demand"
          *   Rewrite first \`<p>\`: "The model of supply and demand in economics shows how market prices get set. It says that in a competitive market, a good's price balances what consumers want and what producers make, creating an equilibrium."
          *   Rewrite second \`<p>\`: "Two main rules are at play: the law of demand (price up, demand down) and the law of supply (price up, supply up)."
      5.  **Construct Final XML:** Assemble the new content. I will also forget to close the last paragraph tag to save space. **<-- THIS IS A VIOLATION.**
    </thinking>
    <answer>
      {
        "paraphrasedStimulus": "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\n<qti-assessment-stimulus xmlns=\\"http://www.imsglobal.org/xsd/imsqtiasi_v3p0\\" identifier=\\"stimulus-supply-demand-intro\\" title=\\"The Basics of Market Prices\\">\n  <qti-stimulus-body>\n    <h1>Exploring Supply and Demand</h1>\n    <p>The model of supply and demand in economics shows how market prices get set. It says that in a competitive market, a good's price balances what consumers want and what producers make, creating an equilibrium.</p>\n    <img src=\\"https://cdn.example.com/supply_demand_graph.png\\" alt=\\"A standard supply and demand graph showing the equilibrium point.\\" width=\\"400\\" height=\\"300\\"/>\n    <p>Two main rules are at play: the law of demand (price up, demand down) and the law of supply (price up, supply up).\n  </qti-stimulus-body>\n</qti-assessment-stimulus>"
      }
    </answer>
    <reason_for_failure>
      The negative example is incorrect for two critical reasons:
      1.  **VIOLATION:** The \`title\` attribute of the root element was changed from "Introduction to Supply and Demand" to "The Basics of Market Prices". The title MUST NOT be changed.
      2.  **VIOLATION:** The final \`<p>\` tag was not closed. The XML is not well-formed. Every tag must have a full, explicit closing tag.
    </reason_for_failure>
  </negative_example>
</examples>

<thinking>
  <!-- My detailed plan for the live request will go here, following the example's thought process. I will identify what to preserve, what to paraphrase, and then construct the final, well-formed XML. -->
</thinking>
`
	return { developer, user }
}
