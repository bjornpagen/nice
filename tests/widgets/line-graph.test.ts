import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { generateLineGraph, LineGraphPropsSchema } from "@/lib/widgets/generators"

type LineGraphInput = z.input<typeof LineGraphPropsSchema>

test("line graph - Arizona city temperatures", () => {
	const input = {
		type: "lineGraph",
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

	// Validate the input
	const parseResult = errors.trySync(() => LineGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data

	// Generate the SVG
	const svg = generateLineGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})

test("line graph - collared lemmings and stoats (dual y-axis)", () => {
	const input = {
		type: "lineGraph",
		width: 600,
		height: 450,
		title: null,
		xAxis: {
			label: "Year",
			categories: ["1988", "", "1990", "", "1992", "", "1994", "", "1996", "", "1998", "", "2000", "", "2002"]
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
				values: [29, 60, 75, 38, 24, 28, 72, 57, 34, 38, 76, 50, 24, 40, 80],
				color: "#00838F",
				style: "solid",
				pointShape: "circle",
				yAxis: "left"
			},
			{
				name: "Number of stoats",
				values: [4, 4, 5, 6, 3, 4, 5, 5, 2, 4, 5, 6, 4, 5, 6],
				color: "#000000",
				style: "dashed",
				pointShape: "square",
				yAxis: "right"
			}
		],
		showLegend: true
	} satisfies LineGraphInput

	// Validate the input
	const parseResult = errors.trySync(() => LineGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data

	// Generate the SVG
	const svg = generateLineGraph(parsed)

	// Snapshot test the generated SVG
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
			categories: ["Shorter", "", "", "", "", "", "", "", "", "", "Longer"]
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
				color: "#1f77b4",
				style: "solid",
				pointShape: "circle",
				yAxis: "left",
				values: [0, 2, 6, 9, 8, 6, 4, 3, 2, 1, 0]
			},
			{
				name: "after environmental change",
				color: "#ff7f0e",
				style: "dashed",
				pointShape: "circle",
				yAxis: "left",
				values: [0, 1, 2, 3, 5, 7, 9, 10, 6, 3, 0]
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

	// Basic assertions to ensure legend and labels exist / are below chart
	expect(svg).toContain("before environmental change")
	expect(svg).toContain("after environmental change")
	// Snapshot for full SVG structure
	expect(svg).toMatchSnapshot()
})

// NEW: Arizona cities elevation dataset

test("line graph - AZ cities temp elevation (title wrap + label thinning)", () => {
	const input = {
		type: "lineGraph",
		title: "Average temperature (°C) by month for three Arizona cities",
		width: 343,
		height: 367,
		xAxis: {
			label: "Month",
			categories: [
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December"
			]
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
				color: "#000",
				style: "solid",
				pointShape: "circle",
				yAxis: "left",
				values: [12.7, 14.6, 18.1, 22.2, 27.3, 32.2, 35.5, 35.1, 30.9, 24.1, 16.9, 12.1]
			},
			{
				name: "Sedona",
				color: "#11accd",
				style: "dashed",
				pointShape: "circle",
				yAxis: "left",
				values: [7.9, 9.3, 12.1, 15.2, 20.2, 25.4, 27.9, 27, 23.9, 18.2, 12.2, 7.4]
			},
			{
				name: "Flagstaff",
				color: "#e84d39",
				style: "dotted",
				pointShape: "circle",
				yAxis: "left",
				values: [-2, -0.6, 2.3, 5.5, 9.2, 14.1, 17.9, 17.1, 13.4, 7.7, 2.1, -2.2]
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
