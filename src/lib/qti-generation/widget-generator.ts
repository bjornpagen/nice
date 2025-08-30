import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { Widget } from "@/lib/widgets/generators"
import {
	generateAbsoluteValueNumberLine,
	generateAngleDiagram,
	generateAreaGraph,
	generateBarChart,
	generateBoxGrid,
	generateBoxPlot,
	generateCircleDiagram,
	generateCompositeShapeDiagram,
	generateConceptualGraph,
	generateCoordinatePlane,
	generateDataTable,
	generateDiscreteObjectRatioDiagram,
	generateDistanceFormulaGraph,
	generateDivergentBarChart,
	generateDotPlot,
	generateDoubleNumberLine,
	generateEmojiImage,
	generateFigureComparisonDiagram,
	generateFractionNumberLine,
	generateFunctionPlotGraph,
	generateGeometricSolidDiagram,
	generateHangerDiagram,
	generateHistogram,

	generateInequalityNumberLine,
	generateKeelingCurve,
	generateLineEquationGraph,
	generateLineGraph,
	generateNumberLine,
	generateNumberLineForOpposites,
	generateNumberLineWithAction,
	generateNumberLineWithFractionGroups,
	generateNumberSetDiagram,
	generateParabolaGraph,
	generateParallelogramTrapezoidDiagram,
	generatePartitionedShape,
	generatePentagonIntersectionDiagram,
	generatePeriodicTable,
	generatePictograph,
	generatePieChart,
	generatePointPlotGraph,
	generatePolygonGraph,
	generatePolyhedronDiagram,
	generatePolyhedronNetDiagram,
	generatePopulationBarChart,
	generatePopulationChangeEventGraph,
	generateProbabilitySpinner,
	generatePythagoreanProofDiagram,
	generateRatioBoxDiagram,
	generateRectangularFrameDiagram,
	generateScaleCopiesSlider,
	generateScatterPlot,
	generateShapeTransformationGraph,
	generateStackedItemsDiagram,
	generateTapeDiagram,
	generateThreeDIntersectionDiagram,
	generateTransformationDiagram,
	generateTreeDiagram,
	generateTriangleDiagram,
	generateUnitBlockDiagram,
	generateUrlImage,
	generateVennDiagram,
	generateVerticalArithmeticSetup
} from "@/lib/widgets/generators"

export function generateWidget(widget: Widget): string {
	switch (widget.type) {
		case "areaGraph":
			return generateAreaGraph(widget)
		case "threeDIntersectionDiagram":
			return generateThreeDIntersectionDiagram(widget)
		case "absoluteValueNumberLine":
			return generateAbsoluteValueNumberLine(widget)
		case "angleDiagram":
			return generateAngleDiagram(widget)
		case "conceptualGraph":
			return generateConceptualGraph(widget)
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
			return generateCoordinatePlane(widget)
		case "divergentBarChart":
			return generateDivergentBarChart(widget)
		case "distanceFormulaGraph":
			return generateDistanceFormulaGraph(widget)

		case "functionPlotGraph":
			return generateFunctionPlotGraph(widget)
		case "keelingCurve":
			return generateKeelingCurve(widget)
		case "lineEquationGraph":
			return generateLineEquationGraph(widget)
		case "lineGraph":
			return generateLineGraph(widget)
		case "pointPlotGraph":
			return generatePointPlotGraph(widget)
		case "polygonGraph":
			return generatePolygonGraph(widget)
		case "shapeTransformationGraph":
			return generateShapeTransformationGraph(widget)
		case "dataTable":
			return generateDataTable(widget)
		case "discreteObjectRatioDiagram":
			return generateDiscreteObjectRatioDiagram(widget)
		case "dotPlot":
			return generateDotPlot(widget)
		case "doubleNumberLine":
			return generateDoubleNumberLine(widget)
		case "parabolaGraph":
			return generateParabolaGraph(widget)
		case "populationBarChart":
			return generatePopulationBarChart(widget)
		case "populationChangeEventGraph":
			return generatePopulationChangeEventGraph(widget)
		case "geometricSolidDiagram":
			return generateGeometricSolidDiagram(widget)
		case "hangerDiagram":
			return generateHangerDiagram(widget)
		case "histogram":
			return generateHistogram(widget)
		case "inequalityNumberLine":
			return generateInequalityNumberLine(widget)
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
		case "partitionedShape":
			return generatePartitionedShape(widget)
		case "pentagonIntersectionDiagram":
			return generatePentagonIntersectionDiagram(widget)
		case "pictograph":
			return generatePictograph(widget)
		case "polyhedronDiagram":
			return generatePolyhedronDiagram(widget)
		case "probabilitySpinner":
			return generateProbabilitySpinner(widget)
		case "polyhedronNetDiagram":
			return generatePolyhedronNetDiagram(widget)
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
		case "vennDiagram":
			return generateVennDiagram(widget)
		case "verticalArithmeticSetup":
			return generateVerticalArithmeticSetup(widget)
		case "emojiImage":
			return generateEmojiImage(widget)
		case "figureComparisonDiagram":
			return generateFigureComparisonDiagram(widget)
		case "fractionNumberLine":
			return generateFractionNumberLine(widget)
		case "parallelogramTrapezoidDiagram":
			return generateParallelogramTrapezoidDiagram(widget)
		case "urlImage":
			return generateUrlImage(widget)
		case "pieChart":
			return generatePieChart(widget)
		default:
			logger.error("unknown widget type", { widget })
			throw errors.new(`Unknown widget type: ${JSON.stringify(widget)}`)
	}
}
