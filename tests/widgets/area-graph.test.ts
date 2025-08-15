import { expect, test } from "bun:test"
import type { z } from "zod"
import { generateAreaGraph, AreaGraphPropsSchema } from "@/lib/widgets/generators"

type AreaGraphInput = z.input<typeof AreaGraphPropsSchema>

test("area graph - U.S. energy consumption by source", () => {
	const input = {
		type: "areaGraph",
		width: 600,
		height: 450,
		title: "U.S. energy consumption by source (1776–2021)",
		xAxis: {
			label: "Year",
			min: 1776,
			max: 2021,
			tickValues: [1776, 1825, 1875, 1925, 1975, 2021]
		},
		yAxis: {
			label: "Percent of total",
			min: 0,
			max: 100,
			tickInterval: 10,
			tickFormat: "%",
			showGridLines: true
		},
		dataPoints: [
			{ x: 1776, y: 0 },
			{ x: 1850, y: 5 },
			{ x: 1875, y: 22 },
			{ x: 1900, y: 72 },
			{ x: 1925, y: 90 },
			{ x: 1950, y: 92 },
			{ x: 1966, y: 94 },
			{ x: 1975, y: 91 },
			{ x: 2000, y: 85 },
			{ x: 2021, y: 79 }
		],
		bottomArea: {
			label: "Fossil fuels",
			color: "#ADD8E6"
		},
		topArea: {
			label: "Non-fossil fuels",
			color: "#90EE90"
		},
				boundaryLine: {
			color: "#000000",
			strokeWidth: 3
		}
	} satisfies AreaGraphInput

	// Validate the input
	const parsed = AreaGraphPropsSchema.parse(input)

	// Generate the SVG
	const svg = generateAreaGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})
