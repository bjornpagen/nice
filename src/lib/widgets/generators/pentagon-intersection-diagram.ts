import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import { computeDynamicWidth, includePointX, includeText, initExtents } from "@/lib/widgets/utils/layout"

const KAArc = z
	.object({
		startX: z
			.number()
			.describe("X-coordinate where the arc begins (e.g., 150, 200, 175.5). Usually on or near a line segment."),
		startY: z
			.number()
			.describe("Y-coordinate where the arc begins (e.g., 100, 150, 125.5). Defines the arc's starting point."),
		rx: z
			.number()
			.describe("Horizontal radius of the elliptical arc in pixels (e.g., 20, 30, 25). Controls arc width."),
		ry: z
			.number()
			.describe(
				"Vertical radius of the elliptical arc in pixels (e.g., 20, 30, 25). Often equals rx for circular arcs."
			),
		xAxisRotation: z
			.number()
			.describe("Rotation of the ellipse in degrees (e.g., 0, 45, -30). Usually 0 for simple angle arcs."),
		largeArcFlag: z
			.number()
			.describe("SVG arc flag: 0 for small arc (<180°), 1 for large arc (>180°). Typically 0 for angle markers."),
		sweepFlag: z
			.number()
			.describe("SVG sweep direction: 0 for counter-clockwise, 1 for clockwise. Determines arc direction."),
		endDeltaX: z
			.number()
			.describe(
				"X-offset from start to end point (e.g., 15, -10, 20). End point = (startX + endDeltaX, startY + endDeltaY)."
			),
		endDeltaY: z
			.number()
			.describe("Y-offset from start to end point (e.g., 10, -15, 5). Defines where the arc ends relative to start."),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for the angle (e.g., '72°', '36°', 'α', null). Null shows arc without label. Positioned near the arc."
			),
		color: z
			.string()
			.regex(
				CSS_COLOR_PATTERN,
				"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
			)
			.describe(
				"CSS color for the arc and its label (e.g., '#FF6B6B' for red, 'blue', 'green'). Different colors distinguish angle types."
			)
	})
	.strict()

const Point = z
	.object({
		id: z
			.string()
			.describe(
				"Unique identifier for this vertex (e.g., 'A', 'B', 'C', 'D', 'E'). Used to reference in intersection lines. Must be unique."
			),
		x: z
			.number()
			.describe(
				"X-coordinate of the vertex in SVG space (e.g., 200, 150, 250). Pentagon will be centered in the diagram."
			),
		y: z
			.number()
			.describe("Y-coordinate of the vertex in SVG space (e.g., 50, 100, 200). Positive y is downward in SVG.")
	})
	.strict()

export const PentagonIntersectionDiagramPropsSchema = z
	.object({
		type: z
			.literal("pentagonIntersectionDiagram")
			.describe("Identifies this as a pentagon intersection diagram showing internal angle relationships."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate the pentagon and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 400, 500, 350). Pentagon is centered within these bounds."
			),
		pentagonPoints: z
			.array(Point)
			.describe(
				"Exactly 5 points defining the pentagon vertices in order. Connect sequentially to form the pentagon. Generator validates count = 5."
			),
		intersectionLines: z
			.array(
				z
					.object({
						from: z
							.string()
							.describe(
								"ID of the starting vertex for this diagonal. Must match a point.id in pentagonPoints (e.g., 'A', 'B')."
							),
						to: z
							.string()
							.describe(
								"ID of the ending vertex for this diagonal. Must match a point.id in pentagonPoints (e.g., 'C', 'D')."
							)
					})
					.strict()
			)
			.describe(
				"Diagonal lines connecting non-adjacent vertices. Creates the internal star pattern. Empty array shows just the pentagon outline."
			),
		khanArcs: z
			.array(KAArc)
			.describe(
				"Angle arcs using Khan Academy's style. Empty array means no angle markers. Uses SVG elliptical arc notation for precise control."
			)
	})
	.strict()
	.describe(
		"Creates a regular pentagon with optional diagonal lines forming a pentagram (5-pointed star) pattern. Shows interior angles (108°) and star point angles (36°) with customizable arc markers. Essential for teaching polygon angle sums, symmetry, and golden ratio relationships in pentagons."
	)

export type PentagonIntersectionDiagramProps = z.infer<typeof PentagonIntersectionDiagramPropsSchema>

