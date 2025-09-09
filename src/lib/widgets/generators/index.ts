import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
// Import all individual schemas and generators
import {
	generateThreeDIntersectionDiagram,
	ThreeDIntersectionDiagramPropsSchema
} from "@/lib/widgets/generators/3d-intersection-diagram"
import {
	AbsoluteValueNumberLinePropsSchema,
	generateAbsoluteValueNumberLine
} from "@/lib/widgets/generators/absolute-value-number-line"
import {
	AdditionWithRegroupingPropsSchema,
	generateAdditionWithRegrouping
} from "@/lib/widgets/generators/addition-with-regrouping"
import { AngleDiagramPropsSchema, generateAngleDiagram } from "@/lib/widgets/generators/angle-diagram"
import {
	AreaModelMultiplicationPropsSchema,
	generateAreaModelMultiplication
} from "@/lib/widgets/generators/area-model-multiplication"
import { AreaGraphPropsSchema, generateAreaGraph } from "@/lib/widgets/generators/area-graph"
import { BarChartPropsSchema, generateBarChart } from "@/lib/widgets/generators/bar-chart"
import { BoxGridPropsSchema, generateBoxGrid } from "@/lib/widgets/generators/box-grid"
import { BoxPlotPropsSchema, generateBoxPlot } from "@/lib/widgets/generators/box-plot"
import { CircleDiagramPropsSchema, generateCircleDiagram } from "@/lib/widgets/generators/circle-diagram"
import {
	CompositeShapeDiagramPropsSchema,
	generateCompositeShapeDiagram
} from "@/lib/widgets/generators/composite-shape-diagram"
import { ConceptualGraphPropsSchema, generateConceptualGraph } from "@/lib/widgets/generators/conceptual-graph"
import {
	CoordinatePlaneComprehensivePropsSchema,
	generateCoordinatePlaneComprehensive
} from "@/lib/widgets/generators/coordinate-plane-comprehensive"
import { DataTablePropsSchema, generateDataTable } from "@/lib/widgets/generators/data-table"
import {
	DiscreteObjectRatioDiagramPropsSchema,
	generateDiscreteObjectRatioDiagram
} from "@/lib/widgets/generators/discrete-object-ratio-diagram"
import {
	DistanceFormulaGraphPropsSchema,
	generateDistanceFormulaGraph
} from "@/lib/widgets/generators/distance-formula-graph"
import { DivergentBarChartPropsSchema, generateDivergentBarChart } from "@/lib/widgets/generators/divergent-bar-chart"
import {
	DivisionModelDiagramPropsSchema,
	generateDivisionModelDiagram
} from "@/lib/widgets/generators/division-model-diagram"
import { DotPlotPropsSchema, generateDotPlot } from "@/lib/widgets/generators/dot-plot"
import { DoubleNumberLinePropsSchema, generateDoubleNumberLine } from "@/lib/widgets/generators/double-number-line"
import { EmojiImagePropsSchema, generateEmojiImage } from "@/lib/widgets/generators/emoji-image"
import {
	EquivalentFractionModelPropsSchema,
	generateEquivalentFractionModel
} from "@/lib/widgets/generators/equivalent-fraction-model"
import {
	FactorizationDiagramPropsSchema,
	generateFactorizationDiagram
} from "@/lib/widgets/generators/factorization-diagram"
import {
	FigureComparisonDiagramPropsSchema,
	generateFigureComparisonDiagram
} from "@/lib/widgets/generators/figure-comparison-diagram"
import {
	FractionFrequencyPlotPropsSchema,
	generateFractionFrequencyPlot
} from "@/lib/widgets/generators/fraction-frequency-plot"
import {
	FractionNumberLinePropsSchema,
	generateFractionNumberLine
} from "@/lib/widgets/generators/fraction-number-line"
import {
	FractionModelDiagramPropsSchema,
	generateFractionModelDiagram
} from "@/lib/widgets/generators/fractional-model-diagram"
import {
	FractionMultiplicationModelPropsSchema,
	generateFractionMultiplicationModel
} from "@/lib/widgets/generators/fraction-multiplication-model"
import { FunctionPlotGraphPropsSchema, generateFunctionPlotGraph } from "@/lib/widgets/generators/function-plot-graph"
import {
	GeometricSolidDiagramPropsSchema,
	generateGeometricSolidDiagram
} from "@/lib/widgets/generators/geometric-solid-diagram"
import { generateHangerDiagram, HangerDiagramPropsSchema } from "@/lib/widgets/generators/hanger-diagram"
import { generateHistogram, HistogramPropsSchema } from "@/lib/widgets/generators/histogram"
import {
	generateInequalityNumberLine,
	InequalityNumberLinePropsSchema
} from "@/lib/widgets/generators/inequality-number-line"
import { generateKeelingCurve, KeelingCurvePropsSchema } from "@/lib/widgets/generators/keeling-curve"
import { generateLineEquationGraph, LineEquationGraphPropsSchema } from "@/lib/widgets/generators/line-equation-graph"
import { generateLineGraph, LineGraphPropsSchema } from "@/lib/widgets/generators/line-graph"
import { generateNPolygon, NPolygonPropsSchema } from "@/lib/widgets/generators/n-polygon"
import { generateNumberLine, NumberLinePropsSchema } from "@/lib/widgets/generators/number-line"
import {
	generateNumberLineForOpposites,
	NumberLineForOppositesPropsSchema
} from "@/lib/widgets/generators/number-line-for-opposites"
import {
	generateNumberLineWithAction,
	NumberLineWithActionPropsSchema
} from "@/lib/widgets/generators/number-line-with-action"
import {
	generateNumberLineWithFractionGroups,
	NumberLineWithFractionGroupsPropsSchema
} from "@/lib/widgets/generators/number-line-with-fraction-groups"
import { generateNumberSetDiagram, NumberSetDiagramPropsSchema } from "@/lib/widgets/generators/number-set-diagram"
import { generateParabolaGraph, ParabolaGraphPropsSchema } from "@/lib/widgets/generators/parabola-graph"
import {
	generateParallelogramTrapezoidDiagram,
	ParallelogramTrapezoidDiagramPropsSchema
} from "@/lib/widgets/generators/parallelogram-trapezoid-diagram"
import { generatePartitionedShape, PartitionedShapePropsSchema } from "@/lib/widgets/generators/partitioned-shape"
import {
	generatePentagonIntersectionDiagram,
	PentagonIntersectionDiagramPropsSchema
} from "@/lib/widgets/generators/pentagon-intersection-diagram"
import { generatePeriodicTable, PeriodicTableWidgetPropsSchema } from "@/lib/widgets/generators/periodic-table"
import { generatePieChart, PieChartWidgetPropsSchema } from "@/lib/widgets/generators/pi-chart"
import { generatePictograph, PictographPropsSchema } from "@/lib/widgets/generators/pictograph"
import { generatePointPlotGraph, PointPlotGraphPropsSchema } from "@/lib/widgets/generators/point-plot-graph"
import { generatePolygonGraph, PolygonGraphPropsSchema } from "@/lib/widgets/generators/polygon-graph"
import { generatePolyhedronDiagram, PolyhedronDiagramPropsSchema } from "@/lib/widgets/generators/polyhedron-diagram"
import {
	generateProtractorAngleDiagram,
	ProtractorAngleDiagramPropsSchema
} from "@/lib/widgets/generators/protractor-angle-diagram"
import {
	generatePolyhedronNetDiagram,
	PolyhedronNetDiagramPropsSchema
} from "@/lib/widgets/generators/polyhedron-net-diagram"
import {
	generatePopulationBarChart,
	PopulationBarChartPropsSchema
} from "@/lib/widgets/generators/population-bar-chart"
import {
	generatePopulationChangeEventGraph,
	PopulationChangeEventGraphPropsSchema
} from "@/lib/widgets/generators/population-change-event-graph"
import { generateProbabilitySpinner, ProbabilitySpinnerPropsSchema } from "@/lib/widgets/generators/probability-spinner"
import {
	generatePythagoreanProofDiagram,
	PythagoreanProofDiagramPropsSchema
} from "@/lib/widgets/generators/pythagorean-proof-diagram"
import { generateRatioBoxDiagram, RatioBoxDiagramPropsSchema } from "@/lib/widgets/generators/ratio-box-diagram"
import {
	generateRectangularFrameDiagram,
	RectangularFrameDiagramPropsSchema
} from "@/lib/widgets/generators/rectangular-frame-diagram"
import { generateScaleCopiesSlider, ScaleCopiesSliderPropsSchema } from "@/lib/widgets/generators/scale-copies-slider"
import { generateSimpleArrow, SimpleArrowPropsSchema } from "@/lib/widgets/generators/simple-arrow"
import { generateScatterPlot, ScatterPlotPropsSchema } from "@/lib/widgets/generators/scatter-plot"
import {
	generateShapeTransformationGraph,
	ShapeTransformationGraphPropsSchema
} from "@/lib/widgets/generators/shape-transformation-graph"
import {
	generateSingleFractionalModelDiagram,
	SingleFractionalModelDiagramPropsSchema
} from "@/lib/widgets/generators/single-fractional-model-diagram"
import {
	generateStackedItemsDiagram,
	StackedItemsDiagramPropsSchema
} from "@/lib/widgets/generators/stacked-items-diagram"
import {
	generateSubtractionWithRegrouping,
	SubtractionWithRegroupingPropsSchema
} from "@/lib/widgets/generators/subtraction-with-regrouping"
import { generateTapeDiagram, TapeDiagramPropsSchema } from "@/lib/widgets/generators/tape-diagram"
import {
	generateTransformationDiagram,
	TransformationDiagramPropsSchema
} from "@/lib/widgets/generators/transformation-diagram"
import { generateTreeDiagram, TreeDiagramPropsSchema } from "@/lib/widgets/generators/tree-diagram"
import { generateTriangleDiagram, TriangleDiagramPropsSchema } from "@/lib/widgets/generators/triangle-diagram"
import { generateUnitBlockDiagram, UnitBlockDiagramPropsSchema } from "@/lib/widgets/generators/unit-block-diagram"
import { generateUrlImage, UrlImageWidgetPropsSchema } from "@/lib/widgets/generators/url-image"
import { generateVennDiagram, VennDiagramPropsSchema } from "@/lib/widgets/generators/venn-diagram"
import {
	generateVerticalArithmeticSetup,
	VerticalArithmeticSetupPropsSchema
} from "@/lib/widgets/generators/vertical-arithmetic-setup"
import {
	generateVectorDiagram,
	VectorDiagramPropsSchema
} from "@/lib/widgets/generators/vector-diagram"

