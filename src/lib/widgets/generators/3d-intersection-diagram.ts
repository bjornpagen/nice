import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { PADDING } from "@/lib/widgets/utils/constants"
import {
	computeDynamicWidth,
	includePointX,
	initExtents,
} from "@/lib/widgets/utils/layout"

// Defines the properties for a rectangular prism solid
const RectangularPrismDataSchema = z
	.object({
		type: z.literal("rectangularPrism"),
		width: z.number().positive().describe("The width (x-axis) of the prism."),
		height: z.number().positive().describe("The height (y-axis) of the prism."),
		depth: z.number().positive().describe("The depth (z-axis) of the prism.")
	})
	.strict()

// Defines the properties for a square pyramid solid
const SquarePyramidDataSchema = z
	.object({
		type: z.literal("squarePyramid"),
		baseSide: z.number().positive().describe("The side length of the square base."),
		height: z.number().positive().describe("The perpendicular height from the base to the apex.")
	})
	.strict()

// Defines the properties for a cylinder solid
const CylinderDataSchema = z
	.object({
		type: z.literal("cylinder"),
		radius: z.number().positive().describe("The radius of the circular bases."),
		height: z.number().positive().describe("The height of the cylinder.")
	})
	.strict()

// Defines the properties for a cone solid
const ConeDataSchema = z
	.object({
		type: z.literal("cone"),
		radius: z.number().positive().describe("The radius of the circular base."),
		height: z.number().positive().describe("The perpendicular height from the base to the apex.")
	})
	.strict()

// Defines the properties for a sphere solid
const SphereDataSchema = z
	.object({
		type: z.literal("sphere"),
		radius: z.number().positive().describe("The radius of the sphere.")
	})
	.strict()

// Defines the intersecting plane's properties as a discriminated union
const PlaneSchema = z.discriminatedUnion("orientation", [
	z
		.object({
			orientation: z
				.literal("horizontal")
				.describe("A plane parallel to the base, cutting through the solid horizontally like slicing a cake layer."),
			position: z
				.number()
				.min(0)
				.max(1)
				.describe(
					"The relative position along the solid's height where the plane intersects (0 = bottom, 0.5 = middle, 1 = top)."
				)
		})
		.strict(),
	z
		.object({
			orientation: z
				.literal("vertical")
				.describe(
					"A plane perpendicular to the base, cutting through the solid vertically like slicing a loaf of bread."
				),
			position: z
				.number()
				.min(0)
				.max(1)
				.describe(
					"The relative position along the solid's width/depth where the plane intersects (0 = back/left, 0.5 = center, 1 = front/right)."
				)
		})
		.strict(),
	z
		.object({
			orientation: z
				.literal("oblique")
				.describe("A plane at an angle, neither purely horizontal nor vertical, creating diagonal cross-sections."),
			position: z
				.number()
				.min(0)
				.max(1)
				.describe(
					"The relative position where the plane's center intersects the solid (0 = near bottom/left, 0.5 = center, 1 = near top/right)."
				),
			angle: z
				.number()
				.min(-90)
				.max(90)
				.describe(
					"The tilt angle in degrees from horizontal (-90 = steep downward, 0 = horizontal, 45 = diagonal upward, 90 = steep upward)."
				)
		})
		.strict()
])

