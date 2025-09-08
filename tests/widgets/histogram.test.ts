import { expect, test } from "bun:test"
import type { z } from "zod"
import { generateHistogram, HistogramPropsSchema } from "@/lib/widgets/generators"

type HistogramInput = z.input<typeof HistogramPropsSchema>

test("histogram - tomato production per plant", async () => {
	const input = {
		type: "histogram",
		width: 310,
		height: 300,
		title: "Tomato production per plant",
		xAxis: { label: "number of tomatoes produced" },
		yAxis: {
			max: 30,
			label: "number of tomato plants",
			tickInterval: 5
		},
		separators: [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30],
		bins: [
			{ frequency: 2 },
			{ frequency: 5 },
			{ frequency: 9 },
			{ frequency: 14 },
			{ frequency: 22 },
			{ frequency: 27 },
			{ frequency: 21 },
			{ frequency: 16 },
			{ frequency: 10 },
			{ frequency: 6 }
		]
	} satisfies HistogramInput

	const parsedResult = HistogramPropsSchema.safeParse(input)
	if (!parsedResult.success) {
		// In tests, convert schema failure into an assertion-friendly failure
		expect(parsedResult.success).toBeTrue()
		return
	}
	const svg = await generateHistogram(parsedResult.data)
	expect(svg).toMatchSnapshot()
})

test("histogram - tomato plants production bins", async () => {
	const input = {
		type: "histogram",
		width: 600,
		height: 420,
		title: "Test Histogram",
		xAxis: { label: "Number of tomatoes produced" },
		yAxis: { label: "Number of tomato plants", max: 30, tickInterval: 10 },
		separators: [20, 30, 40, 50, 60, 70, 80, 90],
		bins: [
			{ frequency: 3 },
			{ frequency: 8 },
			{ frequency: 12 },
			{ frequency: 26 },
			{ frequency: 10 },
			{ frequency: 3 },
			{ frequency: 1 }
		]
	} satisfies HistogramInput

	const parsedResult = HistogramPropsSchema.safeParse(input)
	if (!parsedResult.success) {
		expect(parsedResult.success).toBeTrue()
		return
	}
	const svg = await generateHistogram(parsedResult.data)
	expect(svg).toMatchSnapshot()
})
