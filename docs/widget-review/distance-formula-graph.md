### distance-formula-graph — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`.

Scope
- File: `src/lib/widgets/generators/distance-formula-graph.ts`
- Purpose: plot points and visualize distances (legs + hypotenuse) on a coordinate plane

Current pain points
- Nullable size causes fallbacks.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.

Schema sketch
```ts
export const DistanceFormulaGraphPropsSchema = z.object({
  type: z.literal('distanceFormulaGraph').describe("Identifies this as a distance formula graph widget for visualizing distances between points."),
  width: z.number().positive().describe("Total width of the coordinate plane in pixels (e.g., 500, 600, 400). Should accommodate axis labels and distance annotations."),
  height: z.number().positive().describe("Total height of the coordinate plane in pixels (e.g., 500, 600, 400). Typically equal to width for square aspect ratio."),
  xAxis: createAxisOptionsSchema().describe("Horizontal axis configuration with range, ticks, and optional grid. The min/max should encompass all plotted points with padding."),
  yAxis: createAxisOptionsSchema().describe("Vertical axis configuration with range, ticks, and optional grid. The min/max should encompass all plotted points with padding."),
  showQuadrantLabels: z.boolean().describe("Whether to show Roman numerals (I, II, III, IV) in quadrants. True helps with quadrant identification in distance problems."),
  points: z.array(createPlotPointSchema()).describe("Points to plot on the plane. Each point can have a label. Points referenced in distances should be defined here. Empty array if only showing distances."),
  distances: z.array(createDistanceSchema()).describe("Distance measurements to visualize. Each shows horizontal leg, vertical leg, and hypotenuse with labels. Demonstrates Pythagorean theorem visually. Empty array means no distances."),
}).strict().describe("Creates a coordinate plane specifically designed for distance formula visualization. Shows the right triangle formed by two points with labeled legs (Δx, Δy) and hypotenuse (distance). Essential for teaching d = √[(x₂-x₁)² + (y₂-y₁)²] geometrically.")```

Why this helps
- Eliminates size fallbacks; all plane inputs explicit.

Generator guidance
- Unchanged: render distances then points for correct z-order.


