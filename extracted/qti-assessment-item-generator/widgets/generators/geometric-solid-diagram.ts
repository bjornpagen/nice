import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { Path2D } from "@/lib/widgets/utils/path-builder"
import { theme } from "@/lib/widgets/utils/theme"

const Cylinder = z
	.object({
		type: z.literal("cylinder").describe("Specifies a circular cylinder shape."),
		radius: z
			.number()
			.describe(
				"Radius of the circular base in arbitrary units (e.g., 3, 5, 4.5). The cylinder has uniform circular cross-sections."
			),
		height: z
			.number()
			.describe(
				"Height of the cylinder along its axis in arbitrary units (e.g., 8, 10, 6.5). The distance between the two circular bases."
			)
	})
	.strict()

const Cone = z
	.object({
		type: z.literal("cone").describe("Specifies a circular cone shape."),
		radius: z
			.number()
			.describe(
				"Radius of the circular base in arbitrary units (e.g., 4, 6, 3.5). The base is at the bottom of the cone."
			),
		height: z
			.number()
			.describe(
				"Perpendicular height from base to apex in arbitrary units (e.g., 7, 9, 5.5). Measured along the cone's axis."
			)
	})
	.strict()

const Sphere = z
	.object({
		type: z.literal("sphere").describe("Specifies a perfect sphere shape."),
		radius: z
			.number()
			.describe(
				"Radius of the sphere in arbitrary units (e.g., 5, 8, 4). All points on the surface are equidistant from center."
			)
	})
	.strict()

const DimensionLabel = z
	.object({
		target: z
			.enum(["radius", "height"])
			.describe(
				"Which dimension to label. 'radius' labels the radius/diameter, 'height' labels vertical dimension (not applicable for spheres)."
			),
		text: z
			.string()
			.describe(
				"The label text to display (e.g., 'r = 5', '10 cm', 'h = 8', 'd = 10'). Can include units, equations, or simple values."
			)
	})
	.strict()

export const GeometricSolidDiagramPropsSchema = z
	.object({
		type: z
			.literal("geometricSolidDiagram")
			.describe("Identifies this as a geometric solid diagram showing 3D shapes with dimension labels."),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the diagram in pixels (e.g., 300, 400, 350). Must accommodate the 3D projection and labels."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the diagram in pixels (e.g., 300, 400, 350). Should fit the shape with comfortable padding."
			),
		shape: z
			.discriminatedUnion("type", [Cylinder, Cone, Sphere])
			.describe("The 3D geometric solid to display. Each type has specific dimension requirements."),
		labels: z
			.array(DimensionLabel)
			.describe(
				"Dimension labels to display on the shape. Empty array means no labels. Can label radius, height, or both as appropriate for the shape type."
			)
	})
	.strict()
	.describe(
		"Creates 3D geometric solids (cylinder, cone, sphere) with optional dimension labels. Uses isometric-style projection to show depth. Essential for teaching volume, surface area, and 3D geometry concepts. Labels help identify key measurements for calculations."
	)

export type GeometricSolidDiagramProps = z.infer<typeof GeometricSolidDiagramPropsSchema>

/**
 * Generates a 3D diagram of a geometric solid with curved surfaces (e.g., cylinder, cone).
 * Supports dimension labels for volume and surface area problems.
 */
