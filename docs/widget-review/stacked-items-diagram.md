### stacked-items-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`.

Scope
- Purpose: stack repeated emoji over a base emoji with orientation and overlap controls

Current pain points
- Nullable orientation/overlap defaults.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Make `orientation` and `overlap` required.

Schema sketch
```ts
const Emoji = z.object({ 
  emoji: z.string().describe("The emoji character to display (e.g., '🍦' for ice cream cone, '🍨' for scoop, '🥞' for pancake, '📚' for books). Single emoji recommended."), 
  size: z.number().describe("Size of the emoji in pixels (e.g., 60, 80, 48). Controls both font size and spacing. Larger sizes are more visible but take more space."), 
  label: z.string().describe("Accessibility label describing the emoji for screen readers (e.g., 'ice cream cone', 'scoop of ice cream', 'pancake'). Important for accessibility.") 
}).strict()

export const StackedItemsDiagramPropsSchema = z.object({
  type: z.literal('stackedItemsDiagram').describe("Identifies this as a stacked items diagram for visualizing repeated objects in a stack."),
  width: z.number().positive().describe("Total width of the diagram container in pixels (e.g., 300, 400, 250). Must accommodate the full stack width."),
  height: z.number().positive().describe("Total height of the diagram container in pixels (e.g., 400, 500, 300). Must accommodate the full stack height."),
  altText: z.string().describe("Comprehensive description of the complete stacked image for accessibility (e.g., 'An ice cream cone with 3 scoops stacked on top'). Describes the final visual."),
  baseItem: Emoji.describe("The bottom/foundation item that appears once. This anchors the stack (e.g., cone for ice cream, plate for pancakes)."),
  stackedItem: Emoji.describe("The item that repeats in the stack. Appears 'count' times above/beside the base (e.g., ice cream scoops, pancakes, books)."),
  count: z.number().int().describe("Number of times to repeat the stacked item (e.g., 3 for three scoops, 5 for five pancakes). Can be 0 for just the base. Must be non-negative."),
  orientation: z.enum(['vertical','horizontal']).describe("Stacking direction. 'vertical' stacks upward (like ice cream), 'horizontal' stacks sideways (like books on shelf)."),
  overlap: z.number().describe("Overlap factor between stacked items. 1.0 = touching edges, 0.5 = 50% overlap, 1.5 = gaps between items. Typical: 0.7-0.9 for realistic stacking."),
}).strict().describe("Creates visual representations of stacked items using emojis, perfect for word problems and counting exercises. Commonly used for ice cream scoops on cones, pancake stacks, book piles, or any scenario involving repeated items. The overlap parameter creates realistic-looking stacks.")```

Why this helps
- Removes schema-level fallbacks; keeps rendering logic straightforward.


