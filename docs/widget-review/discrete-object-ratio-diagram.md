### discrete-object-ratio-diagram — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`, no array min/max.

Scope
- File: `src/lib/widgets/generators/discrete-object-ratio-diagram.ts`
- Purpose: render emojis/objects to visualize ratios

Current pain points
- Nullable size → fallback rendering.
- Layout optional with transform; title nullable.
- `objects` currently allows min(1); avoid array min/max per constraints.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Require `layout` and `title` explicitly (allow empty string for “no title”).
- Keep `objects` as an array without min constraint; assume non-empty at generation time if required by UI.

Schema sketch
```ts
const ObjectType = z.object({ 
  count: z.number().int().describe("Number of objects of this type to display. Must be non-negative integer (e.g., 5, 12, 0). Zero means this type is absent."), 
  emoji: z.string().describe("The emoji character representing this object type (e.g., '🍎' for apple, '🍊' for orange, '🐶' for dog). Should be a single emoji for clarity.") 
}).strict()

export const DiscreteObjectRatioDiagramPropsSchema = z.object({
  type: z.literal('discreteObjectRatioDiagram').describe("Identifies this as a discrete object ratio diagram for visualizing ratios with countable objects."),
  width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 400, 500, 600). Must accommodate all objects with reasonable spacing."),
  height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 300, 400, 250). Adjust based on total object count and layout."),
  objects: z.array(ObjectType).describe("Array of object types with their counts. Each type uses a different emoji. Order affects color assignment and grouping. Can be empty array for blank diagram."),
  layout: z.enum(['grid','cluster']).describe("Visual arrangement of objects. 'grid' spaces all objects evenly in rows. 'cluster' groups objects by type, ideal for showing distinct ratios."),
  title: z.string().describe("Title displayed above the diagram (e.g., 'Fruit Basket Contents', 'Pet Types in Class', ''). Empty string means no title. Keep concise."),
}).strict().describe("Creates visual representations of ratios using discrete countable objects (emojis). Perfect for elementary ratio concepts, part-to-part and part-to-whole relationships. The 'cluster' layout clearly shows groupings while 'grid' emphasizes the total collection.")```

Why this helps
- Removes fallbacks; dimensions and layout are explicit.
- Simplifies generation: title presence consistent, arrays unambiguous.

Generator guidance
- If empty `objects`, render an empty frame or throw early (decide globally for visuals).


