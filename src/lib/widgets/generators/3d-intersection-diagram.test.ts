import { describe, expect, test } from "bun:test"
import { generateThreeDIntersectionDiagram, ThreeDIntersectionDiagramPropsSchema } from "./3d-intersection-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = ThreeDIntersectionDiagramPropsSchema.parse(props)
	return generateThreeDIntersectionDiagram(parsedProps)
}

describe("generateThreeDIntersectionDiagram", () => {
	describe("Rectangular Prism", () => {
		test("should render rectangular prism with horizontal plane at middle", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular prism with horizontal plane at bottom", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 120,
					width: 100,
					height: 80
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.1
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular prism with horizontal plane at top", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 90,
					width: 90,
					height: 120
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.9
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular prism with vertical plane at middle", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 60,
					height: 80
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular prism with vertical plane at back", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 140,
					width: 80,
					height: 100
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.2
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular prism with vertical plane at front", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 100,
					height: 50
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.8
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render cube (equal dimensions) with horizontal plane", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 100,
					height: 100
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.3
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Square Pyramid", () => {
		test("should render square pyramid with horizontal plane at middle", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 100,
					height: 80
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render square pyramid with horizontal plane near base", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 120,
					height: 100
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.2
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render square pyramid with horizontal plane near apex", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 80,
					height: 120
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.8
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render square pyramid with vertical plane at middle", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 100,
					height: 100
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render square pyramid with vertical plane offset", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 90,
					height: 110
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.3
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("View Options", () => {
		test("should render with custom projection angle", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 30,
					intersectionColor: null,
					showHiddenEdges: null
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with steeper projection angle", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 60,
					intersectionColor: null,
					showHiddenEdges: null
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with custom intersection color", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 100,
					height: 80
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.4
				},
				viewOptions: {
					projectionAngle: null,
					intersectionColor: "rgba(66, 133, 244, 0.7)",
					showHiddenEdges: null
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render without hidden edges", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 120,
					width: 100,
					height: 80
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.6
				},
				viewOptions: {
					projectionAngle: null,
					intersectionColor: null,
					showHiddenEdges: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with all view options customized", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 100,
					height: 100
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.7
				},
				viewOptions: {
					projectionAngle: 25,
					intersectionColor: "rgba(76, 175, 80, 0.6)",
					showHiddenEdges: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Edge Cases", () => {
		test("should render plane at exact bottom (position 0)", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render plane at exact top (position 1)", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 1
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render very small solid", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 20,
					width: 15,
					height: 10
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render very large solid", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 500,
					width: 400,
					height: 300
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with small canvas dimensions", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 200,
				height: 200,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 100,
					height: 80
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with large canvas dimensions", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 800,
				height: 600,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render tall thin rectangular prism", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 30,
					width: 30,
					height: 150
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.3
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render flat wide rectangular prism", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 150,
					width: 150,
					height: 20
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render tall narrow pyramid", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 50,
					height: 150
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render flat wide pyramid", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 150,
					height: 40
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Special Configurations", () => {
		test("should render with width null (defaults to 400)", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: null,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with height null (defaults to 400)", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: null,
				solid: {
					type: "rectangularPrism" as const,
					length: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with both width and height null", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: null,
				height: null,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 100,
					height: 100
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render pyramid with plane position at 0.333", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 90,
					height: 90
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.333
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render prism with plane position at 0.666", () => {
			const props = {
				type: "3dIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					length: 90,
					width: 60,
					height: 90
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.666
				},
				viewOptions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
