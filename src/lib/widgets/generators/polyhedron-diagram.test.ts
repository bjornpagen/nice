import { describe, expect, test } from "bun:test"
import { generatePolyhedronDiagram, PolyhedronDiagramPropsSchema } from "./polyhedron-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const validationResult = PolyhedronDiagramPropsSchema.safeParse(props)
	if (!validationResult.success) {
		throw validationResult.error
	}
	return generatePolyhedronDiagram(validationResult.data)
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
			diagonals: null,
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
			diagonals: null,
			shadedFace: "top_face",
			showHiddenEdges: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	describe("Diagonals", () => {
		test("should render a space diagonal", () => {
			const props = {
				type: "polyhedronDiagram" as const,
				width: 400,
				height: 300,
				shape: { type: "rectangularPrism" as const, length: 10, width: 8, height: 6 },
				diagonals: [{ fromVertexIndex: 0, toVertexIndex: 6, label: "d", style: "solid" as const }],
				labels: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a face diagonal on the base", () => {
			const props = {
				type: "polyhedronDiagram" as const,
				width: 400,
				height: 300,
				shape: { type: "rectangularPrism" as const, length: 10, width: 8, height: 6 },
				diagonals: [{ fromVertexIndex: 0, toVertexIndex: 5, label: "r", style: "dashed" as const }],
				labels: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render both a space and face diagonal with labels", () => {
			const props = {
				type: "polyhedronDiagram" as const,
				width: 400,
				height: 300,
				shape: { type: "rectangularPrism" as const, length: 10, width: 8, height: 6 },
				diagonals: [
					{ fromVertexIndex: 0, toVertexIndex: 6, label: "d", style: "solid" as const },
					{ fromVertexIndex: 1, toVertexIndex: 4, label: "r", style: "dashed" as const }
				],
				labels: [
					{ text: "10", target: "length" },
					{ text: "8", target: "width" },
					{ text: "6", target: "height" }
				],
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("RectangularFrame", () => {
		test("should render hollow rectangular frame with labels", () => {
			const props = {
				type: "polyhedronDiagram" as const,
				width: 350,
				height: 250,
				shape: {
					type: "rectangularFrame" as const,
					outerLength: 4,
					outerWidth: 5,
					outerHeight: 3,
					thickness: 0.5
				},
				labels: [
					{ text: "1.5 m", target: "height" },
					{ text: "12 m²", target: "front_face" },
					{ text: "0.5 m", target: "thickness" }
				],
				diagonals: null,
				shadedFace: "front_face",
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular frame without hidden edges", () => {
			const props = {
				type: "polyhedronDiagram" as const,
				width: 300,
				height: 200,
				shape: {
					type: "rectangularFrame" as const,
					outerLength: 3,
					outerWidth: 4,
					outerHeight: 2.5,
					thickness: 0.3
				},
				labels: null,
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: false
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
