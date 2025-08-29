## Root Cause Analysis: Missing Y‑Axis Tick Stubs in Some Widgets

### Summary
- **Problem**: Vertical tick marks on the y‑axis sometimes do not appear in certain widgets (e.g., parabola graph – enzyme activity).
- **Root cause**: Our dynamic viewBox sizing relies on an extents tracker that often records only text and plotted geometry, but not the physical axis hardware (tick stubs, axis overhangs, arrowheads). When labels are hidden or short, nothing pushes the left (or top) boundary in `ext`, so the computed viewBox can exclude the few pixels where y‑axis tick stubs extend beyond the axis line.
- **Scope**: This is a systemic issue across many generators that use `initExtents` + `includeText`/`includePointX` + `computeDynamicWidth` but draw axes/ticks without registering their overhangs in extents.
- **Fix**: Centralize and enforce axis‑hardware extent registration in layout utils, and apply it consistently wherever axes are drawn. Add guardrail tests.

### Evidence and mechanics
- Extents are initialized and used to derive the final `viewBox` and `width`:
```12:49:src/lib/widgets/utils/layout.ts
export type Extents = { minX: number; maxX: number }
export function initExtents(initialWidth: number): Extents {
    return { minX: 0, maxX: initialWidth }
}
export function includeText(ext: Extents, absoluteX: number, text: string, anchor: "start" | "middle" | "end", avgCharWidthPx = 7): void { /* updates minX/maxX */ }
export function includePointX(ext: Extents, absoluteX: number): void { /* updates minX/maxX */ }
export function computeDynamicWidth(ext: Extents, _height: number, pad = 10) {
    const vbMinX = Math.min(0, Math.floor(ext.minX - pad))
    const vbMaxX = Math.max(0, Math.ceil(ext.maxX + pad))
    const dynamicWidth = Math.max(1, vbMaxX - vbMinX)
    return { vbMinX, vbMaxX, dynamicWidth }
}
```
- Many widgets draw y‑axis tick stubs at `x = margin.left - 5` but never add that overhang to extents:
```168:172:src/lib/widgets/generators/line-graph.ts
svgBody += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="${theme.colors.axis}"/>`
// Only labels are included in extents when present:
includeText(ext, margin.left - 10, String(t), "end", 7)
```
```138:142:src/lib/widgets/generators/parabola-graph.ts
svgBody += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="${theme.colors.axis}"/>`
// If labels are hidden or abbreviated, nothing updates extents for this overhang
```
- Other chart types (e.g., histogram, bar/area graphs) use the same stub pattern. Some charts “get lucky” because long rotated y‑axis titles or visible tick labels expand extents far enough to include the stubs. That’s incidental, not guaranteed.

### Why it’s systemic (not one widget)
- We found identical y‑axis tick stub rendering in multiple generators without corresponding extents updates (line, area, bar, histogram, parabola, etc.).
- Several widgets also use plot‑area clipPaths for curves/lines. Although axes are usually rendered outside the clipped group (correct), the dynamic `viewBox` still controls what’s visible at the document level. If extents omit hardware overhangs, the `viewBox` can clip them.

### Design goals for the fix
- **Single source of truth** for axis hardware extents so every widget benefits.
- **Zero reliance on labels** to rescue extents; labels are optional decorations.
- **Explicit geometry tracking** for any axis overhang that can exceed the chart area: tick stubs, axis arrowheads, baseline caps.
- **No magic numbers anywhere**: all lengths/paddings come from named constants in one place.
- **No backward‑compat constraints**: we will refactor and regenerate all widgets/tests to achieve a clean, unified axis system.

### Proposed general solution (no magic numbers, unified axis engine)
1) Create a single Axis Layout + Render engine (e.g., `src/lib/widgets/utils/axes.ts`) that:
   - Defines canonical, named constants (in `theme` or `constants`) for tick length, tick label padding, title padding, axis stroke widths.
   - Accepts an axis spec (domain, ticks, grid options, label text, placement) and returns:
     - `pads`: computed margins (left/right/bottom/top) from measured text and paddings.
     - `hardwareExtents`: precise horizontal extents contributed by axis hardware (axis line x, tick stubs, arrowheads). No magic `±5` in widgets.
     - `markup`: SVG strings for axes/ticks/labels/titles.
   - Internally updates extents via a single code path. Widgets never call `includePointX`/`includeText` for axis elements.

