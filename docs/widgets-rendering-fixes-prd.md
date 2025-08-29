## PRD: Widget Rendering Consistency and Reliability Fixes (Axes, Labels, Clipping, Sizing, Fonts)

### Overview
This PRD standardizes axis rendering, label placement, clipping behavior, sizing, and typography across all SVG-based widgets in `@/lib/widgets/generators`. It resolves specific regressions observed in snapshots and defines explicit implementation steps that can be applied broadly (via scripted refactors or model-assisted edits) to ensure consistent output.

### Goals
- Always render and label zero (0) ticks on both axes where numeric scales are used.
- Eliminate clipping of data markers, labels, and titles at chart boundaries.
- Standardize final SVG sizing by composing height (title + chartArea + x-axis block) and dynamic width from measured extents.
- Use a consistent sans-serif font family and consistent default font sizes across widgets.
- Remove hard-coded label anchors in charts (e.g., area labels) in favor of computed positions with collision-aware padding.

### Non-Goals
- Visual redesign beyond typography, spacing, and collision prevention.
- Changing data semantics or series ordering.

---

## Current Issues and Root Causes

1) Missing 0-tick labels (Y and X axes)
- Cause: `calculateIntersectionAwareTicks` intentionally skips 0; gridlines also skip `t === 0`; several generators draw custom zero lines instead of labeled ticks.
- Impact: Snapshots show 0 missing on both axes (e.g., divergent-bar), contrary to desired behavior.

2) Labels/markers cut off at chart boundaries (top/bottom/left/right)
- Cause: Data marks and labels are wrapped in a clipPath that matches the exact chartArea; anything that touches boundaries gets clipped.
- Impact: Conceptual graph top circles/labels clipped; line graph bottom points clipped.

3) Inconsistent typography
- Cause: `horizontal-bar-chart.ts` sets serif; others use sans; font sizes vary.
- Impact: Snapshots show a serif font and mismatched sizes.

4) Inconsistent final sizing (height/width)
- Cause: Some generators (e.g., scatter plot, horizontal bar) return `<svg height="{input height}">` instead of composed height from title + chart area + x-axis block; width is measured via horizontal extents, but height isn’t normalized.
- Impact: Snapshots appear mis-sized compared to others.

5) Area label crowding / fixed anchors
- Cause: `area-graph.ts` places labels using fixed domain anchors (`toSvgX(1975)`, `toSvgX(1850)`) and does not register those labels into horizontal extents.
- Impact: Labels can collide with rightmost bars/edge and won’t grow width for safety margin.

---

## Requirements

R1: Always show a labeled tick at value 0 on numeric axes.
- No suppression of 0 tick marks or labels.
- Major/minor gridlines may still avoid overdraw, but the tick mark and the label for 0 must be present and visible.

R2: Prevent clipping of data markers and labels.
- Either expand clip area by a safe padding, or render markers and labels outside the clipped group while keeping lines/areas clipped.
- Ensure title and axis labels are outside clipping (current behavior is good) and that data labels/points are readable when adjacent to boundaries.

R3: Standardize SVG sizing.
- Final `height` must be `base.chartArea.top + base.chartArea.height + base.outsideBottomPx` (or equivalent composition) for all generators.
- Final `width` must use `computeDynamicWidth(ext, totalHeight, AXIS_VIEWBOX_PADDING)`.

R4: Standardize fonts.
- Use `font-family="${theme.font.family.sans}"` on root `<svg>` across all widgets.
- Default font sizes: axis labels and tick labels use constants defined in `@/lib/widgets/utils/constants`; where widget-specific size is needed, use the same constant family (e.g., `theme.font.size.base|medium|large`).

R5: Replace hard-coded label anchors with computed positions.
- For area graphs and similar, compute interior label positions (e.g., centroid or stable interior anchor) and add collision-aware padding from chart edges.
- Register label positions into horizontal extents via `includeText` so dynamic width accounts for them.

---

## Detailed Design & Implementation Plan

### A) Axes: Always label 0 ticks

1. Update `@/lib/widgets/utils/layout.ts`:
- Remove the logic in `calculateIntersectionAwareTicks` that skips 0. Replace with selection logic that includes 0 unconditionally.
  - Before:
    - Skips origin (value === 0) and skips first negative for collision avoidance.
  - After:
    - Include all ticks at the provided interval, including 0. If collision avoidance is desired, down-select evenly but never exclude 0.

