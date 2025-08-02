import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the content of a single data cell
const TableCellSchema = z
	.union([z.string(), z.number()])
	.describe("The content of a cell, which can be either text or a number.")

// Defines a single data row in the table
const RelationshipTableRowSchema = z.object({
	header: z.string().describe("The label for the row header (the dependent variable)."),
	cells: z.array(TableCellSchema).describe("An array of cell data for this row.")
})

// The main Zod schema for the relationshipTable function
export const RelationshipTablePropsSchema = z
	.object({
		title: z.string().optional().describe("An optional caption to be displayed above the table."),
		columnHeaders: z
			.array(z.string())
			.describe(
				"An array of labels for the table columns (the independent variable). The first element is often empty to align with row headers."
			),
		rows: z
			.array(RelationshipTableRowSchema)
			.describe("An array of row objects, each defining a header and its corresponding cell data.")
	})
	.describe(
		'This template generates a structured and accessible HTML <table> designed to display the relationship between two variables, often over a sequence (like time) or under different conditions. It is perfect for questions that require students to identify a pattern, determine a rule or equation, and extrapolate or interpolate values. The generator will construct a standard HTML table with a header row (<thead>) and a body (<tbody>). The primary distinction of this template is its structure: it typically has a column of row headers (<th> with scope="row") that label the dependent variables (e.g., "Piece A height," "Piece B height"), and a header row that labels the independent variable or condition (e.g., "Month 1," "Month 2"). This structure is ideal for comparing two or more sets of data side-by-side. For example, it can show the heights of two plants over several months, or the cost of a taxi for different distances. The data cells are populated from a nested array structure, ensuring that the visual layout corresponds directly to the data\'s logical relationships. The final output is a semantically correct, clearly styled, and bordered <table> that makes it easy for students to analyze and compare quantitative relationships.'
	)

export type RelationshipTableProps = z.infer<typeof RelationshipTablePropsSchema>

/**
 * This template generates a structured and accessible HTML table designed to display
 * the relationship between two variables, often over a sequence (like time) or
 * under different conditions. It is perfect for questions that require students to
 * identify a pattern, determine a rule or equation, and extrapolate or interpolate values.
 */
export const generateRelationshipTable: WidgetGenerator<typeof RelationshipTablePropsSchema> = (_data) => {
	// TODO: Implement relationship-table generation
	return "<div><!-- RelationshipTable implementation --></div>"
}
