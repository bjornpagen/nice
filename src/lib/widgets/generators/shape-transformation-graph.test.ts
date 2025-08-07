import { describe, expect, test } from "bun:test"
import { generateShapeTransformationGraph } from "@/lib/widgets/generators/shape-transformation-graph"

describe("generateShapeTransformationGraph", () => {
	test("should render translation transformation", () => {
		const props = {
			type: "shapeTransformationGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -10, max: 10, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -10, max: 10, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			preImage: {
				vertices: [
					{ x: -3, y: -2 },
					{ x: -1, y: -2 },
					{ x: -1, y: 1 },
					{ x: -3, y: 1 }
				],
				color: "rgba(66, 133, 244, 0.5)",
				label: "Pre-image"
			},
			transformation: {
				type: "translation" as const,
				vector: { x: 5, y: 3 }
			},
			points: null
		}
		expect(generateShapeTransformationGraph(props)).toMatchSnapshot()
	})

	test("should render reflection across y-axis", () => {
		const props = {
			type: "shapeTransformationGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -8, max: 8, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -8, max: 8, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: true,
			preImage: {
				vertices: [
					{ x: 2, y: 1 },
					{ x: 5, y: 1 },
					{ x: 3.5, y: 4 }
				],
				color: "rgba(234, 67, 53, 0.5)",
				label: "ABC"
			},
			transformation: {
				type: "reflection" as const,
				axis: "y" as const
			},
			points: [{ id: "y-axis", x: 0, y: 0, label: "O", color: "black", style: "closed" as const }]
		}
		expect(generateShapeTransformationGraph(props)).toMatchSnapshot()
	})

	test("should render rotation transformation", () => {
		const props = {
			type: "shapeTransformationGraph" as const,
			width: 500,
			height: 500,
			xAxis: { min: -10, max: 10, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -10, max: 10, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			preImage: {
				vertices: [
					{ x: 4, y: 2 },
					{ x: 6, y: 2 },
					{ x: 6, y: 5 },
					{ x: 4, y: 5 }
				],
				color: "rgba(52, 168, 83, 0.5)",
				label: "Square"
			},
			transformation: {
				type: "rotation" as const,
				center: { x: 0, y: 0 },
				angle: 90
			},
			points: [{ id: "center", x: 0, y: 0, label: "Center", color: "red", style: "closed" as const }]
		}
		expect(generateShapeTransformationGraph(props)).toMatchSnapshot()
	})

	test("should render dilation transformation", () => {
		const props = {
			type: "shapeTransformationGraph" as const,
			width: 600,
			height: 600,
			xAxis: { min: -15, max: 15, tickInterval: 3, label: "x", showGridLines: true },
			yAxis: { min: -15, max: 15, tickInterval: 3, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			preImage: {
				vertices: [
					{ x: 1, y: 1 },
					{ x: 3, y: 1 },
					{ x: 2, y: 3 }
				],
				color: "rgba(251, 188, 5, 0.5)",
				label: "Original"
			},
			transformation: {
				type: "dilation" as const,
				center: { x: 0, y: 0 },
				scaleFactor: 2.5
			},
			points: [{ id: "center", x: 0, y: 0, label: "Center", color: "purple", style: "closed" as const }]
		}
		expect(generateShapeTransformationGraph(props)).toMatchSnapshot()
	})
})
