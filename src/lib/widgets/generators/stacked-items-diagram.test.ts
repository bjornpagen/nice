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
			width: null,
			height: null,
			stacks: [
				{
					items: [
						{ color: "#ff6b6b", label: null },
						{ color: "#4ecdc4", label: null },
						{ color: "#45b7d1", label: null }
					],
					label: null
				}
			],
			itemSize: null,
			spacing: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "stackedItemsDiagram" as const,
			width: 400,
			height: 300,
			stacks: [
				{
					items: [
						{ color: "#4caf50", label: "A" },
						{ color: "#2196f3", label: "B" },
						{ color: "#ff9800", label: "C" }
					],
					label: "Stack 1"
				},
				{
					items: [
						{ color: "#9c27b0", label: "D" },
						{ color: "#f44336", label: "E" }
					],
					label: "Stack 2"
				}
			],
			itemSize: 40,
			spacing: 20
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
