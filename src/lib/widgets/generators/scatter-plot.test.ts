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
				label: null,
				showGridLines: null
			},
			yAxis: {
				min: 0,
				max: 10,
				tickInterval: 2,
				label: null,
				showGridLines: null
			},
			data: [
				{ x: 2, y: 3, label: null, color: null },
				{ x: 5, y: 7, label: null, color: null },
				{ x: 8, y: 4, label: null, color: null }
			],
			trendLine: null
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
				showGridLines: true
			},
			yAxis: {
				min: 0,
				max: 200,
				tickInterval: 25,
				label: "Weight (lbs)",
				showGridLines: true
			},
			data: [
				{ x: 60, y: 120, label: "A", color: "#4caf50" },
				{ x: 65, y: 140, label: "B", color: "#2196f3" },
				{ x: 70, y: 160, label: "C", color: "#ff9800" },
				{ x: 72, y: 180, label: "D", color: "#f44336" }
			],
			trendLine: {
				show: true,
				color: "#9c27b0",
				style: "dashed" as const
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
