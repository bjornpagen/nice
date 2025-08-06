import { describe, expect, test } from "bun:test"
import { DoubleNumberLinePropsSchema, generateDoubleNumberLine } from "./double-number-line"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = DoubleNumberLinePropsSchema.parse(props)
	return generateDoubleNumberLine(parsedProps)
}

describe("generateDoubleNumberLine", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "doubleNumberLine" as const,
			width: null,
			height: null,
			topLine: {
				label: "Top",
				ticks: [0, 2, 4, 6, 8, 10]
			},
			bottomLine: {
				label: "Bottom",
				ticks: [0, 10, 20, 30, 40, 50]
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "doubleNumberLine" as const,
			width: 600,
			height: 200,
			topLine: {
				label: "Hours",
				ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8]
			},
			bottomLine: {
				label: "Distance (miles)",
				ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80]
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should throw error when tick counts don't match", () => {
		const props = {
			type: "doubleNumberLine" as const,
			width: null,
			height: null,
			topLine: {
				label: "Top",
				ticks: [0, 2, 4, 6] // 4 ticks
			},
			bottomLine: {
				label: "Bottom",
				ticks: [0, 10, 20, 30, 40, 50] // 6 ticks - mismatch!
			}
		}
		expect(() => generateDiagram(props)).toThrow("top line has 4 ticks, bottom line has 6 ticks")
	})
})
