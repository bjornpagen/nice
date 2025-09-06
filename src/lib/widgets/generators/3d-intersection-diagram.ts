import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { theme } from "@/lib/widgets/utils/theme"

// Defines the properties for a rectangular prism solid
const RectangularPrismDataSchema = z
	.object({
		type: z.literal("rectangularPrism"),
		width: z.number().positive().describe("The width (x-axis) of the prism."),
		height: z.number().positive().describe("The height (y-axis) of the prism."),
		depth: z.number().positive().describe("The depth (z-axis) of the prism.")
	})
	.strict()

// Defines the properties for a pentagonal prism solid
const PentagonalPrismDataSchema = z
	.object({
		type: z.literal("pentagonalPrism"),
		side: z.number().positive().describe("The side length of the pentagonal bases."),
		height: z.number().positive().describe("The height of the prism.")
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
				PentagonalPrismDataSchema,
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
		case "pentagonalPrism": {
			const { side, height: h } = solid
			solidHeight = h
			const radius = side / (2 * Math.sin(Math.PI / 5)) // Circumradius of the pentagon
			solidLength = radius * 2
			vertices = []
			edges = []
			const h2 = h / 2

			// Generate vertices
			for (let i = 0; i < 5; i++) {
				// Bottom vertices
				const angle = (i * 2 * Math.PI) / 5 + Math.PI / 10 // Rotate to have a face forward
				vertices.push({ x: radius * Math.cos(angle), y: -h2, z: radius * Math.sin(angle) })
			}
			for (let i = 0; i < 5; i++) {
				// Top vertices
				const angle = (i * 2 * Math.PI) / 5 + Math.PI / 10
				vertices.push({ x: radius * Math.cos(angle), y: h2, z: radius * Math.sin(angle) })
			}

			// Generate edges
			for (let i = 0; i < 5; i++) {
				// Bottom edges
				edges.push({ startIdx: i, endIdx: (i + 1) % 5, isHidden: null })
				// Top edges
				edges.push({ startIdx: 5 + i, endIdx: 5 + ((i + 1) % 5), isHidden: null })
				// Vertical edges
				edges.push({ startIdx: i, endIdx: i + 5, isHidden: null })
			}
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

	// Targeted fix: compute hidden/visible edges based on face orientation for prisms and pyramids
	if (
		solid.type === "rectangularPrism" ||
		solid.type === "squarePyramid" ||
		solid.type === "pentagonalPrism"
	) {
		// Helper vector ops
		const sub = (a: Point3D, b: Point3D): Point3D => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
		const cross = (a: Point3D, b: Point3D): Point3D => ({
			x: a.y * b.z - a.z * b.y,
			y: a.z * b.x - a.x * b.z,
			z: a.x * b.y - a.y * b.x
		})
		const dot = (a: Point3D, b: Point3D): number => a.x * b.x + a.y * b.y + a.z * b.z
		const add = (a: Point3D, b: Point3D): Point3D => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
		const scaleVec = (a: Point3D, s: number): Point3D => ({ x: a.x * s, y: a.y * s, z: a.z * s })

		// Camera view direction: looking along negative Z toward origin
		const viewDir: Point3D = { x: 0, y: 0, z: -1 }

		// Object centroid
		const centroid = vertices.reduce<Point3D>((acc, v) => add(acc, v), { x: 0, y: 0, z: 0 })
		const objCenter = scaleVec(centroid, 1 / (vertices.length === 0 ? 1 : vertices.length))

		// Define faces for each solid
		type Face = { indices: number[]; normal: Point3D }
		const faces: Face[] = []
		let faceCycles: number[][] = []

		if (solid.type === "rectangularPrism") {
			// Faces defined by vertex cycles
			faceCycles = [
				[0, 1, 2, 3], // back
				[4, 5, 6, 7], // front
				[0, 4, 5, 1], // bottom (y-)
				[3, 2, 6, 7], // top (y+)
				[0, 3, 7, 4], // left (x-)
				[1, 5, 6, 2] // right (x+)
			]
		} else if (solid.type === "squarePyramid") {
			faceCycles = [
				[0, 1, 2, 3], // base (y constant)
				[0, 1, 4],
				[1, 2, 4],
				[2, 3, 4],
				[3, 0, 4]
			]
		} else {
			// pentagonalPrism
			faceCycles = [
				[0, 1, 2, 3, 4], // bottom
				[9, 8, 7, 6, 5], // top (reversed for outward normal)
				[0, 1, 6, 5], // side
				[1, 2, 7, 6], // side
				[2, 3, 8, 7], // side
				[3, 4, 9, 8], // side
				[4, 0, 5, 9] // side
			]
		}

		for (const cyc of faceCycles) {
			const i0 = cyc[0]
			const i1 = cyc[1]
			const i2 = cyc[2]
			if (i0 === undefined || i1 === undefined || i2 === undefined) continue
			const a = vertices[i0]
			const b = vertices[i1]
			const c = vertices[i2]
			if (!a || !b || !c) continue
			let n = cross(sub(b, a), sub(c, a))
			// Orient normal outward relative to object center
			let sum: Point3D = { x: 0, y: 0, z: 0 }
			let count = 0
			for (const idx of cyc) {
				const v = vertices[idx]
				if (!v) {
					count = -1
					break
				}
				sum = add(sum, v)
				count++
			}
			if (count !== cyc.length) continue
			const fCenter = scaleVec(sum, 1 / count)
			if (dot(n, sub(fCenter, objCenter)) < 0) n = scaleVec(n, -1)
			faces.push({ indices: cyc, normal: n })
		}

		// Build edge -> adjacent faces map using face cycles (edges are undirected)
		const edgeToFaces = new Map<string, Point3D[]>()
		const makeKey = (i: number, j: number) => (i < j ? `${i}-${j}` : `${j}-${i}`)
		for (const f of faces) {
			const cyc = f.indices
			for (let k = 0; k < cyc.length; k++) {
				const i = cyc[k]
				const j = cyc[(k + 1) % cyc.length]
				if (i === undefined || j === undefined) continue
				const key = makeKey(i, j)
				const arr = edgeToFaces.get(key)
				if (arr) arr.push(f.normal)
				else edgeToFaces.set(key, [f.normal])
			}
		}

		// Classify each edge: hidden iff all adjacent faces are back-facing
		for (const edge of edges) {
			const key = makeKey(edge.startIdx, edge.endIdx)
			const normals = edgeToFaces.get(key) || []
			if (normals.length === 0) {
				// Fallback: treat as visible if no face association found
				edge.isHidden = false
				continue
			}
			let allBackFacing = true
			for (const n of normals) {
				// front-facing if dot(n, viewDir) < 0; treat == 0 as visible (silhouette)
				const d = dot(n, viewDir)
				if (d <= 0) {
					allBackFacing = false
					break
				}
			}
			edge.isHidden = allBackFacing
		}
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

	// 5. Generate SVG using Canvas API
	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	// Draw hidden edges
	if (showHiddenEdges) {
		for (const edge of edges) {
			if (edge.isHidden !== true) continue
			const proj1 = projected[edge.startIdx]
			const proj2 = projected[edge.endIdx]
			if (!proj1 || !proj2) continue
			const p1 = toSvg(proj1)
			const p2 = toSvg(proj2)
			canvas.drawLine(p1.x, p1.y, p2.x, p2.y, {
				stroke: theme.colors.hiddenEdge,
				strokeWidth: theme.stroke.width.base,
				dash: theme.stroke.dasharray.dashed
			})
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
		canvas.drawLine(p1.x, p1.y, p2.x, p2.y, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.base
		})
	}

	// Draw intersection polygon
	if (sortedIntersectionPoints.length > 0) {
		const polygonPoints = sortedIntersectionPoints.map((p) => {
			const svgP = toSvg(project(p))
			return { x: svgP.x, y: svgP.y }
		})
		canvas.drawPolygon(polygonPoints, {
			fill: intersectionColor,
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}">${svgBody}</svg>`
}