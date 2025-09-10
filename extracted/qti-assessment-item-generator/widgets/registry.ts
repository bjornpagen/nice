
import { z } from "zod"

// Import individual schemas and keep their generators defined in their own files
import {
    ThreeDIntersectionDiagramPropsSchema
} from "./generators/3d-intersection-diagram"
import {
    AbsoluteValueNumberLinePropsSchema
} from "./generators/absolute-value-number-line"
import {
    AdditionWithRegroupingPropsSchema
} from "./generators/addition-with-regrouping"
import { AngleDiagramPropsSchema } from "./generators/angle-diagram"
import { AreaGraphPropsSchema } from "./generators/area-graph"
import {
    AreaModelMultiplicationPropsSchema
} from "./generators/area-model-multiplication"
import { BarChartPropsSchema } from "./generators/bar-chart"
import { BoxGridPropsSchema } from "./generators/box-grid"
import { BoxPlotPropsSchema } from "./generators/box-plot"
import { CircleDiagramPropsSchema } from "./generators/circle-diagram"
import {
    CompositeShapeDiagramPropsSchema
} from "./generators/composite-shape-diagram"
import { ConceptualGraphPropsSchema } from "./generators/conceptual-graph"
import {
    ConstraintGeometryDiagramPropsSchema
} from "./generators/constraint-geometry-diagram"
import {
    CoordinatePlaneComprehensivePropsSchema
} from "./generators/coordinate-plane-comprehensive"
import { DataTablePropsSchema } from "./generators/data-table"
import {
    DiscreteObjectRatioDiagramPropsSchema
} from "./generators/discrete-object-ratio-diagram"
import {
    DistanceFormulaGraphPropsSchema
} from "./generators/distance-formula-graph"
import { DivergentBarChartPropsSchema } from "./generators/divergent-bar-chart"
import {
    DivisionModelDiagramPropsSchema
} from "./generators/division-model-diagram"
import { DotPlotPropsSchema } from "./generators/dot-plot"
import { DoubleNumberLinePropsSchema } from "./generators/double-number-line"
import { EmojiImagePropsSchema } from "./generators/emoji-image"
import {
    EquivalentFractionModelPropsSchema
} from "./generators/equivalent-fraction-model"
import {
    FactorizationDiagramPropsSchema
} from "./generators/factorization-diagram"
import {
    FigureComparisonDiagramPropsSchema
} from "./generators/figure-comparison-diagram"
import {
    FractionFrequencyPlotPropsSchema
} from "./generators/fraction-frequency-plot"
import {
    FractionMultiplicationModelPropsSchema
} from "./generators/fraction-multiplication-model"
import {
    FractionNumberLinePropsSchema
} from "./generators/fraction-number-line"
import {
    FractionModelDiagramPropsSchema
} from "./generators/fractional-model-diagram"
import { FreeBodyDiagramPropsSchema } from "./generators/free-body-diagram"
import { FunctionPlotGraphPropsSchema } from "./generators/function-plot-graph"
import {
    GeometricSolidDiagramPropsSchema
} from "./generators/geometric-solid-diagram"
import { HangerDiagramPropsSchema } from "./generators/hanger-diagram"
import { HistogramPropsSchema } from "./generators/histogram"
import {
    InequalityNumberLinePropsSchema
} from "./generators/inequality-number-line"
import { KeelingCurvePropsSchema } from "./generators/keeling-curve"
import { LineEquationGraphPropsSchema } from "./generators/line-equation-graph"
import { LineGraphPropsSchema } from "./generators/line-graph"
import { NPolygonPropsSchema } from "./generators/n-polygon"
import { PatternDiagramPropsSchema } from "./generators/pattern-diagram"
import { NumberLinePropsSchema } from "./generators/number-line"
import {
    NumberLineForOppositesPropsSchema
} from "./generators/number-line-for-opposites"
import {
    NumberLineWithActionPropsSchema
} from "./generators/number-line-with-action"
import {
    NumberLineWithFractionGroupsPropsSchema
} from "./generators/number-line-with-fraction-groups"
import { NumberSetDiagramPropsSchema } from "./generators/number-set-diagram"
import { ParabolaGraphPropsSchema } from "./generators/parabola-graph"
import {
    ParallelogramTrapezoidDiagramPropsSchema
} from "./generators/parallelogram-trapezoid-diagram"
import { PartitionedShapePropsSchema } from "./generators/partitioned-shape"
import {
    PentagonIntersectionDiagramPropsSchema
} from "./generators/pentagon-intersection-diagram"
import { PeriodicTableWidgetPropsSchema } from "./generators/periodic-table"
import { PieChartWidgetPropsSchema } from "./generators/pi-chart"
import { PictographPropsSchema } from "./generators/pictograph"
import { PointPlotGraphPropsSchema } from "./generators/point-plot-graph"
import { PolygonGraphPropsSchema } from "./generators/polygon-graph"
import { PolyhedronDiagramPropsSchema } from "./generators/polyhedron-diagram"
import { PolyhedronNetDiagramPropsSchema } from "./generators/polyhedron-net-diagram"
import { PopulationBarChartPropsSchema } from "./generators/population-bar-chart"
import { PopulationChangeEventGraphPropsSchema } from "./generators/population-change-event-graph"
import { ProbabilitySpinnerPropsSchema } from "./generators/probability-spinner"
import { ProtractorAngleDiagramPropsSchema } from "./generators/protractor-angle-diagram"
import { RadiallyConstrainedAngleDiagramPropsSchema } from "./generators/radially-constrained-angle-diagram"
import { PythagoreanProofDiagramPropsSchema } from "./generators/pythagorean-proof-diagram"
import { QuantityFractionalDiagramPropsSchema } from "./generators/quantity-fractional-diagram"
import { RatioBoxDiagramPropsSchema } from "./generators/ratio-box-diagram"
import { RectangularFrameDiagramPropsSchema } from "./generators/rectangular-frame-diagram"
import { ScaleCopiesSliderPropsSchema } from "./generators/scale-copies-slider"
import { ScatterPlotPropsSchema } from "./generators/scatter-plot"
import { ShapeTransformationGraphPropsSchema } from "./generators/shape-transformation-graph"
import { SimpleArrowPropsSchema } from "./generators/simple-arrow"
import { SinCosineWidgetPropsSchema } from "./generators/sin-cosine-widget"
import { StackedItemsDiagramPropsSchema } from "./generators/stacked-items-diagram"
import { SubtractionWithRegroupingPropsSchema } from "./generators/subtraction-with-regrouping"
import { TapeDiagramPropsSchema } from "./generators/tape-diagram"
import { TransformationDiagramPropsSchema } from "./generators/transformation-diagram"
import { TreeDiagramPropsSchema } from "./generators/tree-diagram"
import { TriangleDiagramPropsSchema } from "./generators/triangle-diagram"
import { UnitBlockDiagramPropsSchema } from "./generators/unit-block-diagram"
import { UrlImageWidgetPropsSchema } from "./generators/url-image"
import { VectorDiagramPropsSchema } from "./generators/vector-diagram"
import { VennDiagramPropsSchema } from "./generators/venn-diagram"
import { VerticalArithmeticSetupPropsSchema } from "./generators/vertical-arithmetic-setup"

