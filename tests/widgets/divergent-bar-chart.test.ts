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
