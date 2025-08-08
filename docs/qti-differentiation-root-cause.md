## QTI Differentiation Pipeline — Root Cause Analysis

### Executive summary

- **What’s failing**: The differentiated QTI generation pipeline frequently produces 0/3 usable variations for many questions, or fails early before AI is even called.
- **Why** (two primary root causes):
  - **A. Input shape vs runtime schema generation**: The runtime Zod schema generator refuses to infer types from empty arrays (e.g., empty interaction prompts). Some questions in DB contain such empty arrays, so the pipeline fails pre‑AI with “cannot infer type from empty array …/prompt”.
  - **B. Post‑AI structural mismatch**: AI outputs pass a permissive runtime schema but violate stricter assumptions in the sanitization/compile steps. Missing required string fields (e.g., `content`, `mathml`) and malformed block/inline structures crash sanitization (undefined → `.replace`) or fail compiler schema enforcement.

The net effect: even when AI returns three “validated” variations, they are later discarded during sanitization or compile, leading to 0 usable items.

---

### Symptoms observed in logs

- Repeated early failures prior to AI for some questions:
  - “zod schema generation: cannot infer type from empty array at /interactions/choice_interaction/prompt”
- After “successfully generated and validated differentiated items count=3”, nearly all three variations often fail during sanitization:
  - “Cannot read properties of undefined (reading 'replace')” followed by “generatedCount=0 totalXmlLength=0”
- Compiler schema enforcement errors for some items:
  - “schema enforcement failed … expected array, received undefined at [body, 0, content] … Unrecognized key(s) in object: 'slotId'”

These three classes of failures occur consistently and align precisely with our code’s strictness at different stages.

---

### Evidence in code (why these symptoms occur)

#### 1) Runtime Zod schema generation is intentionally fail‑fast on empty arrays

```70:75:src/lib/qti-generation/structured/zod-runtime-generator.ts
if (Array.isArray(obj)) {
  if (obj.length === 0) {
    const where = path.length ? ` at ${formatJsonPath(path)}` : ""
    throw errors.new(`zod schema generation: cannot infer type from empty array${where}`)
  }
}
```

- If the original `structuredJson` (in DB) has empty arrays, e.g., an interaction prompt `[]`, this generator throws. That matches the pre‑AI failures seen in logs.

#### 2) Sanitization assumes required strings exist; malformed AI output slips through and crashes `.replace`

```142:151:src/lib/qti-validation/utils.ts
export function sanitizeHtmlEntities(htmlFragment: string): string {
  const exceptions = new Set(["&quot;", "&apos;", "&lt;", "&gt;", "&amp;"])
  const entityRegex = /&(#?[a-zA-Z0-9]+);/g
  return htmlFragment.replace(entityRegex, (match) => {
    if (exceptions.has(match)) {
      return match
    }
    return he.decode(match)
  })
}
```

```12:26:src/lib/qti-generation/structured/validator.ts
function processInlineContent(items: InlineContent | null, logger: logger.Logger): void {
  if (!items) return
  for (const item of items) {
    if (item.type === "text") {
      let sanitized = sanitizeHtmlEntities(item.content)
      ...
    } else if (item.type === "math") {
      let sanitized = sanitizeMathMLOperators(item.mathml)
      ...
    }
  }
}
```

- The sanitizer calls `.replace` through `sanitizeHtmlEntities` and `sanitizeMathMLOperators`. If AI returns a `text` item without `content` or a `math` item without `mathml`, sanitization throws `TypeError: Cannot read properties of undefined (reading 'replace')` — exactly what logs show.

#### 3) Compiler performs strict schema enforcement and rejects malformed structures

```178:184:src/lib/qti-generation/compiler.ts
const { AssessmentItemSchema } = createDynamicAssessmentItemSchema(validatedWidgetMapping)
const itemResult = AssessmentItemSchema.safeParse(itemData)
if (!itemResult.success) {
  logger.error("schema enforcement failed", { error: itemResult.error })
  throw errors.wrap(itemResult.error, "schema enforcement")
}
```

- Errors like “expected array, received undefined at [body, 0, content] … Unrecognized key(s) in object: 'slotId'” reflect malformed body blocks or misplaced `slotId` keys that violate the block/inline content model.

---

### The pipeline’s invariants vs where reality breaks

1) Input to differentiation
- Invariant: original `structuredJson` must be fully informative; empty arrays are considered “uninferable” by design.
- Reality: some DB items have empty arrays (e.g., prompts). The generator throws, producing pre‑AI failures with explicit location (e.g., `/interactions/choice_interaction/prompt`).

