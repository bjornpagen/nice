import * as errors from "@superbuilders/errors"
import type { Widget } from "@/lib/widgets/generators"
import {
	generateAbsoluteValueNumberLine,
	generateAngleDiagram,
	generateBarChart,
	generateBoxGrid,
	generateBoxPlot,
	generateCircleDiagram,
	generateCompositeShapeDiagram,
	generateCoordinatePlane,
	generateDataTable,
	generateDiscreteObjectRatioDiagram,
	generateDistanceFormulaGraph,
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
	generateLineEquationGraph,
	generateNumberLine,
	generateNumberLineForOpposites,
	generateNumberLineWithAction,
	generateNumberLineWithFractionGroups,
	generateNumberSetDiagram,
	generateParallelogramTrapezoidDiagram,
	generatePartitionedShape,
	generatePentagonIntersectionDiagram,
	generatePictograph,
	generatePointPlotGraph,
	generatePolygonGraph,
	generatePolyhedronDiagram,
	generatePolyhedronNetDiagram,
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
	generateVennDiagram,
	generateVerticalArithmeticSetup
} from "@/lib/widgets/generators"

export function generateWidget(widget: Widget): string {
	switch (widget.type) {
		case "3dIntersectionDiagram":
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
			return generateCoordinatePlane(widget)
		case "distanceFormulaGraph":
			return generateDistanceFormulaGraph(widget)
		case "functionPlotGraph":
			return generateFunctionPlotGraph(widget)
		case "lineEquationGraph":
			return generateLineEquationGraph(widget)
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
		default:
			throw errors.new(`Unknown widget type: ${JSON.stringify(widget)}`)
	}
}
