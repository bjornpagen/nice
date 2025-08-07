## severe violations: to-do checklist

- [ ] x01f60b7757e2df97 — tables in answer choices not rendering
- [ ] x0201659c2893f524 — line graph with arrows replaced by text
- [ ] x020564490645f5b2 — missing vinculum/overline for repeating decimal
- [ ] x025950632aa6ffa5 — correct answer marked incorrect
- [ ] x00f25e256a7b101c — raw HTML tags and dollar signs in body; should be MathML
- [ ] x012ab26fce14c204 — circle diagram filled black; quarter segment missing
- [ ] x013e97f8d9b7ac32 — ordering answer (-4, -1, 0, 5) graded incorrect
- [ ] x02d283b3a5235279 — rotation diagram: black fills, wrong positions/orientation, spurious arrow; missing overbar; layout issue
- [ ] x0341ee874c188425 — HTML currency/percent in text; should be MathML

---

### x01f60b7757e2df97 — tables in answer choices not rendering

- violation: “the tables for the answer choices are not rendering.”
- root cause:
  - the `dataTable` widget generates raw HTML `<table>` markup, which many QTI delivery engines disallow or inconsistently render inside `<qti-simple-choice>` content.

```3:149:/Users/zeppa/Documents/superbuilders/nice/src/lib/widgets/generators/data-table.ts
export const generateDataTable: WidgetGenerator<typeof DataTablePropsSchema> = (props) => {
  // ...
  let xml = `<table style="border-collapse: collapse; width: 100%; border: 1px solid black;">`
  // ...
  xml += "</table>"
  return xml
}
```

- additionally, the compiler only converts SVG widgets to images; non-SVG widgets (like HTML tables) are injected verbatim, so they reach `<qti-simple-choice>` unchanged.

```52:56:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/compiler.ts
if (widgetHtml.trim().startsWith("<svg")) {
  slots.set(widgetId, `<img src="${encodeDataUri(widgetHtml)}" alt="Widget visualization" />`)
} else {
  slots.set(widgetId, widgetHtml)
}
```

