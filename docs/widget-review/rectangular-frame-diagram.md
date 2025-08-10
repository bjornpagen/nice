### rectangular-frame-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; arrays not null.

Scope
- Purpose: 3D hollow rectangular frame; labels, diagonals, shaded face, toggle hidden edges

Current pain points
- Nullable size; nullable arrays for `labels`/`diagonals`; nullable `shadedFace`.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use arrays for `labels` and `diagonals` (empty allowed). Make `shadedFace` a string (empty = none).

Schema sketch
```ts
const DimensionLabel = z.object({ 
  text: z.string().describe("The measurement or label text (e.g., '10 cm', '5 m', 'length', 'Area = 50 cm²'). Can include units and mathematical expressions."), 
  target: z.string().describe("Which dimension or face to label: 'height', 'width', 'length', 'thickness', 'top_face', 'front_face', 'side_face', 'bottom_face', 'back_face', 'inner_face'.") 
}).strict()

const Diagonal = z.object({ 
  fromVertexIndex: z.number().int().describe("Starting vertex index (0-based) for the diagonal. Vertices numbered 0-7: outer corners first (0-3), then inner corners (4-7)."), 
  toVertexIndex: z.number().int().describe("Ending vertex index (0-based) for the diagonal. Must be different from fromVertexIndex. Can connect any two vertices."), 
  label: z.string().describe("Text label for the diagonal's length (e.g., '15 cm', 'd = 13', '√50', ''). Empty string means no label. Positioned at midpoint."), 
  style: z.enum(['solid','dashed','dotted']).describe("Visual style of the diagonal line. 'solid' for main diagonals, 'dashed' for auxiliary lines, 'dotted' for reference lines.") 
}).strict()

export const RectangularFrameDiagramPropsSchema = z.object({
  type: z.literal('rectangularFrameDiagram').describe("Identifies this as a 3D rectangular frame (hollow box) diagram."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 500, 600, 400). Must accommodate the 3D projection and labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 400, 500, 350). Should fit the isometric view comfortably."),
  outerLength: z.number().describe("Outer depth/length of the frame in units (e.g., 10, 8, 12.5). The z-axis dimension extending into the page."),
  outerWidth: z.number().describe("Outer width of the frame in units (e.g., 6, 10, 7.5). The horizontal dimension across the front face."),
  outerHeight: z.number().describe("Outer height of the frame in units (e.g., 4, 8, 5). The vertical dimension of the frame."),
  thickness: z.number().describe("Wall thickness of the hollow frame in units (e.g., 0.5, 1, 2). Subtracts from outer dimensions to create inner cavity."),
  labels: z.array(DimensionLabel).describe("Labels for edges and faces. Empty array means no labels. Can label dimensions, areas, or custom text on specific parts."),
  diagonals: z.array(Diagonal).describe("Internal diagonal lines between vertices. Empty array means no diagonals. Useful for showing space diagonals or cross-sections."),
  shadedFace: z.string().describe("Face identifier to shade/highlight: 'top_face', 'bottom_face', 'front_face', 'back_face', 'left_face', 'right_face', or ''. Empty string means no shading."),
  showHiddenEdges: z.boolean().describe("Whether to show edges hidden behind the frame as dashed lines. True for mathematical clarity, false for realistic view."),
}).strict().describe("Creates a 3D hollow rectangular frame (box with walls) in isometric projection. Shows inner and outer dimensions with wall thickness. Perfect for volume problems involving hollow objects, surface area of boxes with cavities, or structural engineering concepts. Supports face shading and space diagonals.")```

Why this helps
- Eliminates size fallbacks and nullable branching; inputs are explicit and AI-friendly.


