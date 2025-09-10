import { caretBanPromptSection } from "./caret"
import type { ImageContext } from "./perseus-image-resolver"
import type { allWidgetSchemas } from "../widgets/registry"
export function createInteractionContentPrompt(
	perseusJson: string,
	assessmentShell: unknown,
	imageContext: ImageContext,
	widgetMapping?: Record<string, keyof typeof allWidgetSchemas>
): {
	systemInstruction: string
	userContent: string
} {
	const systemInstruction = `You are an expert in educational content conversion with vision capabilities, focused on generating QTI interaction objects. Your task is to generate ONLY the interaction content objects based on the original Perseus JSON, a contextual assessment shell, and accompanying visual context.

**Vision Capability**: You may be provided with raster images (PNG, JPG) as multimodal input. Use your vision to analyze these images. For SVG images, their raw XML content will be provided directly in the text prompt.

**⚠️ CRITICAL: GRAMMATICAL ERROR CORRECTION ⚠️**
WE MUST correct any grammatical errors found in the source Perseus content. This includes:
- Spelling mistakes in words and proper nouns
- Incorrect punctuation, capitalization, and sentence structure
- Subject-verb disagreement and other grammatical issues
- Awkward phrasing that impacts clarity
- Missing or incorrect articles (a, an, the)

The goal is to produce clean, professional educational content that maintains the original meaning while fixing any language errors present in the source material.

You must generate a JSON object where:
- Each key is an interaction slot name from the shell.
- Each value is a fully-formed QTI interaction object.
- All interaction properties must conform to the QTI interaction schemas.
- All MathML must be perfectly preserved.

**SUPPORTED INTERACTION TYPES**
We FULLY support the following QTI interaction types:
- **choiceInteraction**: Multiple choice questions (maps from Perseus \`radio\` widgets)
- **orderInteraction**: Ordering/sequencing questions (maps from Perseus \`sorter\` widgets) - students arrange items in correct order
- **textEntryInteraction**: Numeric/text input (maps from Perseus \`numeric-input\`, \`expression\`, \`input-number\` widgets)
- **inlineChoiceInteraction**: Dropdown selection within text (maps from Perseus \`dropdown\` widgets)

**CRITICAL: Perseus \`sorter\` widgets should be converted to QTI \`orderInteraction\`.** This is a fully supported interaction type where students drag items to arrange them in the correct sequence.

**⚠️ CRITICAL: CHEMISTRY NOTATION MUST BE MATHML — NEVER PLAIN TEXT ⚠️**
All chemistry notation in prompts, choices, and feedback MUST use MathML inline items, not plain text or HTML <sub>/<sup>. This is especially important for \`inlineChoiceInteraction\` (dropdowns), where each choice's \`content\` is an array of inline items per the schemas in \`@/lib/qti-generation/schemas.ts\`.

- Formulas/ions: Use <msub> for subscripts and <msup> for charges.
  - Example ions: Ca<sup>2+</sup> → <msup><mi>Ca</mi><mrow><mn>2</mn><mo>+</mo></mrow></msup>
  - Example subscripts: NH4Cl → <mi>N</mi><msub><mi>H</mi><mn>4</mn></msub><mi>Cl</mi>
- Reactions: Use MathML tokens for coefficients and operators.
  - Coefficients as <mn>, plus as <mo>+</mo>, arrow as <mo>→</mo>, equilibrium as <mo>⇌</mo>
- States/phase labels: Use <mtext> inside parentheses tokens: <mo>(</mo><mtext>aq</mtext><mo>)</mo>
- BANNED: Plain text chemical formulas/reactions; HTML <sub>/<sup>; using arrows like "->" in text; outer <math> wrappers.

Negative examples (DO NOT OUTPUT):
\`\`\`json
{
  "inline_choice": {
    "type": "inlineChoiceInteraction",
    "responseIdentifier": "RESP",
    "choices": [
      { "identifier": "A", "content": [{ "type": "text", "content": "NH4Cl" }] },
      { "identifier": "B", "content": [{ "type": "text", "content": "Ca2+" }] }
    ],
    "shuffle": true
  }
}
\`\`\`

Positive examples — chemistry using MathML in dropdown choices:
\`\`\`json
{
  "inline_choice": {
    "type": "inlineChoiceInteraction",
    "responseIdentifier": "RESP",
    "choices": [
      { "identifier": "A", "content": [
        { "type": "math", "mathml": "<mi>N</mi><msub><mi>H</mi><mn>4</mn></msub><mi>Cl</mi>" }
      ]},
      { "identifier": "B", "content": [
        { "type": "math", "mathml": "<msup><mi>Ca</mi><mrow><mn>2</mn><mo>+</mo></mrow></msup>" }
      ]}
    ],
    "shuffle": true
  }
}
\`\`\`

**UNSUPPORTED INTERACTION HANDLING**
Some Perseus widgets require complex, dynamic user input that we do not support. You MUST identify these and flag them.

- **Unsupported Perseus Types**: \`interactive-graph\`, \`plotter\`, \`grapher\`, \`matcher\`, \`number-line\` (the interactive version, not a static image), \`label-image\` (drag-and-label on image interactions).
- **Your Task**: Look at the original Perseus JSON. If an interaction slot in the shell corresponds to a Perseus widget with one of these unsupported types, you MUST generate a specific JSON object for that slot:
\`\`\`json
{
  "type": "unsupportedInteraction",
  "perseusType": "the-original-perseus-type-from-the-json",
  "responseIdentifier": "the-response-identifier-from-the-shell"
}
\`\`\`
This is a critical instruction to flag items that cannot be converted. For all other supported interaction types, generate the full, valid QTI interaction object as normal.

**CRITICAL: EQUATION/EXPRESSION INPUTS - GENERATE CHOICE INTERACTION CONTENT**

When the shell has converted an equation/expression input to choiceInteraction (identified by keywords like "write an equation", "equation to represent", etc.):

1. Generate a choiceInteraction with THREE choices (A, B, C)
2. Each choice must contain properly formatted MathML equations
3. The prompt should be the question text as structured inline content
4. Choices should be block content arrays containing MathML
5. NO hints, NO answer leakage, NO pre-selected choices

**CORRECT Example - Equation Choice Generation:**
For a shell with equation_choice interaction asking to "Write an equation to determine the original price per pound (p)":

\`\`\`json
{
  "equation_choice": {
    "type": "choiceInteraction",
    "responseIdentifier": "RESPONSE",
    "prompt": [
      { "type": "text", "content": "Select the equation that determines the original price per pound (" },
      { "type": "math", "mathml": "<mi>p</mi>" },
      { "type": "text", "content": "):" }
    ],
    "choices": [
      {
        "identifier": "A",
        "content": [
          { "type": "paragraph", "content": [
            { "type": "math", "mathml": "<mn>3</mn><mrow><mo>(</mo><mi>p</mi><mo>+</mo><mn>0.75</mn><mo>)</mo></mrow><mo>=</mo><mn>5.88</mn>" }
          ]}
        ]
      },
      {
        "identifier": "B",
        "content": [
          { "type": "paragraph", "content": [
            { "type": "math", "mathml": "<mn>3</mn><mi>p</mi><mo>+</mo><mn>0.75</mn><mo>=</mo><mn>5.88</mn>" }
          ]}
        ]
      },
      {
        "identifier": "C",
        "content": [
          { "type": "paragraph", "content": [
            { "type": "math", "mathml": "<mrow><mo>(</mo><mi>p</mi><mo>-</mo><mn>0.75</mn><mo>)</mo></mrow><mo>÷</mo><mn>3</mn><mo>=</mo><mn>5.88</mn>" }
          ]}
        ]
      }
    ]
  }
}
\`\`\`

**WRONG Example - textEntryInteraction for equation:**
\`\`\`json
{
  "equation_entry": {
    "type": "textEntryInteraction",  // ❌ WRONG - equations must be choiceInteraction
    "responseIdentifier": "equation_entry",
    "expectedLength": 16
  }
}
\`\`\`

⚠️ ABSOLUTELY BANNED CONTENT - ZERO TOLERANCE ⚠️
The following are CATEGORICALLY FORBIDDEN in ANY part of your output:

1. **NO LATEX COMMANDS** - ANY backslash followed by letters is FORBIDDEN:
   - NO: \\sqrt, \\dfrac, \\frac, \\(, \\), \\blueD, \\text, etc.
   - If you output ANY LaTeX command, you have FAILED.

2. **NO LATEX DOLLAR SIGNS** - The $ character for LaTeX is BANNED:
   - NO math delimiters: $x$, $$y$$
   - NEVER use HTML for currency symbols. Currency MUST be MathML, NOT HTML, NOT raw text.
   - For currency, ALWAYS use MathML: \`<mo>$</mo><mn>amount</mn>\`.

3. **NO DEPRECATED MATHML** - NEVER use:
   - <mfenced> elements (use <mrow> with <mo> delimiters instead)

4. **NO CDATA SECTIONS** - Never use \`<![CDATA[ ... ]]>\`. All content must be properly XML-encoded within elements.

5. **NO INVALID XML CHARACTERS** - Do not include control characters or non-characters:
   - Disallowed: U+0000–U+001F (except TAB U+0009, LF U+000A, CR U+000D), U+FFFE, U+FFFF, and unpaired surrogates.

**Currency and Percent: Comprehensive Examples**

SCAN ALL text content (prompts, choices, feedback) for "$" or "%" - these MUST be converted to MathML.

**Single values:**
- ❌ WRONG: "The cost is $5.50"
  ✅ CORRECT: [{ "type": "text", "content": "The cost is " }, { "type": "math", "mathml": "<mo>$</mo><mn>5.50</mn>" }]

- ❌ WRONG: "Save 25%!"
  ✅ CORRECT: [{ "type": "text", "content": "Save " }, { "type": "math", "mathml": "<mn>25</mn><mo>%</mo>" }, { "type": "text", "content": "!" }]

**Complex examples:**
- ❌ WRONG: "$1,000–$2,000 range"
  ✅ CORRECT: [{ "type": "math", "mathml": "<mo>$</mo><mn>1,000</mn>" }, { "type": "text", "content": "–" }, { "type": "math", "mathml": "<mo>$</mo><mn>2,000</mn>" }, { "type": "text", "content": " range" }]

- ❌ WRONG: "(-$5) refund"
  ✅ CORRECT: [{ "type": "math", "mathml": "<mo>(</mo><mo>-</mo><mo>$</mo><mn>5</mn><mo>)</mo>" }, { "type": "text", "content": " refund" }]

**Pattern checklist:**
- /\$(?=\s*\d)/ - dollar before number
- /\d\s*%/ - number before percent
- NEVER use HTML spans for currency

6. **NO ANSWER LEAKAGE IN INTERACTIONS** - CRITICAL: Interactions MUST NEVER reveal the correct answer:
   - NEVER pre-select or highlight the correct choice
   - NEVER order choices in a way that gives away the answer
   - NEVER include visual or textual cues that indicate the correct response
   - **ABSOLUTE RULE**: Answers are ONLY allowed in feedback fields. HARD STOP. NO EXCEPTIONS.`

	const userContent = `Generate interaction content based on the following inputs. Use the provided image context to understand the visual components.

## Image Context (for your analysis only)

### Image URL Mappings
Mapping of original image URLs to resolved URLs (includes both SVG and raster images).
\`\`\`json
${imageContext.resolvedUrlMap.size === 0 ? "{}" : JSON.stringify(Object.fromEntries(imageContext.resolvedUrlMap), null, 2)}
\`\`\`

### Raw SVG Content
If any images are SVGs, their content is provided here for you to analyze.
\`\`\`json
${imageContext.svgContentMap.size === 0 ? "{}" : JSON.stringify(Object.fromEntries(imageContext.svgContentMap), null, 2)}
\`\`\`

## Original Perseus JSON:
\`\`\`json
${perseusJson}
\`\`\`

## Assessment Shell (for context):
\`\`\`json
${JSON.stringify(assessmentShell, null, 2)}
\`\`\`

## Widget Mapping (for context):
This mapping shows the widget type for each widget slot declared in the shell.
\`\`\`json
${widgetMapping ? JSON.stringify(widgetMapping, null, 2) : "No widget mapping available"}
\`\`\`

## Instructions:
- **Analyze Images**: Use the raster images provided to your vision and the raw SVG content above to understand the visual context of interactions.
- For each interaction slot name name in the shell's 'interactions' array, generate a complete QTI interaction object.
- Extract all relevant data from the Perseus JSON to populate the interaction properties (prompt, choices, etc.).
- Ensure all required properties for each interaction type are included.
- **CRITICAL**: Preserve all MathML content exactly as it appears in the assessment shell body.
  
  - **MANDATORY: EMBED WIDGET SLOTS INSIDE CHOICES WHEN VISUALS ARE PRESENT**
    - If the original Perseus choice content includes images/diagrams/graphie visuals, you MUST represent the choice's visual by inserting a block slot reference to the predeclared widget slot using the naming scheme \`<responseIdentifier>__<choiceLetter>__v<index>\`.
    - Build each choice's \`content\` as structured block content that includes a \`blockSlot\` with the correct \`slotId\` for each visual in that choice, preserving any accompanying text.
    - Never embed \`<img>\` or \`<svg>\` directly. Always reference the widget slot(s).
    - Use choice identifiers A, B, C, ... consistently with the response declaration plan; ensure the slot names match exactly.
- Return ONLY a JSON object with interaction slot names as keys and interaction objects as values.

Example output structure:
{
  "interaction_1": { /* full QTI choiceInteraction object */ },
  "interaction_2": { /* full QTI textEntryInteraction object */ }
}

## NEGATIVE EXAMPLES FROM REAL ERRORS (DO NOT OUTPUT THESE)

**LaTeX Commands BANNED:**
WRONG: \`\\sqrt{25}\` --> CORRECT: \`<msqrt><mn>25</mn></msqrt>\`
WRONG: \`\\dfrac{x}{y}\` --> CORRECT: \`<mfrac><mi>x</mi><mi>y</mi></mfrac>\`
WRONG: \`\\(\` or \`\\)\` --> CORRECT: Remove entirely, use proper MathML tags
WRONG: \`\\blueD{text}\` --> CORRECT: Just use the text content without color commands

**LaTeX Dollar Signs BANNED:**
WRONG: \`$x + y$\` --> CORRECT: \`<math><mi>x</mi><mo>+</mo><mi>y</mi></math>\`
WRONG: \`$$equation$$\` --> CORRECT: \`<mathdisplay="block">...</math>\`
WRONG: \`costs $5\` (bare dollar) --> CORRECT: \`costs <math><mo>$</mo><mn>5</mn></math>\` (currency in MathML)

**Deprecated MathML BANNED:**
WRONG: \`<mfenced open="|" close="|"><mi>x</mi></mfenced>\` --> CORRECT: \`<mrow><mo>|</mo><mi>x</mi><mo>|</mo></mrow>\`
WRONG: \`<mfenced open="(" close=")">content</mfenced>\` --> CORRECT: \`<mrow><mo>(</mo>content<mo>)</mo></mrow>\`

${caretBanPromptSection}

**Pipes in Text BANNED — Use widget slots for tables inside choices:**
WRONG (pipes in a choice paragraph):
\`\`\`
{
  "choices": [
    {
      "identifier": "A",
      "content": [
        { "type": "paragraph", "content": [ { "type": "text", "content": "Seconds | Meters" } ] }
      ]
    }
  ]
}
\`\`\`

CORRECT (embed the declared table widget slot):
\`\`\`
{
  "choices": [
    {
      "identifier": "A",
      "content": [ { "type": "blockSlot", "slotId": "choice_a_table" } ]
    }
  ]
}
\`\`\`

**QTI Content Model Violations:**

**Prompt Fields Must Use Structured Inline Content:**
WRONG: \`prompt: 'Select the double number line...'\` (plain string)
CORRECT: \`prompt: [{ "type": "text", "content": "Select the double number line that shows the other values of distance and elevation." }]\`

WRONG: \`prompt: '<p>Arrange the cards to make a true comparison.</p>'\` (HTML string)
CORRECT: \`prompt: [{ "type": "text", "content": "Arrange the cards to make a true comparison." }]\`

**Example with Math in Prompt:**
CORRECT: \`prompt: [{ "type": "text", "content": "What is the value of " }, { "type": "math", "mathml": "<mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo>" }, { "type": "text", "content": " at each point?" }]\`

**General Rule for Prompts:** Prompt fields MUST be arrays of inline content objects. No raw strings or HTML allowed.

**CRITICAL: PROMPT–CARDINALITY AGREEMENT (MANDATORY)**

The interaction prompt MUST reflect the number of correct answers declared in the response declarations.

- If cardinality is "single" (exactly one correct choice):
  - Use singular grammar and instructions such as "Select one answer." or "Choose the best answer."
  - Do NOT include "Select all that apply."
- If cardinality is "multiple" (two or more correct choices):
  - Explicitly include "Select all that apply." in the prompt.
  - Use plural grammar (e.g., "Which of the following are true?", "Which statements are correct?", "Which samples depict …?").
- Ensure subject–verb agreement and noun plurality match the selection mode. Do not produce a singular prompt when multiple answers are correct.

Source of truth and required behavior:
- ALWAYS update or rewrite the prompt to match the declared cardinality and the correct answers.
- NEVER change the response declarations (cardinality or list of correct identifiers) to match an existing prompt.
- The answer key and cardinality are authoritative; the prompt text must be brought into alignment with them.

Negative example (DO NOT OUTPUT) – singular prompt with multi-correct declaration:
\`\`\`json
{
  "body": [
    { "type": "blockSlot", "slotId": "choice_interaction" }
  ],
  "interactions": {
    "choice_interaction": {
      "type": "choiceInteraction",
      "prompt": [
        { "type": "text", "content": "Which of the following samples depicts a pure substance?" }
      ],
      "choices": [
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "A" }] }], "identifier": "A" },
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "B" }] }], "identifier": "B" },
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "C" }] }], "identifier": "C" },
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "D" }] }], "identifier": "D" }
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "choice_interaction",
      "cardinality": "multiple",
      "baseType": "identifier",
      "correct": ["B", "C"]
    }
  ]
}
\`\`\`

Corrected version – explicitly signal multi-select and use plural grammar:
\`\`\`json
{
  "body": [
    { "type": "blockSlot", "slotId": "choice_interaction" }
  ],
  "interactions": {
    "choice_interaction": {
      "type": "choiceInteraction",
      "prompt": [
        { "type": "text", "content": "Which of the following samples depict pure substances? Select all that apply." }
      ],
      "choices": [
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "A" }] }], "identifier": "A" },
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "B" }] }], "identifier": "B" },
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "C" }] }], "identifier": "C" },
        { "content": [{ "type": "paragraph", "content": [{ "type": "text", "content": "D" }] }], "identifier": "D" }
      ]
    }
  },
  "responseDeclarations": [
    {
      "identifier": "choice_interaction",
      "cardinality": "multiple",
      "baseType": "identifier",
      "correct": ["B", "C"]
    }
  ]
}
\`\`\`

Additional negative example (DO NOT OUTPUT) – Secondary Succession:
\`\`\`json
{
  "body": [
    {"type":"blockSlot","slotId":"choice_interaction"}
  ],
  "title":"Identify examples of secondary succession",
  "widgets":{},
  "feedback":{
    "correct":[{"type":"paragraph","content":[{"type":"text","content":"Correct! Secondary succession occurs after a disturbance in an area that previously supported life and where soil remains."}]}],
    "incorrect":[{"type":"paragraph","content":[{"type":"text","content":"Not quite. Secondary succession happens in habitats that were previously occupied and then disturbed (for example, after a storm or clear-cutting), with soil still present. Primary succession begins on newly formed surfaces without soil, such as bare rock or fresh sand dunes."}]}]
  },
  "identifier":"secondary-succession-multiple-select",
  "interactions":{
    "choice_interaction":{
      "type":"choiceInteraction",
      "prompt":[{"type":"text","content":"Which of the following is an example of secondary succession?"}],
      "choices":[
        {"content":[{"type":"paragraph","content":[{"type":"text","content":"Storm waves damage a coral reef, and soft corals grow back."}]}],"feedback":null,"identifier":"A"},
        {"content":[{"type":"paragraph","content":[{"type":"text","content":"A forest is clear-cut for timber, and shrubs and trees grow back."}]}],"feedback":null,"identifier":"B"},
        {"content":[{"type":"paragraph","content":[{"type":"text","content":"A glacier melts, leaving behind bare rocks on which mosses begin to grow."}]}],"feedback":null,"identifier":"C"},
        {"content":[{"type":"paragraph","content":[{"type":"text","content":"Sand dunes gradually build up, and grasses start to grow."}]}],"feedback":null,"identifier":"D"}
      ],
      "shuffle":true,
      "maxChoices":4,
      "minChoices":1,
      "responseIdentifier":"choice_interaction"
    }
  },
  "responseDeclarations":[
    {"correct":["A","B"],"baseType":"identifier","identifier":"choice_interaction","cardinality":"multiple"}
  ]
}
\`\`\`

**⚠️ CRITICAL: ORDER INTERACTION PROMPT CLARITY (NO VAGUE INSTRUCTIONS)**

For any \`orderInteraction\`, the prompt MUST be explicit about:
- **Sort property** (what to sort by: e.g., density, size, value, alphabetical order)
- **Direction** using unambiguous phrasing (e.g., "least to greatest", "greatest to least", "smallest to largest")
- **Axis phrase**: always include "(top to bottom)" because orientation MUST be "vertical".

Do NOT use vague instructions like "Arrange the items in correct order" without property, direction, and the axis phrase.

Negative example (DO NOT OUTPUT):
\`\`\`
{
  "order_interaction": {
    "type": "orderInteraction",
    "responseIdentifier": "RESPONSE",
    "orientation": "vertical",
    "prompt": [
      { "type": "text", "content": "Arrange the items in correct order." }
    ],
    "choices": [ /* ... */ ],
    "shuffle": true
  }
}
\`\`\`

Positive example (MANDATORY PATTERN):
\`\`\`
{
  "order_interaction": {
    "type": "orderInteraction",
    "responseIdentifier": "RESPONSE",
    "orientation": "vertical",
    "prompt": [
      { "type": "text", "content": "Drag and drop the items below to sort them in order from least to most dense (top to bottom)." }
    ],
    "choices": [ /* ... */ ],
    "shuffle": true
  }
}
\`\`\`

Additional acceptable direction phrases: "greatest to least", "most to least", "smallest to largest", "largest to smallest". Always include the axis phrase "(top to bottom)".

**Choice Content - DEPENDS ON INTERACTION TYPE:**

**For Standard Choice Interactions (choiceInteraction, orderInteraction):**
WRONG: \`{ identifier: "A", content: "<p>above</p>" }\` (HTML string)
CORRECT: \`{ identifier: "A", content: [{ "type": "paragraph", "content": [{ "type": "text", "content": "above" }] }] }\`

**For Inline Choice Interactions (inlineChoiceInteraction):**
WRONG: \`{ identifier: "ABOVE", content: "above" }\` (plain string)
CORRECT: \`{ identifier: "ABOVE", content: [{ "type": "text", "content": "above" }] }\`

**Choice Feedback - ALWAYS INLINE CONTENT:**
WRONG: \`feedback: 'Correct! This rectangle has...'\` (plain string)
CORRECT: \`feedback: [{ "type": "text", "content": "Correct! This rectangle has..." }]\`

WRONG: \`feedback: '<p>Incorrect. Try again.</p>'\` (HTML string)
CORRECT: \`feedback: [{ "type": "text", "content": "Incorrect. Try again." }]\`

**Prompt Fields Must Use Structured Inline Content:**
WRONG: \`prompt: 'Select the correct answer.'\` (plain string)
CORRECT: \`prompt: [{ "type": "text", "content": "Select the correct answer." }]\`

**Choice Content MUST be structured:**
**For choiceInteraction:**
WRONG: \`content: "<p>Option A</p>"\` (HTML string)
CORRECT: \`content: [{ "type": "paragraph", "content": [{ "type": "text", "content": "Option A" }] }]\`

  **CRITICAL: CHOICE-LEVEL VISUALS MUST USE WIDGET SLOTS (DO NOT DESCRIBE THE IMAGE IN TEXT)**
  WRONG (text-only description of a number line inside a choice):
  \`\`\`json
  {
    "choices": [
      {
        "identifier": "A",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "content": "A vertical number line from 6 to -6 with tick marks... another arrow from 2.5 to 5.5 ..."
              }
            ]
          }
        ]
      }
    ]
  }
  \`\`\`
  
  CORRECT (embed the predeclared widget slot for the choice's visual):
  \`\`\`json
  {
    "choices": [
      {
        "identifier": "A",
        "content": [
          { "type": "blockSlot", "slotId": "RESPONSE__A__v1" }
        ],
        "feedback": null
      },
      {
        "identifier": "B",
        "content": [
          { "type": "blockSlot", "slotId": "RESPONSE__B__v1" }
        ],
        "feedback": null
      }
    ]
  }
  \`\`\`

**⚠️ CRITICAL NEW SECTION: MANDATORY USE OF ALL DECLARED WIDGET SLOTS IN INTERACTIONS**

**ABSOLUTE REQUIREMENT: You MUST use ALL widget slots declared in the assessment shell that are not already used in the body.**

When the assessment shell declares widget slots (especially those following patterns like \\\`choice_a_table\\\`, \\\`choice_b_table\\\`, or \\\`RESPONSE__A__v1\\\`), these are widgets specifically reserved for embedding inside interaction choices. The pipeline has already:
1. Identified these widgets in Shot 1
2. Mapped them to specific widget types in Shot 2
3. Reserved them for use in this interaction generation step

**FAILURE TO USE DECLARED WIDGET SLOTS WILL CAUSE THEM TO BE PRUNED AND THE QUESTION TO FAIL.**

**Real Example of This Critical Error:**

**Assessment Shell (showing declared but unused widget slots):**
\`\`\`json
{
  "widgets": ["stimulus_dnl", "choice_a_table", "choice_b_table"],
  "body": [
    { "type": "blockSlot", "slotId": "stimulus_dnl" },
    { "type": "blockSlot", "slotId": "choice_interaction" }
  ]
}
\`\`\`

**WRONG (Creating text representations instead of using widget slots):**
\`\`\`json
{
  "choice_interaction": {
    "type": "choiceInteraction",
    "choices": [
      {
        "identifier": "A",
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "content": "Seconds | Meters" }] },
          { "type": "paragraph", "content": [{ "type": "text", "content": "8 | 225" }] },
          { "type": "paragraph", "content": [{ "type": "text", "content": "12 | 300" }] }
        ]
      },
      {
        "identifier": "B",
        "content": [
          { "type": "paragraph", "content": [{ "type": "text", "content": "Seconds | Meters" }] },
          { "type": "paragraph", "content": [{ "type": "text", "content": "3 | 75" }] },
          { "type": "paragraph", "content": [{ "type": "text", "content": "5 | 125" }] }
        ]
      }
    ]
  }
}
\`\`\`
**Why this is WRONG:** The shell declared \\\`choice_a_table\\\` and \\\`choice_b_table\\\` widgets, but the interaction didn't use them. These widgets will be pruned as "unused" and never generated, breaking the question.

**CORRECT (Using the declared widget slots):**
\`\`\`json
{
  "choice_interaction": {
    "type": "choiceInteraction",
    "choices": [
      {
        "identifier": "A",
        "content": [
          { "type": "blockSlot", "slotId": "choice_a_table" }
        ]
      },
      {
        "identifier": "B",
        "content": [
          { "type": "blockSlot", "slotId": "choice_b_table" }
        ]
      }
    ]
  }
}
\`\`\`

**MANDATORY CHECKLIST FOR INTERACTION GENERATION:**
1. Check the assessment shell's \\\`widgets\\\` array for ALL declared widget slots
2. Identify which widgets are already used in the \\\`body\\\` 
3. The remaining unused widgets MUST be embedded in your interaction choices
4. Use the exact slotId from the shell - do not create new slot names
5. For choice-level visuals (tables, images, diagrams), ALWAYS use blockSlot, never create text representations

**Common Widget Slot Patterns to Watch For:**
- \\\`choice_a_table\\\`, \\\`choice_b_table\\\`, etc. - Tables for each choice
- \\\`RESPONSE__A__v1\\\`, \\\`RESPONSE__B__v1\\\`, etc. - Visual widgets for choices
- \\\`option_1_diagram\\\`, \\\`option_2_diagram\\\`, etc. - Diagrams for each choice
- Any widget slot not used in the body MUST be used in the interaction

**REMEMBER:** The pipeline will DELETE any widget slots you don't reference. If the shell declares it, YOU MUST USE IT.

### POSITIVE EXAMPLE: Double Number Line Choice Interaction

**Assessment Shell:**
\`\`\`json
{
  "widgets": ["image_1", "choice_a_dnl", "choice_b_dnl"],
  "interactions": ["choice_interaction"],
  "body": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "The double number line shows that " },
        { "type": "math", "mathml": "<mn>3</mn>" },
        { "type": "text", "content": " back-to-school packages contain " },
        { "type": "math", "mathml": "<mn>36</mn>" },
        { "type": "text", "content": " pencils." }
      ]
    },
    { "type": "blockSlot", "slotId": "image_1" },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "content": "Select the double number line that shows the other values of packages and pencils." }
      ]
    },
    { "type": "blockSlot", "slotId": "choice_interaction" }
  ]
}
\`\`\`

**✅ CORRECT: Properly embeds widget slots in choices**
\`\`\`json
{
  "choice_interaction": {
    "type": "choiceInteraction",
    "responseIdentifier": "RESPONSE",
    "prompt": [
      { "type": "text", "content": "Select the double number line that shows the other values of packages and pencils." }
    ],
    "choices": [
      {
        "identifier": "A",
        "content": [
          { "type": "blockSlot", "slotId": "choice_a_dnl" }
        ],
        "feedback": null
      },
      {
        "identifier": "B",
        "content": [
          { "type": "blockSlot", "slotId": "choice_b_dnl" }
        ],
        "feedback": null
      }
    ],
    "shuffle": true,
    "maxChoices": 1,
    "minChoices": 1
  }
}
\`\`\`

**❌ WRONG: Text descriptions instead of widget slots (causes widgets to be deleted!)**
\`\`\`json
{
  "choice_interaction": {
    "type": "choiceInteraction",
    "responseIdentifier": "RESPONSE",
    "prompt": [
      { "type": "text", "content": "Select the double number line that shows the other values of packages and pencils." }
    ],
    "choices": [
      {
        "identifier": "A",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "content": "A double number line with 5 equally spaced tick marks. The line labeled Packages reads 0, 1, 2, 3, 4. The line labeled Pencils reads 0, 12, 24, 36, 48."
              }
            ]
          }
        ],
        "feedback": null
      },
      {
        "identifier": "B",
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "type": "text",
                "content": "A double number line with 5 equally spaced tick marks. The line labeled Packages reads 0, 1, 2, 3, 4. The line labeled Pencils reads 0, 10, 22, 36, 52."
              }
            ]
          }
        ],
        "feedback": null
      }
    ],
    "shuffle": true,
    "maxChoices": 1,
    "minChoices": 1
  }
}
\`\`\`

**For inlineChoiceInteraction:**
WRONG: \`content: "Option A"\` (plain string)
CORRECT: \`content: [{ "type": "text", "content": "Option A" }]\`

**Feedback MUST be structured inline content:**
WRONG: \`feedback: 'That is correct.'\` (plain string)
CORRECT: \`feedback: [{ "type": "text", "content": "That is correct." }]\`

**Critical Rules:**
- **Standard choice interactions** (choiceInteraction, orderInteraction): Choice content MUST be arrays of block content objects
- **Inline choice interactions** (inlineChoiceInteraction): Choice content MUST be arrays of inline content objects
- **ALL choice feedback**: MUST be arrays of inline content objects regardless of interaction type
- **ALL prompts**: MUST be arrays of inline content objects

## Real Example of Unsupported Interaction - Plotter Widget

Here's a real Perseus question that uses an unsupported plotter widget for creating histograms:

**Perseus JSON (showing unsupported widget):**
\`\`\`json
{
  "question": {
    "content": "The following data points represent the number of points the Hawaii Eagles football team scored each game.\\n\\n$\\qquad17,33,28,23,10,42,3$\\n\\n**Using the data, create a histogram.**\\n\\n[[☃ plotter 1]]",
    "widgets": {
      "plotter 1": {
        "type": "plotter",
        "graded": true,
        "options": {
          "maxY": 5,
          "type": "histogram",
          "labels": ["Number of points", "Number of games"],
          "correct": [2, 3, 2],
          "categories": ["$0$", "$15$", "$30$", "$45$"]
        }
      }
    }
  }
}
\`\`\`

**Required Output for this Unsupported Widget:**
\`\`\`json
{
  "histogram_interaction": {
    "type": "unsupportedInteraction",
    "perseusType": "plotter",
    "responseIdentifier": "RESPONSE"
  }
}
\`\`\`

This plotter widget requires interactive histogram creation which is not supported. You MUST flag it as unsupported rather than trying to convert it to a text entry or choice interaction.

**Real Example of Unsupported Interaction - Label Image Widget**

Complex image labeling tasks (dragging labels/markers onto an image) are not supported. These must be labeled as "no interaction found" by emitting an \`unsupportedInteraction\` with \`perseusType: "label-image"\`.

**Perseus JSON (showing unsupported widget):**
\`\`\`json
{
  "question": {
    "content": "A boy holds a ball at shoulder level before throwing it.\\n\\n**For each location, select whether the potential energy stored in the ball-Earth system is more, less, or the same as when the ball was held at the boy’s shoulder.**\\n\\n[[☃ label-image 1]]",
    "widgets": {
      "label-image 1": {
        "type": "label-image",
        "graded": true,
        "options": {
          "choices": ["more", "less", "the same"],
          "markers": [
            { "x": 22.2, "y": 54.4, "label": "…", "answers": ["the same"] },
            { "x": 34.6, "y": 67.6, "label": "…", "answers": ["less"] },
            { "x": 73.5, "y": 46.1, "label": "…", "answers": ["more"] },
            { "x": 94.4, "y": 64.3, "label": "…", "answers": ["less"] }
          ],
          "imageUrl": "https://cdn.kastatic.org/ka-content-images/46a41d325c6d2213c8408b7ff80689d18d338152.svg",
          "imageWidth": 500,
          "imageHeight": 297
        }
      }
    }
  }
}
\`\`\`

**Required Output for this Unsupported Widget:**
\`\`\`json
{
  "labeling_interaction": {
    "type": "unsupportedInteraction",
    "perseusType": "label-image",
    "responseIdentifier": "RESPONSE"
  }
}
\`\`\`

Label-image requires dragging/placing labels on an image, which is not supported by our QTI interaction set. You MUST flag it as unsupported rather than attempting to convert it to choice or text entry.

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if it contains:
- ANY LaTeX commands (backslash followed by letters)
- ANY dollar sign used as LaTeX delimiter (e.g., $x$, $$y$$)
- ANY raw text "$" or "%" in text nodes - currency/percent MUST be in MathML: \`<mo>$</mo><mn>amount</mn>\` and \`<mn>number</mn><mo>%</mo>\`
- ANY <mfenced> element
- ANY answer content outside of feedback fields (no pre-selected choices, no answer indicators)
- ANY block-level elements in prompt fields (prompts must contain only inline content)
- ANY \`<p>\` tags in choice feedback (feedback must be inline text only)
- ANY \`<p>\` tags in inline choice interaction content (must be inline text only)

**REMEMBER: Answers are ONLY allowed in feedback fields. HARD STOP. NO EXCEPTIONS.**
Double-check EVERY string in your output. ZERO TOLERANCE.

⚠️ FINAL WARNING: Your output will be AUTOMATICALLY REJECTED if any content field is a plain string instead of the required structured JSON array.`

	return { systemInstruction, userContent }
}
