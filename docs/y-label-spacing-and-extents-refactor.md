### Title: Rotated Y-axis Label Spacing and Dynamic Extents – Robust Fix

### Problem

- **Symptoms**: Y-axis titles appear too far left of the axis line; many widgets show a significantly negative `viewBox` minX (e.g., `-76`, `-104`), which visually widens the left gutter.
- **Observed in**: `area-graph`, `histogram`, `bar-chart`, `line-graph`, `keeling-curve`, `scatter-plot`, `coordinate-plane` derivatives, etc.

### Root Cause

1) **Conservative spacing budget between the axis line and title**
   - The function `calculateYAxisLayoutAxisAware(...)` computes a required space to the left of the Y-axis anchor:
     - `tickLength + labelPadding + maxTickLabelWidth + titlePadding + wrappedTitleHeight / 2`
   - Our defaults/heuristics are conservative:
     - `tickLength = 5`, `labelPadding = 10`
     - `maxTickLabelWidth ≈ characters × 8 px` (conservative; actual glyphs ≈ 6.5–7 px for our font/size)
     - `titlePadding = 20`
     - `wrappedTitleHeight / 2` adds ~8–18 px depending on wrap lines
   - Combined, this often yields ~60–80 px of space. It is correct by construction (no clipping) but feels visually far.

2) **Dynamic viewBox expansion counts rotated titles as horizontal width**
   - We currently call `includeText(...)` for the rotated Y-axis title, which estimates horizontal width and expands horizontal extents.
   - Because the title is rotated −90°, this inflates `vbMinX` and shifts the `viewBox` left, creating an additional perceived gutter unrelated to the axis→title gap calculation.

### Goals

- Keep the no-clipping guarantee for titles and tick labels while bringing titles closer to the axis line.
- Prevent rotated Y-axis titles from artificially widening the dynamic `viewBox` on the left.
- Apply a centralized/util-based fix, not per-widget hacks.

### Non-Goals

- Rewrite title/X-axis/right-axis layout logic.
- Change the rendering semantics of Y-axis titles (they remain rotated and wrapped via `renderRotatedWrappedYAxisLabel`).

### Proposed Changes

- **A. Rotation-aware extents helper**
  - Add `includeRotatedYAxisLabel(ext, pivotX, text, chartHeightPx, fontPx = 16, lineHeight = 1.1)` in `src/lib/widgets/utils/layout.ts`.
  - Behavior: do not expand horizontal extents for rotated Y-axis titles. We already reserved horizontal spacing via `calculateYAxisLayoutAxisAware(...)`.
  - This prevents rotated titles from pushing `vbMinX` further negative.

- **B. Replace extents tracking for rotated Y-axis titles**
  - In all generators, where we render the rotated Y-axis title and then call `includeText(...)` for it, replace with `includeRotatedYAxisLabel(...)`.
  - Affected generators:
    - `area-graph.ts`, `bar-chart.ts`, `conceptual-graph.ts`, `divergent-bar-chart.ts`, `histogram.ts`, `keeling-curve.ts`, `line-graph.ts`, `parabola-graph.ts`, `population-bar-chart.ts`, `population-change-event-graph.ts`, `scatter-plot.ts`, and `coordinate-plane-base.ts` (if it tracks Y-label extents).

- **C. Refine tick-label width heuristic**
  - In `calculateYAxisLayoutAxisAware(...)`, change the digit/char width heuristic from **8 px/char → 7 px/char** to align with `approxTextWidth` and actual rendering.
  - This shaves a few pixels off the axis→title gap universally, while remaining safe.

### Rationale

- The axis→title spacing budget is necessary to avoid clipping. The primary visual bloat comes from two sources: (1) conservative char-width estimates and (2) counting rotated labels as horizontal width in the viewBox. Addressing both yields tighter spacing without regressing safety.

### Migration Plan

1) Add `includeRotatedYAxisLabel` to `src/lib/widgets/utils/layout.ts`.
2) Swap `includeText(...)` → `includeRotatedYAxisLabel(...)` for rotated Y-axis labels across all generators listed above.
3) Change the `maxTickLabelWidth` heuristic in `calculateYAxisLayoutAxisAware(...)` from `8` to `7` px per character.
4) `bun typecheck`; run snapshot tests; review spacing.

### Validation & Success Criteria

- **Expected snapshot deltas**:
  - `viewBox` minX moves closer to `0` (e.g., `-90/-104` → `-20..0`) because rotated titles stop expanding horizontal extents.
  - Y-axis titles appear closer to the axis line, typically reduced by ~5–12 px due to the char-width refinement, with no clipping.
- **No regressions**:
  - Long/wrapped titles and dense tick labels must remain unclipped.
  - Coordinate-plane widgets still place the internal axis correctly via `anchorX`.

### Edge Cases

- Extremely long Y-axis titles (3+ wrapped lines): verify spacing remains adequate; if needed, increase only `titlePadding` locally for the outliers (rare).
- Right Y-axis titles remain unaffected; if we later rotate and track them similarly, introduce a corresponding rotation-aware helper for right-side labels.

### Alternatives Considered

- **Only reduce paddings/heuristics** (quick win):
  - Pros: trivial, immediate improvement.
  - Cons: does not address viewBox widening from rotated titles; risks clipping on long titles if reduced too aggressively.

- **Per-widget overrides**:
  - Pros: tailored visuals per chart.
  - Cons: inconsistent, harder to maintain; violates the centralized-layout principle.

### Performance Considerations

- No meaningful performance impact. The helper is a no-op for horizontal extents and avoids expanding `viewBox` unnecessarily, which can marginally reduce output SVG width in some cases.

### Testing Plan

- `bun typecheck` to ensure typings remain intact.
- Run snapshot tests for all affected widgets; compare:
  - `viewBox` minX moves toward `0`.
  - Axis titles closer but not colliding with tick labels or axis line.
  - No cropping of title/ticks in extreme cases.

### Rollback Plan

- If any regression in spacing or clipping is detected:
  - Temporarily restore `includeText(...)` calls for the specific problematic widget while investigating.
  - Revert the char-width heuristic to `8` px/char if necessary for edge inputs.

### Implementation Notes

- Keep all changes in `@/lib/widgets/utils/layout` and the generators; no external API changes.
- Do not modify X-axis or title layout logic.


