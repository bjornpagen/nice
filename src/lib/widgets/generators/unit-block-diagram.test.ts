import { describe, expect, test } from "bun:test"
import { generateUnitBlockDiagram, UnitBlockDiagramPropsSchema } from "./unit-block-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = UnitBlockDiagramPropsSchema.parse(props)
	return generateUnitBlockDiagram(parsedProps)
}

describe("generateUnitBlockDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "unitBlockDiagram" as const,
			width: null,
			height: null,
			blocks: [
				{ type: "unit" as const, count: 15, color: null },
				{ type: "ten" as const, count: 3, color: null },
				{ type: "hundred" as const, count: 2, color: null }
			],
			arrangement: null,
			showLabels: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "unitBlockDiagram" as const,
			width: 600,
			height: 400,
			blocks: [
				{ type: "unit" as const, count: 8, color: "#ffeb3b" },
				{ type: "ten" as const, count: 4, color: "#4caf50" },
				{ type: "hundred" as const, count: 3, color: "#2196f3" },
				{ type: "thousand" as const, count: 1, color: "#9c27b0" }
			],
			arrangement: "grouped" as const,
			showLabels: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
