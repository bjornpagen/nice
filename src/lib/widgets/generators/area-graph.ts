import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

const PointSchema = z.object({
	x: z.number().describe("The x-coordinate (horizontal value) of the data point."),
	y: z.number().describe("The y-coordinate (vertical value) of the data point.")
})

export const AreaGraphPropsSchema = z
	.object({
		type: z.literal("areaGraph"),
		width: z.number().positive().describe("Total width of the SVG in pixels (e.g., 600, 500)."),
		height: z.number().positive().describe("Total height of the SVG in pixels (e.g., 400, 350)."),
		title: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe("The main title displayed above the graph. null for no title."),
		xAxis: z
			.object({
				label: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe("The label for the horizontal axis (e.g., 'Year')."),
				min: z.number().describe("The minimum value for the x-axis scale."),
				max: z.number().describe("The maximum value for the x-axis scale."),
				tickValues: z
					.array(z.number())
					.describe("An array of specific numerical values to be marked as ticks on the x-axis.")
			})
			.strict(),
		yAxis: z
			.object({
				label: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe("The label for the vertical axis (e.g., 'Percent of total')."),
				min: z.number().describe("The minimum value for the y-axis scale."),
				max: z.number().describe("The maximum value for the y-axis scale."),
				tickInterval: z.number().positive().describe("The numeric interval between labeled tick marks on the y-axis."),
				tickFormat: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
					.describe("A suffix to add to y-axis tick labels (e.g., '%'). Null for no suffix."),
				showGridLines: z.boolean().describe("If true, displays horizontal grid lines for the y-axis.")
			})
			.strict(),
		dataPoints: z
			.array(PointSchema)
			.min(2)
			.describe("An array of {x, y} points defining the boundary line between the two areas."),
		bottomArea: z
			.object({
				label: z.string().describe("Text label to display within the bottom area."),
				color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The fill color for the bottom area.")
			})
			.strict(),
		topArea: z
			.object({
				label: z.string().describe("Text label to display within the top area."),
				color: z.string().regex(CSS_COLOR_PATTERN, "invalid css color").describe("The fill color for the top area.")
			})
			.strict(),
		boundaryLine: z
			.object({
				color: z
					.string()
					.regex(CSS_COLOR_PATTERN, "invalid css color")
					.describe("The color of the line separating the areas."),
				strokeWidth: z.number().positive().describe("The thickness of the line separating the areas.")
			})
			.strict()
	})
	.strict()
	.describe(
		"Creates a stacked area graph to show how a total is divided into two categories over time or another continuous variable. Ideal for showing percentage breakdowns."
	)

export type AreaGraphProps = z.infer<typeof AreaGraphPropsSchema>

/**
 * Renders a text element with automatic wrapping for certain patterns.
 * @param text The string to render.
 * @param x The x-coordinate for the text block.
 * @param y The y-coordinate for the text block.
 * @param className The CSS class to apply to the text element.
 * @param lineHeight The line height (e.g., '1.2em').
 * @returns An SVG <text> element string with <tspan> children for wrapped lines.
 */
const renderWrappedText = (text: string, x: number, y: number, className: string, lineHeight = "1.2em"): string => {
	let lines: string[] = []

	// For titles ending with any parenthetical, split before the parenthesis but only for sufficiently long titles
	const titlePattern = /^(.+)\s+(\(.+\))$/
	const titleMatch = text.match(titlePattern)
	if (titleMatch?.[1] && titleMatch[2]) {
		const base = titleMatch[1].trim()
		const suffix = titleMatch[2].trim()
		const shouldSplitConservatively = text.length > 36
		lines = shouldSplitConservatively ? [base, suffix] : [text]
	} else {
		// For area labels, split multi-word labels
		const words = text.split(" ")
		if (words.length === 2 && words.join(" ").length > 10) {
			// Split two-word labels like "Fossil fuels"
			lines = words
		} else {
			// Single line for short text
			lines = [text]
		}
	}

	let tspans = ""
	lines.forEach((line, index) => {
		const dy = index === 0 ? "0" : lineHeight
		tspans += `<tspan x="${x}" dy="${dy}">${line}</tspan>`
	})
	return `<text x="${x}" y="${y}" class="${className}">${tspans}</text>`
}