export const generatePentagonIntersectionDiagram: WidgetGenerator<typeof PentagonIntersectionDiagramPropsSchema> = (
	data
) => {
	// Validate exactly 5 pentagon points
	if (data.pentagonPoints.length !== 5) {
		logger.error("pentagon diagram invalid point count", { pointCount: data.pentagonPoints.length })
		throw errors.new(`pentagon must have exactly 5 points, got ${data.pentagonPoints.length}`)
	}

	const { width, height, pentagonPoints, intersectionLines, khanArcs } = data

	// Initialize extents
	const ext = initExtents(width)

	// Track all pentagon vertices
	for (const point of pentagonPoints) {
		includePointX(ext, point.x)
	}

	// Track intersection line endpoints
	for (const line of intersectionLines) {
		const fromPoint = pentagonPoints.find((p) => p.id === line.from)
		const toPoint = pentagonPoints.find((p) => p.id === line.to)

		if (!fromPoint) {
			logger.error("pentagon diagram point not found", { pointId: line.from, line })
			throw errors.new(`point not found: ${line.from}`)
		}
		if (!toPoint) {
			logger.error("pentagon diagram point not found", { pointId: line.to, line })
			throw errors.new(`point not found: ${line.to}`)
		}

		includePointX(ext, fromPoint.x)
		includePointX(ext, toPoint.x)
	}

	// Track arc endpoints and labels
	for (const arc of khanArcs) {
		// Track arc start point
		includePointX(ext, arc.startX)
		
		// Track arc end point
		const arcEndX = arc.startX + arc.endDeltaX
		includePointX(ext, arcEndX)

		// Track label position if label exists
		if (arc.label) {
			const arcCenterX = arc.startX + arc.endDeltaX / 2
			const arcCenterY = arc.startY + arc.endDeltaY / 2
			
			const perpX = -arc.endDeltaY / Math.sqrt(arc.endDeltaX * arc.endDeltaX + arc.endDeltaY * arc.endDeltaY)
			const labelOffset = arc.rx + 8
			const labelX = arcCenterX + perpX * labelOffset
			
			includeText(ext, labelX, arc.label, "middle", 7)
		}
	}

	// Compute dynamic width and viewBox
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)

	// Start building SVG with computed dimensions
	let svg = `<svg width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} 0 ${dynamicWidth} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	// Draw pentagon perimeter
	for (let i = 0; i < pentagonPoints.length; i++) {
		const current = pentagonPoints[i]
		const next = pentagonPoints[(i + 1) % pentagonPoints.length]

		if (!current || !next) {
			logger.error("pentagon diagram missing pentagon point", { index: i, current, next })
			throw errors.new(`pentagon point missing at index ${i}`)
		}

		svg += `<line x1="${current.x}" y1="${current.y}" x2="${next.x}" y2="${next.y}" stroke="black" stroke-width="2"/>`
	}

	// Draw intersection lines
	for (const line of intersectionLines) {
		const fromPoint = pentagonPoints.find((p) => p.id === line.from)
		const toPoint = pentagonPoints.find((p) => p.id === line.to)

		if (!fromPoint || !toPoint) {
			// Already validated above
			continue
		}

		svg += `<line x1="${fromPoint.x}" y1="${fromPoint.y}" x2="${toPoint.x}" y2="${toPoint.y}" stroke="black" stroke-width="2"/>`
	}

	// Draw Khan Academy style arcs using exact SVG arc parameters
	for (const arc of khanArcs) {
		// Create the exact SVG path using Khan Academy's arc format
		svg += `<path d="M ${arc.startX} ${arc.startY}a${arc.rx} ${arc.ry} ${arc.xAxisRotation} ${arc.largeArcFlag} ${arc.sweepFlag} ${arc.endDeltaX} ${arc.endDeltaY}" fill="none" stroke="${arc.color}" stroke-width="2.5"/>`

		// Calculate label position at the center of the arc but just outside its edge
		// Find the center point of the arc path
		const arcCenterX = arc.startX + arc.endDeltaX / 2
		const arcCenterY = arc.startY + arc.endDeltaY / 2

		// Calculate the perpendicular direction outward from the arc
		// This is perpendicular to the line from start to end of arc
		const perpX = -arc.endDeltaY / Math.sqrt(arc.endDeltaX * arc.endDeltaX + arc.endDeltaY * arc.endDeltaY)
		const perpY = arc.endDeltaX / Math.sqrt(arc.endDeltaX * arc.endDeltaX + arc.endDeltaY * arc.endDeltaY)

		// Position label just outside the arc edge (radius + small offset) if label exists
		if (arc.label) {
			const labelOffset = arc.rx + 8 // Arc radius plus small gap
			const labelX = arcCenterX + perpX * labelOffset
			const labelY = arcCenterY + perpY * labelOffset

			svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="middle" dominant-baseline="middle" font-size="14">${arc.label}</text>`
		}
	}

	// Draw pentagon points
	for (const point of pentagonPoints) {
		svg += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="black"/>`
	}

	svg += "</svg>"
	return svg
}
