import { describe, expect, test } from "bun:test"
import { generatePythagoreanProofDiagram, PythagoreanProofDiagramPropsSchema } from "./pythagorean-proof-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = PythagoreanProofDiagramPropsSchema.parse(props)
	return generatePythagoreanProofDiagram(parsedProps)
}

describe("generatePythagoreanProofDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "pythagoreanProofDiagram" as const,
			width: null,
			height: null,
			sideA: 3,
			sideB: 4,
			sideC: 5,
			proofType: "square-arrangement" as const,
			showLabels: null,
			showFormula: null,
			colors: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "pythagoreanProofDiagram" as const,
			width: 500,
			height: 500,
			sideA: 5,
			sideB: 12,
			sideC: 13,
			proofType: "dissection" as const,
			showLabels: true,
			showFormula: true,
			colors: {
				sideASquare: "#ffcdd2",
				sideBSquare: "#c8e6c9",
				sideCSquare: "#bbdefb",
				triangle: "#fff3e0"
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
