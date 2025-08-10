### unit-block-diagram — Manual Widget Review

Principles: minimize nullables; no `.default()`; avoid array min/max; require explicit layout sizing.

Scope
- Purpose: render N 10x10 blocks with K shaded units per block in a grid

Current pain points
- Nullable layout and color fields with transform fallbacks.

Proposed API (no feature loss, fewer nullables)
- Require `blocksPerRow`, `blockWidth`, `blockHeight`, `shadeColor`.

Schema sketch
```ts
export const UnitBlockDiagramPropsSchema = z.object({
  type: z.literal('unitBlockDiagram').describe("Identifies this as a unit block diagram for visualizing place value and decimal concepts."),
  totalBlocks: z.number().int().positive().describe("Number of 10×10 grid blocks to display (e.g., 3, 5, 1). Each block represents 100 units. Must be positive integer."),
  shadedUnitsPerBlock: z.number().int().describe("Number of unit squares to shade in each block (e.g., 45, 100, 0). Range: 0-100. Same shading pattern applies to all blocks."),
  blocksPerRow: z.number().int().positive().describe("Number of blocks to display horizontally before wrapping to next row (e.g., 3, 4, 5). Affects overall layout shape."),
  blockWidth: z.number().positive().describe("Width of each 10×10 block in pixels (e.g., 100, 120, 80). Larger values show grid lines more clearly."),
  blockHeight: z.number().positive().describe("Height of each 10×10 block in pixels (e.g., 100, 120, 80). Usually equal to blockWidth for square units."),
  shadeColor: z.string().describe("CSS color for shaded unit squares (e.g., '#4472C4' for blue, 'lightcoral', 'rgba(255,0,0,0.5)'). Should contrast with white background."),
}).strict().describe("Creates grids of 10×10 blocks (hundreds blocks) with partial shading to represent decimals, percentages, or fractions of 100. Each block contains 100 unit squares arranged in a 10×10 grid. Shading shows parts of the whole, making abstract concepts concrete. Essential for place value, decimals (0.45 = 45 shaded), and percentage (45%) understanding.")```

Why this helps
- Eliminates schema fallbacks so sizes are explicit and consistent.


