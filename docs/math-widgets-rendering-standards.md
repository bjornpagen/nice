## Math Widgets Rendering Standards and Safety Guide

This document codifies strict, constraint-first rendering practices for all math widgets. It captures proven innovations from science widgets (axes/ticks/labels, clipping, dynamic width, text-aware thinning, intersection rules), and raises the bar for safety, determinism, and visual quality under adversarial inputs (e.g., LLM-driven content).

The goal is not power; it is guarantees. Every widget must either render within strict visual constraints or fail loudly with explicit errors. No fallbacks.

### Core principles

- **Constrain degrees of freedom:** Small, typed inputs; enumerations and bounded ranges; fixed palettes; caps on counts.
- **Deterministic SSR-only rendering:** No canvas/text measuring at runtime; use stable heuristics.
- **Fail fast:** Validate via Zod `safeParse`; on error, log and throw. Never guess defaults.
- **No clipping of content:** `width`/`height` describe the chart’s main content area; dynamic extents expand the SVG to accommodate labels and leaders.
- **Uniform visual policies:** Shared utilities choose spacing, label thinning, tick intersection behavior; widgets cannot override core safety policies.

---

## Rendering guarantees (must implement)

### 1) Dynamic width and extents tracking

Track global horizontal extents while adding any text/labels, then expand the SVG viewBox/width to avoid cutoffs. This turns `width` into “main content” width, not a hard constraint.

```1:60:src/lib/widgets/utils/layout.ts
export type Extents = { minX: number; maxX: number }
export function initExtents(initialWidth: number): Extents { ... }
export function approxTextWidth(text: string, avgCharWidthPx = 7): number { ... }
export function computeDynamicWidth(ext: Extents, _height: number, pad = 10) { ... }
```

Usage pattern in generators:

```268:398:src/lib/widgets/generators/coordinate-plane-base.ts
const ext = initExtents(width)
...
includeText(ext, x, label, "middle", 7)
...
const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, 10)
svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
```

Action for math widgets:
- Always allocate an `Extents` per render.
- Use `includeText`/`includePointX` when placing labels/markers near edges.
- Replace final width/viewBox via `computeDynamicWidth`.

### 2) Clip paths for overflowing geometry

Any continuous curve/line must be clipped to chart area to prevent overdraw outside content bounds.

```169:183:src/lib/widgets/utils/layout.ts
export function createChartClipPath(...)
export function wrapInClippedGroup(...)
```

Applied in science widgets:

```320:398:src/lib/widgets/generators/coordinate-plane-base.ts
svg += createChartClipPath("chartArea", pad.left, pad.top, chartWidth, chartHeight)
```

```393:401:src/lib/widgets/generators/scatter-plot.ts
svg += createChartClipPath("chartArea", pad.left, pad.top, chartWidth, chartHeight)
```

Action for math widgets:
- Define a single `clipId` per chart.
- Wrap all line/polyline/area primitives via `wrapInClippedGroup(clipId, content)`.

### 3) Text-aware label thinning

Compute whether all candidate labels fit using estimated widths; if not, select a uniform subset. Avoid overlap without per-widget hacks.

```303:378:src/lib/widgets/utils/layout.ts
export function calculateTextAwareLabelSelection(labels: string[], positions: number[], chartWidthPx: number, avgCharWidthPx = 8, paddingPx = 10): Set<number> { ... }
```

Examples:

```320:436:src/lib/widgets/generators/scatter-plot.ts
const selected = calculateTextAwareLabelSelection(tickLabels, tickPositions, chartWidth)
```

```182:199:src/lib/widgets/generators/histogram.ts
const selected = calculateTextAwareLabelSelection(tickLabels, tickPositions, chartWidth)
... dynamic width updated after placing labels ...
```

Action for math widgets:
- Always compute x-axis label selection via `calculateTextAwareLabelSelection`.
- Never rotate x-axis labels for fit; thin instead.
- Prefer abbreviated labels (see below) before thinning.

### 4) Intersection-aware tick selection near origin

Reduce clutter where axes cross by skipping labels closest to the origin.

```380:411:src/lib/widgets/utils/layout.ts
export function calculateIntersectionAwareTicks(tickValues: number[], _isXAxis: boolean): Set<number> { ... }
```

Applied in coordinate plane:

```343:359:src/lib/widgets/generators/coordinate-plane-base.ts
const selectedXTicks = calculateIntersectionAwareTicks(xTickValues, true)
...
const selectedYTicks = calculateIntersectionAwareTicks(yTickValues, false)
```

