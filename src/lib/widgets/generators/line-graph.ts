import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { AXIS_VIEWBOX_PADDING } from "@/lib/widgets/utils/constants"
import { abbreviateMonth } from "@/lib/widgets/utils/labels"
import { computeDynamicWidth, includePointX, includeText, wrapInClippedGroup } from "@/lib/widgets/utils/layout"
import { theme } from "@/lib/widgets/utils/theme"
import { generateCoordinatePlaneBaseV2 } from "@/lib/widgets/generators/coordinate-plane-base"

export const ErrMismatchedDataLength = errors.new("series data must have the same length as x-axis categories")

// Factory helpers to avoid schema reuse and $ref generation
function createSeriesSchema() {
	return z
		.object({
			name: z
				.string()
				.describe("The name of this data series, which will appear in the legend (e.g., 'Bullhead City', 'Sedona')."),
			values: z
				.array(z.number())
				.describe(
					"An array of numerical values for this series. The order must correspond to the `xAxis.categories` array."
				),
			color: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex format only (#RGB, #RRGGBB, or #RRGGBBAA)")
				.describe(
					"The color for the line and points of this series in hex format only (e.g., '#000', '#3377dd', '#ff000080')."
				),
			style: z
				.enum(["solid", "dashed", "dotted"])
				.describe(
					"The visual style of the line. 'solid' is a continuous line, 'dashed' and 'dotted' are broken lines."
				),
			pointShape: z.enum(["circle", "square"]).describe("The shape of the marker for each data point."),
			yAxis: z.enum(["left", "right"]).describe("Specifies which Y-axis this series should be plotted against.")
		})
		.strict()
}

function createYAxisSchema() {
	return z
		.object({
			label: z.string().describe("The label for the vertical axis (e.g., 'Average temperature (°C)')."),
			min: z.number().describe("The minimum value for the y-axis scale."),
			max: z.number().describe("The maximum value for the y-axis scale."),
			tickInterval: z.number().positive().describe("The numeric interval between labeled tick marks on the y-axis."),
			showGridLines: z.boolean().describe("If true, displays horizontal grid lines for the y-axis.")
		})
		.strict()
}

export const LineGraphPropsSchema = z
	.object({
		type: z.literal("lineGraph"),
		width: z.number().positive().describe("Total width of the SVG in pixels (e.g., 500, 600)."),
		height: z.number().positive().describe("Total height of the SVG in pixels (e.g., 400, 350)."),
		title: z.string().describe("The main title displayed above the graph."),
		xAxis: z
			.object({
				label: z.string().describe("The label for the horizontal axis (e.g., 'Month')."),
				categories: z
					.array(z.string().min(1, "tick label cannot be empty"))
					.describe(
						"Complete array of tick labels for ALL x-axis positions. Each position must have a meaningful label (e.g., ['January', 'February', 'March', 'April']). Array length must match data series length."
					)
			})
			.strict(),
		yAxis: createYAxisSchema(),
		yAxisRight: z
			.union([createYAxisSchema(), z.null()])
			.describe("Configuration for an optional second Y-axis on the right side. Null for a single-axis graph."),
		series: z.array(createSeriesSchema()).describe("An array of data series to plot on the graph."),
		showLegend: z.boolean().describe("If true, a legend is displayed to identify each data series.")
	})
	.strict()
	.describe(
		"Creates a multi-series line graph for comparing trends across categorical data. Supports multiple lines with distinct styles, data point markers, an optional second Y-axis, and a legend."
	)

export type LineGraphProps = z.infer<typeof LineGraphPropsSchema>

export const generateLineGraph: WidgetGenerator<typeof LineGraphPropsSchema> = (props) => {
	const { width, height, title, xAxis, yAxis, yAxisRight, series, showLegend } = props

	for (const s of series) {
		if (s.values.length !== xAxis.categories.length) {
			logger.error("mismatched data length in line graph", {
				seriesName: s.name,
				valuesCount: s.values.length,
				categoriesCount: xAxis.categories.length
			})
			throw errors.wrap(
				ErrMismatchedDataLength,
				`Series "${s.name}" has ${s.values.length} values, but xAxis has ${xAxis.categories.length} categories.`
			)
		}
	}

	// Use V2 base for left axis only (dual Y-axis not supported in V2 yet)
	const base = generateCoordinatePlaneBaseV2(
		width,
		height,
		title,
		{
			label: xAxis.label,
			categories: xAxis.categories.map(cat => abbreviateMonth(cat)),
			showGridLines: false,
			showTickLabels: true,
			tickInterval: 1,
			min: 0,
			max: xAxis.categories.length
		},
		{
			label: yAxis.label,
			min: yAxis.min,
			max: yAxis.max,
			tickInterval: yAxis.tickInterval,
			showGridLines: yAxis.showGridLines,
			showTickLabels: true
		}
	)

	// Handle right Y-axis manually if present
	let rightAxisContent = ""
	let toSvgYRight = (_val: number) => 0
	if (yAxisRight) {
		const rightAxisX = base.chartArea.left + base.chartArea.width
		toSvgYRight = (val: number) => {
			const frac = (val - yAxisRight.min) / (yAxisRight.max - yAxisRight.min)
			return base.chartArea.top + base.chartArea.height - frac * base.chartArea.height
		}
		
		rightAxisContent += `<line x1="${rightAxisX}" y1="${base.chartArea.top}" x2="${rightAxisX}" y2="${base.chartArea.top + base.chartArea.height}" stroke="${theme.colors.axis}" stroke-width="1.5"/>`
		
		for (let t = yAxisRight.min; t <= yAxisRight.max; t += yAxisRight.tickInterval) {
			const y = toSvgYRight(t)
			rightAxisContent += `<line x1="${rightAxisX}" y1="${y}" x2="${rightAxisX + 5}" y2="${y}" stroke="${theme.colors.axis}" stroke-width="1.5"/>`
			rightAxisContent += `<text x="${rightAxisX + 10}" y="${y + 4}" text-anchor="start" font-size="12px">${t}</text>`
			includeText(base.ext, rightAxisX + 10, String(t), "start", 7)
		}
		
		const yCenter = base.chartArea.top + base.chartArea.height / 2
		const labelX = rightAxisX + 30
		rightAxisContent += `<text x="${labelX}" y="${yCenter}" text-anchor="middle" font-size="16px" transform="rotate(-90, ${labelX}, ${yCenter})">${abbreviateMonth(yAxisRight.label)}</text>`
		includeText(base.ext, labelX, abbreviateMonth(yAxisRight.label), "middle", 7)
	}

	// X-axis scaling for categorical data
	const stepX = base.chartArea.width / Math.max(1, xAxis.categories.length - 1)
	const toSvgX = (index: number) => base.chartArea.left + index * stepX

	// Separate clipped polylines from unclipped markers
	let clippedContent = ""
	let unclippedContent = ""
	
	for (const s of series) {
		const toSvgY = s.yAxis === "right" ? toSvgYRight : base.toSvgY
		const pointsStr = s.values.map((v, i) => `${toSvgX(i)},${toSvgY(v)}`).join(" ")

		s.values.forEach((_, i) => {
			includePointX(base.ext, toSvgX(i))
		})

		// Polyline goes in clipped content
		let dasharray = ""
		if (s.style === "dashed") dasharray = 'stroke-dasharray="8 4"'
		if (s.style === "dotted") dasharray = 'stroke-dasharray="2 6"'
		clippedContent += `<polyline points="${pointsStr}" fill="none" stroke="${s.color}" stroke-width="${theme.stroke.width.xthick}" ${dasharray}/>`

		// Data point markers go in unclipped content to prevent being cut off at boundaries
		for (const [i, v] of s.values.entries()) {
			const cx = toSvgX(i)
			const cy = toSvgY(v)
			if (s.pointShape === "circle") {
				unclippedContent += `<circle cx="${cx}" cy="${cy}" r="${theme.geometry.pointRadius.base}" fill="${s.color}"/>`
			} else if (s.pointShape === "square") {
				unclippedContent += `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8" fill="${s.color}"/>`
			}
		}
	}

	// Legend content
	let legendContent = ""
	if (showLegend) {
		const legendItemHeight = 18
		const legendLineLength = 30
		const legendGapX = 8
		const estimateTextWidth = (text: string) => text.length * 7
		const maxTextWidth = Math.max(...series.map((s) => estimateTextWidth(s.name)))
		const legendBoxWidth = legendLineLength + 12 + legendGapX + maxTextWidth

		let legendStartX = (width - legendBoxWidth) / 2
		if (legendStartX < 10) legendStartX = 10

		const legendStartY = base.chartArea.top + base.chartArea.height + 50

		series.forEach((s, idx) => {
			const y = legendStartY + idx * legendItemHeight
			const x1 = legendStartX
			const x2 = legendStartX + legendLineLength
			const markerCx = x1 + legendLineLength / 2
			const textX = x2 + legendGapX + 12

			let dash = ""
			if (s.style === "dashed") dash = ' stroke-dasharray="8 4"'
			if (s.style === "dotted") dash = ' stroke-dasharray="2 6"'
			legendContent += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${s.color}" stroke-width="${theme.stroke.width.xthick}"${dash}/>`
			if (s.pointShape === "circle") {
				legendContent += `<circle cx="${markerCx}" cy="${y}" r="${theme.geometry.pointRadius.base}" fill="${s.color}"/>`
			} else if (s.pointShape === "square") {
				legendContent += `<rect x="${markerCx - 4}" y="${y - 4}" width="8" height="8" fill="${s.color}"/>`
			}
			legendContent += `<text x="${textX}" y="${y + 4}">${s.name}</text>`
			includeText(base.ext, textX, s.name, "start", 7)
		})
	}

	let svgBody = base.svgBody
	svgBody += rightAxisContent
	svgBody += wrapInClippedGroup(base.clipId, clippedContent)
	svgBody += unclippedContent // Add unclipped markers
	svgBody += legendContent

	const totalHeight = base.chartArea.top + base.chartArea.height + base.outsideBottomPx
	const { vbMinX, dynamicWidth } = computeDynamicWidth(base.ext, totalHeight, AXIS_VIEWBOX_PADDING)
	const finalSvg = `<svg width="${dynamicWidth}" height="${totalHeight}" viewBox="${vbMinX} 0 ${dynamicWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">` +
		svgBody +
		`</svg>`
	return finalSvg
}
