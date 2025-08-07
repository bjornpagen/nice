import { describe, expect, test } from "bun:test"
import { generateRectangularFrameDiagram, RectangularFrameDiagramPropsSchema } from "./rectangular-frame-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = RectangularFrameDiagramPropsSchema.parse(props)
	return generateRectangularFrameDiagram(parsedProps)
}

describe("generateRectangularFrameDiagram", () => {
	describe("Basic Frame Rendering", () => {
		test("should render with minimal props", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: null,
				height: null,
				outerLength: 5,
				outerWidth: 4,
				outerHeight: 3,
				thickness: 0.5,
				labels: null,
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with all props specified", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 8,
				outerWidth: 6,
				outerHeight: 4,
				thickness: 1,
				labels: [
					{ text: "8 cm", target: "length" },
					{ text: "6 cm", target: "width" },
					{ text: "4 cm", target: "height" },
					{ text: "1 cm", target: "thickness" }
				],
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a thin frame (small thickness)", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 350,
				height: 250,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 3,
				thickness: 0.2,
				labels: [{ text: "thin frame", target: "thickness" }],
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a thick frame", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 4,
				outerWidth: 4,
				outerHeight: 4,
				thickness: 1.5,
				labels: [{ text: "thick frame", target: "thickness" }],
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Face Shading", () => {
		test("should render with front face shaded", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 350,
				height: 250,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: null,
				shadedFace: "front_face",
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with top face shaded", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 350,
				height: 250,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: null,
				shadedFace: "top_face",
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with side face shaded", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 350,
				height: 250,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: null,
				shadedFace: "side_face",
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with bottom face shaded", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 350,
				height: 250,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: null,
				shadedFace: "bottom_face",
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Hidden Edges", () => {
		test("should render without hidden edges", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 350,
				height: 250,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: false
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with hidden edges (default)", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 350,
				height: 250,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Labels", () => {
		test("should render with individual dimension labels", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 7,
				outerWidth: 5,
				outerHeight: 3,
				thickness: 0.6,
				labels: [{ text: "7 units", target: "length" }],
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with width label", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 7,
				outerWidth: 5,
				outerHeight: 3,
				thickness: 0.6,
				labels: [{ text: "5 units", target: "width" }],
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with height label", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 7,
				outerWidth: 5,
				outerHeight: 3,
				thickness: 0.6,
				labels: [{ text: "3 units", target: "height" }],
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with thickness label", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 7,
				outerWidth: 5,
				outerHeight: 3,
				thickness: 0.6,
				labels: [{ text: "0.6 units", target: "thickness" }],
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with multiple labels", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 450,
				height: 350,
				outerLength: 8,
				outerWidth: 6,
				outerHeight: 4,
				thickness: 1,
				labels: [
					{ text: "L = 8", target: "length" },
					{ text: "W = 6", target: "width" },
					{ text: "H = 4", target: "height" },
					{ text: "t = 1", target: "thickness" }
				],
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with face area labels", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 6,
				outerWidth: 4,
				outerHeight: 3,
				thickness: 0.5,
				labels: [
					{ text: "Front Face", target: "front_face" },
					{ text: "Top Face", target: "top_face" }
				],
				diagonals: null,
				shadedFace: "front_face",
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Diagonals", () => {
		test("should render with solid diagonal", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: [
					{
						fromVertexIndex: 0, // outer front bottom left
						toVertexIndex: 6, // outer back top right
						label: "space diagonal",
						style: "solid"
					}
				],
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with dashed diagonal", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: [
					{
						fromVertexIndex: 1, // outer front bottom right
						toVertexIndex: 7, // outer back top left
						label: null,
						style: "dashed"
					}
				],
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with dotted diagonal", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: [
					{
						fromVertexIndex: 2, // outer front top right
						toVertexIndex: 4, // outer back bottom left
						label: "dotted line",
						style: "dotted"
					}
				],
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with multiple diagonals", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 450,
				height: 350,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: [
					{
						fromVertexIndex: 0, // outer front bottom left
						toVertexIndex: 6, // outer back top right
						label: "d1",
						style: "solid"
					},
					{
						fromVertexIndex: 1, // outer front bottom right
						toVertexIndex: 7, // outer back top left
						label: "d2",
						style: "dashed"
					}
				],
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with inner vertex diagonals", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: [
					{
						fromVertexIndex: 8, // inner front bottom left (8 = 0 + 8)
						toVertexIndex: 14, // inner back top right (14 = 6 + 8)
						label: "inner diagonal",
						style: "solid"
					}
				],
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with cross-frame diagonal (outer to inner)", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 6,
				outerWidth: 5,
				outerHeight: 4,
				thickness: 0.8,
				labels: null,
				diagonals: [
					{
						fromVertexIndex: 0, // outer front bottom left
						toVertexIndex: 14, // inner back top right
						label: "cross diagonal",
						style: "dashed"
					}
				],
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Complex Scenarios", () => {
		test("should render picture frame with all features", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 500,
				height: 400,
				outerLength: 10,
				outerWidth: 8,
				outerHeight: 6,
				thickness: 1.5,
				labels: [
					{ text: "10 cm", target: "length" },
					{ text: "8 cm", target: "width" },
					{ text: "6 cm", target: "height" },
					{ text: "1.5 cm thick", target: "thickness" },
					{ text: "Picture Frame", target: "front_face" }
				],
				diagonals: [
					{
						fromVertexIndex: 0,
						toVertexIndex: 6,
						label: "support diagonal",
						style: "dashed"
					}
				],
				shadedFace: "front_face",
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render window frame", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 350,
				outerLength: 4,
				outerWidth: 12,
				outerHeight: 8,
				thickness: 0.8,
				labels: [
					{ text: "Window Frame", target: "front_face" },
					{ text: "Opening", target: "top_face" }
				],
				diagonals: null,
				shadedFace: "top_face",
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render structural beam frame", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 450,
				height: 300,
				outerLength: 15,
				outerWidth: 4,
				outerHeight: 6,
				thickness: 1,
				labels: [
					{ text: "15 ft", target: "length" },
					{ text: "Structural Beam", target: "side_face" }
				],
				diagonals: [
					{
						fromVertexIndex: 0,
						toVertexIndex: 5,
						label: "reinforcement",
						style: "solid"
					}
				],
				shadedFace: "side_face",
				showHiddenEdges: false
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Edge Cases", () => {
		test("should handle very small dimensions", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 300,
				height: 200,
				outerLength: 1,
				outerWidth: 1,
				outerHeight: 1,
				thickness: 0.1,
				labels: [{ text: "mini frame", target: "thickness" }],
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should handle square frame (equal dimensions)", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 400,
				outerLength: 5,
				outerWidth: 5,
				outerHeight: 5,
				thickness: 1,
				labels: [{ text: "5×5×5", target: "front_face" }],
				diagonals: null,
				shadedFace: "front_face",
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should handle large thickness ratio", () => {
			const props = {
				type: "rectangularFrameDiagram" as const,
				width: 400,
				height: 300,
				outerLength: 3,
				outerWidth: 3,
				outerHeight: 3,
				thickness: 1, // thickness is 1/3 of dimensions
				labels: [{ text: "thick walls", target: "thickness" }],
				diagonals: null,
				shadedFace: null,
				showHiddenEdges: true
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
