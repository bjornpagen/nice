### shape-transformation-graph — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no array min/max; unions for transformations.

Scope
- Purpose: show pre-image polygon and transformed image on a coordinate plane with optional points

Current pain points
- Nullable size; `.min(3)` on vertices; nullable color/label; nullable points.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use non-null arrays; omit `.min(3)` and validate in generator (must form a polygon with 3+ vertices).
- Require `color` and `label` as strings (empty allowed if unused).
- Require `points` as array (can be empty).

Schema sketch
```ts
const Vertex = z.object({ 
  x: z.number().describe("X-coordinate of the vertex in the coordinate plane (e.g., -3, 0, 5, 2.5). Can be any real number within axis bounds."), 
  y: z.number().describe("Y-coordinate of the vertex in the coordinate plane (e.g., 4, -2, 0, 3.5). Can be any real number within axis bounds.") 
}).strict()

const Polygon = z.object({ 
  vertices: z.array(Vertex).describe("Ordered array of vertices defining the polygon. Connect in sequence, closing back to first. Minimum 3 vertices for valid polygon. Order affects appearance."), 
  color: z.string().describe("CSS fill color for the polygon (e.g., '#4472C4' for blue, 'rgba(255,0,0,0.3)' for translucent red, 'lightgreen'). Use alpha for transparency."), 
  label: z.string().describe("Text label for the shape (e.g., 'A', 'Original', 'Pre-image', ''). Empty string means no label. Positioned at shape's centroid.") 
}).strict()

const Transform = z.discriminatedUnion('type', [
  z.object({ 
    type: z.literal('translation').describe("Slide transformation moving all points by a fixed vector."), 
    vector: z.object({ 
      x: z.number().describe("Horizontal translation distance. Positive moves right, negative moves left (e.g., 5, -3, 0)."), 
      y: z.number().describe("Vertical translation distance. Positive moves up, negative moves down (e.g., -2, 4, 0).") 
    }).strict().describe("The displacement vector for the translation.") 
  }).strict(),
  z.object({ 
    type: z.literal('reflection').describe("Flip transformation across an axis."), 
    axis: z.enum(['x','y']).describe("The axis of reflection. 'x' reflects across x-axis (horizontal), 'y' reflects across y-axis (vertical).") 
  }).strict(),
  z.object({ 
    type: z.literal('rotation').describe("Turn transformation around a fixed point."), 
    center: Vertex.describe("The center point of rotation. Shape rotates around this point, which remains fixed."), 
    angle: z.number().describe("Rotation angle in degrees. Positive is counter-clockwise, negative is clockwise (e.g., 90, -45, 180, 270).") 
  }).strict(),
  z.object({ 
    type: z.literal('dilation').describe("Scaling transformation from a center point."), 
    center: Vertex.describe("The center of dilation. Points move toward (scale < 1) or away from (scale > 1) this point."), 
    scaleFactor: z.number().describe("The scaling factor. Values > 1 enlarge, 0 < values < 1 shrink, negative values enlarge and flip (e.g., 2, 0.5, -1, 3).") 
  }).strict(),
])

export const ShapeTransformationGraphPropsSchema = z.object({
  type: z.literal('shapeTransformationGraph').describe("Identifies this as a shape transformation graph showing geometric transformations on a coordinate plane."),
  width: z.number().positive().describe("Total width of the coordinate plane in pixels (e.g., 500, 600, 400). Should accommodate both shapes and labels."),
  height: z.number().positive().describe("Total height of the coordinate plane in pixels (e.g., 500, 600, 400). Often equal to width for square grid."),
  xAxis: createAxisOptionsSchema().describe("Configuration for the horizontal axis including range, ticks, and grid. Should encompass both pre-image and image."),
  yAxis: createAxisOptionsSchema().describe("Configuration for the vertical axis including range, ticks, and grid. Should encompass both pre-image and image."),
  showQuadrantLabels: z.boolean().describe("Whether to display Roman numerals (I, II, III, IV) in quadrants. Helps identify shape positions and transformation effects."),
  preImage: Polygon.describe("The original shape before transformation. Usually shown in a distinct color. This is the shape that gets transformed."),
  transformation: Transform.describe("The geometric transformation to apply. The system automatically calculates and displays the resulting image shape."),
  points: z.array(createPlotPointSchema()).describe("Additional points to plot (e.g., center of rotation, reference points). Empty array means no extra points. Useful for marking key locations."),
}).strict().describe("Displays geometric transformations on a coordinate plane, showing both the original shape (pre-image) and the transformed shape (image). Supports translations, reflections, rotations, and dilations. Essential for teaching transformation geometry, symmetry, and coordinate geometry concepts.")```

Why this helps
- Removes unsupported array min and nullable branches; keeps a clean discriminated union for transforms.

Generator guidance
- Validate `preImage.vertices.length >= 3` at runtime and throw if not.


