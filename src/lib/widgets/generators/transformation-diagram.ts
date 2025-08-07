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
		showVectors: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe("If true, draws arrows from pre-image vertices to image vertices.")
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
		showRays: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe("If true, draws rays from the center through corresponding vertices.")
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

	// 1. Calculate intelligent viewBox with proper padding for visual elements
	const calculateViewBox = () => {
		let allPoints = [...preImage.vertices, ...image.vertices]

		// Add additional points if any
		if (additionalPoints) {
			allPoints.push(...additionalPoints)
		}

		// Add transformation-specific points
		if (transformation.type === "reflection") {
			allPoints.push(transformation.lineOfReflection.from, transformation.lineOfReflection.to)
		} else if (transformation.type === "rotation") {
			allPoints.push(transformation.centerOfRotation)
		} else if (transformation.type === "dilation") {
			allPoints.push(transformation.centerOfDilation)
			// For dilation, extend points to account for rays
			if (transformation.showRays) {
				const center = transformation.centerOfDilation
				for (const vertex of image.vertices) {
					const dx = vertex.x - center.x
					const dy = vertex.y - center.y
					// Extend ray beyond image vertex
					allPoints.push({ x: vertex.x + dx * 0.2, y: vertex.y + dy * 0.2 })
				}
			}
		}

		const minX = Math.min(...allPoints.map((p) => p.x))
		const maxX = Math.max(...allPoints.map((p) => p.x))
		const minY = Math.min(...allPoints.map((p) => p.y))
		const maxY = Math.max(...allPoints.map((p) => p.y))

		// Adaptive padding based on diagram size and content
		const baseWidth = maxX - minX
		const baseHeight = maxY - minY
		const basePadding = Math.max(30, Math.min(baseWidth, baseHeight) * 0.1)

		// Extra padding for labels and visual elements
		const labelPadding = 25
		const totalPadding = basePadding + labelPadding

		return {
			minX: minX - totalPadding,
			minY: minY - totalPadding,
			width: baseWidth + totalPadding * 2,
			height: baseHeight + totalPadding * 2
		}
	}

	const viewBox = calculateViewBox()
	const scale = Math.min(viewBox.width, viewBox.height) / 400 // Normalize for responsive sizing

	let svg = `<svg width="${width}" height="${height}" viewBox="${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	svg += `<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#1fab54"/></marker></defs>`

	// 2. Helper Functions
	const calculateCentroid = (vertices: Array<{ x: number; y: number }>) => {
		const centroid = vertices.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
		centroid.x /= vertices.length
		centroid.y /= vertices.length
		return centroid
	}

	const findOptimalLabelPosition = (
		shape: TransformationDiagramProps["preImage"],
		avoidPoints: Array<{ x: number; y: number }> = []
	) => {
		const centroid = calculateCentroid(shape.vertices)

		// If no conflicts, use centroid
		const hasConflict = avoidPoints.some(
			(point) => Math.abs(point.x - centroid.x) < 30 && Math.abs(point.y - centroid.y) < 20
		)

		if (!hasConflict) {
			return centroid
		}

		// Try offset positions around the centroid
		const offsets = [
			{ x: 0, y: -25 }, // above
			{ x: 0, y: 25 }, // below
			{ x: -30, y: 0 }, // left
			{ x: 30, y: 0 }, // right
			{ x: -20, y: -20 }, // top-left
			{ x: 20, y: -20 }, // top-right
			{ x: -20, y: 20 }, // bottom-left
			{ x: 20, y: 20 } // bottom-right
		]

		for (const offset of offsets) {
			const testPos = { x: centroid.x + offset.x, y: centroid.y + offset.y }
			const hasOffsetConflict = avoidPoints.some(
				(point) => Math.abs(point.x - testPos.x) < 25 && Math.abs(point.y - testPos.y) < 15
			)
			if (!hasOffsetConflict) {
				return testPos
			}
		}

		// Fallback to centroid if no good position found
		return centroid
	}

	const drawPolygon = (
		shape: TransformationDiagramProps["preImage"],
		isImage: boolean,
		labelPosition: { x: number; y: number } | null
	) => {
		const pointsStr = shape.vertices.map((p) => `${p.x},${p.y}`).join(" ")
		const strokeWidth = Math.max(1.5, 2 * scale)
		const fontSize = Math.max(12, 16 * scale)

		let polySvg = `<polygon points="${pointsStr}" fill="${shape.fillColor}" stroke="${shape.strokeColor}" stroke-width="${isImage ? strokeWidth * 1.25 : strokeWidth}"/>`

		if (shape.label && labelPosition) {
			polySvg += `<text x="${labelPosition.x}" y="${labelPosition.y}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}px" font-weight="bold" fill="#333">${shape.label}</text>`
		}
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
		const strokeWidth = Math.max(1.5, 2 * scale)
		return `<line x1="${line.from.x}" y1="${line.from.y}" x2="${line.to.x}" y2="${line.to.y}" stroke="${line.color}" stroke-width="${strokeWidth}" ${strokeDash} ${marker}/>`
	}

	const drawRotationArc = (center: { x: number; y: number }, startPoint: { x: number; y: number }, angle: number) => {
		const radius = Math.sqrt((startPoint.x - center.x) ** 2 + (startPoint.y - center.y) ** 2)
		const adjustedRadius = Math.min(radius * 0.7, 40) // Keep arc visible but not overwhelming

		const startAngle = Math.atan2(startPoint.y - center.y, startPoint.x - center.x)
		const endAngle = startAngle + (angle * Math.PI) / 180

		const startX = center.x + adjustedRadius * Math.cos(startAngle)
		const startY = center.y + adjustedRadius * Math.sin(startAngle)
		const endX = center.x + adjustedRadius * Math.cos(endAngle)
		const endY = center.y + adjustedRadius * Math.sin(endAngle)

		const largeArcFlag = Math.abs(angle) > 180 ? 1 : 0
		const sweepFlag = angle > 0 ? 1 : 0

		const strokeWidth = Math.max(1.5, 2 * scale)
		return `<path d="M ${startX} ${startY} A ${adjustedRadius} ${adjustedRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}" stroke="#ff6600" stroke-width="${strokeWidth}" fill="none" marker-end="url(#arrowhead)"/>`
	}

	const drawVertexLabels = (shape: TransformationDiagramProps["preImage"]) => {
		if (!shape.vertexLabels || shape.vertexLabels.length !== shape.vertices.length) {
			return ""
		}

		let labelsSvg = ""
		const fontSize = Math.max(12, 14 * scale)
		const labelOffset = Math.max(15, 18 * scale)

		for (let i = 0; i < shape.vertices.length; i++) {
			const vertex = shape.vertices[i]
			const label = shape.vertexLabels[i]
			if (!vertex || !label) continue

			// Calculate label position based on adjacent vertices for better placement
			const prevVertex = shape.vertices[(i - 1 + shape.vertices.length) % shape.vertices.length]
			const nextVertex = shape.vertices[(i + 1) % shape.vertices.length]

			if (!prevVertex || !nextVertex) continue

			// Calculate the angle bisector direction
			const dx1 = vertex.x - prevVertex.x
			const dy1 = vertex.y - prevVertex.y
			const dx2 = vertex.x - nextVertex.x
			const dy2 = vertex.y - nextVertex.y

			// Normalize vectors
			const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
			const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

			const nx1 = dx1 / len1
			const ny1 = dy1 / len1
			const nx2 = dx2 / len2
			const ny2 = dy2 / len2

			// Direction for label placement (outward from shape)
			let labelDx = nx1 + nx2
			let labelDy = ny1 + ny2

			// Normalize the direction
			const labelLen = Math.sqrt(labelDx * labelDx + labelDy * labelDy)
			if (labelLen > 0) {
				labelDx /= labelLen
				labelDy /= labelLen
			} else {
				// Fallback for collinear edges
				labelDx = -ny1
				labelDy = nx1
			}

			const labelX = vertex.x + labelDx * labelOffset
			const labelY = vertex.y + labelDy * labelOffset

			labelsSvg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}px" font-weight="600" fill="#333">${label}</text>`
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

		// Calculate angles for the arc
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

		const arcRadius = mark.radius
		const startX = vertex.x + arcRadius * Math.cos(startAngle)
		const startY = vertex.y + arcRadius * Math.sin(startAngle)
		const endX = vertex.x + arcRadius * Math.cos(endAngle)
		const endY = vertex.y + arcRadius * Math.sin(endAngle)

		const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0
		const sweepFlag = 1

		let markSvg = `<path d="M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}" stroke="${strokeColor}" stroke-width="${Math.max(1, 1.5 * scale)}" fill="none"/>`

		// Add label if provided
		if (mark.label) {
			const midAngle = (startAngle + endAngle) / 2
			const labelX = vertex.x + mark.labelDistance * Math.cos(midAngle)
			const labelY = vertex.y + mark.labelDistance * Math.sin(midAngle)
			const fontSize = Math.max(11, 13 * scale)

			markSvg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}px" fill="#333">${mark.label}</text>`
		}

		return markSvg
	}

	const drawAdditionalPoint = (point: z.infer<typeof AdditionalPointSchema>) => {
		let pointSvg = ""
		const radius = Math.max(3, 4 * scale)
		const fontSize = Math.max(12, 14 * scale)

		if (point.style === "circle") {
			pointSvg += `<circle cx="${point.x}" cy="${point.y}" r="${radius}" fill="none" stroke="#333" stroke-width="${Math.max(1.5, 2 * scale)}"/>`
		} else {
			// dot style
			pointSvg += `<circle cx="${point.x}" cy="${point.y}" r="${radius}" fill="#333"/>`
		}

		// Label offset to avoid overlapping with the point
		const labelOffset = radius + Math.max(8, 10 * scale)
		pointSvg += `<text x="${point.x}" y="${point.y - labelOffset}" text-anchor="middle" dominant-baseline="bottom" font-size="${fontSize}px" font-weight="600" fill="#333">${point.label}</text>`

		return pointSvg
	}

	const drawSideLengths = (shape: TransformationDiagramProps["preImage"]) => {
		if (!shape.sideLengths || shape.sideLengths.length === 0) {
			return ""
		}

		let lengthsSvg = ""
		const fontSize = Math.max(11, 13 * scale)

		for (let i = 0; i < shape.vertices.length; i++) {
			const sideLength = shape.sideLengths[i]
			if (!sideLength) continue

			const vertex1 = shape.vertices[i]
			const vertex2 = shape.vertices[(i + 1) % shape.vertices.length]
			if (!vertex1 || !vertex2) continue

			// Calculate midpoint of the edge
			const midX = (vertex1.x + vertex2.x) / 2
			const midY = (vertex1.y + vertex2.y) / 2

			// Calculate edge direction and perpendicular
			const dx = vertex2.x - vertex1.x
			const dy = vertex2.y - vertex1.y
			const edgeLength = Math.sqrt(dx * dx + dy * dy)

			// Normalize edge vector
			const edgeNormX = dx / edgeLength
			const edgeNormY = dy / edgeLength

			// Calculate perpendicular vector (rotated 90 degrees)
			let perpX = -edgeNormY
			let perpY = edgeNormX

			// Determine if we need to flip the perpendicular based on position preference
			if (sideLength.position === "inside") {
				// Check if perpendicular points outward by testing with centroid
				const centroid = calculateCentroid(shape.vertices)
				const testX = midX + perpX * 10
				const testY = midY + perpY * 10
				const distToCentroid = Math.sqrt((testX - centroid.x) ** 2 + (testY - centroid.y) ** 2)
				const midDistToCentroid = Math.sqrt((midX - centroid.x) ** 2 + (midY - centroid.y) ** 2)

				// If test point is further from centroid, flip the perpendicular
				if (distToCentroid > midDistToCentroid) {
					perpX = -perpX
					perpY = -perpY
				}
			} else {
				// For outside position, ensure perpendicular points away from centroid
				const centroid = calculateCentroid(shape.vertices)
				const testX = midX + perpX * 10
				const testY = midY + perpY * 10
				const distToCentroid = Math.sqrt((testX - centroid.x) ** 2 + (testY - centroid.y) ** 2)
				const midDistToCentroid = Math.sqrt((midX - centroid.x) ** 2 + (midY - centroid.y) ** 2)

				// If test point is closer to centroid, flip the perpendicular
				if (distToCentroid < midDistToCentroid) {
					perpX = -perpX
					perpY = -perpY
				}
			}

			// Position the label
			const labelX = midX + perpX * sideLength.offset
			const labelY = midY + perpY * sideLength.offset

			// Calculate rotation angle for the text to align with the edge
			let angle = Math.atan2(dy, dx) * (180 / Math.PI)

			// Ensure text is readable (not upside down)
			if (angle > 90 || angle < -90) {
				angle += 180
			}

			lengthsSvg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}px" fill="#333" transform="rotate(${angle} ${labelX} ${labelY})">${sideLength.value}</text>`
		}

		return lengthsSvg
	}

	// 3. Calculate label positions with collision avoidance
	const avoidPoints: Array<{ x: number; y: number }> = []

	// Add transformation centers to avoid points
	if (transformation.type === "rotation") {
		avoidPoints.push(transformation.centerOfRotation)
	} else if (transformation.type === "dilation") {
		avoidPoints.push(transformation.centerOfDilation)
	}

	const preImageLabelPos = findOptimalLabelPosition(preImage, avoidPoints)
	avoidPoints.push(preImageLabelPos)
	const imageLabelPos = findOptimalLabelPosition(image, avoidPoints)

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

				// Extend ray beyond image vertex to show continued scaling
				const extensionFactor = 1.3
				const extendedX = center.x + dx * extensionFactor
				const extendedY = center.y + dy * extensionFactor

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
	svg += drawPolygon(preImage, false, preImageLabelPos)
	svg += drawPolygon(image, true, imageLabelPos)

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
			if (transformation.showVectors && preImage.vertices.length === image.vertices.length) {
				for (let i = 0; i < preImage.vertices.length; i++) {
					const from = preImage.vertices[i]
					const to = image.vertices[i]
					if (from && to) {
						svg += drawLine({ from, to, style: "solid", color: "#1fab54" }, true)
					}
				}
			}
			break
		case "dilation": {
			const center = transformation.centerOfDilation
			const centerRadius = Math.max(3, 4 * scale)

			// Draw vertex correspondence indicators if rays are shown
			if (transformation.showRays && preImage.vertices.length === image.vertices.length) {
				for (let i = 0; i < preImage.vertices.length; i++) {
					const preVertex = preImage.vertices[i]
					const imageVertex = image.vertices[i]
					if (preVertex && imageVertex) {
						// Add small circles at vertices to show correspondence
						const preVertexRadius = Math.max(1.5, 2 * scale)
						const imageVertexRadius = Math.max(2, 2.5 * scale)

						// Pre-image vertices: smaller, semi-transparent
						svg += `<circle cx="${preVertex.x}" cy="${preVertex.y}" r="${preVertexRadius}" fill="#1fab54" opacity="0.6" stroke="#fff" stroke-width="0.5"/>`
						// Image vertices: larger, more prominent
						svg += `<circle cx="${imageVertex.x}" cy="${imageVertex.y}" r="${imageVertexRadius}" fill="#1fab54" stroke="#fff" stroke-width="0.5"/>`
					}
				}
			}

			// Draw center point on top of everything
			svg += `<circle cx="${center.x}" cy="${center.y}" r="${centerRadius}" fill="#7854ab" stroke="#fff" stroke-width="1.5"/>`
			break
		}
		case "rotation": {
			const center = transformation.centerOfRotation
			const centerRadius = Math.max(3, 4 * scale)
			svg += `<circle cx="${center.x}" cy="${center.y}" r="${centerRadius}" fill="#7854ab" stroke="#fff" stroke-width="1"/>`

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
						const vertexRadius = Math.max(1.5, 2 * scale)
						svg += `<circle cx="${preVertex.x}" cy="${preVertex.y}" r="${vertexRadius}" fill="#888" opacity="0.6"/>`
						svg += `<circle cx="${imageVertex.x}" cy="${imageVertex.y}" r="${vertexRadius}" fill="#888" opacity="0.6"/>`
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
