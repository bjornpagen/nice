### geometric-solid-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; discriminated union for solids; arrays instead of null.

Scope
- File: `src/lib/widgets/generators/geometric-solid-diagram.ts`
- Purpose: render cylinder/cone/sphere with dimension labels

Current pain points
- Nullable size causes fallbacks.
- `labels` nullable array.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use a non-null `labels` array (possibly empty).

Schema sketch
```ts
const Cylinder = z.object({ 
  type: z.literal('cylinder').describe("Specifies a circular cylinder shape."), 
  radius: z.number().describe("Radius of the circular base in arbitrary units (e.g., 3, 5, 4.5). The cylinder has uniform circular cross-sections."), 
  height: z.number().describe("Height of the cylinder along its axis in arbitrary units (e.g., 8, 10, 6.5). The distance between the two circular bases.") 
}).strict()

const Cone = z.object({ 
  type: z.literal('cone').describe("Specifies a circular cone shape."), 
  radius: z.number().describe("Radius of the circular base in arbitrary units (e.g., 4, 6, 3.5). The base is at the bottom of the cone."), 
  height: z.number().describe("Perpendicular height from base to apex in arbitrary units (e.g., 7, 9, 5.5). Measured along the cone's axis.") 
}).strict()

const Sphere = z.object({ 
  type: z.literal('sphere').describe("Specifies a perfect sphere shape."), 
  radius: z.number().describe("Radius of the sphere in arbitrary units (e.g., 5, 8, 4). All points on the surface are equidistant from center.") 
}).strict()

const DimensionLabel = z.object({ 
  target: z.enum(['radius','height']).describe("Which dimension to label. 'radius' labels the radius/diameter, 'height' labels vertical dimension (not applicable for spheres)."), 
  text: z.string().describe("The label text to display (e.g., 'r = 5', '10 cm', 'h = 8', 'd = 10'). Can include units, equations, or simple values.") 
}).strict()

export const GeometricSolidDiagramPropsSchema = z.object({
  type: z.literal('geometricSolidDiagram').describe("Identifies this as a geometric solid diagram showing 3D shapes with dimension labels."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 300, 400, 350). Must accommodate the 3D projection and labels."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 300, 400, 350). Should fit the shape with comfortable padding."),
  shape: z.discriminatedUnion('type', [Cylinder, Cone, Sphere]).describe("The 3D geometric solid to display. Each type has specific dimension requirements."),
  labels: z.array(DimensionLabel).describe("Dimension labels to display on the shape. Empty array means no labels. Can label radius, height, or both as appropriate for the shape type."),
}).strict().describe("Creates 3D geometric solids (cylinder, cone, sphere) with optional dimension labels. Uses isometric-style projection to show depth. Essential for teaching volume, surface area, and 3D geometry concepts. Labels help identify key measurements for calculations.")```

Why this helps
- Eliminates size fallbacks and nullable label array branches.

Generator guidance
- Treat empty `labels` as “no labels”; rendering otherwise unchanged.


