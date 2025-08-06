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
			ranges: [
				{
					start: null,
					end: {
						value: 3,
						type: "open" as const
					},
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
			ranges: [
				{
					start: null,
					end: {
						value: -5,
						type: "closed" as const
					},
					color: "#ff6b6b"
				},
				{
					start: {
						value: 8,
						type: "open" as const
					},
					end: null,
					color: "#4ecdc4"
				}
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should throw error when min >= max", () => {
		const props = {
			type: "inequalityNumberLine" as const,
			width: null,
			height: null,
			min: 10,
			max: 5, // Invalid: min >= max
			tickInterval: 1,
			ranges: [
				{
					start: null,
					end: { value: 3, type: "open" as const },
					color: null
				}
			]
		}
		expect(() => generateDiagram(props)).toThrow("min (10) must be less than max (5)")
	})
})
