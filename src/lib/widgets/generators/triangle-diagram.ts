import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { computeDynamicWidth, includePointX, includeText, initExtents } from "@/lib/widgets/utils/layout"

const Point = z
	.object({
		id: z
			.string()
			.describe(
				"Unique identifier for this vertex (e.g., 'A', 'B', 'C', 'P', 'M'). Used to reference in sides, angles, etc. Must be unique."
			),
		x: z
			.number()
			.describe(
				"X-coordinate of the point in diagram space (e.g., 100, 250, 50). Can be negative. Diagram auto-centers all content."
			),
		y: z
			.number()
			.describe(
				"Y-coordinate of the point in diagram space (e.g., 50, 200, 150). Positive y is downward. Diagram auto-centers all content."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label displayed near the point (e.g., 'A', 'P', 'M₁', null). Null means no label. Typically single letter or letter with subscript."
			)
	})
	.strict()

const Side = z
	.object({
		vertex1: z
			.string()
			.describe(
				"First point ID defining this side's endpoint (e.g., 'A' in side AB). Order matters for labeling position."
			),
		vertex2: z
			.string()
			.describe(
				"Second point ID defining this side's endpoint (e.g., 'B' in side AB). Order matters for labeling position."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Length label for this side (e.g., '5', '3.2 cm', 'a', '√2', null). Null means no label. Positioned at midpoint of side."
			),
		tickMarks: z
			.number()
			.int()
			.min(0)
			.describe(
				"Number of tick marks showing congruence (0 = no marks, 1 = single mark, 2 = double marks, etc.). Same count indicates congruent sides."
			)
	})
	.strict()

const Angle = z
	.object({
		pointOnFirstRay: z
			.string()
			.describe(
				"Point ID on the first ray of the angle (e.g., 'A' in angle ABC). Forms one side of the angle with the vertex."
			),
		vertex: z
			.string()
			.describe("Point ID at the vertex of the angle (e.g., 'B' in angle ABC). The angle is measured at this point."),
		pointOnSecondRay: z
			.string()
			.describe(
				"Point ID on the second ray of the angle (e.g., 'C' in angle ABC). Forms the other side of the angle with the vertex."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Angle measurement or name (e.g., '45°', '90°', 'θ', '∠ABC', 'x', null). Null shows arc without label."
			),
		color: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"CSS color for the angle arc (e.g., '#FF6B6B' for red, 'blue', 'green'). Different colors distinguish multiple angles."
			),
		radius: z
			.number()
			.describe(
				"Radius of the angle arc in pixels (e.g., 25, 30, 20). Larger radii for outer angles when multiple angles share a vertex."
			),
		isRightAngle: z
			.boolean()
			.describe("If true, shows a square corner instead of arc to indicate 90°. Overrides arc display."),
		showArc: z
			.boolean()
			.describe("Whether to display the angle arc/square. False shows only the label without visual marker.")
	})
	.strict()

const InternalLine = z
	.object({
		from: z
			.string()
			.describe("Starting point ID for the line segment. Must match a point.id in points array (e.g., 'A', 'M')."),
		to: z
			.string()
			.describe("Ending point ID for the line segment. Must match a point.id in points array (e.g., 'D', 'P')."),
		style: z
			.enum(["solid", "dashed", "dotted"])
			.describe(
				"Visual style of the line. 'solid' for main elements, 'dashed' for auxiliary lines, 'dotted' for reference lines."
			)
	})
	.strict()

const ShadedRegion = z
	.object({
		vertices: z
			.array(z.string())
			.describe(
				"Ordered point IDs defining the region to shade. Connect in sequence to form closed polygon (e.g., ['A','B','M'] for triangle ABM). Min 3 points."
			),
		color: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"CSS fill color with transparency (e.g., 'rgba(255,0,0,0.2)' for light red, 'rgba(0,128,255,0.3)' for light blue). Use alpha < 0.5 for transparency."
			)
	})
	.strict()

