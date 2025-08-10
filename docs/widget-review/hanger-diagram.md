### hanger-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`.

Scope
- File: `src/lib/widgets/generators/hanger-diagram.ts`
- Purpose: balanced scale metaphor for equations with arrays of weights on both sides

Current pain points
- Nullable size causes fallback rendering.
- Weight shapes/colors nullable with transforms.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- For each weight: require `shape` and `color`.

Schema sketch
```ts
const Weight = z.object({ 
  label: z.union([z.string(), z.number()]).describe("The value or variable displayed on this weight (e.g., 5, 'x', 12, 'y', '2x', 3.5). Can be numeric values or algebraic expressions."), 
  shape: z.enum(['square','circle','pentagon','hexagon','triangle']).describe("Geometric shape for this weight. Different shapes can represent different variables or value types in equations."), 
  color: z.string().describe("CSS fill color for this weight (e.g., '#4472C4' for blue, 'orange', 'rgba(255,0,0,0.8)'). Use distinct colors for different variable types.") 
}).strict()

export const HangerDiagramPropsSchema = z.object({
  type: z.literal('hangerDiagram').describe("Identifies this as a hanger diagram (balance scale) for visualizing algebraic equations."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 500, 600, 400). Must accommodate both sides of the balance and labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 300, 400, 250). Includes the hanger, beam, and hanging weights."),
  leftSide: z.array(Weight).describe("Weights hanging on the left side of the balance. Can be empty array for 0 = right side. Order determines left-to-right positioning."),
  rightSide: z.array(Weight).describe("Weights hanging on the right side of the balance. Can be empty array for left side = 0. Order determines left-to-right positioning."),
}).strict().describe("Creates a balance scale visualization for algebraic equations where each side represents one side of the equation. Weights can show constants or variables with different shapes and colors. Perfect for teaching equation solving, algebraic thinking, and the balance method. The horizontal beam shows the equation is balanced (equal).")```

Why this helps
- Eliminates style fallbacks and ensures consistent rendering.

Generator guidance
- Compute weight sizing from `height`; assume arrays provided with intended content.


