### partitioned-shape — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`; no `.refine()` (move geometry checks to generator); arrays not null.

Scope
- Purpose: partition mode (rectangle/circle partitions) and geometry mode (grid with figures/lines)

Current pain points
- Nullable size; `.refine()` constraint; many nullable arrays.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Replace `.refine()` with generator-time validation.
- Use empty arrays for shaded/hatched cells, overlays, figures, lines.

Schema sketch
```ts
const PartitionShape = z.object({
  type: z.enum(['rectangle','circle']).describe("Shape type. 'rectangle' creates a grid, 'circle' creates pie-like sectors."),
  totalParts: z.number().int().describe("Total number of equal parts/cells in the shape (e.g., 12, 16, 8). For rectangles, must equal rows × columns."),
  shadedCells: z.array(z.number().int()).describe("Zero-based indices of cells to shade with solid color (e.g., [0, 1, 2] shades first three). Empty array means no shading."),
  hatchedCells: z.array(z.number().int()).describe("Zero-based indices of cells to fill with diagonal lines pattern (e.g., [3, 4]). Can overlap with shaded cells. Empty array means no hatching."),
  rows: z.number().int().describe("Number of rows for rectangle partition (e.g., 3, 4, 2). Ignored for circles. Must be positive."),
  columns: z.number().int().describe("Number of columns for rectangle partition (e.g., 4, 3, 6). Ignored for circles. rows × columns must equal totalParts."),
  shadeColor: z.string().describe("CSS color for shaded cells (e.g., '#4472C4' for blue, 'lightcoral', 'rgba(255,0,0,0.5)'). Applies to all shaded cells."),
  shadeOpacity: z.number().describe("Opacity for shaded cells, 0-1 range (e.g., 0.3 for 30% opacity, 1 for solid). Allows seeing grid lines through shading."),
}).strict()

const LineOverlay = z.object({ 
  from: z.object({ 
    row: z.number().int().describe("Starting row index (0-based). For grid intersections, can equal grid rows for bottom edge."), 
    col: z.number().int().describe("Starting column index (0-based). For grid intersections, can equal grid columns for right edge.") 
  }).strict(), 
  to: z.object({ 
    row: z.number().int().describe("Ending row index (0-based). Creates line from 'from' to this point."), 
    col: z.number().int().describe("Ending column index (0-based). Creates line from 'from' to this point.") 
  }).strict(), 
  style: z.enum(['solid','dashed','dotted']).describe("Line style. 'solid' for main divisions, 'dashed' for auxiliary lines, 'dotted' for guidelines."), 
  color: z.string().describe("CSS color for the line (e.g., 'black', '#FF0000', 'blue'). Should contrast with background.") 
}).strict()

const Figure = z.object({ 
  vertices: z.array(z.object({ 
    row: z.number().int().describe("Row coordinate of vertex (0-based). Can be fractional for positions between grid lines."), 
    col: z.number().int().describe("Column coordinate of vertex (0-based). Can be fractional for positions between grid lines.") 
  }).strict()).describe("Ordered vertices defining the polygon. Connect in sequence, closing back to first. Minimum 3 vertices."), 
  fillColor: z.string().describe("CSS fill color for the polygon (e.g., 'rgba(255,200,0,0.3)' for translucent yellow, 'lightblue'). Use transparency to show grid."), 
  strokeColor: z.string().describe("CSS color for polygon outline (e.g., 'black', 'darkblue'). Set to 'transparent' for no outline.") 
}).strict()

export const PartitionedShapePropsSchema = z.discriminatedUnion('mode', [
  z.object({ 
    type: z.literal('partitionedShape').describe("Widget type identifier."), 
    width: z.number().positive().describe("Total width in pixels (e.g., 400, 500, 300). Must fit all shapes with spacing."), 
    height: z.number().positive().describe("Total height in pixels (e.g., 300, 400, 300). Must fit all shapes with spacing."), 
    mode: z.literal('partition').describe("Partition mode: shows shapes divided into equal parts for fractions."), 
    shapes: z.array(PartitionShape).describe("Shapes to display. Can mix rectangles and circles. Order determines left-to-right or top-to-bottom placement."), 
    layout: z.enum(['horizontal','vertical']).describe("How to arrange multiple shapes. 'horizontal' places side-by-side, 'vertical' stacks top-to-bottom."), 
    overlays: z.array(LineOverlay).describe("Additional lines to draw over shapes (e.g., to show equivalent fractions). Empty array means no overlays.") 
  }).strict(),
  z.object({ 
    type: z.literal('partitionedShape').describe("Widget type identifier."), 
    width: z.number().positive().describe("Total width in pixels (e.g., 500, 600, 400). Must accommodate the grid."), 
    height: z.number().positive().describe("Total height in pixels (e.g., 400, 500, 350). Must accommodate the grid."), 
    mode: z.literal('geometry').describe("Geometry mode: shows a coordinate grid with polygons and lines."), 
    grid: z.object({ 
      rows: z.number().int().describe("Number of grid rows (e.g., 10, 8, 12). Creates horizontal lines."), 
      columns: z.number().int().describe("Number of grid columns (e.g., 10, 12, 8). Creates vertical lines."), 
      opacity: z.number().describe("Grid line opacity, 0-1 range (e.g., 0.2 for subtle, 0.5 for visible). Lower values emphasize figures.") 
    }).strict().describe("Background grid configuration."), 
    figures: z.array(Figure).describe("Polygons to draw on the grid. Can represent geometric shapes, regions, or areas. Empty array means no figures."), 
    lines: z.array(LineOverlay).describe("Additional line segments on the grid. Useful for diagonals, measurements, or constructions. Empty array means no extra lines.") 
  }).strict(),
]).describe("Creates either fraction partition diagrams or geometric grid diagrams. Partition mode shows shapes divided into equal parts with shading for teaching fractions. Geometry mode provides a coordinate grid for drawing polygons and line segments. Both modes support various visual overlays.")```

Why this helps
- Eliminates schema-level refine and nullables; inputs are explicit, LLM-friendly, and validated by generator where needed.

Generator guidance
- Validate `rows*columns === totalParts` for rectangles in code; throw with descriptive error if violated.


