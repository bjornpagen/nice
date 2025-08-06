import { describe, expect, test } from "bun:test"
import { generatePartitionedShape, PartitionedShapePropsSchema } from "./partitioned-shape"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = PartitionedShapePropsSchema.parse(props)
	return generatePartitionedShape(parsedProps)
}

describe("generatePartitionedShape", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "partitionedShape" as const,
			width: null,
			height: null,
			shapes: [
				{
					type: "rectangle" as const,
					totalParts: 6,
					shadedParts: 3,
					rows: 2,
					columns: 3,
					shadeColor: null
				}
			],
			layout: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "partitionedShape" as const,
			width: 400,
			height: 300,
			shapes: [
				{
					type: "circle" as const,
					totalParts: 8,
					shadedParts: 4,
					rows: null,
					columns: null,
					shadeColor: "#ff6b6b"
				}
			],
			layout: "horizontal" as const
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
