import { describe, expect, test } from "bun:test"
import {
	generateParallelogramTrapezoidDiagram,
	ParallelogramTrapezoidDiagramPropsSchema
} from "./parallelogram-trapezoid-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = ParallelogramTrapezoidDiagramPropsSchema.parse(props)
	return generateParallelogramTrapezoidDiagram(parsedProps)
}

describe("generateParallelogramTrapezoidDiagram", () => {
	describe("Parallelogram", () => {
		test("should render a standard parallelogram with labels", () => {
			const props = {
				type: "parallelogramTrapezoidDiagram" as const,
				width: 350,
				height: 200,
				shape: {
					type: "parallelogram" as const,
					base: 7,
					height: 4,
					sideLength: 5,
					labels: null
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a parallelogram with custom labels", () => {
			const props = {
				type: "parallelogramTrapezoidDiagram" as const,
				width: 400,
				height: 250,
				shape: {
					type: "parallelogram" as const,
					base: 10,
					height: 6,
					sideLength: 8,
					labels: {
						base: "b",
						height: "h",
						sideLength: "s"
					}
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Trapezoid", () => {
		test("should render a right trapezoid when side length is not provided", () => {
			const props = {
				type: "parallelogramTrapezoidDiagram" as const,
				width: 300,
				height: 200,
				shape: {
					type: "trapezoid" as const,
					topBase: 4,
					bottomBase: 6,
					height: 3,
					leftSideLength: null,
					labels: null
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render an isosceles trapezoid with custom labels", () => {
			const props = {
				type: "parallelogramTrapezoidDiagram" as const,
				width: 400,
				height: 250,
				shape: {
					type: "trapezoid" as const,
					topBase: 5,
					bottomBase: 9,
					height: 4,
					leftSideLength: 4.47, // sqrt(2^2 + 4^2)
					labels: {
						topBase: "a",
						bottomBase: "b",
						height: "h",
						leftSide: "s",
						rightSide: "s"
					}
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a scalene trapezoid", () => {
			const props = {
				type: "parallelogramTrapezoidDiagram" as const,
				width: 450,
				height: 250,
				shape: {
					type: "trapezoid" as const,
					topBase: 6,
					bottomBase: 12,
					height: 4,
					leftSideLength: 5, // 3-4-5 triangle for offset
					labels: null
				}
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
