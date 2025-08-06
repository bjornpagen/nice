import { describe, expect, test } from "bun:test"
import { generateTreeDiagram, TreeDiagramPropsSchema } from "./tree-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = TreeDiagramPropsSchema.parse(props)
	return generateTreeDiagram(parsedProps)
}

describe("generateTreeDiagram", () => {
	describe("Basic Tree Structures", () => {
		test("should render simple binary tree", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 400,
				height: 300,
				nodes: [
					{
						id: "root",
						label: "144",
						position: { x: 200, y: 50 },
						style: null,
						color: null
					},
					{
						id: "left",
						label: "12",
						position: { x: 100, y: 150 },
						style: null,
						color: null
					},
					{
						id: "right",
						label: "12",
						position: { x: 300, y: 150 },
						style: null,
						color: null
					}
				],
				edges: [
					{
						from: "root",
						to: "left",
						style: null
					},
					{
						from: "root",
						to: "right",
						style: null
					}
				],
				nodeFontSize: null,
				nodeRadius: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render prime factorization tree with circled leaves", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 500,
				height: 400,
				nodes: [
					{
						id: "root",
						label: "144",
						position: { x: 250, y: 50 },
						style: "default",
						color: "black"
					},
					{
						id: "n1",
						label: "12",
						position: { x: 150, y: 120 },
						style: "default",
						color: "black"
					},
					{
						id: "n2",
						label: "12",
						position: { x: 350, y: 120 },
						style: "default",
						color: "black"
					},
					{
						id: "n3",
						label: "3",
						position: { x: 100, y: 190 },
						style: "circled",
						color: "blue"
					},
					{
						id: "n4",
						label: "4",
						position: { x: 200, y: 190 },
						style: "default",
						color: "black"
					},
					{
						id: "n5",
						label: "3",
						position: { x: 300, y: 190 },
						style: "circled",
						color: "blue"
					},
					{
						id: "n6",
						label: "4",
						position: { x: 400, y: 190 },
						style: "default",
						color: "black"
					},
					{
						id: "n7",
						label: "2",
						position: { x: 175, y: 260 },
						style: "circled",
						color: "red"
					},
					{
						id: "n8",
						label: "2",
						position: { x: 225, y: 260 },
						style: "circled",
						color: "red"
					},
					{
						id: "n9",
						label: "2",
						position: { x: 375, y: 260 },
						style: "circled",
						color: "red"
					},
					{
						id: "n10",
						label: "2",
						position: { x: 425, y: 260 },
						style: "circled",
						color: "red"
					}
				],
				edges: [
					{ from: "root", to: "n1", style: "solid" },
					{ from: "root", to: "n2", style: "solid" },
					{ from: "n1", to: "n3", style: "solid" },
					{ from: "n1", to: "n4", style: "solid" },
					{ from: "n2", to: "n5", style: "solid" },
					{ from: "n2", to: "n6", style: "solid" },
					{ from: "n4", to: "n7", style: "solid" },
					{ from: "n4", to: "n8", style: "solid" },
					{ from: "n6", to: "n9", style: "solid" },
					{ from: "n6", to: "n10", style: "solid" }
				],
				nodeFontSize: 14,
				nodeRadius: 18
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render probability tree with dashed edges", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 600,
				height: 350,
				nodes: [
					{
						id: "start",
						label: "Start",
						position: { x: 100, y: 175 },
						style: "circled",
						color: "green"
					},
					{
						id: "heads1",
						label: "H",
						position: { x: 250, y: 100 },
						style: "circled",
						color: "blue"
					},
					{
						id: "tails1",
						label: "T",
						position: { x: 250, y: 250 },
						style: "circled",
						color: "blue"
					},
					{
						id: "hh",
						label: "HH",
						position: { x: 400, y: 50 },
						style: "default",
						color: "purple"
					},
					{
						id: "ht",
						label: "HT",
						position: { x: 400, y: 150 },
						style: "default",
						color: "purple"
					},
					{
						id: "th",
						label: "TH",
						position: { x: 400, y: 200 },
						style: "default",
						color: "purple"
					},
					{
						id: "tt",
						label: "TT",
						position: { x: 400, y: 300 },
						style: "default",
						color: "purple"
					}
				],
				edges: [
					{ from: "start", to: "heads1", style: "solid" },
					{ from: "start", to: "tails1", style: "solid" },
					{ from: "heads1", to: "hh", style: "dashed" },
					{ from: "heads1", to: "ht", style: "dashed" },
					{ from: "tails1", to: "th", style: "dashed" },
					{ from: "tails1", to: "tt", style: "dashed" }
				],
				nodeFontSize: 16,
				nodeRadius: 25
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Edge Cases and Variations", () => {
		test("should render single node tree", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 200,
				height: 200,
				nodes: [
					{
						id: "single",
						label: "Lone Node",
						position: { x: 100, y: 100 },
						style: "circled",
						color: "red"
					}
				],
				edges: [],
				nodeFontSize: 18,
				nodeRadius: 30
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should handle deep tree structure", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 300,
				height: 500,
				nodes: [
					{
						id: "level0",
						label: "Root",
						position: { x: 150, y: 50 },
						style: "default",
						color: "black"
					},
					{
						id: "level1",
						label: "L1",
						position: { x: 150, y: 120 },
						style: "default",
						color: "black"
					},
					{
						id: "level2",
						label: "L2",
						position: { x: 150, y: 190 },
						style: "default",
						color: "black"
					},
					{
						id: "level3",
						label: "L3",
						position: { x: 150, y: 260 },
						style: "default",
						color: "black"
					},
					{
						id: "level4",
						label: "Leaf",
						position: { x: 150, y: 330 },
						style: "circled",
						color: "green"
					}
				],
				edges: [
					{ from: "level0", to: "level1", style: "solid" },
					{ from: "level1", to: "level2", style: "solid" },
					{ from: "level2", to: "level3", style: "solid" },
					{ from: "level3", to: "level4", style: "solid" }
				],
				nodeFontSize: null,
				nodeRadius: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should handle wide tree with many children", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 800,
				height: 300,
				nodes: [
					{
						id: "root",
						label: "Root",
						position: { x: 400, y: 50 },
						style: "circled",
						color: "orange"
					},
					{
						id: "child1",
						label: "C1",
						position: { x: 100, y: 150 },
						style: "default",
						color: "blue"
					},
					{
						id: "child2",
						label: "C2",
						position: { x: 250, y: 150 },
						style: "default",
						color: "blue"
					},
					{
						id: "child3",
						label: "C3",
						position: { x: 400, y: 150 },
						style: "default",
						color: "blue"
					},
					{
						id: "child4",
						label: "C4",
						position: { x: 550, y: 150 },
						style: "default",
						color: "blue"
					},
					{
						id: "child5",
						label: "C5",
						position: { x: 700, y: 150 },
						style: "default",
						color: "blue"
					}
				],
				edges: [
					{ from: "root", to: "child1", style: "solid" },
					{ from: "root", to: "child2", style: "solid" },
					{ from: "root", to: "child3", style: "solid" },
					{ from: "root", to: "child4", style: "solid" },
					{ from: "root", to: "child5", style: "solid" }
				],
				nodeFontSize: 12,
				nodeRadius: 15
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Custom Styling", () => {
		test("should render with custom font size and node radius", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 400,
				height: 300,
				nodes: [
					{
						id: "big",
						label: "Big Node",
						position: { x: 200, y: 100 },
						style: "circled",
						color: "purple"
					},
					{
						id: "small",
						label: "Small",
						position: { x: 200, y: 200 },
						style: "default",
						color: "green"
					}
				],
				edges: [{ from: "big", to: "small", style: "solid" }],
				nodeFontSize: 24,
				nodeRadius: 40
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render mixed edge styles", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 400,
				height: 300,
				nodes: [
					{
						id: "center",
						label: "Mixed",
						position: { x: 200, y: 100 },
						style: "default",
						color: "black"
					},
					{
						id: "solid_child",
						label: "Solid",
						position: { x: 100, y: 200 },
						style: "circled",
						color: "blue"
					},
					{
						id: "dashed_child",
						label: "Dashed",
						position: { x: 300, y: 200 },
						style: "circled",
						color: "red"
					}
				],
				edges: [
					{ from: "center", to: "solid_child", style: "solid" },
					{ from: "center", to: "dashed_child", style: "dashed" }
				],
				nodeFontSize: null,
				nodeRadius: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with different colors per node", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 500,
				height: 200,
				nodes: [
					{
						id: "red_node",
						label: "Red",
						position: { x: 100, y: 100 },
						style: "circled",
						color: "red"
					},
					{
						id: "green_node",
						label: "Green",
						position: { x: 250, y: 100 },
						style: "circled",
						color: "green"
					},
					{
						id: "blue_node",
						label: "Blue",
						position: { x: 400, y: 100 },
						style: "circled",
						color: "blue"
					}
				],
				edges: [],
				nodeFontSize: 18,
				nodeRadius: 25
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Error Handling", () => {
		test("should handle missing nodes gracefully", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 400,
				height: 300,
				nodes: [
					{
						id: "existing",
						label: "Exists",
						position: { x: 200, y: 150 },
						style: "default",
						color: "black"
					}
				],
				edges: [
					{ from: "existing", to: "missing", style: "solid" },
					{ from: "nonexistent", to: "existing", style: "solid" }
				],
				nodeFontSize: null,
				nodeRadius: null
			}
			// Should not crash and should skip invalid edges
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Default Values", () => {
		test("should apply default values for null properties", () => {
			const props = {
				type: "treeDiagram" as const,
				width: null,
				height: null,
				nodes: [
					{
						id: "default_test",
						label: "Default",
						position: { x: 200, y: 200 },
						style: null,
						color: null
					}
				],
				edges: [],
				nodeFontSize: null,
				nodeRadius: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Schema Validation", () => {
		test("should require at least one node", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 400,
				height: 300,
				nodes: [],
				edges: [],
				nodeFontSize: null,
				nodeRadius: null
			}
			expect(() => generateDiagram(props)).toThrow()
		})

		test("should validate node structure", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 400,
				height: 300,
				nodes: [
					{
						id: "invalid",
						// Missing required fields
						position: { x: 100 }
					}
				],
				edges: [],
				nodeFontSize: null,
				nodeRadius: null
			}
			expect(() => generateDiagram(props)).toThrow()
		})

		test("should validate edge structure", () => {
			const props = {
				type: "treeDiagram" as const,
				width: 400,
				height: 300,
				nodes: [
					{
						id: "test",
						label: "Test",
						position: { x: 200, y: 200 },
						style: null,
						color: null
					}
				],
				edges: [
					{
						// Missing required 'to' field
						from: "test",
						style: "solid"
					}
				],
				nodeFontSize: null,
				nodeRadius: null
			}
			expect(() => generateDiagram(props)).toThrow()
		})
	})
})
