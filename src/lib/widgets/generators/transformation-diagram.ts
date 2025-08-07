import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a 2D coordinate point for a vertex.
const PointSchema = z
	.object({
		x: z.number().describe("The horizontal coordinate of the point."),
		y: z.number().describe("The vertical coordinate of the point.")
	})
	.strict()

// Defines a line segment, used for reflection lines or visual aids.
const LineSchema = z
	.object({
		from: PointSchema.describe("The starting {x, y} coordinate of the line."),
		to: PointSchema.describe("The ending {x, y} coordinate of the line."),
		style: z
			.enum(["solid", "dashed", "dotted"])
			.nullable()
			.transform((val) => val ?? "solid")
			.describe("The visual style of the line."),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "black")
			.describe("The CSS color of the line.")
	})
	.strict()

// Defines properties for a Translation transformation.
const TranslationSchema = z
	.object({
		type: z.literal("translation"),
		showVectors: z.boolean().describe("If true, draws arrows from pre-image vertices to image vertices.")
	})
	.strict()

// Defines properties for a Reflection transformation.
const ReflectionSchema = z
	.object({
		type: z.literal("reflection"),
		lineOfReflection: z
			.object({
				from: z
					.object({
						x: z.number().describe("The horizontal coordinate of the point."),
						y: z.number().describe("The vertical coordinate of the point.")
					})
					.strict()
					.describe("The starting {x, y} coordinate of the line."),
				to: z
					.object({
						x: z.number().describe("The horizontal coordinate of the point."),
						y: z.number().describe("The vertical coordinate of the point.")
					})
					.strict()
					.describe("The ending {x, y} coordinate of the line."),
				style: z
					.enum(["solid", "dashed", "dotted"])
					.nullable()
					.transform((val) => val ?? "solid")
					.describe("The visual style of the line."),
				color: z
					.string()
					.nullable()
					.transform((val) => val ?? "black")
					.describe("The CSS color of the line.")
			})
			.strict()
			.describe("The line across which the shape is reflected.")
	})
	.strict()

// Defines properties for a Rotation transformation.
const RotationSchema = z
	.object({
		type: z.literal("rotation"),
		centerOfRotation: z
			.object({
				x: z.number().describe("The horizontal coordinate of the point."),
				y: z.number().describe("The vertical coordinate of the point.")
			})
			.strict()
			.describe("The point around which the shape is rotated."),
		angle: z.number().describe("The angle of rotation in degrees (positive is counter-clockwise).")
	})
	.strict()

// Defines properties for a Dilation transformation.
const DilationSchema = z
	.object({
		type: z.literal("dilation"),
		centerOfDilation: z
			.object({
				x: z.number().describe("The horizontal coordinate of the point."),
				y: z.number().describe("The vertical coordinate of the point.")
			})
			.strict()
			.describe("The point from which the shape is scaled."),
		showRays: z.boolean().describe("If true, draws rays from the center through corresponding vertices.")
	})
	.strict()

// Factory function for angle mark schema to prevent $ref generation
const createAngleMarkSchema = () =>
	z
		.object({
			vertexIndex: z.number().describe("The index of the vertex where the angle mark should be drawn."),
			radius: z
				.number()
				.nullable()
				.transform((val) => val ?? 20)
				.describe("The radius of the angle arc in pixels."),
			label: z.string().nullable().describe("The angle label (e.g., '90°', '∠ABC', '166°')."),
			labelDistance: z
				.number()
				.nullable()
				.transform((val) => val ?? 30)
				.describe("Distance from vertex to place the label.")
		})
		.strict()

// Defines an additional labeled point
const AdditionalPointSchema = z
	.object({
		x: z.number().describe("The horizontal coordinate of the point."),
		y: z.number().describe("The vertical coordinate of the point."),
		label: z.string().describe("The label for the point (e.g., 'R', 'P')."),
		style: z
			.enum(["dot", "circle"])
			.nullable()
			.transform((val) => val ?? "dot")
			.describe("The visual style of the point.")
	})
	.strict()

// Factory function for side length schema to prevent $ref generation
const createSideLengthSchema = () =>
	z
		.object({
			value: z.string().describe("The length value to display (e.g., '5', '3.14', 'x')."),
			position: z
				.enum(["inside", "outside"])
				.nullable()
				.transform((val) => val ?? "outside")
				.describe("Whether to place the label inside or outside the shape."),
			offset: z
				.number()
				.nullable()
				.transform((val) => val ?? 10)
				.describe("Distance from the edge to place the label.")
		})
		.strict()

