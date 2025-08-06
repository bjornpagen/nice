import { describe, expect, test } from "bun:test"
import { BoxGridPropsSchema, generateBoxGrid } from "./box-grid"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = BoxGridPropsSchema.parse(props)
	return generateBoxGrid(parsedProps)
}

describe("generateBoxGrid", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "boxGrid" as const,
			width: null,
			height: null,
			rows: 3,
			columns: 4,
			boxSize: null,
			filledBoxes: null,
			boxColor: null,
			filledColor: null,
			strokeColor: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "boxGrid" as const,
			width: 400,
			height: 300,
			rows: 5,
			columns: 6,
			boxSize: 40,
			filledBoxes: [0, 2, 5, 7, 12, 18],
			boxColor: "#f0f0f0",
			filledColor: "#4285f4",
			strokeColor: "#333333"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
