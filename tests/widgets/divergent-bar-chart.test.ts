import { expect, test } from "bun:test"
import type { z } from "zod"
import { DivergentBarChartPropsSchema, generateDivergentBarChart } from "@/lib/widgets/generators"

type DivergentBarChartInput = z.input<typeof DivergentBarChartPropsSchema>

test("divergent bar chart - sea level change by century", () => {
	const input = {
		type: "divergentBarChart",
		width: 760,
		height: 460,
		xAxisLabel: "Century",
		yAxis: {
			label: "Change in sea level (cm)",
			min: -6,
			max: 14,
			tickInterval: 2
		},
		// Labels placed to match the screenshot styling: only specific centuries labeled
		data: [
			{ category: "1st", value: 1.6 },
			{ category: "", value: 2.6 },
			{ category: "", value: -0.3 },

			{ category: "5th", value: -3.6 },
			{ category: "", value: 2.6 },
			{ category: "", value: -4.0 },

			{ category: "10th", value: 2.8 },
			{ category: "", value: 0.2 },
			{ category: "", value: -6.0 },
			{ category: "", value: -1.6 },

			{ category: "15th", value: 3.5 },
			{ category: "", value: 2.3 },
			{ category: "", value: -0.6 },
			{ category: "", value: -1.2 },
			{ category: "", value: -3.2 },

			{ category: "20th", value: 13.8 },
			{ category: "", value: -0.2 }
		],
		positiveBarColor: "#00CFCB",
		negativeBarColor: "#0B6A6A",
		gridColor: "#CCCCCC"
	} satisfies DivergentBarChartInput

	const parsed = DivergentBarChartPropsSchema.parse(input)
	const svg = generateDivergentBarChart(parsed)
	expect(svg).toMatchSnapshot()
})

test("divergent bar chart - auto label thinning prevents overcrowding deterministically", () => {
	const input = {
		type: "divergentBarChart",
		width: 374,
		height: 267,
		xAxisLabel: "Century",
		yAxis: {
			label: "Change in sea level (cm)",
			min: -6,
			max: 14,
			tickInterval: 2
		},
		data: [
			{ value: 1.5, category: "1st" },
			{ value: 2.5, category: "2nd" },
			{ value: -0.2, category: "3rd" },
			{ value: 2.5, category: "4th" },
			{ value: -3.5, category: "5th" },
			{ value: 1, category: "6th" },
			{ value: 3, category: "7th" },
			{ value: -4, category: "8th" },
			{ value: 0.2, category: "9th" },
			{ value: 3, category: "10th" },
			{ value: -6, category: "11th" },
			{ value: -1.5, category: "12th" },
			{ value: -0.5, category: "13th" },
			{ value: -1, category: "14th" },
			{ value: 3.5, category: "15th" },
			{ value: 2, category: "16th" },
			{ value: -3.5, category: "17th" },
			{ value: -2, category: "18th" },
			{ value: -0.2, category: "19th" },
			{ value: 14, category: "20th" }
		],
		positiveBarColor: "#01d1c1",
		negativeBarColor: "#208170",
		gridColor: "#0000004D"
	} satisfies DivergentBarChartInput

	const parsed = DivergentBarChartPropsSchema.parse(input)
	const svg = generateDivergentBarChart(parsed)

	// Count how many x-axis tick labels were rendered (middle-anchored only)
	const xTickLabelMatches = svg.match(/<text[^>]*class="tick-label"[^>]*text-anchor="middle"[^>]*>[^<]+<\/text>/g) ?? []
	// chartWidth = width - left(80) - right(20) = 274, min spacing 50 => max 5
	const expectedMaxLabels = Math.max(1, Math.floor((374 - 100) / 50))
	expect(xTickLabelMatches.length).toBeGreaterThan(0)
	expect(xTickLabelMatches.length).toBeLessThanOrEqual(expectedMaxLabels)

	// Ensure first category present for determinism
	expect(svg).toContain(">1st<")
})
