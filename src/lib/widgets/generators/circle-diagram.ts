import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a line segment, such as a radius or a diameter.
const SegmentSchema = z
	.object({
		type: z.enum(["radius", "diameter"]).describe("The type of line segment to draw."),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe("An optional text label for the segment."),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "#4A4A4A")
			.describe("The color of the line segment. Defaults to '#4A4A4A' if null."),
		angle: z
			.number()
			.nullable()
			.transform((val) => val ?? 0)
			.describe("The angle of the segment in degrees (0 is horizontal to the right). Defaults to 0 if null.")
	})
	.strict()
	.describe("Defines a line segment (a radius or diameter) to be drawn on the diagram.")

// Defines a sector (a pie slice) of the circle.
const SectorSchema = z
	.object({
		startAngle: z.number().describe("The starting angle of the sector in degrees."),
		endAngle: z.number().describe("The ending angle of the sector in degrees."),
		fillColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "rgba(100, 181, 246, 0.5)")
			.describe("The fill color for the sector. Defaults to a semi-transparent blue if null."),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe("An optional label for the sector."),
		showRightAngleMarker: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe("If true and the sector is 90 degrees, shows a right angle marker. Defaults to false if null.")
	})
	.strict()
	.describe("Defines a sector (a pie slice) to fill a portion of the diagram.")

// Defines an arc (a portion of the circle's circumference).
const ArcSchema = z
	.object({
		startAngle: z.number().describe("The starting angle of the arc in degrees."),
		endAngle: z.number().describe("The ending angle of the arc in degrees."),
		strokeColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "#D32F2F")
			.describe("The color of the arc. Defaults to a shade of red if null."),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe("An optional label for the arc.")
	})
	.strict()
	.describe("Defines an arc to be highlighted on the circumference of the diagram.")

// The main Zod schema for the circleDiagram function
export const CircleDiagramPropsSchema = z
	.object({
		type: z.literal("circleDiagram").describe("The unique identifier for this widget type."),
		// New Shape Properties
		shape: z
			.enum(["circle", "semicircle", "quarter-circle"])
			.nullable()
			.transform((val) => val ?? "circle")
			.describe(
				'Defines the fundamental boundary of the diagram. Use "semicircle" or "quarter-circle" to draw only that portion of a circle. Defaults to "circle" if null.'
			),
		rotation: z
			.number()
			.nullable()
			.transform((val) => val ?? 0)
			.describe(
				"Rotates the entire shape in degrees. For semicircle, 0 degrees is the bottom half. For quarter-circle, 0 degrees is the bottom-right quadrant. Defaults to 0 if null."
			),
		// SVG Container Properties
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 250)
			.describe("The total width of the output SVG container in pixels. Defaults to 250 if null."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 250)
			.describe("The total height of the output SVG container in pixels. Defaults to 250 if null."),
		// Base Circle Properties
		radius: z.number().positive().describe("The radius of the main (outer) circle."),
		fillColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "none")
			.describe("The fill color of the main shape. Defaults to 'none' if null."),
		strokeColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "black")
			.describe("The stroke color of the main shape's boundary. Defaults to 'black' if null."),
		// Concentric Circle Properties (only for shape="circle")
		innerRadius: z
			.number()
			.positive()
			.nullable()
			.describe('If provided with shape="circle", draws a concentric inner circle, creating an annulus.'),
		annulusFillColor: z
			.string()
			.nullable()
			.describe('If provided with an innerRadius and shape="circle", shades the region between the two circles.'),
		// Elements to draw on the diagram
		segments: z.array(SegmentSchema).nullable().describe("An array of radius or diameter lines to draw."),
		sectors: z.array(SectorSchema).nullable().describe("An array of sectors (pie slices) to draw."),
		arcs: z.array(ArcSchema).nullable().describe("An array of arcs to highlight on the circumference."),
		showCenterDot: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe("If true, a dot is drawn at the circle's center. Defaults to false if null."),
		areaLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" ? null : val))
			.describe("A text label to place in the center of the circle, often for area.")
	})
	.strict()
	.describe(
		"Generates a versatile SVG diagram of a circle, semicircle, or quarter-circle and its components. It is ideal for geometry problems involving radius, diameter, arcs, sectors, and area."
	)

export type CircleDiagramProps = z.infer<typeof CircleDiagramPropsSchema>

/**
 * Generates an SVG diagram of a circle and its components.
 */
