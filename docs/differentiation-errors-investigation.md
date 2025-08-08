## Investigation: Differentiation Inngest Compiler Errors

### Observed errors (from logs)

```text
ERROR failed to compile a single differentiated item to xml, skipping this variation ... error=TypeError: items is not iterable
ERROR failed to compile a single differentiated item to xml, skipping this variation ... error=TypeError: Cannot read properties of undefined (reading 'length')
ERROR item differentiation: zod schema generation: cannot infer type from empty array
```

Examples from recent runs:

```text
... compiling item to xml questionId=x591188e467b065b6 ... error=TypeError: items is not iterable
... compiling item to xml questionId=x8098a292aa874f61 ... error=TypeError: items is not iterable
... compiling item to xml questionId=x82d60f7df25dc683 ... error=TypeError: items is not iterable
... compiling item to xml questionId=xebe0471136d91d4b ... error=TypeError: Cannot read properties of undefined (reading 'length')
... item differentiation failed questionId=xd5f031df899fe335 error=zod schema generation: cannot infer type from empty array
```

### High-level summary

- The compiler runs a strict pre-validation step that iterates arrays of structured content (block/inline) and checks interaction choices. When the incoming object has a field that is not an array (or is `undefined`) where an array is expected, iteration and `.length` reads throw.
- The differentiation flow builds a runtime Zod schema from the seed `structuredJson` stored in the database. If that seed contains empty arrays, the schema generator fails fast with “cannot infer type from empty array”.
- The affected inputs likely have shape mismatches vs. the compiler’s strict schema, e.g., `feedback.correct`/`feedback.incorrect` not being arrays of blocks, empty arrays in content fields, or malformed `choices`.

### Where the errors originate in code

#### Inngest differentiation compile loop (logs and compile call)

```ts
// src/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items.ts
const compileResult = errors.trySync(() => compile(itemWithNewIdentifier))
if (compileResult.error) {
  logger.error("failed to compile a single differentiated item to xml, skipping this variation", {
    questionId,
    itemIndex: i + 1,
    identifier: qtiIdentifier,
    error: compileResult.error
  })
  continue
}
```

This is the logging site matching the failures in your run.

#### Pre-validation that expects arrays (source of “items is not iterable” and `.length` errors)

```ts
// src/lib/qti-generation/pre-validator.ts
function validateBlockContent(items: BlockContent, _context: string, logger: logger.Logger): void {
  for (const item of items) {
    if (item.type === "paragraph") {
      validateInlineContent(item.content, `${_context}.paragraph`, logger)
    }
  }
}

export function validateAssessmentItemInput(item: AssessmentItemInput, logger: logger.Logger): void {
  if (item.body) validateBlockContent(item.body, "item.body", logger)
  validateBlockContent(item.feedback.correct, "item.feedback.correct", logger)
  validateBlockContent(item.feedback.incorrect, "item.feedback.incorrect", logger)

  if (item.interactions) {
    for (const [key, interaction] of Object.entries(item.interactions)) {
      if (interaction.type === "inlineChoiceInteraction" && interaction.choices) {
        for (const choice of interaction.choices) {
          validateInlineContent(choice.content, `interaction[${key}].choice[${choice.identifier}]`, logger)
        }
      } else if (
        (interaction.type === "choiceInteraction" || interaction.type === "orderInteraction") &&
        interaction.choices
      ) {
        if (interaction.choices.length < 2) {
          throw errors.new(
            `${interaction.type} must have at least 2 choices, but only ${interaction.choices.length} found in interaction[${key}]`
          )
        }
        for (const choice of interaction.choices) {
          validateBlockContent(choice.content, `interaction[${key}].choice[${choice.identifier}]`, logger)
          if (choice.feedback) {
            validateInlineContent(choice.feedback, `interaction[${key}].choice[${choice.identifier}].feedback`, logger)
          }
        }
      }
    }
  }
}
```

If `feedback.correct`, `feedback.incorrect`, `body`, or any `choice.content` is not an array (or is `undefined`), the `for (const item of items)` iteration throws “items is not iterable”. If `interaction.choices` is `undefined` or not an array, reading `.length` throws “Cannot read properties of undefined (reading 'length')”.

#### Content rendering also assumes arrays

```ts
// src/lib/qti-generation/content-renderer.ts
export function renderInlineContent(inlineItems: InlineContent | null | undefined, slots: Map<string, string>): string {
  if (!inlineItems) return ""
  return inlineItems.map((item) => { /* ... */ }).join("")
}

export function renderBlockContent(blockItems: BlockContent | null | undefined, slots: Map<string, string>): string {
  if (!blockItems) return ""
  return blockItems.map((item) => { /* ... */ }).join("\n        ")
}
```

