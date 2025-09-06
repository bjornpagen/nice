## Canvas-level Smart Text Placement (Collision-Aware Labels)

### Goal
Provide a deterministic, opt-in API in our canvas layer to place text near geometry while automatically avoiding collisions with lines, polygons, and other obstacles. This centralizes label-placement heuristics so widgets get high-quality results with minimal bespoke logic.

### Why this is useful
- **Consistency**: Every widget benefits from the same high-quality placement instead of one-off label logic.
- **Robustness**: The canvas has the full picture of what has been drawn; it can make better decisions than per-widget code which only sees local context.
- **Performance**: One tuned, shared implementation with predictable complexity beats multiple ad‑hoc approaches.
- **Developer velocity**: Widgets become simpler—just provide intent (edge to label, preferred direction) and let the canvas find a safe placement.
- **Quality**: Handles concavities and tight spaces (e.g., small notches) gracefully by trying multiple candidate directions and clearing collisions.

### Scope and non-goals
- In-scope: Avoiding overlaps with canvas-registered obstacles (lines, polylines, polygons, rects, circles, images, foreign objects) and with chart bounds.
- Out-of-scope (initially): Avoiding overlaps with other text labels (phase 2), path-following text, force-directed global layout.

## Design Overview

### Core idea
`CanvasImpl` maintains an internal obstacle registry as primitives are drawn. A new family of APIs (e.g., `drawTextAvoiding`) measures the text box, generates candidate directions, iteratively nudges the text along a direction until there is no intersection with any obstacles, and finally renders the text at the chosen location while updating extents.

### Obstacles tracked by the canvas
- Lines: segment list with effective stroke width
- Polylines: segment list with effective stroke width
- Polygons: closed ring(s) with fill and stroke width
- Rects/Ellipses/Circles: approximated as polygons or analytic intersection tests
- Images/foreign objects: axis-aligned rectangles

Registration is implicit: calling any draw method adds a corresponding obstacle (unless `avoidRegistration: false` is passed for rare cases like guides).

### API sketch

```ts
// New: deterministic collision-aware text
canvas.drawTextAvoiding({
  text: string,
  // Either provide explicit coordinates or edge semantics
  at?: { x: number; y: number },
  edge?: { from: { x: number; y: number }, to: { x: number; y: number } },

  // Text styling
  anchor?: 'start' | 'middle' | 'end',
  dominantBaseline?: 'hanging' | 'middle' | 'baseline',
  fontPx?: number,
  fontWeight?: '100'|'200'|'300'|'400'|'500'|'600'|'700'|'800'|'900',
  fill?: string,
  stroke?: string,
  strokeWidth?: number,

  // Placement controls
  prefer?: 'outward' | 'inward' | 'auto', // Only relevant if edge provided
  offsetPx?: number,                        // Initial offset from edge midpoint or from `at`
  paddingPx?: number,                       // Collision pad around text box
  stepPx?: number,                          // Nudge step size
  maxIter?: number,                         // Safety cap on nudges
  avoidGroups?: ('all' | string)[]          // Which obstacle groups to consider (see groups below)
}): void

// Wrapped text variant (width-constrained)
canvas.drawWrappedTextAvoiding({
  text: string,
  maxWidthPx: number,
  at?: { x: number; y: number },
  edge?: { from: { x: number; y: number }, to: { x: number; y: number } },
  // styling ...
  // placement controls ...
}): void

// Optional: obstacle grouping for fine control (e.g., avoid only current polygon)
canvas.beginGroup(id: string): void
canvas.endGroup(): void

// All draw methods accept an optional group tag to register obstacles into a group
canvas.drawPolygon(points, { stroke, strokeWidth, fill, group?: string })
```

### Default behavior
- `drawText` and `drawWrappedText` remain unchanged (no movement) to preserve backwards compatibility.
- `drawTextAvoiding` defaults: `prefer: 'auto'`, `offsetPx: 12`, `paddingPx: 1`, `stepPx: 2`, `maxIter: 60`, `avoidGroups: ['all']`.

### Candidate generation
- If `edge` provided: compute the unit outward normal at the edge midpoint; also use the inward normal (negated). Evaluate both.
- If `at` provided (point label): derive directions away from the nearest obstacle edge and away from the polygon centroid that contains `at` (if any). Evaluate 4–8 compass directions for robustness.

### Collision model
- Build the axis-aligned text rectangle using `estimateWrappedTextDimensions`, the specified anchor and baseline, and `paddingPx` as expansion.
- Intersection checks:
  - Segment–rect for lines/polylines
  - Polygon–rect for polygons (edge intersection, vertex-in-rect, rect-center-in-polygon)
  - Rect–rect for foreign objects/images
  - Circle/Ellipse via conservative rectangle approximation (phase 1)

