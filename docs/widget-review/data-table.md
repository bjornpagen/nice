### data-table — Manual Widget Review

Principles: eliminate nullable width/height (not applicable here); minimize nullables; no `.default()`, no `.refine()`, no array min/max; keep inline discriminated unions to avoid `$ref`.

Scope
- File: `src/lib/widgets/generators/data-table.ts`
- Purpose: render semantic HTML table with headers, row headers, footer, and mixed content cells

Current pain points
- Several nullable fields (title, columns[].label, rowHeaderKey, footer, input.expectedLength) that create branching.
- Mixed cell types already handled via inline discriminated union (good); maintain this pattern.

Proposed API (no feature loss, fewer nullables)
- Keep columns/data required and non-null.
- Require `title` and `rowHeaderKey` explicitly to eliminate special cases; alternatively allow empty string for “no title”.
- For `columns[].label`, require inline content (allow empty array to render blank header).
- For `input.expectedLength`, require a number (0 can mean unspecified length from UI).
- For `footer`, use an empty array (length equal to columns) when present; otherwise omit `footer` entirely.

Schema sketch
```ts
const Inline = z.array(z.discriminatedUnion('type', [
  z.object({ 
    type: z.literal('text').describe("Plain text content segment."), 
    content: z.string().describe("The text to display (e.g., 'Price', 'Total:', 'kg'). Can include any Unicode characters.") 
  }).strict(),
  z.object({ 
    type: z.literal('math').describe("Mathematical expression segment."), 
    mathml: z.string().describe("MathML markup for the mathematical expression (e.g., '<math><mi>x</mi><mo>+</mo><mn>5</mn></math>'). Renders as formatted math.") 
  }).strict(),
])).describe("Array of content segments that can mix text and math. Segments are concatenated in order. Empty array displays nothing.")

const Cell = z.discriminatedUnion('kind', [
  z.object({ 
    kind: z.literal('inline').describe("Cell containing mixed text/math content."), 
    content: Inline.describe("The cell's display content as an array of text and math segments.") 
  }).strict(),
  z.object({ 
    kind: z.literal('number').describe("Cell containing a numeric value."), 
    value: z.number().describe("The number to display. Will be formatted appropriately (e.g., 42, 3.14, -10, 0.5). Aligned based on column's isNumeric setting.") 
  }).strict(),
  z.object({ 
    kind: z.literal('input').describe("Interactive input cell for student responses."), 
    responseIdentifier: z.string().describe("Unique ID for this input field, used to capture student responses (e.g., 'answer1', 'q2_input'). Must be unique within the table."), 
    expectedLength: z.number().describe("Expected character length for the input. Determines input field width. Use 0 for default width (e.g., 5 for short answers, 20 for longer text).") 
  }).strict(),
]).describe("Table cell content. Can be static (inline text/math or number) or interactive (input field).")

export const DataTablePropsSchema = z.object({
  type: z.literal('dataTable').describe("Identifies this as a data table widget for structured tabular display."),
  title: z.string().describe("Table caption/title displayed above the table (e.g., 'Monthly Sales Data', 'Conversion Factors', ''). Empty string means no title."),
  columns: z.array(z.object({ 
    key: z.string().describe("Unique identifier for this column (e.g., 'month', 'price', 'quantity'). Used internally and for row headers."), 
    label: Inline.describe("Column header content. Can mix text and math (e.g., [{type:'text',content:'Area '},{type:'math',mathml:'<math><mo>(</mo><msup><mi>m</mi><mn>2</mn></msup><mo>)</mo></math>'}])."), 
    isNumeric: z.boolean().describe("Whether this column contains numeric data. True right-aligns the column for number formatting. False left-aligns for text.") 
  }).strict()).describe("Column definitions including headers and alignment. Order determines left-to-right display. Must have at least one column."),
  data: z.array(z.array(Cell)).describe("2D array of table cells. data[row][col] maps to the cell content. Each inner array is one row. All rows must have same length as columns array."),
  rowHeaderKey: z.string().describe("Column key that identifies row headers. That column's cells will be styled as headers (bold, shaded). Empty string means no row headers."),
  footer: z.array(Cell).describe("Footer row cells displayed at bottom with distinct styling. Array length must match columns length. Empty array means no footer."),
}).strict().describe("Creates accessible HTML tables with mixed content types, optional row headers, and footer rows. Supports inline text/math in cells and interactive input fields. Perfect for data display, comparison tables, and exercises requiring tabular input.")```

Why this helps
- Removes nullable branches for title/labels/footer; empty values are represented explicitly.
- Preserves inline discriminated unions to avoid `$ref` while staying LLM-friendly.

Generator guidance
- Treat empty arrays for header labels or footer as intentional blanks; do not inject defaults.


