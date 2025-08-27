## RCA: Y‑axis label overlaps tick numbers despite utils unification

### Summary
- **Issue**: Y‑axis titles sometimes overlap tick labels; in other cases they sit too far away. This persists across multiple widgets despite adopting shared utils under `@/lib/widgets/utils`.
- **Scope**: Affects charts that render a vertical axis title (area, line, histogram, divergent bar, conceptual/coordinate‑style, keeling curve, etc.).
- **Impact**: Visual collisions and inconsistent spacing reduce readability and undermine our unified rendering story; requires manual tune‑ups per widget.

### Symptoms (examples)
- Negative `viewBox` minX values show the canvas was widened post‑hoc to avoid clipping, e.g. `viewBox="-231 0 ..."`, `viewBox="-86 0 ..."`, `viewBox="-65 0 ..."` in snapshots.
- Some charts show the y‑axis title rotated at the expected pivot but still **on top of** numeric tick labels.
- Others render the y‑axis title with excessive left padding.

Selected excerpt from snapshots (note negative viewBox and rotated y label):
```xml
<svg width="841" height="350" viewBox="-231 0 841 350" ...>
  ...
  <text transform="rotate(-90, 17.6, 176.5)" x="17.6" y="176.5" class="axis-label">...</text>
  ...
</svg>
```

### Expected vs Actual
- **Expected**: A single, consistent layout system computes margins so that axis titles and tick labels never overlap, regardless of title length or chart height. Extents should be used only to prevent clipping of outer elements (e.g., legends) and should not be relied upon to "fix" spacing.
- **Actual**: We compute margins using shared helpers, but their text size heuristics and sporadic bypasses in widgets lead to under‑ or over‑allocation on the left; extents then expand the canvas to keep text visible, which masks but does not resolve spacing conflicts.

### Relevant Architecture
We currently centralize two responsibilities:

1) Rendering the rotated, wrapped y‑axis title:
```65:80:src/lib/widgets/utils/text.ts
export function renderRotatedWrappedYAxisLabel(
	text: string,
	x: number,
	yCenter: number,
	chartHeightPx: number,
	className = "axis-label",
	lineHeight = "1.1em",
	approxCharWidthPx = 8,
	paddingPx = 10
): string {
	const maxWrappedWidth = Math.max(20, chartHeightPx - 2 * paddingPx)
	let wrapped = renderWrappedText(text, x, yCenter, className, lineHeight, maxWrappedWidth, approxCharWidthPx)
	// Inject rotation transform with pivot
	wrapped = wrapped.replace("<text ", `<text transform="rotate(-90, ${x}, ${yCenter})" `)
	return wrapped
}
```

2) Computing the left margin and label pivot X position from y‑axis config and chart height:
```61:100:src/lib/widgets/utils/layout.ts
export function calculateYAxisLayout(
	yAxis: {
		max: number
		min: number
		tickInterval: number
		label: string
	},
	chartHeightPx: number,
	titlePadding = 20
): { leftMargin: number; yAxisLabelX: number } {
	const AVG_CHAR_WIDTH_PX = 8
	const TICK_LENGTH = 5
	const LABEL_PADDING = 10
	const AXIS_TITLE_FONT_SIZE = 16

	// 1. Calculate width needed for tick labels
	let maxTickLabelWidth = 0
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		const label = String(t)
		maxTickLabelWidth = Math.max(maxTickLabelWidth, label.length * AVG_CHAR_WIDTH_PX)
	}

	// 2. Calculate the effective width of the rotated, wrapped axis label
	const { height: wrappedLabelHeight } = estimateWrappedTextDimensions(
		yAxis.label,
		chartHeightPx,
		AXIS_TITLE_FONT_SIZE
	)

	// 3. Take the larger requirement
	const spaceForTickLabels = TICK_LENGTH + LABEL_PADDING + maxTickLabelWidth
	const spaceForAxisLabel = titlePadding + wrappedLabelHeight

	const leftMargin = Math.max(spaceForTickLabels, spaceForAxisLabel)
	const yAxisLabelX = wrappedLabelHeight / 2
	return { leftMargin, yAxisLabelX }
}
```

