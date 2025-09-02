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
				.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
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
								.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val)),
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
				scaleFactor: z.number().describe("Scaling factor for dilation. Values > 1 enlarge, 0 < values < 1 shrink."),
				showRays: z
					.boolean()
					.describe("Whether to draw rays from center through corresponding vertices. Shows scaling direction.")
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
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
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
		additionalPoints: z
			.array(
				z
					.object({
						x: z.number(),
						y: z.number(),
						label: z
							.string()
							.nullable()
							.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
							.describe("Point label (e.g., 'O', 'Center', 'C', null). Positioned near the point."),
						style: z
							.enum(["dot", "circle"])
							.describe("Visual style. 'dot' for filled point, 'circle' for hollow point.")
					})
					.strict()
			)
			.describe(
				"Extra labeled points (e.g., rotation center, reference points). Empty array means no additional points."
			)
	})
	.strict()
	.describe(
		"Creates detailed geometric transformation diagrams showing pre-image and image shapes with comprehensive annotations including vertex labels, angle marks, side lengths, and transformation-specific visual aids. Perfect for teaching reflections, rotations, translations, and dilations with full mathematical notation."
	)

export type TransformationDiagramProps = z.infer<typeof TransformationDiagramPropsSchema>

/**
 * Generates an SVG diagram illustrating a geometric transformation.
 */
