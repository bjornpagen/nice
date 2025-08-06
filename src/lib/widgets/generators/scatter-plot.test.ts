import { describe, expect, test } from "bun:test"
import { generateScatterPlot, ScatterPlotPropsSchema } from "./scatter-plot"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = ScatterPlotPropsSchema.parse(props)
	return generateScatterPlot(parsedProps)
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
				gridLines: null
			},
			yAxis: {
				min: 0,
				max: 10,
				tickInterval: 2,
				label: "Y Axis",
				gridLines: null
			},
			points: [
				{ x: 2, y: 3, label: null },
				{ x: 5, y: 7, label: null },
				{ x: 8, y: 4, label: null }
			],
			trendLines: null
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
			trendLines: [
				{
					id: "trend1",
					label: "Linear Trend",
					color: "#9c27b0",
					style: "dashed" as const,
					data: {
						type: "linear" as const,
						slope: 2.5,
						yIntercept: 20
					}
				}
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
