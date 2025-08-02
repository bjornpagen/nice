import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the content of a single data cell
const DataTableCellSchema = z
	.union([z.string(), z.number(), z.null()])
	.describe("The content of a cell, which can be text, a number, or null for an empty cell.")

// Defines a single row in the table
const DataTableRowSchema = z.object({
	header: z.string().describe("The label for the row header (first column)."),
	cells: z.array(DataTableCellSchema).describe("An array of data cells for this row.")
})

// The main Zod schema for the dataTableWithRowHeaders function
export const DataTableWithRowHeadersPropsSchema = z
	.object({
		title: z.string().optional().describe("An optional caption to be displayed above the table."),
		columnHeaders: z
			.array(z.string())
			.describe(
				'An array of labels for the table columns. The first element is the header for the row header column (e.g., "Month").'
			),
		rows: z
			.array(DataTableRowSchema)
			.describe("An array of row objects, each defining a row header and its corresponding data cells.")
	})
	.describe(
		'This template generates a clean, accessible HTML <table> designed for presenting simple datasets where each row represents an item and has a distinct label. It is ideal for word problems that present paired data, such as months and corresponding values, or categories and their measurements. The generator will construct a table with a header row (<thead>) containing column titles. The first column of the table body (<tbody>) contains row headers, which are rendered as <th> elements with a scope="row" attribute for accessibility. The remaining columns contain the data associated with each row header. This structure provides a clear and semantically correct way to display information that is more descriptive than a simple grid of values, making the relationship between the row label and its data explicit. The output is a standard, bordered HTML table.'
	)

export type DataTableWithRowHeadersProps = z.infer<typeof DataTableWithRowHeadersPropsSchema>

/**
 * This template generates a clean, accessible HTML table designed for presenting simple
 * datasets where each row represents an item and has a distinct label. It is ideal for
 * word problems that present paired data, such as months and corresponding values.
 */
export const generateDataTableWithRowHeaders: WidgetGenerator<typeof DataTableWithRowHeadersPropsSchema> = (_data) => {
	// TODO: Implement data-table-with-row-headers generation
	return "<div><!-- DataTableWithRowHeaders implementation --></div>"
}
