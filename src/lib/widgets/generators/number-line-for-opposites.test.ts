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
			maxAbsValue: 10,
			tickInterval: 2,
			value: 7,
			positiveLabel: null,
			negativeLabel: null,
			showArrows: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "numberLineForOpposites" as const,
			width: 600,
			height: 100,
			maxAbsValue: 15,
			tickInterval: 3,
			value: 9,
			positiveLabel: "9",
			negativeLabel: "?",
			showArrows: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
