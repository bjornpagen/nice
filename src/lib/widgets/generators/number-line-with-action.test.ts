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
			min: 0,
			max: 20,
			tickInterval: 2,
			startPosition: 5,
			actions: [
				{ type: "move" as const, amount: 3, color: null },
				{ type: "move" as const, amount: -2, color: null }
			],
			showSteps: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "numberLineWithAction" as const,
			width: 600,
			height: 150,
			min: -10,
			max: 30,
			tickInterval: 5,
			startPosition: 8,
			actions: [
				{ type: "move" as const, amount: 7, color: "#4caf50" },
				{ type: "move" as const, amount: -12, color: "#f44336" },
				{ type: "move" as const, amount: 5, color: "#2196f3" }
			],
			showSteps: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
