import { describe, expect, test } from "bun:test"
import { DataTablePropsSchema, generateDataTable } from "./data-table"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = DataTablePropsSchema.parse(props)
	return generateDataTable(parsedProps)
}

describe("generateDataTable", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "dataTable" as const,
			width: null,
			height: null,
			title: null,
			headers: ["Name", "Score"],
			data: [
				["Alice", "95"],
				["Bob", "87"],
				["Carol", "92"]
			],
			headerBackgroundColor: null,
			cellBackgroundColor: null,
			borderColor: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "dataTable" as const,
			width: 400,
			height: 300,
			title: "Student Grades",
			headers: ["Student", "Math", "Science", "English"],
			data: [
				["Alice", "95", "88", "92"],
				["Bob", "87", "91", "85"],
				["Carol", "92", "94", "89"]
			],
			headerBackgroundColor: "#f0f8ff",
			cellBackgroundColor: "#ffffff",
			borderColor: "#cccccc"
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
