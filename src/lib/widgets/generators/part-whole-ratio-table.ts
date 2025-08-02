import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// A special marker to indicate a cell should be an input field
const INPUT_MARKER = "INPUT_FIELD"

// Defines the content of a single data cell
const PartWholeCellSchema = z
	.union([z.string(), z.number(), z.literal(INPUT_MARKER)])
	.describe("Content of a cell. Can be text, a number, or a marker for a QTI input field.")

// Defines the structure of one of the "part" rows
const PartRowSchema = z.object({
	label: z.string().describe('The label for the row header (e.g., "Comedy movies").'),
	ratioValue: PartWholeCellSchema.describe('The value in the "Original ratio" column.'),
	actualValue: PartWholeCellSchema.describe('The value in the "Actual number" column.')
})

// The main Zod schema for the partWholeRatioTable function
export const PartWholeRatioTablePropsSchema = z
	.object({
		partA: PartRowSchema.describe('Configuration for the first "part" row.'),
		partB: PartRowSchema.describe('Configuration for the second "part" row.'),
		total: z
			.object({
				label: z.string().default("Total").describe("The label for the total row header."),
				ratioValue: PartWholeCellSchema.describe('The total value in the "Original ratio" column.'),
				actualValue: PartWholeCellSchema.describe('The total value in the "Actual number" column.')
			})
			.describe('Configuration for the "total" row.'),
		columnHeaders: z
			.tuple([
				z.string(), // Empty for alignment
				z.string(), // e.g., "Original ratio"
				z.string() // e.g., "Number Tlaloc pumped up"
			])
			.describe("The headers for the three columns.")
	})
	.describe(
		'This template generates a specialized HTML <table> for solving part-part-whole ratio problems. It is structured to help students organize information from a word problem into its component parts and the whole (total). The generator creates a 3x3 table. The rows are explicitly defined as two "parts" and one "total" (e.g., "Dodge balls", "Other balls", "Total balls"). The columns are "Original ratio" and the "Actual number". This structure guides students to first identify the base ratio and its total, and then use a scaling factor (derived from the given total actual number) to find the actual numbers for each part. Like the ratioTable, cells can be static values or interactive QTI input fields. This template is specifically designed for questions where a total quantity is given, and the student must distribute that quantity according to a given part-to-part ratio. The output is a highly structured and accessible <table>.'
	)

export type PartWholeRatioTableProps = z.infer<typeof PartWholeRatioTablePropsSchema>

/**
 * This template generates a specialized HTML table for solving part-part-whole ratio problems.
 * It is structured to help students organize information from a word problem into its
 * component parts and the whole (total).
 */
export const generatePartWholeRatioTable: WidgetGenerator<typeof PartWholeRatioTablePropsSchema> = (_data) => {
	// TODO: Implement part-whole-ratio-table generation
	return "<div><!-- PartWholeRatioTable implementation --></div>"
}
