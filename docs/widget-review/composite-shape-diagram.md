### composite-shape-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`, avoid array min/max; use explicit unions/tuples to forbid invalid states when useful.

Scope
- File: `src/lib/widgets/generators/composite-shape-diagram.ts`
- Purpose: render composite polygon with outer boundary, internal segments, shaded regions, and labels

Current pain points
- Nullable width/height cause fallback sizes.
- Multiple nullable arrays (`internalSegments`, `shadedRegions`, `regionLabels`, `rightAngleMarkers`) complicate rendering logic.
- `outerBoundaryLabels` array-of-nullables with outer array nullable is overly complex.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use empty arrays instead of nullable arrays for optional collections.
- Replace `outerBoundaryLabels: (SideLabel | null)[] | null` with a simple array; use empty string for no label or require explicit `text` with per-edge presence controlled by array length/position.

Schema sketch
```ts
const Point = z.object({ 
  x: z.number().describe("Horizontal coordinate in the SVG space. Can be negative. The shape will be auto-centered, so use coordinates relative to shape's logical center (e.g., -50, 0, 100, 75.5)."),
  y: z.number().describe("Vertical coordinate in the SVG space. Can be negative. Positive y is downward. Shape will be auto-centered (e.g., -30, 0, 50, 80.5).") 
}).strict()

const Label = z.object({ 
  text: z.string().describe("The label text to display (e.g., 'Region A', '45 cm²', '1/2', 'Garden'). Can include math symbols and subscripts."),
  position: z.object({ 
    x: z.number().describe("Horizontal position for the label in the same coordinate system as vertices. Should be inside the relevant region."),
    y: z.number().describe("Vertical position for the label in the same coordinate system as vertices. Place carefully to avoid overlapping with edges.") 
  }).strict() 
}).strict()

const Segment = z.object({ 
  fromVertexIndex: z.number().int().describe("Zero-based index of the starting vertex in the vertices array (e.g., 0, 1, 2). Must be valid index < vertices.length."),
  toVertexIndex: z.number().int().describe("Zero-based index of the ending vertex in the vertices array (e.g., 1, 3, 5). Must be valid index < vertices.length."),
  style: z.enum(['solid','dashed']).describe("Visual style of the line segment. 'solid' for regular lines, 'dashed' for lines indicating hidden/auxiliary edges or different types of boundaries."),
  label: z.string().describe("Text label for this segment's length or name (e.g., '5m', 'x+2', 'base', ''). Empty string shows no label. Positioned at segment midpoint.") 
}).strict()

const ShadedRegion = z.object({ 
  vertexIndices: z.array(z.number().int()).describe("Ordered array of vertex indices forming a closed polygon to shade. Indices are zero-based into vertices array (e.g., [0,1,2,3] for quadrilateral). Min 3 vertices."),
  fillColor: z.string().describe("CSS fill color for this region (e.g., '#FFE5CC' for light peach, 'rgba(0,128,255,0.3)' for translucent blue, 'lightgreen'). Use alpha for overlapping regions.") 
}).strict()

const RightAngleMarker = z.object({ 
  cornerVertexIndex: z.number().int().describe("Zero-based index of the vertex where the right angle is located (the corner point). Must be valid index < vertices.length."),
  adjacentVertex1Index: z.number().int().describe("Zero-based index of first adjacent vertex forming one side of the right angle. Order matters for marker orientation."),
  adjacentVertex2Index: z.number().int().describe("Zero-based index of second adjacent vertex forming other side of the right angle. The angle from vertex1→corner→vertex2 should be 90°.") 
}).strict()

const SideLabel = z.object({ 
  text: z.string().describe("Label for this edge/side of the outer boundary (e.g., '10 cm', 'x', '2a+b', ''). Empty string means no label for this side."),
  offset: z.number().describe("Distance in pixels from the edge to place the label. Positive values place label outside the shape, negative inside (e.g., 15, -10, 20).") 
}).strict()

export const CompositeShapeDiagramPropsSchema = z.object({
  type: z.literal('compositeShapeDiagram').describe("Identifies this as a composite shape diagram widget for complex polygons with internal structure."),
  width: z.number().positive().describe("Total width of the SVG in pixels (e.g., 400, 500, 600). Must accommodate the shape with labels and padding. Shape is auto-centered within."),
  height: z.number().positive().describe("Total height of the SVG in pixels (e.g., 300, 400, 500). Must accommodate the shape with labels and padding. Shape is auto-centered within."),
  vertices: z.array(Point).describe("All vertex points that define the shape and its internal structure. Referenced by index (0-based) in other arrays. Order matters for boundary definition."),
  outerBoundary: z.array(z.number().int()).describe("Ordered vertex indices defining the outer perimeter. Connects vertices in order, closing back to first (e.g., [0,1,2,3,4] for pentagon). Min 3 indices."),
  outerBoundaryLabels: z.array(SideLabel).describe("Labels for outer boundary edges. Array length should match number of edges. First label is for edge from vertex[outerBoundary[0]] to vertex[outerBoundary[1]], etc."),
  internalSegments: z.array(Segment).describe("Line segments inside the shape, dividing it into regions. Empty array means no internal divisions. Can represent diagonals, medians, or partitions."),
  shadedRegions: z.array(ShadedRegion).describe("Polygonal regions to fill with color. Empty array means no shading. Useful for highlighting areas, showing fractions, or distinguishing parts."),
  regionLabels: z.array(Label).describe("Text labels positioned inside regions. Empty array means no labels. Use for area values, region names, or fractions."),
  rightAngleMarkers: z.array(RightAngleMarker).describe("Square markers indicating 90° angles at vertices. Empty array means no markers. Essential for showing perpendicular edges in geometric proofs."),
}).strict().describe("Creates complex composite polygons with internal divisions, shaded regions, and geometric annotations. Perfect for area decomposition problems, geometric proofs, and visualizing how shapes can be divided into parts. Supports right angle markers and both solid and dashed internal segments.")```

Why this helps
- Eliminates size fallbacks and nullable collection branching.
- Simplifies mapping between boundary edges and labels.

Generator guidance
- Treat empty arrays as absence. Validate indices against `vertices.length`.


