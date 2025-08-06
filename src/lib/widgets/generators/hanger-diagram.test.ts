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
				{ label: 5, shape: null, color: null },
				{ label: 3, shape: null, color: null }
			],
			rightSide: [{ label: 8, shape: null, color: null }]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "hangerDiagram" as const,
			width: 500,
			height: 300,
			leftSide: [
				{ label: "x", shape: "circle" as const, color: "#4285f4" },
				{ label: 7, shape: "square" as const, color: "#34a853" }
			],
			rightSide: [{ label: "19", shape: "pentagon" as const, color: "#ea4335" }]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
