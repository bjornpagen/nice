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
			data: [
				[
					{ content: "A", backgroundColor: null },
					{ content: "B", backgroundColor: null },
					{ content: "C", backgroundColor: null }
				],
				[
					{ content: "D", backgroundColor: null },
					{ content: "E", backgroundColor: null },
					{ content: "F", backgroundColor: null }
				],
				[
					{ content: "G", backgroundColor: null },
					{ content: "H", backgroundColor: null },
					{ content: "I", backgroundColor: null }
				]
			],
			showGridLines: null,
			cellPadding: null,
			fontSize: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "boxGrid" as const,
			width: 400,
			height: 300,
			data: [
				[
					{ content: 1, backgroundColor: "#ffeb3b" },
					{ content: 2, backgroundColor: null },
					{ content: 3, backgroundColor: "#ffeb3b" }
				],
				[
					{ content: 4, backgroundColor: null },
					{ content: 5, backgroundColor: "#4caf50" },
					{ content: 6, backgroundColor: null }
				],
				[
					{ content: 7, backgroundColor: "#ffeb3b" },
					{ content: 8, backgroundColor: null },
					{ content: 9, backgroundColor: "#ffeb3b" }
				]
			],
			showGridLines: true,
			cellPadding: 10,
			fontSize: 20
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
