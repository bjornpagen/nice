import { describe, expect, test } from "bun:test"
import {
	DiscreteObjectRatioDiagramPropsSchema,
	generateDiscreteObjectRatioDiagram
} from "./discrete-object-ratio-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = DiscreteObjectRatioDiagramPropsSchema.parse(props)
	return generateDiscreteObjectRatioDiagram(parsedProps)
}

describe("generateDiscreteObjectRatioDiagram", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "discreteObjectRatioDiagram" as const,
			width: null,
			height: null,
			groups: [
				{
					label: "Red",
					count: 6,
					color: "#ff6b6b",
					symbol: "circle" as const
				},
				{
					label: "Blue",
					count: 4,
					color: "#4ecdc4",
					symbol: "circle" as const
				}
			],
			showRatio: null,
			arrangement: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "discreteObjectRatioDiagram" as const,
			width: 500,
			height: 300,
			groups: [
				{
					label: "Apples",
					count: 12,
					color: "#ff6b6b",
					symbol: "circle" as const
				},
				{
					label: "Oranges",
					count: 8,
					color: "#ffa726",
					symbol: "square" as const
				},
				{
					label: "Bananas",
					count: 4,
					color: "#ffeb3b",
					symbol: "triangle" as const
				}
			],
			showRatio: true,
			arrangement: "grouped" as const
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
