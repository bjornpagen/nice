import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { generatePeriodicTable, PeriodicTableWidgetPropsSchema } from "@/lib/widgets/generators/periodic-table"
// Import all individual schemas and generators
import { generateThreeDIntersectionDiagram, ThreeDIntersectionDiagramPropsSchema } from "./3d-intersection-diagram"
import { AbsoluteValueNumberLinePropsSchema, generateAbsoluteValueNumberLine } from "./absolute-value-number-line"
import { AngleDiagramPropsSchema, generateAngleDiagram } from "./angle-diagram"
import { BarChartPropsSchema, generateBarChart } from "./bar-chart"
import { BoxGridPropsSchema, generateBoxGrid } from "./box-grid"
import { BoxPlotPropsSchema, generateBoxPlot } from "./box-plot"
import { CircleDiagramPropsSchema, generateCircleDiagram } from "./circle-diagram"
import { CompositeShapeDiagramPropsSchema, generateCompositeShapeDiagram } from "./composite-shape-diagram"
import {
	CoordinatePlaneComprehensivePropsSchema,
	generateCoordinatePlaneComprehensive
} from "./coordinate-plane-comprehensive"
import { DataTablePropsSchema, generateDataTable } from "./data-table"
import {
	DiscreteObjectRatioDiagramPropsSchema,
	generateDiscreteObjectRatioDiagram
} from "./discrete-object-ratio-diagram"
import { DistanceFormulaGraphPropsSchema, generateDistanceFormulaGraph } from "./distance-formula-graph"
import { DotPlotPropsSchema, generateDotPlot } from "./dot-plot"
import { DoubleNumberLinePropsSchema, generateDoubleNumberLine } from "./double-number-line"
import { EmojiImagePropsSchema, generateEmojiImage } from "./emoji-image"
import { FigureComparisonDiagramPropsSchema, generateFigureComparisonDiagram } from "./figure-comparison-diagram"
import { FractionNumberLinePropsSchema, generateFractionNumberLine } from "./fraction-number-line"
import { FunctionPlotGraphPropsSchema, generateFunctionPlotGraph } from "./function-plot-graph"
import { GeometricSolidDiagramPropsSchema, generateGeometricSolidDiagram } from "./geometric-solid-diagram"
import { generateHangerDiagram, HangerDiagramPropsSchema } from "./hanger-diagram"
import { generateHistogram, HistogramPropsSchema } from "./histogram"
import { generateInequalityNumberLine, InequalityNumberLinePropsSchema } from "./inequality-number-line"
import { generateLineEquationGraph, LineEquationGraphPropsSchema } from "./line-equation-graph"
import { generateNumberLine, NumberLinePropsSchema } from "./number-line"
import { generateNumberLineForOpposites, NumberLineForOppositesPropsSchema } from "./number-line-for-opposites"
import { generateNumberLineWithAction, NumberLineWithActionPropsSchema } from "./number-line-with-action"
import {
	generateNumberLineWithFractionGroups,
	NumberLineWithFractionGroupsPropsSchema
} from "./number-line-with-fraction-groups"
import { generateNumberSetDiagram, NumberSetDiagramPropsSchema } from "./number-set-diagram"
import {
	generateParallelogramTrapezoidDiagram,
	ParallelogramTrapezoidDiagramPropsSchema
} from "./parallelogram-trapezoid-diagram"
import { generatePartitionedShape, PartitionedShapePropsSchema } from "./partitioned-shape"
import {
	generatePentagonIntersectionDiagram,
	PentagonIntersectionDiagramPropsSchema
} from "./pentagon-intersection-diagram"
import { generatePictograph, PictographPropsSchema } from "./pictograph"
import { generatePointPlotGraph, PointPlotGraphPropsSchema } from "./point-plot-graph"
import { generatePolygonGraph, PolygonGraphPropsSchema } from "./polygon-graph"
import { generatePolyhedronDiagram, PolyhedronDiagramPropsSchema } from "./polyhedron-diagram"
import { generatePolyhedronNetDiagram, PolyhedronNetDiagramPropsSchema } from "./polyhedron-net-diagram"
import { generateProbabilitySpinner, ProbabilitySpinnerPropsSchema } from "./probability-spinner"
import { generatePythagoreanProofDiagram, PythagoreanProofDiagramPropsSchema } from "./pythagorean-proof-diagram"
import { generateRatioBoxDiagram, RatioBoxDiagramPropsSchema } from "./ratio-box-diagram"
import { generateRectangularFrameDiagram, RectangularFrameDiagramPropsSchema } from "./rectangular-frame-diagram"
import { generateScaleCopiesSlider, ScaleCopiesSliderPropsSchema } from "./scale-copies-slider"
import { generateScatterPlot, ScatterPlotPropsSchema } from "./scatter-plot"
import { generateShapeTransformationGraph, ShapeTransformationGraphPropsSchema } from "./shape-transformation-graph"
import { generateStackedItemsDiagram, StackedItemsDiagramPropsSchema } from "./stacked-items-diagram"
import { generateTapeDiagram, TapeDiagramPropsSchema } from "./tape-diagram"
import { generateTransformationDiagram, TransformationDiagramPropsSchema } from "./transformation-diagram"
import { generateTreeDiagram, TreeDiagramPropsSchema } from "./tree-diagram"
import { generateTriangleDiagram, TriangleDiagramPropsSchema } from "./triangle-diagram"
import { generateUnitBlockDiagram, UnitBlockDiagramPropsSchema } from "./unit-block-diagram"
import { generateUrlImage, UrlImageWidgetPropsSchema } from "./url-image"
import { generateVennDiagram, VennDiagramPropsSchema } from "./venn-diagram"
import { generateVerticalArithmeticSetup, VerticalArithmeticSetupPropsSchema } from "./vertical-arithmetic-setup"

