## Chart Title Rendering Standardization Proposal

### Problem

Graph titles are not centered over the main chart area. They are centered against the full SVG width and then additionally offset by the left margin, causing them to appear too far to the right.

Observed in test snapshots (example, line graph): title `<text>` is centered at the wrong x-coordinate relative to the chart area center.

### Current Implementation (Context from Codebase)

Title rendering for our category/metric charts happens in the shared coordinate plane utility, not in individual widgets. The line-graph widget calls the coordinate plane builder.

Current title positioning (note how `titleX` is derived):

```168:181:src/lib/widgets/utils/coordinate-plane-utils.ts
// Render title (outside, above chart area)
if (hasTitle) {
	const titleX = leftOutsidePx + data.width / 2
	const titleY = CHART_TITLE_TOP_PADDING_PX
	canvas.drawWrappedText({
		x: titleX,
		y: titleY,
		text: data.title as string,
		maxWidthPx: data.width,
		fontPx: CHART_TITLE_FONT_PX,
		anchor: "middle",
		fill: theme.colors.title
	})
}
```

Chart area calculation (this defines the “main chart area” center that the title should align to):

```118:124:src/lib/widgets/utils/coordinate-plane-utils.ts
const chartArea = {
	top: outsideTopPx,
	left: leftOutsidePx,
	width: data.width - leftOutsidePx - 80, // Adjust width based on dynamic margin
	height: data.height - outsideTopPx - outsideBottomPx
}
```

The mismatch: `titleX` is computed as `leftOutsidePx + data.width / 2` (full SVG midpoint plus left offset) rather than the center of `chartArea` which is `chartArea.left + chartArea.width / 2`.

Additional inconsistency: `maxWidthPx` uses `data.width` (full SVG width), not `chartArea.width` (the visual region the title should conceptually span).

Coordinate plane V2 (four-quadrant) does not render a title at all today, so behavior is not centralized or consistent across planes.

```24:45:src/lib/widgets/utils/coordinate-plane-v2.ts
/**
 * Sets up a 4-quadrant Cartesian coordinate plane with centered axes using the Canvas API.
 */
export function setupCoordinatePlaneV2(...) { /* no title rendering */ }
```

### Goals

- Center titles over the main chart area consistently for all widgets and planes.
- Use a single, shared helper for title measurement and rendering to avoid drift.
- Ensure wrapping width and top spacing are applied consistently.
- Add lint/guardrails and tests to prevent regressions.

### Proposed Design

1) Introduce a shared helper to render chart titles

Add a utility that encapsulates title positioning and wrapping based on a provided frame (chart area). This avoids each coordinate plane or widget solving it differently.

Proposed API (in `src/lib/widgets/utils/layout.ts`):

```ts
export type ChartFrame = { left: number; top: number; width: number; height: number }

export function drawChartTitle(
	canvas: Canvas,
	frame: ChartFrame,
	title: string,
	options: { fontPx: number; topPaddingPx: number; maxWidthPolicy: "frame" | "full" }
): { usedTopHeightPx: number }
```

Behavior:
- Compute `titleX = frame.left + frame.width / 2`.
- Compute `titleY = options.topPaddingPx` (relative to the SVG top; this mirrors current practice of drawing title outside chart area and reserving `outsideTopPx` earlier).
- Use `maxWidthPx` derived by `maxWidthPolicy`:
  - `"frame"` => `frame.width`
  - `"full"` => current behavior (`data.width`) for conservative rollout
- Return an estimated vertical usage (`usedTopHeightPx`) so callers can reserve consistent top margin if they choose to compute layout strictly up front.

2) Update coordinate-plane builders to use the helper

- In `setupCoordinatePlaneBaseV2`:
  - Replace the inlined title draw logic with a call to `drawChartTitle(canvas, chartArea, title, ...)` using `titleX = chartArea.left + chartArea.width/2`.
  - For immediate safety and minimal churn, keep `maxWidthPolicy: "full"` initially; optionally migrate to `"frame"` with coordinated top-margin measurement.
- In `setupCoordinatePlaneV2` (four-quadrant):
  - Add optional title support using the same helper so all planes are consistent.

3) Keep the layout math consistent

We currently estimate title height before computing `chartArea`. If we switch `maxWidthPx` to frame width, we should use the same width to estimate the title height used in the top margin calculation to avoid circular dependency. Two-phase rollout:

- Phase A (no risk): change only `titleX` to the chart area center and keep `maxWidthPx` at full width. No changes to top margin math needed. This immediately fixes visual centering.
- Phase B (follow-up): unify `maxWidthPx` for both estimation and drawing using frame width. This requires moving title-height estimation to use the same width the drawing uses (frame width), or computing chart area in two passes. This ensures perfect consistency of wrapping and reserved space.

### Detailed Changes

1) Minimal fix to center titles now (Phase A)

