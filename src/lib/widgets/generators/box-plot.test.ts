import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { BoxPlotPropsSchema, ErrInvalidRange, generateBoxPlot } from "./box-plot"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = BoxPlotPropsSchema.parse(props)
	return generateBoxPlot(parsedProps)
}

describe("generateBoxPlot", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "boxPlot" as const,
			width: null,
			height: null,
			axis: {
				min: 0,
				max: 100,
				label: null,
				tickLabels: null
			},
			summary: { min: 10, q1: 25, median: 50, q3: 75, max: 95 },
			boxColor: null,
			medianColor: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "boxPlot" as const,
			width: 500,
			height: 150,
			axis: {
				min: 0,
				max: 100,
				label: "Number of cookies",
				tickLabels: [0, 20, 40, 60, 80, 100]
			},
			summary: { min: 5, q1: 30, median: 45, q3: 80, max: 100 },
			boxColor: "#fada5e",
			medianColor: "#d9534f"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should handle error case where axis.min >= axis.max", () => {
		const props = {
			type: "boxPlot" as const,
			width: 400,
			height: 150,
			axis: {
				min: 100,
				max: 0,
				label: null,
				tickLabels: null
			},
			summary: { min: 10, q1: 25, median: 50, q3: 75, max: 95 },
			boxColor: "#e0e0e0",
			medianColor: "#333333"
		}
		const result = errors.trySync(() => generateDiagram(props))
		if (result.error) {
			expect(errors.is(result.error, ErrInvalidRange)).toBe(true)
			expect(result.error.message).toMatchSnapshot()
		} else {
			throw errors.new("expected an error to be thrown")
		}
	})

	test("should render with custom colors", () => {
		const props = {
			type: "boxPlot" as const,
			width: 400,
			height: 150,
			axis: {
				min: 0,
				max: 50,
				label: null,
				tickLabels: [0, 10, 20, 30, 40, 50]
			},
			summary: { min: 5, q1: 15, median: 25, q3: 35, max: 45 },
			boxColor: "#90EE90",
			medianColor: "#FF1493"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should have sufficient padding for long axis labels", () => {
		const props = {
			type: "boxPlot" as const,
			width: 400,
			height: 150,
			axis: {
				min: 0,
				max: 100,
				label: "A very long and descriptive label for the horizontal axis to test spacing",
				tickLabels: [0, 20, 40, 60, 80, 100]
			},
			summary: { min: 5, q1: 30, median: 45, q3: 80, max: 100 },
			boxColor: "#e0e0e0",
			medianColor: "#333333"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
