import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Defines the properties for a rectangular prism solid
const RectangularPrismDataSchema = z
	.object({
		type: z.literal("rectangularPrism"),
		length: z.number().describe("The length (depth, z-axis) of the prism."),
		width: z.number().describe("The width (x-axis) of the prism."),
		height: z.number().describe("The height (y-axis) of the prism.")
	})
	.strict()

// Defines the properties for a square pyramid solid
const SquarePyramidDataSchema = z
	.object({
		type: z.literal("squarePyramid"),
		baseSide: z.number().describe("The side length of the square base."),
		height: z.number().describe("The perpendicular height from the base to the apex.")
	})
	.strict()

// Defines the intersecting plane's properties
const PlaneSchema = z
	.object({
		orientation: z
			.enum(["horizontal", "vertical"])
			.describe(
				"The orientation of the intersecting plane. 'horizontal' slices parallel to the base, 'vertical' slices parallel to the side."
			),
		position: z
			.number()
			.min(0)
			.max(1)
			.describe(
				"The position of the slice as a fraction of the solid's height or length (0.0 = bottom/back, 1.0 = top/front)."
			)
	})
	.strict()

// The main Zod schema for the 3dIntersectionDiagram function
export const ThreeDIntersectionDiagramPropsSchema = z
	.object({
		type: z.literal("3dIntersectionDiagram"),
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
		solid: z
			.discriminatedUnion("type", [RectangularPrismDataSchema, SquarePyramidDataSchema])
			.describe("The geometric data defining the 3D solid shape."),
		plane: PlaneSchema.describe("The properties of the intersecting plane."),
		viewOptions: z
			.object({
				projectionAngle: z
					.number()
					.nullable()
					.transform((val) => val ?? 45)
					.describe("The angle in degrees for the oblique projection of the z-axis."),
				intersectionColor: z
					.string()
					.nullable()
					.transform((val) => val ?? "rgba(217, 95, 79, 0.8)")
					.describe("The fill color of the resulting 2D cross-section."),
				showHiddenEdges: z
					.boolean()
					.nullable()
					.transform((val) => val ?? true)
					.describe("If true, render edges hidden from view as dashed lines.")
			})
			.strict()
			.nullable()
			.transform(
				(val) =>
					val ?? {
						projectionAngle: 45,
						intersectionColor: "rgba(217, 95, 79, 0.8)",
						showHiddenEdges: true
					}
			)
			.describe("Optional settings for controlling the visual output.")
	})
	.strict()
	.describe(
		"Generates an SVG diagram illustrating the cross-section of a 3D solid intersected by a plane. This widget is ideal for solid geometry problems that require visualizing the 2D shape created by slicing a 3D object. It supports different solids (like prisms and pyramids) and plane orientations (horizontal or vertical), rendering the solid in a 3D perspective and highlighting the intersection shape."
	)

export type ThreeDIntersectionDiagramProps = z.infer<typeof ThreeDIntersectionDiagramPropsSchema>

// Type definitions for 3D vector math
type Point3D = { x: number; y: number; z: number }
type Edge = { startIdx: number; endIdx: number; isHidden?: boolean }

/**
 * Generates an SVG diagram of a 3D solid being intersected by a plane,
 * highlighting the resulting 2D cross-section.
 */
