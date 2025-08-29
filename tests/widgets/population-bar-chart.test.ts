import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
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

	const validation = PopulationBarChartPropsSchema.safeParse(input)
	if (!validation.success) {
		logger.error("input validation", { error: validation.error })
		throw errors.wrap(validation.error, "input validation")
	}
	const parsed = validation.data
	const svg = generatePopulationBarChart(parsed)
	expect(svg).toMatchSnapshot()
})

// Verifies auto label thinning when visible list is empty to prevent overcrowding
test("population bar chart - auto label thinning when visible list empty", () => {
	const input = {
		type: "populationBarChart",
		width: 390,
		height: 360,
		xAxisLabel: "Year",
		yAxis: { label: "Number of elk", min: 0, max: 1400, tickInterval: 200 },
		xAxisVisibleLabels: [],
		data: [
			{ label: "1990", value: 160 },
			{ label: "1991", value: 350 },
			{ label: "1992", value: 647 },
			{ label: "1993", value: 940 },
			{ label: "1994", value: 1139 },
			{ label: "1995", value: 1235 },
			{ label: "1996", value: 1278 },
			{ label: "1997", value: 1247 },
			{ label: "1998", value: 1175 },
			{ label: "1999", value: 1050 },
			{ label: "2000", value: 975 },
			{ label: "2001", value: 1025 },
			{ label: "2002", value: 985 },
			{ label: "2003", value: 1015 },
			{ label: "2004", value: 995 },
			{ label: "2005", value: 1005 }
		],
		barColor: "#208388",
		gridColor: "#CCCCCC"
	} satisfies PopulationBarChartInput

	const validation = PopulationBarChartPropsSchema.safeParse(input)
	if (!validation.success) {
		logger.error("input validation", { error: validation.error })
		throw errors.wrap(validation.error, "input validation")
	}
	const parsed = validation.data
	const svg = generatePopulationBarChart(parsed)

	// Count x-axis labels (middle-anchored only)
	const xTickLabelMatches = svg.match(/<text[^>]*class="tick-label"[^>]*text-anchor="middle"[^>]*>[^<]+<\/text>/g) ?? []
	// Standardized font sizing and text-aware selection allow slightly tighter packing
	const conservativeMaxLabels = Math.max(1, Math.floor((390 - 100) / 35)) // margin left+right ~100
	const toleranceMaxLabels = conservativeMaxLabels + Math.max(1, Math.ceil(conservativeMaxLabels * 0.2)) // Allow tolerance for clean intervals
	expect(xTickLabelMatches.length).toBeGreaterThan(0)
	expect(xTickLabelMatches.length).toBeLessThanOrEqual(toleranceMaxLabels)

	// Ensure the first label renders and at least one label near the end renders
	expect(svg).toContain(">1990<")
	expect(svg).toMatch(/>(2003|2004|2005)</)
})

test("population bar chart - bird population 2010-2015", () => {
	const input = {
		type: "populationBarChart",
		width: 360,
		height: 300,
		xAxisLabel: "Year",
		yAxis: {
			label: "Number of birds",
			min: 0,
			max: 400,
			tickInterval: 100
		},
		xAxisVisibleLabels: [],
		data: [
			{ label: "2010", value: 350 },
			{ label: "2011", value: 325 },
			{ label: "2012", value: 305 },
			{ label: "2013", value: 250 },
			{ label: "2014", value: 225 },
			{ label: "2015", value: 225 }
		],
		barColor: "#babec2",
		gridColor: "#cccccc"
	} satisfies PopulationBarChartInput

	const validation = PopulationBarChartPropsSchema.safeParse(input)
	if (!validation.success) {
		logger.error("input validation", { error: validation.error })
		throw errors.wrap(validation.error, "input validation")
	}
	const parsed = validation.data
	const svg = generatePopulationBarChart(parsed)
	expect(svg).toMatchSnapshot()
})

test("population bar chart - aftershocks 4 weeks", () => {
	const input = {
		type: "populationBarChart",
		width: 300,
		height: 300,
		xAxisLabel: "Week",
		yAxis: {
			label: "Number of aftershocks",
			min: 0,
			max: 160,
			tickInterval: 10
		},
		xAxisVisibleLabels: [],
		data: [
			{ label: "1", value: 140 },
			{ label: "2", value: 60 },
			{ label: "3", value: 30 },
			{ label: "4", value: 20 }
		],
		barColor: "#ff92c6",
		gridColor: "#cccccc"
	} satisfies PopulationBarChartInput

	const validation = PopulationBarChartPropsSchema.safeParse(input)
	if (!validation.success) {
		logger.error("input validation", { error: validation.error })
		throw errors.wrap(validation.error, "input validation")
	}
	const parsed = validation.data
	const svg = generatePopulationBarChart(parsed)
	expect(svg).toMatchSnapshot()
})
