import { describe, expect, test } from "bun:test"
import { generatePolyhedronNetDiagram, PolyhedronNetDiagramPropsSchema } from "./polyhedron-net-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = PolyhedronNetDiagramPropsSchema.parse(props)
	return generatePolyhedronNetDiagram(parsedProps)
}

describe("generatePolyhedronNetDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "polyhedronNetDiagram" as const,
			width: null,
			height: null,
			polyhedronType: "cube" as const,
			dimensions: {
				base: {
					type: "square" as const,
					side: 50
				},
				lateralHeight: null
			},
			showLabels: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "polyhedronNetDiagram" as const,
			width: 600,
			height: 500,
			polyhedronType: "triangularPyramid" as const,
			dimensions: {
				base: {
					type: "triangle" as const,
					base: 60,
					height: 52,
					side1: 60,
					side2: 60
				},
				lateralHeight: 70
			},
			showLabels: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