// This object now contains every widget schema from every collection.
// It serves as a master lookup for dynamic schema generation and compilation.
export const allWidgetSchemas = {
	threeDIntersectionDiagram: ThreeDIntersectionDiagramPropsSchema,
	absoluteValueNumberLine: AbsoluteValueNumberLinePropsSchema,
	angleDiagram: AngleDiagramPropsSchema,
	barChart: BarChartPropsSchema,
	boxGrid: BoxGridPropsSchema,
	boxPlot: BoxPlotPropsSchema,
	circleDiagram: CircleDiagramPropsSchema,
	compositeShapeDiagram: CompositeShapeDiagramPropsSchema,
	coordinatePlane: CoordinatePlaneComprehensivePropsSchema,
	distanceFormulaGraph: DistanceFormulaGraphPropsSchema,
	functionPlotGraph: FunctionPlotGraphPropsSchema,
	lineEquationGraph: LineEquationGraphPropsSchema,
	pointPlotGraph: PointPlotGraphPropsSchema,
	polygonGraph: PolygonGraphPropsSchema,
	shapeTransformationGraph: ShapeTransformationGraphPropsSchema,
	dataTable: DataTablePropsSchema,
	discreteObjectRatioDiagram: DiscreteObjectRatioDiagramPropsSchema,
	dotPlot: DotPlotPropsSchema,
	doubleNumberLine: DoubleNumberLinePropsSchema,
	emojiImage: EmojiImagePropsSchema,
	figureComparisonDiagram: FigureComparisonDiagramPropsSchema,
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
	partitionedShape: PartitionedShapePropsSchema,
	pentagonIntersectionDiagram: PentagonIntersectionDiagramPropsSchema,
	pictograph: PictographPropsSchema,
	polyhedronDiagram: PolyhedronDiagramPropsSchema,
	probabilitySpinner: ProbabilitySpinnerPropsSchema,
	polyhedronNetDiagram: PolyhedronNetDiagramPropsSchema,
	pythagoreanProofDiagram: PythagoreanProofDiagramPropsSchema,
	ratioBoxDiagram: RatioBoxDiagramPropsSchema,
	rectangularFrameDiagram: RectangularFrameDiagramPropsSchema,
	scaleCopiesSlider: ScaleCopiesSliderPropsSchema,
	scatterPlot: ScatterPlotPropsSchema,
	stackedItemsDiagram: StackedItemsDiagramPropsSchema,
	tapeDiagram: TapeDiagramPropsSchema,
	transformationDiagram: TransformationDiagramPropsSchema,
	treeDiagram: TreeDiagramPropsSchema,
	triangleDiagram: TriangleDiagramPropsSchema,
	unitBlockDiagram: UnitBlockDiagramPropsSchema,
	periodicTable: PeriodicTableWidgetPropsSchema,
	urlImage: UrlImageWidgetPropsSchema,
	vennDiagram: VennDiagramPropsSchema,
	verticalArithmeticSetup: VerticalArithmeticSetupPropsSchema,
	parallelogramTrapezoidDiagram: ParallelogramTrapezoidDiagramPropsSchema
}

