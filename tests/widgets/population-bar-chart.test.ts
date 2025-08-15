import { expect, test } from "bun:test"
import type { z } from "zod"
import { generatePopulationBarChart, PopulationBarChartPropsSchema } from "@/lib/widgets/generators"

type PopulationBarChartInput = z.input<typeof PopulationBarChartPropsSchema>

test("population bar chart - elk population 1990-2005", () => {
	const input = {
		type: "populationBarChart",
		width: 700,
		height: 420,
		xAxisLabel: "Year",
		yAxis: {
			label: "Number of elk",
			min: 0,
			max: 1400,
			tickInterval: 200
		},
		xAxisVisibleLabels: ["1990", "1995", "2000", "2005"],
		data: [
			{ label: "1990", value: 160 },
			{ label: "1991", value: 350 },
			{ label: "1992", value: 650 },
			{ label: "1993", value: 940 },
			{ label: "1994", value: 1130 },
			{ label: "1995", value: 1230 },
			{ label: "1996", value: 1290 },
			{ label: "1997", value: 1250 },
			{ label: "1998", value: 1180 },
			{ label: "1999", value: 1050 },
			{ label: "2000", value: 980 },
			{ label: "2001", value: 1020 },
			{ label: "2002", value: 990 },
			{ label: "2003", value: 1010 },
			{ label: "2004", value: 1000 },
			{ label: "2005", value: 1000 }
		],
		barColor: "#208388",
		gridColor: "#CCCCCC"
	} satisfies PopulationBarChartInput

	const parsed = PopulationBarChartPropsSchema.parse(input)
	const svg = generatePopulationBarChart(parsed)
	expect(svg).toMatchSnapshot()
})

// Verifies that an empty xAxisVisibleLabels renders all labels
test("population bar chart - all x labels when visible list empty", () => {
	const input = {
		type: "populationBarChart",
		width: 600,
		height: 360,
		xAxisLabel: "Year",
		yAxis: { label: "Number of elk", min: 0, max: 1400, tickInterval: 200 },
		xAxisVisibleLabels: [],
		data: [
			{ label: "1990", value: 160 },
			{ label: "1991", value: 350 },
			{ label: "1992", value: 650 }
		],
		barColor: "#208388",
		gridColor: "#CCCCCC"
	} satisfies PopulationBarChartInput

	const parsed = PopulationBarChartPropsSchema.parse(input)
	const svg = generatePopulationBarChart(parsed)
	expect(svg).toMatchSnapshot()
})
