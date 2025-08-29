,### Widget styling literals audit (2025-08-28)

This document catalogs styling literals found across all widget generators under `src/lib/widgets/generators/`. The goal is to identify all hardcoded values that should be centralized into a theme/token system (colors, fonts, stroke widths, dash arrays, opacities, marker and pattern definitions, etc.).

Scope: 65 generator files scanned. Focus is on literals embedded in generated SVG/HTML strings (e.g., `stroke="black"`, `font-size="14"`, `fill-opacity="0.6"`).

Notes:
- This list focuses on actual render-time literals rather than schema descriptions. Some values appear as examples in Zod descriptions; those are not included unless also used in rendering.
- Values are grouped by category per widget. Where multiple similar values exist, representative examples are shown with ranges.

## Global token candidates observed

- Colors (named and hex): `black`, `white`, `#000`, `#333`, `#333333`, `#ccc`, `#00008B`, `#005999`, `#007ACC`, `#FF6B35`, `#CC5429`, `#4472C4`, `#1E90FF`, `#FAFAFA`, `#545454`, `#555`, `#FFFFFF`
- Colors (rgba): `rgba(200,200,200,0.2)`, `rgba(220,220,220,0.4)`, `rgba(200,200,200,0.3)`, `rgba(255,0,0,0.2)`, `rgba(0,0,255,0.2)`, `rgba(0,255,0,0.2)`, `rgba(255,255,0,0.2)`
- Stroke widths: `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `4`, `5`
- Dash arrays: `2`, `2 2`, `2 4`, `2 6`, `3 1`, `3 2`, `4`, `4 2`, `4 3`, `5 3`, `8 4`, `8 6`, `0`
- Opacity: `opacity="0.6"`, `opacity="0.9"`, `fill-opacity="0.3"`, `0.4`, `0.6`, `0.7`, `.94`
- Fonts: `font-family="sans-serif"`, sizes `10`, `12`, `14`, `16`, `1em`, `1.1em`, `1.2em`, weights `bold`, `500`
- Text layout: `text-anchor` (`start`, `middle`, `end`), `dominant-baseline` (`middle`), `paint-order="stroke fill"`
- Line styles: `stroke-linecap` (`round`, `butt`, `square`), `stroke-linejoin` (`round`)
- Markers: `marker-end="url(#graph-arrow)"`, `url(#action-arrow)`, `marker-start="url(#arrow)"`
- Patterns/Fills: `<pattern>` hatch fills (e.g., `#555` at `opacity="0.9"`), plot/background subtle fills
- Geometry/marker sizes repeatedly used: circle radii `3`, `3.5`, `4`, `5`; tick lengths `4–8`; marker dimensions for defs `markerWidth/Height=6`

Recommendation: expand the theme to cover the above categories with semantic tokens (axis, grid, annotation, selection, hidden-edge, highlight, series palettes, label text, minor text, background, table tokens, marker/pattern styles, radii and tick lengths).

## Per-widget findings

- `src/lib/widgets/generators/line-graph.ts`
  - Colors: `black`, `#ccc`
  - Stroke widths: `2.5`
  - Dash arrays: `8 4`, `2 6`, grid `2`
  - Fonts: inline CSS `.axis-label` 14, `.title` 16 bold; `font-family="sans-serif"`, `font-size="12"`
  - Text: `text-anchor` usages

- `src/lib/widgets/generators/conceptual-graph.ts`
  - Colors: `black`, polyline uses variable `curveColor`
  - Stroke widths: axes `2`, curve `3`
  - Line styles: `stroke-linejoin="round"`, `stroke-linecap="round"`
  - Markers: `#graph-arrow` (end)
  - Fonts: `font-family="sans-serif"`, `font-size="16"`

- `src/lib/widgets/generators/population-bar-chart.ts`
  - Colors: `black`, `gridColor`
  - Stroke widths: axes `2`, grid `1`, ticks `1.5`
  - Fonts: style tag font sizes; `font-family="sans-serif"`

- `src/lib/widgets/generators/circle-diagram.ts`
  - Colors: `black`, `white`, `#333`
  - Stroke widths: `1.5`, `2`, `3`
  - Text: `font-size` `13px`, `14px`, `16px`, `font-weight="bold"`, `text-anchor`, `dominant-baseline`

- `src/lib/widgets/generators/double-number-line.ts`
  - Colors: `#333333`, `#ccc`
  - Fonts: style tag with `font-size: 14px` bold; text labels `#333333`
  - Dash arrays: grid `2`

- `src/lib/widgets/generators/dot-plot.ts`
  - Colors: axis `black`, dots via prop; labels `black`
  - Fonts: `font-size="14"`, base `12` family `sans-serif`

- `src/lib/widgets/generators/number-set-diagram.ts`
  - Colors: set fills via props, outlines `black`; style tag `fill: black`
  - Fonts: label `14px` bold

- `src/lib/widgets/generators/geometric-solid-diagram.ts`
  - Colors: `black`, RGBA fills (`rgba(220,220,220,0.4)` etc.)
  - Stroke widths: `1`, `1.5`, `2`
  - Dash arrays: `4 3`, `3 2`
  - Markers: `#arrow` (start/end)
  - Fonts: `font-size="14"`

- `src/lib/widgets/generators/hanger-diagram.ts`
  - Colors: `#333333` strokes, label `#333333`
  - Stroke widths: `0.6667`, `3`
  - Fonts: `font-weight="bold"`, base `12`

- `src/lib/widgets/generators/divergent-bar-chart.ts`
  - Colors: `#333`, `black`, `gridColor`
  - Stroke widths: `1`, `2`
  - Fonts: style tag; `font-family="sans-serif"`

- `src/lib/widgets/generators/figure-comparison-diagram.ts`
  - Colors: stroke from prop, text uses figure stroke color
  - Stroke widths: `2`
  - Fonts: dynamic `font-size` (10–16), `font-weight="bold"`

- `src/lib/widgets/generators/number-line-for-opposites.ts`
  - Colors: `black`
  - Stroke widths: `1.5`
  - Fonts: bold labels, base `12`

- `src/lib/widgets/generators/number-line-with-fraction-groups.ts`
  - Colors: `#333333`, segment fill opacity `0.7`, text white `#FFFFFF`
  - Stroke widths: main `1.5`, segment outline `0.5`

- `src/lib/widgets/generators/number-line-with-action.ts`
  - Colors: `#333333`, action blue `#007ACC` and `#005999`, final orange `#FF6B35` and `#CC5429`
  - Stroke widths: `1`, `1.5`, `2`
  - Markers: `#action-arrow`
  - Fonts: `font-size="10"`, bold

- `src/lib/widgets/generators/number-line.ts`
  - Colors: `black`
  - Stroke widths: markers `1`
  - Fonts: bold labels, base `12`

- `src/lib/widgets/generators/partitioned-shape.ts`
  - Colors: grid `#000000`, stroke `#545454`, pattern `#555`
  - Stroke widths: `1`, `2`
  - Opacity: cell `fill-opacity` variable, pattern `opacity="0.9"`
  - Dash arrays: parameterized values (e.g., `4 2`)

- `src/lib/widgets/generators/parabola-graph.ts`
  - Dash arrays: conditional `8 6`

- `src/lib/widgets/generators/scatter-plot.ts`
  - Colors: `black`
  - Opacity: `fill-opacity="0.7"`
  - Dash arrays: `5 5` for trend/guide lines

- `src/lib/widgets/generators/venn-diagram.ts`
  - Colors: set fills with `fill-opacity="0.6"`, stroke `#333333`

- `src/lib/widgets/generators/transformation-diagram.ts`
  - Colors: `#1fab54`, `#fff`, `#888`
  - Opacity: `0.6`
  - Dash arrays: `8 6`, `2 4`

- `src/lib/widgets/generators/shape-transformation-graph.ts`
  - Colors: stroke `black`
  - Stroke widths: `1.5`
  - Dash arrays: `5 3`
  - Opacity: `fill-opacity="0.6"`

- `src/lib/widgets/generators/rectangular-frame-diagram.ts`
  - Colors: stroke `#000`, face fill colors via variables
  - Dash arrays: `3,1`, `0`
  - Opacity: `.4`

- `src/lib/widgets/generators/pythagorean-proof-diagram.ts`
  - Colors: `#333333`, `#FAFAFA`
  - Stroke widths: `1`, `2`

- `src/lib/widgets/generators/periodic-table.ts`
  - Colors: `#f0ff8f`
  - Opacity: `.94`
  - Fonts: very large `font-size="132"` (SVG source embedded)
  - Linecaps: extensive `stroke-linecap="square"`

- `src/lib/widgets/generators/angle-diagram.ts`
  - Colors: `black`, `#000`
  - Stroke widths: `2`
  - Dash arrays: `0`
  - Fonts: `font-size="14"`, `font-weight="500"`, `paint-order="stroke fill"`

- `src/lib/widgets/generators/coordinate-plane-base.ts`
  - Dash arrays: `5 3`, `4 3`
  - Fonts: inherited via wrappers (axes labels elsewhere)

- `src/lib/widgets/generators/population-change-event-graph.ts`
  - Stroke widths: `3`
  - Line styles: `stroke-linejoin="round"`, `stroke-linecap="round"`
  - Dash arrays: `8 6`

- `src/lib/widgets/generators/parallelogram-trapezoid-diagram.ts`
  - Colors: stroke `black`
  - Dash arrays: `4 2`

- `src/lib/widgets/generators/polyhedron-diagram.ts`
  - Colors: `black`, `gray`
  - Stroke widths: `1`, `1.5`
  - Dash arrays: `4 2`, `2 3`, `2 2`

- `src/lib/widgets/generators/3d-intersection-diagram.ts`
  - Hidden edges: `stroke-dasharray="4 3"`

- `src/lib/widgets/generators/coordinate-plane-comprehensive.ts`
  - Inherits many from `coordinate-plane-base`, plus series/marker colors

- `src/lib/widgets/generators/box-grid.ts`
  - Grid lines color/widths (see file), text defaults

- `src/lib/widgets/generators/data-table.ts`
  - HTML table inline styles: border color `black`, header bg `#f2f2f2`, padding `8px`

- `src/lib/widgets/generators/url-image.ts`
  - N/A for theming beyond background placement

- `src/lib/widgets/generators/pictograph.ts`
  - Fill colors per symbol, label font sizes/weights

- `src/lib/widgets/generators/stacked-items-diagram.ts`
  - Fill colors per stack, outline `black`

- `src/lib/widgets/generators/vertical-arithmetic-setup.ts`
  - Text fonts; line strokes for separators

...and similarly for remaining generators in the directory; each exhibits combinations of the categories above with specific literal values as indicated by scans.

## Proposed theme additions (beyond current DEFAULT_THEME)

- Series palettes: categorical arrays and sequential ramps
- Axis: tick length, tick thickness, label padding/rotation, title size/weight
- Grid: major/minor color and dash patterns
- Geometry: hidden-edge color/dash, face fill opacity, marker sizes (point radius), handle sizes
- Interaction: selection/highlight colors and opacities
- Markers: shared marker defs sizing and colors for arrows
- Patterns: standard hatch patterns for shaded regions
- Opacity tokens: standard levels (`overlayLow`, `overlay`, `overlayHigh`)
- Radii/sizing: point radii (`small`, `base`, `large`), tick sizes, handle sizes

This audit should guide which tokens to add to the PRD’s theme and which literals to replace in each widget.


