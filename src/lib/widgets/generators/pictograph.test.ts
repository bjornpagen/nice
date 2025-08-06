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
			title: null,
			key: {
				icon: "🍎",
				label: "= 1 fruit"
			},
			data: [
				{ category: "Apples", iconCount: 8 },
				{ category: "Oranges", iconCount: 6 },
				{ category: "Bananas", iconCount: 4 }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "pictograph" as const,
			title: "Favorite Fruits Survey",
			key: {
				icon: "🍎",
				label: "= 2 students"
			},
			data: [
				{ category: "Apples", iconCount: 12 },
				{ category: "Oranges", iconCount: 9 },
				{ category: "Bananas", iconCount: 6 },
				{ category: "Grapes", iconCount: 15 }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
