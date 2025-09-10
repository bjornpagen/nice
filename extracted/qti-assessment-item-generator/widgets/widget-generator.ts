import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { Widget } from "./registry"
import { generateAbsoluteValueNumberLine } from "./generators/absolute-value-number-line"
import { generateAdditionWithRegrouping } from "./generators/addition-with-regrouping"
import { generateAngleDiagram } from "./generators/angle-diagram"
import { generateAreaGraph } from "./generators/area-graph"
import { generateAreaModelMultiplication } from "./generators/area-model-multiplication"
import { generateBarChart } from "./generators/bar-chart"
import { generateBoxGrid } from "./generators/box-grid"
import { generateBoxPlot } from "./generators/box-plot"
import { generateCircleDiagram } from "./generators/circle-diagram"
import { generateCompositeShapeDiagram } from "./generators/composite-shape-diagram"
import { generateConceptualGraph } from "./generators/conceptual-graph"
import { generateCoordinatePlaneComprehensive } from "./generators/coordinate-plane-comprehensive"
import { generateDataTable } from "./generators/data-table"
import { generateDiscreteObjectRatioDiagram } from "./generators/discrete-object-ratio-diagram"
import { generateDistanceFormulaGraph } from "./generators/distance-formula-graph"
import { generateDivergentBarChart } from "./generators/divergent-bar-chart"
import { generateDivisionModelDiagram } from "./generators/division-model-diagram"
import { generateDotPlot } from "./generators/dot-plot"
import { generateDoubleNumberLine } from "./generators/double-number-line"
import { generateEmojiImage } from "./generators/emoji-image"
import { generateEquivalentFractionModel } from "./generators/equivalent-fraction-model"
import { generateFactorizationDiagram } from "./generators/factorization-diagram"
import { generateFigureComparisonDiagram } from "./generators/figure-comparison-diagram"
import { generateFractionFrequencyPlot } from "./generators/fraction-frequency-plot"
import { generateFractionModelDiagram } from "./generators/fractional-model-diagram"
import { generateFractionMultiplicationModel } from "./generators/fraction-multiplication-model"
import { generateFractionNumberLine } from "./generators/fraction-number-line"
import { generateFreeBodyDiagram } from "./generators/free-body-diagram"
import { generateFunctionPlotGraph } from "./generators/function-plot-graph"
import { generateGeometricSolidDiagram } from "./generators/geometric-solid-diagram"
import { generateHangerDiagram } from "./generators/hanger-diagram"
import { generateHistogram } from "./generators/histogram"
import { generateInequalityNumberLine } from "./generators/inequality-number-line"
import { generateKeelingCurve } from "./generators/keeling-curve"
import { generateLineEquationGraph } from "./generators/line-equation-graph"
import { generateLineGraph } from "./generators/line-graph"
import { generateNPolygon } from "./generators/n-polygon"
import { generateNumberLine } from "./generators/number-line"
import { generateNumberLineForOpposites } from "./generators/number-line-for-opposites"
import { generateNumberLineWithAction } from "./generators/number-line-with-action"
import { generateNumberLineWithFractionGroups } from "./generators/number-line-with-fraction-groups"
import { generateNumberSetDiagram } from "./generators/number-set-diagram"
import { generateParabolaGraph } from "./generators/parabola-graph"
import { generateParallelogramTrapezoidDiagram } from "./generators/parallelogram-trapezoid-diagram"
import { generatePartitionedShape } from "./generators/partitioned-shape"
import { generatePatternDiagram } from "./generators/pattern-diagram"
import { generatePentagonIntersectionDiagram } from "./generators/pentagon-intersection-diagram"
import { generatePeriodicTable } from "./generators/periodic-table"
import { generatePictograph } from "./generators/pictograph"
import { generatePieChart } from "./generators/pi-chart"
import { generatePointPlotGraph } from "./generators/point-plot-graph"
import { generatePolygonGraph } from "./generators/polygon-graph"
import { generatePolyhedronDiagram } from "./generators/polyhedron-diagram"
import { generatePolyhedronNetDiagram } from "./generators/polyhedron-net-diagram"
import { generatePopulationBarChart } from "./generators/population-bar-chart"
import { generatePopulationChangeEventGraph } from "./generators/population-change-event-graph"
import { generateProbabilitySpinner } from "./generators/probability-spinner"
import { generateProtractorAngleDiagram } from "./generators/protractor-angle-diagram"
import { generatePythagoreanProofDiagram } from "./generators/pythagorean-proof-diagram"
import { generateQuantityFractionalDiagram } from "./generators/quantity-fractional-diagram"
import { generateRadiallyConstrainedAngleDiagram } from "./generators/radially-constrained-angle-diagram"
import { generateRatioBoxDiagram } from "./generators/ratio-box-diagram"
import { generateRectangularFrameDiagram } from "./generators/rectangular-frame-diagram"
import { generateScaleCopiesSlider } from "./generators/scale-copies-slider"
import { generateScatterPlot } from "./generators/scatter-plot"
import { generateShapeTransformationGraph } from "./generators/shape-transformation-graph"
import { generateSimpleArrow } from "./generators/simple-arrow"
import { generateSinCosineWidget } from "./generators/sin-cosine-widget"
import { generateStackedItemsDiagram } from "./generators/stacked-items-diagram"
import { generateSubtractionWithRegrouping } from "./generators/subtraction-with-regrouping"
import { generateTapeDiagram } from "./generators/tape-diagram"
import { generateThreeDIntersectionDiagram } from "./generators/3d-intersection-diagram"
import { generateTransformationDiagram } from "./generators/transformation-diagram"
import { generateTreeDiagram } from "./generators/tree-diagram"
import { generateTriangleDiagram } from "./generators/triangle-diagram"
import { generateUnitBlockDiagram } from "./generators/unit-block-diagram"
import { generateUrlImage } from "./generators/url-image"
import { generateVectorDiagram } from "./generators/vector-diagram"
import { generateVennDiagram } from "./generators/venn-diagram"
import { generateVerticalArithmeticSetup } from "./generators/vertical-arithmetic-setup"