// The main Zod schema for the 3dIntersectionDiagram function
export const ThreeDIntersectionDiagramPropsSchema = z
	.object({
		type: z.literal("threeDIntersectionDiagram"),
		width: z
			.number()
			.positive()
			.describe(
				"The total width of the output SVG in pixels. Must accommodate the 3D projection (e.g., 400, 600, 500)."
			),
		height: z
			.number()
			.positive()
			.describe(
				"The total height of the output SVG in pixels. Should be proportional to the solid's dimensions (e.g., 300, 400, 350)."
			),
		solid: z
			.discriminatedUnion("type", [
				RectangularPrismDataSchema,
				SquarePyramidDataSchema,
				CylinderDataSchema,
				ConeDataSchema,
				SphereDataSchema
			])
			.describe("The geometric data defining the 3D solid shape."),
		plane: PlaneSchema.describe("The properties of the intersecting plane."),
		viewOptions: z
			.object({
				projectionAngle: z
					.number()
					.min(0)
					.max(90)
					.describe(
						"The isometric projection angle in degrees for the 3D view (0 = straight-on side view, 30 = standard isometric, 45 = cabinet projection, 90 = top-down)."
					),
				intersectionColor: z
					.string()
					.regex(
						CSS_COLOR_PATTERN,
						"invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba(), hsl/hsla(), or a common named color"
					)
					.describe("The fill color for the cross-section area where the plane cuts the solid. Use CSS color format."),
				showHiddenEdges: z
					.boolean()
					.describe("Whether to show edges that would be hidden behind the solid as dashed lines."),
				showLabels: z
					.boolean()
					.describe("Whether to display measurement labels on the solid's dimensions and the cross-section.")
			})
			.strict()
			.describe("Visual presentation options that control how the 3D solid and its cross-section are rendered.")
	})
	.strict()
	.describe(
		"Generates an SVG diagram illustrating the cross-section of a 3D solid intersected by a plane. This widget supports rectangular prisms, pyramids, cylinders, cones, and spheres with horizontal, vertical, or oblique plane intersections. The resulting cross-section is highlighted to show the 2D shape created by slicing the 3D object."
	)

export type ThreeDIntersectionDiagramProps = z.infer<typeof ThreeDIntersectionDiagramPropsSchema>

// Type definitions for 3D vector math
type Point3D = { x: number; y: number; z: number }
type Edge = { startIdx: number; endIdx: number; isHidden: boolean | null }

/**
 * Generates an SVG diagram of a 3D solid being intersected by a plane,
 * highlighting the resulting 2D cross-section.
 */
