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
		"This template generates a versatile, accessible, and cleanly styled HTML <table> inside a <div>. It serves as the single generator for all tabular data, replacing `dataTableWithRowHeaders`, `simpleDataTable`, `relationshipTable`, `frequencyTable`, `ratioTable`, `partWholeRatioTable`, and `fiveNumberSummaryTable`. It can present structured data in any format, including simple data lists, frequency tables, part-whole ratio tables, and tables with missing values for interactive questions. The generator can render a header row (`<thead>`) and a body (`<tbody>`). Rows can be configured with a row header (`<th>`) by setting `isHeader: true`. Cells can contain numbers, text (including MathML), or a special `UNKNOWN` marker for interactive inputs. The final output is a semantically correct, bordered table that is easy to read and accessible to screen readers."
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
