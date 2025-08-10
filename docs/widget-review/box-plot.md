### box-plot — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`, no array min/max; explicit axis and colors.

Scope
- File: `src/lib/widgets/generators/box-plot.ts`
- Purpose: horizontal box-and-whisker plot

Current pain points
- Nullable width/height cause fallback sizing.
- Axis label and tick labels nullable; colors nullable.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `axis.label` (string) and `axis.tickLabels` (array of numbers) explicitly for deterministic ticks.
- Require `boxColor` and `medianColor`.

Schema sketch
```ts
const Axis = z.object({
  min: z.number().describe("Minimum value shown on the horizontal axis. Should be less than or equal to the data minimum (e.g., 0, 10, -5). Sets the leftmost point of the scale."),
  max: z.number().describe("Maximum value shown on the horizontal axis. Should be greater than or equal to the data maximum (e.g., 100, 50, 200). Sets the rightmost point of the scale."),
  label: z.string().describe("Title for the horizontal axis describing what is measured (e.g., 'Test Scores', 'Height (cm)', 'Temperature (°F)', 'Age'). Can be empty string if not needed."),
  tickLabels: z.array(z.number()).describe("Specific values to show as tick marks on the axis (e.g., [0, 25, 50, 75, 100] or [10, 20, 30, 40]). Should span from min to max and include key quartile values."),
}).strict()

const Summary = z.object({ 
  min: z.number().describe("The minimum value in the dataset, shown as the leftmost whisker endpoint (e.g., 12, 0, 45.5). Must be ≤ q1."),
  q1: z.number().describe("First quartile (25th percentile), forms the left edge of the box (e.g., 25, 15.5, 62). Must be between min and median."),
  median: z.number().describe("Median value (50th percentile), shown as a vertical line inside the box (e.g., 45, 28, 75.5). Must be between q1 and q3."),
  q3: z.number().describe("Third quartile (75th percentile), forms the right edge of the box (e.g., 68, 42, 85). Must be between median and max."),
  max: z.number().describe("The maximum value in the dataset, shown as the rightmost whisker endpoint (e.g., 95, 58, 100). Must be ≥ q3.") 
}).strict()

export const BoxPlotPropsSchema = z.object({
  type: z.literal('boxPlot').describe("Identifies this as a box plot widget for displaying five-number summary statistics."),
  width: z.number().positive().describe("Total width of the plot in pixels including labels and margins (e.g., 500, 600, 400). Wider plots show data spread more clearly."),
  height: z.number().positive().describe("Total height of the plot in pixels (e.g., 150, 200, 100). Box plots are typically wider than tall since they're horizontal."),
  axis: Axis.describe("Configuration for the horizontal scale including range and tick marks."),
  summary: Summary.describe("The five-number summary statistics that define the box and whiskers. Values must be in ascending order: min ≤ q1 ≤ median ≤ q3 ≤ max."),
  boxColor: z.string().describe("CSS color for the box fill showing the interquartile range (e.g., '#E8F4FD' for light blue, 'lightgray', 'rgba(150,150,150,0.3)'). Should be subtle to show median line clearly."),
  medianColor: z.string().describe("CSS color for the median line inside the box (e.g., '#FF6B6B' for red, 'black', 'darkblue'). Should contrast strongly with boxColor for emphasis."),
}).strict().describe("Creates a horizontal box-and-whisker plot showing data distribution through five-number summary. Essential for statistics education, comparing distributions, and identifying outliers. The box shows the middle 50% of data (IQR) with whiskers extending to min/max.")```

Why this helps
- Removes silent fallbacks and forces consistent visual configuration.
- Simplifies generator logic for ticks and colors.

Generator guidance
- Validate `axis.min < axis.max`; draw from provided tick labels.


