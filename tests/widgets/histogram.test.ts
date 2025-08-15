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
