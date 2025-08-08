## QTI Differentiation — Postmortem, Root Causes, and Consistency Checks

### Executive summary

- **Primary failure mode:** Missing slot content at compile time triggers errors like “Content for block slot '…' not found,” resulting in many variations being skipped.
- **Root cause:** Widget slot keys are stripped during the differentiator’s initial validation because it uses a schema built with an empty widget mapping. Zod’s object behavior strips unknown keys, removing all widget definitions. Body/feedback still reference those slots, so the compiler can’t resolve them.
- **Why Inngest jobs appear “successful”:** The fan-out loop logs and skips failing variations but does not throw; the function returns successfully even when `generatedCount` is 0. Thus, you see multiple runs without a hard failure.
- **Fix direction (no code changes here):** Add pre-/post-consistency checks to guarantee slot key parity, and change failure criteria so batches/jobs fail when all variations are invalid. Align differentiation-time schema expectations with compile-time requirements.

---

### Symptoms observed in logs

- Repeated compile-time failures for block slots:
  - `Compiler Error: Content for block slot 'plane_elevation_graph' not found.`
  - `Compiler Error: Content for block slot 'triangle_diagram' not found.`
  - `Compiler Error: Content for block slot 'image_1' not found.`
  - `Compiler Error: Content for block slot 'graph_image' not found.`
  - `Compiler Error: Content for block slot 'rotation_image' not found.`
  - `Compiler Error: Content for block slot 'facebook_table' not found.`
- Many items show “successfully generated and transformed differentiated items count=3” but then compile 0/3 due to missing slots.
- Inngest emits “Function may be indeterminate” warnings during long-running batches; this is orthogonal to slot failures.

---

### Pipeline overview (relevant steps)

1) Differentiation entry validates the input against the exported base `AssessmentItemSchema` before creating the AI’s runtime schema.
2) The exported base schema is created from `createDynamicAssessmentItemSchema({})` with an empty widget mapping.
3) Zod’s default behavior for `z.object({})` strips unknown keys, so all widget entries under `widgets` are removed during validation.
4) The AI runtime schema (built from the already-stripped object) no longer includes widget slot keys, so the model returns items without widget definitions.
5) The compiler builds a `slots` map from `widgets` and `interactions`. Since `widgets` are missing, any `blockSlot`/`inlineSlot` in body/feedback that references a widget slot fails at render time.

Key code references:

```157:176:src/lib/qti-generation/compiler.ts
const validatedWidgetMapping: Record<string, keyof typeof typedSchemas> = {}
...
const { AssessmentItemSchema } = createDynamicAssessmentItemSchema(validatedWidgetMapping)
```

```269:276:src/lib/qti-generation/schemas.ts
const {
  AssessmentItemSchema: BaseAssessmentItemSchema,
  AnyInteractionSchema: BaseAnyInteractionSchema,
  AssessmentItemShellSchema: BaseAssessmentItemShellSchema
} = createDynamicAssessmentItemSchema({})

export const AssessmentItemSchema = BaseAssessmentItemSchema
```

```45:50:src/lib/qti-generation/content-renderer.ts
case "blockSlot": {
  const content = slots.get(item.slotId)
  if (content === undefined) {
    throw errors.new(`Compiler Error: Content for block slot '${item.slotId}' not found.`)
  }
  return `<div>${content}</div>`
}
```

```139:149:src/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items.ts
const compileResult = errors.trySync(() => compile(sanitizedItem))
if (compileResult.error) {
  logger.error("failed to compile a single differentiated item to xml, skipping this variation", { ... })
  continue
}
```

```173:181:src/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items.ts
logger.info("successfully completed generation and compilation of differentiated qti items", {
  attemptedCount: differentiatedItems.length,
  generatedCount: compiledItems.length,
  totalXmlLength: ...
})
return compiledItems
```

---

### Root cause analysis

#### 1) Widget keys are stripped at differentiation-time input validation

- The differentiator validates the incoming `AssessmentItemInput` using the base schema constructed with an empty widget mapping:
  - With `createDynamicAssessmentItemSchema({})`, `widgets` becomes a plain `z.object({})`.
  - Zod’s default for `z.object({})` is to strip unknown keys; since every widget key is "unknown" to the empty shape, all widget entries are removed.
  - The “validated” item then lacks widget definitions, while body/feedback still reference the slot ids in `blockSlot`/`inlineSlot` items.

