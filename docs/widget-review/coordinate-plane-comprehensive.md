### coordinate-plane-comprehensive — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; arrays instead of nullables.

Scope
- Purpose: full-featured Cartesian plane with points, lines, polygons, distances, polylines, quadrant labels

Current pain points
- Nullable size leads to fallback rendering.
- Optional arrays complicate rendering order and null checks.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Always provide arrays (possibly empty) for `points`, `lines`, `polygons`, `distances`, `polylines`.

Schema sketch
```ts
export const CoordinatePlaneComprehensivePropsSchema = z.object({
  type: z.literal('coordinatePlane').describe("Identifies this as a comprehensive coordinate plane widget with full geometric features."),
  width: z.number().positive().describe("Total width of the coordinate plane in pixels including axes and labels (e.g., 500, 600, 400). Larger values provide more plotting space."),
  height: z.number().positive().describe("Total height of the coordinate plane in pixels including axes and labels (e.g., 500, 600, 400). Usually equal to width for square aspect ratio."),
  xAxis: createAxisOptionsSchema().describe("Configuration for the horizontal x-axis including range, tick marks, and grid lines. Defines the visible domain of the plane."),
  yAxis: createAxisOptionsSchema().describe("Configuration for the vertical y-axis including range, tick marks, and grid lines. Defines the visible range of the plane."),
  showQuadrantLabels: z.boolean().describe("Whether to display Roman numeral labels (I, II, III, IV) in each quadrant. True helps students identify quadrant locations."),
  points: z.array(createPlotPointSchema()).describe("Array of individual points to plot. Empty array means no points. Points are rendered last (on top). Each point can have a label and custom style."),
  lines: z.array(createLineSchema()).describe("Array of infinite lines defined by slope-intercept or two points. Empty array means no lines. Lines extend to plane boundaries."),
  polygons: z.array(createPolygonSchema()).describe("Array of closed polygons defined by vertices. Empty array means no polygons. Rendered first (bottom layer) with optional fill colors."),
  distances: z.array(createDistanceSchema()).describe("Array of distance measurements between point pairs. Empty array means no distances. Shows horizontal/vertical legs and diagonal with labels."),
  polylines: z.array(createPolylineSchema()).describe("Array of connected line segments (open paths). Empty array means no polylines. Useful for functions, paths, or partial shapes."),
}).strict().describe("Creates a full-featured Cartesian coordinate plane supporting points, lines, polygons, distances, and polylines. Essential for graphing, geometry, and coordinate geometry lessons. Renders elements in layers: polygons (bottom) → distances → lines → polylines → points (top).")```

Why this helps
- Eliminates fallback behavior and null handling; rendering order remains the same but inputs are explicit.

Generator guidance
- Render in z-order: polygons → distances → lines → polylines → points; treat empty arrays as “none”.


