import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// A special marker to indicate a cell should be an input field or is unknown
const UNKNOWN_MARKER = "UNKNOWN"

// Defines the content of a single data cell
const TableCellSchema = z
	.union([z.string(), z.number(), z.literal(UNKNOWN_MARKER)])
	.describe("Content for a cell. Can be text/MathML, a number, or a marker for a missing value.")

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
		rows: z.array(TableRowSchema).describe("An array of row objects that make up the table body.")
	})
	.describe(
		'This template generates a versatile, accessible, and cleanly styled HTML <table> inside a <div>. It is designed to present structured data in various formats, including simple data lists, frequency tables, and tables with missing values for interactive questions. The generator will construct a complete <table> element. It can render a header row (<thead>) based on a provided array of column labels. The table body (<tbody>) is populated from an array of row objects. Each row can be configured to either start with a row header (<th> with scope="row") for categorical labels (e.g., "Season", "Player") or with a standard data cell (<td>). This flexibility allows the template to create both simple data tables and more complex two-way tables. Cells within the table can contain numbers, text (including MathML), or a special marker indicating that the cell is a placeholder for a missing value or an interactive QTI element like <qti-text-entry-interaction>. The final output is a semantically correct, bordered table that is easy to read and accessible to screen readers.'
	)

export type DataTableProps = z.infer<typeof DataTablePropsSchema>

/**
 * This template generates a versatile, accessible, and cleanly styled HTML table inside a div.
 * It is designed to present structured data in various formats, including simple data lists,
 * frequency tables, and tables with missing values for interactive questions.
 */
export const generateDataTable: WidgetGenerator<typeof DataTablePropsSchema> = (_data) => {
	// TODO: Implement data table generation
	return "<div><!-- Data table implementation --></div>"
}
