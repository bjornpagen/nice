import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a line segment, such as a radius or a diameter.
const SegmentSchema = z
	.object({
		type: z.enum(["radius", "diameter"]).describe("The type of line segment to draw."),
		label: z.string().nullable().describe("An optional text label for the segment."),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "#4A4A4A")
			.describe("The color of the line segment."),
		angle: z
			.number()
			.nullable()
			.transform((val) => val ?? 0)
			.describe("The angle of the segment in degrees (0 is horizontal to the right).")
	})
	.strict()

// Defines a sector (a pie slice) of the circle.
const SectorSchema = z
	.object({
		startAngle: z.number().describe("The starting angle of the sector in degrees."),
		endAngle: z.number().describe("The ending angle of the sector in degrees."),
		fillColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "rgba(100, 181, 246, 0.5)")
			.describe("The fill color for the sector."),
		label: z.string().nullable().describe("An optional label for the sector."),
		showRightAngleMarker: z.boolean().describe("If true and the sector is 90 degrees, shows a right angle marker.")
	})
	.strict()

// Defines an arc (a portion of the circle's circumference).
const ArcSchema = z
	.object({
		startAngle: z.number().describe("The starting angle of the arc in degrees."),
		endAngle: z.number().describe("The ending angle of the arc in degrees."),
		strokeColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "#D32F2F")
			.describe("The color of the arc."),
		label: z.string().nullable().describe("An optional label for the arc.")
	})
	.strict()

// The main Zod schema for the circleDiagram function
export const CircleDiagramPropsSchema = z
	.object({
		type: z.literal("circleDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 250)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 250)
			.describe("The total height of the output SVG container in pixels."),
		// Base Circle Properties
		radius: z.number().positive().describe("The radius of the main (outer) circle."),
		fillColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "none")
			.describe("The fill color of the main circle."),
		strokeColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "black")
			.describe("The stroke color of the main circle's circumference."),
		// Concentric Circle Properties
		innerRadius: z
			.number()
			.positive()
			.nullable()
			.describe("If provided, draws a concentric inner circle, creating an annulus."),
		annulusFillColor: z
			.string()
			.nullable()
			.describe("If provided with an innerRadius, shades the region between the two circles."),
		// Elements to draw on the diagram
		segments: z.array(SegmentSchema).nullable().describe("An array of radius or diameter lines to draw."),
		sectors: z.array(SectorSchema).nullable().describe("An array of sectors (pie slices) to draw."),
		arcs: z.array(ArcSchema).nullable().describe("An array of arcs to highlight on the circumference."),
		showCenterDot: z.boolean().describe("If true, a dot is drawn at the circle's center."),
		areaLabel: z.string().nullable().describe("A text label to place in the center of the circle, often for area.")
	})
	.strict()
	.describe(
		"Generates a versatile SVG diagram of a circle and its components. It is ideal for geometry problems involving radius, diameter, arcs, sectors, area, and concentric circles (annulus)."
	)

export type CircleDiagramProps = z.infer<typeof CircleDiagramPropsSchema>

/**
 * Generates an SVG diagram of a circle and its components.
 */