Action for math widgets:
- Use this for any axis crossing scenarios (coordinate plane, trig plots). Keep current default behavior.

### 5) Title and legend layout

Titles are placed with measured wrap-aware spacing; legends get a dedicated area/margin computation.

```220:257:src/lib/widgets/utils/layout.ts
export function calculateTitleLayout(title?: string, maxTitleWidth?: number, customTopMargin?: number) { ... }
```

```268:291:src/lib/widgets/utils/layout.ts
export function calculateLineLegendLayout(_lineCount: number, chartRight: number, chartTop: number, legendSpacing = 18) { ... }
```

Example (scatter):

```355:366:src/lib/widgets/generators/scatter-plot.ts
const { titleY, topMargin } = calculateTitleLayout(title, width - 60)
const { requiredRightMargin } = calculateLineLegendLayout(lineCount, 0, 0)
```

Action for math widgets:
- Always compute title top margin via `calculateTitleLayout`.
- Use a single legend style if a legend is present; do not hand-place labels.

### 6) Axis layout and rotated/wrapped Y label

Left margin and Y-axis label pivot must be computed, with rotated wrapped Y labels to avoid clipping.

```51:60:src/lib/widgets/utils/layout.ts
export function calculateYAxisLayout(yAxis) { ... }
```

```61:64:src/lib/widgets/utils/text.ts
// Rotated wrapped Y-axis label helper (signature continues below)
```

Examples:

```155:163:src/lib/widgets/generators/area-graph.ts
svg += renderRotatedWrappedYAxisLabel(
  abbreviateMonth(yAxis.label), yAxisLabelX, margin.top + chartHeight / 2, chartHeight
)
```

Action for math widgets:
- Use `calculateYAxisLayout` to size left margin and label position.
- Render Y label with the rotated/wrapped helper.

### 7) Label transformations and formatters

- Abbreviate categorical labels (e.g., months) before thinning.

```1:38:src/lib/widgets/utils/labels.ts
export function abbreviateMonth(text: string): string { ... }
```

- Math-specific formatters:
  - π-based tick labels for angle domains:

```210:264:src/lib/widgets/generators/coordinate-plane-base.ts
function formatPiLabel(value: number): string { ... }
```

Action for math widgets:
- Centralize π/fraction/degree/compact number formatters; use consistently on trig/coordinate-plane/number-line.

---

## Safety and validation

### 1) Strict input schemas (Zod `safeParse`)

- Every widget must use Zod schemas, transforming null-like strings to null only when explicitly allowed.
- Reject invalid domains (`min >= max`), non-increasing sequences, or inconsistent counts.

Examples:

```98:125:src/lib/widgets/generators/histogram.ts
if (separators.length !== bins.length + 1) { ... throw errors.new(...) }
... if (!(current > prev)) { ... throw errors.new(...) }
```

```156:166:src/lib/widgets/generators/fraction-number-line.ts
if (min >= max || chartWidth <= 0) { return `<svg width="${width}" height="${height}" />` }
```

Action for math widgets:
- Validate ranges and shapes up-front; log + throw per error-handling rules.
- Do not silently drop content or substitute defaults.

### 2) Structured logging + error propagation

Follow `@superbuilders/errors` + `@superbuilders/slog` patterns. No try/catch; use `errors.try`/`trySync` if needed, and always log before throwing.

```1:21:src/lib/widgets/generators/coordinate-plane-base.ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
```

---

## Widget-specific standards

### Number lines (basic, fractions, actions)

- Horizontal baseline centered; ticks at integer or approved fractions only.
- Use text-aware thinning for dense numeric separators; avoid rotation.
- Axis label centered; title via `calculateTitleLayout` if present.
- Segments/markers limited in count; colors from palette only.
- For fraction number lines, top/bottom labels must not exceed length caps; abbreviate where applicable.

References:

```145:184:src/lib/widgets/generators/fraction-number-line.ts
// Axis line, tick rendering, and label placements with padding
```

### Coordinate plane (basic and comprehensive)

- Use `generateCoordinatePlaneBase` or replicate its guarantees: grid, axes, intersection-aware ticks, π formatting where needed, clip path, extents-based dynamic width.
- Quadrant labels optional, placed within chart area only.
- All polylines/lines clipped; points drawn last.

References:

```281:398:src/lib/widgets/generators/coordinate-plane-base.ts
// Base plane, clipping, ticks, labels, extents
```

