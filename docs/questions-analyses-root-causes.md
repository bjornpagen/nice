## severe violations: to-do checklist

- [ ] x01f60b7757e2df97 — tables in answer choices not rendering
- [ ] x0201659c2893f524 — line graph with arrows replaced by text
- [ ] x020564490645f5b2 — missing vinculum/overline for repeating decimal
- [ ] x025950632aa6ffa5 — correct answer marked incorrect
- [ ] x00f25e256a7b101c — raw html tags and dollar signs in body; should be mathml
- [ ] x012ab26fce14c204 — circle diagram filled black; quarter segment missing
- [ ] x013e97f8d9b7ac32 — ordering answer (-4, -1, 0, 5) graded incorrect
- [ ] x02d283b3a5235279 — rotation diagram: black fills, wrong positions/orientation, spurious arrow; missing overbar; layout issue
- [ ] x0341ee874c188425 — html currency/percent in text; should be mathml

---

### x01f60b7757e2df97 — tables in answer choices not rendering

- violation: “the tables for the answer choices are not rendering.”
- root cause:
  - the `dataTable` widget generates raw html `<table>` markup, which many qti engines disallow inside `<qti-simple-choice>` content.

```3:149:/Users/zeppa/Documents/superbuilders/nice/src/lib/widgets/generators/data-table.ts
export const generateDataTable: WidgetGenerator<typeof DataTablePropsSchema> = (props) => {
  // ...
  let xml = `<table style="border-collapse: collapse; width: 100%; border: 1px solid black;">`
  // ...
  xml += "</table>"
  return xml
}
```

- additionally, the compiler only converts svg widgets to images; non-svg widgets (like html tables) are injected verbatim, so they reach `<qti-simple-choice>` unchanged.

```52:56:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/compiler.ts
if (widgetHtml.trim().startsWith("<svg")) {
  slots.set(widgetId, `<img src="${encodeDataUri(widgetHtml)}" alt="Widget visualization" />`)
} else {
  slots.set(widgetId, widgetHtml)
}
```

- outcome: tables inside choices don’t render; they should be emitted as rendered images (e.g., svg → data uri) or avoided inside choices.

---

### x0201659c2893f524 — line graph with arrows replaced by text

- violation: graph-based answer choices rendered as descriptive text.
- root cause: no dedicated widget mapping for “movement arrows on a line graph.” existing widgets (e.g., `functionPlotGraph`, `scatterPlot`, `numberLine*`) don’t cover “increment/decrement arrows” semantics; mapping step falls back to text-only content.
- evidence: available widgets do not include a “step/motion on graph” type.

```59:160:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/widget-generator.ts
// switch cases: many graphs/lines exist, but none model step arrows on a cartesian line graph
```

- outcome: lmm mapping produces text instead of a graphical widget → loss of fidelity.

---

### x020564490645f5b2 — missing vinculum for repeating decimal

- violation: `2.6` repeating lacks an overline on the 6.
- root cause: generated mathml omits `<mover>…<mo>‾</mo></mover>` overline despite prompts documenting the pattern.

```311:311:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/structured/prompts.ts
WRONG: `\(\dfrac{19}{27}=0.\overline{703}\)` --> CORRECT: `<math>...<mover><mn>703</mn><mo>‾</mo></mover></math>`
```

- sanitizer doesn’t strip overlines, so absence is upstream in math generation; needs stricter prompt checks or a validator rule to enforce overlines for repeating decimals.

---

### x025950632aa6ffa5 — correct answer marked incorrect

- violation: “the correct answer is listed as incorrect.”
- root cause: response processing uses a generic `<qti-match>` for every interaction, including ordered sequences; order interactions require order-aware operators (e.g., `<qti-ordered>` or appropriate equality semantics), otherwise correct sequences compare incorrectly.

```139:154:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/response-processor.ts
// single template applies to all identifiers
<qti-response-processing>
  <qti-response-condition>
    <qti-response-if>
      <qti-and>
        ... <qti-match> ... for each response ...
```

- outcome: items with non-trivial response semantics (esp. ordered) grade wrong.

---

### x00f25e256a7b101c — raw html tags and dollar signs

