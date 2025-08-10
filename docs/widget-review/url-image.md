### url-image — Manual Widget Review

Principles: minimize nullables; keep optional width/height as explicit unions if needed; no `.default()`.

Scope
- Purpose: render an external image with alt text and optional caption

Current pain points
- Nullable width/height and caption.

Proposed API (no feature loss, fewer nullables)
- Make `caption` a string (empty allowed).
- Keep width/height as number-or-null unions only if truly optional by design.

Schema sketch
```ts
export const UrlImageWidgetPropsSchema = z.object({
  type: z.literal('urlImage').describe("Identifies this as a URL image widget for displaying external images."),
  url: z.string().describe("Direct URL to the image resource (e.g., 'https://example.com/diagram.png', 'https://site.org/photo.jpg'). Must be publicly accessible. Supports common formats: PNG, JPG, GIF, SVG."),
  alt: z.string().min(1).describe("Required alternative text describing the image for accessibility. Should be meaningful and descriptive (e.g., 'Graph showing temperature rise over time', 'Diagram of water cycle'). Critical for screen readers."),
  width: z.union([z.number().positive(), z.null()]).describe("Optional width constraint in pixels (e.g., 400, 600, null). If null, uses image's natural width. If specified, image scales proportionally."),
  height: z.union([z.number().positive(), z.null()]).describe("Optional height constraint in pixels (e.g., 300, 400, null). If null, uses image's natural height. If specified, image scales proportionally."),
  caption: z.string().describe("Caption text displayed below the image (e.g., 'Figure 1: Cell Division Process', 'Source: NASA', ''). Empty string means no caption. Can include attribution or description."),
}).strict().describe("Embeds an external image from a URL with proper accessibility support. Handles various image formats and optional size constraints. The image scales proportionally if width or height is specified. Essential for including diagrams, photos, or illustrations from external sources. Always provide meaningful alt text for accessibility.")```

Why this helps
- Eliminates caption nullability and preserves explicit optional sizing via union consistent with Structured Outputs.


