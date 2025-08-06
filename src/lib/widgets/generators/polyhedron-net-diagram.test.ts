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
			faceColor: null,
			strokeColor: null,
			showFoldLines: null,
			labels: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "polyhedronNetDiagram" as const,
			width: 600,
			height: 500,
			polyhedronType: "tetrahedron" as const,
			faceColor: "#fff3e0",
			strokeColor: "#f57c00",
			showFoldLines: true,
			labels: [
				{ face: 0, text: "A", position: "center" as const },
				{ face: 1, text: "B", position: "center" as const },
				{ face: 2, text: "C", position: "center" as const },
				{ face: 3, text: "D", position: "center" as const }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