2. Update `@/lib/widgets/utils/axes.ts`:
- Y-axis numeric path: keep drawing tick at 0 and its label when `showTickLabels` is true. Do not conditionally suppress gridline at 0 unless there would be double-overdraw with the axis line. If suppressing the gridline at 0, ensure the tick and label remain.
- X-axis numeric path: same rule as Y—label 0, draw tick at 0. If a major axis overlays a gridline, prefer axis stroke over gridline.

3. Generators that draw custom zero lines (e.g., `divergent-bar-chart.ts`):
- Continue rendering the prominent zero line, but ensure the 0 tick mark and label are also rendered at that same y.
- If the axis line coincides with the 0 gridline, omit only the 0 gridline (not the tick nor label).

### B) Clipping Strategy: Prevent label/marker clipping

Option 1 (recommended): Split clipped and unclipped layers
- Keep polylines/paths/bars/areas within a clipped group (`wrapInClippedGroup` with exact chartArea).
- Render point markers (circles/squares) and their labels outside the clipped group, so they can bleed over the chartArea by their radius/padding.
- Affects: `line-graph.ts` (markers), `conceptual-graph.ts` (highlight circles and labels), `scatter-plot.ts` (points and labels).

Option 2 (alternative or additive): Expand clip rectangle by a small pad
- Define a `#CLIP_PAD_PX` constant (e.g., 6–10 px) and expand clip rect on all sides: x-1, y-1, width+2, height+2 (or padding tailored to marker radius).
- This is simpler but less precise when labels extend significantly beyond the area.

Implementation:
- Adopt Option 1 universally for point markers and their labels.
- Keep data geometry (lines/areas/bars) clipped to chartArea.

### C) Standardize Final Sizing

For every generator:
1. Compose `totalHeight = base.chartArea.top + base.chartArea.height + base.outsideBottomPx`.
2. Compute `{ vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, totalHeight, AXIS_VIEWBOX_PADDING)`.
3. Emit root `<svg width="{dynamicWidth}" height="{totalHeight}" viewBox="{vbMinX} 0 {dynamicWidth} {totalHeight}" ...>`.

Apply to:
- `scatter-plot.ts`: switch from using raw `height` to composed `totalHeight`.
- `horizontal-bar-chart.ts`: same change.
- Verify: `area-graph.ts`, `line-graph.ts`, `divergent-bar-chart.ts` already compose or should be updated if not.

### D) Typography Standardization

1. Root `<svg>` font-family
- Set `font-family="${theme.font.family.sans}"` for all generators (replace serif usage in `horizontal-bar-chart.ts`).

2. Font sizes
- Use constants: tick labels derive from `TICK_LABEL_FONT_PX`; axis titles derive from `AXIS_TITLE_FONT_PX`.
- For widget titles/legends, align with `theme.font.size.base|medium|large` consistently across generators.

### E) Area Labels: Remove Fixed Anchors, Use Computed Positions

In `area-graph.ts`:
1. Compute safe label anchors inside the two filled areas:
- For each area (top and bottom), compute a representative x (e.g., median of `dataPoints`’ x values) and y as the midpoint between boundary line and the area baseline `yAxis.min` or `yAxis.max`.
- Alternatively compute polygon centroid for each area shape.
2. Add a right-edge safety pad when choosing x (e.g., clamp `x` so `toSvgX(x) + labelWidth/2 + pad ≤ base.chartArea.left + base.chartArea.width`).
3. Render with `renderWrappedText` at computed coordinates.
4. Call `includeText` with the same coordinates and anchor to ensure dynamic width accounts for labels.

### F) Utility/Constant Changes

1. Add `CLIP_PAD_PX` constant in `@/lib/widgets/utils/constants` if Option 2 is ever used.
2. If needed, add helper `renderMarkersOutsideClip(points, labels)` pattern to keep code uniform across generators.

---

## File-by-File Action Items

