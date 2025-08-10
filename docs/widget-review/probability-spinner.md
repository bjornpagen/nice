### probability-spinner — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; arrays not null; simple, explicit options.

Scope
- Purpose: spinner with grouped equal sectors, optional emojis, pointer angle, optional title

Current pain points
- Nullable size; `.min(1)` on array; nullable `emoji`, `title`.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use arrays (empty allowed) instead of nullable; keep `emoji` as string that can be empty to indicate none.

Schema sketch
```ts
const SectorGroup = z.object({ 
  count: z.number().int().positive().describe("Number of equal sectors in this group (e.g., 3, 5, 1). All sectors in a group share the same color and emoji. Must be positive integer."), 
  emoji: z.string().describe("Emoji to display in each sector of this group (e.g., '⭐', '🎯', '❌', ''). Empty string means no emoji, just colored sector. Single emoji recommended."), 
  color: z.string().describe("CSS fill color for all sectors in this group (e.g., '#FF6B6B' for red, 'lightblue', 'rgba(255,200,0,0.8)'). Each group should have distinct color.") 
}).strict()

export const ProbabilitySpinnerPropsSchema = z.object({
  type: z.literal('probabilitySpinner').describe("Identifies this as a probability spinner widget for demonstrating random events and likelihood."),
  width: z.number().positive().describe("Total width of the spinner diagram in pixels (e.g., 400, 500, 350). Must accommodate the circle and pointer with padding."),
  height: z.number().positive().describe("Total height of the spinner diagram in pixels (e.g., 400, 500, 350). Should include space for title if present. Often equal to width."),
  groups: z.array(SectorGroup).describe("Array of sector groups defining the spinner. Total sectors = sum of all counts. Order affects color assignment. Empty array creates blank spinner."),
  pointerAngle: z.number().describe("Angle in degrees where the arrow points (0 = right, 90 = up, 180 = left, 270 = down). Can be any value; wraps around 360. Determines 'current' sector."),
  title: z.string().describe("Title displayed above the spinner (e.g., 'Spin the Wheel!', 'Color Spinner', ''). Empty string means no title. Keep concise for space."),
}).strict().describe("Creates a circular spinner divided into colored sectors for probability experiments. Each sector group can have multiple equal sectors with the same appearance. Perfect for teaching probability, likelihood, and random events. The pointer indicates the 'selected' outcome.")```

Why this helps
- Removes schema-level size defaults and nullable branching; generator treats empty strings as “absent”.

Generator guidance
- If `title === ''`, skip rendering the title line. If `emoji === ''`, render color-only sector.


