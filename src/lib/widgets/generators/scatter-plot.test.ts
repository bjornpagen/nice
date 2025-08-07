import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { generateScatterPlot, ScatterPlotPropsSchema } from "./scatter-plot"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = ScatterPlotPropsSchema.safeParse(props)
	if (!parsedProps.success) {
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
			trendLine: "linear" as const
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
