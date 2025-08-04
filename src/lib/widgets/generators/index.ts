import { z } from "zod"

// Import all individual schemas and generators
import { AbsoluteValueNumberLinePropsSchema, generateAbsoluteValueNumberLine } from "./absolute-value-number-line"
import { BarChartPropsSchema, generateBarChart } from "./bar-chart"
import { BoxPlotPropsSchema, generateBoxPlot } from "./box-plot"
import { CompositeShapeDiagramPropsSchema, generateCompositeShapeDiagram } from "./composite-shape-diagram"
import { CoordinatePlanePropsSchema, generateCoordinatePlane } from "./coordinate-plane"
import { DataTablePropsSchema, generateDataTable } from "./data-table"
import {
	DiscreteObjectRatioDiagramPropsSchema,
	generateDiscreteObjectRatioDiagram
} from "./discrete-object-ratio-diagram"
import { DotPlotPropsSchema, generateDotPlot } from "./dot-plot"
import { DoubleNumberLinePropsSchema, generateDoubleNumberLine } from "./double-number-line"
import { GeometricSolidDiagramPropsSchema, generateGeometricSolidDiagram } from "./geometric-solid-diagram"
import { generateHangerDiagram, HangerDiagramPropsSchema } from "./hanger-diagram"
import { generateHistogram, HistogramPropsSchema } from "./histogram"
import { generateInequalityNumberLine, InequalityNumberLinePropsSchema } from "./inequality-number-line"
import { generateNumberLine, NumberLinePropsSchema } from "./number-line"
import { generateNumberLineForOpposites, NumberLineForOppositesPropsSchema } from "./number-line-for-opposites"
import { generateNumberLineWithAction, NumberLineWithActionPropsSchema } from "./number-line-with-action"
import {
	generateNumberLineWithFractionGroups,
	NumberLineWithFractionGroupsPropsSchema
} from "./number-line-with-fraction-groups"
import { generateNumberSetDiagram, NumberSetDiagramPropsSchema } from "./number-set-diagram"
import { generateParallelLinesTransversal, ParallelLinesTransversalPropsSchema } from "./parallel-lines-transversal"
import { generatePartitionedShape, PartitionedShapePropsSchema } from "./partitioned-shape"
import { generatePictograph, PictographPropsSchema } from "./pictograph"
import { generatePolyhedronDiagram, PolyhedronDiagramPropsSchema } from "./polyhedron-diagram"
import { generatePolyhedronNetDiagram, PolyhedronNetDiagramPropsSchema } from "./polyhedron-net-diagram"
import { generatePythagoreanProofDiagram, PythagoreanProofDiagramPropsSchema } from "./pythagorean-proof-diagram"
import { generateScatterPlot, ScatterPlotPropsSchema } from "./scatter-plot"
import { generateStackedItemsDiagram, StackedItemsDiagramPropsSchema } from "./stacked-items-diagram"
import { generateTapeDiagram, TapeDiagramPropsSchema } from "./tape-diagram"
import { generateUnitBlockDiagram, UnitBlockDiagramPropsSchema } from "./unit-block-diagram"
import { generateVennDiagram, VennDiagramPropsSchema } from "./venn-diagram"
import { generateVerticalArithmeticSetup, VerticalArithmeticSetupPropsSchema } from "./vertical-arithmetic-setup"

