# Title Wrapping Audit and TODOs

This document lists all widget generators that render a title and need to adopt the same conservative wrapping behavior as `area-graph`.

Conservative wrapping rule to implement:
- Only split the title into two lines when it ends with a parenthetical (e.g., "(...)") AND the full title length > 36 characters.
- Split into: [base text] and [parenthetical], placing the parenthetical on a new line.
- Otherwise, keep the title on a single line.
- Use the same `renderWrappedText(text, x, y, className, lineHeight)` helper from `src/lib/widgets/generators/area-graph.ts` (copy into the file or refactor into a shared util if needed). Do not enable aggressive width-based wrapping yet.

Widgets with title rendering and current status

1) `src/lib/widgets/generators/area-graph.ts`
- Status: IMPLEMENTED. Uses `renderWrappedText` with conservative split.

2) `src/lib/widgets/generators/bar-chart.ts`
- Current: Renders title directly with `<text class="title">${title}</text>`.
- TODO:
  - Add the `renderWrappedText` helper (or import a shared one if extracted).
  - Replace:
    ```ts
    if (title !== null) svg += `<text x="${width / 2}" y="${margin.top / 2}" class="title">${title}</text>`
    ```
    with:
    ```ts
    if (title !== null) svg += renderWrappedText(title, width / 2, margin.top / 2, "title", "1.1em")
    ```
  - Keep className `title` for consistent styling.

3) `src/lib/widgets/generators/line-graph.ts`
- Current: Renders title directly.
- TODO: Same change as bar chart; use `renderWrappedText(title, width/2, margin.top/2, "title", "1.1em")`.

4) `src/lib/widgets/generators/scatter-plot.ts`
- Current: Renders title directly.
- TODO: Same change as bar chart; use `renderWrappedText(title, width/2, pad.top/2, "title", "1.1em")`.

5) `src/lib/widgets/generators/pi-chart.ts`
- Current: Per-chart title is rendered directly at `y = yOffset + 25` with `class="title"`.
- TODO:
  - Add `renderWrappedText` inside this file.
  - Replace direct `<text>` with `renderWrappedText(chart.title, cx, titleY, "title", "1.1em")`.
  - Note: This helper will split only if the title ends with parenthetical and is long; otherwise keep one line.

6) `src/lib/widgets/generators/histogram.ts`
- Current: Renders title directly with `<text class="title">`.
- TODO: Same change as bar chart; use `renderWrappedText(title, width/2, margin.top/2, "title", "1.1em")`.

7) `src/lib/widgets/generators/probability-spinner.ts`
- Current: Renders title directly with `<text class="title">`.
- TODO: Same change; use `renderWrappedText(title, cx, padding - 10, "title", "1.1em")`.

Widgets without explicit top title (no changes required)
- `src/lib/widgets/generators/divergent-bar-chart.ts` — y-axis label only.
- `src/lib/widgets/generators/population-bar-chart.ts` — no top title, only axis labels.
- `src/lib/widgets/generators/data-table.ts` — caption is HTML, not SVG; out of scope.
- `src/lib/widgets/generators/coordinate-plane-base.ts` — axis title descriptions only, no top title rendering.
- `src/lib/widgets/generators/periodic-table.ts` — embedded SVG metadata titles, not UI titles.

Test updates required
- For each modified widget, add/update a test that uses a long title ending with a parenthetical (e.g., "(... to ...)") and assert snapshot shows two `<tspan>` lines for the title.
- Also include a shorter title variant that should remain a single line to assert conservative behavior.

Implementation notes
- Keep the style block defining `.title` unchanged in each widget.
- If extracting a shared helper, place it under `src/lib/widgets/text.ts` (or similar), export `renderWrappedText`, and update imports using absolute alias `@/`.
- Do not add aggressive width-based wrapping at this time; only conservative parenthetical split with length check.

Additional widgets/fields with titles (tracked for completeness)

- `src/lib/widgets/generators/pictograph.ts`
  - Field: `title` (HTML rendering via <h3>) – consider applying similar conservative split if long with parenthetical.
- `src/lib/widgets/generators/vertical-arithmetic-setup.ts`
  - Field: `title` (HTML div above problem) – typically short; if needed, consider conservative split or leave as-is.
- `src/lib/widgets/generators/discrete-object-ratio-diagram.ts`
  - Field: `title` (SVG text) – currently direct `<text>`; candidate to adopt `renderWrappedText` conservative split.
- `src/lib/widgets/generators/data-table.ts`
  - Field: `title` (HTML `<caption>`) – not SVG; keep as-is (out of scope for current wrapper).
- `src/lib/widgets/generators/periodic-table.ts`
  - Contains metadata `<dc:title>` entries – not UI; no changes needed.
- `src/lib/widgets/generators/coordinate-plane-base.ts`
  - Mentions axis title in descriptions; no top title rendering here; no changes needed.

Future work note
- For HTML-rendered titles (pictograph, data table, vertical arithmetic), if we later want consistent wrapping, we can implement the same parenthetical-split logic using `<span>` wrappers or simple string split across `<br/>`. Keep conservative rule (only when parenthetical exists and string is long).
