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
			linesAngle: null,
			transversalAngle: null,
			labels: []
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "parallelLinesTransversal" as const,
			width: 500,
			height: 350,
			linesAngle: 15,
			transversalAngle: 75,
			labels: [
				{ intersection: "top" as const, position: "topLeft" as const, label: "∠1", color: "#ff6b6b" },
				{ intersection: "top" as const, position: "topRight" as const, label: "∠2", color: "#4ecdc4" },
				{ intersection: "top" as const, position: "bottomLeft" as const, label: "∠3", color: "#45b7d1" },
				{ intersection: "top" as const, position: "bottomRight" as const, label: "∠4", color: "#ff9800" },
				{ intersection: "bottom" as const, position: "topLeft" as const, label: "∠5", color: "#ff6b6b" },
				{ intersection: "bottom" as const, position: "topRight" as const, label: "∠6", color: "#4ecdc4" },
				{ intersection: "bottom" as const, position: "bottomLeft" as const, label: "∠7", color: "#45b7d1" },
				{ intersection: "bottom" as const, position: "bottomRight" as const, label: "∠8", color: "#ff9800" }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
