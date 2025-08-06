import { describe, expect, test } from "bun:test"
import { generateInequalityNumberLine, InequalityNumberLinePropsSchema } from "./inequality-number-line"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = InequalityNumberLinePropsSchema.parse(props)
	return generateInequalityNumberLine(parsedProps)
}

describe("generateInequalityNumberLine", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "inequalityNumberLine" as const,
			width: null,
			height: null,
			min: -10,
			max: 10,
			tickInterval: 2,
			inequalities: [
				{
					value: 3,
					type: "greater-than" as const,
					inclusive: false,
					color: null
				}
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "inequalityNumberLine" as const,
			width: 600,
			height: 100,
			min: -15,
			max: 15,
			tickInterval: 5,
			inequalities: [
				{
					value: -5,
					type: "less-than-or-equal" as const,
					inclusive: true,
					color: "#ff6b6b"
				},
				{
					value: 8,
					type: "greater-than" as const,
					inclusive: false,
					color: "#4ecdc4"
				}
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
