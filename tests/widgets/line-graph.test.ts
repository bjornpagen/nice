import { expect, test } from "bun:test"
import { generateLineGraph, LineGraphPropsSchema } from "@/lib/widgets/generators"

test("line graph - Arizona city temperatures", () => {
	const input = {
		type: "lineGraph" as const,
		width: 500,
		height: 450,
		title: null,
		xAxis: {
			label: "Month",
			categories: ["Jan.", "", "Mar.", "", "May", "", "July", "", "Sept.", "", "Nov.", ""]
		},
		yAxis: {
			label: "Average temperature (°C)",
			min: -5,
			max: 40,
			tickInterval: 5,
			showGridLines: true
		},
		series: [
			{
				name: "Bullhead City",
				values: [12.5, 14.5, 18, 22.5, 27.5, 32.5, 35.5, 35, 31, 24, 17, 12],
				color: "#000000", // Changed from "black" to hex format
				style: "solid" as const,
				showPoints: true
			},
			{
				name: "Sedona",
				values: [8, 9, 12, 15, 21, 25.5, 28, 27, 24, 18, 11, 7.5],
				color: "#00A2C7",
				style: "dashed" as const,
				showPoints: true
			},
			{
				name: "Flagstaff",
				values: [-2, -0.5, 2.5, 5.5, 9.5, 14, 18, 17, 13, 7.5, 2, -2],
				color: "#D43827",
				style: "dotted" as const,
				showPoints: true
			}
		],
		showLegend: true
	}

	// Validate the input
	const parsed = LineGraphPropsSchema.parse(input)

	// Generate the SVG
	const svg = generateLineGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})
