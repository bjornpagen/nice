import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// A special marker to indicate a cell should be an input field
const INPUT_MARKER = "INPUT_FIELD"

// Defines a single row in the frequency table
const FrequencyRowSchema = z.object({
	category: z
		.union([z.string(), z.number()])
		.describe('The label for the first column, representing the data category or interval (e.g., 23 or "0-100").'),
	frequency: z
		.union([z.string(), z.number(), z.literal(INPUT_MARKER)])
		.describe("The value for the second column (frequency). Can be a number, text, or a marker for a QTI input field.")
})

// The main Zod schema for the frequencyTable function
export const FrequencyTablePropsSchema = z
	.object({
		title: z.string().optional().describe("An optional caption to be displayed above the table."),
		headers: z
			.tuple([z.string(), z.string()])
			.describe(
				'An array with exactly two string labels for the table header row (e.g., ["Number of push-ups", "Number of nights"]).'
			),
		rows: z.array(FrequencyRowSchema).describe("An array of row objects, each defining a category and its frequency.")
	})
	.describe(
		'This template generates a structured and accessible HTML <table> for displaying frequency data. It is highly versatile and can be used to create tables for discrete data values (e.g., "Number of push-ups") or for binned data intervals (e.g., "Screen-size interval"). The generator will construct a two-column table with a header row (<thead>) and a body (<tbody>). The headers are configurable. Each row in the table body represents a category and its corresponding frequency. Crucially, the frequency cells can either display a static number or be designated as interactive input fields. This allows the template to be used for presenting data or for creating "fill-in-the-blank" exercises where students must complete the table based on a given dataset. The output is a cleanly styled, semantically correct <table> ready for inclusion in a QTI item body.'
	)

export type FrequencyTableProps = z.infer<typeof FrequencyTablePropsSchema>

/**
 * This template generates a structured and accessible HTML table for displaying frequency data.
 * It is highly versatile and can be used to create tables for discrete data values or
 * for binned data intervals.
 */
export const generateFrequencyTable: WidgetGenerator<typeof FrequencyTablePropsSchema> = (_data) => {
	// TODO: Implement frequency-table generation
	return "<div><!-- FrequencyTable implementation --></div>"
}
