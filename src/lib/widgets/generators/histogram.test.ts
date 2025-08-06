import { describe, expect, test } from "bun:test"
import { generateHistogram, HistogramPropsSchema } from "./histogram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = HistogramPropsSchema.parse(props)
	return generateHistogram(parsedProps)
}

describe("generateHistogram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "histogram" as const,
			width: null,
			height: null,
			title: null,
			xAxis: {
				min: 0,
				max: 100,
				tickInterval: 10,
				label: null
			},
			yAxis: {
				min: 0,
				max: 20,
				tickInterval: 5,
				label: null
			},
			bins: [
				{ min: 0, max: 20, frequency: 5 },
				{ min: 20, max: 40, frequency: 12 },
				{ min: 40, max: 60, frequency: 8 },
				{ min: 60, max: 80, frequency: 15 },
				{ min: 80, max: 100, frequency: 3 }
			],
			barColor: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "histogram" as const,
			width: 600,
			height: 400,
			title: "Test Score Distribution",
			xAxis: {
				min: 0,
				max: 100,
				tickInterval: 10,
				label: "Score Range"
			},
			yAxis: {
				min: 0,
				max: 25,
				tickInterval: 5,
				label: "Frequency"
			},
			bins: [
				{ min: 0, max: 20, frequency: 2 },
				{ min: 20, max: 40, frequency: 8 },
				{ min: 40, max: 60, frequency: 15 },
				{ min: 60, max: 80, frequency: 20 },
				{ min: 80, max: 100, frequency: 12 }
			],
			barColor: "#4285f4"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
