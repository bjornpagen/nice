import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines an input cell that will render as a QTI text entry interaction
const InputCellSchema = z.object({
	type: z.literal("input"),
	responseIdentifier: z.string().describe("The QTI response identifier for this input field."),
	expectedLength: z.number().optional().describe("The expected character length for the input field.")
})

// Defines the content of a single data cell
const TableCellSchema = z
	.union([z.string(), z.number(), InputCellSchema])
	.describe("Content for a cell. Can be text/MathML, a number, or an input field specification.")

// Defines a single row in the table
const TableRowSchema = z.object({
	isHeader: z
		.boolean()
		.default(false)
		.describe("If true, the first cell of this row is a row header (<th>).")
		.optional(),
	cells: z.array(TableCellSchema).describe("An array of cell data for this row.")
})

// The main Zod schema for the dataTable function
export const DataTablePropsSchema = z
	.object({
		title: z.string().optional().describe("An optional caption for the table."),
		columnHeaders: z.array(z.string()).optional().describe("An optional array of labels for the table header row."),
		rows: z.array(TableRowSchema).describe("An array of row objects that make up the table body."),
		// Add the 'footer' property to explicitly support column totals
		footer: z
			.array(TableCellSchema)
			.optional()
			.describe(
				'An optional footer row (rendered in <tfoot>), often used for column totals. The first cell is typically the label (e.g., "Total").'
			)
	})
	.describe(
		"Generates a versatile and accessible HTML <table>, serving as the single generator for all tabular data displays. It is capable of creating simple data lists, frequency tables, and complex two-way tables for displaying categorical data. The widget supports an optional header, footer (for totals), and row-level headers for maximum semantic correctness. Cells can contain plain text, numbers, MathML, or interactive input fields, making it suitable for both static display and interactive questions."
	)

export type DataTableProps = z.infer<typeof DataTablePropsSchema>

/**
 * Generates a versatile HTML table for all tabular data needs, including simple lists,
 * frequency tables, and two-way tables. Supports interactive input cells.
 */
export const generateDataTable: WidgetGenerator<typeof DataTablePropsSchema> = (data) => {
	const { title, columnHeaders, rows, footer } = data

	const commonCellStyle = "border: 1px solid black; padding: 8px; text-align: left;"
	const headerCellStyle = `${commonCellStyle} font-weight: bold; background-color: #f2f2f2;`

	let html = `<div style="font-family: sans-serif; width: 100%;">`
	html += `<table style="border-collapse: collapse; width: 100%; border: 1px solid black;">`

	if (title) {
		html += `<caption style="padding: 8px; font-size: 1.2em; font-weight: bold; caption-side: top;">${title}</caption>`
	}

	if (columnHeaders && columnHeaders.length > 0) {
		html += "<thead><tr>"
		for (const h of columnHeaders) {
			html += `<th style="${headerCellStyle}">${h}</th>`
		}
		html += "</tr></thead>"
	}

	if (rows && rows.length > 0) {
		html += "<tbody>"
		for (const r of rows) {
			html += "<tr>"
			for (let i = 0; i < r.cells.length; i++) {
				const c = r.cells[i]
				const isRowHeader = r.isHeader && i === 0
				const tag = isRowHeader ? "th" : "td"
				const style = isRowHeader ? headerCellStyle : commonCellStyle

				let content: string
				if (typeof c === "object" && c.type === "input") {
					const sizeAttr = c.expectedLength ? ` size="${c.expectedLength}"` : ""
					content = `<input type="text" response-identifier="${c.responseIdentifier}"${sizeAttr} style="width: 80px; padding: 4px; border: 1px solid #ccc;"/>`
				} else {
					content = String(c)
				}
				html += `<${tag} style="${style}">${content}</${tag}>`
			}
			html += "</tr>"
		}
		html += "</tbody>"
	}

	if (footer && footer.length > 0) {
		html += `<tfoot><tr style="background-color: #f2f2f2;">`
		for (const f of footer) {
			let content: string
			if (typeof f === "object" && f.type === "input") {
				const sizeAttr = f.expectedLength ? ` size="${f.expectedLength}"` : ""
				content = `<input type="text" response-identifier="${f.responseIdentifier}"${sizeAttr} style="width: 80px; padding: 4px; border: 1px solid #ccc;"/>`
			} else {
				content = String(f)
			}
			// Footer cells are often bold
			html += `<td style="${commonCellStyle} font-weight: bold;">${content}</td>`
		}
		html += "</tr></tfoot>"
	}

	html += "</table></div>"
	return html
}
