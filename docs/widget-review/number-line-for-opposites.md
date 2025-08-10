### number-line-for-opposites — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`.

Scope
- Purpose: centered number line illustrating opposite numbers ±value with optional arrows

Current pain points
- Nullable size, labels, and booleans create fallback branches.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `positiveLabel`/`negativeLabel` strings; use empty string to hide label.
- Require `showArrows` boolean.

Schema sketch
```ts
export const NumberLineForOppositesPropsSchema = z.object({
  type: z.literal('numberLineForOpposites').describe("Identifies this as a number line for opposites widget showing positive/negative pairs."),
  width: z.number().positive().describe("Total width of the number line in pixels (e.g., 600, 700, 500). Must accommodate labels and arrows."),
  height: z.number().positive().describe("Total height of the widget in pixels (e.g., 120, 150, 100). Includes space for arrows above the line."),
  maxAbsValue: z.number().describe("Maximum absolute value shown on the number line (e.g., 10, 8, 5). Line ranges from -maxAbsValue to +maxAbsValue, centered at 0."),
  tickInterval: z.number().describe("Spacing between tick marks (e.g., 1, 2, 0.5). Should evenly divide maxAbsValue for symmetry."),
  value: z.number().describe("The number whose opposite is being illustrated (e.g., 5, -3, 7.5). Both this value and its opposite (-value) are marked."),
  positiveLabel: z.string().describe("Label for the positive value (e.g., '5', '+5', 'a', ''). Empty string hides the label. Positioned near the positive point."),
  negativeLabel: z.string().describe("Label for the negative value (e.g., '-5', 'opposite of 5', '-a', ''). Empty string hides the label. Positioned near the negative point."),
  showArrows: z.boolean().describe("Whether to show curved arrows from each value to zero, emphasizing equal distance. True highlights the 'same distance from zero' concept."),
}).strict().describe("Creates a centered number line showing a number and its opposite, demonstrating that opposites are equidistant from zero. Essential for teaching additive inverses, absolute value concepts, and the symmetry of the number line around zero.")```

Why this helps
- Removes fallback label/arrow behavior and ensures consistent layout.

Generator guidance
- Treat empty label strings as “hide label”. Always use provided dimensions.