// Master registry of widget schemas for dynamic validation and prompting
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
    constraintGeometryDiagram: ConstraintGeometryDiagramPropsSchema,
    coordinatePlane: CoordinatePlaneComprehensivePropsSchema,
    distanceFormulaGraph: DistanceFormulaGraphPropsSchema,
    divergentBarChart: DivergentBarChartPropsSchema,
    functionPlotGraph: FunctionPlotGraphPropsSchema,
    lineEquationGraph: LineEquationGraphPropsSchema,
    pointPlotGraph: PointPlotGraphPropsSchema,
    populationChangeEventGraph: PopulationChangeEventGraphPropsSchema,
    polygonGraph: PolygonGraphPropsSchema,
    protractorAngleDiagram: ProtractorAngleDiagramPropsSchema,
    radiallyConstrainedAngleDiagram: RadiallyConstrainedAngleDiagramPropsSchema,
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
    patternDiagram: PatternDiagramPropsSchema,
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
    quantityFractionalDiagram: QuantityFractionalDiagramPropsSchema,
    ratioBoxDiagram: RatioBoxDiagramPropsSchema,
    rectangularFrameDiagram: RectangularFrameDiagramPropsSchema,
    scaleCopiesSlider: ScaleCopiesSliderPropsSchema,
    simpleArrow: SimpleArrowPropsSchema,
    sinCosineWidget: SinCosineWidgetPropsSchema,
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
    vectorDiagram: VectorDiagramPropsSchema,
    parallelogramTrapezoidDiagram: ParallelogramTrapezoidDiagramPropsSchema,
    pieChart: PieChartWidgetPropsSchema,
    fractionFrequencyPlot: FractionFrequencyPlotPropsSchema,
    freeBodyDiagram: FreeBodyDiagramPropsSchema,
    divisionModelDiagram: DivisionModelDiagramPropsSchema,
    factorizationDiagram: FactorizationDiagramPropsSchema,
    equivalentFractionModel: EquivalentFractionModelPropsSchema,
    subtractionWithRegrouping: SubtractionWithRegroupingPropsSchema,
    additionWithRegrouping: AdditionWithRegroupingPropsSchema
} as const

export const typedSchemas = allWidgetSchemas

