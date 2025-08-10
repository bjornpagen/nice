### venn-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`; inline small circle objects.

Scope
- Purpose: two-circle Venn with counts for A-only, B-only, intersection, outside

Current pain points
- Nullable circle colors; size fallbacks.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `circleA.color` and `circleB.color`.

Schema sketch
```ts
const Circle = z.object({ 
  label: z.string().describe("Category name for this circle (e.g., 'Has a Dog', 'Likes Pizza', 'Students in Band', 'Even Numbers'). Keep concise to fit above circle."), 
  count: z.number().describe("Number of items ONLY in this circle, excluding the intersection (e.g., 12, 8, 0). This is the exclusive count for this category alone."), 
  color: z.string().describe("CSS fill color for this circle (e.g., '#FF6B6B' for red, 'rgba(100,149,237,0.5)' for translucent blue, 'lightgreen'). Use transparency for overlapping visibility.") 
}).strict()

export const VennDiagramPropsSchema = z.object({
  type: z.literal('vennDiagram').describe("Identifies this as a Venn diagram widget for visualizing set relationships and overlaps."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate both circles, labels, and outside region."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 300, 400, 250). Should provide balanced proportions with width."),
  circleA: Circle.describe("Left circle representing the first category or set. The count is for items ONLY in A (not in B)."),
  circleB: Circle.describe("Right circle representing the second category or set. The count is for items ONLY in B (not in A)."),
  intersectionCount: z.number().describe("Number of items in BOTH circles (A AND B intersection). Displayed in the overlapping region (e.g., 5, 15, 0)."),
  outsideCount: z.number().describe("Number of items in NEITHER circle (outside both A and B). Displayed outside the circles (e.g., 3, 20, 0)."),
}).strict().describe("Creates a two-circle Venn diagram showing set relationships with counts in each region. Displays four distinct regions: only A, only B, both A and B (intersection), and neither. Perfect for teaching set theory, logical relationships, and data categorization. Circle colors should be translucent to show overlap clearly.")```

Why this helps
- Eliminates size defaults and nullable colors; inputs are explicit and AI-friendly.


