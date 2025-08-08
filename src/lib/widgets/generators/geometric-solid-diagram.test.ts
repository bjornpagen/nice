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
			shape: {
				type: "cylinder" as const,
				radius: 25,
				height: 50
			},
			labels: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "geometricSolidDiagram" as const,
			width: 400,
			height: 300,
			shape: {
				type: "cone" as const,
				radius: 40,
				height: 80
			},
			labels: [
				{ target: "radius" as const, text: "r = 40" },
				{ target: "height" as const, text: "h = 80" }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render cone with radius 2 and height 5", () => {
		const props = {
			type: "geometricSolidDiagram" as const,
			width: 134,
			height: 180,
			shape: {
				type: "cone" as const,
				radius: 2,
				height: 5
			},
			labels: [
				{ target: "radius" as const, text: "2" },
				{ target: "height" as const, text: "5" }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render beautiful cylinder with labels", () => {
		const props = {
			type: "geometricSolidDiagram" as const,
			width: 300,
			height: 250,
			shape: {
				type: "cylinder" as const,
				radius: 15,
				height: 30
			},
			labels: [
				{ target: "radius" as const, text: "15 cm" },
				{ target: "height" as const, text: "30 cm" }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render beautiful sphere with radius label", () => {
		const props = {
			type: "geometricSolidDiagram" as const,
			width: 250,
			height: 250,
			shape: {
				type: "sphere" as const,
				radius: 12
			},
			labels: [{ target: "radius" as const, text: "r = 12" }]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
