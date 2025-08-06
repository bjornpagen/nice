import { describe, expect, test } from "bun:test"
import { GeometricSolidDiagramPropsSchema, generateGeometricSolidDiagram } from "./geometric-solid-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = GeometricSolidDiagramPropsSchema.parse(props)
	return generateGeometricSolidDiagram(parsedProps)
}

describe("generateGeometricSolidDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "geometricSolidDiagram" as const,
			width: null,
			height: null,
			solidType: "cube" as const,
			dimensions: { width: 100, height: 100, depth: 100 },
			fillColor: null,
			strokeColor: null,
			showDimensions: null,
			perspective: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "geometricSolidDiagram" as const,
			width: 400,
			height: 300,
			solidType: "rectangular-prism" as const,
			dimensions: { width: 120, height: 80, depth: 60 },
			fillColor: "#e3f2fd",
			strokeColor: "#1976d2",
			showDimensions: true,
			perspective: "isometric" as const
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
