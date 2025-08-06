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
			objects: [
				{
					count: 6,
					emoji: "🔴"
				},
				{
					count: 4,
					emoji: "🔵"
				}
			],
			layout: null,
			title: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "discreteObjectRatioDiagram" as const,
			width: 500,
			height: 300,
			objects: [
				{
					count: 12,
					emoji: "🍎"
				},
				{
					count: 8,
					emoji: "🍊"
				},
				{
					count: 4,
					emoji: "🍌"
				}
			],
			layout: "grid" as const,
			title: "Fruit Ratio"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