// The `type` field is now included in the base schemas, so we remove .extend()
export const typedSchemas = allWidgetSchemas

// Create the discriminated union schema from the schemas (each now contains its type field)
// Note: partitionedShape is handled separately as it has its own discriminated union
const widgetSchemasWithoutPartitioned = [
	typedSchemas.threeDIntersectionDiagram,
	typedSchemas.absoluteValueNumberLine,
	typedSchemas.angleDiagram,
	typedSchemas.barChart,
	typedSchemas.boxGrid,
	typedSchemas.boxPlot,
	typedSchemas.circleDiagram,
	typedSchemas.compositeShapeDiagram,
	typedSchemas.coordinatePlane,
	typedSchemas.distanceFormulaGraph,
	typedSchemas.functionPlotGraph,
	typedSchemas.lineEquationGraph,
	typedSchemas.pointPlotGraph,
	typedSchemas.polygonGraph,
	typedSchemas.shapeTransformationGraph,
	typedSchemas.dataTable,
	typedSchemas.discreteObjectRatioDiagram,
	typedSchemas.dotPlot,
	typedSchemas.doubleNumberLine,
	typedSchemas.emojiImage,
	typedSchemas.figureComparisonDiagram,
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
	typedSchemas.pentagonIntersectionDiagram,
	typedSchemas.pictograph,
	typedSchemas.polyhedronDiagram,
	typedSchemas.probabilitySpinner,
	typedSchemas.polyhedronNetDiagram,
	typedSchemas.pythagoreanProofDiagram,
	typedSchemas.ratioBoxDiagram,
	typedSchemas.rectangularFrameDiagram,
	typedSchemas.scaleCopiesSlider,
	typedSchemas.scatterPlot,
	typedSchemas.stackedItemsDiagram,
	typedSchemas.tapeDiagram,
	typedSchemas.transformationDiagram,
	typedSchemas.treeDiagram,
	typedSchemas.triangleDiagram,
	typedSchemas.unitBlockDiagram,
	typedSchemas.periodicTable,
	typedSchemas.urlImage,
	typedSchemas.vennDiagram,
	typedSchemas.verticalArithmeticSetup,
	typedSchemas.parallelogramTrapezoidDiagram
] as const

export const WidgetSchema = z.union([
	z.discriminatedUnion("type", widgetSchemasWithoutPartitioned),
	typedSchemas.partitionedShape
])
export type Widget = z.infer<typeof WidgetSchema>
export type WidgetInput = z.input<typeof WidgetSchema>

