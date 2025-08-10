### box-grid — Manual Widget Review

Principles: `width`/`height` required; minimize nullables; no `.default()`, no `.refine()`, no array min/max; explicit styling fields.

Scope
- File: `src/lib/widgets/generators/box-grid.ts`
- Purpose: render a 2D grid of cells with optional per-cell background highlight

Current pain points
- Nullable `width`/`height` with transforms produce fallback sizes.
- Optional `cellPadding` and `fontSize` add internal default logic.
- `backgroundColor` nullables introduce conditional rendering complexity.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `cellPadding` and `fontSize` explicitly.
- Make `backgroundColor` a string; for “no highlight”, use a transparent color string '' or a separate boolean if desired. To keep schema lean, require string and allow empty string to mean none.

Schema sketch
```ts
const Cell = z.object({
  content: z.union([z.string(), z.number()]).describe("The text or number to display in this cell. Numbers are automatically formatted. Strings can include math symbols (e.g., '42', 'x', '2/3', '√9', 'n+1')."),
  backgroundColor: z.string().describe("CSS color for the cell background (e.g., '#FFE5B4' for peach, 'lightblue', 'rgba(255,0,0,0.3)' for translucent red). Empty string '' means no background color."),
}).strict()

export const BoxGridPropsSchema = z.object({
  type: z.literal('boxGrid').describe("Identifies this as a box grid widget for displaying tabular data with optional cell highlighting."),
  width: z.number().positive().describe("Total width of the grid in pixels including borders (e.g., 400, 500, 600). Must accommodate all columns with their content."),
  height: z.number().positive().describe("Total height of the grid in pixels including borders (e.g., 300, 400, 200). Must accommodate all rows."),
  data: z.array(z.array(Cell)).describe("2D array where data[row][col] represents the cell content. First row often contains headers. All rows should have the same number of columns for proper alignment."),
  showGridLines: z.boolean().describe("Whether to show borders between cells. True creates a traditional table look. False creates a borderless layout, useful for highlighting patterns."),
  cellPadding: z.number().describe("Internal padding in pixels between cell border and content (e.g., 8, 10, 5). Larger values create more spacious cells."),
  fontSize: z.number().describe("Font size in pixels for cell content (e.g., 14, 16, 12). Should be readable but fit within cell dimensions."),
}).strict().describe("Creates a grid/table structure for displaying data, patterns, or mathematical arrays. Supports individual cell highlighting for emphasis. Useful for multiplication tables, data organization, and pattern recognition.")```

Why this helps
- Prevents size fallback bugs; all visuals are fully specified.
- Simplifies rendering by eliminating nullable checks and transforms.

Generator guidance
- Treat empty string `backgroundColor` as “no fill”.
- Validate `data` is rectangular or handle ragged rows deterministically.