export const TriangleDiagramPropsSchema = z
	.object({
		type: z
			.literal("triangleDiagram")
			.describe("Identifies this as a triangle diagram widget for geometric constructions and proofs."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate the triangle and all labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 350, 400, 300). Should fit the triangle with comfortable padding."
			),
		points: z
			.array(Point)
			.describe(
				"All vertices used in the diagram. Must include at least 3 points to form the main triangle. Can include additional points for constructions."
			),
		sides: z
			.array(Side)
			.describe(
				"Side annotations with labels and congruence marks. Empty array means no side labels. Order doesn't affect display."
			),
		angles: z
			.array(Angle)
			.describe(
				"Angle annotations with arcs, labels, and optional right-angle markers. Empty array means no angle marks."
			),
		internalLines: z
			.array(InternalLine)
			.describe(
				"Additional line segments like altitudes, medians, or angle bisectors. Empty array means no internal lines."
			),
		shadedRegions: z
			.array(ShadedRegion)
			.describe(
				"Regions to fill with translucent color. Empty array means no shading. Useful for highlighting areas or showing equal regions."
			)
	})
	.strict()
	.describe(
		"Creates triangle diagrams with comprehensive geometric annotations including side lengths, angles, tick marks for congruence, internal lines (altitudes, medians), and shaded regions. Perfect for geometric proofs, constructions, and teaching triangle properties. Supports multiple triangles and complex constructions through flexible point system."
	)

export type TriangleDiagramProps = z.infer<typeof TriangleDiagramPropsSchema>

/**
 * Generates a versatile diagram of a triangle and its components.
 * Ideal for a wide range of geometry problems.
 */
