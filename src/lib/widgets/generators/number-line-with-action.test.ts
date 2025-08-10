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
			width: 260,
			height: 150,
			orientation: "horizontal" as const,
			min: 0,
			max: 20,
			tickInterval: 2,
			startValue: 5,
			customLabels: [
				{ value: 5, text: "Start" },
				{ value: 8, text: "?" }
			],
			actions: [{ delta: 3, label: "+3" }]
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
			startValue: 8,
			customLabels: [
				{ value: 8, text: "8°C" },
				{ value: 3, text: "?°C" }
			],
			actions: [{ delta: -5, label: "-5°C" }]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render multi-step actions", () => {
		const props = {
			type: "numberLineWithAction" as const,
			width: 700,
			height: 180,
			orientation: "horizontal" as const,
			min: 0,
			max: 25,
			tickInterval: 5,
			startValue: 5,
			customLabels: [
				{ value: 5, text: "Start" },
				{ value: 20, text: "End" }
			],
			actions: [
				{ delta: 8, label: "+8" },
				{ delta: -3, label: "-3" },
				{ delta: 10, label: "+10" }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
