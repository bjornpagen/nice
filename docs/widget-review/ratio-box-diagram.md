### ratio-box-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; arrays not null.

Scope
- Purpose: grid of colored icons, optional overlays/partitions, sequential or grouped layout

Current pain points
- Nullable size; `.min(1)` on items; nullable arrays and option fields.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use arrays for `boxes` (empty allowed).
- Make `partitions` explicit number (use 0 to indicate none).
- Require `style`, remove nullable.

Schema sketch
```ts
const Item = z.object({ 
  count: z.number().int().describe("Number of icons of this type to display (e.g., 12, 8, 0). Zero means this type is absent. Must be non-negative integer."), 
  color: z.string().describe("CSS color for icons of this type (e.g., '#0C7F99' for teal, '#BC2612' for red, 'orange'). Each type should have distinct color for clarity."), 
  style: z.enum(['filled','outline']).describe("Visual style of the icon. 'filled' creates solid circles, 'outline' creates hollow circles with border. Mix styles for emphasis.") 
}).strict()

const Box = z.object({ 
  startRow: z.number().int().describe("Top row index (0-based) where this box begins. Row 0 is the first row. Must be >= 0 and <= endRow."), 
  endRow: z.number().int().describe("Bottom row index (0-based) where this box ends, inclusive. To span 3 rows starting at row 1: startRow=1, endRow=3."), 
  startCol: z.number().int().describe("Leftmost column index (0-based) where this box begins. Column 0 is first. Must be >= 0 and <= endCol."), 
  endCol: z.number().int().describe("Rightmost column index (0-based) where this box ends, inclusive. To span 4 columns: startCol=0, endCol=3."), 
  label: z.string().describe("Text label for this box (e.g., '1/3', 'Group A', '25%', ''). Empty string means no label. Positioned inside the box.") 
}).strict()

export const RatioBoxDiagramPropsSchema = z.object({
  type: z.literal('ratioBoxDiagram').describe("Identifies this as a ratio box diagram for visualizing part-to-part and part-to-whole relationships."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 500, 600, 400). Must accommodate the grid of items with reasonable spacing."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 400, 300, 500). Adjusts based on total items and rows needed."),
  items: z.array(Item).describe("Array of item types with counts and styles. Order matters: items are placed sequentially or grouped based on layout. Can be empty for blank grid."),
  itemsPerRow: z.number().int().positive().describe("Number of item icons per row in the grid (e.g., 10, 12, 8). Determines grid width and total rows needed."),
  boxes: z.array(Box).describe("Overlay boxes to highlight groups of items. Empty array means no boxes. Useful for showing fractions, ratios, or groupings. Can overlap."),
  partitions: z.number().int().describe("Number of equal groups to divide all items into using boxes. 0 means no automatic partitioning. E.g., 3 creates thirds, 4 creates quarters."),
  layout: z.enum(['sequential','grouped']).describe("Item arrangement. 'sequential' places items in reading order mixing types. 'grouped' clusters each type together with visual separation."),
}).strict().describe("Creates a grid of colored circular icons to visualize ratios and proportions. Supports overlay boxes to highlight parts, automatic partitioning for fractions, and two layout modes. Perfect for teaching part-to-part ratios (red:blue), part-to-whole relationships (fraction of total), and equivalent ratios.")```

Why this helps
- Eliminates size fallbacks and nullable branches; generator interprets zero/empty values as “none”.