2) Output of differentiation (AI)
- Invariant (runtime schema used with OpenAI): Should mirror the original structure sufficiently to parse as “validated”.
- Reality: The runtime schema is permissive enough that malformed inline items (missing `content`/`mathml`) or malformed body elements (missing `type`/`content`) can pass, only to be rejected downstream.

3) Sanitization + compile
- Invariant: required string fields exist (sanitizers call `.replace`), and block/inline structure adheres strictly to the schema.
- Reality: when the AI output violates those assumptions, we either crash sanitization (TypeError) or fail compiler schema enforcement with detailed Zod errors.

---

### Root causes (precise)

- **Root cause A (pre‑AI)**: The DB’s structured JSON sometimes includes empty arrays for fields where the runtime schema generator refuses to infer types. This is by design in `generateZodSchemaFromObject(...)`. Result: “cannot infer type from empty array …/prompt”.

- **Root cause B (post‑AI)**: The differentiation‑time schema used to constrain AI output is not as strict as the sanitization/compile expectations. As a result, malformed inline content or body structures slip through “validated” but then:
  - Crash sanitization due to missing strings (undefined → `.replace`), or
  - Fail compiler schema enforcement with Zod errors (e.g., missing `content` arrays; stray `slotId` without proper `type`).

Both root causes are visible in the logs, with errors concentrated at the exact points the code enforces those invariants.

---

### Impact

- High failure rate: many items produce 0/3 usable variations despite “validated” AI output.
- Throughput degradation: repeated sanitization or schema enforcement failures waste tokens and time.
- Operator confusion: logs show “successfully generated and validated differentiated items count=3” immediately followed by “generatedCount=0”, which appears contradictory until the stage boundaries are understood.

---

### What to verify immediately (actionable checks)

- Pick any question ID that failed with “cannot infer type from empty array …/prompt”; read its DB `structuredJson` and confirm the empty array at the indicated path.
- Capture one full AI output for an item that “validated” but crashed sanitization; verify that at least one inline `text` lacks `content` or `math` lacks `mathml`, or that a paragraph block lacks a `content` array.

---

### Recommendations (non‑fix guidance for triage and planning)

- For Root cause A (pre‑AI): Decide whether the generator should continue rejecting empty arrays (keeping the strict stance) or whether these fields should be pruned/normalized before schema generation to allow differentiation to proceed.

- For Root cause B (post‑AI): Align the differentiation‑time runtime schema with the compiler’s `AssessmentItemSchema` (and sanitizer expectations). This removes the mismatch where items “pass validation” but later crash. Concretely:
  - Make `text.content` and `math.mathml` explicitly required at differentiation time.
  - Enforce block/inline structural constraints (paragraphs must carry a `content` array of inline items; `slotId` must appear only inside `inlineSlot` or `blockSlot` objects with correct `type`).
  - Keep the compiler’s enforcement as the final guardrail; the earlier we reject malformed output, the less wasted work later.

- Observability: Add counters for “AI variations generated”, “sanitization passed”, “compile passed” to quantify drop‑off stage by stage and confirm improvement after changes.

---

### Appendix — Key code references

1) Fail‑fast on empty arrays
```70:75:src/lib/qti-generation/structured/zod-runtime-generator.ts
if (Array.isArray(obj)) {
  if (obj.length === 0) {
    const where = path.length ? ` at ${formatJsonPath(path)}` : ""
    throw errors.new(`zod schema generation: cannot infer type from empty array${where}`)
  }
}
```

2) Sanitization assumes strings
```12:26:src/lib/qti-generation/structured/validator.ts
function processInlineContent(items: InlineContent | null, logger: logger.Logger): void {
  if (!items) return
  for (const item of items) {
    if (item.type === "text") {
      let sanitized = sanitizeHtmlEntities(item.content)
      ...
    } else if (item.type === "math") {
      let sanitized = sanitizeMathMLOperators(item.mathml)
      ...
    }
  }
}
```

3) Compiler schema enforcement
```178:184:src/lib/qti-generation/compiler.ts
const { AssessmentItemSchema } = createDynamicAssessmentItemSchema(validatedWidgetMapping)
const itemResult = AssessmentItemSchema.safeParse(itemData)
if (!itemResult.success) {
  logger.error("schema enforcement failed", { error: itemResult.error })
  throw errors.wrap(itemResult.error, "schema enforcement")
}
```


