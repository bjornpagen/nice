import { describe, expect, test } from "bun:test"
import { generateProbabilitySpinner, ProbabilitySpinnerPropsSchema } from "./probability-spinner"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = ProbabilitySpinnerPropsSchema.parse(props)
	return generateProbabilitySpinner(parsedProps)
}

describe("generateProbabilitySpinner", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "probabilitySpinner" as const,
			width: null,
			height: null,
			groups: [
				{ count: 2, emoji: "🔴", color: "#ff6b6b" },
				{ count: 3, emoji: "🔵", color: "#4ecdc4" },
				{ count: 1, emoji: "🟢", color: "#45b7d1" }
			],
			pointerAngle: null,
			title: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "probabilitySpinner" as const,
			width: 350,
			height: 350,
			groups: [
				{ count: 1, emoji: "💰", color: "#4caf50" },
				{ count: 2, emoji: "💵", color: "#8bc34a" },
				{ count: 3, emoji: "💸", color: "#ffeb3b" },
				{ count: 2, emoji: "🔄", color: "#ff9800" }
			],
			pointerAngle: 45,
			title: "Spin to Win!"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
