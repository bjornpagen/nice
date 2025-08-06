import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines a 2D coordinate point for a vertex.
const PointSchema = z
	.object({
		x: z.number().describe("The horizontal coordinate of the point."),
		y: z.number().describe("The vertical coordinate of the point.")
	})
	.strict()

// Defines a polygon shape with its vertices and styling.
const ShapeSchema = z
	.object({
		vertices: z.array(PointSchema).min(3).describe("An ordered list of vertices defining the polygon."),
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
			.describe("The stroke color of the shape's boundary.")
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
		lineOfReflection: LineSchema.describe("The line across which the shape is reflected.")
	})
	.strict()

// Defines properties for a Rotation transformation.
const RotationSchema = z
	.object({
		type: z.literal("rotation"),
		centerOfRotation: PointSchema.describe("The point around which the shape is rotated."),
		angle: z.number().describe("The angle of rotation in degrees (positive is counter-clockwise).")
	})
	.strict()

// Defines properties for a Dilation transformation.
const DilationSchema = z
	.object({
		type: z.literal("dilation"),
		centerOfDilation: PointSchema.describe("The point from which the shape is scaled."),
		showRays: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe("If true, draws rays from the center through corresponding vertices.")
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
		preImage: ShapeSchema.describe("The original shape before transformation."),
		image: ShapeSchema.describe("The resulting shape after transformation."),
		transformation: z
			.discriminatedUnion("type", [TranslationSchema, ReflectionSchema, RotationSchema, DilationSchema])
			.describe("The details of the transformation applied.")
	})
	.strict()
	.describe(
		"Generates an SVG diagram illustrating a geometric transformation (translation, reflection, rotation, or dilation) of a polygon. This widget renders a 'pre-image' and an 'image' on a blank canvas and includes visual aids like vectors, reflection lines, or dilation rays to clarify the specific transformation, making it ideal for non-coordinate grid geometry problems."
	)

export type TransformationDiagramProps = z.infer<typeof TransformationDiagramPropsSchema>

/**
 * Generates an SVG diagram illustrating a geometric transformation.
 */
export const generateTransformationDiagram: WidgetGenerator<typeof TransformationDiagramPropsSchema> = (props) => {
	const { width, height, preImage, image, transformation } = props

	// 1. Calculate intelligent viewBox with proper padding for visual elements
	const calculateViewBox = () => {
		let allPoints = [...preImage.vertices, ...image.vertices]

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
		shape: z.infer<typeof ShapeSchema>,
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
		shape: z.infer<typeof ShapeSchema>,
		isImage: boolean,
		labelPosition?: { x: number; y: number }
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

	svg += "</svg>"
	return svg
}
