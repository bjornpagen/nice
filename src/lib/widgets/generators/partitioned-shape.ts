import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

// Helper function to create grid point schema inline
const createGridPointSchema = () =>
	z
		.object({
			row: z.number().int().describe("The 0-based row index."),
			col: z.number().int().describe("The 0-based column index.")
		})
		.strict()

// ENHANCED: The schema for a single shape in partition mode
const PartitionShapeSchema = z
	.object({
		type: z.enum(["rectangle", "circle"]).describe("The type of geometric shape to render."),
		totalParts: z
			.number()
			.int()
			.positive()
			.describe("Total number of equal parts (rows * columns for rectangle, segments for circle)."),
		// MODIFIED: From `shadedParts: number` to `shadedCells: number[]` for flexibility
		shadedCells: z.array(z.number().int().min(0)).nullable().describe("A list of 0-based cell indices to be shaded."),
		rows: z
			.number()
			.int()
			.positive()
			.nullable()
			.transform((val) => val ?? 1),
		columns: z.number().int().positive().nullable(),
		shadeColor: z
			.string()
			.nullable()
			.transform((val) => val ?? "#6495ED")
	})
	.strict()
	.refine(
		(data) => {
			if (data.type === "rectangle" && data.rows && data.columns) {
				return data.rows * data.columns === data.totalParts
			}
			return true
		},
		{
			message: "For a rectangle, rows * columns must equal totalParts"
		}
	)

// Helper function to create line overlay schema inline
const createLineOverlaySchema = () =>
	z.object({
		from: createGridPointSchema(),
		to: createGridPointSchema(),
		style: z.enum(["solid", "dashed", "dotted"]).nullable(),
		color: z.string().nullable()
	})

const createFigureSchema = () =>
	z.object({
		vertices: z.array(createGridPointSchema()),
		fillColor: z.string().nullable(),
		strokeColor: z.string().nullable()
	})

const createGridSchema = () =>
	z.object({
		rows: z.number().int().positive(),
		columns: z.number().int().positive(),
		opacity: z.number().min(0).max(1).nullable().default(0.2)
	})

// NEW: Define schemas inline to avoid $ref generation
export const PartitionedShapePropsSchema = z.discriminatedUnion("mode", [
	z.object({
		type: z.literal("partitionedShape"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 200),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 200),
		mode: z.literal("partition"),
		shapes: z.array(PartitionShapeSchema).min(1),
		layout: z
			.enum(["horizontal", "vertical"])
			.nullable()
			.transform((val) => val ?? "horizontal"),
		overlays: z.array(createLineOverlaySchema()).nullable()
	}),
	z.object({
		type: z.literal("partitionedShape"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 200),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 200),
		mode: z.literal("geometry"),
		grid: createGridSchema(),
		figures: z.array(createFigureSchema()).nullable(),
		lines: z.array(createLineOverlaySchema()).nullable()
	})
])

export type PartitionedShapeProps = z.infer<typeof PartitionedShapePropsSchema>

// Extract the types for each mode
type PartitionModeProps = Extract<PartitionedShapeProps, { mode: "partition" }>
type GeometryModeProps = Extract<PartitionedShapeProps, { mode: "geometry" }>

