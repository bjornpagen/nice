## Coordinate Plane Axis Engine: V2 Migration and Refactor Proposal

### Overview
We will migrate all remaining coordinate-plane-based widgets off the legacy base generator to the unified V2 axis engine and refactor the V2 base orchestrator to live under `@/lib/widgets/utils/` instead of the generator directory. This unifies axis layout logic, fixes top/bottom clipping, and simplifies maintenance.

### Goals
- Migrate all legacy users of `generateCoordinatePlaneBase(...)` to the V2 engine.
- Add first-class internal-origin ("internalZero") axis placement to V2 so math-plane widgets render axes at the true zero crossing.
- Move the V2 base orchestrator out of `generators/` into `utils/` so shared axis/layout code is clearly separated from widget generators.
- Remove the legacy base and dead code after migration.

### Non-goals
- Visual redesigns or spec changes to widgets beyond axis placement/padding parity.
- Changing existing public widget schemas.

### Current State
- Unified axis engine lives at `@/lib/widgets/utils/axes.ts` (already in utils). It renders conventional axes (left Y, bottom X) and computes horizontal/vertical padding from real tick/label positions.
- The V2 base orchestrator lives in `@/lib/widgets/generators/coordinate-plane-base.ts` as `generateCoordinatePlaneBaseV2(...)`, alongside the legacy base.
- Some widgets already use V2 (`line-graph`, `divergent-bar-chart`, `keeling-curve`, etc.). Others still use the legacy base.

### Widgets that must migrate
Replace uses of the legacy `generateCoordinatePlaneBase(...)` with V2. Affected files:

- `src/lib/widgets/generators/coordinate-plane-comprehensive.ts`
- `src/lib/widgets/generators/polygon-graph.ts`
- `src/lib/widgets/generators/shape-transformation-graph.ts`
- `src/lib/widgets/generators/function-plot-graph.ts`
- `src/lib/widgets/generators/point-plot-graph.ts`
- `src/lib/widgets/generators/line-equation-graph.ts`
- `src/lib/widgets/generators/distance-formula-graph.ts`

These widgets expect axes crossing at the true origin and optional quadrant labels; they will use V2 with `placement: "internalZero"` for both axes.

### Proposed Refactor: File and API Layout

1) Keep the axis engine in utils (unchanged file):
   - `@/lib/widgets/utils/axes.ts`

2) Move the V2 base orchestrator from generators → utils:
   - From: `@/lib/widgets/generators/coordinate-plane-base.ts` (export `generateCoordinatePlaneBaseV2`)
   - To: `@/lib/widgets/utils/plane.ts` (export the same `generateCoordinatePlaneBaseV2` API)

   Rationale: The V2 base orchestrator composes axis engine, clipping, extents, and scaling. It is shared infrastructure, not a widget generator.

3) Leave the legacy base (`generateCoordinatePlaneBase`) in place only during migration; remove it once all references are gone.

### Axis Engine Enhancements (V2)

To support the math-plane widgets, extend V2 axis rendering:

- Y Axis internal-zero placement
  - When `spec.placement === "internalZero"`, draw the axis line at `x = chartArea.left + ((0 - xMin) / (xMax - xMin)) * chartArea.width`.
  - Render ticks centered on that internal axis; labels to the left of the axis (same side as current left placement).
  - Compute `pads.top` (and if needed `pads.bottom`) from the top/bottom-most labeled tick baselines using font ascent estimation to prevent clipping.

- X Axis internal-zero placement
  - When `spec.placement === "internalZero"`, draw the axis line at `y = chartArea.top + chartArea.height - ((0 - yMin) / (yMax - yMin)) * chartArea.height`.
  - Render ticks/labels adjacent to that axis line (not only at the bottom). Compute vertical pads where labels risk clipping near the top edge.

- Gridline suppression at 0
  - Continue to suppress the gridline at 0 when it would overdraw the main axis (ticks/labels still render).

Acceptance criteria:
- Axis lines cross at the true domain zero for both axes.
- No clipping of top-most tick labels; viewBox is computed with adequate padding.
- Existing V2 charts (left/bottom placement) remain visually stable apart from the padding improvements already merged.

### Migration Steps Per Widget

For each affected generator:

1) Update imports
```ts
// Before
import { generateCoordinatePlaneBase, ... } from "@/lib/widgets/generators/coordinate-plane-base"

// After
import { generateCoordinatePlaneBaseV2, ... } from "@/lib/widgets/utils/plane"
```

