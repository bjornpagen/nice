import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { Path2D } from "@/lib/widgets/utils/path-builder"
import { theme } from "@/lib/widgets/utils/theme"

function createShapeSchema() {
	const shape = z
		.object({
			vertices: z
				.array(z.object({ x: z.number(), y: z.number() }).strict())
				.describe(
					"Ordered vertices defining the polygon. Connect in sequence, closing to first. Minimum 3 for valid shape. Order determines edge labeling."
				),
			label: z
				.string()
				.nullable()
				.transform((val) => (val === null || val.trim() === "" || val.trim().toLowerCase() === "null" ? null : val.trim()))
				.describe(
					"Shape identifier (e.g., 'ABCD', 'Figure 1', 'P', 'P'\'', null). Null means no label. Positioned near shape's center."
				),
			fillColor: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
				.describe(
					"CSS fill color (e.g., 'rgba(100,149,237,0.3)' for translucent blue, 'lightgreen', '#FFE5B4'). Use alpha for see-through shapes."
				),
			strokeColor: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
				.describe(
					"CSS color for shape outline (e.g., 'black', '#0000FF', 'darkgreen'). Should contrast with fill and background."
				),
			vertexLabels: z
				.array(z.string().min(1))
				.describe(
					"Labels for each vertex in order (e.g., ['A','B','C','D']). Array length must match vertices length; labels must be non-empty strings."
				),
			angleMarks: z
				.array(
					z
						.object({
							vertexIndex: z.number(),
							radius: z.number(),
							label: z
								.string()
								.nullable()
								.transform((val) =>
									val === null || val.trim() === "" || val.trim().toLowerCase() === "null" ? null : val.trim()
								),
							labelDistance: z.number()
						})
						.strict()
				)
				.describe(
					"Angle annotations to display. Empty array means no angle marks. Useful for showing congruent angles or measurements."
				),
			sideLengths: z
				.array(z.object({ value: z.string(), position: z.enum(["inside", "outside"]), offset: z.number() }).strict())
				.describe(
					"Edge length labels. First item labels edge from vertex[0] to vertex[1], etc. Array length should match number of edges."
				)
		})
		.strict()

	return shape.superRefine((data, ctx) => {
		if (data.vertices.length < 3) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: "vertices must have at least 3 points", path: ["vertices"] })
		}
		if (data.vertexLabels.length !== data.vertices.length) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "vertexLabels length must match vertices length",
				path: ["vertexLabels"]
			})
		}
	})
}

function createTransformationSchema() {
	// Important: do NOT reuse the same object schema instance across fields to prevent $ref generation
	const createPoint = () => z.object({ x: z.number(), y: z.number() }).strict()
	return z.discriminatedUnion("type", [
		z
			.object({
				type: z.literal("translation"),
				vector: z
					.object({ x: z.number(), y: z.number() })
					.strict()
					.describe("Translation vector to apply to all vertices.")
			})
			.strict(),
		z
			.object({
				type: z.literal("reflection"),
				lineOfReflection: z
					.object({
						from: createPoint(),
						to: createPoint(),
						style: z.enum(["solid", "dashed", "dotted"]),
						color: z
							.string()
							.regex(
								CSS_COLOR_PATTERN,
								"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
							)
					})
					.strict()
					.describe("The mirror line for reflection.")
			})
			.strict(),
		z
			.object({
				type: z.literal("rotation"),
				centerOfRotation: createPoint().describe("Fixed point around which rotation occurs."),
				angle: z.number().describe("Rotation angle in degrees. Positive is counter-clockwise (e.g., 90, -45, 180).")
			})
			.strict(),
		z
			.object({
				type: z.literal("dilation"),
				centerOfDilation: createPoint().describe("Fixed point from which scaling occurs."),
				scaleFactor: z.number().describe("Scaling factor for dilation. Values > 1 enlarge, 0 < values < 1 shrink.")
			})
			.strict()
	])
}