2) Route all 2D charts through this engine via a shared base (extend `coordinate-plane-base.ts` or replace its axis code):
   - Widgets provide axis config only; the base computes pads, builds the plot area, and returns `toSvgX`/`toSvgY`, `ext`, and axis `markup`.
   - The base appends data layers (bars, lines, points) wrapped in clipPaths; axes remain outside clips.

3) Eliminate per‑widget offsets:
   - Remove expressions like `margin.left - 5` across the codebase. The axis engine will own tick placement and overhangs using named constants, not literals.
   - Remove direct per‑widget text measurements for axis labels; the engine measures and allocates space.

4) Keep `computeDynamicWidth` as‑is, but ensure the axis engine feeds accurate extents including hardware. This keeps the `viewBox` correct without over‑padding.

5) Add lint enforcement to prevent regressions (see “Lint rule” below).

### Affected widgets and actions
- Affected families (non‑exhaustive): `line-graph.ts`, `area-graph.ts`, `bar-chart.ts`, `histogram.ts`, `parabola-graph.ts`, `scatter-plot.ts`, `conceptual-graph.ts`, `keeling-curve.ts`, `population-change-event-graph.ts`, `divergent-bar-chart.ts`, plus any generator that draws y‑axes.
- Actions (breaking, unified refactor):
  - Replace all per‑widget axis drawing with calls into the axis engine (via the base plane helper).
  - Delete magic offsets and inline tick lengths from generators; use the engine’s constants.
  - For dual‑axis charts, the engine should compute and register right‑side hardware extents.

### Test plan (guardrails)
- Add snapshot tests across representative widgets with:
  - y‑axis labels hidden
  - minimal/short labels
  - both left‑only and dual y‑axes
  - varying tick lengths (from the engine constants)
- Assertions:
  - The axis engine’s constants are reflected in markup (no ad‑hoc `±5`).
  - The computed `viewBox` includes tick stubs and arrowheads regardless of label presence.
  - For dual axes, ensure right hardware is within the `viewBox`.
  - Zero occurrences of `margin.left - <number>` and similar patterns in generators (enforced via lint rule).

### Rollout strategy (breaking, regenerate everything)
1) Implement the axis engine and integrate into `coordinate-plane-base.ts` (or replace its axis code).
2) Migrate all generators to use the base + engine; remove per‑widget axis code/offsets.
3) Add the guardrail tests for: line graph (single and dual axis), histogram, bar chart, area graph, parabola graph, scatter plot.
4) Regenerate snapshots; accept viewBox and padding changes as the new baseline.

### Lint rule to ban magic axis offsets
- Add a Grit rule to block patterns like `margin.left - <number>`, `axisX - <number>`, and inline tick lengths in generators. Allow only references to engine constants and engine API.
- Example (conceptual):
```grit
rule no-magic-axis-offsets {
  where file.contains("src/lib/widgets/generators/")
  
  pattern {
    /margin\.left\s*[+-]\s*\d+/
    | /axisX\s*[+-]\s*\d+/
  }
  message "Use axis engine constants and API; magic axis offsets are banned"
}
```

### Why this solves it permanently
- A single axis engine owns all hardware geometry and spacing; widgets can’t introduce offsets.
- All axis hardware contributes to extents centrally; labels are never required to “rescue” viewBoxes.
- Guardrail tests + lint rules prevent re‑introducing ad‑hoc offsets.

### Non‑goals / alternatives considered
- Tweaking `computeDynamicWidth` to blindly add a larger global pad: rejected. It treats the symptom and bloats whitespace without guaranteeing coverage for arbitrary overhangs (e.g., arrowheads) while also violating our preference for explicit geometry tracking.
- Forcing y‑axis labels to always render: rejected. Labels are content, not layout ballast.

