import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrInvalidPartitionGeometry = errors.new("invalid partition geometry")

function createPartitionShapeSchema() {
	return z
		.object({
			type: z
				.enum(["rectangle", "circle"])
				.describe("Shape type. 'rectangle' creates a grid, 'circle' creates pie-like sectors."),
			totalParts: z
				.number()
				.int()
				.describe(
					"Total number of equal parts/cells in the shape (e.g., 12, 16, 8). For rectangles, must equal rows × columns."
				),
			shadedCells: z
				.array(z.number().int())
				.describe(
					"Zero-based indices of cells to shade with solid color (e.g., [0, 1, 2] shades first three). Empty array means no shading."
				),
			hatchedCells: z
				.array(z.number().int())
				.describe(
					"Zero-based indices of cells to fill with diagonal lines pattern (e.g., [3, 4]). Can overlap with shaded cells. Empty array means no hatching."
				),
			rows: z
				.number()
				.int()
				.describe("Number of rows for rectangle partition (e.g., 3, 4, 2). Ignored for circles. Must be positive."),
			columns: z
				.number()
				.int()
				.describe(
					"Number of columns for rectangle partition (e.g., 4, 3, 6). Ignored for circles. rows × columns must equal totalParts."
				),
			shadeColor: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
				.describe(
					"Hex-only color for shaded cells (e.g., '#4472C4', '#1E90FF', '#FF000080' for 50% alpha). Applies to all shaded cells."
				),
			shadeOpacity: z
				.number()
				.describe(
					"Opacity for shaded cells, 0-1 range (e.g., 0.3 for 30% opacity, 1 for solid). Allows seeing grid lines through shading."
				)
		})
		.strict()
}

function createLineOverlaySchema() {
	return z
		.object({
			from: z
				.object({
					row: z
						.number()
						.int()
						.describe("Starting row index (0-based). For grid intersections, can equal grid rows for bottom edge."),
					col: z
						.number()
						.int()
						.describe("Starting column index (0-based). For grid intersections, can equal grid columns for right edge.")
				})
				.strict(),
			to: z
				.object({
					row: z.number().int().describe("Ending row index (0-based). Creates line from 'from' to this point."),
					col: z.number().int().describe("Ending column index (0-based). Creates line from 'from' to this point.")
				})
				.strict(),
			style: z
				.enum(["solid", "dashed", "dotted"])
				.describe("Line style. 'solid' for main divisions, 'dashed' for auxiliary lines, 'dotted' for guidelines."),
			color: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
				.describe(
					"Hex-only color for the line (e.g., '#000000', '#FF0000', '#00000080' for 50% alpha). Should contrast with background."
				)
		})
		.strict()
}

function createFigureSchema() {
	return z
		.object({
			vertices: z
				.array(
					z
						.object({
							row: z
								.number()
								.int()
								.describe("Row coordinate of vertex (0-based). Can be fractional for positions between grid lines."),
							col: z
								.number()
								.int()
								.describe("Column coordinate of vertex (0-based). Can be fractional for positions between grid lines.")
						})
						.strict()
				)
				.describe(
					"Ordered vertices defining the polygon. Connect in sequence, closing back to first. Minimum 3 vertices."
				),
			fillColor: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
				.nullable()
				.describe(
					"Hex-only fill color for the polygon (e.g., '#FFC8004D' for ~30% alpha). Use transparency via 8-digit hex to show grid. null for no fill."
				),
			strokeColor: z
				.string()
				.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
				.nullable()
				.describe("Hex-only color for polygon outline (e.g., '#000000', '#00008B'). null for no outline.")
		})
		.strict()
}

