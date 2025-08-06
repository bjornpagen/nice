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
			totalBlocks: 8,
			shadedUnitsPerBlock: 1,
			blocksPerRow: null,
			blockWidth: null,
			blockHeight: null,
			shadeColor: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "unitBlockDiagram" as const,
			totalBlocks: 10,
			shadedUnitsPerBlock: 25,
			blocksPerRow: 5,
			blockWidth: 100,
			blockHeight: 100,
			shadeColor: "#4285F4"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
