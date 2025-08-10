### parallelogram-trapezoid-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; discriminated union for shape.

Scope
- Purpose: draw parallelogram or trapezoid using geometric dimensions and forward to composite-shape renderer

Current pain points
- Nullable size; optional labels object; trapezoid left side optional as null.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- For trapezoid, replace optional `leftSideLength` with explicit union of right trapezoid vs general trapezoid.
- Labels provided explicitly (empty strings allowed to hide).

Schema sketch
```ts
const Parallelogram = z.object({ 
  type: z.literal('parallelogram').describe("Specifies a parallelogram shape."), 
  base: z.number().positive().describe("Length of the base (bottom side) in arbitrary units (e.g., 8, 10, 6.5). Parallel to the top side."), 
  height: z.number().positive().describe("Perpendicular distance between parallel sides in arbitrary units (e.g., 5, 7, 4). Not the slanted side length."), 
  sideLength: z.number().positive().describe("Length of the slanted side in arbitrary units (e.g., 6, 8, 5.5). Both slanted sides have equal length."), 
  labels: z.object({ 
    base: z.string().describe("Label for the base (e.g., '8 cm', 'b', '10', ''). Empty string hides label. Positioned below the base."), 
    height: z.string().describe("Label for the height (e.g., '5 cm', 'h', '7', ''). Empty string hides label. Shows perpendicular distance."), 
    sideLength: z.string().describe("Label for the slanted side (e.g., '6 cm', 's', '8', ''). Empty string hides label. Positioned along the side.") 
  }).strict() 
}).strict()

const RightTrapezoid = z.object({ 
  type: z.literal('trapezoidRight').describe("Specifies a right trapezoid (one perpendicular side)."), 
  topBase: z.number().positive().describe("Length of the top parallel side in arbitrary units (e.g., 6, 8, 4.5). Usually shorter than bottom."), 
  bottomBase: z.number().positive().describe("Length of the bottom parallel side in arbitrary units (e.g., 10, 12, 8). Usually longer than top."), 
  height: z.number().positive().describe("Perpendicular distance between parallel sides in arbitrary units (e.g., 5, 6, 4). Also the length of the left perpendicular side."), 
  labels: z.object({ 
    topBase: z.string().describe("Label for top base (e.g., '6 cm', 'a', ''). Empty string hides label."), 
    bottomBase: z.string().describe("Label for bottom base (e.g., '10 cm', 'b', ''). Empty string hides label."), 
    height: z.string().describe("Label for height/left side (e.g., '5 cm', 'h', ''). Empty string hides label."), 
    leftSide: z.string().describe("Label for left perpendicular side (e.g., '5 cm', 'h', ''). Often same as height. Empty string hides label."), 
    rightSide: z.string().describe("Label for right slanted side (e.g., '6.4 cm', 'c', ''). Empty string hides label.") 
  }).strict() 
}).strict()

const GeneralTrapezoid = z.object({ 
  type: z.literal('trapezoid').describe("Specifies a general trapezoid (both sides slanted)."), 
  topBase: z.number().positive().describe("Length of the top parallel side in arbitrary units (e.g., 5, 7, 4). Usually shorter than bottom."), 
  bottomBase: z.number().positive().describe("Length of the bottom parallel side in arbitrary units (e.g., 9, 12, 8). Usually longer than top."), 
  height: z.number().positive().describe("Perpendicular distance between parallel sides in arbitrary units (e.g., 4, 6, 5). Measured vertically."), 
  leftSideLength: z.number().positive().describe("Length of the left slanted side in arbitrary units (e.g., 5, 7, 4.5). Can differ from right side."), 
  labels: z.object({ 
    topBase: z.string().describe("Label for top base (e.g., '5 cm', 'a', ''). Empty string hides label."), 
    bottomBase: z.string().describe("Label for bottom base (e.g., '9 cm', 'b', ''). Empty string hides label."), 
    height: z.string().describe("Label for perpendicular height (e.g., '4 cm', 'h', ''). Shows with dashed line. Empty string hides label."), 
    leftSide: z.string().describe("Label for left slanted side (e.g., '5 cm', 'c', ''). Empty string hides label."), 
    rightSide: z.string().describe("Label for right slanted side (e.g., '5.5 cm', 'd', ''). Empty string hides label.") 
  }).strict() 
}).strict()

export const ParallelogramTrapezoidDiagramPropsSchema = z.object({
  type: z.literal('parallelogramTrapezoidDiagram').describe("Identifies this as a parallelogram or trapezoid diagram widget."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate the shape and labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 300, 400, 250). Must accommodate the shape and labels."),
  shape: z.discriminatedUnion('type', [Parallelogram, RightTrapezoid, GeneralTrapezoid]).describe("The specific quadrilateral to draw with its dimensions and labels."),
}).strict().describe("Creates accurate diagrams of parallelograms and trapezoids with labeled dimensions. Supports three types: parallelograms (opposite sides parallel and equal), right trapezoids (one perpendicular side), and general trapezoids (both sides slanted). Essential for geometry education, area calculations, and quadrilateral properties.")```

Why this helps
- Removes fallbacks and expresses right-trapezoid vs general explicitly; labels always present.

Generator guidance
- Map right-trapezoid to left offset 0; compute right side length from geometry.