// The main Zod schema for the transformationDiagram function.
export const TransformationDiagramPropsSchema = z
	.object({
		type: z.literal("transformationDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total height of the output SVG container in pixels."),
		// INLINED: The ShapeSchema definition is now directly inside the preImage property.
		preImage: z
			.object({
				vertices: z
					.array(
						z
							.object({
								x: z.number().describe("The horizontal coordinate of the point."),
								y: z.number().describe("The vertical coordinate of the point.")
							})
							.strict()
					)
					.min(3)
					.describe("An ordered list of vertices defining the polygon."),
				label: z.string().nullable().describe('An optional text label for the shape (e.g., "A", "B").'),
				fillColor: z
					.string()
					.nullable()
					.transform((val) => val ?? "rgba(120, 84, 171, 0.2)")
					.describe("The fill color of the shape."),
				strokeColor: z
					.string()
					.nullable()
					.transform((val) => val ?? "#7854ab")
					.describe("The stroke color of the shape's boundary."),
				vertexLabels: z
					.array(z.string())
					.nullable()
					.transform((val) => val ?? null)
					.describe("Labels for each vertex (e.g., ['A', 'B', 'C', 'D']). Must match the number of vertices."),
				angleMarks: z
					.array(createAngleMarkSchema())
					.nullable()
					.transform((val) => val ?? null)
					.describe("Angle marks to draw at specific vertices."),
				sideLengths: z
					.array(createSideLengthSchema())
					.nullable()
					.transform((val) => val ?? null)
					.describe("Side length labels for each edge. The first label is for the edge from vertex 0 to vertex 1, etc.")
			})
			.strict()
			.describe("The original shape before transformation."),
		// INLINED: The ShapeSchema definition is now directly inside the image property.
		image: z
			.object({
				vertices: z
					.array(
						z
							.object({
								x: z.number().describe("The horizontal coordinate of the point."),
								y: z.number().describe("The vertical coordinate of the point.")
							})
							.strict()
					)
					.min(3)
					.describe("An ordered list of vertices defining the polygon."),
				label: z.string().nullable().describe('An optional text label for the shape (e.g., "A", "B").'),
				fillColor: z
					.string()
					.nullable()
					.transform((val) => val ?? "rgba(120, 84, 171, 0.2)")
					.describe("The fill color of the shape."),
				strokeColor: z
					.string()
					.nullable()
					.transform((val) => val ?? "#7854ab")
					.describe("The stroke color of the shape's boundary."),
				vertexLabels: z
					.array(z.string())
					.nullable()
					.transform((val) => val ?? null)
					.describe("Labels for each vertex (e.g., ['A'', 'B'', 'C'', 'D'']). Must match the number of vertices."),
				angleMarks: z
					.array(createAngleMarkSchema())
					.nullable()
					.transform((val) => val ?? null)
					.describe("Angle marks to draw at specific vertices."),
				sideLengths: z
					.array(createSideLengthSchema())
					.nullable()
					.transform((val) => val ?? null)
					.describe("Side length labels for each edge. The first label is for the edge from vertex 0 to vertex 1, etc.")
			})
			.strict()
			.describe("The resulting shape after transformation."),
		transformation: z
			.discriminatedUnion("type", [TranslationSchema, ReflectionSchema, RotationSchema, DilationSchema])
			.describe("The details of the transformation applied."),
		additionalPoints: z
			.array(AdditionalPointSchema)
			.nullable()
			.transform((val) => val ?? null)
			.describe("Additional labeled points to display (e.g., reference points, centers).")
	})
	.strict()
	.describe(
		"Generates an SVG diagram illustrating a geometric transformation (translation, reflection, rotation, or dilation) of a polygon. This widget renders a 'pre-image' and an 'image' on a blank canvas and includes visual aids like vectors, reflection lines, or dilation rays to clarify the specific transformation, making it ideal for non-coordinate grid geometry problems. Supports vertex labeling, angle marks, and additional reference points."
	)

export type TransformationDiagramProps = z.infer<typeof TransformationDiagramPropsSchema>

/**
 * Generates an SVG diagram illustrating a geometric transformation.
 */