Change `titleX` to center on the main chart area and optionally switch `maxWidthPx` later:

```168:181:src/lib/widgets/utils/coordinate-plane-utils.ts
// Render title (outside, above chart area)
if (hasTitle) {
	const titleX = chartArea.left + chartArea.width / 2
	const titleY = CHART_TITLE_TOP_PADDING_PX
	canvas.drawWrappedText({
		x: titleX,
		y: titleY,
		text: data.title as string,
		maxWidthPx: data.width, // Phase A: preserve existing width to avoid layout churn
		fontPx: CHART_TITLE_FONT_PX,
		anchor: "middle",
		fill: theme.colors.title
	})
}
```

2) Introduce and adopt the helper (Phase B)

Sketch of `drawChartTitle` (pseudo-implementation):

```ts
export function drawChartTitle(
	canvas: Canvas,
	frame: { left: number; top: number; width: number; height: number },
	title: string,
	options: { fontPx: number; topPaddingPx: number; maxWidthPolicy: "frame" | "full" }
): { usedTopHeightPx: number } {
	const titleX = frame.left + frame.width / 2
	const titleY = options.topPaddingPx
	const maxWidthPx = options.maxWidthPolicy === "frame" ? frame.width : canvas.width
	canvas.drawWrappedText({
		x: titleX,
		y: titleY,
		text: title,
		maxWidthPx,
		fontPx: options.fontPx,
		anchor: "middle",
		fill: theme.colors.title
	})
	// Optionally use estimateWrappedTextDimensions(title, maxWidthPx, options.fontPx)
	// to return a precise usedTopHeightPx so callers can reserve exact space.
	return { usedTopHeightPx: options.topPaddingPx }
}
```

Adoption points:
- `setupCoordinatePlaneBaseV2`: replace inlined title draw with `drawChartTitle(...)` and depend on `chartArea` for centering.
- `setupCoordinatePlaneV2`: add optional `title` input and call `drawChartTitle(...)` similarly.
- Any widgets that draw titles directly (e.g., `src/lib/widgets/generators/area-graph.ts`, `pi-chart.ts`) should be updated to call the helper; if they already rely on `setupCoordinatePlaneBaseV2`, no widget code change is necessary.

### Enforcement (Lint / Guardrails)

Add a grit rule to ban direct title drawing outside the helper:

- Disallow calling `canvas.drawWrappedText` with `anchor: "middle"` and likely title font size near `CHART_TITLE_FONT_PX` outside `layout.ts` helper scope.
- Alternatively, declare a specific exported function name (e.g., `drawChartTitle`) and require all title draws to go through it; flag any direct calls in `utils` or `generators`.

This prevents future divergence (e.g., someone re-centering against `data.width / 2` again).

### Tests

Add regression tests that fail loudly on mis-centering:

- For line-graph, area-graph, and at least one other widget:
  - Parse the generated `<svg>` and extract the chart area bounding box (`x` from `<rect>` in the clipPath or the known `chartArea.left`/`width` if we serialize it to attributes for tests), then assert title `<text>` x equals `chartArea.left + chartArea.width / 2`.
- Use multiple widths to ensure responsiveness doesn’t skew title.
- Keep snapshot tests; add explicit numeric checks on the title x-coordinate.

### Rollout Plan

Phase A (fast fix):
- Update `setupCoordinatePlaneBaseV2` to center titles over `chartArea`.
- Leave `maxWidthPx` as `data.width` to avoid any change in measured title height.
- Update snapshots where necessary.

Phase B (unification):
- Add `drawChartTitle` helper in `layout.ts` (or a dedicated `title.ts`).
- Migrate `setupCoordinatePlaneBaseV2` and `setupCoordinatePlaneV2` (and any title-drawing widgets) to use the helper.
- Optionally change `maxWidthPx` to `frame.width` and update title height estimation to use the same width, ensuring perfect consistency.
- Add grit rule to enforce usage of the helper.
- Add regression tests validating centering math across widgets and sizes.

### Risks and Mitigations

- Risk: Switching `maxWidthPx` immediately could change wrapping and title height, subtly shifting layouts. Mitigation: Phase A centers only; Phase B switches widths with corresponding margin/height estimation updates and snapshot updates.
- Risk: Widgets that draw titles directly may remain inconsistent. Mitigation: Use grit rule and PR-wide search to enforce helper usage.

### Appendix: Additional Context

Line-graph uses the coordinate plane base V2 and does not itself draw titles, so fixing the common util fixes the widget:

```111:133:src/lib/widgets/generators/line-graph.ts
const baseInfo = setupCoordinatePlaneBaseV2(
	{
		width,
		height,
		title,
		xAxis: { /* ... */ },
		yAxis: { /* ... */ }
	},
	canvas
)
```

Four-quadrant plane draws axis labels centered relative to chart area, but currently lacks title support; adopting the helper across both planes ensures uniform behavior.


