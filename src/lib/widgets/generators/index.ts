import { z } from "zod"

// Import all individual schemas and generators
import { generateThreeDIntersectionDiagram, ThreeDIntersectionDiagramPropsSchema } from "./3d-intersection-diagram"
import { AbsoluteValueNumberLinePropsSchema, generateAbsoluteValueNumberLine } from "./absolute-value-number-line"
import { AngleDiagramPropsSchema, generateAngleDiagram } from "./angle-diagram"
import { BarChartPropsSchema, generateBarChart } from "./bar-chart"
import { BoxPlotPropsSchema, generateBoxPlot } from "./box-plot"
import { CircleDiagramPropsSchema, generateCircleDiagram } from "./circle-diagram"
import { CompositeShapeDiagramPropsSchema, generateCompositeShapeDiagram } from "./composite-shape-diagram"
import { CoordinatePlanePropsSchema, generateCoordinatePlane } from "./coordinate-plane"
import { DataTablePropsSchema, generateDataTable } from "./data-table"
import {
	DiscreteObjectRatioDiagramPropsSchema,
	generateDiscreteObjectRatioDiagram
} from "./discrete-object-ratio-diagram"
import { DotPlotPropsSchema, generateDotPlot } from "./dot-plot"
import { DoubleNumberLinePropsSchema, generateDoubleNumberLine } from "./double-number-line"
import { EmojiImagePropsSchema, generateEmojiImage } from "./emoji-image"
import { FractionNumberLinePropsSchema, generateFractionNumberLine } from "./fraction-number-line"
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
import { generateProbabilitySpinner, ProbabilitySpinnerPropsSchema } from "./probability-spinner"
import { generatePythagoreanProofDiagram, PythagoreanProofDiagramPropsSchema } from "./pythagorean-proof-diagram"
import { generateRatioBoxDiagram, RatioBoxDiagramPropsSchema } from "./ratio-box-diagram"
import { generateScatterPlot, ScatterPlotPropsSchema } from "./scatter-plot"
import { generateStackedItemsDiagram, StackedItemsDiagramPropsSchema } from "./stacked-items-diagram"
import { generateTapeDiagram, TapeDiagramPropsSchema } from "./tape-diagram"
import { generateUnitBlockDiagram, UnitBlockDiagramPropsSchema } from "./unit-block-diagram"
import { generateVennDiagram, VennDiagramPropsSchema } from "./venn-diagram"
import { generateVerticalArithmeticSetup, VerticalArithmeticSetupPropsSchema } from "./vertical-arithmetic-setup"

// The `type` field is now included in the base schemas, so we remove .extend()
export const typedSchemas = {
	"3dIntersectionDiagram": ThreeDIntersectionDiagramPropsSchema,
	absoluteValueNumberLine: AbsoluteValueNumberLinePropsSchema,
	angleDiagram: AngleDiagramPropsSchema,
	barChart: BarChartPropsSchema,
	boxPlot: BoxPlotPropsSchema,
	circleDiagram: CircleDiagramPropsSchema,
	compositeShapeDiagram: CompositeShapeDiagramPropsSchema,
	coordinatePlane: CoordinatePlanePropsSchema,
	dataTable: DataTablePropsSchema,
	discreteObjectRatioDiagram: DiscreteObjectRatioDiagramPropsSchema,
	dotPlot: DotPlotPropsSchema,
	doubleNumberLine: DoubleNumberLinePropsSchema,
	emojiImage: EmojiImagePropsSchema,
	fractionNumberLine: FractionNumberLinePropsSchema,
	geometricSolidDiagram: GeometricSolidDiagramPropsSchema,
	hangerDiagram: HangerDiagramPropsSchema,
	histogram: HistogramPropsSchema,
	inequalityNumberLine: InequalityNumberLinePropsSchema,
	numberLine: NumberLinePropsSchema,
	numberLineForOpposites: NumberLineForOppositesPropsSchema,
	numberLineWithAction: NumberLineWithActionPropsSchema,
	numberLineWithFractionGroups: NumberLineWithFractionGroupsPropsSchema,
	numberSetDiagram: NumberSetDiagramPropsSchema,
	parallelLinesTransversal: ParallelLinesTransversalPropsSchema,
	partitionedShape: PartitionedShapePropsSchema,
	pictograph: PictographPropsSchema,
	polyhedronDiagram: PolyhedronDiagramPropsSchema,
	probabilitySpinner: ProbabilitySpinnerPropsSchema,
	polyhedronNetDiagram: PolyhedronNetDiagramPropsSchema,
	pythagoreanProofDiagram: PythagoreanProofDiagramPropsSchema,
	ratioBoxDiagram: RatioBoxDiagramPropsSchema,
	scatterPlot: ScatterPlotPropsSchema,
	stackedItemsDiagram: StackedItemsDiagramPropsSchema,
	tapeDiagram: TapeDiagramPropsSchema,
	unitBlockDiagram: UnitBlockDiagramPropsSchema,
	vennDiagram: VennDiagramPropsSchema,
	verticalArithmeticSetup: VerticalArithmeticSetupPropsSchema
}

// Create the discriminated union schema from the schemas (each now contains its type field)
export const WidgetSchema = z.discriminatedUnion("type", [
	typedSchemas["3dIntersectionDiagram"],
	typedSchemas.absoluteValueNumberLine,
	typedSchemas.angleDiagram,
	typedSchemas.barChart,
	typedSchemas.boxPlot,
	typedSchemas.circleDiagram,
	typedSchemas.compositeShapeDiagram,
	typedSchemas.coordinatePlane,
	typedSchemas.dataTable,
	typedSchemas.discreteObjectRatioDiagram,
	typedSchemas.dotPlot,
	typedSchemas.doubleNumberLine,
	typedSchemas.emojiImage,
	typedSchemas.fractionNumberLine,
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
	typedSchemas.probabilitySpinner,
	typedSchemas.polyhedronNetDiagram,
	typedSchemas.pythagoreanProofDiagram,
	typedSchemas.ratioBoxDiagram,
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
	generateThreeDIntersectionDiagram,
	generateAbsoluteValueNumberLine,
	generateAngleDiagram,
	generateBarChart,
	generateBoxPlot,
	generateCircleDiagram,
	generateCompositeShapeDiagram,
	generateCoordinatePlane,
	generateDataTable,
	generateDiscreteObjectRatioDiagram,
	generateDotPlot,
	generateDoubleNumberLine,
	generateEmojiImage,
	generateFractionNumberLine,
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
	generateProbabilitySpinner,
	generatePolyhedronNetDiagram,
	generatePythagoreanProofDiagram,
	generateRatioBoxDiagram,
	generateScatterPlot,
	generateStackedItemsDiagram,
	generateTapeDiagram,
	generateUnitBlockDiagram,
	generateVennDiagram,
	generateVerticalArithmeticSetup
}
