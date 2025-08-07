import { describe, expect, test } from "bun:test"
import { generateFunctionPlotGraph } from "@/lib/widgets/generators/function-plot-graph"

describe("generateFunctionPlotGraph", () => {
	test("should render simple quadratic function", () => {
		const props = {
			type: "functionPlotGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -5, max: 5, tickInterval: 1, label: "x", showGridLines: true },
			yAxis: { min: -5, max: 15, tickInterval: 5, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			polylines: [
				{
					id: "parabola",
					points: [
						{ x: -5, y: 25 },
						{ x: -4, y: 16 },
						{ x: -3, y: 9 },
						{ x: -2, y: 4 },
						{ x: -1, y: 1 },
						{ x: 0, y: 0 },
						{ x: 1, y: 1 },
						{ x: 2, y: 4 },
						{ x: 3, y: 9 },
						{ x: 4, y: 16 },
						{ x: 5, y: 25 }
					],
					color: "blue",
					style: "solid" as const
				}
			],
			points: [{ id: "vertex", x: 0, y: 0, label: "Vertex", color: "red", style: "closed" as const }]
		}
		expect(generateFunctionPlotGraph(props)).toMatchSnapshot()
	})

	test("should render multiple functions", () => {
		const props = {
			type: "functionPlotGraph" as const,
			width: 500,
			height: 500,
			xAxis: { min: -10, max: 10, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -10, max: 10, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: true,
			polylines: [
				{
					id: "linear",
					points: [
						{ x: -10, y: -5 },
						{ x: -5, y: -2.5 },
						{ x: 0, y: 0 },
						{ x: 5, y: 2.5 },
						{ x: 10, y: 5 }
					],
					color: "green",
					style: "solid" as const
				},
				{
					id: "cubic",
					points: [
						{ x: -3, y: -27 },
						{ x: -2, y: -8 },
						{ x: -1, y: -1 },
						{ x: 0, y: 0 },
						{ x: 1, y: 1 },
						{ x: 2, y: 8 },
						{ x: 3, y: 27 }
					],
					color: "purple",
					style: "dashed" as const
				}
			],
			points: null
		}
		expect(generateFunctionPlotGraph(props)).toMatchSnapshot()
	})

	test("should render trigonometric function", () => {
		const props = {
			type: "functionPlotGraph" as const,
			width: 600,
			height: 400,
			xAxis: { min: -6.28, max: 6.28, tickInterval: 1.57, label: "x", showGridLines: true },
			yAxis: { min: -2, max: 2, tickInterval: 0.5, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			polylines: [
				{
					id: "sine",
					points: Array.from({ length: 41 }, (_, i) => {
						const x = -6.28 + (i * 12.56) / 40
						return { x, y: Math.sin(x) }
					}),
					color: "red",
					style: "solid" as const
				},
				{
					id: "cosine",
					points: Array.from({ length: 41 }, (_, i) => {
						const x = -6.28 + (i * 12.56) / 40
						return { x, y: Math.cos(x) }
					}),
					color: "blue",
					style: "dashed" as const
				}
			],
			points: [
				{ id: "origin", x: 0, y: 0, label: "O", color: "black", style: "closed" as const },
				{ id: "pi", x: 3.14, y: 0, label: "π", color: "gray", style: "open" as const },
				{ id: "neg-pi", x: -3.14, y: 0, label: "-π", color: "gray", style: "open" as const }
			]
		}
		expect(generateFunctionPlotGraph(props)).toMatchSnapshot()
	})
})
