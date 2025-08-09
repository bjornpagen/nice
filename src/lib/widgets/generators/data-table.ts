import { z } from "zod"
import { renderInlineContent } from "@/lib/qti-generation/content-renderer"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Factory function to create inline content schema - avoids $ref in OpenAI JSON schema
function createInlineContentSchema() {
	return z
		.array(
			z.discriminatedUnion("type", [
				z
					.object({
						type: z.literal("text").describe("Identifies this as plain text content"),
						content: z.string().describe("The actual text content to display")
					})
					.strict()
					.describe("Plain text content that will be rendered as-is"),
				z
					.object({
						type: z.literal("math").describe("Identifies this as mathematical content"),
						mathml: z.string().describe("MathML markup for mathematical expressions, without the outer math element")
					})
					.strict()
					.describe("Mathematical content represented in MathML format")
			])
		)
		.describe("Array of inline content items that can be rendered within a paragraph or prompt")
}

// Factory function to create table cell schema - avoids $ref in OpenAI JSON schema
function createTableCellSchema() {
	return z.discriminatedUnion("kind", [
		z
			.object({
				kind: z.literal("inline"),
				content: createInlineContentSchema()
			})
			.strict(),
		z
			.object({
				kind: z.literal("number"),
				value: z.number()
			})
			.strict(),
		z
			.object({
				kind: z.literal("input"),
				responseIdentifier: z.string().describe("The QTI response identifier for this input field."),
				expectedLength: z.number().nullable().describe("The expected character length for the input field.")
			})
			.strict()
	])
}

// The main Zod schema for the dataTable function
export const DataTablePropsSchema = z
	.object({
		type: z.literal("dataTable"),
		title: z.string().nullable().describe("An optional caption for the table."),
		columns: z
			.array(
				z
					.object({
						key: z.string().describe("A unique identifier for this column."),
						label: createInlineContentSchema()
							.nullable()
							.describe("The display label for the column header as structured inline content."),
						isNumeric: z.boolean().describe("If true, content in this column will be right-aligned for readability.")
					})
					.strict()
					.describe("Defines the metadata and display properties for a single column in the data table.")
			)
			.describe("An array of column definitions."),
		data: z
			.array(z.array(createTableCellSchema()))
			.describe(
				"An array of arrays representing table rows. Each inner array contains cell values in the same order as columns."
			),
		rowHeaderKey: z
			.string()
			.nullable()
			.describe("The 'key' of the column that should be treated as the row header (<th>)."),
		footer: z
			.array(createTableCellSchema())
			.nullable()
			.describe("An optional array of footer cells, in the same order as columns.")
	})
	.strict()
	.describe(
		"Generates a versatile and accessible HTML <table>, serving as the single generator for all tabular data displays. It is capable of creating simple data lists, frequency tables, and complex two-way tables for displaying categorical data. The widget supports an optional header, footer (for totals), and row-level headers for maximum semantic correctness. Cells can contain plain text, numbers, MathML, or interactive input fields, making it suitable for both static display and interactive questions."
	)

export type DataTableProps = z.infer<typeof DataTablePropsSchema>
export type TableCell = z.infer<ReturnType<typeof createTableCellSchema>>

/**
 * Renders the content of a single table cell, handling strings, numbers, and input objects.
 */
const renderCellContent = (c: TableCell | undefined): string => {
	if (c === undefined || c === null) return ""
	switch (c.kind) {
		case "inline":
			return renderInlineContent(c.content, new Map())
		case "number":
			return String(c.value)
		case "input": {
			const expectedLengthAttr = c.expectedLength ? ` expected-length="${c.expectedLength}"` : ""
			return `<qti-text-entry-interaction response-identifier="${c.responseIdentifier}"${expectedLengthAttr}/>`
		}
	}
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
			if (col.label === null || col.label === undefined) {
				xml += `<th scope="col" style="${style}"></th>`
			} else {
				xml += `<th scope="col" style="${style}">${renderInlineContent(col.label, new Map())}</th>`
			}
		}
		xml += "</tr></thead>"
	}

	// TBODY
	if (data && data.length > 0) {
		xml += "<tbody>"
		for (const rowData of data) {
			xml += "<tr>"
			for (let i = 0; i < columns.length; i++) {
				const col = columns[i]
				if (!col) continue // Should never happen, but satisfies type checker
				const isRowHeader = col.key === rowHeaderKey
				const tag = isRowHeader ? "th" : "td"
				const scope = isRowHeader ? ' scope="row"' : ""
				const style = isRowHeader ? headerCellStyle : commonCellStyle
				const content = renderCellContent(rowData[i])

				xml += `<${tag}${scope} style="${style}">${content}</${tag}>`
			}
			xml += "</tr>"
		}
		xml += "</tbody>"
	}

	// Footer rows are not permitted in QTI item body tables (<tfoot> invalid).
	// Instead, if footer is provided, render it as an extra row within <tbody> with bold styling.
	if (footer && columns.length > 0) {
		if (!xml.includes("<tbody>")) {
			xml += "<tbody>"
		}
		xml += `<tr style="background-color: #f2f2f2;">`
		for (let i = 0; i < columns.length; i++) {
			const col = columns[i]
			if (!col) continue
			const isRowHeader = col.key === rowHeaderKey
			const tag = isRowHeader ? "th" : "td"
			const scope = isRowHeader ? ' scope="row"' : ""
			const style = `${commonCellStyle} font-weight: bold;`
			const content = renderCellContent(footer[i])
			xml += `<${tag}${scope} style="${style}">${content}</${tag}>`
		}
		xml += "</tr>"
		if (!data || data.length === 0) {
			xml += "</tbody>"
		}
	}

	xml += "</table>"
	return xml
}
