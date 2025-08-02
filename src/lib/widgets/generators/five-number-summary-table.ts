import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the fiveNumberSummaryTable function
export const FiveNumberSummaryTablePropsSchema = z
	.object({
		min: z.union([z.number(), z.string()]).describe("The minimum value of the data set."),
		q1: z.union([z.number(), z.string()]).describe("The first quartile (Q1) of the data set."),
		median: z.union([z.number(), z.string()]).describe("The median value of the data set."),
		q3: z.union([z.number(), z.string()]).describe("The third quartile (Q3) of the data set."),
		max: z.union([z.number(), z.string()]).describe("The maximum value of the data set.")
	})
	.describe(
		'This template generates a simple and standardized HTML <table> specifically for displaying a five-number summary of a data set. This summary is the foundation for box plots and is frequently used in statistics to describe the distribution of data. The generator will create a two-row table. The first row is a header row (<thead>) containing the fixed labels: "Min", "Q₁" (First Quartile), "Median", "Q₃" (Third Quartile), and "Max". The second row (<tbody>) contains the corresponding five numerical values provided as input. The table will be styled for clarity, with centered text and borders, making it an easy-to-read prerequisite or summary for questions about data distribution, range, and interquartile range (IQR).'
	)

export type FiveNumberSummaryTableProps = z.infer<typeof FiveNumberSummaryTablePropsSchema>

/**
 * This template generates a simple and standardized HTML table specifically for
 * displaying a five-number summary of a data set. This summary is the foundation
 * for box plots and is frequently used in statistics to describe the distribution of data.
 */
export const generateFiveNumberSummaryTable: WidgetGenerator<typeof FiveNumberSummaryTablePropsSchema> = (_data) => {
	// TODO: Implement five-number-summary-table generation
	return "<div><!-- FiveNumberSummaryTable implementation --></div>"
}
