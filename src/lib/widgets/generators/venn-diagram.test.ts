import { describe, expect, test } from "bun:test"
import { generateVennDiagram, VennDiagramPropsSchema } from "./venn-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = VennDiagramPropsSchema.parse(props)
	return generateVennDiagram(parsedProps)
}

describe("generateVennDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "vennDiagram" as const,
			width: null,
			height: null,
			circles: [
				{ label: "A", color: null, elements: null },
				{ label: "B", color: null, elements: null }
			],
			intersections: null,
			showLabels: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "vennDiagram" as const,
			width: 500,
			height: 350,
			circles: [
				{
					label: "Fruits",
					color: "rgba(255, 107, 107, 0.5)",
					elements: ["Apple", "Orange", "Banana", "Grape"]
				},
				{
					label: "Red Foods",
					color: "rgba(76, 237, 196, 0.5)",
					elements: ["Apple", "Strawberry", "Cherry", "Tomato"]
				}
			],
			intersections: [
				{
					circles: [0, 1],
					elements: ["Apple"],
					label: "Red Fruits"
				}
			],
			showLabels: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
