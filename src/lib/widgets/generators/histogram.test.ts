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
				label: "Score Range",
				max: null,
				tickInterval: null
			},
			yAxis: {
				label: "Frequency",
				max: null,
				tickInterval: null
			},
			bins: [
				{ label: "0-20", frequency: 5 },
				{ label: "20-40", frequency: 12 },
				{ label: "40-60", frequency: 8 },
				{ label: "60-80", frequency: 15 },
				{ label: "80-100", frequency: 3 }
			]
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
				label: "Score Range",
				max: 100,
				tickInterval: 10
			},
			yAxis: {
				label: "Frequency",
				max: 25,
				tickInterval: 5
			},
			bins: [
				{ label: "0-20", frequency: 2 },
				{ label: "20-40", frequency: 8 },
				{ label: "40-60", frequency: 15 },
				{ label: "60-80", frequency: 20 },
				{ label: "80-100", frequency: 12 }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