// This object now contains every widget schema from every collection.
// It serves as a master lookup for dynamic schema generation and compilation.
export const allWidgetSchemas = {
	threeDIntersectionDiagram: ThreeDIntersectionDiagramPropsSchema,
	absoluteValueNumberLine: AbsoluteValueNumberLinePropsSchema,
	angleDiagram: AngleDiagramPropsSchema,
	areaModelMultiplication: AreaModelMultiplicationPropsSchema,
	areaGraph: AreaGraphPropsSchema,
	barChart: BarChartPropsSchema,
	boxGrid: BoxGridPropsSchema,
	boxPlot: BoxPlotPropsSchema,
	circleDiagram: CircleDiagramPropsSchema,
	fractionModelDiagram: FractionModelDiagramPropsSchema,
	fractionMultiplicationModel: FractionMultiplicationModelPropsSchema,
	compositeShapeDiagram: CompositeShapeDiagramPropsSchema,
	conceptualGraph: ConceptualGraphPropsSchema,
	coordinatePlane: CoordinatePlaneComprehensivePropsSchema,
	distanceFormulaGraph: DistanceFormulaGraphPropsSchema,
	divergentBarChart: DivergentBarChartPropsSchema,
	functionPlotGraph: FunctionPlotGraphPropsSchema,
	lineEquationGraph: LineEquationGraphPropsSchema,
	pointPlotGraph: PointPlotGraphPropsSchema,
	populationChangeEventGraph: PopulationChangeEventGraphPropsSchema,
	polygonGraph: PolygonGraphPropsSchema,
	protractorAngleDiagram: ProtractorAngleDiagramPropsSchema,
	shapeTransformationGraph: ShapeTransformationGraphPropsSchema,
	dataTable: DataTablePropsSchema,
	discreteObjectRatioDiagram: DiscreteObjectRatioDiagramPropsSchema,
	dotPlot: DotPlotPropsSchema,
	doubleNumberLine: DoubleNumberLinePropsSchema,
	populationBarChart: PopulationBarChartPropsSchema,
	emojiImage: EmojiImagePropsSchema,
	figureComparisonDiagram: FigureComparisonDiagramPropsSchema,
	fractionNumberLine: FractionNumberLinePropsSchema,
	geometricSolidDiagram: GeometricSolidDiagramPropsSchema,
	hangerDiagram: HangerDiagramPropsSchema,
	histogram: HistogramPropsSchema,
	nPolygon: NPolygonPropsSchema,

	inequalityNumberLine: InequalityNumberLinePropsSchema,
	keelingCurve: KeelingCurvePropsSchema,
	lineGraph: LineGraphPropsSchema,
	numberLine: NumberLinePropsSchema,
	numberLineForOpposites: NumberLineForOppositesPropsSchema,
	numberLineWithAction: NumberLineWithActionPropsSchema,
	numberLineWithFractionGroups: NumberLineWithFractionGroupsPropsSchema,
	numberSetDiagram: NumberSetDiagramPropsSchema,
	parabolaGraph: ParabolaGraphPropsSchema,
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
	simpleArrow: SimpleArrowPropsSchema,
	scatterPlot: ScatterPlotPropsSchema,
	singleFractionalModelDiagram: SingleFractionalModelDiagramPropsSchema,
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
	vectorDiagram: VectorDiagramPropsSchema,
	parallelogramTrapezoidDiagram: ParallelogramTrapezoidDiagramPropsSchema,
	pieChart: PieChartWidgetPropsSchema,
	fractionFrequencyPlot: FractionFrequencyPlotPropsSchema,
	divisionModelDiagram: DivisionModelDiagramPropsSchema,
	factorizationDiagram: FactorizationDiagramPropsSchema,
	equivalentFractionModel: EquivalentFractionModelPropsSchema,
	subtractionWithRegrouping: SubtractionWithRegroupingPropsSchema,
	additionWithRegrouping: AdditionWithRegroupingPropsSchema
}