export const generateGeometricSolidDiagram: WidgetGenerator<typeof GeometricSolidDiagramPropsSchema> = async (data) => {
	const { width, height, shape, labels } = data

	// --- NEW SCALING AND DRAWING LOGIC ---

	const labelSpace = labels.length > 0 ? 40 : 0 // Extra space for external labels

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})

	canvas.addDef(
		`<marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${theme.colors.black}" /></marker>`
	)

	const availableWidth = width - 2 * PADDING - labelSpace
	const availableHeight = height - 2 * PADDING - labelSpace

	if (shape.type === "cylinder") {
		const scale = Math.min(availableWidth / (shape.radius * 2), availableHeight / shape.height)
		const r = shape.radius * scale
		const h = shape.height * scale
		const ry = r * 0.25 // Ellipse perspective ratio

		const cx = width / 2
		const topY = (height - h) / 2
		const bottomY = topY + h

		// Canvas automatically tracks extents

		// Side lines
		canvas.drawLine(cx - r, topY, cx - r, bottomY, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})
		canvas.drawLine(cx + r, topY, cx + r, bottomY, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})

		// Bottom base (draw back dashed part first, then front solid part)
		const bottomBackPath = new Path2D().moveTo(cx - r, bottomY).arcTo(r, ry, 0, 0, 0, cx + r, bottomY)
		canvas.drawPath(bottomBackPath, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick,
			dash: theme.stroke.dasharray.dashed
		})
		const bottomFrontPath = new Path2D().moveTo(cx - r, bottomY).arcTo(r, ry, 0, 0, 1, cx + r, bottomY)
		canvas.drawPath(bottomFrontPath, {
			fill: "rgba(200, 200, 200, 0.2)",
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})

		// Top base
		canvas.drawEllipse(cx, topY, r, ry, {
			fill: "rgba(220, 220, 220, 0.4)",
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})

		for (const l of labels) {
			if (l.target === "radius") {
				// Dashed line for radius on the bottom base
				canvas.drawLine(cx, bottomY, cx + r, bottomY, {
					stroke: theme.colors.black,
					strokeWidth: theme.stroke.width.base,
					dash: theme.stroke.dasharray.backEdge
				})
				const textY = Math.min(bottomY + 18, height - 10) // Ensure text stays within bounds
				canvas.drawText({
					x: cx + r / 2,
					y: textY,
					text: l.text,
					anchor: "middle",
					fontPx: 7
				})
			}
			if (l.target === "height") {
				// External line with arrows for height
				const lineX = Math.min(cx + r + 15, width - 50) // Ensure it stays within bounds
				canvas.drawLine(lineX, topY, lineX, bottomY, {
					stroke: theme.colors.black,
					strokeWidth: theme.stroke.width.base,
					markerStart: "url(#arrow)",
					markerEnd: "url(#arrow)"
				})
				canvas.drawText({
					x: lineX + 10,
					y: height / 2,
					text: l.text,
					anchor: "start",
					fontPx: 7
				})
			}
		}
	} else if (shape.type === "cone") {
		const scale = Math.min(availableWidth / (shape.radius * 2), availableHeight / shape.height)
		const r = shape.radius * scale
		const h = shape.height * scale
		const ry = r * 0.25 // Ellipse perspective ratio

		const cx = width / 2
		const apexY = (height - h) / 2
		const baseY = apexY + h

		// Canvas automatically tracks extents

		// Generator lines
		canvas.drawLine(cx - r, baseY, cx, apexY, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})
		canvas.drawLine(cx + r, baseY, cx, apexY, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})

		// Base (draw back dashed part first, then front solid part)
		const baseBackPath = new Path2D().moveTo(cx - r, baseY).arcTo(r, ry, 0, 0, 0, cx + r, baseY)
		canvas.drawPath(baseBackPath, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick,
			dash: theme.stroke.dasharray.dashed
		})
		const baseFrontPath = new Path2D().moveTo(cx - r, baseY).arcTo(r, ry, 0, 0, 1, cx + r, baseY)
		canvas.drawPath(baseFrontPath, {
			fill: "rgba(200, 200, 200, 0.2)",
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})

		for (const l of labels) {
			if (l.target === "radius") {
				// Dashed line from center to right for radius
				canvas.drawLine(cx, baseY, cx + r, baseY, {
					stroke: theme.colors.black,
					strokeWidth: theme.stroke.width.base,
					dash: theme.stroke.dasharray.backEdge
				})
				const textY = Math.min(baseY + 18, height - 10) // Ensure text stays within bounds
				canvas.drawText({
					x: cx + r / 2,
					y: textY,
					text: l.text,
					anchor: "middle",
					fontPx: 7
				})
			}
			if (l.target === "height") {
				// Dashed line from apex to center for height
				canvas.drawLine(cx, apexY, cx, baseY, {
					stroke: theme.colors.black,
					strokeWidth: theme.stroke.width.base,
					dash: theme.stroke.dasharray.backEdge
				})
				// Right angle indicator
				const indicatorSize = Math.min(10, r * 0.2)
				const indicatorPath = new Path2D()
					.moveTo(cx + indicatorSize, baseY)
					.lineTo(cx + indicatorSize, baseY - indicatorSize)
					.lineTo(cx, baseY - indicatorSize)
				canvas.drawPath(indicatorPath, {
					stroke: theme.colors.black,
					strokeWidth: theme.stroke.width.thin
				})
				canvas.drawText({
					x: cx - 10,
					y: height / 2,
					text: l.text,
					anchor: "end",
					fontPx: 7
				})
			}
		}
	} else if (shape.type === "sphere") {
		const scale = Math.min(availableWidth / (shape.radius * 2), availableHeight / (shape.radius * 2))
		const r = shape.radius * scale
		const ry = r * 0.3 // Ellipse perspective ratio for equator

		const cx = width / 2
		const cy = height / 2

		// Canvas automatically tracks extents

		// Main sphere outline
		canvas.drawEllipse(cx, cy, r, r, {
			fill: "rgba(220, 220, 220, 0.4)",
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})

		// Internal equator for 3D effect (dashed back, solid front)
		const equatorBackPath = new Path2D().moveTo(cx - r, cy).arcTo(r, ry, 0, 0, 0, cx + r, cy)
		canvas.drawPath(equatorBackPath, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.base,
			dash: theme.stroke.dasharray.dashed
		})
		const equatorFrontPath = new Path2D().moveTo(cx - r, cy).arcTo(r, ry, 0, 0, 1, cx + r, cy)
		canvas.drawPath(equatorFrontPath, {
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.base
		})

		for (const l of labels) {
			if (l.target === "radius") {
				// Dashed line from center to circumference for radius
				canvas.drawLine(cx, cy, cx + r, cy, {
					stroke: theme.colors.black,
					strokeWidth: theme.stroke.width.base,
					dash: theme.stroke.dasharray.backEdge
				})
				canvas.drawText({
					x: cx + r / 2,
					y: cy - 10,
					text: l.text,
					anchor: "middle",
					fontPx: 7
				})
			}
		}
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.medium}">${svgBody}</svg>`
}
