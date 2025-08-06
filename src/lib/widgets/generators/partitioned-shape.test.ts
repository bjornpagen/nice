import { describe, expect, test } from "bun:test"
import { generatePartitionedShape, PartitionedShapePropsSchema } from "./partitioned-shape"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = PartitionedShapePropsSchema.parse(props)
	return generatePartitionedShape(parsedProps)
}

describe("generatePartitionedShape", () => {
	// MODIFIED: Wrap existing tests in a describe block for the "partition" mode
	describe("Partition Mode", () => {
		test("should render with minimal props", () => {
			const props = {
				type: "partitionedShape" as const,
				// NEW: Add mode property
				mode: "partition" as const,
				width: null,
				height: null,
				shapes: [
					{
						type: "rectangle" as const,
						totalParts: 6,
						// MODIFIED: Use shadedCells instead of shadedParts
						shadedCells: [0, 1, 2],
						hatchedCells: null,
						rows: 2,
						columns: 3,
						shadeColor: null,
						shadeOpacity: null
					}
				],
				layout: null,
				// NEW: Add null overlays
				overlays: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with all props specified", () => {
			const props = {
				type: "partitionedShape" as const,
				mode: "partition" as const,
				width: 400,
				height: 300,
				shapes: [
					{
						type: "circle" as const,
						totalParts: 8,
						shadedCells: [0, 1, 2, 3],
						hatchedCells: null,
						rows: null,
						columns: null,
						shadeColor: "#ff6b6b",
						shadeOpacity: null
					}
				],
				layout: "horizontal" as const,
				overlays: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render multiple shapes with vertical layout", () => {
			const props = {
				type: "partitionedShape" as const,
				mode: "partition" as const,
				width: 200,
				height: 200,
				shapes: [
					{
						type: "rectangle" as const,
						totalParts: 4,
						shadedCells: [0, 1],
						hatchedCells: null,
						rows: 2,
						columns: 2,
						shadeColor: "#4ECDC4",
						shadeOpacity: null
					},
					{
						type: "rectangle" as const,
						totalParts: 4,
						shadedCells: [2, 3],
						hatchedCells: null,
						rows: 2,
						columns: 2,
						shadeColor: "#556270",
						shadeOpacity: null
					}
				],
				layout: "vertical" as const,
				overlays: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangle with overlays", () => {
			const props = {
				type: "partitionedShape" as const,
				mode: "partition" as const,
				width: 300,
				height: 200,
				shapes: [
					{
						type: "rectangle" as const,
						totalParts: 12,
						shadedCells: [0, 1, 2, 6, 7, 8],
						hatchedCells: null,
						rows: 3,
						columns: 4,
						shadeColor: "#FFD93D",
						shadeOpacity: null
					}
				],
				layout: "horizontal" as const,
				overlays: [
					{
						from: { row: 0, col: 2 },
						to: { row: 3, col: 2 },
						style: "dashed" as const,
						color: "#E74C3C"
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should generate fraction model: 10/7 basic representation", () => {
			const props = {
				type: "partitionedShape" as const,
				mode: "partition" as const,
				width: 200,
				height: 180,
				layout: "horizontal" as const,
				shapes: [
					{
						type: "rectangle" as const,
						totalParts: 7,
						rows: 1,
						columns: 7,
						shadedCells: [0, 1, 2, 3, 4, 5, 6], // All 7 parts shaded (7/7)
						hatchedCells: null,
						shadeColor: "#01d1c1",
						shadeOpacity: 0.5
					},
					{
						type: "rectangle" as const,
						totalParts: 7,
						rows: 1,
						columns: 7,
						shadedCells: [0, 1, 2], // 3 parts shaded (3/7)
						hatchedCells: null,
						shadeColor: "#01d1c1",
						shadeOpacity: 0.5
					}
				],
				overlays: null
			}

			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should generate fraction model: 10/7 divided into 4 rows", () => {
			const props = {
				type: "partitionedShape" as const,
				mode: "partition" as const,
				width: 200,
				height: 180,
				layout: "horizontal" as const,
				shapes: [
					{
						type: "rectangle" as const,
						totalParts: 28,
						rows: 4,
						columns: 7,
						shadedCells: Array.from({ length: 28 }, (_, i) => i), // All 28 parts shaded
						hatchedCells: null,
						shadeColor: "#01d1c1",
						shadeOpacity: 0.5
					},
					{
						type: "rectangle" as const,
						totalParts: 28,
						rows: 4,
						columns: 7,
						// 12 specific cells shaded: 3 cells in each of 4 rows
						shadedCells: [0, 1, 2, 7, 8, 9, 14, 15, 16, 21, 22, 23],
						hatchedCells: null,
						shadeColor: "#01d1c1",
						shadeOpacity: 0.5
					}
				],
				overlays: null
			}

			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should generate fraction model: with diagonal hatching", () => {
			const props = {
				type: "partitionedShape" as const,
				mode: "partition" as const,
				width: 200,
				height: 180,
				layout: "horizontal" as const,
				shapes: [
					{
						type: "rectangle" as const,
						totalParts: 28,
						rows: 4,
						columns: 7,
						shadedCells: Array.from({ length: 28 }, (_, i) => i), // All 28 parts shaded
						hatchedCells: [0, 1, 2, 3, 4, 5, 6], // First row hatched
						shadeColor: "#01d1c1",
						shadeOpacity: 0.5
					},
					{
						type: "rectangle" as const,
						totalParts: 28,
						rows: 4,
						columns: 7,
						shadedCells: [0, 1, 2, 7, 8, 9, 14, 15, 16, 21, 22, 23], // 12 specific cells
						hatchedCells: [0, 1, 2], // First 3 cells hatched
						shadeColor: "#01d1c1",
						shadeOpacity: 0.5
					}
				],
				overlays: null
			}

			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	// NEW: Add a new test suite for the "geometry" mode
	describe("Geometry Mode", () => {
		test("should render a right triangle on a grid", () => {
			const props = {
				type: "partitionedShape" as const,
				mode: "geometry" as const,
				width: 240,
				height: 120,
				grid: {
					rows: 7,
					columns: 14,
					opacity: 0.2
				},
				figures: [
					{
						vertices: [
							{ row: 1, col: 1 },
							{ row: 6, col: 1 },
							{ row: 6, col: 13 }
						],
						fillColor: "rgba(120, 84, 171, 0.2)",
						strokeColor: "#7854ab"
					}
				],
				// REFINEMENT: The figure itself creates the outline, so 'lines' are not needed for the main shape.
				// 'lines' should be used for supplementary annotations, as shown in the "multiple polygons" test.
				lines: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a rectangle on a grid", () => {
			const props = {
				type: "partitionedShape" as const,
				mode: "geometry" as const,
				width: 300,
				height: 300,
				grid: {
					rows: 10,
					columns: 10,
					opacity: 0.15
				},
				figures: [
					{
						vertices: [
							{ row: 2, col: 2 },
							{ row: 2, col: 8 },
							{ row: 7, col: 8 },
							{ row: 7, col: 2 }
						],
						fillColor: "#E8F5E9",
						strokeColor: "#2E7D32"
					}
				],
				lines: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render multiple polygons on a grid", () => {
			const props = {
				type: "partitionedShape" as const,
				mode: "geometry" as const,
				width: 400,
				height: 400,
				grid: {
					rows: 8,
					columns: 8,
					opacity: 0.25
				},
				figures: [
					{
						vertices: [
							{ row: 1, col: 1 },
							{ row: 1, col: 3 },
							{ row: 3, col: 3 },
							{ row: 3, col: 1 }
						],
						fillColor: "#FFEBEE",
						strokeColor: "#D32F2F"
					},
					{
						vertices: [
							{ row: 5, col: 5 },
							{ row: 4, col: 7 },
							{ row: 7, col: 7 }
						],
						fillColor: "#E3F2FD",
						strokeColor: "#1976D2"
					}
				],
				lines: [
					{
						from: { row: 4, col: 0 },
						to: { row: 4, col: 8 },
						style: "dotted" as const,
						color: "#9E9E9E"
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render grid only with no figures", () => {
			const props = {
				type: "partitionedShape" as const,
				mode: "geometry" as const,
				width: 200,
				height: 200,
				grid: {
					rows: 5,
					columns: 5,
					opacity: 0.3
				},
				figures: null,
				lines: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
