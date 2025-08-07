import { describe, expect, test } from "bun:test"
import { generateTransformationDiagram, TransformationDiagramPropsSchema } from "./transformation-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = TransformationDiagramPropsSchema.parse(props)
	return generateTransformationDiagram(parsedProps)
}

describe("generateTransformationDiagram", () => {
	describe("Translation", () => {
		test("should render translation without vectors", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 50, y: 50 },
						{ x: 100, y: 50 },
						{ x: 100, y: 100 },
						{ x: 50, y: 100 }
					],
					label: "A",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 150, y: 150 },
						{ x: 200, y: 150 },
						{ x: 200, y: 200 },
						{ x: 150, y: 200 }
					],
					label: "B",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: null
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render translation with vectors", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 80, y: 80 },
						{ x: 120, y: 60 },
						{ x: 140, y: 120 }
					],
					label: "A",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 40, y: 180 },
						{ x: 80, y: 160 },
						{ x: 100, y: 220 }
					],
					label: "B",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render quadrilateral translation down and left", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 200, y: 100 },
						{ x: 280, y: 120 },
						{ x: 260, y: 180 },
						{ x: 180, y: 160 }
					],
					label: "A",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 120, y: 200 },
						{ x: 200, y: 220 },
						{ x: 180, y: 280 },
						{ x: 100, y: 260 }
					],
					label: "B",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render triangle translation with custom colors", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 60, y: 60 },
						{ x: 120, y: 80 },
						{ x: 90, y: 140 }
					],
					label: "P",
					fillColor: "rgba(255, 0, 0, 0.3)",
					strokeColor: "#ff0000",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 160 },
						{ x: 260, y: 180 },
						{ x: 230, y: 240 }
					],
					label: "Q",
					fillColor: "rgba(0, 0, 255, 0.3)",
					strokeColor: "#0000ff",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: false
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Reflection", () => {
		test("should render reflection across horizontal line", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 100, y: 100 },
						{ x: 150, y: 80 },
						{ x: 180, y: 120 }
					],
					label: "A",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 100, y: 240 },
						{ x: 150, y: 260 },
						{ x: 180, y: 220 }
					],
					label: "B",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "reflection" as const,
					lineOfReflection: {
						from: { x: 50, y: 170 },
						to: { x: 250, y: 170 },
						style: "dashed",
						color: "black"
					}
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render reflection across vertical line", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 80, y: 100 },
						{ x: 120, y: 80 },
						{ x: 140, y: 140 }
					],
					label: "A",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 220, y: 100 },
						{ x: 180, y: 80 },
						{ x: 160, y: 140 }
					],
					label: "B",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "reflection" as const,
					lineOfReflection: {
						from: { x: 150, y: 50 },
						to: { x: 150, y: 200 },
						style: "dashed",
						color: "gray"
					}
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render reflection across diagonal line", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 80, y: 80 },
						{ x: 120, y: 60 },
						{ x: 140, y: 100 },
						{ x: 100, y: 120 }
					],
					label: "P",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 160 },
						{ x: 220, y: 120 },
						{ x: 180, y: 100 },
						{ x: 160, y: 140 }
					],
					label: "Q",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "reflection" as const,
					lineOfReflection: {
						from: { x: 50, y: 50 },
						to: { x: 250, y: 250 },
						style: "solid",
						color: "#333333"
					}
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render reflection with dotted line style", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 100, y: 120 },
						{ x: 140, y: 100 },
						{ x: 160, y: 160 }
					],
					label: "X",
					fillColor: "rgba(255, 165, 0, 0.4)",
					strokeColor: "#ff8c00",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 120 },
						{ x: 160, y: 100 },
						{ x: 140, y: 160 }
					],
					label: "Y",
					fillColor: "rgba(0, 255, 0, 0.4)",
					strokeColor: "#00ff00",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "reflection" as const,
					lineOfReflection: {
						from: { x: 150, y: 80 },
						to: { x: 150, y: 180 },
						style: "dotted",
						color: "red"
					}
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Rotation", () => {
		test("should render rotation around center point", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 120, y: 100 },
						{ x: 160, y: 120 },
						{ x: 140, y: 160 }
					],
					label: "A",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 140 },
						{ x: 180, y: 180 },
						{ x: 140, y: 160 }
					],
					label: "B",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "rotation" as const,
					centerOfRotation: { x: 150, y: 150 },
					angle: 90
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotation with negative angle", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 100, y: 100 },
						{ x: 140, y: 80 },
						{ x: 160, y: 120 },
						{ x: 120, y: 140 }
					],
					label: "R",
					fillColor: "rgba(128, 0, 128, 0.3)",
					strokeColor: "#800080",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 180, y: 120 },
						{ x: 200, y: 160 },
						{ x: 160, y: 180 },
						{ x: 140, y: 140 }
					],
					label: "S",
					fillColor: "rgba(255, 192, 203, 0.3)",
					strokeColor: "#ffc0cb",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "rotation" as const,
					centerOfRotation: { x: 150, y: 140 },
					angle: -45
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotation 180 degrees", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 120, y: 120 },
						{ x: 160, y: 100 },
						{ x: 180, y: 140 }
					],
					label: "M",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 180, y: 180 },
						{ x: 140, y: 200 },
						{ x: 120, y: 160 }
					],
					label: "N",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "rotation" as const,
					centerOfRotation: { x: 150, y: 150 },
					angle: 180
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotation with off-center point", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 160, y: 100 },
						{ x: 200, y: 120 },
						{ x: 180, y: 160 }
					],
					label: "P",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 180, y: 140 },
						{ x: 160, y: 180 },
						{ x: 120, y: 160 }
					],
					label: "Q",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "rotation" as const,
					centerOfRotation: { x: 100, y: 200 },
					angle: 60
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Dilation", () => {
		test("should render dilation enlargement without rays", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 140, y: 140 },
						{ x: 160, y: 120 },
						{ x: 180, y: 160 }
					],
					label: "A",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 120, y: 120 },
						{ x: 180, y: 80 },
						{ x: 220, y: 200 }
					],
					label: "B",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "dilation" as const,
					centerOfDilation: { x: 100, y: 100 },
					showRays: null
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render dilation enlargement with rays", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 150, y: 150 },
						{ x: 170, y: 130 },
						{ x: 190, y: 170 },
						{ x: 170, y: 190 }
					],
					label: "A",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 200 },
						{ x: 240, y: 160 },
						{ x: 280, y: 240 },
						{ x: 240, y: 280 }
					],
					label: "B",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "dilation" as const,
					centerOfDilation: { x: 100, y: 100 },
					showRays: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render dilation reduction", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 80, y: 80 },
						{ x: 160, y: 80 },
						{ x: 160, y: 160 },
						{ x: 80, y: 160 }
					],
					label: "LARGE",
					fillColor: "rgba(255, 100, 100, 0.4)",
					strokeColor: "#ff6464",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 140, y: 140 },
						{ x: 180, y: 140 },
						{ x: 180, y: 180 },
						{ x: 140, y: 180 }
					],
					label: "SMALL",
					fillColor: "rgba(100, 100, 255, 0.4)",
					strokeColor: "#6464ff",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "dilation" as const,
					centerOfDilation: { x: 200, y: 200 },
					showRays: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render dilation with center inside shape", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 120, y: 130 },
						{ x: 160, y: 130 },
						{ x: 160, y: 170 },
						{ x: 120, y: 170 }
					],
					label: "P",
					fillColor: "rgba(255, 215, 0, 0.4)",
					strokeColor: "#ffd700",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 100, y: 100 },
						{ x: 200, y: 100 },
						{ x: 200, y: 200 },
						{ x: 100, y: 200 }
					],
					label: "Q",
					fillColor: "rgba(0, 191, 255, 0.4)",
					strokeColor: "#00bfff",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "dilation" as const,
					centerOfDilation: { x: 150, y: 150 },
					showRays: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Edge Cases", () => {
		test("should render with null width (defaults to 400)", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: null,
				height: 300,
				preImage: {
					vertices: [
						{ x: 100, y: 100 },
						{ x: 150, y: 100 },
						{ x: 125, y: 150 }
					],
					label: "A",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 100 },
						{ x: 250, y: 100 },
						{ x: 225, y: 150 }
					],
					label: "B",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: null
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with null height (defaults to 400)", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 500,
				height: null,
				preImage: {
					vertices: [
						{ x: 100, y: 100 },
						{ x: 150, y: 100 },
						{ x: 125, y: 150 }
					],
					label: "X",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 200 },
						{ x: 250, y: 200 },
						{ x: 225, y: 250 }
					],
					label: "Y",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with both width and height null", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: null,
				height: null,
				preImage: {
					vertices: [
						{ x: 150, y: 150 },
						{ x: 200, y: 150 },
						{ x: 175, y: 200 }
					],
					label: "M",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 150, y: 250 },
						{ x: 200, y: 250 },
						{ x: 175, y: 200 }
					],
					label: "N",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "reflection" as const,
					lineOfReflection: {
						from: { x: 100, y: 200 },
						to: { x: 250, y: 200 },
						style: null,
						color: null
					}
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render very small shapes", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 190, y: 190 },
						{ x: 200, y: 190 },
						{ x: 195, y: 200 }
					],
					label: "A",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 210, y: 190 },
						{ x: 220, y: 190 },
						{ x: 215, y: 200 }
					],
					label: "B",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: false
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render shapes with large coordinates", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 600,
				height: 600,
				preImage: {
					vertices: [
						{ x: 100, y: 100 },
						{ x: 200, y: 50 },
						{ x: 300, y: 150 },
						{ x: 200, y: 200 }
					],
					label: "LARGE",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 400, y: 300 },
						{ x: 500, y: 250 },
						{ x: 600, y: 350 },
						{ x: 500, y: 400 }
					],
					label: "LARGER",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "dilation" as const,
					centerOfDilation: { x: 50, y: 50 },
					showRays: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with no shape labels", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 100, y: 100 },
						{ x: 150, y: 80 },
						{ x: 170, y: 130 },
						{ x: 120, y: 150 }
					],
					label: null,
					fillColor: "rgba(255, 255, 0, 0.5)",
					strokeColor: "#ffff00",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 200 },
						{ x: 250, y: 180 },
						{ x: 270, y: 230 },
						{ x: 220, y: 250 }
					],
					label: null,
					fillColor: "rgba(0, 255, 255, 0.5)",
					strokeColor: "#00ffff",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render complex polygon", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 500,
				height: 400,
				preImage: {
					vertices: [
						{ x: 100, y: 100 },
						{ x: 140, y: 80 },
						{ x: 180, y: 100 },
						{ x: 200, y: 140 },
						{ x: 180, y: 180 },
						{ x: 140, y: 200 },
						{ x: 100, y: 180 },
						{ x: 80, y: 140 }
					],
					label: "OCTAGON",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 250, y: 200 },
						{ x: 290, y: 180 },
						{ x: 330, y: 200 },
						{ x: 350, y: 240 },
						{ x: 330, y: 280 },
						{ x: 290, y: 300 },
						{ x: 250, y: 280 },
						{ x: 230, y: 240 }
					],
					label: "OCTAGON'",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "rotation" as const,
					centerOfRotation: { x: 200, y: 200 },
					angle: 45
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Educational Features", () => {
		test("should render rotation with clear angle visualization", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 100, y: 100 },
						{ x: 140, y: 100 },
						{ x: 140, y: 140 },
						{ x: 100, y: 140 }
					],
					label: "SQUARE",
					fillColor: "rgba(50, 150, 250, 0.3)",
					strokeColor: "#3296fa",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 140 },
						{ x: 200, y: 180 },
						{ x: 160, y: 180 },
						{ x: 160, y: 140 }
					],
					label: "ROTATED",
					fillColor: "rgba(250, 150, 50, 0.3)",
					strokeColor: "#fa9632",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "rotation" as const,
					centerOfRotation: { x: 150, y: 150 },
					angle: 90
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render dilation with educational rays and vertex correspondence", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 500,
				height: 400,
				preImage: {
					vertices: [
						{ x: 140, y: 120 },
						{ x: 180, y: 120 },
						{ x: 160, y: 160 }
					],
					label: "SMALL",
					fillColor: "rgba(100, 200, 100, 0.4)",
					strokeColor: "#64c864",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 100, y: 80 },
						{ x: 220, y: 80 },
						{ x: 160, y: 200 }
					],
					label: "LARGE",
					fillColor: "rgba(200, 100, 100, 0.4)",
					strokeColor: "#c86464",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "dilation" as const,
					centerOfDilation: { x: 160, y: 140 },
					showRays: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render reflection with clear symmetry indicators", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 450,
				height: 300,
				preImage: {
					vertices: [
						{ x: 80, y: 100 },
						{ x: 120, y: 80 },
						{ x: 140, y: 120 },
						{ x: 100, y: 140 }
					],
					label: "ORIGINAL",
					fillColor: "rgba(150, 100, 200, 0.4)",
					strokeColor: "#9664c8",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 220, y: 100 },
						{ x: 180, y: 80 },
						{ x: 160, y: 120 },
						{ x: 200, y: 140 }
					],
					label: "MIRROR",
					fillColor: "rgba(200, 150, 100, 0.4)",
					strokeColor: "#c89664",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "reflection" as const,
					lineOfReflection: {
						from: { x: 150, y: 60 },
						to: { x: 150, y: 160 },
						style: "dashed",
						color: "#333"
					}
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Custom Styling", () => {
		test("should render with custom fill and stroke colors", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 100, y: 100 },
						{ x: 150, y: 100 },
						{ x: 125, y: 150 }
					],
					label: "RED",
					fillColor: "rgba(255, 0, 0, 0.6)",
					strokeColor: "#cc0000",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 200 },
						{ x: 250, y: 200 },
						{ x: 225, y: 250 }
					],
					label: "BLUE",
					fillColor: "rgba(0, 0, 255, 0.6)",
					strokeColor: "#0000cc",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: false
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render reflection with custom line styling", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 400,
				height: 400,
				preImage: {
					vertices: [
						{ x: 80, y: 100 },
						{ x: 120, y: 80 },
						{ x: 140, y: 120 }
					],
					label: "A",
					fillColor: "rgba(0, 128, 0, 0.4)",
					strokeColor: "#008000",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 220, y: 100 },
						{ x: 180, y: 80 },
						{ x: 160, y: 120 }
					],
					label: "A'",
					fillColor: "rgba(128, 0, 128, 0.4)",
					strokeColor: "#800080",
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "reflection" as const,
					lineOfReflection: {
						from: { x: 150, y: 60 },
						to: { x: 150, y: 140 },
						style: "dashed",
						color: "#ff6600"
					}
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with canvas dimension extremes", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 800,
				height: 200,
				preImage: {
					vertices: [
						{ x: 150, y: 80 },
						{ x: 200, y: 60 },
						{ x: 250, y: 100 }
					],
					label: "WIDE",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 450, y: 120 },
						{ x: 500, y: 100 },
						{ x: 550, y: 140 }
					],
					label: "VIEW",
					fillColor: null,
					strokeColor: null,
					vertexLabels: null,
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Enhanced Features", () => {
		test("should render transformation with vertex labels, angle marks, side lengths, and additional points", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 500,
				height: 400,
				preImage: {
					vertices: [
						{ x: 116.667, y: 262.5 },
						{ x: 230.417, y: 291.667 },
						{ x: 87.5, y: 320.833 },
						{ x: 29.167, y: 262.5 }
					],
					label: null,
					fillColor: "rgba(120, 84, 171, 0.15)",
					strokeColor: "#7854ab",
					vertexLabels: ["A", "B", "C", "D"],
					angleMarks: [
						{
							vertexIndex: 0,
							radius: 25,
							label: "166°",
							labelDistance: 40
						}
					],
					sideLengths: [
						{ value: "3", position: "outside", offset: null },
						{ value: "4", position: "outside", offset: null },
						{ value: "5", position: "outside", offset: null },
						{ value: "2.8", position: "outside", offset: null }
					]
				},
				image: {
					vertices: [
						{ x: 235.144, y: 140.092 },
						{ x: 324.28, y: 63.642 },
						{ x: 266.198, y: 197.443 },
						{ x: 184.956, y: 211.768 }
					],
					label: null,
					fillColor: "rgba(31, 171, 84, 0.15)",
					strokeColor: "#1fab54",
					vertexLabels: ["A'", "B'", "C'", "D'"],
					angleMarks: [
						{
							vertexIndex: 2,
							radius: 20,
							label: "123°",
							labelDistance: 35
						}
					],
					sideLengths: [
						{ value: "3", position: "outside", offset: null },
						{ value: "4", position: "outside", offset: null },
						{ value: "5", position: "outside", offset: null },
						{ value: "2.8", position: "outside", offset: null }
					]
				},
				transformation: {
					type: "rotation" as const,
					centerOfRotation: { x: 180, y: 200 },
					angle: -57
				},
				additionalPoints: [
					{
						x: 58.333,
						y: 87.5,
						label: "R",
						style: "circle" as const
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render reflection with vertex labels and perpendicular angle marks", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 500,
				height: 400,
				preImage: {
					vertices: [
						{ x: 80, y: 120 },
						{ x: 140, y: 80 },
						{ x: 180, y: 140 }
					],
					label: null,
					fillColor: "rgba(255, 100, 100, 0.3)",
					strokeColor: "#ff6464",
					vertexLabels: ["X", "Y", "Z"],
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 320, y: 120 },
						{ x: 260, y: 80 },
						{ x: 220, y: 140 }
					],
					label: null,
					fillColor: "rgba(100, 100, 255, 0.3)",
					strokeColor: "#6464ff",
					vertexLabels: ["X'", "Y'", "Z'"],
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "reflection" as const,
					lineOfReflection: {
						from: { x: 200, y: 50 },
						to: { x: 200, y: 200 },
						style: "dashed",
						color: "#333"
					}
				},
				additionalPoints: [
					{
						x: 200,
						y: 30,
						label: "ℓ",
						style: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render translation with labeled vertices showing movement", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 450,
				height: 350,
				preImage: {
					vertices: [
						{ x: 50, y: 100 },
						{ x: 100, y: 80 },
						{ x: 120, y: 130 },
						{ x: 70, y: 150 }
					],
					label: null,
					fillColor: "rgba(150, 200, 100, 0.3)",
					strokeColor: "#96c864",
					vertexLabels: ["P", "Q", "R", "S"],
					angleMarks: null,
					sideLengths: null
				},
				image: {
					vertices: [
						{ x: 200, y: 180 },
						{ x: 250, y: 160 },
						{ x: 270, y: 210 },
						{ x: 220, y: 230 }
					],
					label: null,
					fillColor: "rgba(100, 150, 200, 0.3)",
					strokeColor: "#6496c8",
					vertexLabels: ["P'", "Q'", "R'", "S'"],
					angleMarks: null,
					sideLengths: null
				},
				transformation: {
					type: "translation" as const,
					showVectors: true
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render dilation with comprehensive features including side lengths", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 600,
				height: 500,
				preImage: {
					vertices: [
						{ x: 200, y: 200 },
						{ x: 250, y: 200 },
						{ x: 250, y: 250 },
						{ x: 200, y: 250 }
					],
					label: null,
					fillColor: "rgba(120, 84, 171, 0.2)",
					strokeColor: "#7854ab",
					vertexLabels: ["A", "B", "C", "D"],
					angleMarks: [
						{
							vertexIndex: 0,
							radius: 20,
							label: "90°",
							labelDistance: null
						},
						{
							vertexIndex: 1,
							radius: 20,
							label: "90°",
							labelDistance: null
						}
					],
					sideLengths: [
						{ value: "50", position: "outside", offset: 15 },
						{ value: "50", position: "outside", offset: 15 },
						{ value: "50", position: "outside", offset: 15 },
						{ value: "50", position: "outside", offset: 15 }
					]
				},
				image: {
					vertices: [
						{ x: 150, y: 150 },
						{ x: 300, y: 150 },
						{ x: 300, y: 300 },
						{ x: 150, y: 300 }
					],
					label: null,
					fillColor: "rgba(31, 171, 84, 0.2)",
					strokeColor: "#1fab54",
					vertexLabels: ["A'", "B'", "C'", "D'"],
					angleMarks: [
						{
							vertexIndex: 0,
							radius: 20,
							label: "90°",
							labelDistance: null
						},
						{
							vertexIndex: 1,
							radius: 20,
							label: "90°",
							labelDistance: null
						}
					],
					sideLengths: [
						{ value: "150", position: "inside", offset: 15 },
						{ value: "150", position: "inside", offset: 15 },
						{ value: "150", position: "inside", offset: 15 },
						{ value: "150", position: "inside", offset: 15 }
					]
				},
				transformation: {
					type: "dilation" as const,
					centerOfDilation: { x: 225, y: 225 },
					showRays: true
				},
				additionalPoints: [
					{
						x: 225,
						y: 350,
						label: "Center of Dilation",
						style: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render triangle with mixed side length notations", () => {
			const props = {
				type: "transformationDiagram" as const,
				width: 500,
				height: 400,
				preImage: {
					vertices: [
						{ x: 100, y: 300 },
						{ x: 200, y: 150 },
						{ x: 300, y: 300 }
					],
					label: "Triangle ABC",
					fillColor: "rgba(255, 200, 100, 0.2)",
					strokeColor: "#ffc864",
					vertexLabels: ["A", "B", "C"],
					angleMarks: [
						{
							vertexIndex: 1,
							radius: 25,
							label: "60°",
							labelDistance: 40
						}
					],
					sideLengths: [
						{ value: "a", position: "outside", offset: null },
						{ value: "b", position: "outside", offset: null },
						{ value: "c = 10", position: "outside", offset: null }
					]
				},
				image: {
					vertices: [
						{ x: 350, y: 300 },
						{ x: 400, y: 200 },
						{ x: 450, y: 300 }
					],
					label: "Triangle A'B'C'",
					fillColor: "rgba(100, 200, 255, 0.2)",
					strokeColor: "#64c8ff",
					vertexLabels: ["A'", "B'", "C'"],
					angleMarks: [
						{
							vertexIndex: 1,
							radius: 25,
							label: "60°",
							labelDistance: 40
						}
					],
					sideLengths: [
						{ value: "a/2", position: "outside", offset: null },
						{ value: "b/2", position: "outside", offset: null },
						{ value: "5", position: "outside", offset: null }
					]
				},
				transformation: {
					type: "dilation" as const,
					centerOfDilation: { x: 50, y: 50 },
					showRays: false
				},
				additionalPoints: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
