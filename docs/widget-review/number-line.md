### number-line — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`.

Scope
- Purpose: general-purpose number line with points and custom tick labels

Current pain points
- Nullable size, orientation, minor tick config, and optional arrays create several branches.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`, `orientation`, `minorTicksPerInterval`.
- Provide `points` and `specialTickLabels` as arrays (possibly empty).
- Require `point.color` and `point.labelPosition` explicitly.

Schema sketch
```ts
const Point = z.object({ 
  value: z.number().describe("Position of this point on the number line (e.g., 3.5, -2, 0, 7). Must be within min/max range."), 
  label: z.string().describe("Text label for this point (e.g., 'A', 'Start', 'π', '√2', ''). Empty string shows dot without label. Can include math symbols."), 
  color: z.string().describe("CSS color for the point dot and its label (e.g., '#FF6B6B' for red, 'blue', 'darkgreen'). Makes important points stand out."), 
  labelPosition: z.enum(['above','below','left','right']).describe("Where to place the label relative to the point. For horizontal: use 'above'/'below'. For vertical: use 'left'/'right'.") 
}).strict()

const SpecialTick = z.object({ 
  value: z.number().describe("Position where this special tick appears (e.g., 3.14159, 1.414, 2.5). Overrides default tick label at this position."), 
  label: z.string().describe("Custom label for this tick position (e.g., 'π', '√2', '2½', 'e'). Replaces the numeric label. Useful for irrational numbers or fractions.") 
}).strict()

export const NumberLinePropsSchema = z.object({
  type: z.literal('numberLine').describe("Identifies this as a general-purpose number line widget."),
  width: z.number().positive().describe("For horizontal: total width in pixels (e.g., 600, 700, 500). For vertical: the narrower dimension (e.g., 100, 150)."),
  height: z.number().positive().describe("For horizontal: total height in pixels (e.g., 100, 150, 120). For vertical: the longer dimension (e.g., 400, 500)."),
  orientation: z.enum(['horizontal','vertical']).describe("Direction of the number line. 'horizontal' goes left-to-right, 'vertical' goes bottom-to-top."),
  min: z.number().describe("Minimum value shown on the number line (e.g., -10, 0, -5, -100). Left end for horizontal, bottom for vertical."),
  max: z.number().describe("Maximum value shown on the number line (e.g., 10, 100, 20, 5). Right end for horizontal, top for vertical."),
  majorTickInterval: z.number().describe("Spacing between major (labeled) tick marks (e.g., 1, 5, 10, 0.5). Should evenly divide (max - min) for best appearance."),
  minorTicksPerInterval: z.number().describe("Number of minor ticks between each pair of major ticks (e.g., 4 for fifths, 9 for tenths, 1 for halves, 0 for none)."),
  points: z.array(Point).describe("Special points to highlight on the number line. Empty array means no highlighted points. Each can have custom color and label."),
  specialTickLabels: z.array(SpecialTick).describe("Override default numeric labels at specific positions. Empty array uses all default labels. Perfect for π, e, √2, or fractions."),
}).strict().describe("Creates a versatile number line with customizable orientation, tick marks, special points, and labels. Supports both horizontal and vertical layouts, minor tick subdivisions, and custom labeling for special values. Essential building block for teaching number concepts, ordering, and measurement.")```

Why this helps
- Removes fallbacks and optional branches; simplifies label placement logic.

Generator guidance
- Always treat arrays as present; no optional checks needed.


