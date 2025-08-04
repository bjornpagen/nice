import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the verticalArithmeticSetup function
export const VerticalArithmeticSetupPropsSchema = z
	.object({
		title: z.string().nullable().describe("An optional title or instruction to display above the arithmetic problem."),
		operand1: z
			.string()
			.describe(
				'The first number (top operand) in the calculation, provided as a string to preserve formatting (e.g., "1.84", "740").'
			),
		operand2: z.string().describe("The second number (bottom operand) in the calculation, provided as a string."),
		operator: z.enum(["×", "+", "−"]).describe("The arithmetic operator symbol to display.")
	})
	.strict()
	.describe(
		"This template is designed to generate a clear, standards-compliant visual representation of a vertical arithmetic problem within an HTML <div>. It is ideal for scaffolding multi-digit multiplication, addition, or subtraction problems, particularly those involving decimals, by presenting them in the standard algorithm format. The generator will render two numbers (operands) stacked vertically. The alignment is handled automatically: for operations like addition and subtraction, the numbers are aligned by their decimal points; for multiplication, they are typically right-aligned. An operator symbol (×, +, or −) is placed to the left of the bottom number to clearly indicate the operation. A solid horizontal line is drawn underneath the bottom number, separating the problem from the space where the solution would be calculated. The final output is a self-contained, neatly formatted diagram that mimics how students would set up the problem on paper. It uses HTML and CSS to create a table-like structure that ensures proper alignment and readability, helping students focus on the calculation process itself."
	)

export type VerticalArithmeticSetupProps = z.infer<typeof VerticalArithmeticSetupPropsSchema>

/**
 * This template is designed to generate a clear, standards-compliant visual representation
 * of a vertical arithmetic problem within an HTML div. It is ideal for scaffolding
 * multi-digit multiplication, addition, or subtraction problems.
 */
export const generateVerticalArithmeticSetup: WidgetGenerator<typeof VerticalArithmeticSetupPropsSchema> = (data) => {
	const { title, operand1, operand2, operator } = data

	let html = `<div style="display: inline-block; font-family: 'Courier New', monospace; font-size: 1.2em; text-align: right;">`
	if (title) {
		html += `<div style="text-align: center; margin-bottom: 5px; font-family: sans-serif;">${title}</div>`
	}
	html += `<table style="border-collapse: collapse;">`
	html += `<tr><td></td><td style="padding: 2px 5px;">${operand1}</td></tr>`
	html += `<tr><td style="padding: 2px 5px;">${operator}</td><td style="padding: 2px 5px; border-bottom: 2px solid black;">${operand2}</td></tr>`
	html += "</table>"
	html += "</div>"
	return html
}