// The `type` field is now included in the base schemas, so we remove .extend()
export const typedSchemas = allWidgetSchemas

// Create the discriminated union schema from the schemas (each now contains its type field)
// Note: partitionedShape and polyhedronNetDiagram are handled separately as they have their own discriminated unions
const widgetSchemasWithoutSpecialUnions = [
	typedSchemas.threeDIntersectionDiagram,
	typedSchemas.absoluteValueNumberLine,
	typedSchemas.angleDiagram,
	typedSchemas.areaModelMultiplication,
	typedSchemas.areaGraph,
	typedSchemas.barChart,
	typedSchemas.boxGrid,
	typedSchemas.boxPlot,
	typedSchemas.circleDiagram,
	typedSchemas.fractionModelDiagram,
	typedSchemas.fractionMultiplicationModel,
	typedSchemas.compositeShapeDiagram,
	typedSchemas.conceptualGraph,
	typedSchemas.coordinatePlane,
	typedSchemas.distanceFormulaGraph,
	typedSchemas.divergentBarChart,
	typedSchemas.functionPlotGraph,
	typedSchemas.lineEquationGraph,
	typedSchemas.pointPlotGraph,
	typedSchemas.populationChangeEventGraph,
	typedSchemas.polygonGraph,
	typedSchemas.protractorAngleDiagram,
	typedSchemas.shapeTransformationGraph,
	typedSchemas.dataTable,
	typedSchemas.discreteObjectRatioDiagram,
	typedSchemas.dotPlot,
	typedSchemas.doubleNumberLine,
	typedSchemas.populationBarChart,
	typedSchemas.emojiImage,
	typedSchemas.figureComparisonDiagram,
	typedSchemas.fractionNumberLine,
	typedSchemas.geometricSolidDiagram,
	typedSchemas.hangerDiagram,
	typedSchemas.histogram,
	typedSchemas.nPolygon,

	typedSchemas.inequalityNumberLine,
	typedSchemas.keelingCurve,
	typedSchemas.lineGraph,
	typedSchemas.numberLine,
	typedSchemas.numberLineForOpposites,
	typedSchemas.numberLineWithAction,
	typedSchemas.numberLineWithFractionGroups,
	typedSchemas.numberSetDiagram,
	typedSchemas.parabolaGraph,
	typedSchemas.pentagonIntersectionDiagram,
	typedSchemas.pictograph,
	typedSchemas.polyhedronDiagram,
	typedSchemas.probabilitySpinner,
	typedSchemas.pythagoreanProofDiagram,
	typedSchemas.ratioBoxDiagram,
	typedSchemas.rectangularFrameDiagram,
	typedSchemas.scaleCopiesSlider,
	typedSchemas.simpleArrow,
	typedSchemas.scatterPlot,
	typedSchemas.singleFractionalModelDiagram,
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
	typedSchemas.vectorDiagram,
	typedSchemas.parallelogramTrapezoidDiagram,
	typedSchemas.pieChart,
	typedSchemas.fractionFrequencyPlot,
	typedSchemas.divisionModelDiagram,
	typedSchemas.factorizationDiagram,
	typedSchemas.equivalentFractionModel,
	typedSchemas.subtractionWithRegrouping,
	typedSchemas.additionWithRegrouping
] as const

