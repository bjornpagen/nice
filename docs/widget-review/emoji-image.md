### emoji-image — Manual Widget Review

Principles: require sizing; minimize nullables; no `.default()`, no `.refine()`.

Scope
- File: `src/lib/widgets/generators/emoji-image.ts`
- Purpose: render a single emoji at a given size as SVG

Current pain points
- Nullable `size` causes fallback rendering.

Proposed API (no feature loss, fewer nullables)
- Require `emoji` and `size`.

Schema sketch
```ts
export const EmojiImagePropsSchema = z.object({
  type: z.literal('emojiImage').describe("Identifies this as an emoji image widget for displaying a single emoji character."),
  emoji: z.string().describe("The emoji character to display (e.g., '🎉', '📚', '🌟', '👍'). Must be a valid Unicode emoji. Can be single emoji or emoji with modifiers."),
  size: z.number().positive().describe("Size of the emoji in pixels (both width and height). Controls the font size and SVG dimensions (e.g., 48, 64, 100, 32). Larger sizes show more detail."),
}).strict().describe("Renders a single emoji as an SVG image with consistent sizing and centering. Useful for icons, visual elements in problems, or decorative purposes. The emoji is centered and baseline-adjusted for proper alignment.")```

Why this helps
- Eliminates fallback; enforces consistent dimensions and layout.

Generator guidance
- Keep baseline adjustment; assume `size` is present.


