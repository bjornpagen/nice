import { describe, expect, test } from "bun:test"
import { generateTapeDiagram, TapeDiagramPropsSchema } from "./tape-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = TapeDiagramPropsSchema.parse(props)
	return generateTapeDiagram(parsedProps)
}

describe("generateTapeDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "tapeDiagram" as const,
			width: null,
			height: null,
			segments: [
				{ length: 100, label: null, color: null },
				{ length: 75, label: null, color: null },
				{ length: 50, label: null, color: null }
			],
			totalLabel: null,
			showDimensions: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "tapeDiagram" as const,
			width: 500,
			height: 150,
			segments: [
				{ length: 120, label: "x", color: "#4caf50" },
				{ length: 80, label: "24", color: "#2196f3" },
				{ length: 100, label: "y", color: "#ff9800" }
			],
			totalLabel: "300 total",
			showDimensions: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
