import { describe, expect, test } from "bun:test"
import { generatePolyhedronDiagram, PolyhedronDiagramPropsSchema } from "./polyhedron-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = PolyhedronDiagramPropsSchema.parse(props)
	return generatePolyhedronDiagram(parsedProps)
}

describe("generatePolyhedronDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "polyhedronDiagram" as const,
			width: null,
			height: null,
			polyhedronType: "cube" as const,
			fillColor: null,
			strokeColor: null,
			showEdges: null,
			perspective: null,
			rotation: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "polyhedronDiagram" as const,
			width: 400,
			height: 350,
			polyhedronType: "dodecahedron" as const,
			fillColor: "#e3f2fd",
			strokeColor: "#1976d2",
			showEdges: true,
			perspective: "isometric" as const,
			rotation: { x: 15, y: 25, z: 0 }
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
