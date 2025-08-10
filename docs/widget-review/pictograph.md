### pictograph — Manual Widget Review

Principles: minimize nullables; no `.default()`, no `.refine()`; explicit title contract.

Scope
- Purpose: icon-based chart with category rows and a key

Current pain points
- Nullable `title` branches rendering.

Proposed API (no feature loss, fewer nullables)
- Require `title` explicitly; allow empty string to omit visible title.

Schema sketch
```ts
const Key = z.object({ 
  icon: z.string().describe("The emoji or symbol used to represent data (e.g., '🍎' for apple, '🚗' for car, '⭐' for star). Single emoji recommended."), 
  label: z.string().describe("What each icon represents with its value (e.g., '= 10 apples', '= 5 cars', '= 100 votes'). Shows the scale/multiplier.") 
}).strict()

const Row = z.object({ 
  category: z.string().describe("The category name for this row (e.g., 'Red Apples', 'Monday', 'Grade 3', 'Team A'). Displayed as row label on the left."), 
  iconCount: z.number().describe("Number of icons to display in this row (e.g., 3, 5.5, 0, 2.25). Can be fractional - partial icons show as partial emoji.") 
}).strict()

export const PictographPropsSchema = z.object({
  type: z.literal('pictograph').describe("Identifies this as a pictograph widget using icons to represent quantities."),
  title: z.string().describe("Title displayed above the pictograph (e.g., 'Fruit Sales This Week', 'Favorite Pets', ''). Empty string means no title."),
  key: Key.describe("Defines what each icon represents. The key is essential for interpreting the pictograph correctly."),
  data: z.array(Row).describe("Rows of data to display. Each row shows a category with its icon count. Order determines top-to-bottom display. Can be empty for blank pictograph."),
}).strict().describe("Creates a pictograph (picture graph) where quantities are represented by repeated icons/emojis. Each icon represents a specific value shown in the key. Supports fractional icons for precise values. Perfect for elementary data visualization, making abstract numbers concrete and engaging through visual representation.")```

Why this helps
- Removes nullable title check; display logic can rely on a consistent contract.

Generator guidance
- Render title only if `title` is non-empty; otherwise render no <h3>.