Many generators use these helpers correctly—for example, line graph:
```125:131:src/lib/widgets/generators/line-graph.ts
const { leftMargin, yAxisLabelX } = calculateYAxisLayout(yAxis, chartHeight)
const margin = { ...marginWithoutLeft, left: leftMargin }
// ... later
```
```152:168:src/lib/widgets/generators/line-graph.ts
// Left Y-axis
svg += `<g class="axis y-axis-left">`
svg += `<line x1="${margin.left}" ... />`
{
	const yCenter = margin.top + chartHeight / 2
	svg += renderRotatedWrappedYAxisLabel(abbreviateMonth(yAxis.label), yAxisLabelX, yCenter, chartHeight)
}
for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
	// tick lines and labels
}
```

Similarly for area and histogram:
```101:141:src/lib/widgets/generators/area-graph.ts
const { leftMargin, yAxisLabelX } = calculateYAxisLayout(yAxis, chartHeight)
// ...
svg += renderRotatedWrappedYAxisLabel(
	abbreviateMonth(yAxis.label),
	yAxisLabelX,
	margin.top + chartHeight / 2,
	chartHeight
)
```
```142:177:src/lib/widgets/generators/histogram.ts
const { leftMargin, yAxisLabelX } = calculateYAxisLayout(mockYAxis, chartHeight)
// ...
svg += renderRotatedWrappedYAxisLabel(
	abbreviateMonth(yAxis.label),
	yAxisLabelX,
	margin.top + chartHeight / 2,
	chartHeight
)
```

But some generators still hardcode the y‑axis title X rather than using the computed margin/pivot (example: Keeling curve):
```187:191:src/lib/widgets/generators/keeling-curve.ts
svg += `<text x="${margin.left + chartWidth / 2}" y="${height - 10}" class="axis-label">${xAxisLabel}</text>`
svg += renderRotatedWrappedYAxisLabel(yAxisLabel, margin.left - 50, margin.top + chartHeight / 2, chartHeight)
```

Finally, the dynamic width/extents logic tracks all text/points to avoid clipping and then rewrites the `viewBox`:
```41:50:src/lib/widgets/utils/layout.ts
export function computeDynamicWidth(
	ext: Extents,
	_height: number,
	pad = 10
): { vbMinX: number; vbMaxX: number; dynamicWidth: number } {
	const vbMinX = Math.min(0, Math.floor(ext.minX - pad))
	const vbMaxX = Math.max(0, Math.ceil(ext.maxX + pad))
	const dynamicWidth = Math.max(1, vbMaxX - vbMinX)
	return { vbMinX, vbMaxX, dynamicWidth }
}
```
```202:205:src/lib/widgets/generators/divergent-bar-chart.ts
const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, 10)
svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
```

### Root Causes
1) **Font metrics mismatch** in margin calculations
   - `calculateYAxisLayout` estimates text width/height using constants (`AVG_CHAR_WIDTH_PX = 8`, `AXIS_TITLE_FONT_SIZE = 16`).
   - Widgets use varying font sizes/weights via inline `<style>` or differing defaults (12px, 14px, bold). When actual tick or title text is larger/heavier than assumed, **leftMargin is underestimated**, so the rotated title encroaches on tick labels. When smaller, we over‑allocate (too far left).

2) **Inconsistent adoption** of layout helpers
   - Most generators use `calculateYAxisLayout` + `renderRotatedWrappedYAxisLabel`; a few still hardcode offsets (e.g., `margin.left - 50`), bypassing unified spacing and producing different behavior.

3) **Extents as a canvas shim, not a layout solver**
   - `includeText` + `computeDynamicWidth` ensure nothing is clipped, but they only expand the `viewBox`; they **do not change margins**. This prevents cutoffs while leaving the underlying spacing conflict intact.

4) **Ordering sensitivity**
   - Layout must compute vertical margins first (title, x‑axis) to know `chartHeight`, then compute left/right margins using that height. Some earlier codepaths predated this strict order; stragglers or mixed logic can yield inconsistent inputs to the y‑axis layout.

