import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// The main Zod schema for the fractionBar function
export const FractionBarPropsSchema = z
	.object({
		width: z.number().default(200).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(170).describe("The total height of the output SVG container in pixels."),
		orientation: z
			.enum(["vertical", "horizontal"])
			.default("vertical")
			.describe("The direction in which the bar is divided into parts."),
		denominator: z
			.number()
			.int()
			.positive()
			.describe("The total number of equal parts to divide the bar into. This must be a positive integer."),
		numerator: z
			.number()
			.int()
			.gte(0)
			.describe("The number of parts to shade, starting from the top or left. This must be a non-negative integer."),
		shadedColor: z
			.string()
			.default("rgba(100, 100, 100, 0.5)")
			.describe("A CSS color for the shaded portion of the bar."),
		label: z.string().optional().describe('An optional text label to display on or near the diagram (e.g., "3/4").')
	})
	.describe(
		'This template generates a classic "fraction bar" or area model diagram as an SVG graphic. It is a fundamental visual tool for representing fractions and part-whole relationships. The generator will render a single, bold-outlined rectangle, which represents the "whole" (1). This rectangle is then subdivided into a specified number of equal-sized smaller rectangles, either vertically or horizontally. The total number of these subdivisions corresponds to the denominator of the fraction. A specified number of these subdivisions, corresponding to the numerator, are then filled with a distinct color to visually represent the fractional part. The output is a simple, unambiguous, and accessible SVG diagram within a <div>. It is highly effective for questions that require students to identify a fraction from a model, compare fractions, or understand the visual meaning of a numerator and denominator.'
	)

export type FractionBarProps = z.infer<typeof FractionBarPropsSchema>

/**
 * This template generates a classic "fraction bar" or area model diagram as an SVG graphic.
 * It is a fundamental visual tool for representing fractions and part-whole relationships.
 */
export const generateFractionBar: WidgetGenerator<typeof FractionBarPropsSchema> = (_data) => {
	// TODO: Implement fraction-bar generation
	return "<svg><!-- FractionBar implementation --></svg>"
}
