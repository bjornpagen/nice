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
			squareA: {
				area: 9, // 3²
				sideLabel: null
			},
			squareB: {
				area: 16, // 4²
				sideLabel: null
			},
			squareC: {
				area: 25, // 5²
				sideLabel: null
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "pythagoreanProofDiagram" as const,
			width: 500,
			height: 500,
			squareA: {
				area: 25, // 5²
				sideLabel: "a"
			},
			squareB: {
				area: 144, // 12²
				sideLabel: "b"
			},
			squareC: {
				area: 169, // 13²
				sideLabel: "c"
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