Though the compile path first runs pre-validation (above), any shape mismatch that somehow passes through will also cause problems here since `.map` assumes arrays.

#### Runtime schema generator fails on empty arrays

```ts
// src/lib/qti-generation/structured/zod-runtime-generator.ts
if (Array.isArray(obj)) {
  if (obj.length === 0) {
    // CRITICAL: Cannot infer type from empty array - FAIL FAST
    throw errors.new("zod schema generation: cannot infer type from empty array")
  }
  // ...
  if (uniqueElementSchemas.length === 0) {
    throw errors.new("zod schema generation: no valid schemas for array elements")
  }
}
```

This aligns directly with the “cannot infer type from empty array” error in your logs. The seed `structuredJson` (fetched from DB) appears to contain at least one empty array.

#### Compiler enforces strict schema before rendering

```ts
// src/lib/qti-generation/compiler.ts
validateAssessmentItemInput(itemData, logger)
const { AssessmentItemSchema } = createDynamicAssessmentItemSchema(validatedWidgetMapping)
const itemResult = AssessmentItemSchema.safeParse(itemData)
if (!itemResult.success) {
  logger.error("schema enforcement failed", { error: itemResult.error })
  throw errors.wrap(itemResult.error, "schema enforcement")
}
const enforcedItem = itemResult.data
```

This shows the pre-validation runs even before schema enforcement. Shape mismatches can therefore surface as runtime TypeErrors inside the pre-validator.

### Why this happens during differentiation

- The differentiation function loads the seed `structuredJson` from the database and constructs a runtime Zod schema from that object. If the seed has empty arrays or non-conformant shapes, either:
  - The schema generator fails immediately (empty arrays), or
  - The AI output conforms to the seed’s problematic structure, which then fails during the compiler’s pre-validation/compilation.

### Likely data issues to investigate in DB `structuredJson`

For failing `questionId`s in your logs (e.g., `x591188e467b065b6`, `x8098a292aa874f61`, `x82d60f7df25dc683`, `xebe0471136d91d4b`, `x9816022d48dc6f1b`, `xc8181889c8194cd7`, etc.), inspect the stored `structuredJson` for:

- **Feedback fields**: `feedback.correct` and `feedback.incorrect` must be arrays of block-content items, not objects/strings/null. Example of correct shape:

```json
{
  "feedback": {
    "correct": [
      { "type": "paragraph", "content": [ { "type": "text", "content": "Great job." } ] }
    ],
    "incorrect": [
      { "type": "paragraph", "content": [ { "type": "text", "content": "Try again." } ] }
    ]
  }
}
```

- **Body**: `body` should be `null` or an array of block-content items. Not a single object/string.
- **Choices**: For `choiceInteraction` and `orderInteraction`, `choices` must be an array with length ≥ 2. Each `choice.content` must be a block-content array (not a single object). Optional `choice.feedback` must be an inline-content array or `null`.
- **Empty arrays**: Any empty array anywhere (e.g., `body: []`, `choices: []`, `content: []`) will break runtime schema generation or later validation.
- **Identifiers**: Ensure `interactions[...].responseIdentifier` and each `choice.identifier` are non-empty strings.

### Concrete checklist (non-invasive)

For each failing `questionId`:

- Retrieve `structuredJson` from the DB.
- Validate the following fields are arrays with expected element types:
  - `body` (block-content array or `null`)
  - `feedback.correct` (block-content array)
  - `feedback.incorrect` (block-content array)
  - For each interaction:
    - `prompt` (inline-content array)
    - `choices` (array with ≥ 2)
    - For each choice: `content` (block-content array), optional `feedback` (inline-content array or `null`)
- Confirm no empty arrays are present anywhere in the object.

### References (file paths)

- `src/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items.ts`
- `src/lib/qti-generation/pre-validator.ts`
- `src/lib/qti-generation/content-renderer.ts`
- `src/lib/qti-generation/structured/zod-runtime-generator.ts`
- `src/lib/qti-generation/compiler.ts`

### Summary

- “items is not iterable” and “reading 'length'” are due to shape mismatches in `structuredJson` arrays (arrays expected, non-arrays/undefined provided).
- “cannot infer type from empty array” is thrown by the runtime Zod schema generator because the seed object contains at least one empty array.
- These issues originate from the DB-stored `structuredJson` used as the seed for differentiation.