export const generateTransformationDiagram: WidgetGenerator<typeof TransformationDiagramPropsSchema> = (props) => {
	const { width, height, preImage, transformation, additionalPoints } = props

	// Initialize the canvas
	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	// Validation now handled by schema; preImage already guaranteed to have >=3 vertices and matching labels
	canvas.addDef(
		`<marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.colors.highlightPrimary}"/></marker>`
	)

	// Helper function needed for coordinate calculations
	const calculateCentroid = (vertices: Array<{ x: number; y: number }>) => {
		const centroid = vertices.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
		centroid.x /= vertices.length
		centroid.y /= vertices.length
		return centroid
	}

	// Transformation helpers
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

	// 2. Compute image from preImage + transformation
	let imageVertices: Array<{ x: number; y: number }> = []
	switch (transformation.type) {
		case "translation": {
			const v = transformation.vector
			imageVertices = preImage.vertices.map((p) => ({ x: p.x + v.x, y: p.y + v.y }))
			break
		}
		case "rotation": {
			const c = transformation.centerOfRotation
			imageVertices = preImage.vertices.map((p) => rotatePoint(p, c, transformation.angle))
			break
		}
		case "reflection": {
			const { from, to } = transformation.lineOfReflection
			imageVertices = preImage.vertices.map((p) => reflectPointAcrossLine(p, from, to))
			break
		}
		case "dilation": {
			const c = transformation.centerOfDilation
			const s = transformation.scaleFactor
			if (typeof s !== "number") {
				logger.error("missing scale factor for dilation")
				throw errors.new("dilation requires scale factor")
			}
			imageVertices = preImage.vertices.map((p) => ({ x: c.x + s * (p.x - c.x), y: c.y + s * (p.y - c.y) }))
			break
		}
	}

	const addPrime = (label: string) => `${label}′`
	const image = {
		vertices: imageVertices,
		label: preImage.label ? addPrime(preImage.label) : null,
		fillColor: preImage.fillColor,
		strokeColor: preImage.strokeColor,
		vertexLabels: preImage.vertexLabels.map(addPrime),
		angleMarks: preImage.angleMarks,
		sideLengths: []
	}

	// 3. Calculate bounds for ALL points that need to be visible
	let allPoints = [...preImage.vertices, ...image.vertices]
	if (additionalPoints.length > 0) {
		allPoints.push(...additionalPoints)
	}
	if (transformation.type === "rotation") {
		allPoints.push(transformation.centerOfRotation)
	} else if (transformation.type === "dilation") {
		allPoints.push(transformation.centerOfDilation)
	}
	if (transformation.type === "reflection") {
		allPoints.push(transformation.lineOfReflection.from, transformation.lineOfReflection.to)
	}

	const minX = Math.min(...allPoints.map((p) => p.x))
	const maxX = Math.max(...allPoints.map((p) => p.x))
	const minY = Math.min(...allPoints.map((p) => p.y))
	const maxY = Math.max(...allPoints.map((p) => p.y))

	const dataWidth = maxX - minX
	const dataHeight = maxY - minY

	// 3. Create robust coordinate transformation with proper padding
	const padding = PADDING * 2
	const availableWidth = width - 2 * padding
	const availableHeight = height - 2 * padding

	// Ensure minimum scale to prevent microscopic shapes
	const scaleX = dataWidth > 0 ? availableWidth / dataWidth : 1
	const scaleY = dataHeight > 0 ? availableHeight / dataHeight : 1
	const scale = Math.min(scaleX, scaleY, 10) // Cap maximum scale at 10

	// Use the center of the bounding box as the data center (simple and reliable)
	const dataCenterX = (minX + maxX) / 2
	const dataCenterY = (minY + maxY) / 2

	// Center the data in the SVG canvas
	const svgCenterX = width / 2
	const svgCenterY = height / 2

	// Transform coordinate system: data coordinates -> SVG coordinates
	const toSvgX = (x: number) => svgCenterX + (x - dataCenterX) * scale
	const toSvgY = (y: number) => svgCenterY - (y - dataCenterY) * scale // Flip Y axis

	const drawPolygon = (shape: TransformationDiagramProps["preImage"], isImage: boolean) => {
		const polygonPoints = shape.vertices.map((p) => ({ x: toSvgX(p.x), y: toSvgY(p.y) }))
		const strokeWidth = isImage ? 2.5 : 2

		canvas.drawPolygon(polygonPoints, {
			fill: shape.fillColor,
			stroke: shape.strokeColor,
			strokeWidth: strokeWidth
		})

		// Add shape label at centroid if provided
		if (shape.label) {
			const centroid = calculateCentroid(shape.vertices)
			const svgCentroidX = toSvgX(centroid.x)
			const svgCentroidY = toSvgY(centroid.y)
			canvas.drawText({
				x: svgCentroidX,
				y: svgCentroidY,
				text: shape.label,
				anchor: "middle",
				dominantBaseline: "middle",
				fontPx: theme.font.size.medium,
				fontWeight: theme.font.weight.bold,
				fill: theme.colors.text
			})
		}
	}

	const drawLine = (
		line: { from: { x: number; y: number }; to: { x: number; y: number }; style: string; color: string },
		hasArrow: boolean
	) => {
		let dash: string | undefined
		if (line.style === "dashed") {
			dash = "8 6"
		} else if (line.style === "dotted") {
			dash = "2 4"
		}
		const markerEnd = hasArrow ? "url(#arrowhead)" : undefined

		canvas.drawLine(toSvgX(line.from.x), toSvgY(line.from.y), toSvgX(line.to.x), toSvgY(line.to.y), {
			stroke: line.color,
			strokeWidth: theme.stroke.width.thick,
			dash,
			markerEnd
		})
	}

	const drawRotationArc = (center: { x: number; y: number }, startPoint: { x: number; y: number }, angle: number) => {
		const radius = Math.sqrt((startPoint.x - center.x) ** 2 + (startPoint.y - center.y) ** 2)
		const arcRadius = Math.min(radius * 0.6, 30) // Keep arc visible but not overwhelming

		const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x)
		const endAngle = startAngle + (angle * Math.PI) / 180

		const startX = toSvgX(center.x + arcRadius * Math.cos(startAngle))
		const startY = toSvgY(center.y + arcRadius * Math.sin(startAngle))
		const endX = toSvgX(center.x + arcRadius * Math.cos(endAngle))
		const endY = toSvgY(center.y + arcRadius * Math.sin(endAngle))

		const largeArcFlag: 0 | 1 = Math.abs(angle) > 180 ? 1 : 0
		const sweepFlag: 0 | 1 = angle > 0 ? 0 : 1 // Flip sweep direction for Y-axis flip in SVG coordinates

		const arcPath = new Path2D()
			.moveTo(startX, startY)
			.arcTo(arcRadius * scale, arcRadius * scale, 0, largeArcFlag, sweepFlag, endX, endY)

		canvas.drawPath(arcPath, {
			stroke: theme.colors.actionSecondary,
			strokeWidth: theme.stroke.width.thick,
			fill: "none",
			markerEnd: "url(#arrowhead)"
		})
	}

	const drawVertexLabels = (shape: TransformationDiagramProps["preImage"]) => {
		if (shape.vertexLabels.length === 0) {
			return
		}

		const labelOffset = 16 // Offset in SVG pixels, not data coordinates

		for (let i = 0; i < shape.vertices.length; i++) {
			const vertex = shape.vertices[i]
			const label = shape.vertexLabels[i]
			if (!vertex || !label) continue

			// Transform vertex to SVG coordinates first
			const svgX = toSvgX(vertex.x)
			const svgY = toSvgY(vertex.y)

			// Calculate shape centroid in SVG coordinates
			const centroid = calculateCentroid(shape.vertices)
			const svgCentroidX = toSvgX(centroid.x)
			const svgCentroidY = toSvgY(centroid.y)

			// Vector from centroid to vertex in SVG space (outward direction)
			const dx = svgX - svgCentroidX
			const dy = svgY - svgCentroidY
			const len = Math.sqrt(dx * dx + dy * dy)

			// Normalize and scale for label offset in SVG pixels
			const offsetX = len > 0 ? (dx / len) * labelOffset : 0
			const offsetY = len > 0 ? (dy / len) * labelOffset : -labelOffset

			const labelX = svgX + offsetX
			const labelY = svgY + offsetY

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
		if (mark.vertexIndex < 0 || mark.vertexIndex >= vertices.length) {
			return
		}

		const vertex = vertices[mark.vertexIndex]
		const prevVertex = vertices[(mark.vertexIndex - 1 + vertices.length) % vertices.length]
		const nextVertex = vertices[(mark.vertexIndex + 1) % vertices.length]

		if (!vertex || !prevVertex || !nextVertex) {
			return
		}

		// Calculate angles for the arc in data coordinates
		const angle1 = Math.atan2(prevVertex.y - vertex.y, prevVertex.x - vertex.x)
		const angle2 = Math.atan2(nextVertex.y - vertex.y, nextVertex.x - vertex.x)

		// Normalize angles to [0, 2π]
		let startAngle = angle1
		let endAngle = angle2

		// Ensure we draw the interior angle
		if (endAngle < startAngle) {
			endAngle += 2 * Math.PI
		}
		if (endAngle - startAngle > Math.PI) {
			;[startAngle, endAngle] = [endAngle, startAngle + 2 * Math.PI]
		}

		// Use scaled radius for SVG coordinates
		const svgRadius = mark.radius * scale
		const svgVertexX = toSvgX(vertex.x)
		const svgVertexY = toSvgY(vertex.y)

		// Calculate arc endpoints in SVG coordinates
		// Note: Need to flip Y angles because SVG Y-axis is flipped
		const startX = svgVertexX + svgRadius * Math.cos(startAngle)
		const startY = svgVertexY + svgRadius * Math.sin(-startAngle) // Flip Y
		const endX = svgVertexX + svgRadius * Math.cos(endAngle)
		const endY = svgVertexY + svgRadius * Math.sin(-endAngle) // Flip Y

		const largeArcFlag: 0 | 1 = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0
		const sweepFlag: 0 | 1 = 0 // Use 0 for correct direction in flipped Y coordinates

		const markPath = new Path2D()
			.moveTo(startX, startY)
			.arcTo(svgRadius, svgRadius, 0, largeArcFlag, sweepFlag, endX, endY)

		canvas.drawPath(markPath, {
			stroke: strokeColor,
			strokeWidth: Math.max(1, 1.5),
			fill: "none"
		})

		// Add label if provided
		if (mark.label) {
			const midAngle = (startAngle + endAngle) / 2
			const svgLabelDistance = mark.labelDistance * scale
			const labelX = svgVertexX + svgLabelDistance * Math.cos(midAngle)
			const labelY = svgVertexY + svgLabelDistance * Math.sin(-midAngle) // Flip Y
			const fontSize = Math.max(11, 13)

			canvas.drawText({
				x: labelX,
				y: labelY,
				text: mark.label,
				anchor: "middle",
				dominantBaseline: "middle",
				fontPx: fontSize,
				fill: theme.colors.text
			})
		}
	}

	const drawAdditionalPoint = (point: { x: number; y: number; label: string | null; style: string }) => {
		const radius = 4
		const svgX = toSvgX(point.x)
		const svgY = toSvgY(point.y)

		if (point.style === "circle") {
			canvas.drawCircle(svgX, svgY, radius, {
				fill: "none",
				stroke: theme.colors.text,
				strokeWidth: theme.stroke.width.thick
			})
		} else {
			// dot style
			canvas.drawCircle(svgX, svgY, radius, {
				fill: theme.colors.text
			})
		}

		// Label offset to avoid overlapping with the point
		if (point.label) {
			const labelOffset = 12
			canvas.drawText({
				x: svgX,
				y: svgY - labelOffset,
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
		if (shape.sideLengths.length === 0) {
			return
		}

		const fontSize = Math.max(11, 13)

		for (let i = 0; i < shape.vertices.length; i++) {
			const sideLength = shape.sideLengths[i]
			if (!sideLength) continue

			const vertex1 = shape.vertices[i]
			const vertex2 = shape.vertices[(i + 1) % shape.vertices.length]
			if (!vertex1 || !vertex2) continue

			// Calculate midpoint of the edge in data coordinates
			const dataMidX = (vertex1.x + vertex2.x) / 2
			const dataMidY = (vertex1.y + vertex2.y) / 2

			// Transform to SVG coordinates
			const svgMidX = toSvgX(dataMidX)
			const svgMidY = toSvgY(dataMidY)

			// Calculate edge direction in SVG coordinates
			const svgVertex1X = toSvgX(vertex1.x)
			const svgVertex1Y = toSvgY(vertex1.y)
			const svgVertex2X = toSvgX(vertex2.x)
			const svgVertex2Y = toSvgY(vertex2.y)

			const svgDx = svgVertex2X - svgVertex1X
			const svgDy = svgVertex2Y - svgVertex1Y
			const svgEdgeLength = Math.sqrt(svgDx * svgDx + svgDy * svgDy)

			// Normalize edge vector in SVG space
			const edgeNormX = svgDx / svgEdgeLength
			const edgeNormY = svgDy / svgEdgeLength

			// Calculate perpendicular vector (rotated 90 degrees)
			let perpX = -edgeNormY
			let perpY = edgeNormX

			// Determine if we need to flip the perpendicular based on position preference
			const centroid = calculateCentroid(shape.vertices)
			const svgCentroidX = toSvgX(centroid.x)
			const svgCentroidY = toSvgY(centroid.y)

			if (sideLength.position === "inside") {
				// Check if perpendicular points outward by testing with centroid
				const testX = svgMidX + perpX * 10
				const testY = svgMidY + perpY * 10
				const distToCentroid = Math.sqrt((testX - svgCentroidX) ** 2 + (testY - svgCentroidY) ** 2)
				const midDistToCentroid = Math.sqrt((svgMidX - svgCentroidX) ** 2 + (svgMidY - svgCentroidY) ** 2)

				// If test point is further from centroid, flip the perpendicular
				if (distToCentroid > midDistToCentroid) {
					perpX = -perpX
					perpY = -perpY
				}
			} else {
				// For outside position, ensure perpendicular points away from centroid
				const testX = svgMidX + perpX * 10
				const testY = svgMidY + perpY * 10
				const distToCentroid = Math.sqrt((testX - svgCentroidX) ** 2 + (testY - svgCentroidY) ** 2)
				const midDistToCentroid = Math.sqrt((svgMidX - svgCentroidX) ** 2 + (svgMidY - svgCentroidY) ** 2)

				// If test point is closer to centroid, flip the perpendicular
				if (distToCentroid < midDistToCentroid) {
					perpX = -perpX
					perpY = -perpY
				}
			}

			// Position the label in SVG coordinates
			const svgOffset = sideLength.offset * scale
			const labelX = svgMidX + perpX * svgOffset
			const labelY = svgMidY + perpY * svgOffset

			// Always orient text horizontally (angle = 0) so it faces down/right
			const angle = 0

			canvas.drawText({
				x: labelX,
				y: labelY,
				text: sideLength.value,
				anchor: "middle",
				dominantBaseline: "middle",
				fontPx: fontSize,
				fill: theme.colors.text,
				transform: `rotate(${angle} ${labelX} ${labelY})`
			})
		}
	}

	// 4. Draw Transformation-Specific Background Elements (like lines and rays)
	if (transformation.type === "reflection") {
		drawLine(transformation.lineOfReflection, false)
	}

	// Draw dilation rays BEHIND the shapes for proper layering
	if (
		transformation.type === "dilation" &&
		transformation.showRays &&
		preImage.vertices.length === image.vertices.length
	) {
		const center = transformation.centerOfDilation
		for (let i = 0; i < preImage.vertices.length; i++) {
			const preVertex = preImage.vertices[i]
			const imageVertex = image.vertices[i]
			if (preVertex && imageVertex) {
				// Calculate ray direction from center through both points
				const dx = imageVertex.x - center.x
				const dy = imageVertex.y - center.y
				const rayLength = Math.sqrt(dx * dx + dy * dy)

				// Limit extension to a reasonable amount relative to the canvas
				const maxExtension = (Math.min(width, height) * 0.3) / scale // Convert to data units
				const extensionLength = Math.min(rayLength * 0.3, maxExtension)

				// Calculate extended endpoint
				const extendedX = center.x + (dx / rayLength) * (rayLength + extensionLength)
				const extendedY = center.y + (dy / rayLength) * (rayLength + extensionLength)

				// Draw ray from center through both vertices (behind shapes)
				drawLine(
					{
						from: center,
						to: { x: extendedX, y: extendedY },
						style: "solid",
						color: theme.colors.highlightPrimary
					},
					false
				)
			}
		}
	}

	// 5. Draw Main Shapes with proper layering
	drawPolygon(preImage, false)
	drawPolygon(image, true)

	// 5a. Draw angle marks for both shapes
	for (const mark of preImage.angleMarks) {
		drawAngleMark(preImage.vertices, mark, preImage.strokeColor)
	}
	for (const mark of image.angleMarks) {
		drawAngleMark(image.vertices, mark, image.strokeColor)
	}

	// 5b. Draw vertex labels for both shapes
	drawVertexLabels(preImage)
	drawVertexLabels(image)

	// 5c. Draw side lengths for both shapes
	drawSideLengths(preImage)
	// Intentionally avoid copying side lengths to image since dilation changes values

	// 6. Draw Transformation-Specific Foreground Elements (vectors, centers, vertex indicators)
	switch (transformation.type) {
		case "translation":
			// Remove translation vectors - no more green arrows between shapes
			break
		case "dilation": {
			const center = transformation.centerOfDilation
			const centerRadius = 4

			// Draw vertex correspondence indicators if rays are shown
			if (transformation.showRays && preImage.vertices.length === image.vertices.length) {
				for (let i = 0; i < preImage.vertices.length; i++) {
					const preVertex = preImage.vertices[i]
					const imageVertex = image.vertices[i]
					if (preVertex && imageVertex) {
						// Add small circles at vertices to show correspondence
						const preVertexRadius = 2
						const imageVertexRadius = 2.5

						// Pre-image vertices: smaller, semi-transparent
						const preSvgX = toSvgX(preVertex.x)
						const preSvgY = toSvgY(preVertex.y)
						const imgSvgX = toSvgX(imageVertex.x)
						const imgSvgY = toSvgY(imageVertex.y)

						// Draw vertex correspondence indicators

						canvas.drawCircle(preSvgX, preSvgY, preVertexRadius, {
							fill: theme.colors.highlightPrimary,
							fillOpacity: theme.opacity.overlay,
							stroke: theme.colors.white,
							strokeWidth: theme.stroke.width.thin
						})
						// Image vertices: larger, more prominent
						canvas.drawCircle(imgSvgX, imgSvgY, imageVertexRadius, {
							fill: theme.colors.highlightPrimary,
							stroke: theme.colors.white,
							strokeWidth: theme.stroke.width.thin
						})
					}
				}
			}

			// Draw center point on top of everything
			const centerSvgX = toSvgX(center.x)
			const centerSvgY = toSvgY(center.y)

			// Draw center point on top of everything
			canvas.drawCircle(centerSvgX, centerSvgY, centerRadius, {
				fill: theme.colors.highlightPrimary,
				stroke: theme.colors.white,
				strokeWidth: theme.stroke.width.base
			})
			break
		}
		case "rotation": {
			const center = transformation.centerOfRotation
			const centerRadius = 4
			const centerSvgX = toSvgX(center.x)
			const centerSvgY = toSvgY(center.y)

			// Draw center point
			canvas.drawCircle(centerSvgX, centerSvgY, centerRadius, {
				fill: theme.colors.highlightPrimary,
				stroke: theme.colors.white,
				strokeWidth: theme.stroke.width.thin
			})

			// Draw rotation arc to show angle and direction
			if (preImage.vertices.length > 0) {
				const refPoint = preImage.vertices[0] // Use first vertex as reference
				if (refPoint) {
					drawRotationArc(center, refPoint, transformation.angle)
				}
			}
			break
		}
		case "reflection": {
			// Add perpendicular distance indicators for educational value
			if (preImage.vertices.length === image.vertices.length) {
				for (let i = 0; i < preImage.vertices.length; i++) {
					const preVertex = preImage.vertices[i]
					const imageVertex = image.vertices[i]
					if (preVertex && imageVertex) {
						// Draw light dotted lines showing perpendicular distances
						drawLine(
							{
								from: preVertex,
								to: imageVertex,
								style: "dotted",
								color: theme.colors.gridMinor
							},
							false
						)

						// Add small circles at vertices
						const vertexRadius = 2
						const preSvgX = toSvgX(preVertex.x)
						const preSvgY = toSvgY(preVertex.y)
						const imgSvgX = toSvgX(imageVertex.x)
						const imgSvgY = toSvgY(imageVertex.y)

						// Add small circles at vertices
						canvas.drawCircle(preSvgX, preSvgY, vertexRadius, {
							fill: theme.colors.textSecondary,
							opacity: theme.opacity.overlay
						})
						canvas.drawCircle(imgSvgX, imgSvgY, vertexRadius, {
							fill: theme.colors.textSecondary,
							opacity: theme.opacity.overlay
						})
					}
				}
			}
			break
		}
	}

	// 7. Draw additional points (last so they appear on top)
	for (const point of additionalPoints) {
		drawAdditionalPoint(point)
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`
}
