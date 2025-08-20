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
		height: 300,
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
		height: 300,
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

test("scatter plot - foraminifera species vs sea surface temperature", () => {
	const input = {
		type: "scatterPlot",
		width: 466,
		height: 360,
		title: "Foraminifera species vs. sea surface temperature",
		xAxis: {
			label: "Sea surface temperature (in degrees Celsius)",
			min: 0,
			max: 20,
			tickInterval: 2,
			gridLines: true
		},
		yAxis: {
			label: "Number of Foraminifera species",
			min: 0,
			max: 20,
			tickInterval: 5,
			gridLines: true
		},
		points: [
			// Marine biology data showing species diversity vs temperature
			{ x: 1, y: 3, label: "" },
			{ x: 2, y: 4, label: "" },
			{ x: 3, y: 4.5, label: "" },
			{ x: 4, y: 5, label: "" },
			{ x: 5, y: 5.5, label: "" },
			{ x: 6, y: 6, label: "" },
			{ x: 7, y: 6.5, label: "" },
			{ x: 8, y: 7, label: "" },
			{ x: 9, y: 7.5, label: "" },
			{ x: 10, y: 8, label: "" },
			{ x: 11, y: 8.5, label: "" },
			{ x: 12, y: 9, label: "" },
			{ x: 13, y: 9.5, label: "" },
			{ x: 14, y: 10, label: "" },
			{ x: 15, y: 10.5, label: "" },
			{ x: 16, y: 11, label: "" },
			{ x: 17, y: 11.5, label: "" },
			{ x: 18, y: 12, label: "" },
			{ x: 19, y: 12.5, label: "" },
			{ x: 20, y: 13, label: "" }
		],
		lines: [
			{
				type: "bestFit",
				method: "linear",
				style: {
					color: "#0C7F99",
					strokeWidth: 3,
					dash: false
				},
				label: "Trend line"
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