```100:131:src/lib/widgets/generators/coordinate-plane-comprehensive.ts
// Z-ordering and clipping integration via wrapInClippedGroup
```

### Line-equation graphs / Parabola / Trig

- Sample functions into polylines with fixed density; clip to chart.
- Use intersection-aware tick rules at origin.
- π-based formatter for trig x-axis; degree option must be explicit and mutually exclusive.
- Provide bounded parameter ranges (e.g., m ∈ [-5,5] step 0.5; a ∈ [-2,2]). Out-of-range → error.
- Always use text-aware thinning on x tick labels.

References:

```57:151:src/lib/widgets/generators/parabola-graph.ts
// Axes, ticks, labels; includeText for extents; labeling
```

### Histograms / Bar-like charts

- Validate separators/bin counts; strictly increasing separators.
- Non-rotated labels; text-aware thinning at separators.
- Extents: include x-axis labels before computing dynamic width.

References:

```100:201:src/lib/widgets/generators/histogram.ts
// Validation, layout, thinning, dynamic width
```

### Scatter with lines / Keeling-like curves

- Title layout via `calculateTitleLayout`; legend margin via `calculateLineLegendLayout`.
- Clip both points (optional) and lines (mandatory) to chart area.
- Use text-aware thinning for x ticks; unrotated labels.

References:

```320:436:src/lib/widgets/generators/scatter-plot.ts
// Title, legend, thinning, clipping
```

---

## Parameter constraints for LLM-facing inputs

Apply hard limits to minimize risky outputs. Example defaults:

- Domains: enumerated safe sets (e.g., xDomain ∈ {[-6,6],[-10,10]}).
- Tick intervals: enumerated {0.5, 1, 2}; forbid dense+tiny steps.
- Label lengths: cap at 24 chars (title 48), auto-abbreviate months.
- Counts: points ≤ 8, lines ≤ 3, polygons ≤ 2 (≤ 5 vertices), ticks ≤ 20.
- Colors: fixed palette tokens only.
- Sampling: fixed N per chart width (e.g., 2×px step), never user-supplied.

When violated: log + throw. No fallback.

---

## Accessibility and i18n

- Add `<title>` and `<desc>` to top-level `<svg>`; reflect widget title/summary.
- Use ARIA role="img" by default.
- Locale-aware number formatting when not math-special (π/fraction).
- Ensure sufficient contrast; support pattern fills for low-contrast palettes.

---

## Testing strategy

- Unit test shared policies/utilities:
  - `calculateTextAwareLabelSelection`
  - `computeDynamicWidth`
  - `calculateTitleLayout`
  - `calculateIntersectionAwareTicks`
- Snapshot representative widgets with edge cases:
  - Very long titles; narrow charts; dense x ticks; origin-adjacent ticks.
  - Multi-language labels; extreme domain bounds.
- Fuzz tests for schema limits; all invalid inputs must throw.

---

## Performance hygiene

- Keep heuristic text widths; consider precomputed glyph width tables for precision mode.
- Memoize repeated label formatting within a render.
- Prefer string builders or array joins in hotspots if profiling indicates benefit.

---

## Migration plan (math only)

1. Add shared formatter utilities for π/fractions/degree.
2. Enforce dynamic width + extents in all math generators.
3. Ensure universal clip-path usage for curves/lines.
4. Standardize axis API across math widgets (`min`, `max`, `tickInterval`, `label`, `showGridLines`, `showTickLabels`).
5. Replace ad-hoc thinning with `calculateTextAwareLabelSelection` everywhere.
6. Add tests for each policy; expand snapshots.

---

## Appendix: representative code references

- `@/lib/widgets/utils/layout.ts` — extents, dynamic width, clip paths, title/legend layout, text-aware thinning, intersection-aware ticks.
- `@/lib/widgets/utils/text.ts` — wrapped text and rotated y-axis label helpers.
- `@/lib/widgets/utils/labels.ts` — month abbreviation utility.
- `@/lib/widgets/generators/coordinate-plane-base.ts` — plane foundation, clipping, ticks/labels, dynamic width.
- `@/lib/widgets/generators/coordinate-plane-comprehensive.ts` — z-order + clipping.
- `@/lib/widgets/generators/scatter-plot.ts` — title/legend layout, thinning, clipping.
- `@/lib/widgets/generators/histogram.ts` — validation, thinning, dynamic width.
- `@/lib/widgets/generators/parabola-graph.ts` — axis/tick/label conventions for math graphs.


