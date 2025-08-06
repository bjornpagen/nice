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
			circleA: {
				label: "A",
				count: 5,
				color: null
			},
			circleB: {
				label: "B",
				count: 3,
				color: null
			},
			intersectionCount: 2,
			outsideCount: 1
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "vennDiagram" as const,
			width: 500,
			height: 350,
			circleA: {
				label: "Fruits",
				count: 3,
				color: "rgba(255, 107, 107, 0.5)"
			},
			circleB: {
				label: "Red Foods",
				count: 3,
				color: "rgba(76, 237, 196, 0.5)"
			},
			intersectionCount: 1,
			outsideCount: 0
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
