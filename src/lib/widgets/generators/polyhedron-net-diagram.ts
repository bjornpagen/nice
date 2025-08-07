import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidBaseShape = errors.new("invalid base shape for polyhedron type")

// Defines a square base shape
const SquareBaseSchema = z
	.object({
		type: z.literal("square"),
		side: z.number()
	})
	.strict()

// Defines a rectangle base shape
const RectangleBaseSchema = z
	.object({
		type: z.literal("rectangle"),
		length: z.number(),
		width: z.number()
	})
	.strict()

// Defines a triangle base shape
const TriangleBaseSchema = z
	.object({
		type: z.literal("triangle"),
		base: z.number(),
		height: z.number(),
		side1: z.number(),
		side2: z.number()
	})
	.strict()

// Defines a pentagon base shape
const PentagonBaseSchema = z
	.object({
		type: z.literal("pentagon"),
		side: z.number()
	})
	.strict()

// Defines the dimensions for the faces of the net.
const FaceDimensionsSchema = z
	.object({
		base: z
			.discriminatedUnion("type", [SquareBaseSchema, RectangleBaseSchema, TriangleBaseSchema, PentagonBaseSchema])
			.describe("The primary base shape of the polyhedron."),
		lateralHeight: z
			.number()
			.nullable()
			.describe("The height of the lateral rectangular faces (for prisms) or triangular faces (for pyramids).")
	})
	.strict()

