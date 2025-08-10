### angle-diagram — Manual Widget Review

Principles: eliminate nullables where possible; width/height required; use discriminated unions to rule out invalid states; no `.default()`, no `.refine()`, no array min/max.

Scope
- File: `src/lib/widgets/generators/angle-diagram.ts`
- Purpose: rays and angle markers with optional right-angle visualization

Current pain points
- Width/height nullable cause fallback rendering.
- Arrays allow wrong vertex counts; `radius` appears alongside right-angle markers.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use tuple for `vertices` and discriminated union for angle variant.
- Keep `point.shape` explicit with an enum.

Schema sketch
```ts
const Point = z.object({
  id: z.string().describe("Unique identifier for this vertex point, used to reference it in rays and angles (e.g., 'A', 'B', 'C', 'vertex1'). Must be unique within the diagram."),
  x: z.number().describe("The horizontal coordinate of the point in the SVG coordinate system. Origin (0,0) is top-left. Positive x moves right (e.g., 100, 250, 50.5)."),
  y: z.number().describe("The vertical coordinate of the point in the SVG coordinate system. Origin (0,0) is top-left. Positive y moves down (e.g., 50, 200, 75.5)."),
  label: z.string().describe("The text label to display next to this point (e.g., 'A', 'B', 'C', 'O' for origin). Can be empty string to show no label. Typically single letters for vertices."),
  shape: z.enum(['circle', 'ellipse']).describe("The shape of the point marker. 'circle' for standard circular points (most common), 'ellipse' for slightly elongated markers. Default style is 'circle'."),
}).strict()

const AngleArc = z.object({
  type: z.literal('arc').describe("Specifies this angle is shown with a curved arc, used for most angles except right angles."),
  vertices: z.tuple([z.string(), z.string(), z.string()]).describe("Exactly three point IDs defining the angle: [point on first ray, vertex point, point on second ray]. The middle ID is the angle vertex. Order matters for angle orientation (e.g., ['A', 'B', 'C'] for angle ABC)."),
  label: z.string().describe("The angle measurement or name to display (e.g., '45°', '90°', 'θ', '∠ABC', 'x'). Position auto-calculated near the arc. Empty string shows no label."),
  color: z.string().describe("CSS color for the angle arc and its label (e.g., '#FF6B6B' for red emphasis, 'blue', 'rgba(0,128,0,0.7)' for translucent green). Should contrast with black rays."),
  radius: z.number().describe("The radius of the angle arc in pixels from the vertex point (e.g., 30, 40, 25). Larger values create wider arcs. Typical range: 20-50 pixels."),
}).strict()

const AngleRight = z.object({
  type: z.literal('right').describe("Specifies this is a right angle (90°), shown with a small square instead of an arc."),
  vertices: z.tuple([z.string(), z.string(), z.string()]).describe("Exactly three point IDs defining the angle: [point on first ray, vertex point, point on second ray]. The middle ID is the angle vertex. Must form a 90° angle."),
  label: z.string().describe("The label for the right angle, typically '90°' or empty. Positioned near the square marker (e.g., '90°', '∟', ''). Empty string shows no label."),
  color: z.string().describe("CSS color for the right angle square and its label (e.g., '#4CAF50' for green, 'black', 'rgba(0,0,255,0.8)' for translucent blue)."),
}).strict()

const Angle = z.discriminatedUnion('type', [AngleArc, AngleRight]).describe("An angle in the diagram, either shown as an arc (for general angles) or a square (for right angles).")

export const AngleDiagramPropsSchema = z.object({
  type: z.literal('angleDiagram').describe("Identifies this as an angle diagram widget for displaying rays, angles, and their measurements."),
  width: z.number().positive().describe("Total width of the SVG in pixels. Should accommodate all points and labels (e.g., 300, 400, 500). Larger for complex diagrams with multiple angles."),
  height: z.number().positive().describe("Total height of the SVG in pixels. Should accommodate all points and angle arcs (e.g., 200, 300, 250). Often similar to width for balanced layouts."),
  points: z.array(Point).describe("All vertex points in the diagram. Each point can be referenced by its ID in rays and angles. At least 2 points needed to form rays."),
  rays: z.array(z.object({ 
    from: z.string().describe("ID of the point where this ray starts. Must match a point.id in the points array (e.g., 'B' for ray starting at point B)."), 
    to: z.string().describe("ID of the point this ray extends through. The ray continues infinitely past this point. Must match a point.id (e.g., 'A' for ray BA).") 
  }).strict()).describe("Line segments that extend infinitely in one direction from their starting point. Used to form angles where rays share a common vertex."),
  angles: z.array(Angle).describe("Angles to highlight in the diagram. Each angle is defined by three points (vertex in middle) and displayed with either an arc or right-angle square."),
}).strict().describe("Creates geometric diagrams showing angles formed by rays meeting at vertices. Essential for angle relationships, measurements, and geometric proofs. Supports both general angles (with arcs) and right angles (with squares).")
```

Why this helps
- Prevents invalid vertex counts and radius/right-angle conflicts at the schema level.
- Removes fallback sizing bugs by requiring explicit dimensions.

Generator guidance
- Render based on `angle.type` branch; assume label/color/radius present per variant.