export const WidgetSchema = z.union([
	z.discriminatedUnion("type", widgetSchemasWithoutSpecialUnions),
	typedSchemas.partitionedShape,
	typedSchemas.polyhedronNetDiagram
])
export type Widget = z.infer<typeof WidgetSchema>
export type WidgetInput = z.input<typeof WidgetSchema>

// Export all schemas for use in widget collections
export {
	ThreeDIntersectionDiagramPropsSchema,
	AbsoluteValueNumberLinePropsSchema,
	AngleDiagramPropsSchema,
	AreaModelMultiplicationPropsSchema,
	AreaGraphPropsSchema,
	BarChartPropsSchema,
	BoxGridPropsSchema,
	BoxPlotPropsSchema,
	CircleDiagramPropsSchema,
	FractionModelDiagramPropsSchema,
	FractionMultiplicationModelPropsSchema,
	CompositeShapeDiagramPropsSchema,
	ConceptualGraphPropsSchema,
	CoordinatePlaneComprehensivePropsSchema,
	DataTablePropsSchema,
	DiscreteObjectRatioDiagramPropsSchema,
	DistanceFormulaGraphPropsSchema,
	DivergentBarChartPropsSchema,
	DotPlotPropsSchema,
	DoubleNumberLinePropsSchema,
	PopulationBarChartPropsSchema,
	EmojiImagePropsSchema,
	FigureComparisonDiagramPropsSchema,
	FractionNumberLinePropsSchema,
	FunctionPlotGraphPropsSchema,
	GeometricSolidDiagramPropsSchema,
	HangerDiagramPropsSchema,
	HistogramPropsSchema,
	NPolygonPropsSchema,
	InequalityNumberLinePropsSchema,
	KeelingCurvePropsSchema,
	LineEquationGraphPropsSchema,
	LineGraphPropsSchema,
	NumberLinePropsSchema,
	NumberLineForOppositesPropsSchema,
	NumberLineWithActionPropsSchema,
	NumberLineWithFractionGroupsPropsSchema,
	NumberSetDiagramPropsSchema,
	ParabolaGraphPropsSchema,
	ParallelogramTrapezoidDiagramPropsSchema,
	PartitionedShapePropsSchema,
	PentagonIntersectionDiagramPropsSchema,
	PictographPropsSchema,
	PointPlotGraphPropsSchema,
	PopulationChangeEventGraphPropsSchema,
	PolygonGraphPropsSchema,
	PolyhedronDiagramPropsSchema,
	PolyhedronNetDiagramPropsSchema,
	ProbabilitySpinnerPropsSchema,
	PythagoreanProofDiagramPropsSchema,
	RatioBoxDiagramPropsSchema,
	RectangularFrameDiagramPropsSchema,
	ScaleCopiesSliderPropsSchema,
	SimpleArrowPropsSchema,
	ScatterPlotPropsSchema,
	ShapeTransformationGraphPropsSchema,
	SingleFractionalModelDiagramPropsSchema,
	StackedItemsDiagramPropsSchema,
	TapeDiagramPropsSchema,
	TransformationDiagramPropsSchema,
	TreeDiagramPropsSchema,
	TriangleDiagramPropsSchema,
	PeriodicTableWidgetPropsSchema,
	ProtractorAngleDiagramPropsSchema,
	UnitBlockDiagramPropsSchema,
	UrlImageWidgetPropsSchema,
	VennDiagramPropsSchema,
	VectorDiagramPropsSchema,
	VerticalArithmeticSetupPropsSchema,
	PieChartWidgetPropsSchema,
	FractionFrequencyPlotPropsSchema,
	DivisionModelDiagramPropsSchema,
	FactorizationDiagramPropsSchema,
	EquivalentFractionModelPropsSchema,
	SubtractionWithRegroupingPropsSchema,
	AdditionWithRegroupingPropsSchema
}

