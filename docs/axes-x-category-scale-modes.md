## Proposal: Explicit X-Axis Categorical Scale Modes (band vs point)

### Problem
- Our axis engine currently treats categorical X-axes as band-centered (good for bar charts), while several line-like widgets plot points edge-to-edge across the full width. This mismatch causes ticks to appear between data points instead of under them.
- This is fundamentally incorrect for line/area/scatter-style charts with categorical X labels. We need a single source of truth that forces each widget to pick the intended mapping explicitly.

### Goal
- Introduce an explicit, required X-axis scale mode that unambiguously controls how categorical X positions are computed and where ticks/labels are placed.
- Eliminate per-generator ad hoc spacing (e.g., `stepX`) and have all geometry use the axis engine’s `toSvgX` mapping so ticks and series positions are guaranteed to align.

### API Changes (Required, Non-Optional)

Add a required discriminant on the X-axis spec passed into the V2 base (`generateCoordinatePlaneBaseV2`). We must force all widgets to choose a mode.

Option A (recommended): single explicit scale type for X

```ts
// New: required X-scale type (no default)
type XScaleType = "numeric" | "categoryBand" | "categoryPoint"

type AxisSpecX = {
  // required discriminant
  xScaleType: XScaleType

  // common properties
  label: string
  showGridLines: boolean
  showTickLabels: boolean

  // numeric mode (required fields)
  domain?: { min: number; max: number }
  tickInterval?: number
  labelFormatter?: (value: number) => string

  // category modes (required fields)
  categories?: string[]
}
```

Validation rules:
- If `xScaleType === "numeric"`: `domain` and `tickInterval` are required; `categories` must be absent.
- If `xScaleType === "categoryBand"` or `"categoryPoint"`: `categories` is required and non-empty; `domain`/`tickInterval` are ignored for X.

Axis behavior:
- `numeric`:
  - `toSvgX(val)` uses linear mapping from `domain.min..domain.max` → `chartArea.left..chartArea.right`.
  - Ticks at numeric intervals; labels from `labelFormatter` or `String(t)`.
- `categoryBand` (bar-like):
  - `bandWidth = chartArea.width / N` where `N = categories.length`.
  - `toSvgX(i) = chartArea.left + (i + 0.5) * bandWidth` (band centers).
  - Ticks at band centers; expose `bandWidth` for bar sizing.
  - Edge cases: `N==1` → center at mid; `N>1` → uniform band centers.
- `categoryPoint` (line-like):
  - `step = (N <= 1) ? 0 : chartArea.width / (N - 1)` where `N = categories.length`.
  - `toSvgX(i) = chartArea.left + i * step` (points at edges; first=left, last=right).
  - Ticks at these point positions. No `bandWidth`.
  - Edge cases: `N==1` → center at mid; `N==2` → positions at left/right edges.

Option B (alternative): keep current `AxisSpec` and add a required `xCategoryScale: "band" | "point"` only when categories are used. This is slightly less explicit than Option A because numeric vs categorical is still inferred, but acceptable if enforced at the schema level. If used, this discriminant must be required whenever `categories` is provided.

This proposal assumes Option A to maximize clarity and type-level enforcement.

### Engine Implementation Notes

Update `computeAndRenderXAxis` to:
- Require and branch on `xScaleType`.
- Compute `toSvgX`, tick positions, and `bandWidth` consistent with the selected mode.
- Continue using `calculateTextAwareLabelSelection` for categorical label thinning and `calculateIntersectionAwareTicks` for numeric.
- Maintain the existing pads.bottom computation and label/title placement.

Edge cases to handle uniformly:
- `categories.length === 0` → error (log + throw).
- `categories.length === 1` → point at center for both modes.
- `categories.length === 2` → `categoryPoint` places points at left/right edges; `categoryBand` centers two bands.

### Geometry Alignment Rules (Generators)

- All generators must use `base.toSvgX(i)` for X positioning. Remove any hand-rolled `stepX` logic in line-like widgets.
- Bar-like widgets should use `base.bandWidth` (only present in `categoryBand`) to size bars (respecting any inner padding).
- Numeric X charts should keep numeric domain and use `labelFormatter` for label control as needed.

### Which Widgets Use Which Mode

- Use `categoryPoint` (line-like X):
  - `src/lib/widgets/generators/line-graph.ts`
  - `src/lib/widgets/generators/area-graph.ts`
  - `src/lib/widgets/generators/conceptual-graph.ts`
  - `src/lib/widgets/generators/population-change-event-graph.ts`
  - other line/area-like widgets that plot along categorical X

- Use `categoryBand` (bar-like X):
  - `src/lib/widgets/generators/bar-chart.ts`
  - `src/lib/widgets/generators/histogram.ts` (if categorical buckets treated as bands)
  - `src/lib/widgets/generators/divergent-bar-chart.ts`

- Use `numeric` (numeric X):
  - `src/lib/widgets/generators/keeling-curve.ts` (years can stay numeric with labelFormatter)
  - scatter/number-line style widgets already working with numeric domains

Note: For horizontal bar charts, the categorical axis is Y, not X. We can optionally mirror a `yScaleType` in future work. This proposal focuses on X-axis alignment issues.

### Enforcement (Type + Runtime)

- Update the TypeScript types and Zod schemas used to construct the X-axis spec so that `xScaleType` is required (Option A) and validated.
- Runtime checks (with structured logging) must log and throw when:
  - `xScaleType === "numeric"` but `domain`/`tickInterval` missing.
  - `xScaleType` is category* but `categories` missing/empty.
  - `xScaleType` is unknown.

### Migration Plan

1) Implement engine support (no widget changes yet):
   - Add `xScaleType` support to `computeAndRenderXAxis` and V2 base orchestration.
   - Unit-test `toSvgX` and tick placement for all three modes (`numeric`, `categoryBand`, `categoryPoint`) including `N==1` and `N==2`.

2) Migrate line-like widgets to `categoryPoint` and remove local `stepX`:
   - `src/lib/widgets/generators/line-graph.ts`: remove `stepX` and use `base.toSvgX(i)` directly. Set `xScaleType: "categoryPoint"`.
   - `src/lib/widgets/generators/area-graph.ts`, `conceptual-graph.ts`, `population-change-event-graph.ts`: same changes as above.

3) Ensure bar-like widgets declare `categoryBand` explicitly and keep using `bandWidth`.

4) Numeric X widgets declare `numeric` explicitly.

5) Snapshot updates
   - Expect line-like widgets to shift ticks to align exactly under data points (first at left edge, last at right edge).
   - Bar-like snapshots should remain unchanged.

### Acceptance Criteria

- All widgets compiling through V2 must provide `xScaleType` (non-optional) and pass schema validation.
- For line-like widgets with categorical X, ticks align directly under the data points across all snapshots.
- No generator computes its own `stepX` for categorical X positioning; `base.toSvgX` is the single source of truth.
- Bar-like widgets continue to render centered ticks and use `bandWidth`.

### FAQ

- Why not infer from presence of `categories`? Because we want to force an explicit choice and prevent accidental mismatches in the future.
- What about Y-axis categories (horizontal bar charts)? This can be mirrored with a future `yScaleType`. For now, this proposal unblocks the widespread X-axis tick/point alignment bug.
- Will this affect dynamic width/height or top padding? No. The recent top-tick padding improvements remain in effect and are orthogonal to the X mapping.