export const PartitionedShapePropsSchema = z
	.discriminatedUnion("mode", [
		z
			.object({
				type: z.literal("partitionedShape").describe("Widget type identifier."),
				width: z
					.number()
					.positive()
					.describe("Total width in pixels (e.g., 400, 500, 300). Must fit all shapes with spacing."),
				height: z
					.number()
					.positive()
					.describe("Total height in pixels (e.g., 300, 400, 300). Must fit all shapes with spacing."),
				mode: z.literal("partition").describe("Partition mode: shows shapes divided into equal parts for fractions."),
				shapes: z
					.array(createPartitionShapeSchema())
					.describe(
						"Shapes to display. Can mix rectangles and circles. Order determines left-to-right or top-to-bottom placement."
					),
				layout: z
					.enum(["horizontal", "vertical"])
					.describe(
						"How to arrange multiple shapes. 'horizontal' places side-by-side, 'vertical' stacks top-to-bottom."
					),
				overlays: z
					.array(createLineOverlaySchema())
					.describe(
						"Additional lines to draw over shapes (e.g., to show equivalent fractions). Empty array means no overlays."
					)
			})
			.strict(),
		z
			.object({
				type: z.literal("partitionedShape").describe("Widget type identifier."),
				width: z
					.number()
					.positive()
					.describe("Total width in pixels (e.g., 500, 600, 400). Must accommodate the grid."),
				height: z
					.number()
					.positive()
					.describe("Total height in pixels (e.g., 400, 500, 350). Must accommodate the grid."),
				mode: z.literal("geometry").describe("Geometry mode: shows a coordinate grid with polygons and lines."),
				grid: z
					.object({
						rows: z.number().int().describe("Number of grid rows (e.g., 10, 8, 12). Creates horizontal lines."),
						columns: z.number().int().describe("Number of grid columns (e.g., 10, 12, 8). Creates vertical lines."),
						opacity: z
							.number()
							.describe(
								"Grid line opacity, 0-1 range (e.g., 0.2 for subtle, 0.5 for visible). Lower values emphasize figures."
							)
					})
					.strict()
					.describe("Background grid configuration."),
				figures: z
					.array(createFigureSchema())
					.describe(
						"Polygons to draw on the grid. Can represent geometric shapes, regions, or areas. Empty array means no figures."
					),
				lines: z
					.array(createLineOverlaySchema())
					.describe(
						"Additional line segments on the grid. Useful for diagonals, measurements, or constructions. Empty array means no extra lines."
					)
			})
			.strict()
	])
	.describe(
		"Creates either fraction partition diagrams or geometric grid diagrams. Partition mode shows shapes divided into equal parts with shading for teaching fractions. Geometry mode provides a coordinate grid for drawing polygons and line segments. Both modes support various visual overlays."
	)

export type PartitionedShapeProps = z.infer<typeof PartitionedShapePropsSchema>

// Extract the types for each mode
type PartitionModeProps = Extract<PartitionedShapeProps, { mode: "partition" }>
type GeometryModeProps = Extract<PartitionedShapeProps, { mode: "geometry" }>

