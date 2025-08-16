import { expect, test } from "bun:test"
import { generateParabolaGraph, ParabolaGraphPropsSchema } from "@/lib/widgets/generators"

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
			vertex: { x: 70, y: 9.8 },
			yIntercept: 1.7,
			color: "#d9534f",
			style: "solid"
		}
	}

	const parsed = ParabolaGraphPropsSchema.safeParse(input)
	if (!parsed.success) {
		expect(parsed.success).toBeTrue()
		return
	}

	const svg = generateParabolaGraph(parsed.data)
	expect(svg).toMatchSnapshot()
})
