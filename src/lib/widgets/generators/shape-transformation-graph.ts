import { z } from "zod"
import {
	AxisOptionsSchema,
	generateCoordinatePlaneBase,
	PlotPointSchema,
	renderPoints
} from "@/lib/widgets/generators/coordinate-plane-base"
import type { WidgetGenerator } from "@/lib/widgets/types"

const VertexSchema = z
	.object({
		x: z.number().describe("The x-coordinate of the vertex."),
		y: z.number().describe("The y-coordinate of the vertex.")
	})
	.strict()

type Vertex = z.infer<typeof VertexSchema>

const PolygonObjectSchema = z
	.object({
		vertices: z.array(VertexSchema).min(3).describe("An array of vertices that define the shape."),
		color: z
			.string()
			.nullable()
			.transform((val) => val ?? "rgba(66, 133, 244, 0.5)")
			.describe("The fill color of the shape."),
		label: z.string().nullable().describe("An optional label for the shape.")
	})
	.strict()

const TransformationRuleSchema = z.discriminatedUnion("type", [
	z
		.object({
			type: z.literal("translation"),
			vector: z
				.object({
					x: z.number().describe("The horizontal translation distance."),
					y: z.number().describe("The vertical translation distance.")
				})
				.strict()
		})
		.strict(),
	z
		.object({
			type: z.literal("reflection"),
			axis: z.enum(["x", "y"]).describe("The axis of reflection.")
		})
		.strict(),
	z
		.object({
			type: z.literal("rotation"),
			center: VertexSchema.describe("The center point of rotation."),
			angle: z.number().describe("The angle of rotation in degrees.")
		})
		.strict(),
	z
		.object({
			type: z.literal("dilation"),
			center: VertexSchema.describe("The center point of dilation."),
			scaleFactor: z.number().describe("The scale factor for dilation.")
		})
		.strict()
])

export const ShapeTransformationGraphPropsSchema = z
	.object({
		type: z.literal("shapeTransformationGraph"),
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
		xAxis: AxisOptionsSchema.describe("Configuration for the horizontal (X) axis."),
		yAxis: AxisOptionsSchema.describe("Configuration for the vertical (Y) axis."),
		showQuadrantLabels: z
			.boolean()
			.nullable()
			.transform((val) => val ?? false)
			.describe('If true, displays the labels "I", "II", "III", and "IV" in the appropriate quadrants.'),
		preImage: PolygonObjectSchema.describe("The original shape before transformation."),
		transformation: TransformationRuleSchema.describe("The transformation to apply to the pre-image."),
		points: z.array(PlotPointSchema).nullable().describe("Optional additional points to plot.")
	})
	.strict()
	.describe("Generates a coordinate plane showing geometric transformations with pre-image and transformed image.")

export type ShapeTransformationGraphProps = z.infer<typeof ShapeTransformationGraphPropsSchema>

export const generateShapeTransformationGraph: WidgetGenerator<typeof ShapeTransformationGraphPropsSchema> = (
	props
) => {
	const { width, height, xAxis, yAxis, showQuadrantLabels, preImage, transformation, points } = props

	const base = generateCoordinatePlaneBase(width, height, xAxis, yAxis, showQuadrantLabels, points || [])
	let content = ""

	// 1. Draw Pre-Image (solid)
	const preImagePoints = preImage.vertices.map((p) => `${base.toSvgX(p.x)},${base.toSvgY(p.y)}`).join(" ")
	content += `<polygon points="${preImagePoints}" fill="${preImage.color}" stroke="black" stroke-width="1.5" fill-opacity="0.6"/>`

	// 2. Calculate Transformed Vertices
	let imageVertices: Vertex[] = []
	switch (transformation.type) {
		case "translation": {
			imageVertices = preImage.vertices.map((v) => ({
				x: v.x + transformation.vector.x,
				y: v.y + transformation.vector.y
			}))
			break
		}
		case "reflection": {
			imageVertices = preImage.vertices.map((v) => ({
				x: transformation.axis === "y" ? -v.x : v.x,
				y: transformation.axis === "x" ? -v.y : v.y
			}))
			break
		}
		case "rotation": {
			const angleRad = (transformation.angle * Math.PI) / 180
			const center = transformation.center
			imageVertices = preImage.vertices.map((v) => {
				const translatedX = v.x - center.x
				const translatedY = v.y - center.y
				return {
					x: translatedX * Math.cos(angleRad) - translatedY * Math.sin(angleRad) + center.x,
					y: translatedX * Math.sin(angleRad) + translatedY * Math.cos(angleRad) + center.y
				}
			})
			break
		}
		case "dilation": {
			const scale = transformation.scaleFactor
			const dilCenter = transformation.center
			imageVertices = preImage.vertices.map((v) => ({
				x: dilCenter.x + scale * (v.x - dilCenter.x),
				y: dilCenter.y + scale * (v.y - dilCenter.y)
			}))
			break
		}
	}

	// 3. Draw Image (dashed)
	const imagePoints = imageVertices.map((p) => `${base.toSvgX(p.x)},${base.toSvgY(p.y)}`).join(" ")
	content += `<polygon points="${imagePoints}" fill-opacity="0.6" fill="${preImage.color}" stroke="black" stroke-width="1.5" stroke-dasharray="5 3"/>`

	// 4. Add visual aids like center of rotation/dilation
	if (transformation.type === "rotation" || transformation.type === "dilation") {
		const c = transformation.center
		content += `<circle cx="${base.toSvgX(c.x)}" cy="${base.toSvgY(c.y)}" r="4" fill="red" />`
	}

	// 5. Render optional points
	if (points) {
		content += renderPoints(points, base.toSvgX, base.toSvgY)
	}

	return `${base.svg}${content}</svg>`
}