export async function generateWidget(widget: Widget): Promise<string> {
	switch (widget.type) {
		case "areaGraph":
			return await generateAreaGraph(widget)
		case "areaModelMultiplication":
			return await generateAreaModelMultiplication(widget)
		case "threeDIntersectionDiagram":
			return await generateThreeDIntersectionDiagram(widget)
		case "absoluteValueNumberLine":
			return await generateAbsoluteValueNumberLine(widget)
		case "angleDiagram":
			return await generateAngleDiagram(widget)
		case "conceptualGraph":
			return await generateConceptualGraph(widget)
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
		case "compositeShapeDiagram":
			return await generateCompositeShapeDiagram(widget)
		case "coordinatePlane":
			return await generateCoordinatePlaneComprehensive(widget)
		case "divergentBarChart":
			return await generateDivergentBarChart(widget)
		case "distanceFormulaGraph":
			return await generateDistanceFormulaGraph(widget)

		case "functionPlotGraph":
			return await generateFunctionPlotGraph(widget)
		case "keelingCurve":
			return await generateKeelingCurve(widget)
		case "lineEquationGraph":
			return await generateLineEquationGraph(widget)
		case "lineGraph":
			return await generateLineGraph(widget)
		case "pointPlotGraph":
			return await generatePointPlotGraph(widget)
		case "polygonGraph":
			return await generatePolygonGraph(widget)
		case "shapeTransformationGraph":
			return await generateShapeTransformationGraph(widget)
		case "dataTable":
			return await generateDataTable(widget)
		case "discreteObjectRatioDiagram":
			return await generateDiscreteObjectRatioDiagram(widget)
		case "dotPlot":
			return await generateDotPlot(widget)
		case "doubleNumberLine":
			return await generateDoubleNumberLine(widget)
		case "parabolaGraph":
			return await generateParabolaGraph(widget)
		case "populationBarChart":
			return await generatePopulationBarChart(widget)
		case "populationChangeEventGraph":
			return await generatePopulationChangeEventGraph(widget)
		case "geometricSolidDiagram":
			return await generateGeometricSolidDiagram(widget)
		case "hangerDiagram":
			return await generateHangerDiagram(widget)
		case "histogram":
			return await generateHistogram(widget)
		case "nPolygon":
			return await generateNPolygon(widget)
		case "patternDiagram":
			return await generatePatternDiagram(widget)
		case "inequalityNumberLine":
			return await generateInequalityNumberLine(widget)
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
		case "partitionedShape":
			return await generatePartitionedShape(widget)
		case "pentagonIntersectionDiagram":
			return await generatePentagonIntersectionDiagram(widget)
		case "pictograph":
			return await generatePictograph(widget)
		case "polyhedronDiagram":
			return await generatePolyhedronDiagram(widget)
		case "probabilitySpinner":
			return await generateProbabilitySpinner(widget)
		case "protractorAngleDiagram":
			return await generateProtractorAngleDiagram(widget)
		case "radiallyConstrainedAngleDiagram":
			return await generateRadiallyConstrainedAngleDiagram(widget)
		case "polyhedronNetDiagram":
			return await generatePolyhedronNetDiagram(widget)
		case "pythagoreanProofDiagram":
			return await generatePythagoreanProofDiagram(widget)
		case "ratioBoxDiagram":
			return await generateRatioBoxDiagram(widget)
		case "rectangularFrameDiagram":
			return await generateRectangularFrameDiagram(widget)
		case "scaleCopiesSlider":
			return await generateScaleCopiesSlider(widget)
		case "scatterPlot":
			return await generateScatterPlot(widget)
		case "fractionMultiplicationModel":
			return await generateFractionMultiplicationModel(widget)
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
		case "vennDiagram":
			return await generateVennDiagram(widget)
		case "verticalArithmeticSetup":
			return await generateVerticalArithmeticSetup(widget)
		case "emojiImage":
			return await generateEmojiImage(widget)
		case "figureComparisonDiagram":
			return await generateFigureComparisonDiagram(widget)
		case "fractionNumberLine":
			return await generateFractionNumberLine(widget)
		case "parallelogramTrapezoidDiagram":
			return await generateParallelogramTrapezoidDiagram(widget)
		case "urlImage":
			return await generateUrlImage(widget)
		case "pieChart":
			return await generatePieChart(widget)
		case "subtractionWithRegrouping":
			return await generateSubtractionWithRegrouping(widget)
		case "fractionFrequencyPlot":
			return await generateFractionFrequencyPlot(widget)
		case "divisionModelDiagram":
			return await generateDivisionModelDiagram(widget)
		case "factorizationDiagram":
			return await generateFactorizationDiagram(widget)
		case "freeBodyDiagram":
			return await generateFreeBodyDiagram(widget)
		case "equivalentFractionModel":
			return await generateEquivalentFractionModel(widget)
		case "additionWithRegrouping":
			return await generateAdditionWithRegrouping(widget)
		case "quantityFractionalDiagram":
			return await generateQuantityFractionalDiagram(widget)
		case "simpleArrow":
			return await generateSimpleArrow(widget)
		case "sinCosineWidget":
			return await generateSinCosineWidget(widget)
		case "vectorDiagram":
			return await generateVectorDiagram(widget)
		default:
			logger.error("unknown widget type", { widget })
			throw errors.new(`Unknown widget type: ${JSON.stringify(widget)}`)
	}
}
