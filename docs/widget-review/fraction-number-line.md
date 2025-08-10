### fraction-number-line — Manual Widget Review

Principles: require `width`/`height`; minimize nullables; no `.default()`, no `.refine()`; avoid array min/max.

Scope
- File: `src/lib/widgets/generators/fraction-number-line.ts`
- Purpose: number line with fractional ticks, colored segments, and optional cell model bar

Current pain points
- Nullable size causes fallbacks.
- Optional `segments` and `model` add branching.

Proposed API (no feature loss, fewer nullables)
- Require `width`, `height`.
- Use empty arrays for `segments`; `model` provided fully or omitted.

Schema sketch
```ts
const Tick = z.object({ 
  value: z.number().describe("The numerical position of this tick mark on the number line (e.g., 0, 0.5, 1.5, 2.25, -0.75). Must be between min and max."), 
  topLabel: z.string().describe("Label displayed above the tick mark (e.g., '0', '1/2', '1 1/2', '2.25', ''). Empty string shows no top label. Often shows fractions."), 
  bottomLabel: z.string().describe("Label displayed below the tick mark (e.g., '0', '2/4', '6/4', ''). Empty string shows no bottom label. Often shows equivalent fractions."), 
  isMajor: z.boolean().describe("Whether this is a major tick (taller line) or minor tick (shorter line). Major ticks typically mark whole numbers or key fractions.") 
}).strict()

const Segment = z.object({ 
  start: z.number().describe("Starting position of the colored segment on the number line (e.g., 0, 0.5, 1). Must be >= min and <= end."), 
  end: z.number().describe("Ending position of the colored segment on the number line (e.g., 1, 1.5, 2.75). Must be <= max and >= start."), 
  color: z.string().describe("CSS fill color for this segment (e.g., '#FFE5B4' for peach, 'rgba(0,255,0,0.5)' for translucent green, 'lightblue'). Creates visual groupings.") 
}).strict()

const ModelCellGroup = z.object({ 
  count: z.number().int().describe("Number of consecutive cells in this group (e.g., 3, 5, 1). Must be positive. Sum of all counts equals totalCells."), 
  color: z.string().describe("CSS fill color for cells in this group (e.g., '#FF6B6B' for red, 'lightgreen', 'rgba(0,0,255,0.7)'). Differentiates cell groups visually.") 
}).strict()

const Model = z.object({ 
  totalCells: z.number().int().describe("Total number of cells in the visual bar model (e.g., 8 for eighths, 10 for tenths, 12 for twelfths). Determines cell width."), 
  cellGroups: z.array(ModelCellGroup).describe("Groups of colored cells shown in order left to right. Sum of all group counts must equal totalCells. Can show part-whole relationships."), 
  bracketLabel: z.string().describe("Label for the bracket spanning the entire model (e.g., '1 whole', '2 units', '24 hours'). Indicates what the full bar represents.") 
}).strict()

export const FractionNumberLinePropsSchema = z.object({
  type: z.literal('fractionNumberLine').describe("Identifies this as a fraction number line widget with optional visual models."),
  width: z.number().positive().describe("Total width of the number line in pixels (e.g., 600, 700, 800). Must accommodate all labels and optional model bar."),
  height: z.number().positive().describe("Total height of the widget in pixels (e.g., 150, 200, 250). Includes number line, labels, segments, and optional model."),
  min: z.number().describe("Minimum value shown on the number line (e.g., 0, -1, -2.5). Must be less than max. Left endpoint of the line."),
  max: z.number().describe("Maximum value shown on the number line (e.g., 3, 5, 10.5). Must be greater than min. Right endpoint of the line."),
  ticks: z.array(Tick).describe("All tick marks to display with their labels. Order doesn't matter. Can show fractions, decimals, or mixed numbers. Empty array shows no ticks."),
  segments: z.array(Segment).describe("Colored horizontal bars above the number line highlighting ranges. Empty array shows no segments. Useful for showing intervals or equivalent lengths."),
  model: Model.describe("Optional visual bar divided into cells below the number line. Shows part-whole relationships and fraction concepts. Cells align with the number line scale."),
}).strict().describe("Creates a number line optimized for fraction instruction with customizable tick marks, colored segments, and an optional cell-based visual model. Supports showing equivalent fractions, mixed numbers, and part-whole relationships. The model bar helps visualize fractions as parts of a whole.")```

Why this helps
- Removes ambiguous defaults; rendering is consistent and predictable.

Generator guidance
- Render segments/model only when arrays/objects are present (non-empty arrays indicate intent).


