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
			radius: null,
			sectors: [
				{ label: "Red", angle: 90, color: "#ff6b6b" },
				{ label: "Blue", angle: 120, color: "#4ecdc4" },
				{ label: "Green", angle: 150, color: "#45b7d1" }
			],
			showArrow: null,
			arrowPosition: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "probabilitySpinner" as const,
			width: 350,
			height: 350,
			radius: 120,
			sectors: [
				{ label: "Win $10", angle: 60, color: "#4caf50" },
				{ label: "Win $5", angle: 90, color: "#8bc34a" },
				{ label: "Win $1", angle: 120, color: "#ffeb3b" },
				{ label: "Try Again", angle: 90, color: "#ff9800" }
			],
			showArrow: true,
			arrowPosition: 45
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
