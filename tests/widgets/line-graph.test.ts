import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { generateLineGraph, LineGraphPropsSchema } from "@/lib/widgets/generators"

type LineGraphInput = z.input<typeof LineGraphPropsSchema>

test("line graph - wraps long y-axis label (photosynthesis)", () => {
	const input = {
		type: "lineGraph",
		width: 600,
		height: 350,
		title: "Time of day vs. carbon dioxide assimilation",
		xAxis: {
			label: "Time of day (hour)",
			categories: ["0", "3", "6", "9", "12", "15", "18", "21", "24"]
		},
		yAxis: {
			label: "carbon dioxide assimilation (micromoles per square meter per second)",
			min: 0,
			max: 35,
			tickInterval: 5,
			showGridLines: true
		},
		yAxisRight: null,
		series: [
			{
				name: "Carbon dioxide assimilation",
				color: "#1f77b4",
				style: "dashed",
				pointShape: "circle",
				yAxis: "left",
				values: [0, 0, 0, 20, 32, 26, 0, 0, 0]
			}
		],
		showLegend: false
	} satisfies LineGraphInput

	const parseResult = errors.trySync(() => LineGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generateLineGraph(parsed)
	// Ensure the y-axis label is rotated and wraps
	expect(svg).toContain('transform="rotate(-90')
	expect(svg).toMatch(/<tspan x="\d+" dy="1.1em">/) // at least one wrapped line
	expect(svg).toMatchSnapshot()
})

test("line graph - Arizona city temperatures", () => {
	const input = {
		type: "lineGraph",
		width: 500,
		height: 450,
		title: "Test Line Graph",
		xAxis: {
			label: "Month",
			categories: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
		},
		yAxis: {
			label: "Average temperature (°C)",
			min: -5,
			max: 40,
			tickInterval: 5,
			showGridLines: true
		},
		yAxisRight: null,
		series: [
			{
				name: "Bullhead City",
				values: [12.5, 14.5, 18, 22.5, 27.5, 32.5, 35.5, 35, 31, 24, 17, 12],
				color: "#000000", // Changed from "black" to hex format
				style: "solid",
				pointShape: "circle",
				yAxis: "left"
			},
			{
				name: "Sedona",
				values: [8, 9, 12, 15, 21, 25.5, 28, 27, 24, 18, 11, 7.5],
				color: "#00A2C7",
				style: "dashed",
				pointShape: "circle",
				yAxis: "left"
			},
			{
				name: "Flagstaff",
				values: [-2, -0.5, 2.5, 5.5, 9.5, 14, 18, 17, 13, 7.5, 2, -2],
				color: "#D43827",
				style: "dotted",
				pointShape: "circle",
				yAxis: "left"
			}
		],
		showLegend: true
	} satisfies LineGraphInput

	const parseResult = errors.trySync(() => LineGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generateLineGraph(parsed)
	expect(svg).toMatchSnapshot()
})

test("line graph - collared lemmings and stoats (dual y-axis)", () => {
	const input = {
		type: "lineGraph",
		width: 600,
		height: 450,
		title: "Test Line Graph",
		xAxis: {
			label: "Year",
			categories: ["1988", "1989", "1990", "1991", "1992", "1993", "1994", "1995", "1996", "1997", "1998", "1999", "2000", "2001", "2002"]
		},
		yAxis: {
			label: "Number of collared lemmings",
			min: 0,
			max: 100,
			tickInterval: 20,
			showGridLines: false
		},
		yAxisRight: {
			label: "Number of stoats",
			min: 0,
			max: 10,
			tickInterval: 2,
			showGridLines: false
		},
		series: [
			{
				name: "Number of collared lemmings",
				values: [75, 30, 15, 65, 85, 75, 20, 40, 70, 65, 18, 55, 85, 60, 25],
				color: "#00838F",
				style: "solid",
				pointShape: "circle",
				yAxis: "left"
			},
			{
				name: "Number of stoats",
				values: [4, 4, 2, 0, 5, 4, 2, 2, 8, 4, 2, 0, 4, 2, 0],
				color: "#000000",
				style: "dashed",
				pointShape: "square",
				yAxis: "right"
			}
		],
		showLegend: true
	} satisfies LineGraphInput

	const parseResult = errors.trySync(() => LineGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generateLineGraph(parsed)
	expect(svg).toMatchSnapshot()
})

test("line graph - environmental change flowering time shift (legend below, labels close, title wrap)", () => {
	const input = {
		type: "lineGraph",
		width: 325,
		height: 318,
		title: "Effect of environmental change on flowering time",
		xAxis: {
			label: "Flowering time (shorter to longer)",
			categories: ["Shorter", "Stage 1", "Stage 2", "Stage 3", "Stage 4", "Stage 5", "Stage 6", "Stage 7", "Stage 8", "Stage 9", "Longer"]
		},
		yAxis: {
			label: "Number of plants",
			min: 0,
			max: 10,
			tickInterval: 2,
			showGridLines: true
		},
		yAxisRight: null,
		series: [
			{
				name: "before environmental change",
				values: [0, 2, 6, 9, 8, 6, 4, 3, 2, 1, 0],
				color: "#1f77b4",
				style: "solid",
				pointShape: "circle",
				yAxis: "left"
			},
			{
				name: "after environmental change",
				values: [0, 1, 2, 3, 5, 7, 9, 10, 6, 3, 0],
				color: "#ff7f0e",
				style: "dashed",
				pointShape: "circle",
				yAxis: "left"
			}
		],
		showLegend: true
	} satisfies LineGraphInput

	const parseResult = errors.trySync(() => LineGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generateLineGraph(parsed)
	expect(svg).toMatchSnapshot()
})

test("line graph - AZ cities temp elevation (title wrap + label thinning)", () => {
	const input = {
		type: "lineGraph",
		width: 385,
		height: 367,
		title: "Average temperature (°C) by month for three Arizona cities",
		xAxis: {
			label: "Month",
			categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
		},
		yAxis: {
			label: "Average temperature (°C)",
			min: -5,
			max: 40,
			tickInterval: 5,
			showGridLines: true
		},
		yAxisRight: null,
		series: [
			{
				name: "Bullhead City",
				values: [12.5, 14.5, 18, 22.5, 27.5, 32.5, 35.5, 35, 31, 24, 17, 12],
				color: "#000",
				style: "solid",
				pointShape: "circle",
				yAxis: "left"
			},
			{
				name: "Sedona",
				values: [8, 9, 12, 15, 21, 25.5, 28, 27, 24, 18, 11, 7.5],
				color: "#11accd",
				style: "dashed",
				pointShape: "circle",
				yAxis: "left"
			},
			{
				name: "Flagstaff",
				values: [-2, -0.5, 2.5, 5.5, 9.5, 14, 18, 17, 13, 7.5, 2, -2],
				color: "#e84d39",
				style: "dotted",
				pointShape: "circle",
				yAxis: "left"
			}
		],
		showLegend: true
	} satisfies LineGraphInput

	const parseResult = errors.trySync(() => LineGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generateLineGraph(parsed)
	expect(svg).toMatchSnapshot()
})

test("line graph - mammal species vs latitude", () => {
	const input = {
		type: "lineGraph",
		width: 556,
		height: 350,
		title: "Number of mammal species vs. latitude",
		xAxis: {
			label: "Latitude (in degrees)",
			categories: [
				"0 degrees",
				"10 degrees south",
				"20 degrees south",
				"30 degrees south",
				"40 degrees south",
				"50 degrees south"
			]
		},
		yAxis: {
			label: "Number of mammal species",
			min: 0,
			max: 100,
			tickInterval: 20,
			showGridLines: true
		},
		yAxisRight: null,
		series: [
			{
				name: "Species Count",
				values: [100, 50, 15, 0, 55, 100],
				color: "#3377dd",
				pointShape: "circle",
				style: "solid",
				yAxis: "left"
			}
		],
		showLegend: false
	} satisfies LineGraphInput

	const parseResult = errors.trySync(() => LineGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generateLineGraph(parsed)
	expect(svg).toMatchSnapshot()
})

test("line graph - monthly precipitation and temperature (dual y-axis)", () => {
	const input = {
		type: "lineGraph",
		width: 752,
		height: 400,
		title: "Monthly precipitation and average temperature",
		xAxis: {
			label: "Month",
			categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
		},
		yAxis: {
			label: "Precipitation (in millimeters)",
			min: 0,
			max: 150,
			tickInterval: 25,
			showGridLines: true
		},
		yAxisRight: {
			label: "Average Temperature (in degrees Celsius)",
			min: -30,
			max: 30,
			tickInterval: 10,
			showGridLines: false
		},
		series: [
			{
				name: "Precipitation",
				values: [18, 14, 14, 12, 19, 31, 43, 46, 38, 28, 20, 17],
				color: "#1f77b4",
				pointShape: "square",
				style: "solid",
				yAxis: "left"
			},
			{
				name: "Average temperature",
				values: [-27, -25, -20, -7, 12, 28, 38, 28, 8, -13, -20, -25],
				color: "#d62728",
				pointShape: "circle",
				style: "dotted",
				yAxis: "right"
			}
		],
		showLegend: true
	} satisfies LineGraphInput

	const parseResult = errors.trySync(() => LineGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generateLineGraph(parsed)
	expect(svg).toMatchSnapshot()
})