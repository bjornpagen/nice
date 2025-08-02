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
	isHeader: z.boolean().default(false).describe("If true, the first cell of this row is a row header (<th>)."),
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
export const generateDataTable: WidgetGenerator<typeof DataTablePropsSchema> = (_data) => {
	// TODO: Implement data table generation, including the new footer
	return "<div><!-- Data table implementation --></div>"
}
