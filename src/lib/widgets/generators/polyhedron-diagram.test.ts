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
			shape: {
				type: "rectangularPrism" as const,
				length: 3,
				width: 3,
				height: 3
			},
			labels: null,
			shadedFace: null,
			showHiddenEdges: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "polyhedronDiagram" as const,
			width: 400,
			height: 350,
			shape: {
				type: "triangularPrism" as const,
				base: {
					b: 4,
					h: 3,
					hypotenuse: 5
				},
				length: 6
			},
			labels: [
				{ text: "4 cm", target: "length" },
				{ text: "3 cm", target: "width" }
			],
			shadedFace: "top_face",
			showHiddenEdges: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
