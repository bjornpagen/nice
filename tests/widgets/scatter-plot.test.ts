import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { generateScatterPlot, ScatterPlotPropsSchema } from "@/lib/widgets/generators"

type ScatterPlotInput = z.input<typeof ScatterPlotPropsSchema>

test("scatter plot - acceleration vs mass with trend", () => {
	const input = {
		type: "scatterPlot",
		width: 407,
		height: 290,
		title: "Acceleration vs. Mass",
		xAxis: {
			label: "Mass (kg)",
			min: 0,
			max: 4,
			tickInterval: 1,
			gridLines: true
		},
		yAxis: {
			label: "Acceleration (m/s^2)",
			min: 0,
			max: 2.5,
			tickInterval: 0.5,
			gridLines: true
		},
		points: [
			{ x: 1, y: 2, label: "" },
			{ x: 2, y: 1, label: "" },
			{ x: 3, y: 0.5, label: "" },
			{ x: 4, y: 0.25, label: "" }
		],
		lines: [
			{
				type: "bestFit",
				method: "exponential",
				style: {
					color: "#555555",
					strokeWidth: 2,
					dash: false
				},
				label: "Trend"
			}
		]
	} satisfies ScatterPlotInput

	// Validate the input
	const parseResult = errors.trySync(() => ScatterPlotPropsSchema.safeParse(input))
	if (parseResult.error) {
		logger.error("parsing failed", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "schema parsing")
	}

	const validation = parseResult.data
	if (!validation.success) {
		logger.error("input validation failed", { error: validation.error })
		throw errors.wrap(validation.error, "input validation")
	}
	const parsed = validation.data

	// Generate the SVG
	const svg = generateScatterPlot(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})

test("scatter plot - bacterial population growth with exponential trend", () => {
	const input = {
		type: "scatterPlot",
		width: 407,
		height: 290,
		title: "Bacterial Population Growth",
		xAxis: {
			label: "Time (hours)",
			min: 0,
			max: 6,
			tickInterval: 1,
			gridLines: true
		},
		yAxis: {
			label: "Population (thousands)",
			min: 0,
			max: 100,
			tickInterval: 20,
			gridLines: true
		},
		points: [
			{ x: 0, y: 2, label: "" },
			{ x: 1, y: 4, label: "" },
			{ x: 2, y: 8, label: "" },
			{ x: 3, y: 16, label: "" },
			{ x: 4, y: 32, label: "" },
			{ x: 5, y: 64, label: "" }
		],
		lines: [
			{
				type: "bestFit",
				method: "exponential",
				style: {
					color: "#2E8B57",
					strokeWidth: 2,
					dash: false
				},
				label: "Growth Model"
			}
		]
	} satisfies ScatterPlotInput

	// Validate the input
	const parseResult = errors.trySync(() => ScatterPlotPropsSchema.safeParse(input))
	if (parseResult.error) {
		logger.error("parsing failed", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "schema parsing")
	}

	const validation = parseResult.data
	if (!validation.success) {
		logger.error("input validation failed", { error: validation.error })
		throw errors.wrap(validation.error, "input validation")
	}
	const parsed = validation.data

	// Generate the SVG
	const svg = generateScatterPlot(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})