### Next steps
- Add `includeYAxisTickOverhang` and (if needed) `includeAxisArrowOverhang` to `utils/layout.ts`.
- Adopt in `coordinate-plane-base.ts`; then migrate remaining generators.
- Land guardrail tests across major widget families.


### Axis Engine Architecture (deep dive)
This section defines the target architecture to remove all magic numbers and fully unify axis behavior across widgets.

- **Module**: `src/lib/widgets/utils/axes.ts`
- **Responsibilities**:
  - Owns canonical constants (tick length, paddings, stroke widths)
  - Computes pads and anchor positions for axes (left/right y, bottom x)
  - Generates SVG markup for axis lines, grid lines, ticks, labels, and titles
  - Registers all axis hardware extents centrally (left/right overhangs, arrowheads)
  - Exposes a simple, typed API used by all 2D widgets (line, area, bar, scatter, hist, parabola, etc.)

#### Constants (single source of truth)
Defined in `@/lib/widgets/utils/constants` or colocated in `axes.ts` and re-exported.

- `TICK_LENGTH_PX`: number
- `TICK_LABEL_PADDING_PX`: number
- `AXIS_TITLE_PADDING_PX`: number
- `AXIS_TITLE_FONT_PX`: number
- `AXIS_STROKE_WIDTH_PX`: number
- `GRID_STROKE_WIDTH_PX`: number
- `LABEL_AVG_CHAR_WIDTH_PX`: number (for estimation)
- `PAD_DEFAULT_PX`: number (feeds computeDynamicWidth pad)

No widget may hardcode these values; they import from the axis engine/constants.

#### API (typed, no fallbacks)
```ts
type AxisSpec = {
  domain: { min: number; max: number };
  tickInterval: number;
  label: string; // empty string allowed (prefer-empty-string)
  showGridLines: boolean;
  placement: "left" | "right" | "bottom";
  // Optional advanced placement
  xInternalZero?: { enabled: boolean }; // for x-axis when y=0 passes inside chart
};

type AxisComputeResult = {
  pads: { left: number; right: number; top: number; bottom: number };
  anchor: { x: number; y: number };
  markup: string; // axis + ticks + labels + title
  registerExtents(ext: Extents): void; // applies hardware overhangs to extents
};

export function computeAndRenderYAxis(
  spec: AxisSpec,
  chartHeightPx: number,
  svgWidthPx: number,
  pads: { top: number; right: number; bottom: number }
): AxisComputeResult

export function computeAndRenderXAxis(
  spec: AxisSpec,
  chartWidthPx: number,
  svgHeightPx: number,
  pads: { left: number; right: number; top: number }
): AxisComputeResult
```

The engine internally:
- Measures/wraps the y‑axis title using existing `estimateWrappedTextDimensions`
- Computes margin based on tick label widths (using `LABEL_AVG_CHAR_WIDTH_PX`)
- Emits tick stubs using `TICK_LENGTH_PX` (never literal `5`)
- Calls `includePointX` appropriately to register `axisX` and `axisX ± TICK_LENGTH_PX`
- Never expects labels to be present to manage extents

#### Coordinate plane base integration
- `coordinate-plane-base.ts` delegates axis computation entirely to the engine. It:
  - Calls `computeAndRenderYAxis` and `computeAndRenderXAxis`
  - Receives: pads, markup, and an `ext` registrar for each axis
  - Builds `toSvgX`/`toSvgY` from min/max and chart area
  - Wraps data layers in clipPaths; appends axis markup outside
  - Applies `registerExtents(ext)` from each axis result, then calls `computeDynamicWidth`

#### Data flow
1) Widget constructs axis specs (pure data)
2) Base computes axis results (pads/markup/anchors) using engine
3) Base renders data layers with computed chart area
4) Axis results register hardware extents centrally
5) `computeDynamicWidth` derives final viewBox/width


### Label measurement & collision rules
- Use the existing text estimation pipeline for width; never rely on runtime DOM measurement
- Rotated y‑axis title: keep `includeRotatedYAxisLabel` a no‑op for horizontal extents; engine accounts for its required margin
- X‑axis labels: use `calculateTextAwareLabelSelection` for thinning
- Intersection avoidance: keep `calculateIntersectionAwareTicks` behavior; ensure it’s applied by the engine, not per widget