// Re-export all individual schemas for use in collections
export {
    ThreeDIntersectionDiagramPropsSchema,
    AbsoluteValueNumberLinePropsSchema,
    AdditionWithRegroupingPropsSchema,
    AngleDiagramPropsSchema,
    AreaGraphPropsSchema,
    AreaModelMultiplicationPropsSchema,
    BarChartPropsSchema,
    BoxGridPropsSchema,
    BoxPlotPropsSchema,
    CircleDiagramPropsSchema,
    CompositeShapeDiagramPropsSchema,
    ConceptualGraphPropsSchema,
    ConstraintGeometryDiagramPropsSchema,
    CoordinatePlaneComprehensivePropsSchema,
    DataTablePropsSchema,
    DiscreteObjectRatioDiagramPropsSchema,
    DistanceFormulaGraphPropsSchema,
    DivergentBarChartPropsSchema,
    DivisionModelDiagramPropsSchema,
    DotPlotPropsSchema,
    DoubleNumberLinePropsSchema,
    EmojiImagePropsSchema,
    EquivalentFractionModelPropsSchema,
    FactorizationDiagramPropsSchema,
    FigureComparisonDiagramPropsSchema,
    FractionFrequencyPlotPropsSchema,
    FractionMultiplicationModelPropsSchema,
    FractionNumberLinePropsSchema,
    FractionModelDiagramPropsSchema,
    FreeBodyDiagramPropsSchema,
    FunctionPlotGraphPropsSchema,
    GeometricSolidDiagramPropsSchema,
    HangerDiagramPropsSchema,
    HistogramPropsSchema,
    InequalityNumberLinePropsSchema,
    KeelingCurvePropsSchema,
    LineEquationGraphPropsSchema,
    LineGraphPropsSchema,
    NPolygonPropsSchema,
    PatternDiagramPropsSchema,
    NumberLinePropsSchema,
    NumberLineForOppositesPropsSchema,
    NumberLineWithActionPropsSchema,
    NumberLineWithFractionGroupsPropsSchema,
    NumberSetDiagramPropsSchema,
    ParabolaGraphPropsSchema,
    ParallelogramTrapezoidDiagramPropsSchema,
    PartitionedShapePropsSchema,
    PentagonIntersectionDiagramPropsSchema,
    PeriodicTableWidgetPropsSchema,
    PieChartWidgetPropsSchema,
    PictographPropsSchema,
    PointPlotGraphPropsSchema,
    PolygonGraphPropsSchema,
    PolyhedronDiagramPropsSchema,
    PolyhedronNetDiagramPropsSchema,
    PopulationBarChartPropsSchema,
    PopulationChangeEventGraphPropsSchema,
    ProbabilitySpinnerPropsSchema,
    ProtractorAngleDiagramPropsSchema,
    RadiallyConstrainedAngleDiagramPropsSchema,
    PythagoreanProofDiagramPropsSchema,
    QuantityFractionalDiagramPropsSchema,
    RatioBoxDiagramPropsSchema,
    RectangularFrameDiagramPropsSchema,
    ScaleCopiesSliderPropsSchema,
    ScatterPlotPropsSchema,
    ShapeTransformationGraphPropsSchema,
    SimpleArrowPropsSchema,
    SinCosineWidgetPropsSchema,
    StackedItemsDiagramPropsSchema,
    SubtractionWithRegroupingPropsSchema,
    TapeDiagramPropsSchema,
    TransformationDiagramPropsSchema,
    TreeDiagramPropsSchema,
    TriangleDiagramPropsSchema,
    UnitBlockDiagramPropsSchema,
    UrlImageWidgetPropsSchema,
    VectorDiagramPropsSchema,
    VennDiagramPropsSchema,
    VerticalArithmeticSetupPropsSchema
}

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
    typedSchemas.constraintGeometryDiagram,
    typedSchemas.coordinatePlane,
    typedSchemas.distanceFormulaGraph,
    typedSchemas.divergentBarChart,
    typedSchemas.functionPlotGraph,
    typedSchemas.lineEquationGraph,
    typedSchemas.pointPlotGraph,
    typedSchemas.populationChangeEventGraph,
    typedSchemas.polygonGraph,
    typedSchemas.protractorAngleDiagram,
    typedSchemas.radiallyConstrainedAngleDiagram,
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
    typedSchemas.patternDiagram,
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
    typedSchemas.quantityFractionalDiagram,
    typedSchemas.ratioBoxDiagram,
    typedSchemas.rectangularFrameDiagram,
    typedSchemas.scaleCopiesSlider,
    typedSchemas.simpleArrow,
    typedSchemas.sinCosineWidget,
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
    typedSchemas.vectorDiagram,
    typedSchemas.parallelogramTrapezoidDiagram,
    typedSchemas.pieChart,
    typedSchemas.fractionFrequencyPlot,
    typedSchemas.freeBodyDiagram,
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


