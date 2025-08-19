import { z } from "zod"
import { renderInlineContent } from "@/lib/qti-generation/content-renderer"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { MATHML_INNER_PATTERN } from "@/lib/widgets/utils/mathml"
import { escapeXmlAttribute, sanitizeXmlAttributeValue } from "@/lib/xml-utils"

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
						mathml: z
							.string()
							.regex(MATHML_INNER_PATTERN, "invalid mathml snippet; must be inner MathML without outer <math> wrapper")
							.describe("Inner MathML markup (no outer <math> element)")
					})
					.strict()
					.describe("Mathematical content represented in MathML format")
			])
		)
		.describe("Array of inline content items that can be rendered within a paragraph or prompt")
}

// Factory function to create table cell schema - avoids $ref in OpenAI JSON schema
function createTableCellSchema() {
	return z.discriminatedUnion("type", [
		z
			.object({
				type: z.literal("inline"),
				content: createInlineContentSchema()
			})
			.strict(),
		z
			.object({
				type: z.literal("number"),
				value: z.number()
			})
			.strict(),
		z
			.object({
				type: z.literal("input"),
				responseIdentifier: z.string().describe("The QTI response identifier for this input field."),
				expectedLength: z
					.number()
					.nullable()
					.describe("Expected character length for the input. Determines input field width. Null for default width.")
			})
			.strict(),
		z
			.object({
				type: z.literal("dropdown"),
				responseIdentifier: z
					.string()
					.describe("The QTI response identifier for this inline choice (dropdown) interaction."),
				shuffle: z.boolean().describe("If true, the dropdown choices will be shuffled."),
				choices: z
					.array(
						z
							.object({
								identifier: z
									.string()
									.describe("Unique identifier for this choice, used in the QTI identifier attribute."),
								content: createInlineContentSchema().describe("Inline content to display for this choice.")
							})
							.strict()
					)
					.nonempty()
					.describe("The list of choices available in the dropdown.")
			})
			.strict()
	])
}

// The main Zod schema for the dataTable function
export const DataTablePropsSchema = z
	.object({
		type: z.literal("dataTable").describe("Identifies this as a data table widget for structured tabular display."),
		title: z
			.string()
			.nullable()
			.transform((val) => {
				if (val === "null" || val === "NULL" || val === "") return null
				const s = typeof val === "string" ? val.trim() : val
				if (typeof s === "string") {
					if (s.includes("|")) return null
					const looksLikeObject = /^\{[\s\S]*\}$/.test(s)
					const looksLikeArray = /^\[[\s\S]*\]$/.test(s)
					if (looksLikeObject || looksLikeArray) return null
				}
				return val
			})
			.describe(
				"Optional table caption/title displayed above the table (e.g., 'Monthly Sales Data', 'Conversion Factors', null). Null means no title."
			),
		columns: z
			.array(
				z
					.object({
						key: z.string().describe("A unique identifier for this column."),
						label: createInlineContentSchema().describe(
							"Column header content. Can mix text and math (e.g., [{type:'text',content:'Area '},{type:'math',mathml:'<mi>x</mi><mo>+</mo><mn>5</mn>'}]). Empty array displays blank header."
						),
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
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Optional column key that identifies row headers. That column's cells will be styled as headers (bold, shaded). Null means no row headers."
			),
		footer: z
			.array(createTableCellSchema())
			.nullable()
			.transform((val) => (val && val.length === 0 ? null : val))
			.describe(
				"Footer row cells displayed at bottom with distinct styling. Array length must match columns length. Null means no footer."
			)
	})
	.strict()
	.describe(
		"Creates accessible HTML tables with mixed content types, optional row headers, and footer rows. Supports inline text/math in cells and interactive input fields. Perfect for data display, comparison tables, and exercises requiring tabular input."
	)

export type DataTableProps = z.infer<typeof DataTablePropsSchema>
export type TableCell = z.infer<ReturnType<typeof createTableCellSchema>>

/**
 * Renders the content of a single table cell, handling strings, numbers, and input objects.
 */
const renderCellContent = (c: TableCell | undefined): string => {
	if (c === undefined || c === null) return ""
	switch (c.type) {
		case "inline":
			return renderInlineContent(c.content, new Map())
		case "number":
			return String(c.value)
		case "input": {
			const expectedLengthAttr = c.expectedLength ? ` expected-length="${c.expectedLength}"` : ""
			return `<qti-text-entry-interaction response-identifier="${c.responseIdentifier}"${expectedLengthAttr}/>`
		}
		case "dropdown": {
			const choicesXml = c.choices
				.map(
					(ch) =>
						`<qti-inline-choice identifier="${escapeXmlAttribute(ch.identifier)}">${renderInlineContent(ch.content, new Map())}</qti-inline-choice>`
				)
				.join("\n                ")

			return `<qti-inline-choice-interaction response-identifier="${escapeXmlAttribute(
				c.responseIdentifier
			)}" shuffle="${c.shuffle}">
				${choicesXml}
			</qti-inline-choice-interaction>`
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
		const escapeXmlText = (text: string): string =>
			sanitizeXmlAttributeValue(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
		xml += `<caption style="padding: 8px; font-size: 1.2em; font-weight: bold; caption-side: top;">${escapeXmlText(
			title
		)}</caption>`
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
