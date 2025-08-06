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
			shape: "rectangle" as const,
			dimensions: { width: 200, height: 150 },
			partitions: 6,
			partitionType: "equal" as const,
			shadedPartitions: null,
			labels: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "partitionedShape" as const,
			width: 400,
			height: 300,
			shape: "circle" as const,
			dimensions: { radius: 100 },
			partitions: 8,
			partitionType: "equal" as const,
			shadedPartitions: [0, 2, 4, 6],
			labels: [
				{ partition: 0, text: "1/8", position: "center" as const },
				{ partition: 2, text: "3/8", position: "center" as const }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
