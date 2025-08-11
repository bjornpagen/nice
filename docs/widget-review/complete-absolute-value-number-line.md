### absolute-value-number-line — Manual Widget Review

Principles: eliminate nullables where possible; width/height required; no `.default()`, no `.refine()`, no array min/max; keep schema simple and explicit.

Scope
- File: `src/lib/widgets/generators/absolute-value-number-line.ts`
- Purpose: illustrate |x| as distance from 0

Current pain points
- Nullable width/height lead to fallback sizes and inconsistent rendering.
- Optional color introduces generator-time default logic.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `highlightColor` explicitly to avoid styling ambiguity.

Schema sketch
```ts
export const AbsoluteValueNumberLinePropsSchema = z.object({
  type: z.literal('absoluteValueNumberLine').describe("Identifies this as an absolute value number line widget that visualizes |x| as distance from zero."),
  width: z.number().positive().describe("The total width of the SVG in pixels. Should be wide enough to show the number line clearly (e.g., 400, 500, 600). Larger values allow more tick marks."),
  height: z.number().positive().describe("The total height of the SVG in pixels. Typically smaller than width for horizontal number lines (e.g., 80, 100, 120). Must accommodate labels and distance markers."),
  min: z.number().describe("The minimum value shown on the number line, typically negative (e.g., -10, -8, -15). Must be less than max. The line extends from min to max."),
  max: z.number().describe("The maximum value shown on the number line, typically positive (e.g., 10, 8, 15). Must be greater than min. Zero should usually be between min and max."),
  tickInterval: z.number().describe("The spacing between tick marks on the number line (e.g., 1 for integers, 0.5 for halves, 2 for even numbers). Must evenly divide the range (max - min)."),
  value: z.number().describe("The number whose absolute value is being illustrated (e.g., -6, 7, -3.5). A curved arc shows the distance from this value to zero, demonstrating |value| = distance."),
  highlightColor: z.string().describe("The CSS color for the distance arc and highlight (e.g., '#FF6B6B' for red, 'rgba(107, 184, 255, 0.8)' for translucent blue, 'orange'). Should contrast with black line."),
  showDistanceLabel: z.boolean().describe("Whether to display the absolute value as a label on the arc. When true, shows '|value| = distance' (e.g., '|-6| = 6'). Set false for exercises where students calculate."),
}).strict().describe("Creates a number line that visualizes absolute value as the distance from zero to a given number, shown with a curved arc. Essential for teaching that |x| represents distance, not direction.")
```

Why this helps
- Eliminates rendering bugs tied to fallback transforms.
- Ensures consistent visual identity by making color explicit.

Generator guidance
- Fail fast on `min >= max`; otherwise render with provided dimensions and color.