// Export all schemas for use in widget collections
export {
	ThreeDIntersectionDiagramPropsSchema,
	AbsoluteValueNumberLinePropsSchema,
	AngleDiagramPropsSchema,
	BarChartPropsSchema,
	BoxGridPropsSchema,
	BoxPlotPropsSchema,
	CircleDiagramPropsSchema,
	CompositeShapeDiagramPropsSchema,
	CoordinatePlaneComprehensivePropsSchema,
	DataTablePropsSchema,
	DiscreteObjectRatioDiagramPropsSchema,
	DistanceFormulaGraphPropsSchema,
	DotPlotPropsSchema,
	DoubleNumberLinePropsSchema,
	EmojiImagePropsSchema,
	FigureComparisonDiagramPropsSchema,
	FractionNumberLinePropsSchema,
	FunctionPlotGraphPropsSchema,
	GeometricSolidDiagramPropsSchema,
	HangerDiagramPropsSchema,
	HistogramPropsSchema,
	InequalityNumberLinePropsSchema,
	LineEquationGraphPropsSchema,
	NumberLinePropsSchema,
	NumberLineForOppositesPropsSchema,
	NumberLineWithActionPropsSchema,
	NumberLineWithFractionGroupsPropsSchema,
	NumberSetDiagramPropsSchema,
	ParallelogramTrapezoidDiagramPropsSchema,
	PartitionedShapePropsSchema,
	PentagonIntersectionDiagramPropsSchema,
	PictographPropsSchema,
	PointPlotGraphPropsSchema,
	PolygonGraphPropsSchema,
	PolyhedronDiagramPropsSchema,
	PolyhedronNetDiagramPropsSchema,
	ProbabilitySpinnerPropsSchema,
	PythagoreanProofDiagramPropsSchema,
	RatioBoxDiagramPropsSchema,
	RectangularFrameDiagramPropsSchema,
	ScaleCopiesSliderPropsSchema,
	ScatterPlotPropsSchema,
	ShapeTransformationGraphPropsSchema,
	StackedItemsDiagramPropsSchema,
	TapeDiagramPropsSchema,
	TransformationDiagramPropsSchema,
	TreeDiagramPropsSchema,
	TriangleDiagramPropsSchema,
	PeriodicTableWidgetPropsSchema,
	UnitBlockDiagramPropsSchema,
	UrlImageWidgetPropsSchema,
	VennDiagramPropsSchema,
	VerticalArithmeticSetupPropsSchema
}

// Export the individual generators for direct use
export {
	generateThreeDIntersectionDiagram,
	generateAbsoluteValueNumberLine,
	generateAngleDiagram,
	generateBarChart,
	generateBoxGrid,
	generateBoxPlot,
	generateCircleDiagram,
	generateCompositeShapeDiagram,
	generateCoordinatePlaneComprehensive as generateCoordinatePlane,
	generateDistanceFormulaGraph,
	generateFunctionPlotGraph,
	generateLineEquationGraph,
	generatePointPlotGraph,
	generatePolygonGraph,
	generateShapeTransformationGraph,
	generateDataTable,
	generateDiscreteObjectRatioDiagram,
	generateDotPlot,
	generateDoubleNumberLine,
	generateEmojiImage,
	generateFigureComparisonDiagram,
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
	generatePartitionedShape,
	generatePentagonIntersectionDiagram,
	generatePictograph,
	generatePolyhedronDiagram,
	generateProbabilitySpinner,
	generatePolyhedronNetDiagram,
	generatePythagoreanProofDiagram,
	generateRatioBoxDiagram,
	generateRectangularFrameDiagram,
	generateScaleCopiesSlider,
	generateScatterPlot,
	generateStackedItemsDiagram,
	generateTapeDiagram,
	generateTransformationDiagram,
	generateTreeDiagram,
	generateTriangleDiagram,
	generatePeriodicTable,
	generateUnitBlockDiagram,
	generateUrlImage,
	generateVennDiagram,
	generateVerticalArithmeticSetup,
	generateParallelogramTrapezoidDiagram
}

