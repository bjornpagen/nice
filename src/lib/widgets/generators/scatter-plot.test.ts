import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { generateScatterPlot, ScatterPlotPropsSchema } from "./scatter-plot"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = ScatterPlotPropsSchema.safeParse(props)
	if (!parsedProps.success) {
		logger.error("scatter plot validation failed", { error: parsedProps.error })
		throw errors.new("invalid props for ScatterPlotPropsSchema")
	}
	return generateScatterPlot(parsedProps.data)
}

describe("generateScatterPlot", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "scatterPlot" as const,
			width: null,
			height: null,
			title: null,
			xAxis: {
				min: 0,
				max: 10,
				tickInterval: 2,
				label: "X Axis",
				gridLines: false
			},
			yAxis: {
				min: 0,
				max: 10,
				tickInterval: 2,
				label: "Y Axis",
				gridLines: false
			},
			points: [
				{ x: 2, y: 3, label: null },
				{ x: 5, y: 7, label: null },
				{ x: 8, y: 4, label: null }
			],
			lines: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "scatterPlot" as const,
			width: 600,
			height: 400,
			title: "Height vs Weight Correlation",
			xAxis: {
				min: 0,
				max: 80,
				tickInterval: 10,
				label: "Height (inches)",
				gridLines: true
			},
			yAxis: {
				min: 0,
				max: 200,
				tickInterval: 25,
				label: "Weight (lbs)",
				gridLines: true
			},
			points: [
				{ x: 60, y: 120, label: "A" },
				{ x: 65, y: 140, label: "B" },
				{ x: 70, y: 160, label: "C" },
				{ x: 72, y: 180, label: "D" }
			],
			lines: [{ type: "bestFit" as const, method: "linear" as const, label: null, style: null }]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with quadratic best fit", () => {
		const props = {
			type: "scatterPlot" as const,
			width: 500,
			height: 400,
			title: "Parabolic Trend",
			xAxis: {
				min: -5,
				max: 5,
				tickInterval: 1,
				label: "X Value",
				gridLines: true
			},
			yAxis: {
				min: -10,
				max: 30,
				tickInterval: 5,
				label: "Y Value",
				gridLines: true
			},
			points: [
				{ x: -4, y: 20, label: null },
				{ x: -3, y: 13, label: null },
				{ x: -2, y: 8, label: null },
				{ x: -1, y: 5, label: null },
				{ x: 0, y: 4, label: null },
				{ x: 1, y: 5, label: null },
				{ x: 2, y: 8, label: null },
				{ x: 3, y: 13, label: null },
				{ x: 4, y: 20, label: null }
			],
			lines: [{ type: "bestFit" as const, method: "quadratic" as const, label: "y = x² + 4", style: null }]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with multiple lines and custom styles", () => {
		const props = {
			type: "scatterPlot" as const,
			width: 600,
			height: 500,
			title: "Multiple Line Types",
			xAxis: {
				min: 0,
				max: 10,
				tickInterval: 1,
				label: "X Axis",
				gridLines: false
			},
			yAxis: {
				min: 0,
				max: 20,
				tickInterval: 2,
				label: "Y Axis",
				gridLines: false
			},
			points: [
				{ x: 1, y: 3, label: null },
				{ x: 2, y: 5, label: null },
				{ x: 3, y: 8, label: null },
				{ x: 4, y: 10, label: null },
				{ x: 5, y: 11, label: null },
				{ x: 6, y: 14, label: null },
				{ x: 7, y: 15, label: null },
				{ x: 8, y: 17, label: null }
			],
			lines: [
				{
					type: "bestFit" as const,
					method: "linear" as const,
					label: "Best Fit",
					style: { color: "#FF0000", strokeWidth: 3, dash: false }
				},
				{
					type: "twoPoints" as const,
					a: { x: 0, y: 2 },
					b: { x: 10, y: 18 },
					label: "Manual Line",
					style: { color: "#0000FF", strokeWidth: 2, dash: true }
				}
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with vertical line", () => {
		const props = {
			type: "scatterPlot" as const,
			width: 400,
			height: 400,
			title: "Vertical Line Example",
			xAxis: {
				min: 0,
				max: 10,
				tickInterval: 2,
				label: "Time",
				gridLines: true
			},
			yAxis: {
				min: 0,
				max: 100,
				tickInterval: 20,
				label: "Value",
				gridLines: true
			},
			points: [
				{ x: 2, y: 20, label: "Before" },
				{ x: 3, y: 35, label: null },
				{ x: 4, y: 45, label: null },
				{ x: 5, y: 60, label: "Event" },
				{ x: 6, y: 75, label: null },
				{ x: 7, y: 85, label: null },
				{ x: 8, y: 90, label: "After" }
			],
			lines: [
				{
					type: "twoPoints" as const,
					a: { x: 5, y: 0 },
					b: { x: 5, y: 100 },
					label: "Critical Point",
					style: { color: "#FF6600", strokeWidth: 2, dash: true }
				}
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with no lines (just scatter points)", () => {
		const props = {
			type: "scatterPlot" as const,
			width: 350,
			height: 350,
			title: "Pure Scatter Plot",
			xAxis: {
				min: 0,
				max: 50,
				tickInterval: 10,
				label: "Age (years)",
				gridLines: false
			},
			yAxis: {
				min: 0,
				max: 200,
				tickInterval: 40,
				label: "Score",
				gridLines: false
			},
			points: [
				{ x: 10, y: 45, label: "A" },
				{ x: 15, y: 65, label: "B" },
				{ x: 20, y: 85, label: "C" },
				{ x: 25, y: 120, label: "D" },
				{ x: 30, y: 140, label: "E" },
				{ x: 35, y: 155, label: "F" },
				{ x: 40, y: 170, label: "G" },
				{ x: 45, y: 180, label: "H" }
			],
			lines: []
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render line fitting exercise with multiple candidate lines", () => {
		const props = {
			type: "scatterPlot" as const,
			width: 425,
			height: 425,
			title: null,
			xAxis: {
				min: 0,
				max: 10,
				tickInterval: 1,
				label: "",
				gridLines: true
			},
			yAxis: {
				min: 0,
				max: 10,
				tickInterval: 1,
				label: "",
				gridLines: true
			},
			points: [
				// Points fall diagonally in narrow scatter between (1, 8) and (9, 7)
				{ x: 1, y: 8, label: null },
				{ x: 2, y: 7.9, label: null },
				{ x: 3, y: 7.8, label: null },
				{ x: 4, y: 7.6, label: null },
				{ x: 5, y: 7.5, label: null },
				{ x: 6, y: 7.4, label: null },
				{ x: 7, y: 7.3, label: null },
				{ x: 8, y: 7.1, label: null },
				{ x: 9, y: 7, label: null }
			],
			lines: [
				{
					// Line A: increases from (0, 1) through (6.5, 2)
					type: "twoPoints" as const,
					a: { x: 0, y: 1 },
					b: { x: 6.5, y: 2 },
					label: "A",
					style: { color: "#A52A2A", strokeWidth: 2, dash: false } // Maroon
				},
				{
					// Line B: decreases from (0, 8) through (10, 7)
					type: "twoPoints" as const,
					a: { x: 0, y: 8 },
					b: { x: 10, y: 7 },
					label: "B",
					style: { color: "#FFD700", strokeWidth: 2, dash: false } // Gold
				},
				{
					// Line C: increases from (0, 0) through (1, 2)
					type: "twoPoints" as const,
					a: { x: 0, y: 0 },
					b: { x: 1, y: 2 },
					label: "C",
					style: { color: "#228B22", strokeWidth: 2, dash: false } // Green
				}
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
