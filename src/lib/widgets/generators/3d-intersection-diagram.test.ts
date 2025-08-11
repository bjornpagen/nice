import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import {
	generateThreeDIntersectionDiagram,
	ThreeDIntersectionDiagramPropsSchema
} from "@/lib/widgets/generators/3d-intersection-diagram"

// Helper function to generate diagram with schema validation (safeParse)
const generateDiagram = (props: unknown) => {
	const validation = ThreeDIntersectionDiagramPropsSchema.safeParse(props)
	expect(validation.success).toBe(true)
	if (!validation.success) {
		throw errors.new("invalid props")
	}
	return generateThreeDIntersectionDiagram(validation.data)
}

// Helper function to create base valid props
const createBaseProps = (overrides: Record<string, unknown> = {}) => ({
	type: "threeDIntersectionDiagram" as const,
	width: 400,
	height: 400,
	plane: {
		orientation: "horizontal" as const,
		position: 0.5
	},
	viewOptions: {
		projectionAngle: 45,
		intersectionColor: "rgba(217, 95, 79, 0.8)",
		showHiddenEdges: true,
		showLabels: false
	},
	...overrides
})

describe("generateThreeDIntersectionDiagram", () => {
	describe("Rectangular Prism", () => {
		test("should render rectangular prism with horizontal plane at middle", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular prism with horizontal plane at bottom", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 120,
					width: 100,
					height: 80
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.1
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular prism with horizontal plane at top", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 90,
					width: 90,
					height: 120
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.9
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular prism with vertical plane at middle", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 100,
					width: 60,
					height: 80
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular prism with vertical plane at back", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 140,
					width: 80,
					height: 100
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.2
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangular prism with vertical plane at front", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 100,
					width: 100,
					height: 50
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.8
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render cube (equal dimensions) with horizontal plane", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 100,
					width: 100,
					height: 100
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.3
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Square Pyramid", () => {
		test("should render square pyramid with horizontal plane at middle", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
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
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render square pyramid with horizontal plane near base", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
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
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render square pyramid with horizontal plane near apex", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
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
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render square pyramid with vertical plane at middle", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
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
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render square pyramid with vertical plane offset", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
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
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("View Options", () => {
		test("should render with custom projection angle", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 30,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with steeper projection angle", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 60,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with custom intersection color", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
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
					projectionAngle: 45,
					intersectionColor: "rgba(66, 133, 244, 0.7)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render without hidden edges", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 120,
					width: 100,
					height: 80
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.6
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: false,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with all view options customized", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 100,
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
					showHiddenEdges: false,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Edge Cases", () => {
		test("should render plane at exact bottom (position 0)", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render plane at exact top (position 1)", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 1
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render very small solid", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 20,
					width: 15,
					height: 10
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render very large solid", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 500,
					width: 400,
					height: 300
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with small canvas dimensions", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
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
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with large canvas dimensions", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 800,
				height: 600,
				solid: {
					type: "rectangularPrism" as const,
					depth: 100,
					width: 80,
					height: 60
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render tall thin rectangular prism", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 30,
					width: 30,
					height: 150
				},
				plane: {
					orientation: "horizontal" as const,
					position: 0.3
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render flat wide rectangular prism", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "rectangularPrism" as const,
					depth: 150,
					width: 150,
					height: 20
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render tall narrow pyramid", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
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
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render flat wide pyramid", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
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
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Cylinder", () => {
		test("should render cylinder with horizontal plane intersection", () => {
			const props = createBaseProps({
				solid: {
					type: "cylinder" as const,
					radius: 50,
					height: 100
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render cylinder with vertical plane intersection", () => {
			const props = createBaseProps({
				solid: {
					type: "cylinder" as const,
					radius: 40,
					height: 80
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.6
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render cylinder with oblique plane intersection", () => {
			const props = createBaseProps({
				solid: {
					type: "cylinder" as const,
					radius: 30,
					height: 70
				},
				plane: {
					orientation: "oblique" as const,
					position: 0.5,
					angle: 30
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Cone", () => {
		test("should render cone with horizontal plane intersection", () => {
			const props = createBaseProps({
				solid: {
					type: "cone" as const,
					radius: 60,
					height: 120
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render cone with vertical plane intersection", () => {
			const props = createBaseProps({
				solid: {
					type: "cone" as const,
					radius: 45,
					height: 90
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.3
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render cone with oblique plane intersection", () => {
			const props = createBaseProps({
				solid: {
					type: "cone" as const,
					radius: 50,
					height: 100
				},
				plane: {
					orientation: "oblique" as const,
					position: 0.4,
					angle: -15
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Sphere", () => {
		test("should render sphere with horizontal plane intersection", () => {
			const props = createBaseProps({
				solid: {
					type: "sphere" as const,
					radius: 50
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render sphere with vertical plane intersection", () => {
			const props = createBaseProps({
				solid: {
					type: "sphere" as const,
					radius: 40
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.7
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render sphere with oblique plane intersection", () => {
			const props = createBaseProps({
				solid: {
					type: "sphere" as const,
					radius: 35
				},
				plane: {
					orientation: "oblique" as const,
					position: 0.6,
					angle: 45
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Enhanced Schema Features", () => {
		test("should handle rectangular prism with new depth property", () => {
			const props = createBaseProps({
				solid: {
					type: "rectangularPrism" as const,
					width: 100,
					height: 80,
					depth: 60
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with custom view options", () => {
			const props = createBaseProps({
				solid: {
					type: "cylinder" as const,
					radius: 40,
					height: 80
				},
				viewOptions: {
					projectionAngle: 60,
					intersectionColor: "rgba(100, 150, 200, 0.7)",
					showHiddenEdges: false,
					showLabels: true
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should handle extreme oblique angles", () => {
			const props = createBaseProps({
				solid: {
					type: "rectangularPrism" as const,
					width: 60,
					height: 80,
					depth: 40
				},
				plane: {
					orientation: "oblique" as const,
					position: 0.5,
					angle: 85
				}
			})
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("User Examples", () => {
		test("should render square pyramid with vertical plane (rectangular cross-section)", () => {
			const props = {
				type: "threeDIntersectionDiagram" as const,
				width: 400,
				height: 400,
				solid: {
					type: "squarePyramid" as const,
					baseSide: 100,
					height: 120
				},
				plane: {
					orientation: "vertical" as const,
					position: 0.5 // Cut through the middle
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(76, 175, 80, 0.8)", // Green like user's image
					showHiddenEdges: true,
					showLabels: false
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Schema Validation", () => {
		test("should validate positive dimensions", () => {
			const result = ThreeDIntersectionDiagramPropsSchema.safeParse({
				type: "threeDIntersectionDiagram",
				width: 400,
				height: 400,
				solid: {
					type: "cylinder",
					radius: -10, // Invalid negative radius
					height: 50
				},
				plane: {
					orientation: "horizontal",
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			})
			expect(result.success).toBe(false)
		})

		test("should validate plane position range", () => {
			const result = ThreeDIntersectionDiagramPropsSchema.safeParse({
				type: "threeDIntersectionDiagram",
				width: 400,
				height: 400,
				solid: {
					type: "sphere",
					radius: 30
				},
				plane: {
					orientation: "horizontal",
					position: 1.5 // Invalid position > 1
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			})
			expect(result.success).toBe(false)
		})

		test("should validate oblique angle range", () => {
			const result = ThreeDIntersectionDiagramPropsSchema.safeParse({
				type: "threeDIntersectionDiagram",
				width: 400,
				height: 400,
				solid: {
					type: "cone",
					radius: 30,
					height: 60
				},
				plane: {
					orientation: "oblique",
					position: 0.5,
					angle: 100 // Invalid angle > 90
				},
				viewOptions: {
					projectionAngle: 45,
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			})
			expect(result.success).toBe(false)
		})

		test("should validate projection angle range", () => {
			const result = ThreeDIntersectionDiagramPropsSchema.safeParse({
				type: "threeDIntersectionDiagram",
				width: 400,
				height: 400,
				solid: {
					type: "cylinder",
					radius: 30,
					height: 60
				},
				plane: {
					orientation: "horizontal",
					position: 0.5
				},
				viewOptions: {
					projectionAngle: 100, // Invalid angle > 90
					intersectionColor: "rgba(217, 95, 79, 0.8)",
					showHiddenEdges: true,
					showLabels: false
				}
			})
			expect(result.success).toBe(false)
		})
	})
})