// Export the individual generators for direct use
export {
	generateThreeDIntersectionDiagram,
	generateAbsoluteValueNumberLine,
	generateAngleDiagram,
	generateAreaModelMultiplication,
	generateAreaGraph,
	generateBarChart,
	generateBoxGrid,
	generateBoxPlot,
	generateCircleDiagram,
	generateFractionModelDiagram,
	generateFractionMultiplicationModel,
	generateCompositeShapeDiagram,
	generateConceptualGraph,
	generateCoordinatePlaneComprehensive as generateCoordinatePlane,
	generateDistanceFormulaGraph,
	generateDivergentBarChart,
	generateFunctionPlotGraph,
	generateLineEquationGraph,
	generatePointPlotGraph,
	generatePopulationChangeEventGraph,
	generatePolygonGraph,
	generateShapeTransformationGraph,
	generateDataTable,
	generateDiscreteObjectRatioDiagram,
	generateDotPlot,
	generateDoubleNumberLine,
	generatePopulationBarChart,
	generateEmojiImage,
	generateFigureComparisonDiagram,
	generateFractionNumberLine,
	generateGeometricSolidDiagram,
	generateHangerDiagram,
	generateHistogram,
	generateNPolygon,
	generateInequalityNumberLine,
	generateKeelingCurve,
	generateLineGraph,
	generateNumberLine,
	generateNumberLineForOpposites,
	generateNumberLineWithAction,
	generateNumberLineWithFractionGroups,
	generateNumberSetDiagram,
	generateParabolaGraph,
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
	generateSimpleArrow,
	generateScatterPlot,
	generateSingleFractionalModelDiagram,
	generateStackedItemsDiagram,
	generateTapeDiagram,
	generateTransformationDiagram,
	generateTreeDiagram,
	generateTriangleDiagram,
	generatePeriodicTable,
	generateProtractorAngleDiagram,
	generateUnitBlockDiagram,
	generateUrlImage,
	generateVennDiagram,
	generateVerticalArithmeticSetup,
	generateVectorDiagram,
	generateParallelogramTrapezoidDiagram,
	generatePieChart,
	generateFractionFrequencyPlot,
	generateDivisionModelDiagram,
	generateFactorizationDiagram,
	generateEquivalentFractionModel,
	generateSubtractionWithRegrouping,
	generateAdditionWithRegrouping
}

