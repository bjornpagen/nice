### dot-plot — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`, no array min/max; explicit axis and styling.

Scope
- File: `src/lib/widgets/generators/dot-plot.ts`
- Purpose: horizontal dot plot of value frequencies

Current pain points
- Nullable size → fallback rendering.
- Optional axis label, dot color, dot radius add generator defaults.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `axis.label`, `dotColor`, `dotRadius`.

Schema sketch
```ts
const DataPoint = z.object({ 
  value: z.number().describe("The numerical value on the axis where dots are placed (e.g., 5, 12.5, -3, 0). Must be within axis min/max range."), 
  count: z.number().int().describe("Number of dots to stack at this value. Represents frequency (e.g., 3 means 3 dots stacked vertically). Must be non-negative.") 
}).strict()

export const DotPlotPropsSchema = z.object({
  type: z.literal('dotPlot').describe("Identifies this as a dot plot widget for displaying frequency distributions."),
  width: z.number().positive().describe("Total width of the plot in pixels including margins (e.g., 500, 600, 400). Wider plots prevent dot overlap on dense data."),
  height: z.number().positive().describe("Total height of the plot in pixels including labels (e.g., 300, 400, 250). Taller plots accommodate higher dot stacks."),
  axis: z.object({ 
    label: z.string().describe("Title for the horizontal axis describing the variable (e.g., 'Test Score', 'Number of Siblings', 'Temperature (°C)'). Empty string for no label."), 
    min: z.number().describe("Minimum value shown on the axis (e.g., 0, -10, 50). Should be less than or equal to smallest data value."), 
    max: z.number().describe("Maximum value shown on the axis (e.g., 100, 20, 10). Should be greater than or equal to largest data value."), 
    tickInterval: z.number().describe("Spacing between axis tick marks (e.g., 10, 5, 0.5, 1). Should evenly divide the range for clean appearance.") 
  }).strict().describe("Configuration for the horizontal number line axis."),
  data: z.array(DataPoint).describe("Array of values and their frequencies. Each unique value gets its own dot stack. Order doesn't matter. Can be empty for blank plot."),
  dotColor: z.string().describe("CSS color for the dots (e.g., '#4472C4' for blue, 'steelblue', 'rgba(255,0,0,0.8)'). Should contrast with white background."),
  dotRadius: z.number().describe("Radius of each dot in pixels (e.g., 4, 5, 3). Larger dots are more visible but may overlap. Typical range: 3-6."),
}).strict().describe("Creates a dot plot (line plot) showing frequency distribution of numerical data. Each value is represented by stacked dots indicating count/frequency. Excellent for small datasets, showing distribution shape, clusters, gaps, and outliers. Dots stack vertically when multiple observations have the same value.")```

Why this helps
- Removes fallback sizing and styling; plotting is deterministic.

Generator guidance
- Keep existing tick-thinning logic; inputs now fully specified.


