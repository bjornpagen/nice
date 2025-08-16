import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { renderWrappedText } from "@/lib/widgets/utils/text"

// Defines a single slice within a pie chart.
const SliceSchema = z
	.object({
		label: z.string().describe("The descriptive name for this slice (e.g., 'Category A', 'Habitable Land')."),
		value: z
			.number()
			.positive()
			.describe(
				"The numerical value of this slice. The chart will automatically calculate its percentage of the total."
			),
		color: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe("The hex-only fill color for the slice (e.g., '#4472C4', '#1E90FF', '#FF000080' for 50% alpha).")
	})
	.strict()

// Defines the data and title for a single pie chart.
const PieChartDataSchema = z
	.object({
		title: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe("The title displayed above this specific pie chart. Null for no title."),
		slices: z.array(SliceSchema).min(1).describe("An array of slice objects that make up this pie chart.")
	})
	.strict()

// The main Zod schema for the pieChart widget.
export const PieChartWidgetPropsSchema = z
	.object({
		type: z
			.literal("pieChart")
			.describe("Identifies this as a pie chart widget for showing part-to-whole relationships."),
		width: z
			.number()
			.positive()
			.describe("Total nominal width of the chart area in pixels. The SVG may expand horizontally to fit labels."),
		height: z
			.number()
			.positive()
			.describe("Total height of the SVG container in pixels. This height will be divided among the stacked charts."),
		charts: z
			.array(PieChartDataSchema)
			.min(1)
			.describe("An array of pie chart definitions to render. Multiple charts are stacked vertically."),
		layout: z.literal("vertical").describe("Pie charts stack vertically only. Horizontal layout is not supported."),
		spacing: z.number().min(0).describe("The gap in pixels between stacked charts.")
	})
	.strict()
	.describe(
		"Creates one or more pie charts to show proportional data. Each chart consists of slices representing parts of a whole, with automatically calculated percentages. Charts stack vertically; labels expand the SVG width as needed."
	)

export type PieChartWidgetProps = z.infer<typeof PieChartWidgetPropsSchema>

/**
 * Generates one or more SVG pie charts from a declarative JSON structure.
 */