// The main Zod schema for the polyhedronNetDiagram function
export const PolyhedronNetDiagramPropsSchema = z
	.object({
		type: z.literal("polyhedronNetDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 350)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 300)
			.describe("The total height of the output SVG container in pixels."),
		polyhedronType: z
			.enum(["cube", "rectangularPrism", "triangularPrism", "squarePyramid", "triangularPyramid", "pentagonalPyramid"])
			.describe("The type of polyhedron for which to generate a net."),
		dimensions: FaceDimensionsSchema.describe("An object specifying the dimensions of the faces."),
		showLabels: z.boolean().describe("If true, display the dimension labels on the net.")
	})
	.strict()
	.describe(
		'This template generates a two-dimensional "net" of a 3D polyhedron as an SVG graphic. A net is a 2D pattern that can be folded to form the 3D shape, and this template is essential for questions about surface area and the relationship between 2D and 3D geometry. The generator will render a specific, standard layout for the net of a given polyhedron. It programmatically arranges the component faces (squares, rectangles, triangles) in a connected pattern. This template is designed to create nets for various shapes: Cube: A cross-shaped layout of six identical squares. Rectangular Prism: A layout of six rectangles, typically with four in a row and two attached as "lids". Triangular Prism: A layout of three rectangles in a row with two triangular bases attached. Square Pyramid: A central square base with four triangles attached to its sides. Triangular Pyramid (Tetrahedron): A central triangular base with three other triangles attached to its sides. Pentagonal Pyramid: A central pentagonal base with five triangles attached to its sides. The diagram can be customized with dimension labels on the edges of the faces, allowing students to calculate the area of each component part. The final SVG is a clear and accurate representation of the unfolded solid.'
	)

export type PolyhedronNetDiagramProps = z.infer<typeof PolyhedronNetDiagramPropsSchema>

/**
 * This template generates a two-dimensional "net" of a 3D polyhedron as an SVG graphic.
 * A net is a 2D pattern that can be folded to form the 3D shape, and this template is
 * essential for questions about surface area and the relationship between 2D and 3D geometry.
 */
export const generatePolyhedronNetDiagram: WidgetGenerator<typeof PolyhedronNetDiagramPropsSchema> = (data) => {
	const { width, height, polyhedronType, dimensions, showLabels } = data

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="12">`

	const unit = 5

	const rect = (x: number, y: number, w: number, h: number) =>
		`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(200,200,200,0.3)" stroke="black" stroke-width="2"/>`

	const poly = (points: string) =>
		`<polygon points="${points}" fill="rgba(200,200,200,0.3)" stroke="black" stroke-width="2"/>`

	const drawGridLines = (x: number, y: number, w: number, h: number, dim_w: number, dim_h: number) => {
		const unit_w = w / dim_w
		const unit_h = h / dim_h
		let grid = ""
		for (let i = 1; i < dim_w; i++) {
			grid += `<line x1="${x + i * unit_w}" y1="${y}" x2="${x + i * unit_w}" y2="${y + h}" stroke="black" stroke-width="0.5"/>`
		}
		for (let i = 1; i < dim_h; i++) {
			grid += `<line x1="${x}" y1="${y + i * unit_h}" x2="${x + w}" y2="${y + i * unit_h}" stroke="black" stroke-width="0.5"/>`
		}
		return grid
	}

	if (polyhedronType === "cube") {
		if (dimensions.base.type !== "square") {
			throw errors.wrap(
				ErrInvalidBaseShape,
				`cube must have a square base, but received type '${dimensions.base.type}'`
			)
		}
		const side = dimensions.base.side
		if (dimensions.lateralHeight != null && dimensions.lateralHeight !== side) {
			throw errors.wrap(ErrInvalidBaseShape, "cube lateralHeight must be equal to side if provided")
		}
		const a = side
		const b = side
		const c = side
		const a_s = a * unit
		const b_s = b * unit
		const c_s = c * unit
		const totalW = 2 * (a_s + b_s)
		const totalH = 2 * b_s + c_s
		const scale = Math.min(width / totalW, height / totalH) * 0.9
		const u = unit * scale
		const a_u = a * u
		const b_u = b * u
		const c_u = c * u
		const x_offset = (width - 2 * (a_u + b_u)) / 2
		const y_offset = (height - (2 * b_u + c_u)) / 2
		const row_y = y_offset + b_u
		svg += rect(x_offset, row_y, b_u, c_u)
		svg += rect(x_offset + b_u, row_y, a_u, c_u)
		svg += rect(x_offset + b_u + a_u, row_y, b_u, c_u)
		svg += rect(x_offset + b_u + a_u + b_u, row_y, a_u, c_u)
		svg += rect(x_offset + b_u, y_offset, a_u, b_u)
		svg += rect(x_offset + b_u, row_y + c_u, a_u, b_u)
		if (showLabels) {
			svg += drawGridLines(x_offset, row_y, b_u, c_u, b, c)
			svg += drawGridLines(x_offset + b_u, row_y, a_u, c_u, a, c)
			svg += drawGridLines(x_offset + b_u + a_u, row_y, b_u, c_u, b, c)
			svg += drawGridLines(x_offset + b_u + a_u + b_u, row_y, a_u, c_u, a, c)
			svg += drawGridLines(x_offset + b_u, y_offset, a_u, b_u, a, b)
			svg += drawGridLines(x_offset + b_u, row_y + c_u, a_u, b_u, a, b)
		}
	} else if (polyhedronType === "rectangularPrism") {
		if (dimensions.base.type !== "rectangle") {
			throw errors.wrap(
				ErrInvalidBaseShape,
				`rectangularPrism must have a rectangle base, but received type '${dimensions.base.type}'`
			)
		}
		if (dimensions.lateralHeight == null) {
			throw errors.wrap(ErrInvalidBaseShape, "lateralHeight is required for rectangularPrism")
		}
		const length = dimensions.base.length
		const width = dimensions.base.width
		const prismHeight = dimensions.lateralHeight
		const a = length
		const b = width
		const c = prismHeight
		const a_s = a * unit
		const b_s = b * unit
		const c_s = c * unit
		const totalW = 2 * (a_s + b_s)
		const totalH = 2 * b_s + c_s
		const scale = Math.min(width / totalW, height / totalH) * 0.9
		const u = unit * scale
		const a_u = a * u
		const b_u = b * u
		const c_u = c * u
		const x_offset = (width - 2 * (a_u + b_u)) / 2
		const y_offset = (height - (2 * b_u + c_u)) / 2
		const row_y = y_offset + b_u
		svg += rect(x_offset, row_y, b_u, c_u) // side
		svg += rect(x_offset + b_u, row_y, a_u, c_u) // front
		svg += rect(x_offset + b_u + a_u, row_y, b_u, c_u) // side
		svg += rect(x_offset + b_u + a_u + b_u, row_y, a_u, c_u) // back
		svg += rect(x_offset + b_u, y_offset, a_u, b_u) // top
		svg += rect(x_offset + b_u, row_y + c_u, a_u, b_u) // bottom
		if (showLabels) {
			svg += drawGridLines(x_offset, row_y, b_u, c_u, width, prismHeight)
			svg += drawGridLines(x_offset + b_u, row_y, a_u, c_u, length, prismHeight)
			svg += drawGridLines(x_offset + b_u + a_u, row_y, b_u, c_u, width, prismHeight)
			svg += drawGridLines(x_offset + b_u + a_u + b_u, row_y, a_u, c_u, length, prismHeight)
			svg += drawGridLines(x_offset + b_u, y_offset, a_u, b_u, length, width)
			svg += drawGridLines(x_offset + b_u, row_y + c_u, a_u, b_u, length, width)
		}
	} else if (polyhedronType === "triangularPrism") {
		if (dimensions.base.type !== "triangle") {
			throw errors.wrap(
				ErrInvalidBaseShape,
				`triangularPrism must have a triangle base, but received type '${dimensions.base.type}'`
			)
		}
		if (dimensions.lateralHeight == null) {
			throw errors.wrap(ErrInvalidBaseShape, "lateralHeight is required for triangularPrism")
		}
		const base_len = dimensions.base.base
		const tri_h = dimensions.base.height
		const side1 = dimensions.base.side1
		const side2 = dimensions.base.side2
		const prism_h = dimensions.lateralHeight
		let d = (side1 ** 2 + base_len ** 2 - side2 ** 2) / (2 * base_len)
		let extend_left = Math.max(0, -d)
		let extend_right = Math.max(0, d - base_len)
		const row_w_units = side1 + base_len + side2 + extend_left + extend_right
		const total_w_units = row_w_units
		const total_h_units = tri_h * 2 + prism_h
		const scale = Math.min(width / (total_w_units * unit), height / (total_h_units * unit)) * 0.9
		const u = unit * scale
		const x_offset = (width - total_w_units * u) / 2
		const y_offset = (height - total_h_units * u) / 2
		const row_start_x = x_offset + extend_left * u
		const row_y = y_offset + tri_h * u
		const side1_u = side1 * u
		const base_u = base_len * u
		const side2_u = side2 * u
		const prism_h_u = prism_h * u
		const tri_h_u = tri_h * u
		svg += rect(row_start_x, row_y, side1_u, prism_h_u)
		const middle_x = row_start_x + side1_u
		svg += rect(middle_x, row_y, base_u, prism_h_u)
		const right_x = middle_x + base_u
		svg += rect(right_x, row_y, side2_u, prism_h_u)
		const top_left = middle_x
		const top_right = middle_x + base_u
		const top_y_base = row_y
		const top_apex_x = middle_x + d * u
		const top_apex_y = row_y - tri_h_u
		svg += poly(`${top_left},${top_y_base} ${top_right},${top_y_base} ${top_apex_x},${top_apex_y}`)
		const bot_y_base = row_y + prism_h_u
		const bot_apex_y = bot_y_base + tri_h_u
		const bot_apex_x = middle_x + d * u
		svg += poly(`${top_left},${bot_y_base} ${top_right},${bot_y_base} ${bot_apex_x},${bot_apex_y}`)
		if (showLabels) {
			svg += drawGridLines(row_start_x, row_y, side1_u, prism_h_u, side1, prism_h)
			svg += drawGridLines(middle_x, row_y, base_u, prism_h_u, base_len, prism_h)
			svg += drawGridLines(right_x, row_y, side2_u, prism_h_u, side2, prism_h)
		}
	} else if (polyhedronType === "squarePyramid") {
		if (dimensions.base.type !== "square") {
			throw errors.wrap(
				ErrInvalidBaseShape,
				`squarePyramid must have a square base, but received type '${dimensions.base.type}'`
			)
		}
		if (dimensions.lateralHeight == null) {
			throw errors.wrap(ErrInvalidBaseShape, "lateralHeight is required for squarePyramid")
		}
		const side = dimensions.base.side
		const lat_h = dimensions.lateralHeight
		const s_s = side * unit
		const lat_s = lat_h * unit
		const totalW = s_s + 2 * lat_s
		const totalH = s_s + 2 * lat_s
		const scale = Math.min(width / totalW, height / totalH) * 0.9
		const u = unit * scale
		const s_u = side * u
		const lat_u = lat_h * u
		const x_offset = (width - (s_u + 2 * lat_u)) / 2
		const y_offset = (height - (s_u + 2 * lat_u)) / 2
		const base_x = x_offset + lat_u
		const base_y = y_offset + lat_u
		svg += rect(base_x, base_y, s_u, s_u)
		const top_base_y = base_y
		const top_left_x = base_x
		const top_right_x = base_x + s_u
		const apex_d = side / 2
		const top_apex_x = base_x + apex_d * u
		const top_apex_y = base_y - lat_u
		svg += poly(`${top_left_x},${top_base_y} ${top_right_x},${top_base_y} ${top_apex_x},${top_apex_y}`)
		const bot_base_y = base_y + s_u
		const bot_apex_y = bot_base_y + lat_u
		const bot_apex_x = base_x + apex_d * u
		svg += poly(`${top_left_x},${bot_base_y} ${top_right_x},${bot_base_y} ${bot_apex_x},${bot_apex_y}`)
		const left_base_top_y = base_y
		const left_base_bot_y = base_y + s_u
		const left_base_x = base_x
		const left_apex_x = base_x - lat_u
		const left_apex_y = base_y + apex_d * u
		svg += poly(`${left_base_x},${left_base_top_y} ${left_base_x},${left_base_bot_y} ${left_apex_x},${left_apex_y}`)
		const right_base_x = base_x + s_u
		const right_apex_x = right_base_x + lat_u
		const right_apex_y = base_y + apex_d * u
		svg += poly(`${right_base_x},${left_base_top_y} ${right_base_x},${left_base_bot_y} ${right_apex_x},${right_apex_y}`)
		if (showLabels) {
			svg += drawGridLines(base_x, base_y, s_u, s_u, side, side)
		}
	} else if (polyhedronType === "triangularPyramid") {
		if (dimensions.base.type !== "triangle") {
			throw errors.wrap(
				ErrInvalidBaseShape,
				`triangularPyramid must have a triangle base, but received type '${dimensions.base.type}'`
			)
		}
		if (dimensions.lateralHeight == null) {
			throw errors.wrap(ErrInvalidBaseShape, "lateralHeight is required for triangularPyramid")
		}
		const base_len = dimensions.base.base
		const tri_h = dimensions.base.height
		const side1 = dimensions.base.side1
		const side2 = dimensions.base.side2
		const lat_h = dimensions.lateralHeight
		const d = (side1 ** 2 + base_len ** 2 - side2 ** 2) / (2 * base_len)
		interface Point {
			x: number
			y: number
		}
		const p1: Point = { x: 0, y: 0 }
		const p2: Point = { x: base_len, y: 0 }
		const p3: Point = { x: d, y: -tri_h }
		const getApex = (pa: Point, pb: Point, pc: Point): Point => {
			const ex = pb.x - pa.x
			const ey = pb.y - pa.y
			const mx = (pa.x + pb.x) / 2
			const my = (pa.y + pb.y) / 2
			const cross = ex * (pc.y - pa.y) - ey * (pc.x - pa.x)
			let px: number
			let py: number
			if (cross > 0) {
				px = ey
				py = -ex
			} else {
				px = -ey
				py = ex
			}
			const plen = Math.sqrt(px ** 2 + py ** 2)
			const ux = px / plen
			const uy = py / plen
			return { x: mx + lat_h * ux, y: my + lat_h * uy }
		}
		const apex_base = getApex(p1, p2, p3)
		const apex_side1 = getApex(p1, p3, p2)
		const apex_side2 = getApex(p3, p2, p1)
		const all_points: Point[] = [p1, p2, p3, apex_base, apex_side1, apex_side2]
		let min_x = Math.min(...all_points.map((p) => p.x))
		let max_x = Math.max(...all_points.map((p) => p.x))
		let min_y = Math.min(...all_points.map((p) => p.y))
		let max_y = Math.max(...all_points.map((p) => p.y))
		const total_w_units = max_x - min_x
		const total_h_units = max_y - min_y
		const scale = Math.min(width / total_w_units, height / total_h_units) * 0.9
		const u = scale
		const x_offset = (width - total_w_units * u) / 2
		const y_offset = (height - total_h_units * u) / 2
		const to_px_x = (ux: number) => (ux - min_x) * u + x_offset
		const to_px_y = (uy: number) => (uy - min_y) * u + y_offset
		svg += poly(`${to_px_x(p1.x)},${to_px_y(p1.y)} ${to_px_x(p2.x)},${to_px_y(p2.y)} ${to_px_x(p3.x)},${to_px_y(p3.y)}`)
		svg += poly(
			`${to_px_x(p1.x)},${to_px_y(p1.y)} ${to_px_x(p2.x)},${to_px_y(p2.y)} ${to_px_x(apex_base.x)},${to_px_y(apex_base.y)}`
		)
		svg += poly(
			`${to_px_x(p1.x)},${to_px_y(p1.y)} ${to_px_x(p3.x)},${to_px_y(p3.y)} ${to_px_x(apex_side1.x)},${to_px_y(apex_side1.y)}`
		)
		svg += poly(
			`${to_px_x(p3.x)},${to_px_y(p3.y)} ${to_px_x(p2.x)},${to_px_y(p2.y)} ${to_px_x(apex_side2.x)},${to_px_y(apex_side2.y)}`
		)
	} else if (polyhedronType === "pentagonalPyramid") {
		if (dimensions.base.type !== "pentagon") {
			throw errors.wrap(
				ErrInvalidBaseShape,
				`pentagonalPyramid must have a pentagon base, but received type '${dimensions.base.type}'`
			)
		}
		if (dimensions.lateralHeight == null) {
			throw errors.wrap(ErrInvalidBaseShape, "lateralHeight is required for pentagonalPyramid")
		}
		const side = dimensions.base.side
		const lat_h = dimensions.lateralHeight
		interface Point {
			x: number
			y: number
		}
		const sin_pi5 = Math.sin(Math.PI / 5)
		const R = side / (2 * sin_pi5)
		let points: Point[] = []
		for (let i = 0; i < 5; i++) {
			const theta = (2 * Math.PI * i) / 5 - Math.PI / 2
			points.push({
				x: R * Math.cos(theta),
				y: R * Math.sin(theta)
			})
		}
		const getApex = (pa: Point, pb: Point, pc: Point): Point => {
			const ex = pb.x - pa.x
			const ey = pb.y - pa.y
			const mx = (pa.x + pb.x) / 2
			const my = (pa.y + pb.y) / 2
			const cross = ex * (pc.y - pa.y) - ey * (pc.x - pa.x)
			let px: number
			let py: number
			if (cross > 0) {
				px = ey
				py = -ex
			} else {
				px = -ey
				py = ex
			}
			const plen = Math.sqrt(px ** 2 + py ** 2)
			const ux = px / plen
			const uy = py / plen
			return { x: mx + lat_h * ux, y: my + lat_h * uy }
		}
		let all_points: Point[] = [...points]
		let apexes: Point[] = []
		for (let j = 0; j < 5; j++) {
			const pa = points[j]
			const pb = points[(j + 1) % 5]
			const pc = points[(j + 2) % 5]
			if (!pa || !pb || !pc) continue
			const apex = getApex(pa, pb, pc)
			apexes.push(apex)
			all_points.push(apex)
		}
		let min_x = Math.min(...all_points.map((p) => p.x))
		let max_x = Math.max(...all_points.map((p) => p.x))
		let min_y = Math.min(...all_points.map((p) => p.y))
		let max_y = Math.max(...all_points.map((p) => p.y))
		const total_w_units = max_x - min_x
		const total_h_units = max_y - min_y
		const scale = Math.min(width / total_w_units, height / total_h_units) * 0.9
		const u = scale
		const x_offset = (width - total_w_units * u) / 2
		const y_offset = (height - total_h_units * u) / 2
		const to_px_x = (ux: number) => (ux - min_x) * u + x_offset
		const to_px_y = (uy: number) => (uy - min_y) * u + y_offset
		const base_points_str = points.map((p) => `${to_px_x(p.x)},${to_px_y(p.y)}`).join(" ")
		svg += poly(base_points_str)
		for (let j = 0; j < 5; j++) {
			const pa = points[j]
			const pb = points[(j + 1) % 5]
			const apex = apexes[j]
			if (!pa || !pb || !apex) continue
			svg += poly(
				`${to_px_x(pa.x)},${to_px_y(pa.y)} ${to_px_x(pb.x)},${to_px_y(pb.y)} ${to_px_x(apex.x)},${to_px_y(apex.y)}`
			)
		}
	} else {
		throw errors.new(`polyhedron type '${polyhedronType}' is not implemented`)
	}
	svg += "</svg>"
	return svg
}
