import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { generatePieChart, PieChartWidgetPropsSchema } from "@/lib/widgets/generators"

type PieChartInput = z.input<typeof PieChartWidgetPropsSchema>

test("pie chart - earth land breakdown", () => {
	const input = {
		type: "pieChart",
		width: 350,
		height: 900,
		layout: "vertical",
		spacing: 40,
		charts: [
			{
				title: "Earth's land",
				slices: [
					{ label: "Habitable land", value: 71, color: "#9370DB" },
					{ label: "Uninhabitable land", value: 29, color: "#D2B48C" }
				]
			},
			{
				title: "Habitable land",
				slices: [
					{ label: "Agricultural land", value: 50, color: "#90EE90" },
					{ label: "Forests and shrub", value: 48, color: "#006400" },
					{ label: "Urban land", value: 1, color: "#FFB6C1" },
					{ label: "Lakes and rivers", value: 1, color: "#ADD8E6" }
				]
			},
			{
				title: "Agricultural land",
				slices: [
					{ label: "Livestock and feed", value: 77, color: "#CD5C5C" },
					{ label: "Crops", value: 23, color: "#40E0D0" }
				]
			}
		]
	} satisfies PieChartInput

	const parseResult = errors.trySync(() => PieChartWidgetPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generatePieChart(parsed)
	expect(svg).toMatchSnapshot()
})
