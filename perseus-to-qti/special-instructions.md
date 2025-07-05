# QTI 3.0 Conversion Rules

## 1. XML Header and Structure

Always use the full, strict QTI 3.0 header, including namespaces for QTI and MathML:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item
    xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd http://www.w3.org/1998/Math/MathML https://purl.imsglobal.org/spec/mathml/v3p0/schema/xsd/mathml3.xsd"
    identifier="..."
    title="..."
    time-dependent="false"
    xml:lang="en-US">
    ...
</qti-assessment-item>
```

**Note:** If an item contains absolutely no MathML, the MathML schema location may be omitted for a minimal header.

## 2. Response and Outcome Declarations

### Response Type (`base-type`)
Use the most semantically correct type:

- **`identifier`**: For choice interactions (single or multiple)
- **`integer`**: For numeric inputs that are whole numbers
- **`float`**: For numeric inputs that can have decimals
- **`string`**: For text-based inputs (e.g., words, sentences)

### Scoring
Use a single, consolidated `qti-outcome-declaration` for the score:

- `identifier="SCORE"`
- `normal-minimum="0.0"`
- `normal-maximum="1.0"`

**Important:** DO NOT use a separate `MAXSCORE` declaration.

## 3. Semantic HTML and Styling

### NO Presentational Tags
Absolutely no `<strong>`, `<b>`, `<h2>`, `<h3>`, etc.

**Exception:** Use `<strong>` tags ONLY when the question explicitly refers to "bolded" text. In these cases, the bold formatting is functional, not presentational.

Example:
```xml
<qti-prompt>Choose whether the bolded part of the sentence is the subject or the predicate.</qti-prompt>
<blockquote><strong>Holly</strong> injured her rear on a spiky cactus.</blockquote>
```

### Use Semantic Tags

- **`<em>`**: For italics indicating emphasis or a title (e.g., a court case or book title)
- **`<blockquote>`**: For quoted passages of text
- **`<ol>` and `<li>`**: For all numbered lists and numbered paragraphs
  - If headings interrupt the numbering, break the list and restart the next `<ol>` with the `start` attribute (e.g., `<ol start="2">`)
- **`<p>`**: Use paragraphs for all text blocks, including what might look like a heading in the source
- **`<abbr>`**: For definitions (e.g., `<abbr title="definition...">term</abbr>`)
- **`<small>`**: For attributions, citations, or footnotes
- **`<hr/>`**: For thematic breaks (like `***` in the source)

### Prompt
The `<qti-prompt>` element must NOT contain any styling tags.

## 4. MathML Usage

### When to Use MathML
Wrap numbers and symbols in `<math xmlns="http://www.w3.org/1998/Math/MathML">...</math>` ONLY if they represent a mathematical quantity, value, formula, or variable.

#### Examples of what IS MathML:

- **3 cups**: `<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mtext> cups</mtext></math>`
- **87 points**: `<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>87</mn></math>`
- **40%**: `<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>40</mn><mo>%</mo></math>`
- **x²+5**: `<math xmlns="http://www.w3.org/1998/Math/MathML">...</math>`

### When NOT to Use MathML
DO NOT use MathML for numbers that function as non-mathematical identifiers.

#### Examples of what is NOT MathML:

- **Dates**: 1996, 2020, January 28, 2022
- **Identifiers**: Era 3, Title VII
- **Structural Numbers**: paragraph 1, 331-332 (page numbers)

## 5. Interaction-Specific Rules

### Multiple Choice
For multiple-response questions where any number of choices can be selected, use `max-choices="0"`.

### Multiple Select (Fixed)
For questions that ask for a specific number of choices (e.g., "select two"), set `max-choices` and `min-choices` to that number (e.g., `max-choices="2" min-choices="2"`).

### Text Entry
For multi-part numeric answers (like coordinates), use separate `qti-text-entry-interaction` elements and custom response processing to check each part.