const generatePartitionView = (props: PartitionModeProps): string => {
	const { shapes, width: shapeWidth, height: shapeHeight, layout, overlays } = props

	// Validate rectangle geometry
	for (const shape of shapes) {
		if (shape.type === "rectangle" && shape.rows * shape.columns !== shape.totalParts) {
			logger.error("invalid rectangle partition geometry", {
				rows: shape.rows,
				columns: shape.columns,
				expectedTotalParts: shape.rows * shape.columns,
				actualTotalParts: shape.totalParts
			})
			throw errors.wrap(
				ErrInvalidPartitionGeometry,
				`rectangle with rows=${shape.rows}, columns=${shape.columns} must have totalParts=${shape.rows * shape.columns}, got ${shape.totalParts}`
			)
		}
	}

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
			const cols = s.columns
			const cellW = shapeWidth / cols
			const cellH = shapeHeight / rows

			const shadedSet = new Set(s.shadedCells)
			const hatchedSet = new Set(s.hatchedCells)

			for (let i = 0; i < s.totalParts; i++) {
				const row = Math.floor(i / cols)
				const col = i % cols
				const isShaded = shadedSet.has(i)
				const isHatched = hatchedSet.has(i)

				const fill = isShaded ? s.shadeColor : "none"
				const opacity = isShaded ? s.shadeOpacity : 1

				svg += `<rect x="${xOffset + col * cellW}" y="${yOffset + row * cellH}" width="${cellW}" height="${cellH}" fill="${fill}" fill-opacity="${opacity}" stroke="#545454" stroke-width="1"/>`

				if (isHatched) {
					const cellId = `hatch-${idx}-${i}`
					svg += `<defs><pattern id="${cellId}" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
						<rect width="2" height="4" fill="#555" opacity="0.9"/>
					</pattern></defs>`
					svg += `<rect x="${xOffset + col * cellW}" y="${yOffset + row * cellH}" width="${cellW}" height="${cellH}" fill="url(#${cellId})" stroke="#545454" stroke-width="1"/>`
				}
			}
		} else if (s.type === "circle") {
			const cx = xOffset + shapeWidth / 2
			const cy = yOffset + shapeHeight / 2
			const r = Math.min(shapeWidth, shapeHeight) / 2 - 5
			const angleStep = 360 / s.totalParts

			const shadedSet = new Set(s.shadedCells)
			const hatchedSet = new Set(s.hatchedCells)

			for (let i = 0; i < s.totalParts; i++) {
				const startAngle = i * angleStep - 90
				const endAngle = (i + 1) * angleStep - 90
				const startRad = rad(startAngle)
				const endRad = rad(endAngle)
				const largeArc = angleStep > 180 ? 1 : 0
				const isShaded = shadedSet.has(i)
				const isHatched = hatchedSet.has(i)

				const fill = isShaded ? s.shadeColor : "none"
				const opacity = isShaded ? s.shadeOpacity : 1

				const x1 = cx + r * Math.cos(startRad)
				const y1 = cy + r * Math.sin(startRad)
				const x2 = cx + r * Math.cos(endRad)
				const y2 = cy + r * Math.sin(endRad)

				svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${fill}" fill-opacity="${opacity}" stroke="#545454" stroke-width="1"/>`

				if (isHatched) {
					const cellId = `hatch-circle-${idx}-${i}`
					svg += `<defs><pattern id="${cellId}" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
						<rect width="2" height="4" fill="#555" opacity="0.9"/>
					</pattern></defs>`
					svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="url(#${cellId})" stroke="#545454" stroke-width="1"/>`
				}
			}
		}
	})

	// Render overlays
	if (overlays.length > 0) {
		const firstShape = shapes[0]
		if (firstShape && firstShape.type === "rectangle") {
			const cellWidth = shapeWidth / firstShape.columns
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

				svg += `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${line.color}" stroke-width="2" stroke-dasharray="${strokeDasharray}"/>`
			}
		}
	}

	svg += "</svg>"
	return svg
}

const generateGeometryView = (props: GeometryModeProps): string => {
	const { width, height, grid, figures, lines } = props
	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`

	const cellWidth = width / grid.columns
	const cellHeight = height / grid.rows

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
		svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#000000" stroke-width="1" opacity="${grid.opacity}"/>`
	}
	// Horizontal lines
	for (let row = 0; row <= grid.rows; row++) {
		const y = row * cellHeight
		svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#000000" stroke-width="1" opacity="${grid.opacity}"/>`
	}

	// 2. Draw figures
	for (const fig of figures) {
		const pointsStr = fig.vertices
			.map((p) => {
				const pixel = gridToPixel(p)
				return `${pixel.x},${pixel.y}`
			})
			.join(" ")
		svg += `<polygon points="${pointsStr}" fill="${fig.fillColor ?? "none"}" stroke="${fig.strokeColor ?? "black"}" stroke-width="2"/>`
	}

	// 3. Draw lines
	for (const line of lines) {
		const fromPixel = gridToPixel(line.from)
		const toPixel = gridToPixel(line.to)

		let strokeDasharray = ""
		if (line.style === "dashed") {
			strokeDasharray = "5,5"
		} else if (line.style === "dotted") {
			strokeDasharray = "2,2"
		}

		svg += `<line x1="${fromPixel.x}" y1="${fromPixel.y}" x2="${toPixel.x}" y2="${toPixel.y}" stroke="${line.color}" stroke-width="2" stroke-dasharray="${strokeDasharray}"/>`
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
