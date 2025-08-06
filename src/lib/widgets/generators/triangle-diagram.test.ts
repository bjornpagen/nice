import { describe, expect, test } from "bun:test"
import { generateTriangleDiagram, TriangleDiagramPropsSchema } from "./triangle-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = TriangleDiagramPropsSchema.parse(props)
	return generateTriangleDiagram(parsedProps)
}

describe("generateTriangleDiagram", () => {
	describe("Basic Configurations", () => {
		test("should render a simple triangle with vertex labels", () => {
			const props = {
				type: "triangleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 250, label: "A" },
					{ id: "B", x: 350, y: 250, label: "B" },
					{ id: "C", x: 200, y: 50, label: "C" }
				],
				sides: null,
				angles: null,
				internalLines: null,
				shadedRegions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a right triangle with a right angle marker", () => {
			const props = {
				type: "triangleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "P", x: 50, y: 250, label: "P" },
					{ id: "Q", x: 250, y: 250, label: "Q" },
					{ id: "R", x: 50, y: 100, label: "R" }
				],
				sides: null,
				angles: [{ vertices: ["R", "P", "Q"], isRightAngle: true, label: null, color: null, radius: null }],
				internalLines: null,
				shadedRegions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a triangle with labeled sides", () => {
			const props = {
				type: "triangleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 250, label: null },
					{ id: "B", x: 250, y: 250, label: null },
					{ id: "C", x: 150, y: 100, label: null }
				],
				sides: [
					{ vertices: ["A", "B"], label: "6", tickMarks: null },
					{ vertices: ["B", "C"], label: "x", tickMarks: null },
					{ vertices: ["C", "A"], label: "5", tickMarks: null }
				],
				angles: null,
				internalLines: null,
				shadedRegions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render an isosceles triangle with congruence tick marks", () => {
			const props = {
				type: "triangleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "X", x: 50, y: 250, label: "X" },
					{ id: "Y", x: 350, y: 250, label: "Y" },
					{ id: "Z", x: 200, y: 50, label: "Z" }
				],
				sides: [
					{ vertices: ["X", "Z"], label: "√74", tickMarks: 1 },
					{ vertices: ["Y", "Z"], label: "√74", tickMarks: 1 }
				],
				angles: null,
				internalLines: null,
				shadedRegions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a triangle with labeled angles", () => {
			const props = {
				type: "triangleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 250, label: null },
					{ id: "B", x: 300, y: 250, label: null },
					{ id: "C", x: 200, y: 50, label: null }
				],
				sides: null,
				angles: [
					{ vertices: ["C", "A", "B"], label: "x°", isRightAngle: null, color: null, radius: null },
					{ vertices: ["C", "B", "A"], label: "33°", isRightAngle: null, color: null, radius: null },
					{ vertices: ["A", "C", "B"], label: "114°", isRightAngle: null, color: null, radius: null }
				],
				internalLines: null,
				shadedRegions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Complex and Composite Figures", () => {
		test("should render a triangle with a dashed altitude", () => {
			const props = {
				type: "triangleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 250, label: null },
					{ id: "B", x: 350, y: 250, label: null },
					{ id: "C", x: 200, y: 50, label: null },
					{ id: "D", x: 200, y: 250, label: null } // Point for altitude base
				],
				sides: [
					{ vertices: ["A", "B"], label: "x", tickMarks: null },
					{ vertices: ["C", "D"], label: "7", tickMarks: null }
				],
				angles: [{ vertices: ["C", "D", "B"], isRightAngle: true, label: null, color: null, radius: null }],
				internalLines: [{ from: "C", to: "D", style: "dashed" }],
				shadedRegions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a triangle with shaded sub-regions", () => {
			const props = {
				type: "triangleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 250, label: "A" },
					{ id: "B", x: 350, y: 250, label: "B" },
					{ id: "C", x: 200, y: 50, label: "C" },
					{ id: "D", x: 200, y: 250, label: "D" }
				],
				sides: null,
				angles: null,
				internalLines: [{ from: "C", to: "D", style: "solid" }],
				shadedRegions: [
					{ vertices: ["A", "D", "C"], color: "rgba(40, 174, 123, 0.2)" },
					{ vertices: ["B", "D", "C"], color: "rgba(157, 56, 189, 0.2)" }
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should replicate complex isosceles triangle example", () => {
			const props = {
				type: "triangleDiagram" as const,
				width: 240,
				height: 219,
				points: [
					{ id: "A", x: 4.6, y: 173.1, label: null },
					{ id: "B", x: 235.4, y: 173.1, label: null },
					{ id: "C", x: 120, y: 11.5, label: null },
					{ id: "D", x: 120, y: 173.1, label: null }
				],
				sides: [
					{ vertices: ["A", "C"], label: "√74", tickMarks: 1 },
					{ vertices: ["B", "C"], label: "√74", tickMarks: 1 },
					{ vertices: ["A", "B"], label: "x", tickMarks: 0 }
				],
				angles: [
					{ vertices: ["C", "A", "D"], label: null, isRightAngle: false, showArc: true, radius: 20, color: "black" },
					{ vertices: ["C", "B", "D"], label: null, isRightAngle: false, showArc: true, radius: 20, color: "black" },
					{ vertices: ["A", "D", "C"], isRightAngle: true, label: null, color: null, radius: null }
				],
				internalLines: [{ from: "C", to: "D", style: "solid" }],
				shadedRegions: [
					{ vertices: ["A", "D", "C"], color: "rgba(40, 174, 123, 0.2)" },
					{ vertices: ["B", "D", "C"], color: "rgba(157, 56, 189, 0.2)" }
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Default Values", () => {
		test("should render with all nullable properties set to null", () => {
			const props = {
				type: "triangleDiagram" as const,
				width: null,
				height: null,
				points: [
					{ id: "A", x: 50, y: 250, label: null },
					{ id: "B", x: 350, y: 250, label: null },
					{ id: "C", x: 200, y: 50, label: null }
				],
				sides: null,
				angles: null,
				internalLines: null,
				shadedRegions: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
