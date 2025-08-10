### polyhedron-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; discriminated union for shapes; arrays instead of nulls.

Scope
- Purpose: draw prisms and pyramids with optional diagonals, labels, and shaded face

Current pain points
- Nullable size; nullable arrays for labels/diagonals; nullable shaded face string.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use arrays for `labels`/`diagonals` (empty allowed); `shadedFace` as string (empty means none).

Schema sketch
```ts
const DimensionLabel = z.object({ 
  text: z.string().describe("The label text to display (e.g., '10 cm', 'h = 5', 'length', '8'). Can include units or variable names."), 
  target: z.string().describe("Which dimension to label: 'length', 'width', 'height', 'slantHeight', or face names like 'topFace', 'frontFace', 'baseFace'.") 
}).strict()

const Diagonal = z.object({ 
  fromVertexIndex: z.number().int().describe("Starting vertex index (0-based) for the diagonal. Vertices are numbered systematically by the shape type."), 
  toVertexIndex: z.number().int().describe("Ending vertex index (0-based) for the diagonal. Must be different from fromVertexIndex."), 
  label: z.string().describe("Text label for the diagonal's length (e.g., '12.7 cm', 'd = 15', '√50', ''). Empty string means no label."), 
  style: z.enum(['solid','dashed','dotted']).describe("Visual style of the diagonal. 'solid' for main diagonals, 'dashed' for hidden parts, 'dotted' for construction lines.") 
}).strict()

export const PolyhedronDiagramPropsSchema = z.object({
  type: z.literal('polyhedronDiagram').describe("Identifies this as a 3D polyhedron diagram widget."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate the 3D projection and labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 350, 400, 300). Should fit the isometric view comfortably."),
  shape: z.discriminatedUnion('type', [
    RectangularPrismDataSchema.describe("A box-shaped prism with rectangular faces."), 
    TriangularPrismDataSchema.describe("A prism with triangular bases and rectangular sides."), 
    RectangularPyramidDataSchema.describe("A pyramid with a rectangular base and triangular faces."), 
    TriangularPyramidDataSchema.describe("A pyramid with a triangular base (tetrahedron when regular).")
  ]).describe("The specific 3D shape to render with its dimensions. Each type has different dimension requirements."),
  labels: z.array(DimensionLabel).describe("Dimension labels to display on edges or faces. Empty array means no labels. Can label multiple dimensions and faces."),
  diagonals: z.array(Diagonal).describe("Space diagonals or face diagonals to draw. Empty array means no diagonals. Useful for distance calculations and 3D geometry."),
  shadedFace: z.string().describe("Face identifier to shade/highlight: 'topFace', 'bottomFace', 'frontFace', 'backFace', 'leftFace', 'rightFace', 'baseFace', or ''. Empty string means no shading."),
  showHiddenEdges: z.boolean().describe("Whether to show edges hidden behind the solid as dashed lines. True for mathematical clarity, false for realistic view."),
}).strict().describe("Creates 3D diagrams of prisms and pyramids in isometric projection. Shows vertices, edges, faces with optional labels, diagonals, and face highlighting. Essential for teaching 3D geometry, volume, surface area, and spatial visualization. Supports both solid and wireframe views with hidden edge visibility control.")```

Why this helps
- Removes fallback/nullable branches; inputs are explicit for consistent rendering.

Generator guidance
- Treat empty strings/arrays as “none”; geometry drawing remains unchanged.


