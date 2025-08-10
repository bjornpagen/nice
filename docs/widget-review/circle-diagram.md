### circle-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`, no array min/max; explicit styling.

Scope
- File: `src/lib/widgets/generators/circle-diagram.ts`
- Purpose: render circle/semicircle/quarter-circle with sectors, arcs, segments

Current pain points
- Nullable width/height -> fallback sizes.
- Numerous color/toggle nullables introduce generator defaults.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Make `shape`, `rotation`, `fillColor`, `strokeColor`, `showCenterDot` required.
- For optional arrays (`segments`, `sectors`, `arcs`), accept empty arrays instead of null.

Schema sketch
```ts
const Segment = z.object({ 
  type: z.enum(['radius','diameter']).describe("Type of line segment. 'radius' draws from center to edge. 'diameter' draws across the full circle through center."),
  label: z.string().describe("Text label for the segment (e.g., 'r', 'd', '5 cm', 'radius = 3'). Empty string shows no label. Positioned along the segment."),
  color: z.string().describe("CSS color for the segment line (e.g., '#333333' for dark gray, 'red', 'rgba(0,0,255,0.8)'). Should contrast with circle fill."),
  angle: z.number().describe("Angle in degrees for radius placement or diameter orientation. 0° is rightward, 90° is upward, 180° is leftward, 270° is downward.") 
}).strict()

const Sector = z.object({ 
  startAngle: z.number().describe("Starting angle in degrees for the sector arc. 0° is rightward (3 o'clock), angles increase counter-clockwise (e.g., 0, 45, 90, 180)."),
  endAngle: z.number().describe("Ending angle in degrees for the sector arc. Must be greater than startAngle. Full circle is 0 to 360 (e.g., 90, 180, 270, 360)."),
  fillColor: z.string().describe("CSS fill color for the sector/wedge (e.g., '#FFE5B4' for peach, 'lightblue', 'rgba(255,0,0,0.3)' for translucent red). Creates pie-slice effect."),
  label: z.string().describe("Text label for the sector (e.g., '90°', '1/4', '25%', 'A'). Empty string shows no label. Positioned inside the sector near the arc."),
  showRightAngleMarker: z.boolean().describe("Whether to show a small square marker if this sector forms a 90° angle. Only meaningful when endAngle - startAngle = 90.") 
}).strict()

const Arc = z.object({ 
  startAngle: z.number().describe("Starting angle in degrees for the arc. 0° is rightward, increases counter-clockwise (e.g., 0, 30, 45, 90)."),
  endAngle: z.number().describe("Ending angle in degrees for the arc. Must be greater than startAngle (e.g., 90, 180, 270, 360). Arc is drawn counter-clockwise."),
  strokeColor: z.string().describe("CSS color for the arc line (e.g., '#FF6B6B' for red, 'blue', 'green'). Should be visible against background and sectors."),
  label: z.string().describe("Text label for the arc length or angle (e.g., '90°', 'πr', 's = 5'). Empty string shows no label. Positioned along the arc.") 
}).strict()

export const CircleDiagramPropsSchema = z.object({
  type: z.literal('circleDiagram').describe("Identifies this as a circle diagram widget for geometric circle visualizations."),
  shape: z.enum(['circle','semicircle','quarter-circle']).describe("The base shape. 'circle' is full 360°, 'semicircle' is 180° half-circle, 'quarter-circle' is 90° quadrant. Determines visible portion."),
  rotation: z.number().describe("Overall rotation of the shape in degrees. 0 means no rotation. For semicircle: 0 = flat side down, 90 = flat side left. Positive rotates counter-clockwise."),
  width: z.number().positive().describe("Total width of the SVG in pixels (e.g., 300, 400, 250). Must accommodate the circle plus any labels. For non-circles, includes the full bounding box."),
  height: z.number().positive().describe("Total height of the SVG in pixels (e.g., 300, 400, 250). Should typically equal width for circles to maintain aspect ratio."),
  radius: z.number().positive().describe("Outer radius of the circle in pixels (e.g., 100, 120, 80). This is the main circle size. For annulus, this is the outer edge."),
  fillColor: z.string().describe("CSS fill color for the main circle area (e.g., '#E8F4FD' for light blue, 'white', 'transparent', 'rgba(255,255,0,0.2)'). Use 'transparent' for outline only."),
  strokeColor: z.string().describe("CSS color for the circle's border/outline (e.g., 'black', '#333333', 'darkblue'). Set to 'transparent' or match fillColor for no visible border."),
  innerRadius: z.number().positive().describe("Inner radius for annulus (ring) shape in pixels (e.g., 50, 60, 40). Must be less than radius. Creates a donut when annulusFillColor is set. Use 0 for no hole."),
  annulusFillColor: z.string().describe("CSS fill color for the annulus/ring area between innerRadius and radius (e.g., '#FFE5B4', 'lightgray'). Empty string means no annulus visualization."),
  segments: z.array(Segment).describe("Line segments (radii or diameters) to draw. Empty array means no segments. Use for showing radius/diameter measurements or dividing the circle."),
  sectors: z.array(Sector).describe("Filled wedge sections (pie slices) of the circle. Empty array means no sectors. Useful for fractions, angles, and pie charts."),
  arcs: z.array(Arc).describe("Curved arc segments along the circle's circumference. Empty array means no arcs. Use for showing arc length, angles, or partial perimeters."),
  showCenterDot: z.boolean().describe("Whether to display a small dot at the circle's center point. Helps identify the center for geometric constructions."),
  areaLabel: z.string().describe("Label for the total area, displayed inside the circle (e.g., 'A = πr²', 'Area = 78.5 cm²', '314 sq units'). Empty string shows no area label."),
}).strict().describe("Creates geometric circle diagrams with optional sectors, segments, and arcs. Supports full circles, semicircles, and quarter-circles. Essential for geometry lessons on circumference, area, angles, and fractions. Can create pie charts, angle measurements, and annulus (ring) shapes.")```

Why this helps
- Avoids layout/styling fallbacks; all inputs are explicit and predictable.
- Replaces nullable arrays with simple empty arrays when not used.

Generator guidance
- Treat empty arrays as “none”. Render annulus only when both `innerRadius` and `annulusFillColor` are meaningfully set.