// NEW: Rendering function for "partition" mode
const generatePartitionView = (props: PartitionModeProps): string => {
	const { shapes, width: shapeWidth, height: shapeHeight, layout, overlays } = props
	const rad = (deg: number) => (deg * Math.PI) / 180
	const gap = 20
	const totalWidth = layout === "horizontal" ? shapes.length * shapeWidth + (shapes.length - 1) * gap : shapeWidth
	const totalHeight = layout === "vertical" ? shapes.length * shapeHeight + (shapes.length - 1) * gap : shapeHeight

	let svg = `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">`

	shapes.forEach((s, idx) => {
		const xOffset = layout === "horizontal" ? idx * (shapeWidth + gap) : 0
		const yOffset = layout === "vertical" ? idx * (shapeHeight + gap) : 0

		if (s.type === "rectangle") {
			const rows = s.rows
			const cols = s.columns ?? s.totalParts
			const cellW = shapeWidth / cols
			const cellH = shapeHeight / rows

			// NEW LOGIC: Use shadedCells array instead of shadedParts count
			const shadedSet = new Set(s.shadedCells ?? [])

			for (let i = 0; i < s.totalParts; i++) {
				const row = Math.floor(i / cols)
				const col = i % cols
				const fill = shadedSet.has(i) ? s.shadeColor : "none"
				svg += `<rect x="${xOffset + col * cellW}" y="${yOffset + row * cellH}" width="${cellW}" height="${cellH}" fill="${fill}" stroke="#333333" stroke-width="1"/>`
			}
		} else if (s.type === "circle") {
			const cx = xOffset + shapeWidth / 2
			const cy = yOffset + shapeHeight / 2
			const r = Math.min(shapeWidth, shapeHeight) / 2 - 5
			const angleStep = 360 / s.totalParts

			// NEW LOGIC: Use shadedCells array for circles too
			const shadedSet = new Set(s.shadedCells ?? [])

			for (let i = 0; i < s.totalParts; i++) {
				const startAngle = i * angleStep - 90 // Start from top
				const endAngle = (i + 1) * angleStep - 90
				const startRad = rad(startAngle)
				const endRad = rad(endAngle)
				const largeArc = angleStep > 180 ? 1 : 0
				const fill = shadedSet.has(i) ? s.shadeColor : "none"

				const x1 = cx + r * Math.cos(startRad)
				const y1 = cy + r * Math.sin(startRad)
				const x2 = cx + r * Math.cos(endRad)
				const y2 = cy + r * Math.sin(endRad)

				svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${fill}" stroke="#333333" stroke-width="1"/>`
			}
		}
	})

	// ADDITION: Add logic to render overlays if they exist
	if (overlays) {
		const firstShape = shapes[0]
		if (firstShape && firstShape.type === "rectangle") {
			const cellWidth = shapeWidth / (firstShape.columns ?? firstShape.totalParts)
			const cellHeight = shapeHeight / firstShape.rows

			for (const line of overlays) {
				const fromX = line.from.col * cellWidth
				const fromY = line.from.row * cellHeight
				const toX = line.to.col * cellWidth
				const toY = line.to.row * cellHeight

				let strokeDasharray = ""
				if (line.style === "dashed") {
					strokeDasharray = "5,5"
				} else if (line.style === "dotted") {
					strokeDasharray = "2,2"
				}
				const strokeColor = line.color ?? "#000000"

				svg += `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="${strokeDasharray}"/>`
			}
		}
	}

	svg += "</svg>"
	return svg
}

// NEW: Rendering function for "geometry" mode
const generateGeometryView = (props: GeometryModeProps): string => {
	const { width, height, grid, figures, lines } = props
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`

	const cellWidth = width / grid.columns
	const cellHeight = height / grid.rows
	const gridOpacity = grid.opacity ?? 0.2

	// Utility to convert grid coordinates to pixel coordinates
	const gridToPixel = (pos: { row: number; col: number }) => {
		return {
			x: pos.col * cellWidth + cellWidth / 2,
			y: pos.row * cellHeight + cellHeight / 2
		}
	}

	// 1. Draw background grid
	// Vertical lines
	for (let col = 0; col <= grid.columns; col++) {
		const x = col * cellWidth
		svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#000000" stroke-width="1" opacity="${gridOpacity}"/>`
	}
	// Horizontal lines
	for (let row = 0; row <= grid.rows; row++) {
		const y = row * cellHeight
		svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#000000" stroke-width="1" opacity="${gridOpacity}"/>`
	}

	// 2. Draw figures
	if (figures) {
		for (const fig of figures) {
			const pointsStr = fig.vertices
				.map((p) => {
					const pixel = gridToPixel(p)
					return `${pixel.x},${pixel.y}`
				})
				.join(" ")
			svg += `<polygon points="${pointsStr}" fill="${fig.fillColor ?? "none"}" stroke="${fig.strokeColor ?? "black"}" stroke-width="2"/>`
		}
	}

	// 3. Draw lines
	if (lines) {
		for (const line of lines) {
			const fromPixel = gridToPixel(line.from)
			const toPixel = gridToPixel(line.to)

			let strokeDasharray = ""
			if (line.style === "dashed") {
				strokeDasharray = "5,5"
			} else if (line.style === "dotted") {
				strokeDasharray = "2,2"
			}
			const strokeColor = line.color ?? "#000000"

			svg += `<line x1="${fromPixel.x}" y1="${fromPixel.y}" x2="${toPixel.x}" y2="${toPixel.y}" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="${strokeDasharray}"/>`
		}
	}

	svg += "</svg>"
	return svg
}

// MODIFIED: The main generator function is now a switcher
export const generatePartitionedShape: WidgetGenerator<typeof PartitionedShapePropsSchema> = (props) => {
	switch (props.mode) {
		case "partition":
			return generatePartitionView(props)
		case "geometry":
			return generateGeometryView(props)
	}
}
