### line-equation-graph — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`.

Scope
- Purpose: plot linear equations and optional points on a coordinate plane

Current pain points
- Nullable size and points create fallback branches.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Provide `points` as an array (empty if none).

Schema sketch
```ts
export const LineEquationGraphPropsSchema = z.object({
  type: z.literal('lineEquationGraph').describe("Identifies this as a line equation graph for plotting linear functions and points."),
  width: z.number().positive().describe("Total width of the coordinate plane in pixels (e.g., 500, 600, 400). Should provide adequate space for the graph."),
  height: z.number().positive().describe("Total height of the coordinate plane in pixels (e.g., 500, 600, 400). Often equal to width for square aspect ratio."),
  xAxis: createAxisOptionsSchema().describe("Configuration for the horizontal x-axis including range, tick marks, labels, and optional grid lines. Should encompass all relevant x-values."),
  yAxis: createAxisOptionsSchema().describe("Configuration for the vertical y-axis including range, tick marks, labels, and optional grid lines. Should encompass all relevant y-values."),
  showQuadrantLabels: z.boolean().describe("Whether to display Roman numerals (I, II, III, IV) in each quadrant. True helps students identify quadrant locations."),
  lines: z.array(createLineSchema()).describe("Array of lines to plot. Each line can be defined by equation (slope-intercept) or two points. Lines extend to graph boundaries. Empty array for no lines."),
  points: z.array(createPlotPointSchema()).describe("Individual points to highlight on the graph (e.g., intercepts, solutions, key points). Empty array means no special points. Points are rendered on top of lines."),
}).strict().describe("Creates a coordinate plane for graphing linear equations and plotting points. Supports multiple lines defined by equations (y = mx + b) or point pairs. Essential for teaching linear functions, slope, intercepts, and systems of equations. Points can mark important locations like intersections or solutions.")```

Why this helps
- Eliminates size fallbacks and optional array handling; inputs fully specified.

Generator guidance
- Always pass an array for `points`; render order unchanged (lines then points).


