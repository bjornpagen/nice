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
		rows: z.array(TableRowSchema).describe("An array of row objects that make up the table body.")
	})
	.describe(
		"This template generates a versatile, accessible, and cleanly styled HTML <table> inside a <div>. It serves as the single generator for all tabular data, replacing `dataTableWithRowHeaders`, `simpleDataTable`, `relationshipTable`, `frequencyTable`, `ratioTable`, `partWholeRatioTable`, and `fiveNumberSummaryTable`. It can present structured data in any format, including simple data lists, frequency tables, part-whole ratio tables, and tables with missing values for interactive questions. The generator can render a header row (`<thead>`) and a body (`<tbody>`). Rows can be configured with a row header (`<th>`) by setting `isHeader: true`. Cells can contain numbers, text (including MathML), or an input specification object for interactive fields. When a cell is an input object with type 'input', it will be rendered as a QTI text entry interaction with the specified response identifier and optional expected length. The final output is a semantically correct, bordered table that is easy to read and accessible to screen readers."
	)

export type DataTableProps = z.infer<typeof DataTablePropsSchema>

/**
 * This template generates a versatile, accessible, and cleanly styled HTML table inside a div.
 * It is designed to present structured data in various formats, including simple data lists,
 * frequency tables, and tables with missing values for interactive questions.
 * Input cells are explicitly typed as objects with responseIdentifier, making the contract type-safe.
 */
export const generateDataTable: WidgetGenerator<typeof DataTablePropsSchema> = (_data) => {
	// TODO: Implement data table generation
	return "<div><!-- Data table implementation --></div>"
}
