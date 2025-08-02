import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the content of a single data cell
const SimpleDataCellSchema = z
	.union([
		z.string(),
		z.number(),
		z.object({
			type: z.literal("mathml"),
			mathML: z.string().describe("A string containing the complete <math>...</math> element.")
		})
	])
	.describe("The content of a data cell, which can be text, a number, or MathML.")

// Defines a single row in the data table
const SimpleDataRowSchema = z.object({
	header: z.string().describe('The label for the row header (e.g., "Roller coaster").'),
	cells: z.array(SimpleDataCellSchema).describe("An array of cell data for this row.")
})

// The main Zod schema for the simpleDataTable function
export const SimpleDataTablePropsSchema = z
	.object({
		title: z.string().optional().describe("An optional caption for the table."),
		columnHeaders: z
			.array(z.string())
			.describe(
				"An array of labels for the table columns. The first element should be empty to align with row headers."
			),
		rows: z
			.array(SimpleDataRowSchema)
			.describe("An array of row objects, each defining a row header and its data cells.")
	})
	.describe(
		'This template generates a basic, non-interactive HTML <table> for presenting simple data. It is ideal for questions where a small dataset is provided as context, and the student must interpret that data to find a ratio or answer a question. The generator creates a table with a header row and a series of data rows. Unlike the more complex interactive tables, this template is designed purely for display. It features a column of row headers (<th> with scope="row") for accessibility and clarity, and one or more columns for corresponding data values. The content of data cells can be numbers, text, or MathML. The final output is a clean, semantically correct table that clearly organizes the information needed to solve the associated problem.'
	)

export type SimpleDataTableProps = z.infer<typeof SimpleDataTablePropsSchema>

/**
 * This template generates a basic, non-interactive HTML table for presenting simple data.
 * It is ideal for questions where a small dataset is provided as context, and the
 * student must interpret that data to find a ratio or answer a question.
 */
export const generateSimpleDataTable: WidgetGenerator<typeof SimpleDataTablePropsSchema> = (_data) => {
	// TODO: Implement simple-data-table generation
	return "<div><!-- SimpleDataTable implementation --></div>"
}
