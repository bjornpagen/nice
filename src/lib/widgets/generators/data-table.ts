import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines an input cell that will render as a QTI text entry interaction
const InputCellSchema = z.object({
	type: z.literal("input"),
	responseIdentifier: z.string().describe("The QTI response identifier for this input field."),
	expectedLength: z.number().nullable().describe("The expected character length for the input field.")
})

// Defines the content of a single data cell
const TableCellSchema = z
	.union([z.string(), z.number(), InputCellSchema])
	.describe("Content for a cell. Can be text/MathML, a number, or an input field specification.")

// Defines a single column's properties
const ColumnDefinitionSchema = z.object({
	key: z.string().describe("A unique identifier for this column."),
	label: z.string().nullable().describe("The display text for the column header."),
	isNumeric: z.boolean().describe("If true, content will be right-aligned.")
})

// The main Zod schema for the dataTable function
export const DataTablePropsSchema = z
	.object({
		title: z.string().nullable().describe("An optional caption for the table."),
		columns: z.array(ColumnDefinitionSchema).describe("An array of column definitions."),
		data: z
			.array(z.record(TableCellSchema))
			.describe("An array of data objects for each row, where keys must match column keys."),
		rowHeaderKey: z
			.string()
			.nullable()
			.describe("The 'key' of the column that should be treated as the row header (<th>)."),
		footer: z.record(TableCellSchema).nullable().describe("An optional footer object, often for totals.")
	})
	.describe(
		"Generates a versatile and accessible HTML <table>, serving as the single generator for all tabular data displays. It is capable of creating simple data lists, frequency tables, and complex two-way tables for displaying categorical data. The widget supports an optional header, footer (for totals), and row-level headers for maximum semantic correctness. Cells can contain plain text, numbers, MathML, or interactive input fields, making it suitable for both static display and interactive questions."
	)

export type DataTableProps = z.infer<typeof DataTablePropsSchema>

/**
 * Renders the content of a single table cell, handling strings, numbers, and input objects.
 */
const renderCellContent = (c: z.infer<typeof TableCellSchema> | undefined): string => {
	if (c === undefined || c === null) return ""
	if (typeof c === "object" && "type" in c && c.type === "input") {
		const expectedLengthAttr = c.expectedLength ? ` expected-length="${c.expectedLength}"` : ""
		return `<qti-text-entry-interaction response-identifier="${c.responseIdentifier}"${expectedLengthAttr}/>`
	}
	return String(c)
}

/**
 * Generates a versatile HTML table for all tabular data needs, including simple lists,
 * frequency tables, and two-way tables. Supports interactive input cells.
 */
export const generateDataTable: WidgetGenerator<typeof DataTablePropsSchema> = (props) => {
	const { title, columns, data, rowHeaderKey, footer } = props

	const commonCellStyle = "border: 1px solid black; padding: 8px; text-align: left;"
	const headerCellStyle = `${commonCellStyle} font-weight: bold; background-color: #f2f2f2;`

	let xml = `<table style="border-collapse: collapse; width: 100%; border: 1px solid black;">`

	if (title) {
		xml += `<caption style="padding: 8px; font-size: 1.2em; font-weight: bold; caption-side: top;">${title}</caption>`
	}

	// THEAD
	if (columns && columns.length > 0) {
		xml += "<thead><tr>"
		for (const col of columns) {
			const style = col.key === rowHeaderKey ? `${headerCellStyle} text-align: left;` : headerCellStyle
			// Accessibility: Add scope="col" to column headers
			xml += `<th scope="col" style="${style}">${col.label || ""}</th>`
		}
		xml += "</tr></thead>"
	}

	// TBODY
	if (data && data.length > 0) {
		xml += "<tbody>"
		for (const rowData of data) {
			xml += "<tr>"
			for (const col of columns) {
				const isRowHeader = col.key === rowHeaderKey
				const tag = isRowHeader ? "th" : "td"
				const scope = isRowHeader ? ' scope="row"' : ""
				const style = isRowHeader ? headerCellStyle : commonCellStyle
				const content = renderCellContent(rowData[col.key])

				xml += `<${tag}${scope} style="${style}">${content}</${tag}>`
			}
			xml += "</tr>"
		}
		xml += "</tbody>"
	}

	// TFOOT
	if (footer && columns.length > 0) {
		xml += `<tfoot><tr style="background-color: #f2f2f2;">`
		for (const col of columns) {
			const isRowHeader = col.key === rowHeaderKey
			const tag = isRowHeader ? "th" : "td"
			const scope = isRowHeader ? ' scope="row"' : ""
			const style = `${commonCellStyle} font-weight: bold;`
			const content = renderCellContent(footer[col.key])
			xml += `<${tag}${scope} style="${style}">${content}</${tag}>`
		}
		xml += "</tr></tfoot>"
	}

	xml += "</table>"
	return xml
}
