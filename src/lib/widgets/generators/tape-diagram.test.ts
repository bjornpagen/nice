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
			topTape: {
				label: "Top Tape",
				segments: [
					{ label: "100", length: 100 },
					{ label: "75", length: 75 }
				],
				color: null
			},
			bottomTape: {
				label: "Bottom Tape",
				segments: [
					{ label: "50", length: 50 },
					{ label: "125", length: 125 }
				],
				color: null
			},
			showTotalBracket: null,
			totalLabel: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "tapeDiagram" as const,
			width: 500,
			height: 150,
			topTape: {
				label: "Top Segments",
				segments: [
					{ label: "x", length: 120 },
					{ label: "24", length: 80 }
				],
				color: "#4caf50"
			},
			bottomTape: {
				label: "Bottom Segments",
				segments: [
					{ label: "y", length: 100 },
					{ label: "100", length: 100 }
				],
				color: "#2196f3"
			},
			showTotalBracket: true,
			totalLabel: "300 total"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