export const generateTransformationDiagram: WidgetGenerator<typeof TransformationDiagramPropsSchema> = (props) => {
	const { width, height, preImage, image, transformation, additionalPoints } = props

	// 1. Use a fixed, predictable coordinate system
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	svg += `<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#1fab54"/></marker></defs>`

	// Helper function needed for coordinate calculations
	const calculateCentroid = (vertices: Array<{ x: number; y: number }>) => {
		const centroid = vertices.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
		centroid.x /= vertices.length
		centroid.y /= vertices.length
		return centroid
	}

	// 2. Calculate bounds for ALL points that need to be visible
	let allPoints = [...preImage.vertices, ...image.vertices]
	if (additionalPoints) {
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
	const padding = 40
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
		const pointsStr = shape.vertices.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(" ")
		const strokeWidth = isImage ? 2.5 : 2

		let polySvg = `<polygon points="${pointsStr}" fill="${shape.fillColor}" stroke="${shape.strokeColor}" stroke-width="${strokeWidth}"/>`

		// Remove shape label at centroid - labels are now only shown via vertex labels
		return polySvg
	}

	const drawLine = (line: z.infer<typeof LineSchema>, hasArrow: boolean) => {
		let strokeDash = ""
		if (line.style === "dashed") {
			strokeDash = 'stroke-dasharray="8 6"'
		} else if (line.style === "dotted") {
			strokeDash = 'stroke-dasharray="2 4"'
		}
		const marker = hasArrow ? 'marker-end="url(#arrowhead)"' : ""
		return `<line x1="${toSvgX(line.from.x)}" y1="${toSvgY(line.from.y)}" x2="${toSvgX(line.to.x)}" y2="${toSvgY(line.to.y)}" stroke="${line.color}" stroke-width="2" ${strokeDash} ${marker}/>`
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

		const largeArcFlag = Math.abs(angle) > 180 ? 1 : 0
		const sweepFlag = angle > 0 ? 0 : 1 // Flip sweep direction for Y-axis flip in SVG coordinates

		return `<path d="M ${startX} ${startY} A ${arcRadius * scale} ${arcRadius * scale} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}" stroke="#ff6600" stroke-width="2" fill="none" marker-end="url(#arrowhead)"/>`
	}

	const drawVertexLabels = (shape: TransformationDiagramProps["preImage"]) => {
		if (!shape.vertexLabels || shape.vertexLabels.length !== shape.vertices.length) {
			return ""
		}

		let labelsSvg = ""
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

			labelsSvg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="13px" font-weight="600" fill="#333">${label}</text>`
		}

		return labelsSvg
	}

	const drawAngleMark = (
		vertices: Array<{ x: number; y: number }>,
		mark: z.infer<ReturnType<typeof createAngleMarkSchema>>,
		strokeColor: string
	) => {
		if (mark.vertexIndex < 0 || mark.vertexIndex >= vertices.length) {
			return ""
		}

		const vertex = vertices[mark.vertexIndex]
		const prevVertex = vertices[(mark.vertexIndex - 1 + vertices.length) % vertices.length]
		const nextVertex = vertices[(mark.vertexIndex + 1) % vertices.length]

		if (!vertex || !prevVertex || !nextVertex) {
			return ""
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

		const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0
		const sweepFlag = 0 // Use 0 for correct direction in flipped Y coordinates

		let markSvg = `<path d="M ${startX} ${startY} A ${svgRadius} ${svgRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}" stroke="${strokeColor}" stroke-width="${Math.max(1, 1.5)}" fill="none"/>`

		// Add label if provided
		if (mark.label) {
			const midAngle = (startAngle + endAngle) / 2
			const svgLabelDistance = mark.labelDistance * scale
			const labelX = svgVertexX + svgLabelDistance * Math.cos(midAngle)
			const labelY = svgVertexY + svgLabelDistance * Math.sin(-midAngle) // Flip Y
			const fontSize = Math.max(11, 13)

			markSvg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}px" fill="#333">${mark.label}</text>`
		}

		return markSvg
	}

	const drawAdditionalPoint = (point: z.infer<typeof AdditionalPointSchema>) => {
		let pointSvg = ""
		const radius = 4
		const svgX = toSvgX(point.x)
		const svgY = toSvgY(point.y)

		if (point.style === "circle") {
			pointSvg += `<circle cx="${svgX}" cy="${svgY}" r="${radius}" fill="none" stroke="#333" stroke-width="2"/>`
		} else {
			// dot style
			pointSvg += `<circle cx="${svgX}" cy="${svgY}" r="${radius}" fill="#333"/>`
		}

		// Label offset to avoid overlapping with the point
		const labelOffset = 12
		pointSvg += `<text x="${svgX}" y="${svgY - labelOffset}" text-anchor="middle" dominant-baseline="bottom" font-size="13px" font-weight="600" fill="#333">${point.label}</text>`

		return pointSvg
	}

	const drawSideLengths = (shape: TransformationDiagramProps["preImage"]) => {
		if (!shape.sideLengths || shape.sideLengths.length === 0) {
			return ""
		}

		let lengthsSvg = ""
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

			lengthsSvg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}px" fill="#333" transform="rotate(${angle} ${labelX} ${labelY})">${sideLength.value}</text>`
		}

		return lengthsSvg
	}

	// 4. Draw Transformation-Specific Background Elements (like lines and rays)
	if (transformation.type === "reflection") {
		svg += drawLine(transformation.lineOfReflection, false)
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
				svg += drawLine(
					{
						from: center,
						to: { x: extendedX, y: extendedY },
						style: "solid",
						color: "#1fab54"
					},
					false
				)
			}
		}
	}

	// 5. Draw Main Shapes with proper layering
	svg += drawPolygon(preImage, false)
	svg += drawPolygon(image, true)

	// 5a. Draw angle marks for both shapes
	if (preImage.angleMarks) {
		for (const mark of preImage.angleMarks) {
			svg += drawAngleMark(preImage.vertices, mark, preImage.strokeColor)
		}
	}
	if (image.angleMarks) {
		for (const mark of image.angleMarks) {
			svg += drawAngleMark(image.vertices, mark, image.strokeColor)
		}
	}

	// 5b. Draw vertex labels for both shapes
	svg += drawVertexLabels(preImage)
	svg += drawVertexLabels(image)

	// 5c. Draw side lengths for both shapes
	svg += drawSideLengths(preImage)
	svg += drawSideLengths(image)

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
						svg += `<circle cx="${toSvgX(preVertex.x)}" cy="${toSvgY(preVertex.y)}" r="${preVertexRadius}" fill="#1fab54" opacity="0.6" stroke="#fff" stroke-width="0.5"/>`
						// Image vertices: larger, more prominent
						svg += `<circle cx="${toSvgX(imageVertex.x)}" cy="${toSvgY(imageVertex.y)}" r="${imageVertexRadius}" fill="#1fab54" stroke="#fff" stroke-width="0.5"/>`
					}
				}
			}

			// Draw center point on top of everything
			svg += `<circle cx="${toSvgX(center.x)}" cy="${toSvgY(center.y)}" r="${centerRadius}" fill="#7854ab" stroke="#fff" stroke-width="1.5"/>`
			break
		}
		case "rotation": {
			const center = transformation.centerOfRotation
			const centerRadius = 4
			svg += `<circle cx="${toSvgX(center.x)}" cy="${toSvgY(center.y)}" r="${centerRadius}" fill="#7854ab" stroke="#fff" stroke-width="1"/>`

			// Draw rotation arc to show angle and direction
			if (preImage.vertices.length > 0) {
				const refPoint = preImage.vertices[0] // Use first vertex as reference
				if (refPoint) {
					svg += drawRotationArc(center, refPoint, transformation.angle)
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
						svg += drawLine(
							{
								from: preVertex,
								to: imageVertex,
								style: "dotted",
								color: "#cccccc"
							},
							false
						)

						// Add small circles at vertices
						const vertexRadius = 2
						svg += `<circle cx="${toSvgX(preVertex.x)}" cy="${toSvgY(preVertex.y)}" r="${vertexRadius}" fill="#888" opacity="0.6"/>`
						svg += `<circle cx="${toSvgX(imageVertex.x)}" cy="${toSvgY(imageVertex.y)}" r="${vertexRadius}" fill="#888" opacity="0.6"/>`
					}
				}
			}
			break
		}
	}

	// 7. Draw additional points (last so they appear on top)
	if (additionalPoints) {
		for (const point of additionalPoints) {
			svg += drawAdditionalPoint(point)
		}
	}

	svg += "</svg>"
	return svg
}
