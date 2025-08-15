test("histogram - tomato production per plant", () => {
	const input = {
		type: "histogram",
		width: 310,
		height: 280,
		title: "Tomato production per plant",
		xAxis: {
			label: "number of tomatoes produced"
		},
		yAxis: {
			max: 30,
			label: "number of tomato plants",
			tickInterval: 5
		},
		// Representative bins to mirror the example and stress label density
		bins: [
			{ label: "0-3", frequency: 2 },
			{ label: "3-6", frequency: 5 },
			{ label: "6-9", frequency: 9 },
			{ label: "9-12", frequency: 14 },
			{ label: "12-15", frequency: 22 },
			{ label: "15-18", frequency: 27 },
			{ label: "18-21", frequency: 21 },
			{ label: "21-24", frequency: 16 },
			{ label: "24-27", frequency: 10 },
			{ label: "27-30", frequency: 6 }
		]
	} satisfies HistogramInput

	// Validate the input
	const parsed = HistogramPropsSchema.parse(input)

	// Generate the SVG
	const svg = generateHistogram(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})

import { expect, test } from "bun:test"
import type { z } from "zod"
import { generateHistogram, HistogramPropsSchema } from "@/lib/widgets/generators"

type HistogramInput = z.input<typeof HistogramPropsSchema>

test("histogram - tomato plants production bins", () => {
	const input = {
		type: "histogram",
		width: 600,
		height: 420,
		title: null,
		xAxis: { label: "Number of tomatoes produced" },
		yAxis: { label: "Number of tomato plants", max: 30, tickInterval: 10 },
		bins: [
			{ label: "20-30", frequency: 3 },
			{ label: "30-40", frequency: 8 },
			{ label: "40-50", frequency: 12 },
			{ label: "50-60", frequency: 26 },
			{ label: "60-70", frequency: 10 },
			{ label: "70-80", frequency: 3 },
			{ label: "80-90", frequency: 1 }
		]
	} satisfies HistogramInput

	const parsed = HistogramPropsSchema.parse(input)
	const svg = generateHistogram(parsed)
	expect(svg).toMatchSnapshot()
})
