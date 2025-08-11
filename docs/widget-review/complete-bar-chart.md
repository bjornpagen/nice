### bar-chart — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`, no array min/max; keep inline objects and enums explicit.

Scope
- File: `src/lib/widgets/generators/bar-chart.ts`
- Purpose: categorical vertical bar chart, with optional “unknown” bars

Current pain points
- Nullable width/height with transforms produce unintended fallback sizes.
- Y-axis optional fields (`label`, `min`, `max`) and bar color nullables add generator defaults.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Make `yAxis.min` explicit (number). If `max` is not desired, require a boolean `autoMax` (or require `max`; pick one consistent rule). To reduce nullables and internal defaults, require `max` explicitly.
- Require `barColor` as a string.

Schema sketch
```ts
const BarData = z.object({
  label: z.string().describe("The category name displayed below this bar on the x-axis (e.g., 'January', 'Apples', 'Team A', 'Grade 5'). Keep concise to avoid overlap."),
  value: z.number().describe("The numerical value determining the bar's height. Can be positive or negative. For 'unknown' state, this sets the placeholder height (e.g., 45, 23.5, -10, 0)."),
  state: z.enum(['normal','unknown']).describe("Visual state of the bar. 'normal' shows a solid bar with the actual value. 'unknown' shows a dashed/patterned bar with '?' label, useful for missing data or student exercises."),
}).strict()

const YAxis = z.object({
  label: z.string().describe("The title for the vertical axis describing what is measured (e.g., 'Sales ($)', 'Temperature (°C)', 'Number of Students', 'Score'). Can be empty string if not needed."),
  min: z.number().describe("The minimum value shown on the y-axis. Often 0 for counts/quantities, but can be negative (e.g., 0, -20, 10). Must be less than max."),
  max: z.number().describe("The maximum value shown on the y-axis. Should exceed the largest data value for clear visualization (e.g., 100, 50, 200). Must be greater than min."),
  tickInterval: z.number().describe("The spacing between tick marks on the y-axis (e.g., 10 for 0,10,20..., 5 for 0,5,10..., 0.5 for decimals). Should evenly divide (max - min)."),
}).strict()

export const BarChartPropsSchema = z.object({
  type: z.literal('barChart').describe("Identifies this as a bar chart widget for comparing categorical data with vertical bars."),
  width: z.number().positive().describe("Total width of the chart in pixels including margins and labels (e.g., 500, 600, 400). Wider charts prevent category label overlap."),
  height: z.number().positive().describe("Total height of the chart in pixels including title and axis labels (e.g., 400, 350, 500). Taller charts show value differences more clearly."),
  title: z.string().describe("The main title displayed above the chart (e.g., 'Monthly Sales Report', 'Favorite Fruits Survey', 'Test Scores by Class'). Can be empty string for no title."),
  xAxisLabel: z.string().describe("The label for the horizontal axis describing the categories (e.g., 'Month', 'Fruit Type', 'Class Name'). Can be empty string if categories are self-explanatory."),
  yAxis: YAxis.describe("Configuration for the vertical axis including scale, labels, and tick marks."),
  data: z.array(BarData).describe("Array of bars to display. Each bar represents one category. Order determines left-to-right positioning. Can mix 'normal' and 'unknown' states."),
  barColor: z.string().describe("CSS color for normal bars (e.g., '#4472C4' for blue, 'steelblue', 'rgba(68,114,196,0.8)'). Unknown bars use a pattern regardless of this color."),
}).strict().describe("Creates a vertical bar chart for comparing values across categories. Supports both known values and 'unknown' placeholders for interactive exercises. Essential for data visualization and statistics education.")
```

Why this helps
- Eliminates rendering bugs from size fallbacks and styling ambiguity from bar color.
- Simplifies generator logic by providing a fully specified y-axis.

Generator guidance
- Remove internal `max` autodetection; use provided `yAxis.max`.
- Keep input validation (`chartWidth/Height > 0` and `data.length > 0`).


