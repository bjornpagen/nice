import { describe, expect, test } from "bun:test"
import { generatePointPlotGraph } from "@/lib/widgets/generators/point-plot-graph"

describe("generatePointPlotGraph", () => {
	test("should render simple point plot", () => {
		const props = {
			type: "pointPlotGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -10, max: 10, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -10, max: 10, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			points: [
				{ id: "A", x: -5, y: 3, label: "A", color: "#4285F4", style: "closed" as const },
				{ id: "B", x: 0, y: 0, label: "Origin", color: "#EA4335", style: "closed" as const },
				{ id: "C", x: 4, y: -6, label: "C", color: "#34A853", style: "closed" as const },
				{ id: "D", x: -3, y: -8, label: "D", color: "#FBBC04", style: "closed" as const },
				{ id: "E", x: 7, y: 5, label: "E", color: "#673AB7", style: "closed" as const }
			]
		}
		expect(generatePointPlotGraph(props)).toMatchSnapshot()
	})

	test("should render points with different styles", () => {
		const props = {
			type: "pointPlotGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -5, max: 5, tickInterval: 1, label: null, showGridLines: false },
			yAxis: { min: -5, max: 5, tickInterval: 1, label: null, showGridLines: false },
			showQuadrantLabels: true,
			points: [
				{ id: "P1", x: -2, y: 3, label: "Closed", color: "red", style: "closed" as const },
				{ id: "P2", x: 2, y: 3, label: "Open", color: "blue", style: "open" as const },
				{ id: "P3", x: -2, y: -3, label: null, color: "green", style: "closed" as const },
				{ id: "P4", x: 2, y: -3, label: "(2, -3)", color: "purple", style: "open" as const }
			]
		}
		expect(generatePointPlotGraph(props)).toMatchSnapshot()
	})

	test("should render with pi-based coordinates", () => {
		const props = {
			type: "pointPlotGraph" as const,
			width: 500,
			height: 400,
			xAxis: { min: -6.28, max: 6.28, tickInterval: 1.57, label: "x", showGridLines: true },
			yAxis: { min: -2, max: 2, tickInterval: 0.5, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			points: [
				{ id: "origin", x: 0, y: 0, label: "(0, 0)", color: "black", style: "closed" as const },
				{ id: "pi", x: Math.PI, y: 0, label: "(π, 0)", color: "red", style: "closed" as const },
				{ id: "neg-pi", x: -Math.PI, y: 0, label: "(-π, 0)", color: "red", style: "closed" as const },
				{ id: "pi-half", x: Math.PI / 2, y: 1, label: "(π/2, 1)", color: "blue", style: "closed" as const },
				{ id: "neg-pi-half", x: -Math.PI / 2, y: -1, label: "(-π/2, -1)", color: "blue", style: "closed" as const }
			]
		}
		expect(generatePointPlotGraph(props)).toMatchSnapshot()
	})

	test("should render clustered points", () => {
		const props = {
			type: "pointPlotGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -3, max: 3, tickInterval: 1, label: "x", showGridLines: true },
			yAxis: { min: -3, max: 3, tickInterval: 1, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			points: [
				// Cluster 1
				{ id: "A1", x: -2, y: 2, label: null, color: "red", style: "closed" as const },
				{ id: "A2", x: -1.8, y: 2.1, label: null, color: "red", style: "closed" as const },
				{ id: "A3", x: -2.1, y: 1.9, label: null, color: "red", style: "closed" as const },
				{ id: "A4", x: -1.9, y: 1.8, label: null, color: "red", style: "closed" as const },
				// Cluster 2
				{ id: "B1", x: 1.5, y: -1.5, label: null, color: "blue", style: "closed" as const },
				{ id: "B2", x: 1.6, y: -1.4, label: null, color: "blue", style: "closed" as const },
				{ id: "B3", x: 1.4, y: -1.6, label: null, color: "blue", style: "closed" as const },
				{ id: "B4", x: 1.5, y: -1.3, label: null, color: "blue", style: "closed" as const },
				// Outlier
				{ id: "OUT", x: 0, y: 0, label: "Outlier", color: "green", style: "open" as const }
			]
		}
		expect(generatePointPlotGraph(props)).toMatchSnapshot()
	})
})
