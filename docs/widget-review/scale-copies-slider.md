### scale-copies-slider — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; inline small schemas.

Scope
- Purpose: compare proportional vs non-proportional scaling (before/after rectangles) for two labeled groups

Current pain points
- Nullable size; nullable `color` on groups.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Make `color` required.

Schema sketch
```ts
const Rect = z.object({ 
  width: z.number().positive().describe("Width of the rectangle in relative units (e.g., 4, 6, 2.5). Not pixels - scaled to fit display area."), 
  height: z.number().positive().describe("Height of the rectangle in relative units (e.g., 3, 4, 1.5). Proportions matter more than absolute values.") 
}).strict()

const Group = z.object({ 
  label: z.string().describe("Label for this shape transformation (e.g., 'Shape A', 'Rectangle 1', 'Original'). Displayed as a header for the shape pair."), 
  before: Rect.describe("Dimensions of the original rectangle before transformation."), 
  after: Rect.describe("Dimensions of the rectangle after transformation. Compare proportions to 'before' to show scaling type."), 
  color: z.string().describe("CSS fill color for both rectangles in this group (e.g., '#4472C4' for blue, 'orange', 'rgba(255,0,0,0.7)'). Distinguishes the two shape groups.") 
}).strict()

export const ScaleCopiesSliderPropsSchema = z.object({
  type: z.literal('scaleCopiesSlider').describe("Identifies this as a scale copies comparison widget showing proportional vs non-proportional scaling."),
  width: z.number().positive().describe("Total width of the widget in pixels (e.g., 600, 700, 500). Must accommodate both shape groups side by side."),
  height: z.number().positive().describe("Total height of the widget in pixels (e.g., 400, 350, 300). Must fit labels and largest rectangles."),
  shapeA: Group.describe("First shape transformation, typically showing proportional scaling where width and height scale by same factor."),
  shapeB: Group.describe("Second shape transformation, typically showing non-proportional scaling where dimensions scale differently."),
}).strict().describe("Compares two rectangle transformations side-by-side to illustrate proportional (similar shapes) vs non-proportional scaling. Each group shows before/after rectangles. Essential for teaching similarity, scale factors, and distinguishing between scaling that preserves shape vs distortion.")```

Why this helps
- Eliminates size fallbacks and nullable color; generator uses a consistent contract.


