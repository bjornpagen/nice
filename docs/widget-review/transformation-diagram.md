### transformation-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`; avoid array min; discriminated union for transform details.

Scope
- Purpose: polygon pre-image/image with rich annotations (labels, angle marks, side lengths), and transformation aids

Current pain points
- Nullable size, many nullable fields with transforms; `.min(3)` on vertices; optional arrays.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require strings for `label`, `fillColor`, `strokeColor`; arrays non-null (empty allowed); remove array `.min()`.

Schema sketch
```ts
const Vertex = z.object({ 
  x: z.number().describe("X-coordinate of the vertex in diagram space (e.g., 100, 250, -50). Can be negative. Diagram auto-centers all content."), 
  y: z.number().describe("Y-coordinate of the vertex in diagram space (e.g., 150, -100, 75). Positive y is downward. Diagram auto-centers all content.") 
}).strict()

const AngleMark = z.object({ 
  vertexIndex: z.number().describe("Zero-based index of the vertex where angle is marked. Must be valid index into vertices array (e.g., 0, 1, 2)."), 
  radius: z.number().describe("Radius of the angle arc in pixels (e.g., 20, 30, 25). Larger values create wider arcs. Use consistent radius for similar angles."), 
  label: z.string().describe("Angle measurement or name (e.g., '90°', '45°', '∠ABC', 'θ', ''). Empty string shows arc without label. Positioned near the arc."), 
  labelDistance: z.number().describe("Distance from vertex to place the label in pixels (e.g., 40, 50, 35). Should be beyond the arc radius to avoid overlap.") 
}).strict()

const SideLength = z.object({ 
  value: z.string().describe("Length label for this edge (e.g., '5 cm', '3.2', 'x', 'a + b', ''). Empty string means no label. Can include units or expressions."), 
  position: z.enum(['inside','outside']).describe("Where to place the label relative to the shape. 'inside' for interior placement, 'outside' for exterior."), 
  offset: z.number().describe("Distance from the edge in pixels (e.g., 10, 15, 8). Positive values move away from edge in the direction of position.") 
}).strict()

const Shape = z.object({ 
  vertices: z.array(Vertex).describe("Ordered vertices defining the polygon. Connect in sequence, closing to first. Minimum 3 for valid shape. Order determines edge labeling."), 
  label: z.string().describe("Shape identifier (e.g., 'ABCD', 'Figure 1', 'P', 'P\'', ''). Empty string means no label. Positioned near shape's center."), 
  fillColor: z.string().describe("CSS fill color (e.g., 'rgba(100,149,237,0.3)' for translucent blue, 'lightgreen', '#FFE5B4'). Use alpha for see-through shapes."), 
  strokeColor: z.string().describe("CSS color for shape outline (e.g., 'black', '#0000FF', 'darkgreen'). Should contrast with fill and background."), 
  vertexLabels: z.array(z.string()).describe("Labels for each vertex in order (e.g., ['A','B','C','D']). Array length must match vertices length. Empty string skips that vertex label."), 
  angleMarks: z.array(AngleMark).describe("Angle annotations to display. Empty array means no angle marks. Useful for showing congruent angles or measurements."), 
  sideLengths: z.array(SideLength).describe("Edge length labels. First item labels edge from vertex[0] to vertex[1], etc. Array length should match number of edges.") 
}).strict()

const Transformation = z.discriminatedUnion('type', [
  z.object({ type: z.literal('translation'), showVectors: z.boolean().describe("Whether to draw arrows from each pre-image vertex to its image. Visualizes the translation vector.") }).strict(),
  z.object({ type: z.literal('reflection'), lineOfReflection: z.object({ from: Vertex, to: Vertex, style: z.enum(['solid','dashed','dotted']), color: z.string() }).strict().describe("The mirror line for reflection.") }).strict(),
  z.object({ type: z.literal('rotation'), centerOfRotation: Vertex.describe("Fixed point around which rotation occurs."), angle: z.number().describe("Rotation angle in degrees. Positive is counter-clockwise (e.g., 90, -45, 180).") }).strict(),
  z.object({ type: z.literal('dilation'), centerOfDilation: Vertex.describe("Fixed point from which scaling occurs."), showRays: z.boolean().describe("Whether to draw rays from center through corresponding vertices. Shows scaling direction.") }).strict(),
]).describe("The transformation type and its specific parameters. The system calculates the image position automatically.")

export const TransformationDiagramPropsSchema = z.object({
  type: z.literal('transformationDiagram').describe("Identifies this as a transformation diagram showing geometric transformations with detailed annotations."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 600, 700, 500). Must accommodate both shapes, labels, and transformation elements."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 500, 600, 400). Should fit pre-image, image, and any transformation aids."),
  preImage: Shape.describe("The original shape before transformation. All properties (vertices, labels, angles, sides) are preserved in the transformation."),
  image: Shape.describe("The transformed shape. Must have same number of vertices as preImage. Properties show the result after transformation."),
  transformation: Transformation.describe("Details of how preImage transforms to image. Include visual aids like vectors, reflection lines, or rotation centers."),
  additionalPoints: z.array(z.object({ 
    x: z.number(), 
    y: z.number(), 
    label: z.string().describe("Point label (e.g., 'O', 'Center', 'C'). Positioned near the point."), 
    style: z.enum(['dot','circle']).describe("Visual style. 'dot' for filled point, 'circle' for hollow point.") 
  }).strict()).describe("Extra labeled points (e.g., rotation center, reference points). Empty array means no additional points."),
}).strict().describe("Creates detailed geometric transformation diagrams showing pre-image and image shapes with comprehensive annotations including vertex labels, angle marks, side lengths, and transformation-specific visual aids. Perfect for teaching reflections, rotations, translations, and dilations with full mathematical notation.")```

Why this helps
- Eliminates nullable/transforms; keeps powerful union-based transform model; avoids unsupported array constraints.

Generator guidance
- Validate `vertices.length >= 3`; ensure label array lengths match vertices; throw descriptive errors.