export const generateTriangleDiagram: WidgetGenerator<typeof TriangleDiagramPropsSchema> = (props) => {
	const { width, height, points, sides, angles, internalLines, shadedRegions } = props

	// Initialize extents tracking
	const ext = initExtents(width)

	if (points.length < 3) {
		logger.error("triangle diagram insufficient points", { pointCount: points.length })
		throw errors.new("triangle requires at least 3 points")
	}

	const padding = 20
	const minX = Math.min(...points.map((p) => p.x)) - padding
	const maxX = Math.max(...points.map((p) => p.x)) + padding
	const minY = Math.min(...points.map((p) => p.y)) - padding
	const maxY = Math.max(...points.map((p) => p.y)) + padding

	let svg = `<svg width="${width}" height="${height}" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`
	const pointMap = new Map(points.map((p) => [p.id, p]))

	// Compute centroid of the main triangle (first 3 points) to infer outward direction
	// Safe to access without checks since we validated points.length >= 3 above
	const pAforCentroid = points[0]
	const pBforCentroid = points[1]
	const pCforCentroid = points[2]
	if (!pAforCentroid || !pBforCentroid || !pCforCentroid) {
		logger.error("triangle diagram missing required points", { points: points.slice(0, 3) })
		throw errors.new("triangle diagram: first 3 points are required")
	}
	const centroidXForAngles = (pAforCentroid.x + pBforCentroid.x + pCforCentroid.x) / 3
	const centroidYForAngles = (pAforCentroid.y + pBforCentroid.y + pCforCentroid.y) / 3

	// Layer 1: Shaded Regions (drawn first to be in the background)
	for (const region of shadedRegions) {
		const regionPoints = region.vertices
			.map((id) => pointMap.get(id))
			.filter((p): p is NonNullable<typeof p> => p !== undefined)
		if (regionPoints.length < 3) continue
		
		// Track shaded region vertices
		regionPoints.forEach((p) => {
			includePointX(ext, p.x)
		})
		
		const pointsStr = regionPoints.map((p) => `${p.x},${p.y}`).join(" ")
		svg += `<polygon points="${pointsStr}" fill="${region.color}" stroke="none"/>`
	}

	// Layer 2: Main Triangle Outline (assumes first 3 points form the main triangle)
	// Track main triangle vertices
	points.slice(0, 3).forEach((p) => {
		includePointX(ext, p.x)
	})
	
	const mainTrianglePoints = points
		.slice(0, 3)
		.map((p) => `${p.x},${p.y}`)
		.join(" ")
	svg += `<polygon points="${mainTrianglePoints}" fill="none" stroke="black" stroke-width="2"/>`

	// Layer 3: Internal Lines
	for (const line of internalLines) {
		const from = pointMap.get(line.from)
		const to = pointMap.get(line.to)
		if (!from || !to) continue
		
		// Track internal line endpoints
		includePointX(ext, from.x)
		includePointX(ext, to.x)
		
		let dash = ""
		if (line.style === "dashed") {
			dash = 'stroke-dasharray="4 3"'
		} else if (line.style === "dotted") {
			dash = 'stroke-dasharray="2 4"'
		}
		svg += `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="black" stroke-width="1.5" ${dash}/>`
	}

	// Layer 4: Angle Markers
	for (const angle of angles) {
		const p1 = pointMap.get(angle.pointOnFirstRay)
		const vertex = pointMap.get(angle.vertex)
		const p2 = pointMap.get(angle.pointOnSecondRay)
		if (!p1 || !vertex || !p2) continue

		// Calculate angle magnitude for distance scaling
		let startAngle = Math.atan2(p1.y - vertex.y, p1.x - vertex.x)
		let endAngle = Math.atan2(p2.y - vertex.y, p2.x - vertex.x)

		// Ensure angles are calculated in a consistent direction
		if (endAngle < startAngle) {
			endAngle += 2 * Math.PI
		}
		if (endAngle - startAngle > Math.PI) {
			// This handles the case of reflex angles correctly by swapping
			const temp = startAngle
			startAngle = endAngle
			endAngle = temp + 2 * Math.PI
		}

		const angleMagnitudeRad = Math.abs(endAngle - startAngle)

		// Calculate distance scaling based on angle magnitude (smaller angles = farther distance)
		const calculateAngleDistance = (baseDistance: number): number => {
			if (angle.isRightAngle) {
				return baseDistance // Keep right angles at fixed distance
			}

			const MIN_DISTANCE_MULTIPLIER = 1.0 // Lower bound (current distance is good baseline)
			const MAX_DISTANCE_MULTIPLIER = 2.5 // Upper bound to prevent labels floating too far
			const SCALING_FACTOR = 0.3 // Controls how aggressively small angles are pushed out

			// Use logarithmic scaling: smaller angles get exponentially more distance
			// angleMagnitudeRad ranges from ~0 to π, log gives us smooth inverse relationship
			const normalizedAngle = angleMagnitudeRad / Math.PI // Normalize to 0-1
			const logScale = Math.log(normalizedAngle + 0.1) // Add offset to avoid log(0)
			const invertedScale = -logScale // Invert so smaller angles get higher values

			// Scale and clamp the multiplier
			const distanceMultiplier = Math.min(
				MAX_DISTANCE_MULTIPLIER,
				Math.max(MIN_DISTANCE_MULTIPLIER, MIN_DISTANCE_MULTIPLIER + SCALING_FACTOR * invertedScale)
			)

			return baseDistance * distanceMultiplier
		}

		// Calculate scaled arc radius
		const scaledArcRadius = calculateAngleDistance(angle.radius)

		// Only draw the arc/marker if showArc is true
		if (angle.showArc) {
			if (angle.isRightAngle) {
				const v1x = p1.x - vertex.x
				const v1y = p1.y - vertex.y
				const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
				const u1x = v1x / mag1
				const u1y = v1y / mag1
				const v2x = p2.x - vertex.x
				const v2y = p2.y - vertex.y
				const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)
				const u2x = v2x / mag2
				const u2y = v2y / mag2

				const markerSize = calculateAngleDistance(15)
				const m1x = vertex.x + u1x * markerSize
				const m1y = vertex.y + u1y * markerSize
				const m2x = vertex.x + u2x * markerSize
				const m2y = vertex.y + u2y * markerSize
				const m3x = vertex.x + (u1x + u2x) * markerSize
				const m3y = vertex.y + (u1y + u2y) * markerSize
				
				// Track right angle marker vertices
				includePointX(ext, m1x)
				includePointX(ext, m2x)
				includePointX(ext, m3x)
				
				svg += `<path d="M ${m1x} ${m1y} L ${m3x} ${m3y} L ${m2x} ${m2y}" fill="none" stroke="black" stroke-width="2"/>`
			} else {
				const arcStartX = vertex.x + scaledArcRadius * Math.cos(startAngle)
				const arcStartY = vertex.y + scaledArcRadius * Math.sin(startAngle)
				const arcEndX = vertex.x + scaledArcRadius * Math.cos(endAngle)
				const arcEndY = vertex.y + scaledArcRadius * Math.sin(endAngle)
				
				// Track angle arc endpoints
				includePointX(ext, arcStartX)
				includePointX(ext, arcEndX)
				
				let angleDiff = endAngle - startAngle
				if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
				if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
				const sweepFlag = angleDiff > 0 ? 1 : 0
				svg += `<path d="M ${arcStartX} ${arcStartY} A ${scaledArcRadius} ${scaledArcRadius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}" fill="none" stroke="${angle.color}" stroke-width="2"/>`
			}
		}

		if (angle.label) {
			const midAngle = (startAngle + endAngle) / 2

			let labelRadius: number

			// Use a fixed radius for right angles, otherwise calculate dynamically with scaling
			if (angle.isRightAngle) {
				labelRadius = 28
			} else {
				const baseLabelRadius = scaledArcRadius * 1.6
				const FONT_SIZE_ESTIMATE = 14 // Based on the SVG font-size
				const CLEARANCE_PX = FONT_SIZE_ESTIMATE * 0.7 // Clearance needed for text

				// For very small angles, sin() approaches 0, which can cause radius to be infinite.
				// We only apply this logic if the angle is wide enough to avoid division by zero.
				if (Math.sin(angleMagnitudeRad / 2) > 0.01) {
					// Calculate the minimum radius needed to avoid the label touching the angle's lines
					const minRadiusForClearance = CLEARANCE_PX / Math.sin(angleMagnitudeRad / 2)
					// The label radius is the larger of the aesthetic default or the calculated minimum
					labelRadius = Math.max(baseLabelRadius, minRadiusForClearance)
				} else {
					// Fallback for extremely small angles
					labelRadius = baseLabelRadius
				}
			}
			// --- NEW LOGIC END ---
			// For right angles, flip label direction outward from the triangle so it does not
			// overlap the vertex label or the right-angle marker inside the corner.
			let labelAngle = midAngle
			if (angle.isRightAngle) {
				const inX = vertex.x + labelRadius * Math.cos(midAngle)
				const inY = vertex.y + labelRadius * Math.sin(midAngle)
				const outAngle = midAngle + Math.PI
				const outX = vertex.x + labelRadius * Math.cos(outAngle)
				const outY = vertex.y + labelRadius * Math.sin(outAngle)
				const distIn = Math.hypot(inX - centroidXForAngles, inY - centroidYForAngles)
				const distOut = Math.hypot(outX - centroidXForAngles, outY - centroidYForAngles)
				labelAngle = distOut > distIn ? outAngle : midAngle
			}

			const labelX = vertex.x + labelRadius * Math.cos(labelAngle)
			const labelY = vertex.y + labelRadius * Math.sin(labelAngle)
			
			// Track angle label
			includeText(ext, labelX, angle.label, "middle", 14)
			
			svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="middle" dominant-baseline="middle">${angle.label}</text>`
		}
	}

	// Layer 5: Sides (Labels and Ticks)
	// Compute centroid of the main triangle (first 3 points) to determine outward direction
	// Safe to access without checks since we validated points.length >= 3 above
	const pA = points[0]
	const pB = points[1]
	const pC = points[2]
	if (!pA || !pB || !pC) {
		logger.error("triangle diagram missing required points for sides", { points: points.slice(0, 3) })
		throw errors.new("triangle diagram: first 3 points are required for sides")
	}
	const centroidX = (pA.x + pB.x + pC.x) / 3
	const centroidY = (pA.y + pB.y + pC.y) / 3

	for (const side of sides) {
		const p1 = pointMap.get(side.vertex1)
		const p2 = pointMap.get(side.vertex2)
		if (!p1 || !p2) continue

		const midX = (p1.x + p2.x) / 2
		const midY = (p1.y + p2.y) / 2
		const dx = p2.x - p1.x
		const dy = p2.y - p1.y
		const len = Math.sqrt(dx * dx + dy * dy)
		const nx = -dy / len // Perpendicular vector
		const ny = dx / len
		const labelOffset = 15

		if (side.label) {
			// Flip perpendicular to point away from the triangle centroid so labels are placed outside
			let perpX = nx
			let perpY = ny
			const testX = midX + perpX * 10
			const testY = midY + perpY * 10
			const distTest = Math.hypot(testX - centroidX, testY - centroidY)
			const distMid = Math.hypot(midX - centroidX, midY - centroidY)
			if (distTest < distMid) {
				perpX = -perpX
				perpY = -perpY
			}

			const labelX = midX + perpX * labelOffset
			const labelY = midY + perpY * labelOffset
			
			// Track side label
			includeText(ext, labelX, side.label, "middle", 14)
			
			svg += `<text x="${labelX}" y="${labelY}" fill="black" text-anchor="middle" dominant-baseline="middle">${side.label}</text>`
		}
		if (side.tickMarks > 0) {
			const tickSize = 6
			const tickSpacing = 4
			const totalTickWidth = side.tickMarks * tickSize + (side.tickMarks - 1) * tickSpacing
			const startOffset = -totalTickWidth / 2
			for (let i = 0; i < side.tickMarks; i++) {
				const tickOffset = startOffset + i * (tickSize + tickSpacing)
				const t1x = midX + (dx / len) * tickOffset - nx * (tickSize / 2)
				const t1y = midY + (dy / len) * tickOffset - ny * (tickSize / 2)
				const t2x = midX + (dx / len) * tickOffset + nx * (tickSize / 2)
				const t2y = midY + (dy / len) * tickOffset + ny * (tickSize / 2)
				
				// Track tick mark endpoints
				includePointX(ext, t1x)
				includePointX(ext, t2x)
				
				svg += `<line x1="${t1x}" y1="${t1y}" x2="${t2x}" y2="${t2y}" stroke="black" stroke-width="2"/>`
			}
		}
	}

	// Layer 6: Points and their labels (drawn last to be on top)
	for (const point of points) {
		// Track point position
		includePointX(ext, point.x)
		
		svg += `<circle cx="${point.x}" cy="${point.y}" r="4" fill="black"/>`
		if (point.label) {
			const textX = point.x + 8
			const textY = point.y - 8
			
			// Track point label
			includeText(ext, textX, point.label, "start", 16)
			
			svg += `<text x="${textX}" y="${textY}" fill="black" font-size="16" font-weight="bold">${point.label}</text>`
		}
	}

	svg += "</svg>"
	
	// Apply dynamic width calculation
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, padding)
	
	// Update SVG with dynamic width and viewBox
	svg = svg.replace(
		`width="${width}" height="${height}" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}"`,
		`width="${dynamicWidth}" height="${height}" viewBox="${vbMinX} ${minY} ${dynamicWidth} ${maxY - minY}"`
	)
	
	return svg
}
