import { describe, expect, test } from "bun:test"
import { generatePictograph, PictographPropsSchema } from "./pictograph"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = PictographPropsSchema.parse(props)
	return generatePictograph(parsedProps)
}

describe("generatePictograph", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "pictograph" as const,
			width: null,
			height: null,
			title: null,
			data: [
				{ label: "Apples", count: 8, symbol: "🍎" },
				{ label: "Oranges", count: 6, symbol: "🍊" },
				{ label: "Bananas", count: 4, symbol: "🍌" }
			],
			symbolsPerUnit: 1,
			showKey: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "pictograph" as const,
			width: 500,
			height: 300,
			title: "Favorite Fruits Survey",
			data: [
				{ label: "Apples", count: 24, symbol: "🍎" },
				{ label: "Oranges", count: 18, symbol: "🍊" },
				{ label: "Bananas", count: 12, symbol: "🍌" },
				{ label: "Grapes", count: 30, symbol: "🍇" }
			],
			symbolsPerUnit: 2,
			showKey: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