### Why our unification didn’t fully fix it
- We unified the rendering calls but left the **text metric heuristics** fixed. Small deviations in font size/weight (even per‑widget CSS) shift the true pixel sizes of both tick labels and wrapped y‑title.
- A few widgets still **bypass** the helpers and hardcode offsets, which guarantees divergence.
- Extents give a "cleaned" output (no clipping) that **hides** the spacing error rather than eliminating it.

### Reproduction guide
1) Use a y‑axis with long title and dense ticks; set tick font to 14px bold in the chart‑local `<style>`, but keep `calculateYAxisLayout` defaults (8px char width, 16px title font). 
2) Render. Observe that leftMargin is too small → rotated y‑title’s bounding box crosses into tick label area.
3) The final SVG shows negative `viewBox` minX; the overlap is visible despite the canvas expansion.

### What “good” looks like (design goals)
- Single‑pass layout with strict order: title/top → x‑axis/bottom → compute chartHeight → y‑axes/left & right → compute chartWidth → draw plot.
- A **theme** provides actual text metrics per role (tick, title, axis title, legend); layout helpers receive these metrics rather than hardcoded constants.
- All widgets use a shared **chart frame** and standardized axis renderers; no widget emits its own hardcoded y‑axis offsets.
- Extents remain an anti‑clipping step only.

### Concrete evidence across widgets
- Divergent bar chart (correct helper usage, but still heuristic):
```101:153:src/lib/widgets/generators/divergent-bar-chart.ts
const { leftMargin, yAxisLabelX } = calculateYAxisLayout(yAxis, chartHeight)
// ...
svg += renderRotatedWrappedYAxisLabel(abbreviateMonth(yAxis.label), globalYAxisLabelX, globalYAxisLabelY, chartHeight)
```

- Line graph (left axis unified, right axis uses right‑side helper):
```171:181:src/lib/widgets/generators/line-graph.ts
if (yAxisRight) {
	const rightAxisX = width - margin.right
	svg += `<g class="axis y-axis-right">`
	// ...
	svg += `<text x="${rightAxisX + rightYAxisLabelX}" y="${margin.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${rightAxisX + rightYAxisLabelX}, ${margin.top + chartHeight / 2})">${abbreviateMonth(yAxisRight.label)}</text>`
}
```

- Keeling curve (hardcoded y‑axis title x offset):
```187:191:src/lib/widgets/generators/keeling-curve.ts
svg += renderRotatedWrappedYAxisLabel(yAxisLabel, margin.left - 50, margin.top + chartHeight / 2, chartHeight)
```

### Decision
Adopt **Strategy 1: Unified Chart Frame (single‑pass)**

Key elements:
- Freeze typography in a central theme; pass real metrics into layout helpers.
- Enforce one layout order across all widgets (vertical → compute chartHeight → horizontal → compute chartWidth → draw).
- Provide shared axis renderers and a single function that returns the frame (margins, pivots, `toSvgX/Y`, and a `plotArea` group transform).
- Remove all per‑widget hardcoded y‑axis offsets.

### Acceptance criteria
- For a matrix of widgets (line, area, histogram, divergent bar, conceptual, coordinate plane, etc.) with long/short titles and varied tick sizes:
  - No y‑axis title overlaps tick labels at any size.
  - No unnecessary excessive left padding.
  - Negative `viewBox` minX may still occur for legends/annotations but not due to axis spacing.

### Risks & mitigations
- Risk: Some widgets rely on local CSS that changes font sizes; this can drift from the theme.
  - Mitigation: Centralize fonts in the theme and ban local overrides for axis/ticks/titles.
- Risk: Dual axes + long legends can tempt conditional reflow decisions that re‑introduce cycles.
  - Mitigation: Keep legend sizing based on theme (worst‑case width) rather than measured chartWidth.

### Next steps (implementation plan outline)
1) Introduce a chart frame builder that returns margins, axis pivots, and a `plotArea` transform.
2) Move axis rendering (ticks/grid/title) behind shared functions using the theme.
3) Update all widgets to use the frame and remove hardcoded offsets.
4) Run snapshot audit and visually verify the acceptance matrix.

