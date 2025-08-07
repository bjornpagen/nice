import { describe, expect, test } from "bun:test"
import { generateLineEquationGraph } from "@/lib/widgets/generators/line-equation-graph"

describe("generateLineEquationGraph", () => {
	test("should render slope-intercept form lines", () => {
		const props = {
			type: "lineEquationGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -10, max: 10, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -10, max: 10, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			lines: [
				{
					id: "line1",
					equation: { type: "slopeIntercept" as const, slope: 2, yIntercept: -3 },
					color: "blue",
					style: "solid" as const
				},
				{
					id: "line2",
					equation: { type: "slopeIntercept" as const, slope: -0.5, yIntercept: 5 },
					color: "red",
					style: "dashed" as const
				}
			],
			points: null
		}
		expect(generateLineEquationGraph(props)).toMatchSnapshot()
	})

	test("should render standard form lines including vertical line", () => {
		const props = {
			type: "lineEquationGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -5, max: 5, tickInterval: 1, label: null, showGridLines: false },
			yAxis: { min: -5, max: 5, tickInterval: 1, label: null, showGridLines: false },
			showQuadrantLabels: true,
			lines: [
				{
					id: "diagonal",
					equation: { type: "standard" as const, A: 3, B: -2, C: 6 },
					color: "green",
					style: "solid" as const
				},
				{
					id: "vertical",
					equation: { type: "standard" as const, A: 1, B: 0, C: -3 }, // x = 3
					color: "purple",
					style: "dashed" as const
				},
				{
					id: "horizontal",
					equation: { type: "standard" as const, A: 0, B: 1, C: 2 }, // y = -2
					color: "orange",
					style: "solid" as const
				}
			],
			points: [
				{ id: "P1", x: 3, y: 0, label: "x = 3", color: "purple", style: "open" as const },
				{ id: "P2", x: 0, y: -2, label: "y = -2", color: "orange", style: "open" as const }
			]
		}
		expect(generateLineEquationGraph(props)).toMatchSnapshot()
	})

	test("should render point-slope form lines", () => {
		const props = {
			type: "lineEquationGraph" as const,
			width: 500,
			height: 500,
			xAxis: { min: -8, max: 8, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -8, max: 8, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			lines: [
				{
					id: "line1",
					equation: { type: "pointSlope" as const, x1: -2, y1: 3, slope: 1.5 },
					color: "red",
					style: "solid" as const
				},
				{
					id: "line2",
					equation: { type: "pointSlope" as const, x1: 4, y1: -1, slope: -2 },
					color: "blue",
					style: "dashed" as const
				}
			],
			points: [
				{ id: "P1", x: -2, y: 3, label: "(-2, 3)", color: "red", style: "closed" as const },
				{ id: "P2", x: 4, y: -1, label: "(4, -1)", color: "blue", style: "closed" as const }
			]
		}
		expect(generateLineEquationGraph(props)).toMatchSnapshot()
	})

	test("should render mixed equation types", () => {
		const props = {
			type: "lineEquationGraph" as const,
			width: 600,
			height: 600,
			xAxis: { min: -10, max: 10, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -10, max: 10, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			lines: [
				{
					id: "slope-intercept",
					equation: { type: "slopeIntercept" as const, slope: 0.75, yIntercept: 2 },
					color: "green",
					style: "solid" as const
				},
				{
					id: "standard",
					equation: { type: "standard" as const, A: 2, B: 3, C: -6 },
					color: "purple",
					style: "dashed" as const
				},
				{
					id: "point-slope",
					equation: { type: "pointSlope" as const, x1: 0, y1: 0, slope: -1 },
					color: "orange",
					style: "solid" as const
				}
			],
			points: [
				{ id: "origin", x: 0, y: 0, label: "Origin", color: "black", style: "closed" as const },
				{ id: "y-int", x: 0, y: 2, label: "(0, 2)", color: "green", style: "open" as const }
			]
		}
		expect(generateLineEquationGraph(props)).toMatchSnapshot()
	})
})
