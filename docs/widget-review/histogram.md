### histogram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`.

Scope
- File: `src/lib/widgets/generators/histogram.ts`
- Purpose: histogram visualization of bin frequencies

Current pain points
- Nullable size causes fallbacks.
- Optional axis max/tickInterval and title introduce defaults.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `title`, `xAxis.label`, `yAxis.label`, `yAxis.max`, `yAxis.tickInterval` explicitly to avoid generator inference.

Schema sketch
```ts
const Bin = z.object({ 
  label: z.string().describe("The range or category label for this bin (e.g., '0-10', '10-20', 'Small', 'Grade A'). Displayed on x-axis below the bar."), 
  frequency: z.number().int().describe("The count/frequency for this bin. Determines bar height. Must be non-negative integer (e.g., 5, 12, 0, 23).") 
}).strict()

export const HistogramPropsSchema = z.object({
  type: z.literal('histogram').describe("Identifies this as a histogram widget for displaying frequency distributions."),
  width: z.number().positive().describe("Total width of the histogram in pixels including margins (e.g., 500, 600, 400). Wider charts prevent label overlap."),
  height: z.number().positive().describe("Total height of the histogram in pixels including title and labels (e.g., 400, 350, 500). Taller charts show frequencies more clearly."),
  title: z.string().describe("Title displayed above the histogram (e.g., 'Test Score Distribution', 'Age Groups', ''). Empty string means no title."),
  xAxis: z.object({ 
    label: z.string().describe("Title for the horizontal axis describing the variable being binned (e.g., 'Score Range', 'Age (years)', 'Size Category'). Can be empty string.") 
  }).strict().describe("Configuration for the x-axis showing bin categories."),
  yAxis: z.object({ 
    label: z.string().describe("Title for the vertical axis, typically 'Frequency' or 'Count' (e.g., 'Number of Students', 'Frequency', 'Count'). Can be empty string."), 
    max: z.number().int().describe("Maximum value shown on y-axis. Should exceed highest frequency for clarity (e.g., 30, 50, 100). Must be positive integer."), 
    tickInterval: z.number().describe("Spacing between y-axis tick marks (e.g., 5, 10, 2). Should evenly divide max for clean appearance.") 
  }).strict().describe("Configuration for the y-axis showing frequencies."),
  bins: z.array(Bin).describe("Array of bins with their frequencies. Order determines left-to-right display. Adjacent bars touch (no gaps) in a histogram. Can be empty for blank chart."),
}).strict().describe("Creates a histogram showing frequency distribution of data across bins/intervals. Unlike bar charts, histogram bars touch each other to show continuous data ranges. Essential for statistics education, showing data distributions, and identifying patterns like normal distributions or skewness.")```

Why this helps
- Removes fallbacks, aligns look-and-feel across charts.

Generator guidance
- Remove auto-calculation of `max`/`tickInterval`; use provided values.