Impact:
- At compile time, the `slots` map is built from widgets + interactions. With no widgets left, any widget-referencing slot id is missing, leading to the renderer exception shown in logs.

#### 2) The AI runtime schema no longer enforces widget presence

- Because the runtime Zod schema used for OpenAI output is generated from the already-stripped object, it doesn’t require or preserve the widget map. AI responses therefore omit widgets, perpetuating the mismatch through to compile.

#### 3) Compile step is correct to fail on missing slot content

- The renderer explicitly fails when a `blockSlot` or `inlineSlot` cannot be resolved from the `slots` map. This is by design and correct per content model rules.

#### 4) Inngest job behavior masks hard failure

- The fan-out loop treats per-variation failures as non-fatal, logging and skipping. The enclosing function returns `compiledItems` even if it’s empty. As a result, top-level jobs appear to “succeed” even when 0/3 variations compiled.

---

### Consistency checks to prevent slot-mismatch failures

These checks do not suggest workarounds; they surface invalid states early and fail fast.

1) Pre-compile slot parity check (body/feedback → widgets/interactions)
- Collect all slot ids referenced in `body`, `feedback.correct`, `feedback.incorrect` (both block and inline variants).
- Build the set of available slot ids = `Object.keys(widgets) ∪ Object.keys(interactions)` (when present).
- If referenced set ≠ available set, log detailed diffs and fail the variation (or batch) immediately.

2) Post-sanitization slot parity re-check
- After `validateAndSanitizeHtmlFields`, re-run the parity check to guard against any transformations that might affect content references.

3) Differentiation-time input guard
- Before building the AI runtime schema, verify that the incoming item’s referenced slot ids match its declared widget/interaction keys. If not, fail early with a clear error (prevents wasting token budget on AI calls for malformed inputs).

4) AI output structure guard
- Verify the AI output preserves:
  - All original widget keys and their `type` strings.
  - All referenced slot ids in body/feedback are present in widgets or interactions.
  - Interaction prompts/choices still conform to the block/inline content model.

5) Response declaration consistency
- Existing normalization maps identifiers across interactions and `responseDeclarations`. Add an explicit check that, for any interaction with `baseType: "identifier"`, all `correct` values map to existing, normalized choice identifiers.

6) Batch/job failure criteria
- If `compiledItems.length === 0` for a question, consider failing the job (not just logging) to surface the issue operationally.

---

### Operational guardrails and observability

- Counters and ratios:
  - “AI variations generated”, “sanitization passed”, “slot-parity passed”, “compile passed” per item. Track drop-off per stage.
- Error budget triggers:
  - If a batch produces <X% compilable items, fail the job and alert.
- Logging clarity:
  - When slot parity fails, log both sets: `undeclaredSlots` (referenced in content but missing in widgets/interactions) and `unusedSlots` (declared but not referenced).

---

### Why this explains the concrete failures seen

- The failing slot ids (`plane_elevation_graph`, `triangle_diagram`, `image_1`, `graph_image`, `rotation_image`, `facebook_table`, etc.) are consistent with widget-like content. Their absence from `widgets` at compile time is sufficient to produce the renderer’s “Content for block slot … not found.”
- Interactions typically survive because they are modeled as a `record` map and their keys are not stripped, which is why you see widget slot failures disproportionately compared to interaction slot failures.

---

### Immediate action items (for upcoming PRs)

- Add slot parity checks pre- and post-sanitization; fail the variation (or entire job) on mismatch.
- Revisit the differentiation-time schema construction so it’s derived from the actual input widget map rather than an empty mapping; this keeps widget keys/types in scope for the AI runtime schema.
- Adjust Inngest failure criteria so that all-failed-variation batches surface as failed runs.

---

### Appendix — Code references cited

```157:176:src/lib/qti-generation/compiler.ts
// compile() enforces schema using a mapping and then compiles, building the slots map
```

```269:276:src/lib/qti-generation/schemas.ts
// Base schema currently created with an empty widget mapping
```

```45:50:src/lib/qti-generation/content-renderer.ts
// Renderer throws when a slot id cannot be resolved to content
```

```139:149:src/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items.ts
// Per-variation compile errors are logged and skipped
```

```173:181:src/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items.ts
// Function returns successfully regardless of 0 compiled items
```


