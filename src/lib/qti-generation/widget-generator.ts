import * as errors from "@superbuilders/errors"
import type { Widget } from "@/lib/widgets/generators"
import {
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
	generatePolyhedronNetDiagram,
	generateProbabilitySpinner,
	generatePythagoreanProofDiagram,
	generateScatterPlot,
	generateStackedItemsDiagram,
	generateTapeDiagram,
	generateThreeDIntersectionDiagram,
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
		case "boxPlot":
			return generateBoxPlot(widget)
		case "circleDiagram":
			return generateCircleDiagram(widget)
		case "compositeShapeDiagram":
			return generateCompositeShapeDiagram(widget)
		case "coordinatePlane":
			return generateCoordinatePlane(widget)
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
		case "parallelLinesTransversal":
			return generateParallelLinesTransversal(widget)
		case "partitionedShape":
			return generatePartitionedShape(widget)
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
		case "scatterPlot":
			return generateScatterPlot(widget)
		case "stackedItemsDiagram":
			return generateStackedItemsDiagram(widget)
		case "tapeDiagram":
			return generateTapeDiagram(widget)
		case "unitBlockDiagram":
			return generateUnitBlockDiagram(widget)
		case "vennDiagram":
			return generateVennDiagram(widget)
		case "verticalArithmeticSetup":
			return generateVerticalArithmeticSetup(widget)
		case "emojiImage":
			return generateEmojiImage(widget)
		case "fractionNumberLine":
			return generateFractionNumberLine(widget)
		default:
			throw errors.new(`Unknown widget type: ${JSON.stringify(widget)}`)
	}
}
