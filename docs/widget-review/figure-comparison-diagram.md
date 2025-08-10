### figure-comparison-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`, no array min/max where possible.

Scope
- File: `src/lib/widgets/generators/figure-comparison-diagram.ts`
- Purpose: compare multiple polygonal figures with labels and styling

Current pain points
- Nullable width/height cause fallbacks.
- Many nullable style/label fields; side labels array-of-nullables.
- `figures` has min(1); avoid per constraints.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `layout`, `spacing`.
- Make figure-level styling explicit; use empty arrays for absent labels.

Schema sketch
```ts
const Point = z.object({ 
  x: z.number().describe("Horizontal coordinate relative to figure's local origin. Can be negative. Figure will be auto-positioned within the layout (e.g., -30, 0, 50, 25.5)."), 
  y: z.number().describe("Vertical coordinate relative to figure's local origin. Can be negative. Positive y is downward (e.g., -20, 0, 40, 15.5).") 
}).strict()

const Figure = z.object({
  vertices: z.array(Point).describe("Ordered array of vertices defining the polygon. Connect in order, closing back to first. Minimum 3 vertices for a valid polygon (e.g., triangle, square, pentagon)."),
  fillColor: z.string().describe("CSS fill color for the polygon interior (e.g., '#E8F4FD' for light blue, 'transparent' for outline only, 'rgba(255,200,0,0.3)' for translucent yellow)."),
  strokeColor: z.string().describe("CSS color for the polygon's border (e.g., 'black', '#333333', 'darkblue'). Set to 'transparent' to hide the outline."),
  strokeWidth: z.number().describe("Width of the polygon's border in pixels (e.g., 2 for standard, 3 for bold, 1 for thin). Use 0 for no visible border."),
  sideLabels: z.array(z.string()).describe("Labels for each edge of the polygon. Array length should match vertex count. First label is for edge from vertex[0] to vertex[1]. Empty string for no label on that edge."),
  sideLabelOffset: z.number().describe("Distance in pixels from edge to place side labels. Positive places outside, negative inside (e.g., 15, -10, 20). Applies to all side labels."),
  figureLabel: z.object({ 
    text: z.string().describe("Main label for the entire figure (e.g., 'Figure A', 'Original', 'Square', '64 cm²'). Can include math notation or symbols."), 
    position: z.enum(['top','bottom','left','right','center']).describe("Where to place the label relative to the figure. 'center' places inside the polygon, others place outside."), 
    offset: z.number().describe("Additional spacing in pixels from the figure's edge or center (e.g., 10, 20, 5). For 'center', this has no effect.") 
  }).strict().describe("Configuration for the figure's main identifying label."),
}).strict()

export const FigureComparisonDiagramPropsSchema = z.object({
  type: z.literal('figureComparisonDiagram').describe("Identifies this as a figure comparison diagram for displaying multiple polygons side by side."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 600, 800, 500). Must accommodate all figures with spacing and labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 400, 300, 500). Must accommodate all figures with spacing and labels."),
  figures: z.array(Figure).describe("Array of polygonal figures to display. Can show different shapes or same shape with different properties. Order determines left-to-right or top-to-bottom placement."),
  layout: z.enum(['horizontal','vertical']).describe("Arrangement direction. 'horizontal' places figures left to right. 'vertical' stacks figures top to bottom. Choose based on figure count and aspect ratios."),
  spacing: z.number().describe("Gap between figures in pixels (e.g., 50, 80, 30). Provides visual separation. Larger spacing prevents label overlap."),
}).strict().describe("Creates a comparison view of multiple polygonal figures with comprehensive labeling options. Perfect for showing transformations, comparing shapes, demonstrating congruence/similarity, or analyzing different polygons. Each figure can have different styling and complete edge/vertex labeling.")```

Why this helps
- Prevents rendering fallbacks and conditional styling branches.
- Clarifies labels and layout explicitly.

Generator guidance
- Treat missing labels by using empty arrays; compute offsets as provided.


