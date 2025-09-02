import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { DivergentBarChartPropsSchema, generateDivergentBarChart } from "@/lib/widgets/generators"
import { LABEL_AVG_CHAR_WIDTH_PX } from "@/lib/widgets/utils/constants"

function normalizeClipIds(svg: string): string {
	return svg.replace(/clip-\d+/g, "clip-#")
}

type DivergentBarChartInput = z.input<typeof DivergentBarChartPropsSchema>

test("divergent bar chart - sea level change by century", () => {
	const input = {
		type: "divergentBarChart",
		width: 760,
		height: 460,
		xAxisLabel: "Century",
		yAxis: {
			label: "Change in sea level (cm)",
			min: -6,
			max: 14,
			tickInterval: 2
		},
		// Complete century data with meaningful labels for all positions
		data: [
			{ category: "1st", value: 1.8 },
			{ category: "2nd", value: 2.6 },
			{ category: "3rd", value: -0.2 },
			{ category: "4th", value: 2.6 },
			{ category: "5th", value: -3.7 },
			{ category: "6th", value: 1.3 },
			{ category: "7th", value: 2.9 },
			{ category: "8th", value: -5.9 },
			{ category: "9th", value: 0.1 },
			{ category: "10th", value: 3.0 },
			{ category: "11th", value: -6.0 },
			{ category: "12th", value: -1.7 },
			{ category: "13th", value: -0.3 },
			{ category: "14th", value: -0.9 },
			{ category: "15th", value: 3.7 },
			{ category: "16th", value: 2.2 },
			{ category: "17th", value: -3.5 },
			{ category: "18th", value: -2.1 },
			{ category: "19th", value: -0.2 },
			{ category: "20th", value: 13.8 }
		],
		positiveBarColor: "#00CFCB",
		negativeBarColor: "#0B6A6A",
		gridColor: "#CCCCCC"
	} satisfies DivergentBarChartInput

	const parseResult = errors.trySync(() => DivergentBarChartPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generateDivergentBarChart(parsed)
	expect(normalizeClipIds(svg)).toMatchSnapshot()
})

test("divergent bar chart - auto label thinning prevents overcrowding deterministically", () => {
	const input = {
		type: "divergentBarChart",
		width: 374,
		height: 300,
		xAxisLabel: "Century",
		yAxis: {
			label: "Change in sea level (cm)",
			min: -6,
			max: 14,
			tickInterval: 2
		},
		data: [
			{ value: 1.5, category: "1st" },
			{ value: 2.5, category: "2nd" },
			{ value: -0.2, category: "3rd" },
			{ value: 2.5, category: "4th" },
			{ value: -3.5, category: "5th" },
			{ value: 1, category: "6th" },
			{ value: 3, category: "7th" },
			{ value: -4, category: "8th" },
			{ value: 0.2, category: "9th" },
			{ value: 3, category: "10th" },
			{ value: -6, category: "11th" },
			{ value: -1.5, category: "12th" },
			{ value: -0.5, category: "13th" },
			{ value: -1, category: "14th" },
			{ value: 3.5, category: "15th" },
			{ value: 2, category: "16th" },
			{ value: -3.5, category: "17th" },
			{ value: -2, category: "18th" },
			{ value: -0.2, category: "19th" },
			{ value: 14, category: "20th" }
		],
		positiveBarColor: "#01d1c1",
		negativeBarColor: "#208170",
		gridColor: "#0000004D"
	} satisfies DivergentBarChartInput

	const parseResult = errors.trySync(() => DivergentBarChartPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generateDivergentBarChart(parsed)

	// Count how many x-axis tick labels were rendered (middle-anchored only)
	const xTickLabelMatches = svg.match(/<text[^>]*text-anchor="middle"[^>]*dominant-baseline="hanging"[^>]*>[^<]+<\/text>/g) ?? []
	const labels = xTickLabelMatches.map((m) => {
		const match = m.match(/>([^<]+)</)
		return match?.[1] ?? ""
	})
	const maxLabelLen = labels.reduce((acc, t) => Math.max(acc, t.length), 0)
	const chartWidthPx = input.width
	const paddingPx = 10
	const expectedMaxLabels = Math.max(1, Math.floor(chartWidthPx / (maxLabelLen * LABEL_AVG_CHAR_WIDTH_PX + paddingPx)))
	expect(xTickLabelMatches.length).toBeGreaterThan(0)
	expect(xTickLabelMatches.length).toBeLessThanOrEqual(expectedMaxLabels + 1)

	// Ensure first category present for determinism
	expect(svg).toContain(">1st<")
})

test("divergent bar chart - sea level by century (QA payload)", () => {
	const input = {
		type: "divergentBarChart",
		width: 374,
		height: 300,
		xAxisLabel: "Century",
		yAxis: {
			label: "Change in sea level (cm)",
			min: -6,
			max: 14,
			tickInterval: 2
		},
		data: [
			{ value: 1.5, category: "1st" },
			{ value: 2.5, category: "2nd" },
			{ value: -0.2, category: "3rd" },
			{ value: 2.5, category: "4th" },
			{ value: -3.5, category: "5th" },
			{ value: 1, category: "6th" },
			{ value: 3, category: "7th" },
			{ value: -4, category: "8th" },
			{ value: 0.2, category: "9th" },
			{ value: 3, category: "10th" },
			{ value: -6, category: "11th" },
			{ value: -1.5, category: "12th" },
			{ value: -0.5, category: "13th" },
			{ value: -1, category: "14th" },
			{ value: 3.5, category: "15th" },
			{ value: 2, category: "16th" },
			{ value: -3.5, category: "17th" },
			{ value: -2, category: "18th" },
			{ value: -0.2, category: "19th" },
			{ value: 14, category: "20th" }
		],
		positiveBarColor: "#01d1c1",
		negativeBarColor: "#208170",
		gridColor: "#999999"
	} satisfies DivergentBarChartInput

	const parseResult = errors.trySync(() => DivergentBarChartPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data
	const svg = generateDivergentBarChart(parsed)
	expect(normalizeClipIds(svg)).toMatchSnapshot()
})