### Dual axes & internal‑zero placement
- Right y‑axis: engine computes an independent right margin and registers overhang at `rightAxisX + TICK_LENGTH_PX`
- Internal zero: engine supports `xInternalZero.enabled`; it places y‑axis anchor at the zero x relative position and recomputes left margin accordingly (using our existing `calculateYAxisLayoutAxisAware` logic), then registers overhang relative to the new anchor


### RTL, i18n, and long labels
- The engine respects locale scripts with long/RTL labels; paddings are symmetric constants, and label measurement is based on estimated width, not hardcoded glyphs
- Wrapping: the title wrapping stays controlled by our text utilities; engine requests wrapped heights and allocates space


### Accessibility considerations
- Ensure axis labels and tick labels have adequate font sizes (centralized in theme)
- Maintain sufficient color contrast (already in `theme.colors`); engine should not introduce new colors


### Performance considerations
- O(number of ticks) for layout and markup generation
- No DOM measurement; all width estimates are static functions
- `computeDynamicWidth` remains O(1)
- Shared constants avoid per‑widget micro‑decisions


### Migration guide (step‑by‑step)
1) Implement `axes.ts` with constants + API above
2) Update `coordinate-plane-base.ts` to use axis engine, returning { svgBody (with axis markup), toSvgX/Y, ext }
3) Migrate these widgets first (broad coverage of patterns):
   - `line-graph.ts` (single + dual axis)
   - `histogram.ts`
   - `bar-chart.ts`
   - `area-graph.ts`
   - `parabola-graph.ts`
   - `scatter-plot.ts`
4) Remove any direct axis code in those widgets (no more `margin.left - 5`)
5) Regenerate snapshots, adjust tests to new `viewBox` where needed
6) Roll out to remaining generators using coordinate planes
7) Add Grit lint rules (see below) and fix violations


### Comprehensive test matrix
- Dimensions: small (narrow width), medium, large
- Y‑axis labels: empty, short, long (wrap), RTL samples
- Ticks: dense (small interval), sparse (large interval), labels hidden
- Dual axes: right y present/absent; differing domains
- Internal zero: enabled/disabled; zero outside chart range; degenerate ranges
- Gridlines: on/off
- Parabola/curves with clipPath: ensure axes remain outside clip and visible
- Assertions per earlier Test plan plus: no axis elements clipped when `width` is barely sufficient; arrowheads visible when enabled


### Static analysis rules (grit) – extended
- Ban magic axis offsets and inline tick lengths in generators
- Encourage imports from `axes.ts` for axis constants, API
- Example additional checks (conceptual):
```grit
rule require-axis-engine-imports {
  where file.contains("src/lib/widgets/generators/")
  and not file.contains("src/lib/widgets/utils/axes")
  
  pattern {
    /\btick\b|\baxis\b|\bgrid\b/
  }
  message "Axis drawing must use utils/axes API; do not hand-roll axis logic"
}
```


### Risks and trade‑offs
- Breaking change: snapshot churn and slight layout shifts as constants unify; acceptable per goal
- Some widgets may need slight chart area tweaks due to more accurate pads
- Constants need careful tuning to balance readability and compactness; they are centralized, so tuning is easy


### Open questions (to resolve in PRD)
- Do we want axis arrowheads by default? If yes, define an arrowhead size constant and register extents accordingly
- Should the engine thin tick labels more aggressively for narrow widths?
- Minimum font sizes for accessibility vs compact charts – pick a single baseline in `theme`


### Acceptance criteria
- No generator contains `margin.left - <number>` or similar magic axis offsets
- All axis hardware is rendered from the axis engine and contributes to extents centrally
- All representative widget snapshots pass under scenarios in the matrix (labels hidden, dual axes, internal zero)
- Lint rules in place to prevent regressions; CI fails on violations
- Documentation updated for widget authors: “Axis usage = provide AxisSpec only”


