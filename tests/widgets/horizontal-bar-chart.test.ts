import { expect, test } from "bun:test"
import type { z } from "zod"
import { generateHorizontalBarChart, HorizontalBarChartPropsSchema } from "@/lib/widgets/generators"

type HorizontalBarChartInput = z.input<typeof HorizontalBarChartPropsSchema>

test("horizontal bar chart - land use per 100 grams of protein", () => {
	const input = {
		type: "horizontalBarChart",
		width: 960,
		height: 540,
		xAxis: {
			label: "Land use per 100 grams of protein (m²)",
			min: 0,
			max: 200,
			tickInterval: 50
		},
		data: [
			{ category: "Lamb", value: 184.8, label: "184.8 m²", color: "#6E44AA" },
			{ category: "Beef", value: 163.6, label: "163.6 m²", color: "#07A794" },
			{ category: "Pork", value: 10.7, label: "10.7 m²", color: "#D42C77" },
			{ category: "Chicken", value: 7.1, label: "7.1 m²", color: "#D07A00" },
			{ category: "Grains", value: 4.6, label: "4.6 m²", color: "#08B5D6" },
			{ category: "Tofu", value: 2.2, label: "2.2 m²", color: "#8B572A" }
		],
		gridColor: "#CCCCCC"
	} satisfies HorizontalBarChartInput

	const parsed = HorizontalBarChartPropsSchema.parse(input)
	const svg = generateHorizontalBarChart(parsed)
	expect(svg).toMatchSnapshot()
})
