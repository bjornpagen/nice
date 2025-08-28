## Chart Styling Unification Proposal

Last updated: 2025-08-28

This document proposes a unified, enforceable styling contract for all SVG-based chart widgets. The goal is to eliminate cross-widget inconsistencies (font sizes, weights, paddings, class names, and layout defaults) that lead to visual drift and hard-to-diagnose spacing issues.

### Problems Observed

- Divergent root font sizes per widget (12/14/16), creating inconsistent effective sizes for `em`-based rules.
- Inconsistent `.axis-label` rules (some bold, some not; some `px`, some `em`).
- Mixed usage of plain `<text>` vs `class="axis-label"` for axis titles.
- Ad-hoc paddings passed to layout helpers, especially for X-axis (`calculateXAxisLayout(false, 40)` in some widgets).
- Per-widget `<style>` blocks redefine the same classes differently.

### Scope and Non-Goals

- Scope: Typography, axis label classes, tick label classes, root font-size, and spacing defaults for chart widgets.
- Non-goals: Redesigning color palettes, changing data rendering semantics, or altering domain-specific annotations.

### Unified Styling Contract

1) Root SVG font
- Always set: `font-family="sans-serif"` and `font-size="14"` on the root `<svg>`.
- Rationale: 14 provides readable ticks and labels while avoiding crowding.

2) Standard classes and meanings
- `.title`: chart title
  - `font-size: 18px; font-weight: bold; text-anchor: middle;`
- `.axis-label`: x/y axis titles (left, right, bottom)
  - `font-size: 16px; font-weight: 600; text-anchor: middle;`
  - Rationale: slightly heavier than ticks; visually distinct but not as strong as title.
- `.tick-label`: axis tick labels
  - `font-size: 12px; font-weight: 400;`
  - Use `text-anchor: end|middle|start` inline as needed per tick alignment.
- Optional, domain-specific classes may exist (e.g., `.annotation-label`, `.area-label`) but must not override the above three.

3) Units policy
- Prefer `px` everywhere for text sizing to avoid root `em` drift.
- Avoid `em` for axis/title/ticks to keep sizing predictable across widgets.

4) Required usage
- All axis titles MUST use `class="axis-label"` (no plain `<text>` for axis titles).
- All tick labels should be emitted with `class="tick-label"`.
- All titles must use `class="title"`.
- Do not inline `font-weight`/`font-size` for these three unless a specific widget has a justified exception (documented).

5) Central style injection pattern
- Each chart should include a minimal, standardized style block, identical across widgets:
  ```html
  <style>
    .title { font-size: 18px; font-weight: bold; text-anchor: middle; }
    .axis-label { font-size: 16px; font-weight: 600; text-anchor: middle; }
    .tick-label { font-size: 12px; font-weight: 400; }
  </style>
  ```
- Widgets may append additional classes below this block, but must not redefine `.title`, `.axis-label`, or `.tick-label`.

6) Layout defaults
- X-axis: `calculateXAxisLayout(hasTickLabels: boolean, titlePadding: number = 25)`
  - Default: `hasTickLabels = true`, `titlePadding = 25`.
  - For charts without X ticks, use `calculateXAxisLayout(false, 25)` unless there is a strict visual requirement.
- Left Y-axis: `calculateYAxisLayoutAxisAware(...)`
  - Defaults (as of this doc): `tickLength = 5`, `labelPadding = 8`, `titlePadding = 12`, `axisTitleFontPx = 16`.
  - Do not pass custom paddings in generators unless a test or mock requires it; prefer defaults.
- Right Y-axis: `calculateRightYAxisLayout(..., titlePadding = 20)` stays as-is until right-axis rotation/spacing is unified (future work).

7) Rotation-aware extents
- Continue to use `includeRotatedYAxisLabel` for rotated Y-axis titles (no-op for horizontal extents) to prevent viewBox bloat.
- Never call `includeText` for rotated Y-axis titles.

8) Snapshot stability
- All widgets should render the same structural class names and the same style block to reduce snapshot churn.
- Root `viewBox` should be governed by common layout helpers and `computeDynamicWidth`.

### Migration Plan

Phase 1: Typographic unification (low risk)
- Add the standard style block to all chart widgets.
- Replace any inline axis-title `<text>` with `class="axis-label"`.
- Ensure titles use `.title` and ticks use `.tick-label`.
- Convert any `em` sizing to `px` in axis/tick/title styles.

Phase 2: Layout input normalization (medium risk)
- Remove ad-hoc X-axis paddings and use `calculateXAxisLayout` defaults.
- Stop passing custom Y-axis `labelPadding`/`titlePadding` from generators unless justified; rely on defaults in `layout.ts`.

Phase 3: Linting/CI guardrails (medium risk)
- Add a grit rule to forbid redefining `.title`, `.axis-label`, `.tick-label` in widget style blocks.
- Add a rule to require these classes for titles/axis/ticks.
- Optional: introduce a shared style fragment helper to inject the standard block.

### Exceptions and Special Cases

- Some educational diagrams (non-chart widgets) may have domain-specific labels; they should not redefine the three core classes but can add new ones.
- Horizontal bar charts and population charts that use `em` must switch to `px` for the three core classes; they may keep `em` for auxiliary labels.

### Risks

- Snapshot changes across many widgets (expected and desired) — plan one batch update.
- Some tight layouts may require minor per-widget `titlePadding` tweaks; prefer adjusting defaults centrally first.

### Acceptance Criteria

- All chart widgets:
  - Root SVG `font-size="14"`.
  - Include the standard style block.
  - Use `.title`, `.axis-label`, `.tick-label` correctly.
  - No `em` units for the three core classes.
  - Do not pass custom paddings to Y-axis helper unless documented.

### Follow-ups

- Consider a central utility to render the standard style block to avoid duplication.
- Evaluate unifying right-axis spacing similar to left-axis once rotation logic is introduced for right titles.


