import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "../types"
import { CanvasImpl } from "../../utils/canvas-impl"
import { PADDING } from "../../utils/constants"
import { CSS_COLOR_PATTERN } from "../../utils/css-color"
import { Path2D } from "../../utils/path-builder"
import { theme } from "../../utils/theme"

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
export const generateTriangleDiagram: WidgetGenerator<typeof TriangleDiagramPropsSchema> = async (props) => {
	const { width, height, points, sides, angles, internalLines, shadedRegions } = props

	// Initialize extents tracking
	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	if (points.length < 3) {
		logger.error("triangle diagram insufficient points", { pointCount: points.length })
		throw errors.new("triangle requires at least 3 points")
	}

	const padding = PADDING
	const minX = Math.min(...points.map((p) => p.x)) - padding
	const maxX = Math.max(...points.map((p) => p.x)) + padding
	const minY = Math.min(...points.map((p) => p.y)) - padding
	const maxY = Math.max(...points.map((p) => p.y)) + padding

	const pointMap = new Map(points.map((p) => [p.id, p]))

	// Precompute dashed-vertex membership for helper ray rendering
	const dashedVertexIds = new Set<string>()
	for (const line of internalLines) {
		if (line.style === "dashed") {
			const from = pointMap.get(line.from)
			const to = pointMap.get(line.to)
			if (from) dashedVertexIds.add(from.id)
			if (to) dashedVertexIds.add(to.id)
		}
	}

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

		canvas.drawPolygon(regionPoints, { fill: region.color, stroke: "none" })
	}

	// Layer 2: Main Triangle Outlines
	// Iterate through points in chunks of 3 to draw all defined triangles. This
	// fixes a bug where only the first of multiple triangles was being rendered.
	for (let i = 0; i < points.length; i += 3) {
		const trianglePoints = points.slice(i, i + 3)
		// Ensure we have a complete triangle before attempting to draw.
		if (trianglePoints.length === 3) {
			canvas.drawPolygon(trianglePoints, {
				fill: "none",
				stroke: theme.colors.black,
				strokeWidth: theme.stroke.width.thick
			})
		}
	}

	// Precompute triangle membership and centroids for improved side label placement.
	// We consider triangles defined by sequential chunks of 3 points, matching the
	// drawing logic above.
	const triangleChunks: Array<{ ids: Set<string>; cx: number; cy: number }> = []
	for (let i = 0; i < points.length; i += 3) {
		const t0 = points[i]
		const t1 = points[i + 1]
		const t2 = points[i + 2]
		if (!t0 || !t1 || !t2) continue
		triangleChunks.push({
			ids: new Set<string>([t0.id, t1.id, t2.id]),
			cx: (t0.x + t1.x + t2.x) / 3,
			cy: (t0.y + t1.y + t2.y) / 3
		})
	}

	// Fallback centroid across all points for degenerate cases
	const centroidAllX = points.reduce((acc, p) => acc + p.x, 0) / points.length
	const centroidAllY = points.reduce((acc, p) => acc + p.y, 0) / points.length

	// Layer 3: Internal Lines
	for (const line of internalLines) {
		const from = pointMap.get(line.from)
		const to = pointMap.get(line.to)
		if (!from || !to) continue

		let dash: string | undefined
		if (line.style === "dashed") {
			dash = "4 3"
		} else if (line.style === "dotted") {
			dash = "2 4"
		}
		canvas.drawLine(from.x, from.y, to.x, to.y, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.base,
			dash
		})
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

				// Canvas automatically tracks extents

				const markerPath = new Path2D().moveTo(m1x, m1y).lineTo(m3x, m3y).lineTo(m2x, m2y)
				canvas.drawPath(markerPath, {
					fill: "none",
					stroke: theme.colors.black,
					strokeWidth: theme.stroke.width.thick
				})

				// Helper dashed rays from the right-angle square along both rays
				// Draw when a dashed internal line meets this vertex (altitude/height context).
				if (dashedVertexIds.has(vertex.id)) {
					const helperLen = markerSize
					// Determine if there is an existing dashed line colinear with each ray from this vertex.
					const colinearSignFor = (dirX: number, dirY: number): -1 | 0 | 1 => {
						for (const line of internalLines) {
							if (line.style !== "dashed") continue
							let other: { x: number; y: number } | null = null
							if (line.from === vertex.id) {
								const to = pointMap.get(line.to)
								if (to) other = { x: to.x - vertex.x, y: to.y - vertex.y }
							} else if (line.to === vertex.id) {
								const fromP = pointMap.get(line.from)
								if (fromP) other = { x: fromP.x - vertex.x, y: fromP.y - vertex.y }
							}
							if (!other) continue
							const ovLen = Math.hypot(other.x, other.y)
							if (ovLen === 0) continue
							const ovx = other.x / ovLen
							const ovy = other.y / ovLen
							const dot = ovx * dirX + ovy * dirY
							if (Math.abs(dot) > 0.98) {
								return dot >= 0 ? 1 : -1
							}
						}
						return 0
					}

					// For each ray, draw dashed segments in both directions from the square corner,
					// unless a real dashed line already occupies one direction; in that case, draw the opposite.
					const drawRayHelpers = (
						cornerX: number,
						cornerY: number,
						dirX: number,
						dirY: number,
						sign: -1 | 0 | 1
					): void => {
						const posX1 = cornerX
						const posY1 = cornerY
						const posX2 = cornerX + dirX * helperLen
						const posY2 = cornerY + dirY * helperLen
						const negX1 = cornerX - dirX * helperLen
						const negY1 = cornerY - dirY * helperLen
						// Draw toward +dir only if no true dashed internal line occupies +dir
						if (sign <= 0) {
							canvas.drawLine(posX1, posY1, posX2, posY2, {
								stroke: theme.colors.black,
								strokeWidth: theme.stroke.width.base,
								dash: "4 3"
							})
						}
						// Draw toward -dir only if no true dashed internal line occupies -dir
						if (sign >= 0) {
							canvas.drawLine(negX1, negY1, posX1, posY1, {
								stroke: theme.colors.black,
								strokeWidth: theme.stroke.width.base,
								dash: "4 3"
							})
						}
					}

					const sign1 = colinearSignFor(u1x, u1y)
					const sign2 = colinearSignFor(u2x, u2y)
					drawRayHelpers(m1x, m1y, u1x, u1y, sign1)
					drawRayHelpers(m2x, m2y, u2x, u2y, sign2)
				}

				// Auto-draw full dashed height when a right-angle marker exists at a non-core vertex
				// but no explicit dashed internal line is provided. This addresses cases where the
				// height dropdown is implied in the problem but omitted from inputs.
				const isCoreTriangleVertex = triangleChunks.some((tri) => tri.ids.has(vertex.id))
				if (!isCoreTriangleVertex) {
					// Choose the farther of the two rays' endpoints as the target (typically the apex
					// when the right angle is at the foot on the base).
					const dToP1 = Math.hypot(p1.x - vertex.x, p1.y - vertex.y)
					const dToP2 = Math.hypot(p2.x - vertex.x, p2.y - vertex.y)
					const target = dToP1 >= dToP2 ? p1 : p2
					const existsDashedHeight = internalLines.some(
						(line) =>
							line.style === "dashed" &&
							((line.from === vertex.id && line.to === target.id) ||
								(line.to === vertex.id && line.from === target.id))
					)
					if (!existsDashedHeight) {
						canvas.drawLine(vertex.x, vertex.y, target.x, target.y, {
							stroke: theme.colors.black,
							strokeWidth: theme.stroke.width.base,
							dash: "4 3"
						})
					}
				}
			} else {
				const arcStartX = vertex.x + scaledArcRadius * Math.cos(startAngle)
				const arcStartY = vertex.y + scaledArcRadius * Math.sin(startAngle)
				const arcEndX = vertex.x + scaledArcRadius * Math.cos(endAngle)
				const arcEndY = vertex.y + scaledArcRadius * Math.sin(endAngle)

				// Track angle arc endpoints
				// Canvas automatically tracks extents

				let angleDiff = endAngle - startAngle
				if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
				if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
				const sweepFlag: 0 | 1 = angleDiff > 0 ? 1 : 0
				const arcPath = new Path2D()
					.moveTo(arcStartX, arcStartY)
					.arcTo(scaledArcRadius, scaledArcRadius, 0, 0, sweepFlag, arcEndX, arcEndY)
				canvas.drawPath(arcPath, {
					fill: "none",
					stroke: angle.color,
					strokeWidth: theme.stroke.width.thick
				})
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

			// Canvas automatically tracks extents

			canvas.drawText({
				x: labelX,
				y: labelY,
				text: angle.label,
				fill: theme.colors.black,
				anchor: "middle",
				dominantBaseline: "middle"
			})
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
		// Dynamic label offset scaled by side length, within reasonable bounds
		const labelOffset = Math.max(15, Math.min(32, len * 0.06 + (side.label ? side.label.length * 3 : 0)))

		if (side.label) {
			// Determine an appropriate centroid for this side: prefer the centroid
			// of the triangle chunk that contains both endpoints; otherwise fallback.
			let useCx = centroidX
			let useCy = centroidY
			for (const tri of triangleChunks) {
				if (tri.ids.has(p1.id) && tri.ids.has(p2.id)) {
					useCx = tri.cx
					useCy = tri.cy
					break
				}
			}

			// Flip perpendicular to point away from the chosen centroid so labels are placed outside
			let perpX = nx
			let perpY = ny
			const testX = midX + perpX * 10
			const testY = midY + perpY * 10
			const distTest = Math.hypot(testX - useCx, testY - useCy)
			const distMid = Math.hypot(midX - useCx, midY - useCy)
			if (distTest < distMid) {
				perpX = -perpX
				perpY = -perpY
			}

			const labelX = midX + perpX * labelOffset
			const labelY = midY + perpY * labelOffset

			// Canvas automatically tracks extents

			canvas.drawText({
				x: labelX,
				y: labelY,
				text: side.label,
				fill: theme.colors.black,
				anchor: "middle",
				dominantBaseline: "middle"
			})
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

				// Canvas automatically tracks extents

				canvas.drawLine(t1x, t1y, t2x, t2y, {
					stroke: theme.colors.black,
					strokeWidth: theme.stroke.width.thick
				})
			}
		}
	}

	// Layer 6: Points and their labels (drawn last to be on top)
	for (const point of points) {
		// Canvas automatically tracks extents

		canvas.drawCircle(point.x, point.y, 4, {
			fill: theme.colors.black
		})
		if (point.label) {
			// Place vertex labels along the external angle bisector so they sit outside
			// the triangle and are equidistant from both incident sides.
			let useCx = centroidAllX
			let useCy = centroidAllY
			let bisX = 0
			let bisY = 0
			let haveBisector = false
			for (const tri of triangleChunks) {
				if (tri.ids.has(point.id)) {
					useCx = tri.cx
					useCy = tri.cy
					const neighborIds: string[] = []
					for (const id of tri.ids) {
						if (id !== point.id) neighborIds.push(id)
					}
					if (neighborIds.length === 2) {
						const id1 = neighborIds[0]
						const id2 = neighborIds[1]
						if (id1 !== undefined && id2 !== undefined) {
							const n1 = pointMap.get(id1)
							const n2 = pointMap.get(id2)
							if (n1 && n2) {
								const v1x = n1.x - point.x
								const v1y = n1.y - point.y
								const v2x = n2.x - point.x
								const v2y = n2.y - point.y
								const m1 = Math.hypot(v1x, v1y)
								const m2 = Math.hypot(v2x, v2y)
								if (m1 > 0 && m2 > 0) {
									const u1x = v1x / m1
									const u1y = v1y / m1
									const u2x = v2x / m2
									const u2y = v2y / m2
									let bx = u1x + u2x
									let by = u1y + u2y
									const bm = Math.hypot(bx, by)
									if (bm > 0) {
										bx /= bm
										by /= bm
										// Flip to point away from triangle interior (outward)
										const toCentX = useCx - point.x
										const toCentY = useCy - point.y
										if (bx * toCentX + by * toCentY > 0) {
											bx = -bx
											by = -by
										}
										bisX = bx
										bisY = by
										haveBisector = true
									}
								}
							}
						}
					}
					break
				}
			}
			const OFFSET = 16
			let textX = point.x + 8
			let textY = point.y - 8
			if (haveBisector) {
				textX = point.x + bisX * OFFSET
				textY = point.y + bisY * OFFSET
			} else {
				// Fallback: push away from centroid if bisector unavailable
				const dirX = point.x - useCx
				const dirY = point.y - useCy
				const dirLen = Math.hypot(dirX, dirY)
				if (dirLen > 0) {
					textX = point.x + (dirX / dirLen) * OFFSET
					textY = point.y + (dirY / dirLen) * OFFSET
				}
			}

			// Canvas automatically tracks extents

			canvas.drawText({
				x: textX,
				y: textY,
				text: point.label,
				fill: theme.colors.black,
				fontPx: theme.font.size.large,
				fontWeight: theme.font.weight.bold,
				anchor: "middle",
				dominantBaseline: "middle"
			})
		}
	}

	// Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(padding)
	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.medium}">${svgBody}</svg>`
}