### tape-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`; arrays not null; avoid array min.

Scope
- Purpose: two-tape bar model with segments, additive vs ratio scaling, optional total bracket

Current pain points
- Nullable size; `.min(1)` on segments; nullable `bottomTape`; defaulted `modelType`, `color`, `totalLabel`.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `bottomTape` as object; allow empty segments to represent single-tape models.
- Require `modelType`, `color`, `totalLabel` as explicit values.

Schema sketch
```ts
const Segment = z.object({ 
  label: z.string().describe("Text displayed inside this segment (e.g., '5', 'x', '2/3', 'Part A', ''). Empty string shows no label. Keep concise to fit."), 
  length: z.number().positive().describe("Relative length of this segment for proportional sizing (e.g., 5, 3, 2.5, 1). Not pixels - determines segment's proportion of tape.") 
}).strict()

const Tape = z.object({ 
  label: z.string().describe("Label for this tape bar displayed on the left (e.g., 'Whole', 'Parts', 'Red Paint (L)', ''). Empty string means no label."), 
  segments: z.array(Segment).describe("Ordered segments making up this tape. Empty array creates a blank/invisible tape. Segments appear left to right."), 
  color: z.string().describe("CSS fill color for all segments in this tape (e.g., '#4472C4' for blue, 'lightgreen', 'rgba(255,100,0,0.7)'). Each tape should have distinct color.") 
}).strict()

export const TapeDiagramPropsSchema = z.object({
  type: z.literal('tapeDiagram').describe("Identifies this as a tape diagram (bar model) for visualizing part-whole relationships."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 600, 700, 500). Must accommodate labels and the longest tape."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 200, 250, 150). Includes both tapes, labels, and optional bracket."),
  modelType: z.enum(['additive','ratio']).describe("Scaling mode. 'additive': tape lengths represent sums (5+3=8). 'ratio': segments sized by common unit (2:3 ratio with equal segment sizes)."),
  topTape: Tape.describe("The upper tape bar. Often represents the whole or total quantity in part-whole problems."),
  bottomTape: Tape.describe("The lower tape bar. Often represents parts or comparative quantity. Use empty segments array to show only one tape."),
  showTotalBracket: z.boolean().describe("Whether to display a bracket above the top tape showing the total. Useful for emphasizing the sum or whole quantity."),
  totalLabel: z.string().describe("Label for the total bracket if shown (e.g., '8', 'Total = 24', 'Whole', ''). Empty string shows bracket without label."),
}).strict().describe("Creates tape diagrams (bar models) for visualizing mathematical relationships. In 'additive' mode, segment lengths are proportional to their values (for addition/subtraction). In 'ratio' mode, segments represent equal units (for ratios/fractions). Essential for Singapore Math-style problem solving. Bottom tape can be hidden by using empty segments.")```

Why this helps
- Removes schema-level defaults and nullable branches; generator can treat empty `bottomTape.segments` as “absent”.

Generator guidance
- If `bottomTape.segments.length === 0`, omit rendering the second tape.


