import { describe, expect, test } from "bun:test"
import { generateStackedItemsDiagram, StackedItemsDiagramPropsSchema } from "./stacked-items-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = StackedItemsDiagramPropsSchema.parse(props)
	return generateStackedItemsDiagram(parsedProps)
}

describe("generateStackedItemsDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "stackedItemsDiagram" as const,
			width: 200,
			height: 300,
			altText: "Stack of 3 ice cream scoops on a cone",
			baseItem: {
				emoji: "🍦",
				size: 50,
				label: "ice cream cone"
			},
			stackedItem: {
				emoji: "🍨",
				size: 40,
				label: "ice cream scoop"
			},
			count: 3,
			orientation: null,
			overlap: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "stackedItemsDiagram" as const,
			width: 400,
			height: 300,
			altText: "Stack of 5 pancakes on a plate",
			baseItem: {
				emoji: "🍽️",
				size: 60,
				label: "plate"
			},
			stackedItem: {
				emoji: "🥞",
				size: 35,
				label: "pancake"
			},
			count: 5,
			orientation: "vertical" as const,
			overlap: 0.8
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