// The generateWidget function is a comprehensive switch that can handle any widget type.
export async function generateWidget(widget: Widget): Promise<string> {
	switch (widget.type) {
		case "threeDIntersectionDiagram":
			return await generateThreeDIntersectionDiagram(widget)
		case "absoluteValueNumberLine":
			return await generateAbsoluteValueNumberLine(widget)
		case "angleDiagram":
			return await generateAngleDiagram(widget)
		case "areaModelMultiplication":
			return await generateAreaModelMultiplication(widget)
		case "areaGraph":
			return await generateAreaGraph(widget)
		case "barChart":
			return await generateBarChart(widget)
		case "boxGrid":
			return await generateBoxGrid(widget)
		case "boxPlot":
			return await generateBoxPlot(widget)
		case "circleDiagram":
			return await generateCircleDiagram(widget)
		case "fractionModelDiagram":
			return await generateFractionModelDiagram(widget)
		case "fractionMultiplicationModel":
			return await generateFractionMultiplicationModel(widget)
		case "compositeShapeDiagram":
			return await generateCompositeShapeDiagram(widget)
		case "conceptualGraph":
			return await generateConceptualGraph(widget)
		case "coordinatePlane":
			return await generateCoordinatePlaneComprehensive(widget)
		case "dataTable":
			return await generateDataTable(widget)
		case "discreteObjectRatioDiagram":
			return await generateDiscreteObjectRatioDiagram(widget)
		case "distanceFormulaGraph":
			return await generateDistanceFormulaGraph(widget)
		case "divergentBarChart":
			return await generateDivergentBarChart(widget)
		case "dotPlot":
			return await generateDotPlot(widget)
		case "doubleNumberLine":
			return await generateDoubleNumberLine(widget)
		case "populationBarChart":
			return await generatePopulationBarChart(widget)
		case "emojiImage":
			return await generateEmojiImage(widget)
		case "figureComparisonDiagram":
			return await generateFigureComparisonDiagram(widget)
		case "fractionNumberLine":
			return await generateFractionNumberLine(widget)
		case "functionPlotGraph":
			return await generateFunctionPlotGraph(widget)
		case "geometricSolidDiagram":
			return await generateGeometricSolidDiagram(widget)
		case "hangerDiagram":
			return await generateHangerDiagram(widget)
		case "histogram":
			return await generateHistogram(widget)
		case "nPolygon":
			return await generateNPolygon(widget)

		case "inequalityNumberLine":
			return await generateInequalityNumberLine(widget)
		case "keelingCurve":
			return await generateKeelingCurve(widget)
		case "lineEquationGraph":
			return await generateLineEquationGraph(widget)
		case "lineGraph":
			return await generateLineGraph(widget)
		case "numberLine":
			return await generateNumberLine(widget)
		case "numberLineForOpposites":
			return await generateNumberLineForOpposites(widget)
		case "numberLineWithAction":
			return await generateNumberLineWithAction(widget)
		case "numberLineWithFractionGroups":
			return await generateNumberLineWithFractionGroups(widget)
		case "numberSetDiagram":
			return await generateNumberSetDiagram(widget)
		case "parabolaGraph":
			return await generateParabolaGraph(widget)
		case "parallelogramTrapezoidDiagram":
			return await generateParallelogramTrapezoidDiagram(widget)
		case "partitionedShape":
			return await generatePartitionedShape(widget)
		case "pentagonIntersectionDiagram":
			return await generatePentagonIntersectionDiagram(widget)
		case "pictograph":
			return await generatePictograph(widget)
		case "pointPlotGraph":
			return await generatePointPlotGraph(widget)
		case "populationChangeEventGraph":
			return await generatePopulationChangeEventGraph(widget)
		case "polygonGraph":
			return await generatePolygonGraph(widget)
		case "polyhedronDiagram":
			return await generatePolyhedronDiagram(widget)
		case "polyhedronNetDiagram":
			return await generatePolyhedronNetDiagram(widget)
		case "protractorAngleDiagram":
			return await generateProtractorAngleDiagram(widget)
		case "probabilitySpinner":
			return await generateProbabilitySpinner(widget)
		case "pythagoreanProofDiagram":
			return await generatePythagoreanProofDiagram(widget)
		case "ratioBoxDiagram":
			return await generateRatioBoxDiagram(widget)
		case "rectangularFrameDiagram":
			return await generateRectangularFrameDiagram(widget)
		case "scaleCopiesSlider":
			return await generateScaleCopiesSlider(widget)
		case "simpleArrow":
			return generateSimpleArrow(widget)
		case "scatterPlot":
			return await generateScatterPlot(widget)
		case "shapeTransformationGraph":
			return await generateShapeTransformationGraph(widget)
		case "singleFractionalModelDiagram":
			return await generateSingleFractionalModelDiagram(widget)
		case "stackedItemsDiagram":
			return await generateStackedItemsDiagram(widget)
		case "tapeDiagram":
			return await generateTapeDiagram(widget)
		case "transformationDiagram":
			return await generateTransformationDiagram(widget)
		case "treeDiagram":
			return await generateTreeDiagram(widget)
		case "triangleDiagram":
			return await generateTriangleDiagram(widget)
		case "unitBlockDiagram":
			return await generateUnitBlockDiagram(widget)
		case "periodicTable":
			return await generatePeriodicTable(widget)
		case "urlImage":
			return await generateUrlImage(widget)
		case "vennDiagram":
			return await generateVennDiagram(widget)
		case "verticalArithmeticSetup":
			return await generateVerticalArithmeticSetup(widget)
		case "vectorDiagram":
			return await generateVectorDiagram(widget)
		case "pieChart":
			return await generatePieChart(widget)
		case "fractionFrequencyPlot":
			return await generateFractionFrequencyPlot(widget)
		case "divisionModelDiagram":
			return await generateDivisionModelDiagram(widget)
		case "factorizationDiagram":
			return await generateFactorizationDiagram(widget)
		case "equivalentFractionModel":
			return await generateEquivalentFractionModel(widget)
		case "subtractionWithRegrouping":
			return await generateSubtractionWithRegrouping(widget)
		case "additionWithRegrouping":
			return await generateAdditionWithRegrouping(widget)
		default:
			logger.error("unknown widget type", { widget })
			throw errors.new(`Unknown widget type: ${JSON.stringify(widget)}`)
	}
}
