## Chart Title Regression: Root Cause Analysis and Prescriptive Fix

### Summary

- Titles began “consuming” vertical space and shrinking the main charting area after the title standardization refactor.
- The top margin for the plotting area now includes the measured wrapped title height. This violates our requirement: titles must float above the chart and must not reduce the diagram area.
- Additionally, the helper `drawChartTitle` accepts a frame but positions Y from the global SVG origin, which can be misleading. The current helper also contains a dead/maxWidth policy branch.

### Impact

- Chart content area height varies depending on whether a title exists and how it wraps.
- Snapshots show the chart clip rect starting around y≈98 while the title draws near y=20. Although visually above, the title’s measured height was added into the top margin, shrinking the chart area.
- This breaks layout invariants across widgets and complicates reasoning about available plotting height.

### Root Cause

1) Title height is being included in the top margin that defines the plotting rectangle.

   In `setupCoordinatePlaneBaseV2` (category/metric plane), the code estimates the title’s wrapped height and adds it to `outsideTopPx`:

```168:185:src/lib/widgets/utils/coordinate-plane-utils.ts
// compute wrapped title height …
titleHeight = CHART_TITLE_TOP_PADDING_PX + dims.height + CHART_TITLE_BOTTOM_PADDING_PX

const outsideTopPx = (hasTitle ? titleHeight : 0) + 20

const chartArea = {
  top: outsideTopPx,
  left: leftOutsidePx,
  width: chartAreaWidth,
  height: data.height - outsideTopPx - outsideBottomPx
}
```

   The same pattern exists in the four‑quadrant plane (`setupCoordinatePlaneV2`):

```57:73:src/lib/widgets/utils/coordinate-plane-v2.ts
// compute titleHeight …
const margin = { top: PADDING + titleHeight, right: PADDING, bottom: 40, left: dynamicLeftMargin }
const chartWidth = width - margin.left - margin.right
const chartHeight = height - margin.top - margin.bottom
```

   This makes the inner plotting area smaller whenever a title is present or longer.

2) Helper API mismatch (Y semantics)

   `drawChartTitle(canvas, frame, ...)` uses `frame.left/width` to center X, but Y is derived from a global top padding, not `frame.top`. This is OK for our “floating outside” use‑case, but the API can mislead authors into thinking the draw is relative to the frame both horizontally and vertically.

3) Dead/incorrect `maxWidthPolicy` branch

   The helper currently returns `frame.width` for both branches ("frame" and "full"), contradicting the initial intent and causing confusion.

### Requirements (Non‑Negotiable)

- Titles must be rendered outside the plotting area and must not shrink the chart area height.
- The plotting area’s geometry (top, height) must be invariant to title presence/length.
- Titles must be centered horizontally over the plotting frame (chart area), not over the full SVG width.
- Title wrapping width should default to the frame width. If a different width is ever needed, it must be explicit and consistent with any measurement code.
- The title helper must have clear semantics: for “floating outside” titles, Y is absolute from the SVG origin; the `frame` is used for X centering and wrapping width.

### Prescriptive Fix

1) Coordinate plane base (category/metric): stop budgeting title height into the top margin

- Remove title height estimation from layout budgeting.
- Keep a small constant top padding for axes/labels (the existing `+ 20`).
- Continue to draw the title at a fixed Y (absolute), centered against the chart area.

2) Four‑quadrant plane: identical change

- Remove adding `titleHeight` to `margin.top`.
- Draw the title outside the plotting area with the helper.

3) Clarify and harden `drawChartTitle`

- Document semantics: Y is absolute (“floating outside”); frame is used for X center and wrapping width.
- Make `maxWidthPolicy` unambiguous: keep only "frame" (default), or if "full" is retained, require an explicit `svgWidthPx` override to avoid hidden coupling.

### Suggested Diffs (edits)

These diffs are designed to be minimal and safe. They restore the invariant that the plot area is unaffected by the title while preserving the new centering logic.

#### A) src/lib/widgets/utils/coordinate-plane-utils.ts

```@@
 export function setupCoordinatePlaneBaseV2(
@@
-    let titleHeight = 0
-    if (hasTitle) {
-        const dims = estimateWrappedTextDimensions(
-            data.title as string,
-            chartAreaWidth, // USE CHART AREA WIDTH
-            CHART_TITLE_FONT_PX
-        )
-        titleHeight = CHART_TITLE_TOP_PADDING_PX + dims.height + CHART_TITLE_BOTTOM_PADDING_PX
-    }
-
-    const outsideTopPx = (hasTitle ? titleHeight : 0) + 20
+    // Titles float outside; do not budget title height into the chart area
+    const outsideTopPx = 20
@@
-    // Render title using the new helper
-    if (hasTitle) {
-        drawChartTitle(canvas, chartArea, data.title as string, {
-            maxWidthPolicy: "frame"
-        })
-    }
+    // Render title outside, centered over the chart area
+    if (hasTitle) {
+        drawChartTitle(canvas, chartArea, data.title as string, { maxWidthPolicy: "frame" })
+    }
```

