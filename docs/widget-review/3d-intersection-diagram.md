### 3d-intersection-diagram — Manual Widget Review

Principles: no `.default()`, no `.refine()`, no array min/max; eliminate nullables where avoidable; width/height required; discriminated unions for intent clarity; inline small objects (avoid `$ref`).

Scope
- File: `src/lib/widgets/generators/3d-intersection-diagram.ts`
- Purpose: 2D cross-section from slicing a 3D solid with a plane

Current pain points
- `plane.angle` accepted for all orientations but meaningful only for oblique.
- `width`/`height` nullable + transform leads to accidental fallback sizes.
- `viewOptions` partly optional → generator must inject defaults.

Proposed API (no feature loss, fewer nullables)
- Require `width` and `height` (no nullable, no transform).
- Use a discriminated union for `plane` so only ‘oblique’ includes `angle`.
- Require `viewOptions` with explicit fields (no nullables) so generation logic is deterministic.

Schema sketch
```ts
const Solid = z.discriminatedUnion('type', [
  z.object({ 
    type: z.literal('rectangularPrism').describe("Specifies a rectangular prism (box) solid."),
    width: z.number().positive().describe("The width of the rectangular prism along the x-axis in arbitrary units (e.g., 6, 10, 3.5). This is the horizontal extent when viewed from the front."), 
    height: z.number().positive().describe("The height of the rectangular prism along the y-axis in arbitrary units (e.g., 4, 8, 2.5). This is the vertical extent."), 
    depth: z.number().positive().describe("The depth of the rectangular prism along the z-axis in arbitrary units (e.g., 5, 12, 4). This extends into/out of the page.")
  }).strict(),
  z.object({ 
    type: z.literal('squarePyramid').describe("Specifies a square-based pyramid solid."),
    baseSide: z.number().positive().describe("The side length of the square base in arbitrary units (e.g., 6, 8, 5.5). All four sides of the base are equal."), 
    height: z.number().positive().describe("The perpendicular height from the base to the apex in arbitrary units (e.g., 7, 10, 4.5). Measured along the vertical axis.")
  }).strict(),
  z.object({ 
    type: z.literal('cylinder').describe("Specifies a circular cylinder solid."),
    radius: z.number().positive().describe("The radius of the circular base in arbitrary units (e.g., 3, 5, 2.5). The cylinder has uniform circular cross-sections."), 
    height: z.number().positive().describe("The height of the cylinder along its axis in arbitrary units (e.g., 8, 12, 6). The distance between the two circular bases.")
  }).strict(),
  z.object({ 
    type: z.literal('cone').describe("Specifies a circular cone solid."),
    radius: z.number().positive().describe("The radius of the circular base in arbitrary units (e.g., 4, 6, 3.5). The base is a perfect circle."), 
    height: z.number().positive().describe("The perpendicular height from the base to the apex in arbitrary units (e.g., 9, 12, 5). Measured along the cone's axis.")
  }).strict(),
  z.object({ 
    type: z.literal('sphere').describe("Specifies a perfect sphere solid."),
    radius: z.number().positive().describe("The radius of the sphere in arbitrary units (e.g., 5, 8, 3.5). All points on the surface are equidistant from the center.")
  }).strict(),
])

const Plane = z.discriminatedUnion('orientation', [
  z.object({ 
    orientation: z.literal('horizontal').describe("A plane parallel to the base, cutting through the solid horizontally like slicing a cake layer."), 
    position: z.number().min(0).max(1).describe("The relative position along the solid's height where the plane intersects (0 = bottom, 0.5 = middle, 1 = top). For example, 0.3 cuts through the lower third.")
  }).strict(),
  z.object({ 
    orientation: z.literal('vertical').describe("A plane perpendicular to the base, cutting through the solid vertically like slicing a loaf of bread."), 
    position: z.number().min(0).max(1).describe("The relative position along the solid's width where the plane intersects (0 = left edge, 0.5 = center, 1 = right edge). For example, 0.5 cuts through the middle.")
  }).strict(),
  z.object({ 
    orientation: z.literal('oblique').describe("A plane at an angle, neither purely horizontal nor vertical, creating diagonal cross-sections."), 
    position: z.number().min(0).max(1).describe("The relative position where the plane's center intersects the solid (0 = near bottom/left, 0.5 = center, 1 = near top/right)."), 
    angle: z.number().min(-90).max(90).describe("The tilt angle in degrees from horizontal (-90 = steep downward, 0 = horizontal, 45 = diagonal upward, 90 = steep upward). For example, 30 creates a gentle upward slope.")
  }).strict(),
])

const ViewOptions = z.object({
  projectionAngle: z.number().min(0).max(90).describe("The isometric projection angle in degrees for the 3D view (0 = straight-on side view, 30 = standard isometric, 45 = cabinet projection, 90 = top-down). Common value: 30 for clear 3D visualization."),
  intersectionColor: z.string().describe("The fill color for the cross-section area where the plane cuts the solid. Use CSS color format (e.g., '#FF6B6B' for red, 'rgba(107, 255, 184, 0.8)' for translucent green, 'orange')."),
  showHiddenEdges: z.boolean().describe("Whether to show edges that would be hidden behind the solid as dashed lines. Set to true for mathematical clarity, false for realistic appearance."),
  showLabels: z.boolean().describe("Whether to display measurement labels on the solid's dimensions and the cross-section. Set to true for problems requiring calculation, false for conceptual diagrams."),
}).strict()

export const ThreeDIntersectionDiagramPropsSchema = z.object({
  type: z.literal('threeDIntersectionDiagram').describe("Identifies this as a 3D intersection diagram widget that shows a cross-section of a 3D solid."),
  width: z.number().positive().describe("The total width of the output SVG in pixels. Must accommodate the 3D projection (e.g., 400, 600, 500). Larger values show more detail."),
  height: z.number().positive().describe("The total height of the output SVG in pixels. Should be proportional to the solid's dimensions (e.g., 300, 400, 350)."),
  solid: Solid.describe("The 3D geometric solid to be sliced by the plane. Each solid type produces different cross-section shapes when cut."),
  plane: Plane.describe("The cutting plane that intersects the solid. The orientation and position determine the shape of the resulting cross-section."),
  viewOptions: ViewOptions.describe("Visual presentation options that control how the 3D solid and its cross-section are rendered."),
}).strict().describe("Generates a 3D solid with a plane cutting through it, showing the resulting 2D cross-section. Essential for spatial reasoning and understanding how 3D shapes relate to their 2D slices.")
```

Why this helps
- Removes accidental size fallbacks and the rendering bugs they cause.
- Eliminates irrelevant `angle` when not oblique, simplifying authoring.
- Guarantees concrete styling/visibility toggles—no hidden defaults.

Generator guidance
- Assume all view options are present; remove internal defaulting.
- Use `plane.orientation` variants to branch computation cleanly.


