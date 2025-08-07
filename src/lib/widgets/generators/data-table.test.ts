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
				{ key: "name", label: [{ type: "text", content: "Name" }], isNumeric: false },
				{ key: "score", label: [{ type: "text", content: "Score" }], isNumeric: true }
			],
			data: [
				[
					{ kind: "inline", content: [{ type: "text", content: "Alice" }] },
					{ kind: "number", value: 95 }
				],
				[
					{ kind: "inline", content: [{ type: "text", content: "Bob" }] },
					{ kind: "number", value: 87 }
				],
				[
					{ kind: "inline", content: [{ type: "text", content: "Carol" }] },
					{ kind: "number", value: 92 }
				]
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
				{ key: "student", label: [{ type: "text", content: "Student" }], isNumeric: false },
				{ key: "math", label: [{ type: "text", content: "Math" }], isNumeric: true },
				{ key: "science", label: [{ type: "text", content: "Science" }], isNumeric: true },
				{ key: "english", label: [{ type: "text", content: "English" }], isNumeric: true }
			],
			data: [
				[
					{ kind: "inline", content: [{ type: "text", content: "Alice" }] },
					{ kind: "number", value: 95 },
					{ kind: "number", value: 88 },
					{ kind: "number", value: 92 }
				],
				[
					{ kind: "inline", content: [{ type: "text", content: "Bob" }] },
					{ kind: "number", value: 87 },
					{ kind: "number", value: 91 },
					{ kind: "number", value: 85 }
				],
				[
					{ kind: "inline", content: [{ type: "text", content: "Carol" }] },
					{ kind: "number", value: 92 },
					{ kind: "number", value: 94 },
					{ kind: "number", value: 89 }
				]
			],
			rowHeaderKey: "student",
			footer: [
				{ kind: "inline", content: [{ type: "text", content: "Average" }] },
				{ kind: "number", value: 91 },
				{ kind: "number", value: 91 },
				{ kind: "number", value: 89 }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
