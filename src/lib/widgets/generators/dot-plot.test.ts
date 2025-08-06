import { describe, expect, test } from "bun:test"
import { DotPlotPropsSchema, generateDotPlot } from "./dot-plot"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = DotPlotPropsSchema.parse(props)
	return generateDotPlot(parsedProps)
}

describe("generateDotPlot", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "dotPlot" as const,
			width: null,
			height: null,
			axis: {
				min: 0,
				max: 10,
				tickInterval: 1,
				label: null
			},
			data: [
				{ value: 2, count: 3 },
				{ value: 5, count: 1 },
				{ value: 7, count: 4 }
			],
			dotColor: null,
			dotRadius: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "dotPlot" as const,
			width: 500,
			height: 200,
			axis: {
				min: 0,
				max: 20,
				tickInterval: 2,
				label: "Score"
			},
			data: [
				{ value: 8, count: 2 },
				{ value: 12, count: 5 },
				{ value: 15, count: 3 },
				{ value: 18, count: 1 }
			],
			dotColor: "#4285f4",
			dotRadius: 6
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
