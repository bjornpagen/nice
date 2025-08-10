### pentagon-intersection-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; explicit lengths on arrays where necessary avoided (no array min/max), but keep fixed-size pentagon via description.

Scope
- Purpose: draw pentagon vertices, intersection lines, and KA-style angle arcs

Current pain points
- Nullable size fallbacks.
- `.length(5)` constraint on pentagon points—avoid array length constraints; rely on generator validation.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Accept `pentagonPoints` as array; validate length 5 in generator.

Schema sketch
```ts
const Point = z.object({ 
  id: z.string().describe("Unique identifier for this vertex (e.g., 'A', 'B', 'C', 'D', 'E'). Used to reference in intersection lines. Must be unique."), 
  x: z.number().describe("X-coordinate of the vertex in SVG space (e.g., 200, 150, 250). Pentagon will be centered in the diagram."), 
  y: z.number().describe("Y-coordinate of the vertex in SVG space (e.g., 50, 100, 200). Positive y is downward in SVG.") 
}).strict()

const KAArc = z.object({ 
  startX: z.number().describe("X-coordinate where the arc begins (e.g., 150, 200, 175.5). Usually on or near a line segment."), 
  startY: z.number().describe("Y-coordinate where the arc begins (e.g., 100, 150, 125.5). Defines the arc's starting point."), 
  rx: z.number().describe("Horizontal radius of the elliptical arc in pixels (e.g., 20, 30, 25). Controls arc width."), 
  ry: z.number().describe("Vertical radius of the elliptical arc in pixels (e.g., 20, 30, 25). Often equals rx for circular arcs."), 
  xAxisRotation: z.number().describe("Rotation of the ellipse in degrees (e.g., 0, 45, -30). Usually 0 for simple angle arcs."), 
  largeArcFlag: z.number().describe("SVG arc flag: 0 for small arc (<180°), 1 for large arc (>180°). Typically 0 for angle markers."), 
  sweepFlag: z.number().describe("SVG sweep direction: 0 for counter-clockwise, 1 for clockwise. Determines arc direction."), 
  endDeltaX: z.number().describe("X-offset from start to end point (e.g., 15, -10, 20). End point = (startX + endDeltaX, startY + endDeltaY)."), 
  endDeltaY: z.number().describe("Y-offset from start to end point (e.g., 10, -15, 5). Defines where the arc ends relative to start."), 
  label: z.string().describe("Text label for the angle (e.g., '72°', '36°', 'α', ''). Empty string shows arc without label. Positioned near the arc."), 
  color: z.string().describe("CSS color for the arc and its label (e.g., '#FF6B6B' for red, 'blue', 'green'). Different colors distinguish angle types.") 
}).strict()

export const PentagonIntersectionDiagramPropsSchema = z.object({
  type: z.literal('pentagonIntersectionDiagram').describe("Identifies this as a pentagon intersection diagram showing internal angle relationships."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate the pentagon and labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 400, 500, 350). Pentagon is centered within these bounds."),
  pentagonPoints: z.array(Point).describe("Exactly 5 points defining the pentagon vertices in order. Connect sequentially to form the pentagon. Generator validates count = 5."),
  intersectionLines: z.array(z.object({ 
    from: z.string().describe("ID of the starting vertex for this diagonal. Must match a point.id in pentagonPoints (e.g., 'A', 'B')."), 
    to: z.string().describe("ID of the ending vertex for this diagonal. Must match a point.id in pentagonPoints (e.g., 'C', 'D').") 
  }).strict()).describe("Diagonal lines connecting non-adjacent vertices. Creates the internal star pattern. Empty array shows just the pentagon outline."),
  khanArcs: z.array(KAArc).describe("Angle arcs using Khan Academy's style. Empty array means no angle markers. Uses SVG elliptical arc notation for precise control."),
}).strict().describe("Creates a regular pentagon with optional diagonal lines forming a pentagram (5-pointed star) pattern. Shows interior angles (108°) and star point angles (36°) with customizable arc markers. Essential for teaching polygon angle sums, symmetry, and golden ratio relationships in pentagons.")```

Why this helps
- Removes size fallbacks and schema-level fixed length; generator enforces exactly five points.

Generator guidance
- Throw with explicit message if `pentagonPoints.length !== 5`.


