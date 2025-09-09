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
	generateFractionModelDiagram,
	generateFractionNumberLine,
	generateFunctionPlotGraph,
	generateGeometricSolidDiagram,
	generateHangerDiagram,
	generateHistogram,
	generateInequalityNumberLine,
	generateKeelingCurve,
	generateLineEquationGraph,
	generateLineGraph,
	generateNPolygon,
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
	generateSubtractionWithRegrouping,
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
import { generateAdditionWithRegrouping } from "@/lib/widgets/generators/addition-with-regrouping"
import { generateAreaModelMultiplication } from "@/lib/widgets/generators/area-model-multiplication"
import { generateDivisionModelDiagram } from "@/lib/widgets/generators/division-model-diagram"
import { generateSingleFractionalModelDiagram } from "@/lib/widgets/generators/single-fractional-model-diagram"
import { generateEquivalentFractionModel } from "@/lib/widgets/generators/equivalent-fraction-model"
import { generateFactorizationDiagram } from "@/lib/widgets/generators/factorization-diagram"
import { generateFractionFrequencyPlot } from "@/lib/widgets/generators/fraction-frequency-plot"
import { generateSimpleArrow } from "@/lib/widgets/generators/simple-arrow"
import { generateVectorDiagram } from "@/lib/widgets/generators/vector-diagram"

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
			return await generateCoordinatePlane(widget)
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
		case "equivalentFractionModel":
			return await generateEquivalentFractionModel(widget)
		case "additionWithRegrouping":
			return await generateAdditionWithRegrouping(widget)
		case "simpleArrow":
			return await generateSimpleArrow(widget)
		case "vectorDiagram":
			return await generateVectorDiagram(widget)
		default:
			logger.error("unknown widget type", { widget })
			throw errors.new(`Unknown widget type: ${JSON.stringify(widget)}`)
	}
}