const AngleMark = z
	.object({
		vertexIndex: z
			.number()
			.describe(
				"Zero-based index of the vertex where angle is marked. Must be valid index into vertices array (e.g., 0, 1, 2)."
			),
		radius: z
			.number()
			.describe(
				"Radius of the angle arc in pixels (e.g., 20, 30, 25). Larger values create wider arcs. Use consistent radius for similar angles."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === null || val.trim() === "" || val.trim().toLowerCase() === "null" ? null : val.trim()))
			.describe(
				"Angle measurement or name (e.g., '90°', '45°', '∠ABC', 'θ', null). Null shows arc without label. Positioned near the arc."
			),
		labelDistance: z
			.number()
			.describe(
				"Distance from vertex to place the label in pixels (e.g., 40, 50, 35). Should be beyond the arc radius to avoid overlap."
			)
	})
	.strict()

export const TransformationDiagramPropsSchema = z
	.object({
		type: z
			.literal("transformationDiagram")
			.describe(
				"Identifies this as a transformation diagram showing geometric transformations with detailed annotations."
			),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 600, 700, 500). Must accommodate both shapes, labels, and transformation elements."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 500, 600, 400). Should fit pre-image, image, and any transformation aids."
			),
		preImage: createShapeSchema().describe(
			"The original shape before transformation. All properties (vertices, labels, angles, sides) are preserved in the transformation."
		),
		transformation: createTransformationSchema().describe(
			"Details of how preImage transforms to image. Include visual aids like vectors, reflection lines, or rotation centers."
		),
	})
	.strict()
	.describe(
		"Creates detailed geometric transformation diagrams showing pre-image and image shapes with comprehensive annotations including vertex labels, angle marks, side lengths, and transformation-specific visual aids. Perfect for teaching reflections, rotations, translations, and dilations with full mathematical notation."
	)

export type TransformationDiagramProps = z.infer<typeof TransformationDiagramPropsSchema>

/**
 * Generates an SVG diagram illustrating a geometric transformation.
 */
