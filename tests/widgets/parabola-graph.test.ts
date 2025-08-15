import { expect, test } from "bun:test"
import type { z } from "zod"
import { generateParabolaGraph, ParabolaGraphPropsSchema } from "@/lib/widgets/generators"

type ParabolaGraphInput = z.input<typeof ParabolaGraphPropsSchema>

test("parabola graph - enzyme activity", () => {
	const input = {
		type: "parabolaGraph",
		width: 400,
		height: 400,
		xAxis: {
			label: "Temperature (°C)",
			min: 0,
			max: 100,
			tickInterval: 20,
			showGridLines: false,
			showTickLabels: true
		},
		yAxis: {
			label: "Enzyme activity",
			min: 0,
			max: 10,
			tickInterval: 1,
			showGridLines: true,
			showTickLabels: false
		},
		parabola: {
			points: {
				p1: {
					x: 0,
					y: 1.7
				},
				p2: {
					x: 60,
					y: 9.7
				},
				p3: {
					x: 80,
					y: 9.7
				}
			},
			color: "#d9534f",
			style: "solid"
		}
	} satisfies ParabolaGraphInput

	// Validate the input
	const parsed = ParabolaGraphPropsSchema.parse(input)

	// Generate the SVG
	const svg = generateParabolaGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})
