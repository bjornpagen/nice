import { describe, expect, test } from "bun:test"
import { generateRatioBoxDiagram, RatioBoxDiagramPropsSchema } from "./ratio-box-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = RatioBoxDiagramPropsSchema.parse(props)
	return generateRatioBoxDiagram(parsedProps)
}

describe("generateRatioBoxDiagram", () => {
	describe("Basic Ratio Diagrams", () => {
		test("should render basic ratio with outlined and filled items", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 320,
				height: 160,
				items: [
					{
						count: 9,
						color: "#0c7f99",
						style: "outline" as const
					},
					{
						count: 6,
						color: "#bc2612",
						style: "filled" as const
					}
				],
				itemsPerRow: 5,
				boxes: [
					{
						startRow: 0,
						endRow: 1,
						startCol: 0,
						endCol: 4,
						label: null
					},
					{
						startRow: 2,
						endRow: 2,
						startCol: 0,
						endCol: 4,
						label: null
					}
				],
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render partitioned ratio with 3 groups", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 400,
				height: 200,
				items: [
					{
						count: 3,
						color: "#0c7f99",
						style: "outline" as const
					},
					{
						count: 2,
						color: "#bc2612",
						style: "filled" as const
					},
					{
						count: 3,
						color: "#0c7f99",
						style: "outline" as const
					},
					{
						count: 2,
						color: "#bc2612",
						style: "filled" as const
					},
					{
						count: 3,
						color: "#0c7f99",
						style: "outline" as const
					},
					{
						count: 2,
						color: "#bc2612",
						style: "filled" as const
					}
				],
				itemsPerRow: 5,
				boxes: null,
				partitions: 3,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render simple grid with no boxes or partitions", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 300,
				height: 150,
				items: [
					{
						count: 8,
						color: "#4CAF50",
						style: "filled" as const
					},
					{
						count: 4,
						color: "#FF9800",
						style: "outline" as const
					}
				],
				itemsPerRow: 4,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render single row layout", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 500,
				height: 120,
				items: [
					{
						count: 6,
						color: "#2196F3",
						style: "filled" as const
					},
					{
						count: 3,
						color: "#E91E63",
						style: "outline" as const
					}
				],
				itemsPerRow: 10, // Greater than total items (9)
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render single item type", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 320,
				height: 160,
				items: [
					{
						count: 12,
						color: "#9C27B0",
						style: "filled" as const
					}
				],
				itemsPerRow: 4,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Box Overlay Variations", () => {
		test("should render with single box overlay", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 400,
				height: 200,
				items: [
					{
						count: 6,
						color: "#FF5722",
						style: "filled" as const
					},
					{
						count: 6,
						color: "#607D8B",
						style: "outline" as const
					}
				],
				itemsPerRow: 4,
				boxes: [
					{
						startRow: 0,
						endRow: 1,
						startCol: 0,
						endCol: 1,
						label: "Group A"
					}
				],
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with multiple box overlays", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 450,
				height: 180,
				items: [
					{
						count: 8,
						color: "#795548",
						style: "filled" as const
					},
					{
						count: 4,
						color: "#FFC107",
						style: "outline" as const
					}
				],
				itemsPerRow: 4,
				boxes: [
					{
						startRow: 0,
						endRow: 0,
						startCol: 0,
						endCol: 3,
						label: "First Row"
					},
					{
						startRow: 1,
						endRow: 2,
						startCol: 0,
						endCol: 1,
						label: "Left Block"
					},
					{
						startRow: 1,
						endRow: 2,
						startCol: 2,
						endCol: 3,
						label: "Right Block"
					}
				],
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with overlapping boxes", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 360,
				height: 180,
				items: [
					{
						count: 9,
						color: "#00BCD4",
						style: "filled" as const
					}
				],
				itemsPerRow: 3,
				boxes: [
					{
						startRow: 0,
						endRow: 1,
						startCol: 0,
						endCol: 2,
						label: null
					},
					{
						startRow: 1,
						endRow: 2,
						startCol: 1,
						endCol: 2,
						label: null
					}
				],
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render boxes with labels", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 400,
				height: 200,
				items: [
					{
						count: 6,
						color: "#8BC34A",
						style: "filled" as const
					},
					{
						count: 6,
						color: "#FF6B6B",
						style: "outline" as const
					}
				],
				itemsPerRow: 3,
				boxes: [
					{
						startRow: 0,
						endRow: 1,
						startCol: 0,
						endCol: 2,
						label: "Top Section"
					},
					{
						startRow: 2,
						endRow: 3,
						startCol: 0,
						endCol: 2,
						label: "Bottom Section"
					}
				],
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Partition Variations", () => {
		test("should render horizontal partitions (full row alignment)", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 400,
				height: 240,
				items: [
					{
						count: 12,
						color: "#3F51B5",
						style: "filled" as const
					}
				],
				itemsPerRow: 4,
				boxes: null,
				partitions: 3, // 12 items / 3 partitions = 4 items per partition (1 row each)
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render vertical partitions (column alignment)", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 500,
				height: 200,
				items: [
					{
						count: 16,
						color: "#009688",
						style: "outline" as const
					}
				],
				itemsPerRow: 8,
				boxes: null,
				partitions: 4, // 8 items per row / 4 partitions = 2 columns per partition
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render partitions with mixed item types", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 480,
				height: 160,
				items: [
					{
						count: 4,
						color: "#E91E63",
						style: "filled" as const
					},
					{
						count: 2,
						color: "#673AB7",
						style: "outline" as const
					},
					{
						count: 4,
						color: "#E91E63",
						style: "filled" as const
					},
					{
						count: 2,
						color: "#673AB7",
						style: "outline" as const
					}
				],
				itemsPerRow: 6,
				boxes: null,
				partitions: 2,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render many small partitions", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 600,
				height: 150,
				items: [
					{
						count: 20,
						color: "#FF9800",
						style: "filled" as const
					}
				],
				itemsPerRow: 10,
				boxes: null,
				partitions: 5, // 10 items per row / 5 partitions = 2 columns per partition
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Item Style Variations", () => {
		test("should render all filled items", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 320,
				height: 160,
				items: [
					{
						count: 8,
						color: "#FF5722",
						style: "filled" as const
					},
					{
						count: 4,
						color: "#4CAF50",
						style: "filled" as const
					}
				],
				itemsPerRow: 4,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render all outline items", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 320,
				height: 160,
				items: [
					{
						count: 6,
						color: "#2196F3",
						style: "outline" as const
					},
					{
						count: 6,
						color: "#9C27B0",
						style: "outline" as const
					}
				],
				itemsPerRow: 4,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render mixed styles with different colors", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 400,
				height: 200,
				items: [
					{
						count: 3,
						color: "#F44336",
						style: "filled" as const
					},
					{
						count: 3,
						color: "#2196F3",
						style: "outline" as const
					},
					{
						count: 3,
						color: "#4CAF50",
						style: "filled" as const
					},
					{
						count: 3,
						color: "#FF9800",
						style: "outline" as const
					}
				],
				itemsPerRow: 4,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with style defaulting to filled when null", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 300,
				height: 150,
				items: [
					{
						count: 6,
						color: "#795548",
						style: null // Should default to "filled"
					},
					{
						count: 3,
						color: "#607D8B",
						style: "outline" as const
					}
				],
				itemsPerRow: 3,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Canvas and Sizing", () => {
		test("should render with custom large dimensions", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 600,
				height: 300,
				items: [
					{
						count: 10,
						color: "#E91E63",
						style: "filled" as const
					},
					{
						count: 5,
						color: "#00BCD4",
						style: "outline" as const
					}
				],
				itemsPerRow: 5,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with small dimensions", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 200,
				height: 100,
				items: [
					{
						count: 4,
						color: "#9C27B0",
						style: "filled" as const
					}
				],
				itemsPerRow: 2,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with square canvas", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 400,
				height: 400,
				items: [
					{
						count: 9,
						color: "#FF6B6B",
						style: "filled" as const
					},
					{
						count: 7,
						color: "#4ECDC4",
						style: "outline" as const
					}
				],
				itemsPerRow: 4,
				boxes: [
					{
						startRow: 0,
						endRow: 1,
						startCol: 0,
						endCol: 3,
						label: null
					}
				],
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Combined Features", () => {
		test("should render with both boxes and partitions", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 500,
				height: 200,
				items: [
					{
						count: 8,
						color: "#FF5722",
						style: "filled" as const
					},
					{
						count: 4,
						color: "#2196F3",
						style: "outline" as const
					}
				],
				itemsPerRow: 6,
				boxes: [
					{
						startRow: 0,
						endRow: 0,
						startCol: 0,
						endCol: 5,
						label: "Top Row"
					}
				],
				partitions: 2,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render complex ratio demonstration", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 540,
				height: 270,
				items: [
					{
						count: 6,
						color: "#4CAF50",
						style: "filled" as const
					},
					{
						count: 3,
						color: "#FF9800",
						style: "outline" as const
					},
					{
						count: 6,
						color: "#4CAF50",
						style: "filled" as const
					},
					{
						count: 3,
						color: "#FF9800",
						style: "outline" as const
					}
				],
				itemsPerRow: 6,
				boxes: [
					{
						startRow: 0,
						endRow: 1,
						startCol: 0,
						endCol: 2,
						label: "Group 1"
					},
					{
						startRow: 0,
						endRow: 1,
						startCol: 3,
						endCol: 5,
						label: "Group 2"
					},
					{
						startRow: 2,
						endRow: 2,
						startCol: 0,
						endCol: 2,
						label: "Group 3"
					}
				],
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render blue outlined and red filled circles with box overlay", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 400,
				height: 200,
				items: [
					{
						count: 9,
						color: "#0c7f99",
						style: "outline" as const
					},
					{
						count: 6,
						color: "#bc2612",
						style: "filled" as const
					}
				],
				itemsPerRow: 5,
				boxes: [
					{
						startRow: 0,
						endRow: 2,
						startCol: 0,
						endCol: 4,
						label: null
					}
				],
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Edge Cases and Special Configurations", () => {
		test("should render with zero count items (empty categories)", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 320,
				height: 160,
				items: [
					{
						count: 8,
						color: "#FF5722",
						style: "filled" as const
					},
					{
						count: 0,
						color: "#2196F3",
						style: "outline" as const
					},
					{
						count: 4,
						color: "#4CAF50",
						style: "filled" as const
					}
				],
				itemsPerRow: 4,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with single item", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 200,
				height: 120,
				items: [
					{
						count: 1,
						color: "#9C27B0",
						style: "filled" as const
					}
				],
				itemsPerRow: 1,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with many items in single row", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 800,
				height: 120,
				items: [
					{
						count: 15,
						color: "#FF6B6B",
						style: "filled" as const
					},
					{
						count: 5,
						color: "#4ECDC4",
						style: "outline" as const
					}
				],
				itemsPerRow: 20,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with many small items", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 500,
				height: 300,
				items: [
					{
						count: 30,
						color: "#673AB7",
						style: "filled" as const
					},
					{
						count: 15,
						color: "#009688",
						style: "outline" as const
					}
				],
				itemsPerRow: 9,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render box coordinates outside grid bounds (clamped to grid)", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 400,
				height: 200,
				items: [
					{
						count: 12,
						color: "#FF9800",
						style: "filled" as const
					}
				],
				itemsPerRow: 4, // Grid will be 4 columns x 3 rows (12 items / 4 per row)
				boxes: [
					{
						startRow: 0,
						endRow: 10, // Should be clamped to numRows - 1 (which is 2)
						startCol: 0,
						endCol: 8, // Should be clamped to itemsPerRow - 1 (which is 3)
						label: "Clamped Box"
					}
				],
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render partitions with non-divisible total (ignored)", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 350,
				height: 175,
				items: [
					{
						count: 7, // Not divisible by 3
						color: "#E91E63",
						style: "filled" as const
					}
				],
				itemsPerRow: 3,
				boxes: null,
				partitions: 3, // Should be ignored since 7 % 3 !== 0
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Default Values", () => {
		test("should render with width null (defaults to 320)", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: null,
				height: 160,
				items: [
					{
						count: 6,
						color: "#2196F3",
						style: "filled" as const
					}
				],
				itemsPerRow: 3,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with height null (defaults to 160)", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: 320,
				height: null,
				items: [
					{
						count: 6,
						color: "#4CAF50",
						style: "outline" as const
					}
				],
				itemsPerRow: 3,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with both width and height null", () => {
			const props = {
				type: "ratioBoxDiagram" as const,
				width: null, // defaults to 320
				height: null, // defaults to 160
				items: [
					{
						count: 8,
						color: "#FF5722",
						style: "filled" as const
					}
				],
				itemsPerRow: 4,
				boxes: null,
				partitions: null,
				layout: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
