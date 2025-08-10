### polyhedron-net-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`; discriminated unions for base shapes; avoid nullable lateralHeight by modeling per-type.

Scope
- Purpose: generate 2D nets for prisms/pyramids from base dimensions

Current pain points
- Nullable size; `lateralHeight` nullable; shared dimensions object that mixes type-specific requirements.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Split dimensions by `polyhedronType` using a top-level discriminated union, so each variant requires exactly the needed fields.

Schema sketch
```ts
const SquareBase = z.object({ 
  type: z.literal('square').describe("Specifies a square base shape."), 
  side: z.number().describe("Side length of the square in arbitrary units (e.g., 5, 8, 6.5). All four sides are equal.") 
}).strict()

const RectangleBase = z.object({ 
  type: z.literal('rectangle').describe("Specifies a rectangular base shape."), 
  length: z.number().describe("Length of the rectangle in arbitrary units (e.g., 8, 10, 5.5). The longer dimension by convention."), 
  width: z.number().describe("Width of the rectangle in arbitrary units (e.g., 4, 6, 3). The shorter dimension by convention.") 
}).strict()

const TriangleBase = z.object({ 
  type: z.literal('triangle').describe("Specifies a triangular base shape."), 
  base: z.number().describe("Base length of the triangle in arbitrary units (e.g., 6, 8, 5). The bottom edge in standard orientation."), 
  height: z.number().describe("Perpendicular height of the triangle in arbitrary units (e.g., 4, 5, 3.5). From base to opposite vertex."), 
  side1: z.number().describe("Length of the first non-base side in arbitrary units (e.g., 5, 7, 4.5). Must satisfy triangle inequality."), 
  side2: z.number().describe("Length of the second non-base side in arbitrary units (e.g., 5, 7, 4.5). Must satisfy triangle inequality.") 
}).strict()

const PentagonBase = z.object({ 
  type: z.literal('pentagon').describe("Specifies a regular pentagon base shape."), 
  side: z.number().describe("Side length of the regular pentagon in arbitrary units (e.g., 4, 6, 3.5). All five sides are equal.") 
}).strict()

const Cube = z.object({ 
  polyhedronType: z.literal('cube').describe("A cube net with 6 identical square faces in cross pattern."), 
  width: z.number().positive().describe("Total width of the net diagram in pixels (e.g., 400, 500, 350). Must fit the unfolded cross pattern."), 
  height: z.number().positive().describe("Total height of the net diagram in pixels (e.g., 400, 500, 350). Usually similar to width for cubes."), 
  base: SquareBase.describe("Dimensions of the square faces. All 6 faces are identical squares."), 
  showLabels: z.boolean().describe("Whether to show edge measurements on the net. True adds dimension labels for calculation exercises.") 
}).strict()

const RectPrism = z.object({ 
  polyhedronType: z.literal('rectangularPrism').describe("A rectangular prism net with 6 rectangular faces (3 pairs)."), 
  width: z.number().positive().describe("Total width of the net diagram in pixels (e.g., 500, 600, 400). Must fit the unfolded pattern."), 
  height: z.number().positive().describe("Total height of the net diagram in pixels (e.g., 300, 400, 350). Depends on face arrangement."), 
  base: RectangleBase.describe("Dimensions of the rectangular base. Top and bottom faces use these dimensions."), 
  lateralHeight: z.number().describe("Height of the prism in arbitrary units (e.g., 5, 8, 6). The vertical dimension when standing on base."), 
  showLabels: z.boolean().describe("Whether to show dimension labels. True helps with surface area calculations.") 
}).strict()

const TriPrism = z.object({ 
  polyhedronType: z.literal('triangularPrism').describe("A triangular prism net with 2 triangular faces and 3 rectangular faces."), 
  width: z.number().positive().describe("Total width of the net diagram in pixels (e.g., 500, 600, 450). Must accommodate the strip layout."), 
  height: z.number().positive().describe("Total height of the net diagram in pixels (e.g., 300, 350, 400). Fits triangular bases above/below."), 
  base: TriangleBase.describe("Dimensions of the triangular base. Both triangular faces use these dimensions."), 
  lateralHeight: z.number().describe("Height/length of the prism in arbitrary units (e.g., 6, 10, 7.5). Length of the rectangular faces."), 
  showLabels: z.boolean().describe("Whether to display edge measurements. Useful for surface area problems.") 
}).strict()

const SquarePyr = z.object({ 
  polyhedronType: z.literal('squarePyramid').describe("A square pyramid net with 1 square base and 4 triangular faces."), 
  width: z.number().positive().describe("Total width of the net diagram in pixels (e.g., 400, 500, 450). Must fit the star-like pattern."), 
  height: z.number().positive().describe("Total height of the net diagram in pixels (e.g., 400, 500, 450). Usually similar to width."), 
  base: SquareBase.describe("Dimensions of the square base. The central square in the net."), 
  lateralHeight: z.number().describe("Slant height of the triangular faces in arbitrary units (e.g., 6, 8, 7). From base edge to apex."), 
  showLabels: z.boolean().describe("Whether to label dimensions. Important for distinguishing base edges from slant heights.") 
}).strict()

const TriPyr = z.object({ 
  polyhedronType: z.literal('triangularPyramid').describe("A triangular pyramid (tetrahedron) net with 4 triangular faces."), 
  width: z.number().positive().describe("Total width of the net diagram in pixels (e.g., 400, 450, 500). Must fit the triangular arrangement."), 
  height: z.number().positive().describe("Total height of the net diagram in pixels (e.g., 350, 400, 450). Depends on triangle arrangement."), 
  base: TriangleBase.describe("Dimensions of the base triangle. Other faces are calculated from these and lateralHeight."), 
  lateralHeight: z.number().describe("Height from base edges to apex in arbitrary units (e.g., 5, 7, 6). Determines lateral face dimensions."), 
  showLabels: z.boolean().describe("Whether to show measurements. Helps identify which edges connect when folded.") 
}).strict()

const PentPyr = z.object({ 
  polyhedronType: z.literal('pentagonalPyramid').describe("A pentagonal pyramid net with 1 pentagon base and 5 triangular faces."), 
  width: z.number().positive().describe("Total width of the net diagram in pixels (e.g., 450, 550, 500). Must fit the flower-like pattern."), 
  height: z.number().positive().describe("Total height of the net diagram in pixels (e.g., 450, 550, 500). Usually similar to width."), 
  base: PentagonBase.describe("Dimensions of the regular pentagon base. The central pentagon in the net."), 
  lateralHeight: z.number().describe("Slant height of triangular faces in arbitrary units (e.g., 5, 7, 6.5). From base edge to apex."), 
  showLabels: z.boolean().describe("Whether to display edge labels. Useful for surface area and folding exercises.") 
}).strict()

export const PolyhedronNetDiagramPropsSchema = z.discriminatedUnion('polyhedronType', [Cube, RectPrism, TriPrism, SquarePyr, TriPyr, PentPyr])
  .describe("Creates 2D nets (unfolded patterns) of 3D polyhedra. Each net shows how faces connect and can be folded to form the 3D shape. Essential for teaching surface area, 3D visualization, and spatial reasoning. The polyhedronType determines which specific shape and net pattern to generate.")```

Why this helps
- Eliminates nullable `lateralHeight` and size fallbacks; each variant has a precise, minimal contract the LLM can satisfy.

Generator guidance
- Keep runtime guards for geometric consistency; variant shape logic remains as-is.


