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
			sets: [
				{
					name: "Natural Numbers",
					elements: [1, 2, 3, 4, 5],
					color: null
				},
				{
					name: "Even Numbers",
					elements: [2, 4, 6, 8],
					color: null
				}
			],
			arrangement: null,
			showLabels: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "numberSetDiagram" as const,
			width: 500,
			height: 300,
			sets: [
				{
					name: "Multiples of 3",
					elements: [3, 6, 9, 12, 15],
					color: "#4caf50"
				},
				{
					name: "Multiples of 5",
					elements: [5, 10, 15, 20, 25],
					color: "#2196f3"
				},
				{
					name: "Prime Numbers",
					elements: [2, 3, 5, 7, 11, 13],
					color: "#ff9800"
				}
			],
			arrangement: "venn" as const,
			showLabels: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
