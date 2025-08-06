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

	test("should render rectangular prism net", () => {
		const props = {
			type: "polyhedronNetDiagram" as const,
			width: null,
			height: null,
			polyhedronType: "rectangularPrism" as const,
			dimensions: {
				base: {
					type: "rectangle" as const,
					length: 80,
					width: 60
				},
				lateralHeight: 50
			},
			showLabels: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render triangular prism net", () => {
		const props = {
			type: "polyhedronNetDiagram" as const,
			width: null,
			height: null,
			polyhedronType: "triangularPrism" as const,
			dimensions: {
				base: {
					type: "triangle" as const,
					base: 60,
					height: 52,
					side1: 60,
					side2: 60
				},
				lateralHeight: 80
			},
			showLabels: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render pentagonal pyramid net", () => {
		const props = {
			type: "polyhedronNetDiagram" as const,
			width: null,
			height: null,
			polyhedronType: "pentagonalPyramid" as const,
			dimensions: {
				base: {
					type: "pentagon" as const,
					side: 40
				},
				lateralHeight: 60
			},
			showLabels: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should throw error for cube with non-square base", () => {
		const props = {
			type: "polyhedronNetDiagram" as const,
			width: null,
			height: null,
			polyhedronType: "cube" as const,
			dimensions: {
				base: {
					type: "rectangle" as const,
					length: 50,
					width: 40
				},
				lateralHeight: null
			},
			showLabels: null
		}
		expect(() => generateDiagram(props)).toThrow("cube must have a square base")
	})

	test("should throw error for rectangular prism without lateral height", () => {
		const props = {
			type: "polyhedronNetDiagram" as const,
			width: null,
			height: null,
			polyhedronType: "rectangularPrism" as const,
			dimensions: {
				base: {
					type: "rectangle" as const,
					length: 80,
					width: 60
				},
				lateralHeight: null
			},
			showLabels: null
		}
		expect(() => generateDiagram(props)).toThrow("lateralHeight is required for rectangularPrism")
	})

	test("should throw error for cube with non-matching lateral height", () => {
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
				lateralHeight: 60 // Should match side (50)
			},
			showLabels: null
		}
		expect(() => generateDiagram(props)).toThrow("cube lateralHeight must be equal to side if provided")
	})
})