- violation: “html tags and dollar signs present in rendered xml; values should be mathml.”
- root cause: the validator intentionally allows currency spans and doesn’t convert to mathml; this leaves html like `<span class="currency">$</span>` in body content.

```31:50:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-validation/utils.ts
// treat currency as acceptable and skip latex check
const currencyTaggedDollar = /<span\s+class\s*=\s*["']currency["']\s*>\s*\$\s*<\/span>/gi
// also replace $ before numbers with placeholders, not conversion to MathML
```

- qti renderers often reject arbitrary spans/classes in `qti-content-body`; amounts should be emitted as mathml (`<mo>$</mo><mn>1.54</mn>`, `<mn>5.5</mn><mo>%</mo>`).

---

### x012ab26fce14c204 — circle diagram filled black; quarter segment missing

- violation: “filled in with black; using a full circle rather than a quarter segment; impossible to see other components.”
- root cause:
  - missing defaults and/or content mapping: when `sectors` aren’t provided, only the full circle renders; if `fillColor` comes through falsy/undefined, some svg viewers default fill to black.
  - our circle generator draws the main circle with a provided `fillColor`; if upstream mapping supplies an undefined color, the attribute is still emitted and may render as black in some players.

```67:76:/Users/zeppa/Documents/superbuilders/nice/src/lib/widgets/generators/circle-diagram.ts
fillColor: z.string().nullable().transform((val) => val ?? "none")
...
svg += `<circle ... fill="${fillColor}" stroke="${strokeColor}" .../>`
```

- likely upstream mapping omitted `sectors` and set a dark `fillColor`; needs mapping guardrails and safer defaults.

---

### x013e97f8d9b7ac32 — ordering answer graded incorrect

- violation: the order `-4, -1, 0, 5` marked incorrect.
- root cause: same as x025950632aa6ffa5 — order interactions evaluated with `<qti-match>` instead of order-aware operator.

```130:147:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/response-processor.ts
// no special case for cardinality="ordered"; uses qti-match unconditionally
```

---

### x02d283b3a5235279 — rotation diagram: black fills, wrong positions/orientation, spurious arrow; overbar missing; layout

- violations: multiple rendering faults.
- root causes:
  - polygons in `transformation-diagram` don’t default `fillColor`; when undefined, svg defaults to black → obscures angles/labels.
  
```337:344:/Users/zeppa/Documents/superbuilders/nice/src/lib/widgets/generators/transformation-diagram.ts
let polySvg = `<polygon points="${pointsStr}" fill="${shape.fillColor}" stroke="${shape.strokeColor}" .../>`
// no defaulting → fill="undefined" → viewer defaults to black
```
  
  - spurious arrows likely come from `marker-end` applied whenever `hasArrow` is set; upstream mapping may set it erroneously.

```349:357:/Users/zeppa/Documents/superbuilders/nice/src/lib/widgets/generators/transformation-diagram.ts
const marker = hasArrow ? 'marker-end="url(#arrowhead)"' : ""
```

  - overbar on `C'D'` missing: mathml not using `<mover>…<mo>‾</mo></mover>` for line segments.
  - “units” on new line: structured content likely put input and unit text in same paragraph; renderer joins inline into a single `<p>`.

```31:33:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/content-renderer.ts
case "paragraph": return `<p>${renderInlineContent(...)}</p>`
```

---

### x0341ee874c188425 — html currency/percent in text; should be mathml

- violation: html tags like `<span class="currency">$</span>` and textual `%` present; should be mathml.
- root cause: same as x00f25e256a7b101c — currency/percent not converted to mathml; current validator only sanitizes entities and allows currency placeholders, not structural conversion.

```139:165:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/structured/validator.ts
// sanitizers run, but no html→mathml conversion for currency/percent
```

---

### notes on tables policy vs implementation

- spec text mandates “tables are ALWAYS widgets” and must not be literal `<table>` in body/choices, but the current `dataTable` outputs an html table string. this mismatch is causing failures in contexts (like choices) where html tables are not permitted.

```213:216:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/structured/prompts.ts
- **Table Rule (MANDATORY)**: Tables must NEVER be created as HTML `<table>` elements in the body. ALWAYS create a widget slot...
```
