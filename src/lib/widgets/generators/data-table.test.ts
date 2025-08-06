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
			title: null,
			columns: [
				{ key: "name", label: "Name", isNumeric: false },
				{ key: "score", label: "Score", isNumeric: true }
			],
			data: [
				["Alice", 95],
				["Bob", 87],
				["Carol", 92]
			],
			rowHeaderKey: null,
			footer: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "dataTable" as const,
			title: "Student Grades",
			columns: [
				{ key: "student", label: "Student", isNumeric: false },
				{ key: "math", label: "Math", isNumeric: true },
				{ key: "science", label: "Science", isNumeric: true },
				{ key: "english", label: "English", isNumeric: true }
			],
			data: [
				["Alice", 95, 88, 92],
				["Bob", 87, 91, 85],
				["Carol", 92, 94, 89]
			],
			rowHeaderKey: "student",
			footer: ["Average", 91, 91, 89]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
