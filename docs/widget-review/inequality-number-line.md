### inequality-number-line — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; use unions to encode bounded/unbounded.

Scope
- Purpose: graph solution sets of inequalities as shaded ranges with open/closed endpoints

Current pain points
- Nullable size and boundaries create fallback and branching logic.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Represent boundaries with explicit unions for bounded vs unbounded cases; no nulls.

Schema sketch
```ts
const Boundary = z.object({ 
  value: z.number().describe("The numerical value where this boundary occurs on the number line (e.g., 3, -2, 5.5, 0). Must be within min/max range."), 
  type: z.enum(['open','closed']).describe("Boundary type. 'open' (exclusive) shows hollow circle for < or >, 'closed' (inclusive) shows filled circle for ≤ or ≥.") 
}).strict()

const Start = z.discriminatedUnion('kind', [ 
  z.object({ 
    kind: z.literal('bounded').describe("The range has a defined starting point."), 
    at: Boundary.describe("The starting boundary with its value and open/closed type.") 
  }).strict(), 
  z.object({ 
    kind: z.literal('unbounded').describe("The range extends infinitely to the left (negative infinity).") 
  }).strict() 
])

const End = z.discriminatedUnion('kind', [ 
  z.object({ 
    kind: z.literal('bounded').describe("The range has a defined ending point."), 
    at: Boundary.describe("The ending boundary with its value and open/closed type.") 
  }).strict(), 
  z.object({ 
    kind: z.literal('unbounded').describe("The range extends infinitely to the right (positive infinity).") 
  }).strict() 
])

const Range = z.object({ 
  start: Start.describe("The left boundary of the shaded region. Can be bounded (specific value) or unbounded (extends to -∞)."), 
  end: End.describe("The right boundary of the shaded region. Can be bounded (specific value) or unbounded (extends to +∞)."), 
  color: z.string().describe("CSS color for the shaded region (e.g., 'rgba(66,135,245,0.3)' for translucent blue, '#FFE5B4' for peach). Use transparency for overlapping ranges.") 
}).strict()

export const InequalityNumberLinePropsSchema = z.object({
  type: z.literal('inequalityNumberLine').describe("Identifies this as an inequality number line for visualizing solution sets."),
  width: z.number().positive().describe("Total width of the number line in pixels (e.g., 600, 700, 500). Must show the relevant range clearly."),
  height: z.number().positive().describe("Total height of the widget in pixels (e.g., 100, 120, 80). Includes number line, shading, and labels."),
  min: z.number().describe("Minimum value shown on the number line (e.g., -10, -5, 0). Should be less than smallest relevant boundary."),
  max: z.number().describe("Maximum value shown on the number line (e.g., 10, 20, 15). Should be greater than largest relevant boundary."),
  tickInterval: z.number().describe("Spacing between tick marks (e.g., 1, 2, 0.5). Should evenly divide the range for clean appearance."),
  ranges: z.array(Range).describe("Solution ranges to shade on the number line. Can overlap for compound inequalities. Empty array shows blank number line. Order doesn't affect display."),
}).strict().describe("Creates number lines showing solution sets for inequalities with shaded regions, open/closed endpoints, and arrows for unbounded intervals. Essential for teaching inequality notation (x < 5, x ≥ -2), compound inequalities (3 < x ≤ 7), and solution set visualization. Supports multiple overlapping ranges.")```

Why this helps
- Eliminates null checks while making unbounded cases explicit and easy for LLMs to produce.

Generator guidance
- Map `unbounded` boundaries to arrow markers; open/closed draws empty/filled circles.


