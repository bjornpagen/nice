import { describe, expect, test } from "bun:test"
import { generateVerticalArithmeticSetup, VerticalArithmeticSetupPropsSchema } from "./vertical-arithmetic-setup"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = VerticalArithmeticSetupPropsSchema.parse(props)
	return generateVerticalArithmeticSetup(parsedProps)
}

describe("generateVerticalArithmeticSetup", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "verticalArithmeticSetup" as const,
			width: null,
			height: null,
			operation: "addition" as const,
			numbers: ["123", "456"],
			result: null,
			showCarry: null,
			highlightSteps: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "verticalArithmeticSetup" as const,
			width: 300,
			height: 200,
			operation: "multiplication" as const,
			numbers: ["248", "37"],
			result: "9176",
			showCarry: true,
			highlightSteps: [
				{ step: 1, color: "#ffeb3b" },
				{ step: 2, color: "#4caf50" }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
