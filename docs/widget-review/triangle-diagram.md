### triangle-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`; avoid array min; enforce fixed-length tuples where conceptually fixed.

Scope
- Purpose: render triangle with sides, angles, internal lines, shaded regions

Current pain points
- Nullable size; `.min(3)` on arrays; nullable labels/colors; nullable collections.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use arrays (empty allowed) for `sides`, `angles`, `internalLines`, `shadedRegions`.
- Use tuples for vertex counts where fixed: side vertices as 2-tuple; angle vertices as 3-tuple.
- Require strings for labels/colors; numeric fields explicit.

Schema sketch
```ts
const Point = z.object({ 
  id: z.string().describe("Unique identifier for this vertex (e.g., 'A', 'B', 'C', 'P', 'M'). Used to reference in sides, angles, etc. Must be unique."), 
  x: z.number().describe("X-coordinate of the point in diagram space (e.g., 100, 250, 50). Can be negative. Diagram auto-centers all content."), 
  y: z.number().describe("Y-coordinate of the point in diagram space (e.g., 50, 200, 150). Positive y is downward. Diagram auto-centers all content."), 
  label: z.string().describe("Text label displayed near the point (e.g., 'A', 'P', 'M₁', ''). Empty string means no label. Typically single letter or letter with subscript.") 
}).strict()

const Side = z.object({ 
  vertices: z.tuple([z.string(), z.string()]).describe("Exactly two point IDs defining this side's endpoints (e.g., ['A','B'] for side AB). Order matters for labeling position."), 
  label: z.string().describe("Length label for this side (e.g., '5', '3.2 cm', 'a', '√2', ''). Empty string means no label. Positioned at midpoint of side."), 
  tickMarks: z.number().int().describe("Number of tick marks showing congruence (0 = no marks, 1 = single mark, 2 = double marks, etc.). Same count indicates congruent sides.") 
}).strict()

const Angle = z.object({ 
  vertices: z.tuple([z.string(), z.string(), z.string()]).describe("Exactly three point IDs: [point-on-first-ray, vertex, point-on-second-ray] (e.g., ['A','B','C'] for angle ABC). Middle ID is the angle vertex."), 
  label: z.string().describe("Angle measurement or name (e.g., '45°', '90°', 'θ', '∠ABC', 'x', ''). Empty string shows arc without label."), 
  color: z.string().describe("CSS color for the angle arc (e.g., '#FF6B6B' for red, 'blue', 'green'). Different colors distinguish multiple angles."), 
  radius: z.number().describe("Radius of the angle arc in pixels (e.g., 25, 30, 20). Larger radii for outer angles when multiple angles share a vertex."), 
  isRightAngle: z.boolean().describe("If true, shows a square corner instead of arc to indicate 90°. Overrides arc display."), 
  showArc: z.boolean().describe("Whether to display the angle arc/square. False shows only the label without visual marker.") 
}).strict()

const InternalLine = z.object({ 
  from: z.string().describe("Starting point ID for the line segment. Must match a point.id in points array (e.g., 'A', 'M')."), 
  to: z.string().describe("Ending point ID for the line segment. Must match a point.id in points array (e.g., 'D', 'P')."), 
  style: z.enum(['solid','dashed','dotted']).describe("Visual style of the line. 'solid' for main elements, 'dashed' for auxiliary lines, 'dotted' for reference lines.") 
}).strict()

const ShadedRegion = z.object({ 
  vertices: z.array(z.string()).describe("Ordered point IDs defining the region to shade. Connect in sequence to form closed polygon (e.g., ['A','B','M'] for triangle ABM). Min 3 points."), 
  color: z.string().describe("CSS fill color with transparency (e.g., 'rgba(255,0,0,0.2)' for light red, 'rgba(0,128,255,0.3)' for light blue). Use alpha < 0.5 for transparency.") 
}).strict()

export const TriangleDiagramPropsSchema = z.object({
  type: z.literal('triangleDiagram').describe("Identifies this as a triangle diagram widget for geometric constructions and proofs."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate the triangle and all labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 350, 400, 300). Should fit the triangle with comfortable padding."),
  points: z.array(Point).describe("All vertices used in the diagram. Must include at least 3 points to form the main triangle. Can include additional points for constructions."),
  sides: z.array(Side).describe("Side annotations with labels and congruence marks. Empty array means no side labels. Order doesn't affect display."),
  angles: z.array(Angle).describe("Angle annotations with arcs, labels, and optional right-angle markers. Empty array means no angle marks."),
  internalLines: z.array(InternalLine).describe("Additional line segments like altitudes, medians, or angle bisectors. Empty array means no internal lines."),
  shadedRegions: z.array(ShadedRegion).describe("Regions to fill with translucent color. Empty array means no shading. Useful for highlighting areas or showing equal regions."),
}).strict().describe("Creates triangle diagrams with comprehensive geometric annotations including side lengths, angles, tick marks for congruence, internal lines (altitudes, medians), and shaded regions. Perfect for geometric proofs, constructions, and teaching triangle properties. Supports multiple triangles and complex constructions through flexible point system.")```

Why this helps
- Eliminates nullable branches and unsupported array min; tuples encode exact vertex counts for AI clarity.

Generator guidance
- Validate at runtime that at least 3 distinct point ids form the main triangle; guard invalid indices.