// Extend each schema with a unique `type` literal for the discriminated union
export const typedSchemas = {
	absoluteValueNumberLine: AbsoluteValueNumberLinePropsSchema.extend({ type: z.literal("absoluteValueNumberLine") }),
	barChart: BarChartPropsSchema.extend({ type: z.literal("barChart") }),
	boxPlot: BoxPlotPropsSchema.extend({ type: z.literal("boxPlot") }),
	compositeShapeDiagram: CompositeShapeDiagramPropsSchema.extend({ type: z.literal("compositeShapeDiagram") }),
	coordinatePlane: CoordinatePlanePropsSchema.extend({ type: z.literal("coordinatePlane") }),
	dataTable: DataTablePropsSchema.extend({ type: z.literal("dataTable") }),
	discreteObjectRatioDiagram: DiscreteObjectRatioDiagramPropsSchema.extend({
		type: z.literal("discreteObjectRatioDiagram")
	}),
	dotPlot: DotPlotPropsSchema.extend({ type: z.literal("dotPlot") }),
	doubleNumberLine: DoubleNumberLinePropsSchema.extend({ type: z.literal("doubleNumberLine") }),
	geometricSolidDiagram: GeometricSolidDiagramPropsSchema.extend({ type: z.literal("geometricSolidDiagram") }),
	hangerDiagram: HangerDiagramPropsSchema.extend({ type: z.literal("hangerDiagram") }),
	histogram: HistogramPropsSchema.extend({ type: z.literal("histogram") }),
	inequalityNumberLine: InequalityNumberLinePropsSchema.extend({ type: z.literal("inequalityNumberLine") }),
	numberLine: NumberLinePropsSchema.extend({ type: z.literal("numberLine") }),
	numberLineForOpposites: NumberLineForOppositesPropsSchema.extend({ type: z.literal("numberLineForOpposites") }),
	numberLineWithAction: NumberLineWithActionPropsSchema.extend({ type: z.literal("numberLineWithAction") }),
	numberLineWithFractionGroups: NumberLineWithFractionGroupsPropsSchema.extend({
		type: z.literal("numberLineWithFractionGroups")
	}),
	numberSetDiagram: NumberSetDiagramPropsSchema.extend({ type: z.literal("numberSetDiagram") }),
	parallelLinesTransversal: ParallelLinesTransversalPropsSchema.extend({ type: z.literal("parallelLinesTransversal") }),
	partitionedShape: PartitionedShapePropsSchema.extend({ type: z.literal("partitionedShape") }),
	pictograph: PictographPropsSchema.extend({ type: z.literal("pictograph") }),
	polyhedronDiagram: PolyhedronDiagramPropsSchema.extend({ type: z.literal("polyhedronDiagram") }),
	polyhedronNetDiagram: PolyhedronNetDiagramPropsSchema.extend({ type: z.literal("polyhedronNetDiagram") }),
	pythagoreanProofDiagram: PythagoreanProofDiagramPropsSchema.extend({ type: z.literal("pythagoreanProofDiagram") }),
	scatterPlot: ScatterPlotPropsSchema.extend({ type: z.literal("scatterPlot") }),
	stackedItemsDiagram: StackedItemsDiagramPropsSchema.extend({ type: z.literal("stackedItemsDiagram") }),
	tapeDiagram: TapeDiagramPropsSchema.extend({ type: z.literal("tapeDiagram") }),
	unitBlockDiagram: UnitBlockDiagramPropsSchema.extend({ type: z.literal("unitBlockDiagram") }),
	vennDiagram: VennDiagramPropsSchema.extend({ type: z.literal("vennDiagram") }),
	verticalArithmeticSetup: VerticalArithmeticSetupPropsSchema.extend({ type: z.literal("verticalArithmeticSetup") })
}

// Create the discriminated union schema from the extended schemas
export const WidgetSchema = z.discriminatedUnion("type", [
	typedSchemas.absoluteValueNumberLine,
	typedSchemas.barChart,
	typedSchemas.boxPlot,
	typedSchemas.compositeShapeDiagram,
	typedSchemas.coordinatePlane,
	typedSchemas.dataTable,
	typedSchemas.discreteObjectRatioDiagram,
	typedSchemas.dotPlot,
	typedSchemas.doubleNumberLine,
	typedSchemas.geometricSolidDiagram,
	typedSchemas.hangerDiagram,
	typedSchemas.histogram,
	typedSchemas.inequalityNumberLine,
	typedSchemas.numberLine,
	typedSchemas.numberLineForOpposites,
	typedSchemas.numberLineWithAction,
	typedSchemas.numberLineWithFractionGroups,
	typedSchemas.numberSetDiagram,
	typedSchemas.parallelLinesTransversal,
	typedSchemas.partitionedShape,
	typedSchemas.pictograph,
	typedSchemas.polyhedronDiagram,
	typedSchemas.polyhedronNetDiagram,
	typedSchemas.pythagoreanProofDiagram,
	typedSchemas.scatterPlot,
	typedSchemas.stackedItemsDiagram,
	typedSchemas.tapeDiagram,
	typedSchemas.unitBlockDiagram,
	typedSchemas.vennDiagram,
	typedSchemas.verticalArithmeticSetup
])
export type Widget = z.infer<typeof WidgetSchema>
export type WidgetInput = z.input<typeof WidgetSchema>

// Export the individual generators for direct use
export {
	generateAbsoluteValueNumberLine,
	generateBarChart,
	generateBoxPlot,
	generateCompositeShapeDiagram,
	generateCoordinatePlane,
	generateDataTable,
	generateDiscreteObjectRatioDiagram,
	generateDotPlot,
	generateDoubleNumberLine,
	generateGeometricSolidDiagram,
	generateHangerDiagram,
	generateHistogram,
	generateInequalityNumberLine,
	generateNumberLine,
	generateNumberLineForOpposites,
	generateNumberLineWithAction,
	generateNumberLineWithFractionGroups,
	generateNumberSetDiagram,
	generateParallelLinesTransversal,
	generatePartitionedShape,
	generatePictograph,
	generatePolyhedronDiagram,
	generatePolyhedronNetDiagram,
	generatePythagoreanProofDiagram,
	generateScatterPlot,
	generateStackedItemsDiagram,
	generateTapeDiagram,
	generateUnitBlockDiagram,
	generateVennDiagram,
	generateVerticalArithmeticSetup
}
