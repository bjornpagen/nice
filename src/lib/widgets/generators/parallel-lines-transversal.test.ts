import { describe, expect, test } from "bun:test"
import { generateParallelLinesTransversal, ParallelLinesTransversalPropsSchema } from "./parallel-lines-transversal"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = ParallelLinesTransversalPropsSchema.parse(props)
	return generateParallelLinesTransversal(parsedProps)
}

describe("generateParallelLinesTransversal", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "parallelLinesTransversal" as const,
			width: null,
			height: null,
			parallelLines: [
				{ y: 100, color: null },
				{ y: 200, color: null }
			],
			transversal: {
				startX: 50,
				startY: 50,
				endX: 350,
				endY: 250,
				color: null
			},
			angleLabels: null,
			highlightedAngles: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "parallelLinesTransversal" as const,
			width: 500,
			height: 350,
			parallelLines: [
				{ y: 120, color: "#2196f3" },
				{ y: 220, color: "#2196f3" }
			],
			transversal: {
				startX: 80,
				startY: 80,
				endX: 420,
				endY: 270,
				color: "#4caf50"
			},
			angleLabels: [
				{ position: { x: 150, y: 110 }, label: "∠1", size: null },
				{ position: { x: 180, y: 110 }, label: "∠2", size: null },
				{ position: { x: 150, y: 130 }, label: "∠3", size: null },
				{ position: { x: 180, y: 130 }, label: "∠4", size: null }
			],
			highlightedAngles: [
				{ position: { x: 150, y: 110 }, color: "rgba(255, 235, 59, 0.5)" },
				{ position: { x: 150, y: 210 }, color: "rgba(255, 235, 59, 0.5)" }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
