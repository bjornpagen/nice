import { describe, expect, test } from "bun:test"
import { generateNumberLineForOpposites, NumberLineForOppositesPropsSchema } from "./number-line-for-opposites"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = NumberLineForOppositesPropsSchema.parse(props)
	return generateNumberLineForOpposites(parsedProps)
}

describe("generateNumberLineForOpposites", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "numberLineForOpposites" as const,
			width: null,
			height: null,
			min: -10,
			max: 10,
			tickInterval: 2,
			opposites: [
				{ value: 4, color: null },
				{ value: -7, color: null }
			],
			showZero: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "numberLineForOpposites" as const,
			width: 600,
			height: 100,
			min: -15,
			max: 15,
			tickInterval: 3,
			opposites: [
				{ value: 6, color: "#4caf50" },
				{ value: -6, color: "#4caf50" },
				{ value: 9, color: "#2196f3" },
				{ value: -9, color: "#2196f3" }
			],
			showZero: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