1) `@/lib/widgets/utils/layout.ts`
- Modify `calculateIntersectionAwareTicks` to no longer skip origin; instead, return a uniform down-selection that always includes index of 0 if present.
- Provide a small helper `ensureZeroIncluded(selected: Set<number>, tickValues: number[]): Set<number>` that adds the 0 index when found.

2) `@/lib/widgets/utils/axes.ts`
- Y-axis numeric:
  - Keep drawing tick at every step including 0; label 0 when `showTickLabels`.
  - For gridlines, skip only the 0 gridline if the main axis visually overlaps there, but do not skip the tick nor its label.
- X-axis numeric:
  - Same as above.

3) `@/lib/widgets/generators/divergent-bar-chart.ts`
- Continue custom zero line.
- Ensure 0 tick + label are rendered (via axes engine after Part 1/2 changes).
- No code change required beyond relying on updated axis utilities, unless gridline conflict requires explicit suppression of 0 gridline.

4) `@/lib/widgets/generators/horizontal-bar-chart.ts`
- Change root SVG `font-family` to `${theme.font.family.sans}`.
- Switch to composed `totalHeight` as in Section C.
- Verify tick label font sizes come from constants.

5) `@/lib/widgets/generators/line-graph.ts`
- Render data markers and their labels outside the clipped group.
- Keep polylines in the clipped group.
- Ensure composed `totalHeight` and dynamic width are used (already present; confirm).

6) `@/lib/widgets/generators/conceptual-graph.ts`
- Move highlight circles and their labels outside the clipped group.
- Keep the curve inside the clipped group.
- Confirm composed `totalHeight` usage.

7) `@/lib/widgets/generators/area-graph.ts`
- Replace hard-coded label anchors with computed anchors per Section E.
- Register text extents via `includeText`.

8) `@/lib/widgets/generators/scatter-plot.ts`
- Switch to composed `totalHeight` and dynamic width per Section C.
- Move point markers and their labels outside clipped group; keep regression/curve paths clipped.

9) Other generators using similar patterns
- Audit and migrate: ensure markers/labels are outside clipped group; zero tick is labeled; root SVG font + sizes standardized; composed height used.

---

## Testing Strategy

1. Snapshot updates
- Re-run all widget tests and update snapshots. Expect visual diffs:
  - Presence of 0 ticks on axes.
  - No clipped markers/labels.
  - Consistent sans-serif fonts and sizes.
  - Consistent sizing across widgets.

2. Targeted visual tests
- Area graph: verify area labels do not crowd the right edge and are readable.
- Conceptual graph: topmost label/marker is visible and not clipped.
- Line graph: bottom-most points are fully visible.
- Divergent and horizontal bar: baseline/zero labels visible, gridline conflicts resolved.
- Scatter plot: correct overall height and uniform font.

3. Non-regression checks
- Categorical axes still select labels via `calculateTextAwareLabelSelection` without collisions.
- Dual-axis line graphs: right axis labels remain outside clip and fully visible.

---

## Rollout Plan

1. Implement axis utility changes (layout/axes) first to enable 0 labels.
2. Migrate generators in this order for maximum impact with minimal conflicts:
   - `line-graph.ts`, `conceptual-graph.ts`, `scatter-plot.ts` (clipping + sizing)
   - `horizontal-bar-chart.ts` (fonts + sizing)
   - `area-graph.ts` (computed label anchors + extents)
   - `divergent-bar-chart.ts` (verify 0 label presence without gridline conflicts)
3. Run typecheck + tests and update snapshots.
4. Quick visual QA against recorded snapshots.

---

## Acceptance Criteria

- All numeric axes display a tick and label at 0.
- No data markers or data labels are clipped at any chart boundary.
- All generators emit root `<svg>` with sans font and consistent default sizes.
- Final SVG height is composed (title + chart + x-axis block) and width is dynamic per extents, for all generators.
- Area graph labels are placed via computed anchors and do not collide with right boundary.

---

## Appendix: Implementation Hints

- For markers outside clip: build two strings per series: `geometrySvg` (clipped) and `markersSvg` (unclipped); append in that order.
- For ensuring 0 labels with collision-aware selection: when decimating tick labels, union the selected set with the index of 0 if present.
- For area label anchors: a robust approach is to compute the polyline point at the median x, then offset y by a fraction toward the interior baseline; clamp x to keep label inside chartArea minus a safety pad.


