import { describe, expect, test } from "bun:test"
import { generateHangerDiagram, HangerDiagramPropsSchema } from "./hanger-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = HangerDiagramPropsSchema.parse(props)
	return generateHangerDiagram(parsedProps)
}

describe("generateHangerDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "hangerDiagram" as const,
			width: null,
			height: null,
			leftSide: [
				{ value: 5, label: null, color: null },
				{ value: 3, label: null, color: null }
			],
			rightSide: [{ value: 8, label: null, color: null }],
			isBalanced: true,
			showValues: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "hangerDiagram" as const,
			width: 500,
			height: 300,
			leftSide: [
				{ value: 12, label: "x", color: "#4285f4" },
				{ value: 7, label: "7", color: "#34a853" }
			],
			rightSide: [{ value: 19, label: "19", color: "#ea4335" }],
			isBalanced: true,
			showValues: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
