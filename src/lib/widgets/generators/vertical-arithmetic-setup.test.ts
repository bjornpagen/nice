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
			title: null,
			operand1: "123",
			operand2: "456",
			operator: "+" as const
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "verticalArithmeticSetup" as const,
			title: "Multiply these numbers:",
			operand1: "248",
			operand2: "37",
			operator: "×" as const
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