### Selection rule
- For each candidate direction: starting from initial position, nudge by `stepPx` until no collisions OR until `maxIter`.
- Prefer the candidate with the fewest nudges (first to clear). Tie-breakers:
  - Larger minimum distance to nearest obstacle (optional metric)
  - In `prefer: 'outward' | 'inward'`, use that when the nudge counts tie

### Extents & bounds
- When computing collisions, also consider the current canvas bounds (viewBox space). If nudging would push the text outside, continue nudging along the candidate or fall back to the best inside-bound candidate.
- After placement, extents are updated from the final text rectangle as usual.

## Usage Examples

### 1) Side length labels on polygon edges
```ts
for (const e of edges) {
  canvas.drawTextAvoiding({
    text: e.label,
    edge: { from: e.from, to: e.to },
    fontPx: 14,
    fontWeight: '700',
    fill: theme.colors.primary,
    prefer: 'auto',         // try outward and inward
    offsetPx: 16,           // initial gap from edge
    paddingPx: 1
  })
}
```

### 2) Annotations near polylines
```ts
canvas.drawPolyline(curvePoints, { stroke: theme.colors.line, strokeWidth: 2, group: 'curve' })
canvas.drawTextAvoiding({
  text: 'Peak',
  at: { x: peakX, y: peakY },
  fontPx: 12,
  avoidGroups: ['curve']     // only avoid the curve
})
```

### 3) Wrapped labels for cramped areas
```ts
canvas.drawWrappedTextAvoiding({
  text: longNote,
  maxWidthPx: 120,
  at: { x: cx, y: cy },
  fontPx: 12,
  lineHeight: 1.2,
  stepPx: 3,
  maxIter: 80
})
```

## Implementation Plan

### Phase 1: MVP
- Build obstacle registry in `CanvasImpl` with adapters for existing draw methods.
- Implement `drawTextAvoiding` against lines, polylines, and polygons.
- Use `estimateWrappedTextDimensions` for sizing.
- Add internal helpers: `segmentIntersectsRect`, `polygonIntersectsRect`, `pointInPolygon`, `pointInRect`.
- Feature flag: `enableSmartTextAvoidance` on canvas options (default off). API callable regardless, but only moves text when the flag is enabled.

### Phase 2: Usability & breadth
- Add `drawWrappedTextAvoiding`.
- Register rects, circles, ellipses, foreign objects, and images as obstacles (rect approximations accepted initially).
- Add group scoping (`beginGroup`/`endGroup`, per-draw `group` option) and `avoidGroups` filtering.
- Add optional label–label avoidance by letting text placements also register as obstacles (opt‑in to avoid churn).

### Phase 3: API polish & migration
- Provide convenience shims in common generators (e.g., coordinate plane, number lines) to route to avoidance APIs.
- Consider a global config that upgrades `drawText`/`drawWrappedText` to avoidance variants for selected widgets.

## Performance Considerations
- Typical O(k · s · n) per label, where:
  - k = candidate directions (2 for edges; ~6 for point labels)
  - s = max iterations (e.g., 60)
  - n = number of obstacle segments/polygons
- Expected workloads are small; this is acceptable. If needed, add:
  - Early-out bounding box check per obstacle group
  - Spatial binning (uniform grid) to reduce `n` for large drawings (phase 3)

## Error Handling & Logging
- No fallbacks that silently place labels on top of geometry. If no candidate clears within `maxIter`, log with `logger.warn` and place at the last attempted position; callers can choose to retry with larger `offsetPx` or hide label.
- Use `@superbuilders/slog` for structured logs (debug placements, iterations, selected candidate) and follow `@error-handling.mdc` when exposing higher-level APIs.

## Testing Strategy
- Golden tests for known tricky shapes (concave notches, parallel near edges, long labels).
- Randomized tests that assert: no segment–rect intersection for final labels; labels stay inside canvas bounds.
- Property tests for symmetry (mirroring shapes should mirror candidate selection).

## Backwards Compatibility
- Existing `drawText`/`drawWrappedText` unchanged.
- New APIs are opt‑in. Widgets can adopt gradually.

## Risks & Mitigations
- **Unexpected movement**: Keep avoidance opt‑in; document behaviors; expose debug flag to render candidate rays and final rect for inspection.
- **Performance in very dense scenes**: Add group filtering; consider a spatial index if ever needed.
- **Layout oscillation** if text placement also becomes an obstacle: Make label–label avoidance explicit opt‑in to avoid order‑dependent surprises.

## Summary
This is practical and worthwhile to implement in `CanvasImpl`. By centralizing collision-aware placement with a clean, opt‑in API, we deliver consistent, high‑quality labels across widgets, reduce bespoke logic, and keep performance predictable. The initial MVP (lines/polylines/polygons) mirrors the successful approach we just used, and we can expand coverage and polish over time without breaking callers.


