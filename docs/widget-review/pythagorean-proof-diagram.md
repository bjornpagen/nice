### pythagorean-proof-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`.

Scope
- Purpose: classic visual proof with three squares on triangle sides

Current pain points
- Nullable size; nullable side labels inside squares.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Make `sideLabel` a string (empty string means absent).

Schema sketch
```ts
const SideSquare = z.object({ 
  area: z.number().describe("The area of this square in square units (e.g., 9, 16, 25, 12.5). Will be displayed inside the square. For Pythagorean theorem: a² + b² = c²."), 
  sideLabel: z.string().describe("Label for the triangle side this square is attached to (e.g., 'a', 'b', 'c', '3', '4', ''). Empty string means no side label. Typically lowercase letters.") 
}).strict()

export const PythagoreanProofDiagramPropsSchema = z.object({
  type: z.literal('pythagoreanProofDiagram').describe("Identifies this as a Pythagorean proof diagram showing the classic visual demonstration."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 400, 500, 600). Must accommodate all three squares and labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 400, 500, 600). Should be similar to width for proper proportions."),
  squareA: SideSquare.describe("The square on the first leg of the right triangle. Its area represents a² in the theorem."),
  squareB: SideSquare.describe("The square on the second leg of the right triangle. Its area represents b² in the theorem."),
  squareC: SideSquare.describe("The square on the hypotenuse of the right triangle. Its area represents c². Should equal squareA.area + squareB.area."),
}).strict().describe("Creates the classic visual proof of the Pythagorean theorem showing a right triangle with squares constructed on each side. The areas of the squares demonstrate that a² + b² = c². Essential for geometry education and visual understanding of the theorem.")```

Why this helps
- Removes nullable label logic and size fallbacks; generator treats empty strings as “none”.


