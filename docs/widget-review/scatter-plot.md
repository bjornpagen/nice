### scatter-plot — Manual Widget Review (gold standard reference)

Notes: keep as inspiration; minor tightening only to align with global rules.

Adjustments
- Require `width`, `height`.
- Make `lines` an array (empty allowed) rather than nullable with transform.
- Keep discriminated union for line types; keep inline axis schemas and style object.

Schema sketch
```ts
const Point = z.object({ 
  x: z.number().describe("The x-coordinate value of the data point (e.g., 25, 42.5, -10, 0). Must be within xAxis min/max range."), 
  y: z.number().describe("The y-coordinate value of the data point (e.g., 180, 95.5, -5, 0). Must be within yAxis min/max range."), 
  label: z.string().describe("Optional text label for this point (e.g., 'A', 'Outlier', '(3,4)', ''). Empty string means no label. Positioned near the point.") 
}).strict()

const BarePoint = z.object({ 
  x: z.number().describe("X-coordinate for line endpoint or reference point (e.g., 0, 50, -20). Used in line definitions."), 
  y: z.number().describe("Y-coordinate for line endpoint or reference point (e.g., 10, 100, -15). Used in line definitions.") 
}).strict()

const LineStyle = z.object({ 
  color: z.string().describe("CSS color for the line stroke (e.g., '#FF6B6B' for red, 'blue', 'rgba(0,128,0,0.8)'). Should contrast with background and points."), 
  strokeWidth: z.number().positive().describe("Width of the line in pixels (e.g., 2 for standard, 3 for bold, 1 for thin). Typical range: 1-4."), 
  dash: z.boolean().describe("Whether to render as dashed line. True for dashed pattern, false for solid. Useful for predictions or reference lines.") 
}).strict()

const LineTwoPoints = z.object({ 
  type: z.literal('twoPoints').describe("Line defined by two specific points. Extends infinitely in both directions through these points."), 
  a: BarePoint.describe("First point the line passes through. Line extends beyond this point."), 
  b: BarePoint.describe("Second point the line passes through. Must be different from point 'a'. Determines line's slope."), 
  label: z.string().describe("Text label for the line (e.g., 'y = 2x + 1', 'Line A', 'Model', ''). Empty string means no label. Positioned along the line."), 
  style: LineStyle.describe("Visual styling for this specific line. Overrides any default line appearance.") 
}).strict()

const LineBestFit = z.object({ 
  type: z.literal('bestFit').describe("Line computed from the scatter plot data using regression analysis."), 
  method: z.enum(['linear','quadratic']).describe("Regression type. 'linear' fits a straight line (y = mx + b). 'quadratic' fits a parabola (y = ax² + bx + c)."), 
  label: z.string().describe("Text label for the regression line (e.g., 'Best Fit', 'Trend', 'y = 0.5x + 10', ''). Empty string means no label."), 
  style: LineStyle.describe("Visual styling for the regression line. Often uses distinct color or dash pattern.") 
}).strict()

export const ScatterPlotPropsSchema = z.object({
  type: z.literal('scatterPlot').describe("Identifies this as a scatter plot widget for displaying bivariate data relationships."),
  width: z.number().positive().describe("Total width of the plot in pixels including margins and labels (e.g., 600, 700, 500). Larger values show more detail."),
  height: z.number().positive().describe("Total height of the plot in pixels including margins and labels (e.g., 400, 500, 350). Often 2/3 of width for good proportions."),
  title: z.string().describe("Title displayed above or below the plot (e.g., 'Age vs. Income', 'Temperature Over Time', ''). Empty string means no title."),
  xAxis: z.object({ 
    label: z.string().describe("Title for the horizontal axis describing the variable (e.g., 'Age (years)', 'Time (hours)', 'Temperature (°C)'). Can be empty string."), 
    min: z.number().describe("Minimum value shown on x-axis (e.g., 0, -10, 1990). Should be ≤ smallest x data value with some padding."), 
    max: z.number().describe("Maximum value shown on x-axis (e.g., 100, 50, 2025). Should be ≥ largest x data value with some padding."), 
    tickInterval: z.number().describe("Spacing between x-axis tick marks (e.g., 10, 5, 0.5). Should evenly divide the range for clean appearance."), 
    gridLines: z.boolean().describe("Whether to show vertical grid lines at each tick mark. True improves readability, false reduces clutter.") 
  }).strict().describe("Configuration for the horizontal axis including scale, labels, and optional grid."),
  yAxis: z.object({ 
    label: z.string().describe("Title for the vertical axis describing the variable (e.g., 'Income ($1000s)', 'Score', 'Growth (cm)'). Can be empty string."), 
    min: z.number().describe("Minimum value shown on y-axis (e.g., 0, -20, 50). Should be ≤ smallest y data value with some padding."), 
    max: z.number().describe("Maximum value shown on y-axis (e.g., 200, 100, 10). Should be ≥ largest y data value with some padding."), 
    tickInterval: z.number().describe("Spacing between y-axis tick marks (e.g., 20, 10, 2.5). Should evenly divide the range for clean appearance."), 
    gridLines: z.boolean().describe("Whether to show horizontal grid lines at each tick mark. True helps estimate values, false keeps focus on points.") 
  }).strict().describe("Configuration for the vertical axis including scale, labels, and optional grid."),
  points: z.array(Point).describe("Data points to plot. Each point can have an optional label. Empty array creates blank plot for exercises. Order doesn't affect display."),
  lines: z.array(z.discriminatedUnion('type', [LineBestFit, LineTwoPoints])).describe("Optional lines to overlay on the scatter plot. Can include regression lines, reference lines, or user-defined lines. Empty array means no lines."),
}).strict().describe("Creates a scatter plot for exploring relationships between two numerical variables. Supports data points with labels, best-fit lines (linear or quadratic regression), and custom reference lines. Essential for statistics, correlation analysis, and data visualization. The gold standard widget design.")```

Why this helps
- Fully removes size fallbacks and nullable arrays; retains the excellent union-driven design.