export const generateThreeDIntersectionDiagram: WidgetGenerator<typeof ThreeDIntersectionDiagramPropsSchema> = (
	props
) => {
	const { width, height, solid, plane, viewOptions } = props
	const { projectionAngle, intersectionColor, showHiddenEdges } = viewOptions

	const padding = 40
	let vertices: Point3D[] = []
	let edges: Edge[] = []
	let solidHeight = 0
	let solidLength = 0

	// 1. Define Vertices and Edges for the selected solid
	// We center the solid at (0,0,0) for easier calculations
	switch (solid.type) {
		case "rectangularPrism": {
			const { w, h, l } = { w: solid.width / 2, h: solid.height / 2, l: solid.length / 2 }
			solidHeight = solid.height
			solidLength = solid.length
			vertices = [
				{ x: -w, y: -h, z: -l }, // 0: back bottom left
				{ x: w, y: -h, z: -l }, // 1: back bottom right
				{ x: w, y: h, z: -l }, // 2: back top right
				{ x: -w, y: h, z: -l }, // 3: back top left
				{ x: -w, y: -h, z: l }, // 4: front bottom left
				{ x: w, y: -h, z: l }, // 5: front bottom right
				{ x: w, y: h, z: l }, // 6: front top right
				{ x: -w, y: h, z: l } // 7: front top left
			]
			edges = [
				{ startIdx: 0, endIdx: 1, isHidden: true },
				{ startIdx: 1, endIdx: 2, isHidden: true },
				{ startIdx: 2, endIdx: 3, isHidden: true },
				{ startIdx: 3, endIdx: 0, isHidden: true },
				{ startIdx: 4, endIdx: 5 },
				{ startIdx: 5, endIdx: 6 },
				{ startIdx: 6, endIdx: 7 },
				{ startIdx: 7, endIdx: 4 },
				{ startIdx: 0, endIdx: 4 },
				{ startIdx: 1, endIdx: 5 },
				{ startIdx: 2, endIdx: 6 },
				{ startIdx: 3, endIdx: 7 }
			]
			break
		}
		case "squarePyramid": {
			const { b, h } = { b: solid.baseSide / 2, h: solid.height }
			solidHeight = solid.height
			solidLength = solid.baseSide // For vertical slicing
			vertices = [
				{ x: -b, y: -h / 2, z: -b }, // 0: back bottom left
				{ x: b, y: -h / 2, z: -b }, // 1: back bottom right
				{ x: b, y: -h / 2, z: b }, // 2: front bottom right
				{ x: -b, y: -h / 2, z: b }, // 3: front bottom left
				{ x: 0, y: h / 2, z: 0 } // 4: apex
			]
			edges = [
				{ startIdx: 0, endIdx: 1, isHidden: true },
				{ startIdx: 1, endIdx: 2 },
				{ startIdx: 2, endIdx: 3 },
				{ startIdx: 3, endIdx: 0 },
				{ startIdx: 0, endIdx: 4 },
				{ startIdx: 1, endIdx: 4 },
				{ startIdx: 2, endIdx: 4 },
				{ startIdx: 3, endIdx: 4 }
			]
			break
		}
	}

	// 2. 3D Math and Projection Setup
	const angleRad = (projectionAngle * Math.PI) / 180
	const project = (p: Point3D) => ({
		x: p.x - p.z * Math.cos(angleRad),
		y: p.y - p.z * Math.sin(angleRad)
	})

	const projected = vertices.map(project)
	const minX = Math.min(...projected.map((p) => p.x))
	const maxX = Math.max(...projected.map((p) => p.x))
	const minY = Math.min(...projected.map((p) => p.y))
	const maxY = Math.max(...projected.map((p) => p.y))

	const scale = Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY))
	const toSvg = (p: { x: number; y: number }) => ({
		x: width / 2 + (p.x - (minX + maxX) / 2) * scale,
		y: height / 2 - (p.y - (minY + maxY) / 2) * scale
	})

	// 3. Define the Plane and Calculate Intersection Points
	let planePoint: Point3D
	let planeNormal: Point3D

	if (plane.orientation === "horizontal") {
		planeNormal = { x: 0, y: 1, z: 0 }
		const yPos = -solidHeight / 2 + plane.position * solidHeight
		planePoint = { x: 0, y: yPos, z: 0 }
	} else {
		// vertical
		planeNormal = { x: 0, y: 0, z: 1 }
		const zPos = -solidLength / 2 + plane.position * solidLength
		planePoint = { x: 0, y: 0, z: zPos }
	}

	const intersectLinePlane = (p1: Point3D, p2: Point3D): Point3D | null => {
		const lineVec = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z }
		const dot = lineVec.x * planeNormal.x + lineVec.y * planeNormal.y + lineVec.z * planeNormal.z
		if (Math.abs(dot) < 1e-6) return null // Line is parallel to the plane

		const w = { x: p1.x - planePoint.x, y: p1.y - planePoint.y, z: p1.z - planePoint.z }
		const t = -(w.x * planeNormal.x + w.y * planeNormal.y + w.z * planeNormal.z) / dot
		if (t < 0 || t > 1) return null // Intersection is outside the line segment

		return { x: p1.x + t * lineVec.x, y: p1.y + t * lineVec.y, z: p1.z + t * lineVec.z }
	}

	const intersectionPoints: Point3D[] = []
	for (const edge of edges) {
		const p1 = vertices[edge.startIdx]
		const p2 = vertices[edge.endIdx]
		if (!p1 || !p2) continue
		const intersection = intersectLinePlane(p1, p2)
		if (intersection) {
			intersectionPoints.push(intersection)
		}
	}

	// 4. Sort Intersection Points to form a polygon
	let sortedIntersectionPoints: Point3D[] = []
	if (intersectionPoints.length > 2) {
		const centroid = intersectionPoints.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }), {
			x: 0,
			y: 0,
			z: 0
		})
		centroid.x /= intersectionPoints.length
		centroid.y /= intersectionPoints.length
		centroid.z /= intersectionPoints.length

		sortedIntersectionPoints = intersectionPoints.sort((a, b) => {
			const projA = project({ x: a.x - centroid.x, y: a.y - centroid.y, z: a.z - centroid.z })
			const projB = project({ x: b.x - centroid.x, y: b.y - centroid.y, z: b.z - centroid.z })
			return Math.atan2(projA.y, projA.x) - Math.atan2(projB.y, projB.x)
		})
	}

	// 5. Generate SVG String
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	const solidStroke = 'stroke="black" stroke-width="1.5"'
	const hiddenStroke = `${solidStroke} stroke-dasharray="4 3"`

	// Draw hidden edges
	if (showHiddenEdges) {
		for (const edge of edges) {
			if (!edge.isHidden) continue
			const proj1 = projected[edge.startIdx]
			const proj2 = projected[edge.endIdx]
			if (!proj1 || !proj2) continue
			const p1 = toSvg(proj1)
			const p2 = toSvg(proj2)
			svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" ${hiddenStroke}/>`
		}
	}

	// Draw visible edges
	for (const edge of edges) {
		if (edge.isHidden) continue
		const proj1 = projected[edge.startIdx]
		const proj2 = projected[edge.endIdx]
		if (!proj1 || !proj2) continue
		const p1 = toSvg(proj1)
		const p2 = toSvg(proj2)
		svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" ${solidStroke}/>`
	}

	// Draw intersection polygon
	if (sortedIntersectionPoints.length > 0) {
		const pointsStr = sortedIntersectionPoints
			.map((p) => {
				const svgP = toSvg(project(p))
				return `${svgP.x},${svgP.y}`
			})
			.join(" ")
		svg += `<polygon points="${pointsStr}" fill="${intersectionColor}" stroke="black" stroke-width="2"/>`
	}

	svg += "</svg>"
	return svg
}
