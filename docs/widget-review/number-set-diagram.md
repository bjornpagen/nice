### number-set-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; explicit styles.

Scope
- Purpose: Euler diagram of number set hierarchy (whole ⊂ integer ⊂ rational; irrational separate)

Current pain points
- Nullable size causes fallbacks.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `sets` labels and colors as provided.

Schema sketch
```ts
const Style = z.object({ 
  label: z.string().describe("Display name for this number set (e.g., 'Whole Numbers', 'Integers', 'Rational', 'ℚ'). Can use symbols or full names."), 
  color: z.string().describe("CSS fill color for this set's region (e.g., '#E8F4FD' for light blue, 'rgba(255,200,100,0.5)' for translucent orange). Use transparency for nested visibility.") 
}).strict()

export const NumberSetDiagramPropsSchema = z.object({
  type: z.literal('numberSetDiagram').describe("Identifies this as a number set diagram showing relationships between number systems."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 500, 600, 450). Must accommodate all nested sets and labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 400, 350, 450). Should provide good proportions for the nested ovals."),
  sets: z.object({ 
    whole: Style.describe("Style for whole numbers (0, 1, 2, ...). The innermost set in the hierarchy."), 
    integer: Style.describe("Style for integers (..., -2, -1, 0, 1, 2, ...). Contains whole numbers and their negatives."), 
    rational: Style.describe("Style for rational numbers (fractions/decimals). Contains integers and all fractions. Shown as containing whole ⊂ integer."), 
    irrational: Style.describe("Style for irrational numbers (π, √2, e, ...). Separate from rationals, together they form the reals.") 
  }).strict().describe("Styling for each number set in the hierarchy. The diagram shows whole ⊂ integer ⊂ rational, with irrational separate."),
}).strict().describe("Creates an Euler diagram showing the hierarchical relationship between number sets. Whole numbers nest inside integers, which nest inside rationals. Irrationals are shown separately. Together, rationals and irrationals form the real numbers. Essential for teaching number system classification and set relationships.")```

Why this helps
- Removes size fallbacks; styling always explicit.

Generator guidance
- Keep proportions as implemented; treat inputs as authoritative for labels/colors.


