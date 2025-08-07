import { describe, expect, test } from "bun:test"
import { generatePolygonGraph } from "@/lib/widgets/generators/polygon-graph"

describe("generatePolygonGraph", () => {
	test("should render closed polygon (triangle)", () => {
		const props = {
			type: "polygonGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -10, max: 10, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -10, max: 10, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			points: [
				{ id: "A", x: -5, y: -3, label: "A", color: "#4285F4", style: "closed" as const },
				{ id: "B", x: 5, y: -3, label: "B", color: "#4285F4", style: "closed" as const },
				{ id: "C", x: 0, y: 5, label: "C", color: "#4285F4", style: "closed" as const }
			],
			polygons: [
				{
					vertices: ["A", "B", "C"],
					isClosed: true,
					fillColor: "rgba(66, 133, 244, 0.3)",
					strokeColor: "rgba(66, 133, 244, 1)",
					label: "Triangle ABC"
				}
			]
		}
		expect(generatePolygonGraph(props)).toMatchSnapshot()
	})

	test("should render open polyline", () => {
		const props = {
			type: "polygonGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -5, max: 5, tickInterval: 1, label: null, showGridLines: false },
			yAxis: { min: -5, max: 5, tickInterval: 1, label: null, showGridLines: false },
			showQuadrantLabels: true,
			points: [
				{ id: "P1", x: -4, y: 2, label: "P1", color: "red", style: "closed" as const },
				{ id: "P2", x: -2, y: -1, label: "P2", color: "red", style: "closed" as const },
				{ id: "P3", x: 0, y: 1, label: "P3", color: "red", style: "closed" as const },
				{ id: "P4", x: 2, y: -2, label: "P4", color: "red", style: "closed" as const },
				{ id: "P5", x: 4, y: 3, label: "P5", color: "red", style: "closed" as const }
			],
			polygons: [
				{
					vertices: ["P1", "P2", "P3", "P4", "P5"],
					isClosed: false,
					fillColor: "transparent",
					strokeColor: "red",
					label: null
				}
			]
		}
		expect(generatePolygonGraph(props)).toMatchSnapshot()
	})

	test("should render multiple polygons", () => {
		const props = {
			type: "polygonGraph" as const,
			width: 500,
			height: 500,
			xAxis: { min: -8, max: 8, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -8, max: 8, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			points: [
				// Square vertices
				{ id: "A", x: -6, y: -2, label: "A", color: "blue", style: "closed" as const },
				{ id: "B", x: -2, y: -2, label: "B", color: "blue", style: "closed" as const },
				{ id: "C", x: -2, y: 2, label: "C", color: "blue", style: "closed" as const },
				{ id: "D", x: -6, y: 2, label: "D", color: "blue", style: "closed" as const },
				// Pentagon vertices
				{ id: "E", x: 2, y: -3, label: "E", color: "green", style: "closed" as const },
				{ id: "F", x: 6, y: -1, label: "F", color: "green", style: "closed" as const },
				{ id: "G", x: 5, y: 3, label: "G", color: "green", style: "closed" as const },
				{ id: "H", x: 1, y: 3, label: "H", color: "green", style: "closed" as const },
				{ id: "I", x: 0, y: 0, label: "I", color: "green", style: "closed" as const }
			],
			polygons: [
				{
					vertices: ["A", "B", "C", "D"],
					isClosed: true,
					fillColor: "rgba(66, 133, 244, 0.2)",
					strokeColor: "blue",
					label: "Square"
				},
				{
					vertices: ["E", "F", "G", "H", "I"],
					isClosed: true,
					fillColor: "rgba(52, 168, 83, 0.2)",
					strokeColor: "green",
					label: "Pentagon"
				}
			]
		}
		expect(generatePolygonGraph(props)).toMatchSnapshot()
	})
})