export const generatePieChart: WidgetGenerator<typeof PieChartWidgetPropsSchema> = (props) => {
	const { width, height, charts, spacing } = props
	const numCharts = charts.length

	// We will ignore provided width when needed and expand to accommodate labels.
	let content = ""
	const styleTag =
		"<style>.title { font-size: 1.1em; font-weight: bold; text-anchor: middle; } .label-text { font-size: 0.9em; } .leader { stroke: black; fill: none; }</style>"

	// Vertical layout only
	const chartAreaWidth = width
	const chartAreaHeight = (height - (numCharts - 1) * spacing) / numCharts

	// Track global extents of drawn content to expand viewBox/width as needed
	let minX = 0
	let maxX = width
	const avgCharWidth = 7 // rough monospace-ish estimate at 14px font
	const padding = 10

	for (let index = 0; index < charts.length; index++) {
		const chart = charts[index]
		// Guard for environments with noUncheckedIndexedAccess enabled
		if (!chart) continue
		const xOffset = 0
		const yOffset = index * (chartAreaHeight + spacing)

		const cx = xOffset + chartAreaWidth / 2
		const cy = yOffset + chartAreaHeight / 2
		const titleY = yOffset + 25
		// Slightly smaller radius to leave more room for external labels
		const radius = Math.min(chartAreaWidth, chartAreaHeight) * 0.33

		// Draw title (width-aware wrapping)
		if (chart.title) {
			const maxTextWidth = chartAreaWidth - 40
			content += renderWrappedText(chart.title, cx, titleY, "title", "1.1em", maxTextWidth, 8)
		}

		const totalValue = chart.slices.reduce((sum, slice) => sum + slice.value, 0)
		let startAngle = -90 // Start from the top

		// Collect label geometry first for collision avoidance
		type LabelInfo = {
			text: string
			percentage: number
			midAngle: number
			midRad: number
			preferredY: number
			side: "left" | "right"
			startX: number
			startY: number
		}
		const labelsRight: LabelInfo[] = []
		const labelsLeft: LabelInfo[] = []

		for (const slice of chart.slices) {
			const percentage = (slice.value / totalValue) * 100
			const sliceAngle = (slice.value / totalValue) * 360
			const endAngle = startAngle + sliceAngle

			const startRad = (startAngle * Math.PI) / 180
			const endRad = (endAngle * Math.PI) / 180

			const x1 = cx + radius * Math.cos(startRad)
			const y1 = cy + radius * Math.sin(startRad)
			const x2 = cx + radius * Math.cos(endRad)
			const y2 = cy + radius * Math.sin(endRad)

			const largeArcFlag = sliceAngle > 180 ? 1 : 0

			// Draw the slice
			const pathData = `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag} 1 ${x2},${y2} Z`
			content += `<path d="${pathData}" fill="${slice.color}" stroke="black" stroke-width="1"/>`

			// Prepare label info
			const midAngle = startAngle + sliceAngle / 2
			const midRad = (midAngle * Math.PI) / 180
			const side: "left" | "right" = midAngle > -90 && midAngle < 90 ? "right" : "left"
			const outerRadForStart = radius * 0.98
			const startX = cx + outerRadForStart * Math.cos(midRad)
			const startY = cy + outerRadForStart * Math.sin(midRad)
			const preferredY = cy + radius * 1.15 * Math.sin(midRad)

			const info: LabelInfo = {
				text: `${slice.label} ${Math.round(percentage)}%`,
				percentage,
				midAngle,
				midRad,
				preferredY,
				side,
				startX,
				startY
			}
			if (side === "right") labelsRight.push(info)
			else labelsLeft.push(info)

			startAngle = endAngle
		}

		// Anti-collision placement for each side
		const topBound = yOffset + 40
		const bottomBound = yOffset + chartAreaHeight - 10
		const minGap = 16
		const resolveCollisions = (items: LabelInfo[]): Array<LabelInfo & { finalY: number }> => {
			const sorted = [...items].sort((a, b) => a.preferredY - b.preferredY)
			const out: Array<LabelInfo & { finalY: number }> = []
			for (let i = 0; i < sorted.length; i++) {
				const prev = out[i - 1]
				const current = sorted[i]
				if (!current) continue
				let y = Math.max(topBound, Math.min(current.preferredY, bottomBound))
				if (prev) y = Math.max(y, prev.finalY + minGap)
				out.push({ ...current, finalY: y })
			}
			// If the last element exceeds bounds, shift upwards as needed
			const last = out[out.length - 1]
			if (last && last.finalY > bottomBound) {
				let shift = last.finalY - bottomBound
				for (let i = out.length - 1; i >= 0 && shift > 0; i--) {
					const prevEntry = i > 0 ? out[i - 1] : undefined
					const prevY = prevEntry ? prevEntry.finalY + minGap : topBound
					const current = out[i]
					if (!current) continue
					const newY = Math.max(prevY, current.finalY - shift)
					shift -= current.finalY - newY
					current.finalY = newY
				}
			}
			return out
		}

		const placedRight = resolveCollisions(labelsRight)
		const placedLeft = resolveCollisions(labelsLeft)

		// Render leaders and labels (two-segment elbow: outward radial then horizontal)
		const labelColumnOffset = radius * 1.4
		const textPad = 5
		const rightX = cx + labelColumnOffset
		const leftX = cx - labelColumnOffset

		const drawLabel = (item: LabelInfo & { finalY: number }): void => {
			const elbowX = cx + Math.cos(item.midRad) * radius * 1.05
			const elbowY = cy + Math.sin(item.midRad) * radius * 1.05
			const endX = item.side === "right" ? rightX : leftX
			const endY = item.finalY
			const textAnchor = item.side === "right" ? "start" : "end"
			const textX = endX + (item.side === "right" ? textPad : -textPad)
			const textY = endY + 4
			// Leader polyline: start at arc edge -> elbow -> horizontal endpoint
			content += `<polyline class="leader" points="${item.startX},${item.startY} ${elbowX},${elbowY} ${endX},${endY}" />`
			content += `<text x="${textX}" y="${textY}" text-anchor="${textAnchor}" class="label-text">${item.text}</text>`

			// Update global x extents using rough text width estimate
			const approxTextWidth = item.text.length * avgCharWidth
			if (textAnchor === "start") {
				minX = Math.min(minX, textX)
				maxX = Math.max(maxX, textX + approxTextWidth)
			} else {
				minX = Math.min(minX, textX - approxTextWidth)
				maxX = Math.max(maxX, textX)
			}
		}

		for (const item of placedRight) drawLabel(item)
		for (const item of placedLeft) drawLabel(item)
	}

	// Compute dynamic width and viewBox to include any overflow regions; ignore provided width if needed
	const vbMinX = Math.min(0, Math.floor(minX - padding))
	const vbMaxX = Math.max(width, Math.ceil(maxX + padding))
	const dynamicWidth = vbMaxX - vbMinX

	const svg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">${styleTag}${content}</svg>`
	return svg
}
