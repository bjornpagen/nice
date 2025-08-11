import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { BarChartPropsSchema, ErrInvalidDimensions, generateBarChart } from "@/lib/widgets/generators/bar-chart"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const validation = BarChartPropsSchema.safeParse(props)
	if (!validation.success) {
		throw errors.wrap(validation.error, "input validation")
	}
	return generateBarChart(validation.data)
}

describe("generateBarChart", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "barChart" as const,
			width: 400,
			height: 300,
			title: "",
			xAxisLabel: "",
			yAxis: {
				min: 0,
				max: 42,
				tickInterval: 10,
				label: ""
			},
			data: [
				{ label: "A", value: 25, state: "normal" as const },
				{ label: "B", value: 42, state: "unknown" as const }
			],
			barColor: "#4285F4"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "barChart" as const,
			width: 500,
			height: 350,
			title: "Puppet Count",
			xAxisLabel: "Puppeteer",
			yAxis: {
				label: "Number of Puppets",
				min: 0,
				max: 100,
				tickInterval: 20
			},
			data: [
				{ label: "Glenda", value: 80, state: "normal" as const },
				{ label: "Bartholomew", value: 55, state: "normal" as const },
				{ label: "Xylia", value: 95, state: "unknown" as const }
			],
			barColor: "purple"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should handle empty data array", () => {
		const props = {
			type: "barChart" as const,
			width: 400,
			height: 300,
			title: "",
			xAxisLabel: "",
			yAxis: {
				min: 0,
				max: 50,
				tickInterval: 10,
				label: ""
			},
			data: [],
			barColor: "#4285F4"
		}
		const result = errors.trySync(() => generateDiagram(props))
		if (result.error) {
			expect(errors.is(result.error, ErrInvalidDimensions)).toBe(true)
			expect(result.error.message).toMatchSnapshot()
		} else {
			throw errors.new("expected an error to be thrown")
		}
	})
})