### Appendix: Why we did not choose a two‑pass layout
- Single‑pass works if we avoid circular dependencies by design (freeze typography, compute vertical before horizontal, no conditional reflow based on chartWidth). Two‑pass is only warranted if we deliberately support dynamic reflow that depends on computed dimensions.

## Comprehensive audit and required refactors

### Classification key
- **Compliant**: Uses `calculateYAxisLayout(...)` to compute `leftMargin` and `yAxisLabelX`, and uses `renderRotatedWrappedYAxisLabel(...)` (or a manual rotate) at that computed X. No hardcoded offsets.
- **Partial**: Uses the rotated label helper but positions it with a hardcoded X instead of `yAxisLabelX`, or mixes helpers with local constants.
- **Violating**: Bypasses the helpers entirely for axis spacing/placement and relies on magic numbers.

### Widgets: current status (by generator)
- Compliant (left/primary axis):
  - `src/lib/widgets/generators/line-graph.ts` (left axis) — `calculateYAxisLayout` + `renderRotatedWrappedYAxisLabel`
  - `src/lib/widgets/generators/area-graph.ts` — `calculateYAxisLayout` + `renderRotatedWrappedYAxisLabel`
  - `src/lib/widgets/generators/histogram.ts` — `calculateYAxisLayout` + `renderRotatedWrappedYAxisLabel`
  - `src/lib/widgets/generators/divergent-bar-chart.ts` — `calculateYAxisLayout` + `renderRotatedWrappedYAxisLabel`
  - `src/lib/widgets/generators/population-bar-chart.ts` — `calculateYAxisLayout` + `renderRotatedWrappedYAxisLabel`
  - `src/lib/widgets/generators/bar-chart.ts` — `calculateYAxisLayout` + `renderRotatedWrappedYAxisLabel`
  - `src/lib/widgets/generators/scatter-plot.ts` — `calculateYAxisLayout` + `renderRotatedWrappedYAxisLabel`
  - `src/lib/widgets/generators/population-change-event-graph.ts` — `calculateYAxisLayout` + `renderRotatedWrappedYAxisLabel`
  - `src/lib/widgets/generators/parabola-graph.ts` — `calculateYAxisLayout` + manual `<text ... transform="rotate(-90, yAxisLabelX, ...)"/>`
  - `src/lib/widgets/generators/coordinate-plane-base.ts` — `calculateYAxisLayout` + manual `<text ... transform="rotate(-90, yAxisLabelX, ...)"/>`

- Partial:
  - `src/lib/widgets/generators/line-graph.ts` (right axis) — uses `calculateRightYAxisLayout` correctly but renders the right title via manual rotate; ensure it always uses the computed `rightYAxisLabelX` (it currently does, but watch for any future local offsets).
  - `src/lib/widgets/generators/conceptual-graph.ts` — uses `renderRotatedWrappedYAxisLabel` with a hardcoded X (`yAxisX - 20`) and a fixed `padding.left = 80`. Should switch to `calculateYAxisLayout` and place the title at returned `yAxisLabelX`.

- Violating (for axis spacing):
  - `src/lib/widgets/generators/keeling-curve.ts` — hardcoded y‑axis label X (`margin.left - 50`), local margins; must adopt `calculateYAxisLayout` and the unified frame ordering.

- Not relevant to axis titles but noteworthy rotate usage:
  - `src/lib/widgets/generators/number-line-with-action.ts` — uses `rotate(-90, ...)` for an action label (not an axis). Keep, but ensure no magic overlap with axes in composite contexts.

If you find other charts emitting a vertical axis title, they should be moved into the Compliant bucket by applying the same steps below.