// The generateWidget function is a comprehensive switch that can handle any widget type.
export function generateWidget(widget: Widget): string {
	switch (widget.type) {
		case "threeDIntersectionDiagram":
			return generateThreeDIntersectionDiagram(widget)
		case "absoluteValueNumberLine":
			return generateAbsoluteValueNumberLine(widget)
		case "angleDiagram":
			return generateAngleDiagram(widget)
		case "barChart":
			return generateBarChart(widget)
		case "boxGrid":
			return generateBoxGrid(widget)
		case "boxPlot":
			return generateBoxPlot(widget)
		case "circleDiagram":
			return generateCircleDiagram(widget)
		case "compositeShapeDiagram":
			return generateCompositeShapeDiagram(widget)
		case "coordinatePlane":
			return generateCoordinatePlaneComprehensive(widget)
		case "dataTable":
			return generateDataTable(widget)
		case "discreteObjectRatioDiagram":
			return generateDiscreteObjectRatioDiagram(widget)
		case "distanceFormulaGraph":
			return generateDistanceFormulaGraph(widget)
		case "dotPlot":
			return generateDotPlot(widget)
		case "doubleNumberLine":
			return generateDoubleNumberLine(widget)
		case "emojiImage":
			return generateEmojiImage(widget)
		case "figureComparisonDiagram":
			return generateFigureComparisonDiagram(widget)
		case "fractionNumberLine":
			return generateFractionNumberLine(widget)
		case "functionPlotGraph":
			return generateFunctionPlotGraph(widget)
		case "geometricSolidDiagram":
			return generateGeometricSolidDiagram(widget)
		case "hangerDiagram":
			return generateHangerDiagram(widget)
		case "histogram":
			return generateHistogram(widget)
		case "inequalityNumberLine":
			return generateInequalityNumberLine(widget)
		case "lineEquationGraph":
			return generateLineEquationGraph(widget)
		case "numberLine":
			return generateNumberLine(widget)
		case "numberLineForOpposites":
			return generateNumberLineForOpposites(widget)
		case "numberLineWithAction":
			return generateNumberLineWithAction(widget)
		case "numberLineWithFractionGroups":
			return generateNumberLineWithFractionGroups(widget)
		case "numberSetDiagram":
			return generateNumberSetDiagram(widget)
		case "parallelogramTrapezoidDiagram":
			return generateParallelogramTrapezoidDiagram(widget)
		case "partitionedShape":
			return generatePartitionedShape(widget)
		case "pentagonIntersectionDiagram":
			return generatePentagonIntersectionDiagram(widget)
		case "pictograph":
			return generatePictograph(widget)
		case "pointPlotGraph":
			return generatePointPlotGraph(widget)
		case "polygonGraph":
			return generatePolygonGraph(widget)
		case "polyhedronDiagram":
			return generatePolyhedronDiagram(widget)
		case "polyhedronNetDiagram":
			return generatePolyhedronNetDiagram(widget)
		case "probabilitySpinner":
			return generateProbabilitySpinner(widget)
		case "pythagoreanProofDiagram":
			return generatePythagoreanProofDiagram(widget)
		case "ratioBoxDiagram":
			return generateRatioBoxDiagram(widget)
		case "rectangularFrameDiagram":
			return generateRectangularFrameDiagram(widget)
		case "scaleCopiesSlider":
			return generateScaleCopiesSlider(widget)
		case "scatterPlot":
			return generateScatterPlot(widget)
		case "shapeTransformationGraph":
			return generateShapeTransformationGraph(widget)
		case "stackedItemsDiagram":
			return generateStackedItemsDiagram(widget)
		case "tapeDiagram":
			return generateTapeDiagram(widget)
		case "transformationDiagram":
			return generateTransformationDiagram(widget)
		case "treeDiagram":
			return generateTreeDiagram(widget)
		case "triangleDiagram":
			return generateTriangleDiagram(widget)
		case "unitBlockDiagram":
			return generateUnitBlockDiagram(widget)
		case "periodicTable":
			return generatePeriodicTable(widget)
		case "urlImage":
			return generateUrlImage(widget)
		case "vennDiagram":
			return generateVennDiagram(widget)
		case "verticalArithmeticSetup":
			return generateVerticalArithmeticSetup(widget)
		default:
			throw errors.new(`Unknown widget type: ${JSON.stringify(widget)}`)
	}
}
