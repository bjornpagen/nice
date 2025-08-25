Title: Widgets Requiring Non-Nullable Tick/Category Label Updates

Scope: Enforce non-nullable string contracts for TICK and CATEGORY labels only (exclude axis titles like xAxis/yAxis labels).

Per prd.md, the following generator widgets contain nullable or optional fields that represent tick or category labels and must be updated to require non-nullable strings (use empty string "" for hidden labels). Each entry lists the file and the specific schema fields to change.

Must update

- src/lib/widgets/generators/bar-chart.ts
  - BarDataSchema.label: string | null -> string (non-nullable)

- src/lib/widgets/generators/fraction-number-line.ts
  - Tick.topLabel: string | null -> string (non-nullable)
  - Tick.bottomLabel: string | null -> string (non-nullable)

- src/lib/widgets/generators/number-line.ts
  - SpecialTick.label: string | null -> string (non-nullable)

- src/lib/widgets/generators/number-line-with-fraction-groups.ts
  - Tick.label: string | null -> string (non-nullable)

Verified no changes needed (already non-nullable or not tick/category labels)

- src/lib/widgets/generators/horizontal-bar-chart.ts
  - Category labels required: BarDataSchema.category: z.string().min(1)
- src/lib/widgets/generators/population-bar-chart.ts
  - Bar category labels required: PopulationBarDataPointSchema.label: z.string().min(1)
- src/lib/widgets/generators/divergent-bar-chart.ts
  - Bar category labels required: DataPointSchema.category: z.string().min(1)
- src/lib/widgets/generators/pi-chart.ts
  - Slice labels required: SliceSchema.label: z.string().min(1)
- src/lib/widgets/generators/line-graph.ts
  - xAxis.categories: z.array(z.string().min(1))
- src/lib/widgets/generators/histogram.ts
  - X ticks derive from numeric separators
- src/lib/widgets/generators/dot-plot.ts
  - Numeric ticks; axis label nullability is out of scope
- src/lib/widgets/generators/area-graph.ts
  - yAxis.tickFormat nullability is a suffix, not a tick/category label
- src/lib/widgets/generators/coordinate-plane-base.ts, coordinate-plane-comprehensive.ts, point-plot-graph.ts
  - Numeric ticks only; point/polygon labels are not tick/category labels per PRD
- src/lib/widgets/generators/venn-diagram.ts
  - Circle category labels already required strings
- src/lib/widgets/generators/box-plot.ts
  - Numeric ticks only; axis label nullability out of scope
- src/lib/widgets/generators/keeling-curve.ts, conceptual-graph.ts, population-change-event-graph.ts
  - Numeric ticks only; no nullable tick/category labels
- src/lib/widgets/generators/double-number-line.ts, inequality-number-line.ts, absolute-value-number-line.ts
  - Numeric ticks only; or string/number tick arrays without nullables

Out of scope (nullable fields unrelated to tick/category labels)

- url-image.ts (width/height/caption/attribution), data-table.ts (title/footer), periodic-table.ts (caption), and various diagram "label" fields (e.g., triangle, transformation, tape, tree, ratio, hanger, etc.). These are not tick/category labels.

Implementation reminder

- Replace .nullable() and any transforms converting "null"/"" to null for the listed fields.
- Require plain z.string(); rendering should treat empty string "" as hidden label where needed.