### Refactor requirements per widget (must-do work)
For each widget that renders a y‑axis title:
1) Replace any hardcoded y‑axis title X offsets with the computed `yAxisLabelX` from `calculateYAxisLayout(yAxis, chartHeight)`.
2) Compute vertical margins first (`calculateTitleLayout`, then `calculateXAxisLayout`) to get `chartHeight` before calling `calculateYAxisLayout`.
3) Render the rotated y‑axis label via `renderRotatedWrappedYAxisLabel(title, yAxisLabelX, margin.top + chartHeight / 2, chartHeight)` (or manual `<text ... transform="rotate(-90, ...)"/>` using the computed pivot).
4) Remove local magic numbers for axis spacing (e.g., `padding.left = 80`, `margin.left - 50`). If additional left spacing is desired for stylistic reasons, incorporate it via `titlePadding` in `calculateYAxisLayout` (typed, consistent).
5) Keep `computeDynamicWidth` as an anti‑clipping step only. Do not rely on extents to “fix” spacing conflicts.

Specific per-file tasks:
- `conceptual-graph.ts`:
  - Introduce `calculateXAxisLayout` → `chartHeight` → `calculateYAxisLayout`.
  - Replace `yAxisX - 20` with `yAxisLabelX` and remove fixed left padding.
  - Optionally port ticks/axis rendering to shared axis renderers when available.
- `keeling-curve.ts`:
  - Introduce `calculateXAxisLayout` and compute `chartHeight` from vertical margins.
  - Use `calculateYAxisLayout` to derive left margin and `yAxisLabelX`.
  - Replace `margin.left - 50` with `yAxisLabelX` and rebase the x‑axis/left axis lines to the unified margins.
- `line-graph.ts` (right axis):
  - Ensure the right axis title always uses `rightYAxisLabelX` from `calculateRightYAxisLayout` (it does currently); add a guard against future local offsets.

### Migration plan (unification first)
1) Introduce a shared “chart frame” utility
   - Inputs: `width`, `height`, `title`, `xAxis`, `yAxis`, optional `yAxisRight`, and a centralized typography/theme.
   - Outputs: `margin`, `yAxisLabelX`, `rightYAxisLabelX`, `xAxisTitleY`, `chartWidth`, `chartHeight`, `toSvgX/Y`, and a `<g transform="translate(margin.left, margin.top)">` wrapper for the plot area.

2) Centralize typography
   - Single theme provides font-size/weight/line-height + `approxCharWidth` per role (axis title, tick label, main title, legend). Layout helpers accept these metrics.
   - Ban local overrides for axis/tick/title typography in widgets.

3) Migrate widgets in batches
   - Batch A (already close to compliant): line, area, histogram, divergent bar, bar, scatter, population change, coordinate plane, parabola.
   - Batch B (partial/violating): conceptual graph, keeling curve (most benefit), any others discovered.

4) Linting and CI checks
   - Add a rule that forbids hardcoded rotate positions for axis titles (e.g., `rotate(-90, margin.left -` or `rotate(-90, yAxisX -`) unless derived from `calculate*Layout` results.
   - Add a rule that disallows local padding constants for axis spacing in generators (prefer `calculate*Layout` inputs such as `titlePadding`).

5) Snapshot audit
   - Prepare a matrix (short vs long titles, dense vs sparse ticks, normal vs bold tick labels) and ensure no overlaps. Negative `viewBox` minX is allowed only due to legends/annotations—not axes.

### Our values (why unification is non‑negotiable)
- **Single source of truth**: All axis spacing derives from the shared layout helpers using the same theme; no per‑widget magic numbers. If spacing is wrong, we fix it once in the helpers and all charts benefit.
- **Deterministic single‑pass layout**: Title/top then x‑axis/bottom → compute `chartHeight` → y‑axes/left and right → compute `chartWidth` → draw. No feedback loops, no hidden reflow.
- **Predictability over guesswork**: Extents guard against clipping; they do not correct spacing. We prioritize accurate margin computation over expanding the canvas.
- **Consistency and maintainability**: Centralized axis renderers and chart frame reduce cognitive load, allow safer refactors, and simplify visual QA.

### Done definition for unification
- No generator contains hardcoded x‑offsets for axis titles.
- All y‑axis titles are placed via `yAxisLabelX` from `calculateYAxisLayout` (or `rightYAxisLabelX` for right axis) with `renderRotatedWrappedYAxisLabel` (or manual rotate using those pivots).
- Typography for axis/ticks/titles comes exclusively from the shared theme.
- Extents only adjust `viewBox`; spacing issues are handled before extents.


