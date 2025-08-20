import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { AreaGraphPropsSchema, generateAreaGraph } from "@/lib/widgets/generators"

type AreaGraphInput = z.input<typeof AreaGraphPropsSchema>

test("area graph - U.S. energy consumption by source (wrapping title)", () => {
	const input = {
		type: "areaGraph",
		width: 369,
		height: 300,
		title: "U.S. energy consumption by source (1776 to 2021)",
		xAxis: {
			label: "Year",
			min: 1776,
			max: 2021,
			tickValues: [1776, 1850, 1900, 1950, 2021]
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
			{ x: 1850, y: 0 },
			{ x: 1900, y: 76 },
			{ x: 1950, y: 91 },
			{ x: 1966, y: 94 },
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
			strokeWidth: 2
		}
	} satisfies AreaGraphInput

	// Validate the input
	const parseResult = errors.trySync(() => AreaGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data

	// Generate the SVG
	const svg = generateAreaGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})
