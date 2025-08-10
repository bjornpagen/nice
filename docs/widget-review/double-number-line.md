### double-number-line — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`, no array min/max.

Scope
- File: `src/lib/widgets/generators/double-number-line.ts`
- Purpose: parallel number lines showing proportional pairs

Current pain points
- Nullable width/height cause fallback sizes.
- No guarantee of tick counts alignment except runtime check.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use tuples for `ticks` alignment if lengths are known; otherwise, keep arrays and enforce in generator (since array min/max disallowed). Prefer same-length arrays by contract.

Schema sketch
```ts
const Line = z.object({ 
  label: z.string().describe("Label for this number line shown on the left side (e.g., 'Cups of Flour', 'Cost ($)', 'Miles', 'Time (minutes)'). Keep concise to fit."), 
  ticks: z.array(z.union([z.string(), z.number()])).describe("Tick mark values from left to right. Can be numbers (e.g., [0, 2, 4, 6]) or strings (e.g., ['0', '1/2', '1', '3/2']). Must have same count as other line for alignment.") 
}).strict()

export const DoubleNumberLinePropsSchema = z.object({
  type: z.literal('doubleNumberLine').describe("Identifies this as a double number line widget for showing proportional relationships."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 600, 700, 500). Must accommodate both labels and all tick values."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 200, 250, 180). Includes space for both lines, labels, and vertical spacing."),
  topLine: Line.describe("Configuration for the upper number line. Represents one quantity in the proportional relationship."),
  bottomLine: Line.describe("Configuration for the lower number line. Represents the related quantity. Tick positions align vertically with top line."),
}).strict().describe("Creates parallel number lines showing proportional relationships between two quantities. Vertical lines connect corresponding values. Essential for ratio reasoning, unit rates, and proportional thinking. Both lines must have the same number of ticks for proper alignment.")```

Why this helps
- Eliminates size fallbacks and clarifies contract for aligned ticks.

Generator guidance
- Keep the existing runtime equality check for tick lengths; draw alignment guides as implemented.