export const generateCircleDiagram: WidgetGenerator<typeof CircleDiagramPropsSchema> = (props) => {
	const {
		shape,
		rotation,
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
		y: cy + r * Math.sin(toRad(angleDeg)) // +y is down in SVG
	})
	const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))
	const PADDING = 15

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`
	const r = radius * scale

	// Annulus is only compatible with the full "circle" shape.
	if (shape === "circle" && innerRadius && annulusFillColor) {
		const r1 = radius * scale
		const r2 = innerRadius * scale
		svg += `<path d="M ${cx - r1},${cy} a ${r1},${r1} 0 1,0 ${2 * r1},0 a ${r1},${r1} 0 1,0 -${2 * r1},0 M ${cx - r2},${cy} a ${r2},${r2} 0 1,0 ${2 * r2},0 a ${r2},${r2} 0 1,0 -${2 * r2},0" fill="${annulusFillColor}" fill-rule="evenodd" />`
	}

	// Draw sectors first, so the main shape's stroke is drawn on top.
	if (sectors) {
		for (const sector of sectors) {
			const start = pointOnCircle(sector.startAngle, r)
			const end = pointOnCircle(sector.endAngle, r)
			const angleDiff = Math.abs(sector.endAngle - sector.startAngle)
			const largeArcFlag = angleDiff > 180 ? 1 : 0
			const pathData = `M ${cx},${cy} L ${start.x},${start.y} A ${r},${r} 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`
			svg += `<path d="${pathData}" fill="${sector.fillColor}" stroke="none"/>`

			if (sector.showRightAngleMarker && Math.abs(angleDiff - 90) < 0.1) {
				const markerSize = Math.min(r, 20) * 0.8
				const p1 = pointOnCircle(sector.startAngle, markerSize)
				const p3 = pointOnCircle(sector.startAngle + 45, markerSize * Math.sqrt(2))
				const p2 = pointOnCircle(sector.endAngle, markerSize)
				svg += `<path d="M ${p1.x},${p1.y} L ${p3.x},${p3.y} L ${p2.x},${p2.y}" fill="none" stroke="black" stroke-width="1.5"/>`
			}
		}
	}

	// Draw the main shape's boundary based on the 'shape' prop.
	switch (shape) {
		case "semicircle": {
			// A semicircle path from 0 to 180 degrees, rotated. Closing the path (Z) draws the diameter.
			const startAngle = 0 + rotation
			const endAngle = 180 + rotation
			const start = pointOnCircle(startAngle, r)
			const end = pointOnCircle(endAngle, r)
			const pathData = `M ${start.x},${start.y} A ${r},${r} 0 0 1 ${end.x},${end.y} Z`
			svg += `<path d="${pathData}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`
			break
		}
		case "quarter-circle": {
			// A quarter-circle path from the center, out to the arc, and back to the center.
			const startAngle = 0 + rotation
			const endAngle = 90 + rotation
			const start = pointOnCircle(startAngle, r)
			const end = pointOnCircle(endAngle, r)
			const pathData = `M ${cx},${cy} L ${start.x},${start.y} A ${r},${r} 0 0 1 ${end.x},${end.y} Z`
			svg += `<path d="${pathData}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`
			break
		}
		default: {
			svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>`
			break
		}
	}

	// The inner circle is only drawn for the main "circle" shape.
	if (shape === "circle" && innerRadius) {
		svg += `<circle cx="${cx}" cy="${cy}" r="${innerRadius * scale}" fill="white" stroke="black" stroke-width="2"/>`
	}

	// Arcs are drawn on top of the main shape.
	if (arcs) {
		for (const arc of arcs) {
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

	// Segments (radii/diameters) are drawn on top of the main shape.
	if (segments) {
		for (const seg of segments) {
			const lineStart = pointOnCircle(
				seg.type === "diameter" ? seg.angle + 180 : seg.angle,
				seg.type === "diameter" ? r : 0
			)
			const lineEnd = pointOnCircle(seg.angle, r)

			// Correction for radius start point: pointOnCircle with r=0 correctly returns the center (cx,cy)
			if (seg.type === "radius") {
				lineStart.x = cx
				lineStart.y = cy
			}

			svg += `<line x1="${lineStart.x}" y1="${lineStart.y}" x2="${lineEnd.x}" y2="${lineEnd.y}" stroke="${seg.color}" stroke-width="2"/>`

			if (seg.label) {
				const labelStartRadius = shape === "circle" && innerRadius ? innerRadius * scale : 0
				const labelAnchorRadius = labelStartRadius + (r - labelStartRadius) / 2
				const mid = pointOnCircle(seg.angle, labelAnchorRadius)
				const angleRad = toRad(seg.angle)
				const verticalOffsetMultiplier = seg.angle > 270 && seg.angle < 360 ? -1 : 1
				const offsetX = -Math.sin(angleRad) * 10
				const offsetY = Math.cos(angleRad) * 10 * verticalOffsetMultiplier
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