export const generateCircleDiagram: WidgetGenerator<typeof CircleDiagramPropsSchema> = (props) => {
	const {
		width,
		height,
		radius,
		fillColor,
		strokeColor,
		innerRadius,
		annulusFillColor,
		segments,
		sectors,
		arcs,
		showCenterDot,
		areaLabel
	} = props

	const cx = width / 2
	const cy = height / 2
	const mainRadius = Math.min(cx, cy) - 10
	const scale = mainRadius / radius

	const toRad = (deg: number) => (deg * Math.PI) / 180
	const pointOnCircle = (angleDeg: number, r: number) => ({
		x: cx + r * Math.cos(toRad(angleDeg)),
		y: cy + r * Math.sin(toRad(angleDeg))
	})
	const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))
	const PADDING = 15

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	if (innerRadius && annulusFillColor) {
		const r1 = radius * scale
		const r2 = innerRadius * scale
		svg += `<path d="M ${cx - r1},${cy} a ${r1},${r1} 0 1,0 ${2 * r1},0 a ${r1},${r1} 0 1,0 -${2 * r1},0 M ${cx - r2},${cy} a ${r2},${r2} 0 1,0 ${2 * r2},0 a ${r2},${r2} 0 1,0 -${2 * r2},0" fill="${annulusFillColor}" fill-rule="evenodd" />`
	}

	if (sectors) {
		for (const sector of sectors) {
			const r = radius * scale
			const start = pointOnCircle(sector.startAngle, r)
			const end = pointOnCircle(sector.endAngle, r)
			const angleDiff = Math.abs(sector.endAngle - sector.startAngle)
			const largeArcFlag = angleDiff > 180 ? 1 : 0
			const pathData = `M ${cx},${cy} L ${start.x},${start.y} A ${r},${r} 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`
			svg += `<path d="${pathData}" fill="${sector.fillColor}" stroke="none"/>`

			if (sector.showRightAngleMarker && Math.abs(angleDiff - 90) < 0.1) {
				const markerSize = Math.min(r, 20) * 0.8
				const p1 = pointOnCircle(sector.startAngle, markerSize)
				const p2 = pointOnCircle(sector.endAngle, markerSize)
				const p3 = pointOnCircle(sector.startAngle + 45, markerSize * Math.sqrt(2))
				svg += `<path d="M ${p1.x} ${p1.y} L ${p3.x} ${p3.y} L ${p2.x} ${p2.y}" fill="none" stroke="black" stroke-width="1.5"/>`
			}
		}
	}

	svg += `<circle cx="${cx}" cy="${cy}" r="${radius * scale}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`

	if (innerRadius) {
		svg += `<circle cx="${cx}" cy="${cy}" r="${innerRadius * scale}" fill="white" stroke="black" stroke-width="2"/>`
	}

	if (arcs) {
		for (const arc of arcs) {
			const r = radius * scale
			const start = pointOnCircle(arc.startAngle, r)
			const end = pointOnCircle(arc.endAngle, r)
			const largeArcFlag = Math.abs(arc.endAngle - arc.startAngle) > 180 ? 1 : 0
			const pathData = `M ${start.x},${start.y} A ${r},${r} 0 ${largeArcFlag} 1 ${end.x},${end.y}`
			svg += `<path d="${pathData}" fill="none" stroke="${arc.strokeColor}" stroke-width="3"/>`
			if (arc.label) {
				const midAngle = (arc.startAngle + arc.endAngle) / 2
				const labelPos = pointOnCircle(midAngle, r + PADDING)
				const finalX = clamp(labelPos.x, PADDING, width - PADDING)
				const finalY = clamp(labelPos.y, PADDING, height - PADDING)
				svg += `<text x="${finalX}" y="${finalY}" font-size="14px" font-weight="bold" fill="#333" text-anchor="middle" dominant-baseline="middle">${arc.label}</text>`
			}
		}
	}

	if (segments) {
		for (const seg of segments) {
			const r = radius * scale
			const lineStart = pointOnCircle(seg.type === "diameter" ? seg.angle + 180 : 0, seg.type === "diameter" ? r : 0)
			const lineEnd = pointOnCircle(seg.angle, r)
			svg += `<line x1="${lineStart.x}" y1="${lineStart.y}" x2="${lineEnd.x}" y2="${lineEnd.y}" stroke="${seg.color}" stroke-width="2"/>`

			if (seg.label) {
				// --- START OF FIX: Annulus-aware and collision-aware placement ---
				const labelStartRadius = (innerRadius ?? 0) * scale
				const labelAnchorRadius = labelStartRadius + (r - labelStartRadius) / 2
				const mid = pointOnCircle(seg.angle, labelAnchorRadius)
				const angleRad = toRad(seg.angle)

				// For near-horizontal lines in the top-right quadrant (like 359 deg), flip the vertical offset
				// to prevent collision with labels for lines at 0 deg.
				const verticalOffsetMultiplier = seg.angle > 270 && seg.angle < 360 ? -1 : 1
				const offsetX = -Math.sin(angleRad) * 10
				const offsetY = Math.cos(angleRad) * 10 * verticalOffsetMultiplier
				// --- END OF FIX ---

				const finalX = clamp(mid.x + offsetX, PADDING, width - PADDING)
				const finalY = clamp(mid.y + offsetY, PADDING, height - PADDING)
				svg += `<text x="${finalX}" y="${finalY}" font-size="13px" fill="#333" text-anchor="middle" dominant-baseline="middle">${seg.label}</text>`
			}
		}
	}

	if (showCenterDot) {
		svg += `<circle cx="${cx}" cy="${cy}" r="3" fill="black"/>`
	}

	if (areaLabel) {
		const yOffset = -10
		svg += `<text x="${cx}" y="${cy + yOffset}" font-size="16px" font-weight="bold" fill="#333" text-anchor="middle" dominant-baseline="middle">${areaLabel}</text>`
	}

	svg += "</svg>"
	return svg
}
