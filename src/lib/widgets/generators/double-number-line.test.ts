import { describe, expect, test } from "bun:test"
import { DoubleNumberLinePropsSchema, generateDoubleNumberLine } from "./double-number-line"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = DoubleNumberLinePropsSchema.parse(props)
	return generateDoubleNumberLine(parsedProps)
}

describe("generateDoubleNumberLine", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "doubleNumberLine" as const,
			width: null,
			height: null,
			topLine: {
				min: 0,
				max: 10,
				tickInterval: 2,
				label: null
			},
			bottomLine: {
				min: 0,
				max: 50,
				tickInterval: 10,
				label: null
			},
			correspondingPairs: null,
			highlightedValues: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "doubleNumberLine" as const,
			width: 600,
			height: 200,
			topLine: {
				min: 0,
				max: 8,
				tickInterval: 1,
				label: "Hours"
			},
			bottomLine: {
				min: 0,
				max: 80,
				tickInterval: 10,
				label: "Distance (miles)"
			},
			correspondingPairs: [
				{ topValue: 2, bottomValue: 20 },
				{ topValue: 5, bottomValue: 50 }
			],
			highlightedValues: {
				top: [3],
				bottom: [30]
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
