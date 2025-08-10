### number-line-with-fraction-groups — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`.

Scope
- Purpose: show repeated fractional segments on a number line to illustrate grouping/division by a fraction

Current pain points
- Nullable size and optional segments array.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Provide `segments` as an array (empty if none).

Schema sketch
```ts
const Tick = z.object({ 
  value: z.number().describe("Position of this tick mark on the number line (e.g., 0, 0.5, 1, 1.5). Must be between min and max."), 
  label: z.string().describe("Text label for this tick (e.g., '0', '1/2', '1', '1 1/2', ''). Empty string shows tick without label. Can show fractions or mixed numbers."), 
  isMajor: z.boolean().describe("Whether this is a major tick (longer line) or minor tick (shorter line). Major ticks typically mark whole numbers.") 
}).strict()

const Segment = z.object({ 
  start: z.number().describe("Starting position of this grouped segment (e.g., 0, 0.5, 1). Must be >= min and < end."), 
  end: z.number().describe("Ending position of this grouped segment (e.g., 0.5, 1, 1.5). Must be <= max and > start."), 
  color: z.string().describe("CSS fill color for this segment's bar (e.g., '#FFE5B4' for peach, 'lightblue', 'rgba(255,0,0,0.3)'). Different colors distinguish groups."), 
  label: z.string().describe("Text label for this segment (e.g., '1/2', 'Group A', '0.5', ''). Positioned above the segment. Can indicate the fraction size or group name.") 
}).strict()

export const NumberLineWithFractionGroupsPropsSchema = z.object({
  type: z.literal('numberLineWithFractionGroups').describe("Identifies this as a number line with fraction groups showing repeated segments."),
  width: z.number().positive().describe("Total width of the number line in pixels (e.g., 700, 800, 600). Must accommodate all segments and labels."),
  height: z.number().positive().describe("Total height of the widget in pixels (e.g., 150, 200, 180). Includes number line and stacked segment bars."),
  min: z.number().describe("Minimum value shown on the number line (e.g., 0, -1, -0.5). Typically 0 for fraction work."),
  max: z.number().describe("Maximum value shown on the number line (e.g., 3, 5, 2). Should accommodate all segments."),
  ticks: z.array(Tick).describe("All tick marks with their labels. Can show fractions, decimals, or mixed numbers. Order doesn't matter. Empty array shows no ticks."),
  segments: z.array(Segment).describe("Colored bars above the number line showing grouped segments. Useful for division by fractions (e.g., how many 1/2s in 2?). Segments can overlap with staggered display."),
}).strict().describe("Creates a number line with colored segment groups above it, perfect for visualizing division by fractions and repeated addition of fractional amounts. Shows how many groups of a given size fit within a range. Essential for fraction division concepts like 'how many 1/3s are in 2?' or skip counting by fractions.")```

Why this helps
- Removes fallback sizing and optional arrays; rendering is straightforward.

Generator guidance
- Stagger segments to avoid overlap when multiple segments share ranges.


