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
			orientation: null,
			min: 0,
			max: 10,
			majorTickInterval: 1,
			minorTicksPerInterval: null,
			points: null,
			specialTickLabels: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "numberLine" as const,
			width: 600,
			height: 100,
			orientation: "horizontal" as const,
			min: -20,
			max: 20,
			majorTickInterval: 5,
			minorTicksPerInterval: 4,
			points: [
				{ value: -10, label: "A", color: "#ff6b6b", labelPosition: "above" as const },
				{ value: 0, label: "O", color: "#4ecdc4", labelPosition: "above" as const },
				{ value: 15, label: "B", color: "#45b7d1", labelPosition: "above" as const }
			],
			specialTickLabels: [{ value: 0, label: "Zero" }]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