export const generateThreeDIntersectionDiagram: WidgetGenerator<typeof ThreeDIntersectionDiagramPropsSchema> = (
	props
) => {
	const { width, height, solid, plane, viewOptions } = props
	const { projectionAngle, intersectionColor, showHiddenEdges } = viewOptions

	const chartWidth = width - PADDING * 2
	const chartHeight = height - PADDING * 2
	let vertices: Point3D[] = []
	let edges: Edge[] = []
	let solidHeight = 0
	let solidLength = 0

	// 1. Define Vertices and Edges for the selected solid
	// We center the solid at (0,0,0) for easier calculations
	switch (solid.type) {
		case "rectangularPrism": {
			const { w, h, d } = { w: solid.width / 2, h: solid.height / 2, d: solid.depth / 2 }
			solidHeight = solid.height
			solidLength = solid.depth
			vertices = [
				{ x: -w, y: -h, z: -d }, // 0: back bottom left
				{ x: w, y: -h, z: -d }, // 1: back bottom right
				{ x: w, y: h, z: -d }, // 2: back top right
				{ x: -w, y: h, z: -d }, // 3: back top left
				{ x: -w, y: -h, z: d }, // 4: front bottom left
				{ x: w, y: -h, z: d }, // 5: front bottom right
				{ x: w, y: h, z: d }, // 6: front top right
				{ x: -w, y: h, z: d } // 7: front top left
			]
			edges = [
				{ startIdx: 0, endIdx: 1, isHidden: true },
				{ startIdx: 1, endIdx: 2, isHidden: true },
				{ startIdx: 2, endIdx: 3, isHidden: true },
				{ startIdx: 3, endIdx: 0, isHidden: true },
				{ startIdx: 4, endIdx: 5, isHidden: null },
				{ startIdx: 5, endIdx: 6, isHidden: null },
				{ startIdx: 6, endIdx: 7, isHidden: null },
				{ startIdx: 7, endIdx: 4, isHidden: null },
				{ startIdx: 0, endIdx: 4, isHidden: null },
				{ startIdx: 1, endIdx: 5, isHidden: null },
				{ startIdx: 2, endIdx: 6, isHidden: null },
				{ startIdx: 3, endIdx: 7, isHidden: null }
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
				{ startIdx: 1, endIdx: 2, isHidden: null },
				{ startIdx: 2, endIdx: 3, isHidden: null },
				{ startIdx: 3, endIdx: 0, isHidden: null },
				{ startIdx: 0, endIdx: 4, isHidden: null },
				{ startIdx: 1, endIdx: 4, isHidden: null },
				{ startIdx: 2, endIdx: 4, isHidden: null },
				{ startIdx: 3, endIdx: 4, isHidden: null }
			]
			break
		}
		case "cylinder": {
			const { r, h } = { r: solid.radius, h: solid.height }
			solidHeight = solid.height
			solidLength = solid.radius * 2 // For vertical slicing
			// Approximate cylinder with octagon for intersection calculations
			const segments = 8
			vertices = []
			edges = []

			// Bottom circle vertices
			for (let i = 0; i < segments; i++) {
				const angle = (i * 2 * Math.PI) / segments
				vertices.push({ x: r * Math.cos(angle), y: -h / 2, z: r * Math.sin(angle) })
			}
			// Top circle vertices
			for (let i = 0; i < segments; i++) {
				const angle = (i * 2 * Math.PI) / segments
				vertices.push({ x: r * Math.cos(angle), y: h / 2, z: r * Math.sin(angle) })
			}

			// Bottom circle edges (hidden)
			for (let i = 0; i < segments; i++) {
				edges.push({ startIdx: i, endIdx: (i + 1) % segments, isHidden: true })
			}
			// Top circle edges
			for (let i = 0; i < segments; i++) {
				edges.push({ startIdx: segments + i, endIdx: segments + ((i + 1) % segments), isHidden: false })
			}
			// Vertical edges
			for (let i = 0; i < segments; i++) {
				const isHidden = i > segments / 4 && i < (3 * segments) / 4
				edges.push({ startIdx: i, endIdx: segments + i, isHidden })
			}
			break
		}
		case "cone": {
			const { r, h } = { r: solid.radius, h: solid.height }
			solidHeight = solid.height
			solidLength = solid.radius * 2
			// Approximate cone base with octagon
			const segments = 8
			vertices = []
			edges = []

			// Base circle vertices
			for (let i = 0; i < segments; i++) {
				const angle = (i * 2 * Math.PI) / segments
				vertices.push({ x: r * Math.cos(angle), y: -h / 2, z: r * Math.sin(angle) })
			}
			// Apex
			vertices.push({ x: 0, y: h / 2, z: 0 })

			// Base circle edges (hidden)
			for (let i = 0; i < segments; i++) {
				edges.push({ startIdx: i, endIdx: (i + 1) % segments, isHidden: true })
			}
			// Slant edges to apex
			for (let i = 0; i < segments; i++) {
				const isHidden = i > segments / 4 && i < (3 * segments) / 4
				edges.push({ startIdx: i, endIdx: segments, isHidden })
			}
			break
		}
		case "sphere": {
			const { radius } = solid
			solidHeight = radius * 2
			solidLength = radius * 2
			vertices = []
			edges = []

			const stacks = 8 // rings of latitude
			const sectors = 16 // slices of longitude

			// Generate vertices for a UV sphere
			for (let i = 0; i <= stacks; i++) {
				const phi = (Math.PI * i) / stacks // from 0 (top) to PI (bottom)
				const y = radius * Math.cos(phi)
				const r_i = radius * Math.sin(phi)

				for (let j = 0; j < sectors; j++) {
					const theta = (2 * Math.PI * j) / sectors // from 0 to 2PI
					const x = r_i * Math.cos(theta)
					const z = r_i * Math.sin(theta)
					vertices.push({ x, y, z })
				}
			}

			// Generate edges from the vertices
			for (let i = 0; i < stacks; i++) {
				for (let j = 0; j < sectors; j++) {
					const first = i * sectors + j
					const second = (i + 1) * sectors + j
					const nextInRing = i * sectors + ((j + 1) % sectors)

					const p1 = vertices[first]
					const p2 = vertices[nextInRing]
					const p3 = vertices[second]
					if (!p1 || !p2 || !p3) continue

					// An edge is hidden if both its vertices have a negative z-coordinate (are on the back of the sphere)
					const checkHidden = (v1: Point3D, v2: Point3D) => v1.z < -1e-6 && v2.z < -1e-6 // tolerance

					// Latitude edge (horizontal)
					if (i > 0 && i < stacks) {
						// Poles don't have latitude edges in this structure
						edges.push({ startIdx: first, endIdx: nextInRing, isHidden: checkHidden(p1, p2) ? true : null })
					}
					// Longitude edge (vertical)
					edges.push({ startIdx: first, endIdx: second, isHidden: checkHidden(p1, p3) ? true : null })
				}
			}
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

	const scale = Math.min(chartWidth / (maxX - minX), chartHeight / (maxY - minY))
	const toSvg = (p: { x: number; y: number }) => ({
		x: PADDING + chartWidth / 2 + (p.x - (minX + maxX) / 2) * scale,
		y: PADDING + chartHeight / 2 - (p.y - (minY + maxY) / 2) * scale
	})

	// 3. Define the Plane and Calculate Intersection Points
	let planePoint: Point3D
	let planeNormal: Point3D

	if (plane.orientation === "horizontal") {
		planeNormal = { x: 0, y: 1, z: 0 }
		const yPos = -solidHeight / 2 + plane.position * solidHeight
		planePoint = { x: 0, y: yPos, z: 0 }
	} else if (plane.orientation === "vertical") {
		planeNormal = { x: 0, y: 0, z: 1 }
		const zPos = -solidLength / 2 + plane.position * solidLength
		planePoint = { x: 0, y: 0, z: zPos }
	} else {
		// oblique
		const angleRad = (plane.angle * Math.PI) / 180
		planeNormal = { x: 0, y: Math.cos(angleRad), z: Math.sin(angleRad) }
		// Position the plane based on the dominant axis
		const yPos = -solidHeight / 2 + plane.position * solidHeight
		const zPos = -solidLength / 2 + plane.position * solidLength
		planePoint = { x: 0, y: yPos * 0.5 + zPos * 0.5, z: zPos * 0.5 + yPos * 0.5 }
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
	const ext = initExtents(width) // Initialize extents tracking
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">`
	
	const solidStroke = 'stroke="black" stroke-width="1.5"'
	const hiddenStroke = `${solidStroke} stroke-dasharray="4 3"`

	// Draw hidden edges
	if (showHiddenEdges) {
		for (const edge of edges) {
			if (edge.isHidden !== true) continue
			const proj1 = projected[edge.startIdx]
			const proj2 = projected[edge.endIdx]
			if (!proj1 || !proj2) continue
			const p1 = toSvg(proj1)
			const p2 = toSvg(proj2)
			// Track extents of all points
			includePointX(ext, p1.x)
			includePointX(ext, p2.x)
			svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" ${hiddenStroke}/>`
		}
	}

	// Draw visible edges
	for (const edge of edges) {
		if (edge.isHidden === true) continue
		const proj1 = projected[edge.startIdx]
		const proj2 = projected[edge.endIdx]
		if (!proj1 || !proj2) continue
		const p1 = toSvg(proj1)
		const p2 = toSvg(proj2)
		// Track extents of all points
		includePointX(ext, p1.x)
		includePointX(ext, p2.x)
		svg += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" ${solidStroke}/>`
	}

	// Draw intersection polygon
	if (sortedIntersectionPoints.length > 0) {
		const pointsStr = sortedIntersectionPoints
			.map((p) => {
				const svgP = toSvg(project(p))
				// Track extents of intersection points
				includePointX(ext, svgP.x)
				return `${svgP.x},${svgP.y}`
			})
			.join(" ")
		svg += `<polygon points="${pointsStr}" fill="${intersectionColor}" stroke="black" stroke-width="2"/>`
	}

	// Apply dynamic width at the end
	const { vbMinX, dynamicWidth } = computeDynamicWidth(ext, height, PADDING)
	svg = svg.replace(`width="${width}"`, `width="${dynamicWidth}"`)
	svg = svg.replace(`viewBox="0 0 ${width} ${height}"`, `viewBox="${vbMinX} 0 ${dynamicWidth} ${height}"`)
	svg += "</svg>"
	return svg
}