export const generateTransformationDiagram: WidgetGenerator<typeof TransformationDiagramPropsSchema> = async (props) => {
	const { width, height, preImage, transformation } = props

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})


	const calculateCentroid = (vertices: Array<{ x: number; y: number }>) => {
		const centroid = vertices.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
		centroid.x /= vertices.length
		centroid.y /= vertices.length
		return centroid
	}

	const rotatePoint = (p: { x: number; y: number }, center: { x: number; y: number }, angleDeg: number) => {
		const rad = (angleDeg * Math.PI) / 180
		const tx = p.x - center.x
		const ty = p.y - center.y
		return {
			x: tx * Math.cos(rad) - ty * Math.sin(rad) + center.x,
			y: tx * Math.sin(rad) + ty * Math.cos(rad) + center.y
		}
	}

	const reflectPointAcrossLine = (
		p: { x: number; y: number },
		a: { x: number; y: number },
		b: { x: number; y: number }
	) => {
		const vx = b.x - a.x
		const vy = b.y - a.y
		const len = Math.hypot(vx, vy)
		if (len === 0) {
			logger.error("reflection line degenerate", { from: a, to: b })
			throw errors.new("reflection line must have nonzero length")
		}
		const ux = vx / len
		const uy = vy / len
		const wx = p.x - a.x
		const wy = p.y - a.y
		const dot = wx * ux + wy * uy
		const projx = dot * ux
		const projy = dot * uy
		const perpx = wx - projx
		const perpy = wy - projy
		return { x: a.x + projx - perpx, y: a.y + projy - perpy }
	}

	let imageVertices: Array<{ x: number; y: number }> = []
	switch (transformation.type) {
		case "translation":
			imageVertices = preImage.vertices.map((p) => ({ x: p.x + transformation.vector.x, y: p.y + transformation.vector.y }))
			break
		case "rotation":
			imageVertices = preImage.vertices.map((p) => rotatePoint(p, transformation.centerOfRotation, transformation.angle))
			break
		case "reflection":
			const { from, to } = transformation.lineOfReflection
			imageVertices = preImage.vertices.map((p) => reflectPointAcrossLine(p, from, to))
			break
		case "dilation":
			const c = transformation.centerOfDilation
			const s = transformation.scaleFactor
			imageVertices = preImage.vertices.map((p) => ({ x: c.x + s * (p.x - c.x), y: c.y + s * (p.y - c.y) }))
			break
	}

	// FIX: Use separate functions for nullable (shape label) and non-nullable (vertex labels) to fix type error.
	const addPrimeToNullable = (label: string | null): string | null => (label ? `${label}′` : null)
	const addPrime = (label: string): string => `${label}′`

	const image: TransformationDiagramProps["preImage"] = {
		...preImage,
		vertices: imageVertices,
		label: addPrimeToNullable(preImage.label),
		vertexLabels: preImage.vertexLabels.map(addPrime),
		sideLengths: [] // Side lengths are not transferred as they change in dilation
	}

	let centerPoint: { x: number; y: number } | null = null
	if (transformation.type === "rotation") centerPoint = transformation.centerOfRotation
	if (transformation.type === "dilation") centerPoint = transformation.centerOfDilation

	let centerPointInfo: { x: number; y: number; label: string | null; style: string } | undefined
	const otherPoints: Array<{ x: number; y: number; label: string | null; style: string }> = []

	const allPoints = [...preImage.vertices, ...image.vertices]
	if (centerPoint) allPoints.push(centerPoint)
	if (transformation.type === "reflection") allPoints.push(transformation.lineOfReflection.from, transformation.lineOfReflection.to)

	const minX = Math.min(...allPoints.map((p) => p.x))
	const maxX = Math.max(...allPoints.map((p) => p.x))
	const minY = Math.min(...allPoints.map((p) => p.y))
	const maxY = Math.max(...allPoints.map((p) => p.y))

	const dataWidth = maxX - minX
	const dataHeight = maxY - minY

	const padding = PADDING * 2
	const availableWidth = width - 2 * padding
	const availableHeight = height - 2 * padding

	const scaleX = dataWidth > 1e-9 ? availableWidth / dataWidth : 1
	const scaleY = dataHeight > 1e-9 ? availableHeight / dataHeight : 1
	const scale = Math.max(1e-9, Math.min(scaleX, scaleY))

	const dataCenterX = (minX + maxX) / 2
	const dataCenterY = (minY + maxY) / 2
	const svgCenterX = width / 2
	const svgCenterY = height / 2

	const toSvgX = (x: number) => svgCenterX + (x - dataCenterX) * scale
	const toSvgY = (y: number) => svgCenterY - (y - dataCenterY) * scale

	const drawPolygon = (shape: TransformationDiagramProps["preImage"], isImage: boolean) => {
		const polygonPoints = shape.vertices.map((p) => ({ x: toSvgX(p.x), y: toSvgY(p.y) }))
		const strokeWidth = isImage ? 2.5 : 2
		const dash = isImage ? "4 4" : undefined

		canvas.drawPolygon(polygonPoints, {
			fill: shape.fillColor,
			stroke: shape.strokeColor,
			strokeWidth: strokeWidth,
			dash: dash
		})
	}

	const drawLine = (
		line: { from: { x: number; y: number }; to: { x: number; y: number }; style: string; color: string }
	) => {
		let dash: string | undefined
		if (line.style === "dashed") dash = "8 6"
		else if (line.style === "dotted") dash = "2 4"

		canvas.drawLine(toSvgX(line.from.x), toSvgY(line.from.y), toSvgX(line.to.x), toSvgY(line.to.y), {
			stroke: line.color,
			strokeWidth: theme.stroke.width.thick,
			dash
		})
	}

	const drawRotationArc = (center: { x: number; y: number }, startPoint: { x: number; y: number }, angle: number) => {
		const radius = Math.hypot(startPoint.x - center.x, startPoint.y - center.y)
		const arcRadius = Math.min(radius * 0.6, 30)

		const startAngleRad = Math.atan2(startPoint.y - center.y, startPoint.x - center.x)
		const endAngleRad = startAngleRad + (angle * Math.PI) / 180

		const svgArcRadius = arcRadius * scale
		const startX = toSvgX(center.x) + svgArcRadius * Math.cos(startAngleRad)
		const startY = toSvgY(center.y) - svgArcRadius * Math.sin(startAngleRad)
		const endX = toSvgX(center.x) + svgArcRadius * Math.cos(endAngleRad)
		const endY = toSvgY(center.y) - svgArcRadius * Math.sin(endAngleRad)

		const largeArcFlag = Math.abs(angle) > 180 ? 1 : 0
		const sweepFlag = angle > 0 ? 1 : 0

		const arcPath = new Path2D().moveTo(startX, startY).arcTo(svgArcRadius, svgArcRadius, 0, largeArcFlag, sweepFlag, endX, endY)

		canvas.drawPath(arcPath, { stroke: theme.colors.actionSecondary, strokeWidth: theme.stroke.width.thick, fill: "none" })
	}

	const drawVertexLabels = (
		shape: TransformationDiagramProps["preImage"],
		extraOffset: number | Array<number> = 0
	) => {
		for (let i = 0; i < shape.vertices.length; i++) {
			const vertex = shape.vertices[i]
			const label = shape.vertexLabels[i]
			if (!vertex || !label) continue

			const perVertexExtraOffset = Array.isArray(extraOffset) ? extraOffset[i] ?? 0 : extraOffset
			const labelOffset = 16 + perVertexExtraOffset

			const prevVertex = shape.vertices[(i - 1 + shape.vertices.length) % shape.vertices.length]
			const nextVertex = shape.vertices[(i + 1) % shape.vertices.length]
			if (!prevVertex || !nextVertex) continue
			
			const v_prev_x = prevVertex.x - vertex.x
			const v_prev_y = prevVertex.y - vertex.y
			const v_next_x = nextVertex.x - vertex.x
			const v_next_y = nextVertex.y - vertex.y

			const len_prev = Math.hypot(v_prev_x, v_prev_y)
			const len_next = Math.hypot(v_next_x, v_next_y)

			const u_prev_x = len_prev > 0 ? v_prev_x / len_prev : 0
			const u_prev_y = len_prev > 0 ? v_prev_y / len_prev : 0
			const u_next_x = len_next > 0 ? v_next_x / len_next : 0
			const u_next_y = len_next > 0 ? v_next_y / len_next : 0

			let bisectorX = u_prev_x + u_next_x
			let bisectorY = u_prev_y + u_next_y
			const len_bisector = Math.hypot(bisectorX, bisectorY)

			if (len_bisector < 1e-9) {
				bisectorX = -u_prev_y
				bisectorY = u_prev_x
			} else {
				bisectorX /= len_bisector
				bisectorY /= len_bisector
			}

			const centroid = calculateCentroid(shape.vertices)
			const centroidVecX = vertex.x - centroid.x
			const centroidVecY = vertex.y - centroid.y

			if (bisectorX * centroidVecX + bisectorY * centroidVecY < 0) {
				bisectorX = -bisectorX
				bisectorY = -bisectorY
			}

			const labelX = toSvgX(vertex.x) + bisectorX * labelOffset
			const labelY = toSvgY(vertex.y) - bisectorY * labelOffset

			canvas.drawText({
				x: labelX,
				y: labelY,
				text: label,
				anchor: "middle",
				dominantBaseline: "middle",
				fontPx: theme.font.size.medium,
				fontWeight: theme.font.weight.bold,
				fill: theme.colors.text
			})
		}
	}

	const drawAngleMark = (
		vertices: Array<{ x: number; y: number }>,
		mark: z.infer<typeof AngleMark>,
		strokeColor: string
	) => {
		if (mark.vertexIndex < 0 || mark.vertexIndex >= vertices.length) return
		const vertex = vertices[mark.vertexIndex]
		const prevVertex = vertices[(mark.vertexIndex - 1 + vertices.length) % vertices.length]
		const nextVertex = vertices[(mark.vertexIndex + 1) % vertices.length]
		if (!vertex || !prevVertex || !nextVertex) return

		let angle1 = Math.atan2(prevVertex.y - vertex.y, prevVertex.x - vertex.x)
		let angle2 = Math.atan2(nextVertex.y - vertex.y, nextVertex.x - vertex.x)

		const crossProduct = (nextVertex.x - vertex.x) * (prevVertex.y - vertex.y) - (nextVertex.y - vertex.y) * (prevVertex.x - vertex.x)
		if (crossProduct > 0) [angle1, angle2] = [angle2, angle1]

		const svgRadius = mark.radius * scale
		const svgVertexX = toSvgX(vertex.x)
		const svgVertexY = toSvgY(vertex.y)

		const startX = svgVertexX + svgRadius * Math.cos(-angle1)
		const startY = svgVertexY + svgRadius * Math.sin(-angle1)
		const endX = svgVertexX + svgRadius * Math.cos(-angle2)
		const endY = svgVertexY + svgRadius * Math.sin(-angle2)

		let angleDiff = angle2 - angle1
		if (angleDiff < 0) angleDiff += 2 * Math.PI
		// Determine whether the small-arc bisector points toward the shape centroid.
		// If it does, render the external (large) arc so the concave side faces away from the center.
		const centroid = calculateCentroid(vertices)
		const dirToCentroidX = centroid.x - vertex.x
		const dirToCentroidY = centroid.y - vertex.y
		const midAngle = angle1 + angleDiff / 2
		const midDirX = Math.cos(midAngle)
		const midDirY = Math.sin(midAngle)
		const pointsTowardCentroid = midDirX * dirToCentroidX + midDirY * dirToCentroidY > 0
		// We want the interior (small) arc when its bisector points toward the centroid; otherwise use the exterior arc
		const largeArcFlag: 0 | 1 = pointsTowardCentroid ? 0 : 1

		// Determine sweep direction in SVG coords (angles increase clockwise).
		const startScreen = ((-angle1) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
		const endScreen = ((-angle2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
		const cwDiff = (endScreen - startScreen + 2 * Math.PI) % (2 * Math.PI)
		const clockwiseIsSmall = cwDiff <= Math.PI
		const sweepFlag: 0 | 1 = largeArcFlag === 0 ? (clockwiseIsSmall ? 1 : 0) : (clockwiseIsSmall ? 0 : 1)

		const markPath = new Path2D().moveTo(startX, startY).arcTo(svgRadius, svgRadius, 0, largeArcFlag, sweepFlag, endX, endY)
		canvas.drawPath(markPath, { stroke: strokeColor, strokeWidth: 1.5, fill: "none" })

		if (mark.label) {
			// Always label the interior angle: choose the radial direction that points toward the polygon centroid
			const labelAngle = pointsTowardCentroid ? midAngle : midAngle + Math.PI
			// Push label center far enough from the arc to avoid clashes.
			// Use half the text height (since we place the text's center) plus extra clearance.
			const LABEL_FONT = 13
			const LABEL_HALF_HEIGHT = LABEL_FONT / 2
			const CLEARANCE = 10
			const minDistanceFromCenter = svgRadius + LABEL_HALF_HEIGHT + CLEARANCE
			const svgLabelDistance = Math.max(mark.labelDistance * scale, minDistanceFromCenter)
			const labelX = svgVertexX + svgLabelDistance * Math.cos(-labelAngle)
			const labelY = svgVertexY + svgLabelDistance * Math.sin(-labelAngle)
			canvas.drawText({
				x: labelX,
				y: labelY,
				text: mark.label,
				anchor: "middle",
				dominantBaseline: "middle",
				fontPx: LABEL_FONT,
				fill: theme.colors.text
			})
		}
	}

	const drawPoint = (point: { x: number; y: number; label: string | null; style: string }) => {
		const svgX = toSvgX(point.x)
		const svgY = toSvgY(point.y)
		const radius = 4
		const style = point.style === "circle" ? { fill: "none", stroke: theme.colors.text, strokeWidth: theme.stroke.width.thick } : { fill: theme.colors.highlightPrimary, stroke: theme.colors.white, strokeWidth: theme.stroke.width.thin }
		canvas.drawCircle(svgX, svgY, radius, style)
		if (point.label) {
			canvas.drawText({
				x: svgX,
				y: svgY - 12,
				text: point.label,
				anchor: "middle",
				dominantBaseline: "baseline",
				fontPx: theme.font.size.medium,
				fontWeight: theme.font.weight.bold,
				fill: theme.colors.text
			})
		}
	}

	const drawSideLengths = (shape: TransformationDiagramProps["preImage"]) => {
		for (let i = 0; i < shape.vertices.length; i++) {
			const sideLength = shape.sideLengths[i]
			if (!sideLength || !sideLength.value) continue

			const p1 = shape.vertices[i]
			const p2 = shape.vertices[(i + 1) % shape.vertices.length]
			if (!p1 || !p2) continue

			const midX = (p1.x + p2.x) / 2
			const midY = (p1.y + p2.y) / 2
			const dx = p2.x - p1.x
			const dy = p2.y - p1.y
			const len = Math.hypot(dx, dy)
			if (len < 1e-9) continue
			const perpX = -dy / len
			const perpY = dx / len

			const centroid = calculateCentroid(shape.vertices)
			const centroidVecX = midX - centroid.x
			const centroidVecY = midY - centroid.y
			const dot = perpX * centroidVecX + perpY * centroidVecY

			let finalPerpX = perpX
			let finalPerpY = perpY

			if ((sideLength.position === "inside" && dot > 0) || (sideLength.position === "outside" && dot < 0)) {
				finalPerpX = -perpX
				finalPerpY = -perpY
			}

			const labelX = toSvgX(midX) + finalPerpX * sideLength.offset
			const labelY = toSvgY(midY) - finalPerpY * sideLength.offset

			canvas.drawText({
				x: labelX,
				y: labelY,
				text: sideLength.value,
				anchor: "middle",
				dominantBaseline: "middle",
				fontPx: 13,
				fill: theme.colors.text
			})
		}
	}

	if (transformation.type === "reflection") {
		drawLine(transformation.lineOfReflection)
	}

	drawPolygon(preImage, false)
	drawPolygon(image, true)

	preImage.angleMarks.forEach((mark) => drawAngleMark(preImage.vertices, mark, preImage.strokeColor))
	image.angleMarks.forEach((mark) => drawAngleMark(image.vertices, mark, image.strokeColor))

	// When dilation scale is very close to 1, pre-image and image labels can overlap.
	// Nudge the image labels outward with a small additional offset to avoid overlap.
	let imageLabelExtraOffset: number | Array<number> = 0
	if (transformation.type === "dilation") {
		const s = transformation.scaleFactor
		const defaultNudge = Math.abs(s - 1) < 0.05 ? 14 : 0
		const perVertex: Array<number> = new Array(image.vertices.length).fill(defaultNudge)
		const count = Math.min(preImage.vertices.length, image.vertices.length)
		for (let i = 0; i < count; i++) {
			const p = preImage.vertices[i]
			const q = image.vertices[i]
			if (!p || !q) continue
			const dx = p.x - q.x
			const dy = p.y - q.y
			const d = Math.hypot(dx, dy)
			if (d < 1e-9) {
				const val = perVertex[i]
				let currentOffset: number
				if (val === undefined) currentOffset = defaultNudge
				else currentOffset = val
				if (currentOffset < 16) currentOffset = 16
				perVertex[i] = currentOffset
			}
		}
		imageLabelExtraOffset = perVertex
	}

	drawVertexLabels(preImage)
	drawVertexLabels(image, imageLabelExtraOffset)
	drawSideLengths(preImage)

	if (centerPoint) {
		drawPoint(centerPointInfo ?? { ...centerPoint, label: "P", style: "dot" })
	}

	switch (transformation.type) {
		case "rotation":
			break
		case "reflection":
			for (let i = 0; i < preImage.vertices.length; i++) {
				const preVertex = preImage.vertices[i]
				const imgVertex = image.vertices[i]
				if (preVertex && imgVertex) {
					drawLine({ from: preVertex, to: imgVertex, style: "dotted", color: theme.colors.gridMinor })
				}
			}
			break
		case "dilation":
			for (let i = 0; i < preImage.vertices.length; i++) {
				const preVertex = preImage.vertices[i]
				const imgVertex = image.vertices[i]
				if (preVertex && imgVertex) {
					canvas.drawCircle(toSvgX(preVertex.x), toSvgY(preVertex.y), 2, { fill: theme.colors.highlightPrimary, fillOpacity: 0.6 })
					canvas.drawCircle(toSvgX(imgVertex.x), toSvgY(imgVertex.y), 2.5, { fill: theme.colors.highlightPrimary })
				}
			}
			break
	}

	// no-op: general markers removed

	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)
	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`
}