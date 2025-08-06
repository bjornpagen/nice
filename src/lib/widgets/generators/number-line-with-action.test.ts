import { describe, expect, test } from "bun:test"
import { generateNumberLineWithAction, NumberLineWithActionPropsSchema } from "./number-line-with-action"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = NumberLineWithActionPropsSchema.parse(props)
	return generateNumberLineWithAction(parsedProps)
}

describe("generateNumberLineWithAction", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "numberLineWithAction" as const,
			width: null,
			height: null,
			orientation: null,
			min: 0,
			max: 20,
			tickInterval: 2,
			customLabels: [
				{ value: 5, text: "Start" },
				{ value: 8, text: "?" }
			],
			action: {
				startValue: 5,
				change: 3,
				label: "+3"
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "numberLineWithAction" as const,
			width: 600,
			height: 150,
			orientation: "horizontal" as const,
			min: -10,
			max: 30,
			tickInterval: 5,
			customLabels: [
				{ value: 8, text: "8°C" },
				{ value: 3, text: "?°C" }
			],
			action: {
				startValue: 8,
				change: -5,
				label: "-5°C"
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
