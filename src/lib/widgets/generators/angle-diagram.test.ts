import { describe, expect, test } from "bun:test"
import { AngleDiagramPropsSchema, generateAngleDiagram } from "./angle-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = AngleDiagramPropsSchema.parse(props)
	return generateAngleDiagram(parsedProps)
}

describe("generateAngleDiagram", () => {
	describe("Basic Angle Configurations", () => {
		test("should render single angle with three points", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 150, label: "A" },
					{ id: "B", x: 150, y: 150, label: "B" },
					{ id: "C", x: 250, y: 100, label: "C" }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "∠ABC",
						color: null,
						radius: null,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render right angle with square marker", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "P", x: 100, y: 200, label: "P" },
					{ id: "Q", x: 200, y: 200, label: "Q" },
					{ id: "R", x: 200, y: 100, label: "R" }
				],
				rays: [
					{ from: "Q", to: "P" },
					{ from: "Q", to: "R" }
				],
				angles: [
					{
						vertices: ["P", "Q", "R"],
						label: "90°",
						color: null,
						radius: null,
						isRightAngle: true
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render acute angle with custom color", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "X", x: 80, y: 180, label: "X" },
					{ id: "Y", x: 180, y: 180, label: "Y" },
					{ id: "Z", x: 220, y: 120, label: "Z" }
				],
				rays: [
					{ from: "Y", to: "X" },
					{ from: "Y", to: "Z" }
				],
				angles: [
					{
						vertices: ["X", "Y", "Z"],
						label: "45°",
						color: "rgba(66, 133, 244, 0.8)",
						radius: null,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render obtuse angle with custom radius", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "M", x: 60, y: 150, label: "M" },
					{ id: "N", x: 160, y: 150, label: "N" },
					{ id: "O", x: 220, y: 200, label: "O" }
				],
				rays: [
					{ from: "N", to: "M" },
					{ from: "N", to: "O" }
				],
				angles: [
					{
						vertices: ["M", "N", "O"],
						label: "120°",
						color: null,
						radius: 50,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Multiple Angles", () => {
		test("should render two adjacent angles", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 150, label: "A" },
					{ id: "B", x: 150, y: 150, label: "B" },
					{ id: "C", x: 250, y: 100, label: "C" },
					{ id: "D", x: 250, y: 200, label: "D" }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" },
					{ from: "B", to: "D" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "α",
						color: "rgba(217, 95, 79, 0.8)",
						radius: null,
						isRightAngle: null
					},
					{
						vertices: ["C", "B", "D"],
						label: "β",
						color: "rgba(66, 133, 244, 0.8)",
						radius: null,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render vertical angles", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 100, label: "A" },
					{ id: "B", x: 200, y: 150, label: "B" },
					{ id: "C", x: 350, y: 200, label: "C" },
					{ id: "D", x: 50, y: 200, label: "D" },
					{ id: "E", x: 350, y: 100, label: "E" }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" },
					{ from: "B", to: "D" },
					{ from: "B", to: "E" }
				],
				angles: [
					{
						vertices: ["A", "B", "D"],
						label: "x",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 25,
						isRightAngle: null
					},
					{
						vertices: ["C", "B", "E"],
						label: "x",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 25,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render complementary angles", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "P", x: 100, y: 200, label: "P" },
					{ id: "Q", x: 200, y: 200, label: "Q" },
					{ id: "R", x: 200, y: 100, label: "R" },
					{ id: "S", x: 250, y: 130, label: "S" }
				],
				rays: [
					{ from: "Q", to: "P" },
					{ from: "Q", to: "R" },
					{ from: "Q", to: "S" }
				],
				angles: [
					{
						vertices: ["P", "Q", "S"],
						label: "30°",
						color: "rgba(76, 175, 80, 0.6)",
						radius: null,
						isRightAngle: null
					},
					{
						vertices: ["S", "Q", "R"],
						label: "60°",
						color: "rgba(255, 193, 7, 0.6)",
						radius: null,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Complex Geometric Figures", () => {
		test("should render triangle with all interior angles", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 200, y: 50, label: "A" },
					{ id: "B", x: 100, y: 200, label: "B" },
					{ id: "C", x: 300, y: 200, label: "C" }
				],
				rays: [
					{ from: "A", to: "B" },
					{ from: "A", to: "C" },
					{ from: "B", to: "A" },
					{ from: "B", to: "C" },
					{ from: "C", to: "A" },
					{ from: "C", to: "B" }
				],
				angles: [
					{
						vertices: ["B", "A", "C"],
						label: "60°",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 25,
						isRightAngle: null
					},
					{
						vertices: ["A", "B", "C"],
						label: "60°",
						color: "rgba(66, 133, 244, 0.8)",
						radius: 25,
						isRightAngle: null
					},
					{
						vertices: ["A", "C", "B"],
						label: "60°",
						color: "rgba(76, 175, 80, 0.8)",
						radius: 25,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render parallel lines with transversal", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 500,
				height: 400,
				points: [
					{ id: "A", x: 50, y: 120, label: "A" },
					{ id: "B", x: 450, y: 120, label: "B" },
					{ id: "C", x: 50, y: 280, label: "C" },
					{ id: "D", x: 450, y: 280, label: "D" },
					{ id: "E", x: 150, y: 50, label: "E" },
					{ id: "F", x: 350, y: 350, label: "F" },
					{ id: "P", x: 200, y: 120, label: null },
					{ id: "Q", x: 300, y: 280, label: null }
				],
				rays: [
					{ from: "A", to: "B" },
					{ from: "C", to: "D" },
					{ from: "E", to: "F" }
				],
				angles: [
					{
						vertices: ["A", "P", "E"],
						label: "1",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 20,
						isRightAngle: null
					},
					{
						vertices: ["C", "Q", "F"],
						label: "1",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 20,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Special Cases", () => {
		test("should render angle with algebraic label", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 80, y: 180, label: "A" },
					{ id: "B", x: 180, y: 180, label: "B" },
					{ id: "C", x: 250, y: 120, label: "C" }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "2x + 15°",
						color: null,
						radius: null,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render angle without label", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "X", x: 100, y: 150, label: "X" },
					{ id: "Y", x: 200, y: 150, label: "Y" },
					{ id: "Z", x: 300, y: 100, label: "Z" }
				],
				rays: [
					{ from: "Y", to: "X" },
					{ from: "Y", to: "Z" }
				],
				angles: [
					{
						vertices: ["X", "Y", "Z"],
						label: null,
						color: "rgba(156, 39, 176, 0.8)",
						radius: null,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render points without labels", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "P1", x: 100, y: 150, label: null },
					{ id: "P2", x: 200, y: 150, label: null },
					{ id: "P3", x: 300, y: 100, label: null }
				],
				rays: [
					{ from: "P2", to: "P1" },
					{ from: "P2", to: "P3" }
				],
				angles: [
					{
						vertices: ["P1", "P2", "P3"],
						label: "θ",
						color: null,
						radius: null,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render reflex angle", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 100, y: 150, label: "A" },
					{ id: "B", x: 200, y: 150, label: "B" },
					{ id: "C", x: 180, y: 100, label: "C" }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "300°",
						color: "rgba(233, 30, 99, 0.8)",
						radius: 40,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Canvas and Sizing", () => {
		test("should render with custom canvas dimensions", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 600,
				height: 500,
				points: [
					{ id: "A", x: 150, y: 250, label: "A" },
					{ id: "B", x: 300, y: 250, label: "B" },
					{ id: "C", x: 450, y: 150, label: "C" }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "∠ABC",
						color: null,
						radius: null,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with small canvas dimensions", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 200,
				height: 150,
				points: [
					{ id: "A", x: 50, y: 75, label: "A" },
					{ id: "B", x: 100, y: 75, label: "B" },
					{ id: "C", x: 150, y: 50, label: "C" }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "45°",
						color: null,
						radius: 15,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Default Values", () => {
		test("should render with width null (defaults to 400)", () => {
			const props = {
				type: "angleDiagram" as const,
				width: null,
				height: 300,
				points: [
					{ id: "A", x: 100, y: 150, label: "A" },
					{ id: "B", x: 200, y: 150, label: "B" },
					{ id: "C", x: 300, y: 100, label: "C" }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "60°",
						color: null,
						radius: null,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with height null (defaults to 300)", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: null,
				points: [
					{ id: "A", x: 100, y: 150, label: "A" },
					{ id: "B", x: 200, y: 150, label: "B" },
					{ id: "C", x: 300, y: 100, label: "C" }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "60°",
						color: null,
						radius: null,
						isRightAngle: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with all default angle properties", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 100, y: 150, label: "A" },
					{ id: "B", x: 200, y: 150, label: "B" },
					{ id: "C", x: 300, y: 100, label: "C" }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "Default",
						color: null, // Will default to "rgba(217, 95, 79, 0.8)"
						radius: null, // Will default to 30
						isRightAngle: null // Will default to false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