export const generateAreaGraph: WidgetGenerator<typeof AreaGraphPropsSchema> = (props) => {
	const { width, height, title, xAxis, yAxis, dataPoints, bottomArea, topArea, boundaryLine } = props

	const margin = { top: 60, right: 20, bottom: 60, left: 80 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom

	if (chartHeight <= 0 || chartWidth <= 0) {
		return `<svg width="${width}" height="${height}"></svg>`
	}

	const toSvgX = (val: number) => margin.left + ((val - xAxis.min) / (xAxis.max - xAxis.min)) * chartWidth
	const toSvgY = (val: number) => height - margin.bottom - ((val - yAxis.min) / (yAxis.max - yAxis.min)) * chartHeight

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`
	svg +=
		"<style>.axis-label { font-size: 16px; text-anchor: middle; } .title { font-size: 18px; font-weight: bold; text-anchor: middle; } .area-label { font-size: 16px; font-weight: bold; text-anchor: middle; }</style>"

	if (title) {
		svg += renderWrappedText(title, width / 2, margin.top / 2 - 10, "title", "1.1em")
	}

	// Axes and Labels
	svg += `<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="black" stroke-width="2"/>` // Y-axis
	svg += `<line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="black" stroke-width="2"/>` // X-axis

	if (xAxis.label)
		svg += `<text x="${margin.left + chartWidth / 2}" y="${height - margin.bottom + 45}" class="axis-label">${xAxis.label}</text>`
	if (yAxis.label)
		svg += `<text x="${margin.left - 55}" y="${margin.top + chartHeight / 2}" class="axis-label" transform="rotate(-90, ${margin.left - 55}, ${margin.top + chartHeight / 2})">${yAxis.label}</text>`

	// Ticks
	for (const val of xAxis.tickValues) {
		const x = toSvgX(val)
		svg += `<line x1="${x}" y1="${height - margin.bottom}" x2="${x}" y2="${height - margin.bottom + 5}" stroke="black" stroke-width="2"/>`
		svg += `<text x="${x}" y="${height - margin.bottom + 20}" text-anchor="middle">${val}</text>`
	}
	for (let t = yAxis.min; t <= yAxis.max; t += yAxis.tickInterval) {
		const y = toSvgY(t)
		svg += `<line x1="${margin.left - 5}" y1="${y}" x2="${margin.left}" y2="${y}" stroke="black" stroke-width="2"/>`
		svg += `<text x="${margin.left - 10}" y="${y + 5}" text-anchor="end">${t}${yAxis.tickFormat || ""}</text>`
		if (yAxis.showGridLines && t > yAxis.min) {
			svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#e0e0e0"/>`
		}
	}

	// Area Paths
	const pointsStr = dataPoints.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")
	const bottomPath = `M${toSvgX(dataPoints[0]?.x ?? xAxis.min)},${toSvgY(yAxis.min)} ${pointsStr} L${toSvgX(dataPoints[dataPoints.length - 1]?.x ?? xAxis.max)},${toSvgY(yAxis.min)} Z`
	const topPath = `M${toSvgX(dataPoints[0]?.x ?? xAxis.min)},${toSvgY(yAxis.max)} ${pointsStr} L${toSvgX(dataPoints[dataPoints.length - 1]?.x ?? xAxis.max)},${toSvgY(yAxis.max)} Z`

	svg += `<path d="${bottomPath}" fill="${bottomArea.color}" stroke="none"/>`
	svg += `<path d="${topPath}" fill="${topArea.color}" stroke="none"/>`
	svg += `<polyline points="${pointsStr}" fill="none" stroke="${boundaryLine.color}" stroke-width="${boundaryLine.strokeWidth}"/>`

	// Area Labels
	svg += renderWrappedText(bottomArea.label, toSvgX(1975), toSvgY(40), "area-label")
	svg += renderWrappedText(topArea.label, toSvgX(1850), toSvgY(70), "area-label")

	svg += "</svg>"
	return svg
}