2) Replace base creation
```ts
// Before
const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points)

// After (V2)
const base = generateCoordinatePlaneBaseV2(
  width,
  height,
  null, // no title unless the widget spec provides one
  {
    label: xAxis.label,
    min: xAxis.min,
    max: xAxis.max,
    tickInterval: xAxis.tickInterval,
    showGridLines: xAxis.showGridLines,
    showTickLabels: true,
    placement: "internalZero"
  },
  {
    label: yAxis.label,
    min: yAxis.min,
    max: yAxis.max,
    tickInterval: yAxis.tickInterval,
    showGridLines: yAxis.showGridLines,
    showTickLabels: true,
    placement: "internalZero"
  }
)
```

3) Clip geometry using the provided clip id
```ts
// Before
wrapInClippedGroup("chartArea", content)

// After
wrapInClippedGroup(base.clipId, content)
```

4) Preserve layering and extents
- Keep geometry (polylines, lines, polygons) inside the clipped group.
- Keep markers/labels that must not be cut off outside the clipped group.
- Continue calling `includePointX` / `includeText` for horizontally expansive content; the axis engine registers its own text extents already.

5) Quadrant labels (if applicable)
```ts
const zeroX = base.toSvgX(0)
const zeroY = base.toSvgY(0)
// Position I/II/III/IV relative to zeroX/zeroY and base.chartArea
```

6) Final SVG assembly with dynamic width & computed total height
```ts
const totalHeight = base.chartArea.top + base.chartArea.height + base.outsideBottomPx
const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, totalHeight, AXIS_VIEWBOX_PADDING)
const svg = `<svg width="${dynamicWidth}" height="${totalHeight}" viewBox="${vbMinX} 0 ${dynamicWidth} ${totalHeight}" ...>`
```

### Deleting Legacy Base
After all references are migrated:
- Remove the legacy `generateCoordinatePlaneBase(...)` implementation from `@/lib/widgets/generators/coordinate-plane-base.ts` and any dead helpers only used by it.
- Keep shared render helpers (points, lines, polygons, polylines, distances) if still consumed by the migrated widgets.

### Testing & Validation
1) Unit snapshots
- Run `bun test` and update snapshots with `bun test -u` when axis padding alters dimensions.
- Manually verify internal-origin axes cross exactly at 0.

2) Visual checks
- Confirm top-most tick labels are not clipped.
- Confirm gridline at 0 is suppressed where the axis line is drawn.

### Risks & Mitigations
- Risk: Internal-zero introduces vertical pad changes that alter many snapshots.
  - Mitigation: Batch snapshot updates and spot-check reference widgets.
- Risk: Quadrant label placement depends on the new scaling; regressions possible.
  - Mitigation: Verify label positions relative to `base.toSvgX(0)`/`base.toSvgY(0)` and `base.chartArea`.

### Rollout Plan
1) Implement internal-zero support in `axes.ts` for both axes, with vertical pad computation mirroring the Y-top fix already in place.
2) Relocate V2 base orchestrator to `@/lib/widgets/utils/plane.ts` and update exports.
3) Migrate one simple widget (e.g., `point-plot-graph`) to validate the API and snapshots.
4) Migrate remaining widgets in two batches; run tests after each batch.
5) Remove legacy base logic when grep shows zero references.

### Time & Effort Estimate
- Axis engine internal-zero support (both axes) and padding: 2–4 hours
- Moving V2 base orchestrator and updating imports: 1 hour
- Migrating 7 widgets: 3–5 hours (including snapshot curation)
- Cleanup & removal of legacy base: 0.5 hour

### Appendix A: Grep Checklist
- Find legacy usage:
  - `generateCoordinatePlaneBase\(`
  - `from "@/lib/widgets/generators/coordinate-plane-base"`

### Appendix B: Before/After Import Map
```ts
// Before
import { generateCoordinatePlaneBase, renderPoints, renderLines, renderPolylines, renderPolygons, renderDistances } from "@/lib/widgets/generators/coordinate-plane-base"

// After
import { generateCoordinatePlaneBaseV2 } from "@/lib/widgets/utils/plane"
import { renderPoints, renderLines, renderPolylines, renderPolygons, renderDistances } from "@/lib/widgets/generators/coordinate-plane-base" // Only the render helpers remain here, or move them later into utils if desired
```

Optional future step: Move the render helpers into `@/lib/widgets/utils/` once all references are updated, to fully decouple shared rendering utilities from the generator directory.


