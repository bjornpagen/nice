### number-line-with-action — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`.

Scope
- Purpose: illustrate a change via one or more action arrows over a number line

Current pain points
- Nullable size and orientation cause fallbacks.
- Single-action limitation for multi-step additions/subtractions.

Proposed API (no feature loss, fewer nullables, more expressive)
- Require `width`, `height`, `orientation`.
- Replace single `action` with `actions: { delta: number; label: string }[]` to support multi-step “humps”.
- Provide `customLabels` as an array.

Schema sketch
```ts
const Label = z.object({ 
  value: z.number().describe("The position on the number line where this custom label appears (e.g., 5, -2, 3.5). Must be within min/max range."), 
  text: z.string().describe("The text to display at this position instead of the default number (e.g., 'Start', 'A', 'Goal'). Replaces numeric label.") 
}).strict()

const Action = z.object({ 
  delta: z.number().describe("The change amount for this action. Positive for addition/forward, negative for subtraction/backward (e.g., 3, -5, 2.5, -1)."), 
  label: z.string().describe("Text label for this action arrow (e.g., '+3', '-5', 'add 2', 'back 1'). Displayed above/beside the curved arrow.") 
}).strict()

export const NumberLineWithActionPropsSchema = z.object({
  type: z.literal('numberLineWithAction').describe("Identifies this as a number line with action arrows showing addition/subtraction operations."),
  width: z.number().positive().describe("Total width in pixels for horizontal orientation (e.g., 600, 700, 500). For vertical, this is the narrower dimension."),
  height: z.number().positive().describe("Total height in pixels for horizontal orientation (e.g., 150, 200, 180). For vertical, this is the longer dimension."),
  orientation: z.enum(['horizontal','vertical']).describe("Direction of the number line. 'horizontal' is left-to-right, 'vertical' is bottom-to-top. Affects layout and arrow directions."),
  min: z.number().describe("Minimum value shown on the number line (e.g., -10, 0, -5). Should be less than startValue - sum of negative deltas."),
  max: z.number().describe("Maximum value shown on the number line (e.g., 20, 10, 15). Should be greater than startValue + sum of positive deltas."),
  tickInterval: z.number().describe("Spacing between tick marks (e.g., 1, 2, 5, 0.5). Should evenly divide the range for clean appearance."),
  startValue: z.number().describe("The initial position before any actions (e.g., 5, 0, -2). Marked with a distinct point. Actions begin from here."),
  customLabels: z.array(Label).describe("Replace numeric labels at specific positions with custom text. Empty array uses default numeric labels. Useful for word problems."),
  actions: z.array(Action).describe("Sequence of operations shown as curved arrows. Applied in order from startValue. Multiple actions create multi-step problems (e.g., 5 + 3 - 2)."),
}).strict().describe("Creates an interactive number line showing arithmetic operations as curved 'jump' arrows. Perfect for teaching addition/subtraction concepts, multi-step problems, and integer operations. Supports multiple sequential actions to show complex calculations step-by-step.")```

Why this helps
- Eliminates fallbacks and enables multi-step arithmetic visualization cleanly.

Generator guidance
- Draw sequential quadratic humps, stacking labels; compute final value from sum of deltas.


