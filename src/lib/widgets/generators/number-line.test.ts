import { describe, expect, test } from "bun:test"
import { generateNumberLine, NumberLinePropsSchema } from "./number-line"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = NumberLinePropsSchema.parse(props)
	return generateNumberLine(parsedProps)
}

describe("generateNumberLine", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "numberLine" as const,
			width: null,
			height: null,
			min: 0,
			max: 10,
			tickInterval: 1,
			markedPoints: null,
			highlightedRegions: null,
			showZero: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "numberLine" as const,
			width: 600,
			height: 100,
			min: -20,
			max: 20,
			tickInterval: 5,
			markedPoints: [
				{ value: -10, label: "A", color: "#ff6b6b" },
				{ value: 0, label: "O", color: "#4ecdc4" },
				{ value: 15, label: "B", color: "#45b7d1" }
			],
			highlightedRegions: [
				{ start: -15, end: -5, color: "rgba(255, 107, 107, 0.3)" },
				{ start: 5, end: 18, color: "rgba(69, 183, 209, 0.3)" }
			],
			showZero: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
