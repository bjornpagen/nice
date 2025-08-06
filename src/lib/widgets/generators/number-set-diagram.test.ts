import { describe, expect, test } from "bun:test"
import { generateNumberSetDiagram, NumberSetDiagramPropsSchema } from "./number-set-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = NumberSetDiagramPropsSchema.parse(props)
	return generateNumberSetDiagram(parsedProps)
}

describe("generateNumberSetDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "numberSetDiagram" as const,
			width: null,
			height: null,
			sets: {
				whole: {
					label: "Whole Numbers",
					color: "#E8F0FE"
				},
				integer: {
					label: "Integers",
					color: "#C8E6F5"
				},
				rational: {
					label: "Rational Numbers",
					color: "#A5D6E9"
				},
				irrational: {
					label: "Irrational Numbers",
					color: "#FFE0B2"
				}
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "numberSetDiagram" as const,
			width: 500,
			height: 300,
			sets: {
				whole: {
					label: "Whole Numbers (0, 1, 2, 3...)",
					color: "#E3F2FD"
				},
				integer: {
					label: "Integers (...-2, -1, 0, 1, 2...)",
					color: "#BBDEFB"
				},
				rational: {
					label: "Rational Numbers (fractions)",
					color: "#90CAF9"
				},
				irrational: {
					label: "Irrational Numbers (π, √2...)",
					color: "#FFCCBC"
				}
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
