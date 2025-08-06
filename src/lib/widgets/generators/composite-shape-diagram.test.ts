import { describe, expect, test } from "bun:test"
import { CompositeShapeDiagramPropsSchema, generateCompositeShapeDiagram } from "./composite-shape-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = CompositeShapeDiagramPropsSchema.parse(props)
	return generateCompositeShapeDiagram(parsedProps)
}

describe("generateCompositeShapeDiagram", () => {
	test("should render an L-shape with all features", () => {
		const props = {
			type: "compositeShapeDiagram" as const,
			width: 350,
			height: 300,
			vertices: [
				{ x: 0, y: 0 },
				{ x: 100, y: 0 },
				{ x: 100, y: 40 },
				{ x: 40, y: 40 },
				{ x: 40, y: 100 },
				{ x: 0, y: 100 }
			],
			outerBoundary: [0, 1, 2, 3, 4, 5],
			internalSegments: [
				{ fromVertexIndex: 3, toVertexIndex: 5, style: "dashed" as const, label: "60 units" },
				{ fromVertexIndex: 3, toVertexIndex: 1, style: "dashed" as const, label: "60 units" }
			],
			shadedRegions: null,
			regionLabels: [
				{ text: "A", position: { x: 20, y: 50 } },
				{ text: "B", position: { x: 70, y: 20 } }
			],
			rightAngleMarkers: [
				{ cornerVertexIndex: 0, adjacentVertex1Index: 5, adjacentVertex2Index: 1 },
				{ cornerVertexIndex: 2, adjacentVertex1Index: 1, adjacentVertex2Index: 3 }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render a parallelogram with shaded decomposition regions", () => {
		const props = {
			type: "compositeShapeDiagram" as const,
			width: 320,
			height: 160,
			vertices: [
				{ x: 17.778, y: 113.889 }, // Bottom left of parallelogram
				{ x: 71.11, y: 42.778 }, // Top left
				{ x: 177.778, y: 42.778 }, // Top right
				{ x: 124.444, y: 113.889 }, // Bottom right
				{ x: 88.889, y: 42.778 }, // Height line top
				{ x: 88.889, y: 113.889 } // Height line bottom
			],
			outerBoundary: [0, 1, 2, 3],
			shadedRegions: [
				{
					vertexIndices: [1, 4, 5, 0], // Left triangle
					fillColor: "rgba(167, 90, 5, 0.3)" // Brown with transparency
				},
				{
					vertexIndices: [4, 2, 3, 5], // Right triangle
					fillColor: "rgba(116, 207, 112, 0.3)" // Green with transparency
				}
			],
			internalSegments: [{ fromVertexIndex: 4, toVertexIndex: 5, style: "dashed" as const, label: "4 units" }],
			regionLabels: null,
			rightAngleMarkers: [{ cornerVertexIndex: 5, adjacentVertex1Index: 4, adjacentVertex2Index: 3 }]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
