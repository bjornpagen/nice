import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

function createSegmentSchema() {
	return z.object({ 
		label: z.string().nullable().transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val)).describe("Text displayed inside this segment (e.g., '5', 'x', '2/3', 'Part A', null). Null shows no label. Keep concise to fit. Plaintext only; no markdown or HTML."), 
		length: z.number().positive().describe("Relative length of this segment for proportional sizing (e.g., 5, 3, 2.5, 1). Not pixels - determines segment's proportion of tape.") 
	}).strict()
}

function createTapeSchema() {
	return z.object({ 
		label: z.string().nullable().transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val)).describe("Label for this tape bar displayed on the left (e.g., 'Whole', 'Parts', 'Red Paint (L)', null). Null means no label. Plaintext only; no markdown or HTML."), 
		segments: z.array(createSegmentSchema()).describe("Ordered segments making up this tape. Empty array creates a blank/invisible tape. Segments appear left to right."), 
		color: z
			.string()
			.regex(
				CSS_COLOR_PATTERN,
				"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)"
			)
			.describe("Hex-only fill color for all segments in this tape (e.g., '#4472C4', '#1E90FF', '#00000080' for 50% alpha). Each tape should have distinct color.") 
	}).strict()
}

// The main Zod schema for the tapeDiagram function
export const TapeDiagramPropsSchema = z
	.object({
		type: z.literal('tapeDiagram').describe("Identifies this as a tape diagram (bar model) for visualizing part-whole relationships."),
		width: z.number().positive().describe("Total width of the diagram in pixels (e.g., 600, 700, 500). Must accommodate labels and the longest tape."),
		height: z.number().positive().describe("Total height of the diagram in pixels (e.g., 200, 250, 150). Includes both tapes, labels, and optional bracket."),
		modelType: z.enum(['additive','ratio']).describe("Scaling mode. 'additive': tape lengths represent sums (5+3=8). 'ratio': segments sized by common unit (2:3 ratio with equal segment sizes)."),
		topTape: createTapeSchema().describe("The upper tape bar. Often represents the whole or total quantity in part-whole problems."),
		bottomTape: createTapeSchema().describe("The lower tape bar. Often represents parts or comparative quantity. Use empty segments array to show only one tape."),
		showTotalBracket: z.boolean().describe("Whether to display a bracket above the top tape showing the total. Useful for emphasizing the sum or whole quantity."),
		totalLabel: z.string().nullable().transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val)).describe("Label for the total bracket if shown (e.g., '8', 'Total = 24', 'Whole', null). Null shows bracket without label. Plaintext only; no markdown or HTML."),
	})
	.strict()
	.describe("Creates tape diagrams (bar models) for visualizing mathematical relationships. In 'additive' mode, segment lengths are proportional to their values (for addition/subtraction). In 'ratio' mode, segments represent equal units (for ratios/fractions). Essential for Singapore Math-style problem solving. Bottom tape can be hidden by using empty segments.")

export type TapeDiagramProps = z.infer<typeof TapeDiagramPropsSchema>

/**
 * Generates a "tape diagram" (bar model) to visually represent part-whole relationships,
 * perfect for modeling ratios and simple algebraic equations.
 */
export const generateTapeDiagram: WidgetGenerator<typeof TapeDiagramPropsSchema> = (data) => {
	const { width, height, modelType, topTape, bottomTape, showTotalBracket, totalLabel } = data
	const padding = 20
	const chartWidth = width - 2 * padding
	const tapeHeight = 30
	const tapeGap = 40

	const topTotalLength = topTape.segments.reduce((sum, s) => sum + s.length, 0)
	const bottomTotalLength = bottomTape.segments.reduce((sum, s) => sum + s.length, 0)

	let scale = 0
	let unitWidth = 0

	if (modelType === "ratio") {
		const maxTotalUnits = Math.max(topTotalLength, bottomTotalLength)
		if (maxTotalUnits <= 0) return `<svg width="${width}" height="${height}"></svg>`
		unitWidth = chartWidth / maxTotalUnits
	} else {
		// "additive" model (original logic)
		const maxTotalLength = Math.max(topTotalLength, bottomTotalLength)
		if (maxTotalLength <= 0) return `<svg width="${width}" height="${height}"></svg>`
		scale = chartWidth / maxTotalLength
	}

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	const drawTape = (tape: typeof topTape, yPos: number) => {
		if (tape.label) {
			svg += `<text x="${padding}" y="${yPos - 5}" fill="black" text-anchor="start" font-weight="bold">${tape.label}</text>`
		}
		
		// If no segments, don't render anything for this tape
		if (tape.segments.length === 0) return
		
		let currentX = padding

		for (const s of tape.segments) {
			const segmentWidth = modelType === "ratio" ? s.length * unitWidth : s.length * scale
			svg += `<rect x="${currentX}" y="${yPos}" width="${segmentWidth}" height="${tapeHeight}" fill="${tape.color}" stroke="black"/>`
			if (s.label !== null) {
				svg += `<text x="${currentX + segmentWidth / 2}" y="${yPos + tapeHeight / 2}" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">${s.label}</text>`
			}
			currentX += segmentWidth
		}
	}

	const topY = padding + 20
	drawTape(topTape, topY)

	const bottomY = topY + tapeHeight + tapeGap
	// Only draw bottom tape if it has segments
	if (bottomTape.segments.length > 0) {
		drawTape(bottomTape, bottomY)
	}

	if (showTotalBracket) {
		const hasBottomTape = bottomTape.segments.length > 0
		const bracketY = (hasBottomTape ? bottomY : topY) + tapeHeight + 20
		const totalTapeLength = modelType === "ratio" ? Math.max(topTotalLength, bottomTotalLength) * unitWidth : chartWidth

		svg += `<line x1="${padding}" y1="${bracketY}" x2="${padding + totalTapeLength}" y2="${bracketY}" stroke="black"/>`
		svg += `<line x1="${padding}" y1="${bracketY - 5}" x2="${padding}" y2="${bracketY + 5}" stroke="black"/>`
		svg += `<line x1="${padding + totalTapeLength}" y1="${bracketY - 5}" x2="${padding + totalTapeLength}" y2="${bracketY + 5}" stroke="black"/>`
		if (totalLabel !== null) {
			svg += `<text x="${padding + totalTapeLength / 2}" y="${bracketY + 15}" fill="black" text-anchor="middle" font-weight="bold">${totalLabel}</text>`
		}
	}

	svg += "</svg>"
	return svg
}