- outcome: tables inside choices do not render reliably in some players.
- spec status: QTI 3.0 explicitly aims to support HTML5 and web‑friendly markup in item content; tables are not prohibited by the spec. Rendering behavior within choices is engine‑dependent. Our “tables must be widgets” rule is an internal portability convention. see [QTI 3.0 Overview](https://www.imsglobal.org/spec/qti/v3p0/oview/).

---

### x0201659c2893f524 — line graph with arrows replaced by text

- violation: graph‑based answer choices rendered as descriptive text.
- root cause: no dedicated widget mapping for “movement arrows on a line graph.” Existing widgets (e.g., `functionPlotGraph`, `scatterPlot`, `numberLine*`) do not encode “increment/decrement arrows” semantics; mapping falls back to text‑only content.
- evidence: available widgets do not include a "step/motion on graph" type.

```59:160:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/widget-generator.ts
// switch cases: many graphs/lines exist, but none model step arrows on a cartesian line graph
```

- outcome: LLM mapping produces text instead of a graphical widget, causing loss of fidelity.
- spec status: QTI 3.0 permits embedding web‑friendly graphics (including SVG and images). Introducing a purpose‑built widget preserves semantics while remaining spec‑compliant. see [QTI 3.0 Overview](https://www.imsglobal.org/spec/qti/v3p0/oview/).

---

### x020564490645f5b2 — missing vinculum for repeating decimal

- violation: `2.6` repeating lacks an overline on the `6`.
- root cause: generated MathML omits `<mover>…<mo>‾</mo></mover>` overline despite prompts documenting the pattern.

```311:311:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/structured/prompts.ts
WRONG: `\(\dfrac{19}{27}=0.\overline{703}\)` --> CORRECT: `<math>...<mover><mn>703</mn><mo>‾</mo></mover></math>`
```

- outcome: repeating‑decimal intent is lost.
- spec status: MathML is first‑class in QTI 3.0; using `<mover>` to render a vinculum is valid and recommended for fidelity. see [QTI 3.0 Overview](https://www.imsglobal.org/spec/qti/v3p0/oview/) and [QTI 3.0 Best Practice and Implementation Guide](https://www.imsglobal.org/spec/qti/v3p0/impl/).

---

### x025950632aa6ffa5 — correct answer marked incorrect

- violation: “the correct answer is listed as incorrect.”
- root cause: response processing uses a generic `<qti-match>` for every interaction, including ordered sequences; order interactions require order‑aware processing (ordered cardinality plus ordered comparison), otherwise correct sequences compare incorrectly.

```139:154:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/response-processor.ts
// single template applies to all identifiers
<qti-response-processing>
  <qti-response-condition>
    <qti-response-if>
      <qti-and>
        ... <qti-match> ... for each response ...
```

- outcome: items with ordered responses are mis‑scored.
- spec status: QTI 3.0 defines `qti-order-interaction` and ordered cardinality; response processing must use ordered comparison semantics for those declarations. see [QTI 3.0 Overview](https://www.imsglobal.org/spec/qti/v3p0/oview/), [QTI 3.0 XML Binding](https://www.imsglobal.org/spec/qti/v3p0/bind/), and [QTI 3.0 Best Practice and Implementation Guide](https://www.imsglobal.org/spec/qti/v3p0/impl/).

---

### x00f25e256a7b101c — raw HTML tags and dollar signs

- violation: “HTML tags and dollar signs present in rendered XML; values should be MathML.”
- root cause: the validator intentionally allows currency spans and does not convert to MathML; this leaves HTML like `<span class="currency">$</span>` in body content.

```31:50:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-validation/utils.ts
// treat currency as acceptable and skip latex check
const currencyTaggedDollar = /<span\s+class\s*=\s*["']currency["']\s*>\s*\$\s*<\/span>/gi
// also replace $ before numbers with placeholders, not conversion to MathML
```

- outcome: some engines reject arbitrary spans/classes in `qti-content-body`.
- spec status: QTI 3.0 allows HTML5 inline markup; using MathML for numeric values is not mandated by the spec but is recommended for interoperability and consistency across engines. Our “currency as MathML” rule is internal. see [QTI 3.0 Overview](https://www.imsglobal.org/spec/qti/v3p0/oview/).

---

### x012ab26fce14c204 — circle diagram filled black; quarter segment missing

- violation: “filled in with black; using a full circle rather than a quarter segment; impossible to see other components.”
- root cause:
  - missing defaults and/or content mapping: when `sectors` are not provided, only the full circle renders; if `fillColor` is falsy/undefined, some SVG renderers default fill to black.
  - the circle generator draws the main circle with a provided `fillColor`; if upstream mapping supplies an undefined color, the attribute is still emitted and may render as black in some players.

```67:76:/Users/zeppa/Documents/superbuilders/nice/src/lib/widgets/generators/circle-diagram.ts
fillColor: z.string().nullable().transform((val) => val ?? "none")
...
svg += `<circle ... fill="${fillColor}" stroke="${strokeColor}" .../>`
```

- outcome: illegible diagrams.
- spec status: not a QTI constraint; this is a widget default/mapping issue. QTI permits embedding the corrected SVG or an image. see [QTI 3.0 Overview](https://www.imsglobal.org/spec/qti/v3p0/oview/).

---

### x013e97f8d9b7ac32 — ordering answer graded incorrect

- violation: the order `-4, -1, 0, 5` marked incorrect.
- root cause: same as x025950632aa6ffa5 — order interactions evaluated with unordered `<qti-match>` rather than ordered comparison.

```130:147:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/response-processor.ts
// no special case for cardinality="ordered"; uses qti-match unconditionally
```

- spec status: QTI 3.0 requires ordered comparison semantics for ordered cardinality. see [QTI 3.0 XML Binding](https://www.imsglobal.org/spec/qti/v3p0/bind/) and [QTI 3.0 Best Practice and Implementation Guide](https://www.imsglobal.org/spec/qti/v3p0/impl/).

---

### x02d283b3a5235279 — rotation diagram: black fills, wrong positions/orientation, spurious arrow; overbar missing; layout

- violations: multiple rendering faults.
- root causes:
  - polygons in `transformation-diagram` do not default `fillColor`; when undefined, SVG defaults to black, which obscures angles/labels.
  
```337:344:/Users/zeppa/Documents/superbuilders/nice/src/lib/widgets/generators/transformation-diagram.ts
let polySvg = `<polygon points="${pointsStr}" fill="${shape.fillColor}" stroke="${shape.strokeColor}" .../>`
// no defaulting → fill="undefined" → viewer defaults to black
```
  
  - spurious arrows likely come from `marker-end` applied whenever `hasArrow` is set; upstream mapping may set it erroneously.

```349:357:/Users/zeppa/Documents/superbuilders/nice/src/lib/widgets/generators/transformation-diagram.ts
const marker = hasArrow ? 'marker-end="url(#arrowhead)"' : ""
```

  - overbar on `C'D'` missing: MathML not using `<mover>…<mo>‾</mo></mover>` for line segments.
  - “units” on new line: structured content likely put input and unit text in the same paragraph; the renderer joins inline items into a single `<p>`.

```31:33:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/content-renderer.ts
case "paragraph": return `<p>${renderInlineContent(...)}</p>`
```

- spec status: not a QTI constraint; these are widget mapping and MathML generation issues. see [QTI 3.0 Overview](https://www.imsglobal.org/spec/qti/v3p0/oview/).

---

### x0341ee874c188425 — HTML currency/percent in text; should be MathML

- violation: HTML tags like `<span class="currency">$</span>` and textual `%` present; values should be expressed as MathML for consistency.
- root cause: same as x00f25e256a7b101c — currency/percent not converted to MathML; current validator only sanitizes entities and allows currency placeholders, not structural conversion.

```139:165:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/structured/validator.ts
// sanitizers run, but no html→mathml conversion for currency/percent
```

- outcome: some engines reject arbitrary spans/classes; MathML improves interoperability.
- spec status: QTI 3.0 allows HTML5 inline markup; MathML is supported but not mandated for currency/percent. Our conversion requirement is an internal consistency rule. see [QTI 3.0 Overview](https://www.imsglobal.org/spec/qti/v3p0/oview/).

---

### notes on tables policy vs implementation

- our internal policy states “tables are ALWAYS widgets” (never literal `<table>` in body/choices), but the current `dataTable` emits an HTML table string. This mismatch causes failures in contexts (such as choices) where some engines do not allow or reliably render raw tables.

```213:216:/Users/zeppa/Documents/superbuilders/nice/src/lib/qti-generation/structured/prompts.ts
- **Table Rule (MANDATORY)**: Tables must NEVER be created as HTML `<table>` elements in the body. ALWAYS create a widget slot...
```

- spec status: QTI 3.0 permits HTML5 content, including `<table>`, within item bodies and (subject to renderer support) choice content. Our “tables as widgets” rule is for portability and renderer‑compatibility across diverse engines, not a spec requirement. see [QTI 3.0 Overview](https://www.imsglobal.org/spec/qti/v3p0/oview/).