Notes:
- We deliberately remove wrapped title measurement from layout budgeting. If any estimation is desired for logging or analytics, keep it separate from geometry.

#### B) src/lib/widgets/utils/coordinate-plane-v2.ts

```@@
-    // Calculate title height if it exists
-    let titleHeight = 0
-    if (title) {
-        const chartContentWidth = width - dynamicLeftMargin - PADDING
-        const dims = estimateWrappedTextDimensions(
-            title,
-            chartContentWidth,
-            CHART_TITLE_FONT_PX
-        )
-        titleHeight = CHART_TITLE_TOP_PADDING_PX + dims.height + CHART_TITLE_BOTTOM_PADDING_PX
-    }
-
-    // Define margins to create space for labels and ticks
-    const margin = { top: PADDING + titleHeight, right: PADDING, bottom: 40, left: dynamicLeftMargin }
+    // Define margins to create space for labels and ticks (titles float outside)
+    const margin = { top: PADDING, right: PADDING, bottom: 40, left: dynamicLeftMargin }
@@
-    // ADD THIS BLOCK: Render title if it exists
-    if (title) {
-        drawChartTitle(canvas, chartArea, title, { maxWidthPolicy: "frame" })
-    }
+    // Render title if present (outside, centered over chart area)
+    if (title) {
+        drawChartTitle(canvas, chartArea, title, { maxWidthPolicy: "frame" })
+    }
```

#### C) src/lib/widgets/utils/chart-layout-utils.ts

```@@
 export function drawChartTitle(
@@
-    const titleX = frame.left + frame.width / 2
-    const titleY = topPaddingPx
-    const maxWidthPx = maxWidthPolicy === "frame" ? frame.width : frame.width // Note: 'full' policy is deprecated; always use frame width.
+    // Horizontal centering uses the provided frame. Y is absolute (floating above chart area)
+    const titleX = frame.left + frame.width / 2
+    const titleY = topPaddingPx
+    const maxWidthPx = maxWidthPolicy === "frame" ? frame.width : frame.width
@@
-    const { height } = estimateWrappedTextDimensions(title, maxWidthPx, fontPx)
-    return { usedTopHeightPx: topPaddingPx + height }
+    const { height } = estimateWrappedTextDimensions(title, maxWidthPx, fontPx)
+    return { usedTopHeightPx: topPaddingPx + height }
```

Notes:
- We keep "frame" as the only effective policy (simple and consistent). If a future need arises to wrap against full SVG width, add an explicit `svgWidthPx` option rather than relying on hidden canvas state.

### Validation Plan

- Add regression tests that assert the plotting area is invariant to title presence:
  - For a widget that uses `setupCoordinatePlaneBaseV2` (e.g., bar chart), generate SVG with a non‑empty title and with `title: null`.
  - Parse each SVG and extract the clip rect for the chart area; assert `y` and `height` are identical across both cases.
  - Assert the title `<text>` element’s `x` equals `chartArea.left + chartArea.width / 2`.

- Update existing snapshots as needed. Expect no change in bar/axis geometry other than the outer SVG possibly gaining vertical extent for the floating title (the chart interior dimensions must not change).

### Rollout

1) Implement the diffs above.
2) Update snapshots and add the new invariance test.
3) Scan other widgets and planes to confirm no one else re‑introduces title height into layout budgeting.
4) Document the helper semantics (this file) and reference it from `docs/chart-title-standardization.md`.

### Risks and Mitigations

- Risk: Some widgets may have compensated for the old behavior (expecting reduced chart area). Mitigation: review diffs and adjust only if they depended on the shrinking.
- Risk: Long titles may overflow horizontally for very narrow frames. Mitigation: we already wrap against frame width; consider truncation rules separately if needed.

### Appendix: Commit Context

The regression appeared after commit `6944146e1fa7b305d62ffd71f7bb96f66c0f6e9d`, which centralized title rendering but also added title height into layout budgeting. The centering fix was correct; the budgeting change caused the shrinkage. The changes above keep the centering while restoring correct budgeting semantics.
