import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a placeholder for a QTI text entry interaction
const InputCellSchema = z.object({
	type: z.literal("input").describe("Indicates this cell is an interactive input field."),
	responseIdentifier: z.string().describe("The QTI response identifier for this text entry interaction."),
	expectedLength: z.number().optional().describe("The expected length of the input field.")
})

// Defines a cell containing static content (number or string)
const StaticCellSchema = z.object({
	type: z.literal("static").describe("Indicates this cell contains fixed content."),
	content: z.union([z.string(), z.number()]).describe("The text or number to display.")
})

// Defines a cell containing a MathML string
const MathMLCellSchema = z.object({
	type: z.literal("mathml").describe("Indicates the cell contains a MathML string."),
	mathML: z.string().describe("A string containing the complete <math>...</math> element.")
})

// A cell can be one of the three types defined above
const TableCellSchema = z.union([InputCellSchema, StaticCellSchema, MathMLCellSchema])

// The main Zod schema for the ratioTable function
export const RatioTablePropsSchema = z
	.object({
		title: z.string().optional().describe("An optional caption to be displayed above the table."),
		headers: z
			.array(z.string())
			.length(2)
			.describe('An array of two string labels for the table header row (e.g., ["Treasure chests", "Hours"]).'),
		rows: z
			.array(z.tuple([TableCellSchema, TableCellSchema]))
			.describe(
				"A two-dimensional array representing the table body. Each inner array is a row with exactly two cells."
			)
	})
	.describe(
		'This template generates a versatile and accessible HTML <table> designed for ratio and proportion problems. It is ideal for questions where students must complete a table of equivalent ratios. The generator constructs a table with a header row defining two quantities (e.g., "Servings" and "Crackers", or "Sticks of butter" and "Number of cookies"). The body of the table (<tbody>) is built from an array of row data. Each row represents an equivalent ratio pair. Crucially, cells within the table can be defined in one of three ways: 1. A static number or string: Pre-filled information that sets up the problem. 2. An interactive input field: A placeholder where a <qti-text-entry-interaction> will be inserted, allowing the student to enter a value. The generator is told which response identifier to use for this input. 3. MathML content: For displaying formatted mathematical expressions. The final output is a clean, bordered, and semantically correct <table> ready to be embedded in a QTI item body. It provides a structured way for students to demonstrate their understanding of proportional relationships by filling in missing values.'
	)

export type RatioTableProps = z.infer<typeof RatioTablePropsSchema>

/**
 * This template generates a versatile and accessible HTML table designed for ratio
 * and proportion problems. It is ideal for questions where students must complete
 * a table of equivalent ratios.
 */
export const generateRatioTable: WidgetGenerator<typeof RatioTablePropsSchema> = (_data) => {
	// TODO: Implement ratio-table generation
	return "<div><!-- RatioTable implementation --></div>"
}
