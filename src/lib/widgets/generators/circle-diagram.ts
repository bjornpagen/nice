import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import { CanvasImpl } from "@/lib/widgets/utils/canvas-impl"
import { PADDING } from "@/lib/widgets/utils/constants"
import { CSS_COLOR_PATTERN } from "@/lib/widgets/utils/css-color"
import { Path2D } from "@/lib/widgets/utils/path-builder"
import { theme } from "@/lib/widgets/utils/theme"

// Defines a line segment, such as a radius or a diameter.
const SegmentSchema = z
	.object({
		type: z
			.enum(["radius", "diameter"])
			.describe(
				"Type of line segment. 'radius' draws from center to edge. 'diameter' draws across the full circle through center."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for the segment (e.g., 'r', 'd', '5 cm', 'radius = 3', null). Null shows no label. Positioned along the segment."
			),
		color: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"CSS color for the segment line (e.g., '#333333' for dark gray, 'red', 'rgba(0,0,255,0.8)'). Should contrast with circle fill."
			),
		angle: z
			.number()
			.describe(
				"Angle in degrees for radius placement or diameter orientation. 0° is rightward, 90° is upward, 180° is leftward, 270° is downward."
			)
	})
	.strict()
	.describe("Defines a line segment (a radius or diameter) to be drawn on the diagram.")

// Defines a sector (a pie slice) of the circle.
const SectorSchema = z
	.object({
		startAngle: z
			.number()
			.describe(
				"Starting angle in degrees for the sector arc. 0° is rightward (3 o'clock), angles increase counter-clockwise (e.g., 0, 45, 90, 180)."
			),
		endAngle: z
			.number()
			.describe(
				"Ending angle in degrees for the sector arc. Must be greater than startAngle. Full circle is 0 to 360 (e.g., 90, 180, 270, 360)."
			),
		fillColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"Hex-only fill color for the sector/wedge (e.g., '#FFE5B4', '#1E90FF', '#FF00004D' for ~30% alpha). Creates pie-slice effect."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for the sector (e.g., '90°', '1/4', '25%', 'A', null). Null shows no label. Positioned inside the sector near the arc."
			),
		showRightAngleMarker: z
			.boolean()
			.describe(
				"Whether to show a small square marker if this sector forms a 90° angle. Only meaningful when endAngle - startAngle = 90."
			)
	})
	.strict()
	.describe("Defines a sector (a pie slice) to fill a portion of the diagram.")

// Defines an arc (a portion of the circle's circumference).
const ArcSchema = z
	.object({
		startAngle: z
			.number()
			.describe(
				"Starting angle in degrees for the arc. 0° is rightward, increases counter-clockwise (e.g., 0, 30, 45, 90)."
			),
		endAngle: z
			.number()
			.describe(
				"Ending angle in degrees for the arc. Must be greater than startAngle (e.g., 90, 180, 270, 360). Arc is drawn counter-clockwise."
			),
		strokeColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"Hex-only color for the arc line (e.g., '#FF6B6B', '#1E90FF', '#008000'). Should be visible against background and sectors."
			),
		label: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Text label for the arc length or angle (e.g., '90°', 'πr', 's = 5', null). Null shows no label. Positioned along the arc."
			)
	})
	.strict()
	.describe("Defines an arc to be highlighted on the circumference of the diagram.")

// The main Zod schema for the circleDiagram function
export const CircleDiagramPropsSchema = z
	.object({
		type: z
			.literal("circleDiagram")
			.describe("Identifies this as a circle diagram widget for geometric circle visualizations."),
		shape: z
			.enum(["circle", "semicircle", "quarter-circle"])
			.describe(
				"The base shape. 'circle' is full 360°, 'semicircle' is 180° half-circle, 'quarter-circle' is 90° quadrant. Determines visible portion."
			),
		rotation: z
			.number()
			.describe(
				"Overall rotation of the shape in degrees. 0 means no rotation. For semicircle: 0 = flat side down, 90 = flat side left. Positive rotates counter-clockwise."
			),
		width: z
			.number()
			.positive()
			.describe(
				"Total width of the SVG in pixels (e.g., 300, 400, 250). Must accommodate the circle plus any labels. For non-circles, includes the full bounding box."
			),
		height: z
			.number()
			.positive()
			.describe(
				"Total height of the SVG in pixels (e.g., 300, 400, 250). Should typically equal width for circles to maintain aspect ratio."
			),
		radius: z
			.number()
			.positive()
			.describe(
				"Outer radius of the circle in pixels (e.g., 100, 120, 80). This is the main circle size. For annulus, this is the outer edge."
			),
		fillColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"Hex-only fill color for the main circle area (e.g., '#E8F4FD', 'white', 'transparent', '#FFFF004D' for ~30% alpha). Use 'transparent' for outline only."
			),
		strokeColor: z
			.string()
			.regex(CSS_COLOR_PATTERN, "invalid css color; use hex (#RGB, #RRGGBB, #RRGGBBAA)")
			.describe(
				"Hex-only color for the circle's border/outline (e.g., '#000000', '#333333', '#00008B'). Set to 'transparent' or match fillColor for no visible border."
			),
		innerRadius: z
			.number()
			.positive()
			.nullable()
			.describe(
				"Inner radius for annulus (ring) shape in pixels (e.g., 50, 60, 40). Must be less than radius. Creates a donut when annulusFillColor is set. Use null for no inner circle."
			),
		annulusFillColor: z
			.string()
			.nullable()
			.describe(
				"CSS fill color for the annulus/ring area between innerRadius and radius (e.g., '#FFE5B4', 'lightgray'). Use null for no annulus visualization."
			),
		segments: z
			.array(SegmentSchema)
			.describe(
				"Line segments (radii or diameters) to draw. Empty array means no segments. Use for showing radius/diameter measurements or dividing the circle."
			),
		sectors: z
			.array(SectorSchema)
			.describe(
				"Filled wedge sections (pie slices) of the circle. Empty array means no sectors. Useful for fractions, angles, and pie charts."
			),
		arcs: z
			.array(ArcSchema)
			.describe(
				"Curved arc segments along the circle's circumference. Empty array means no arcs. Use for showing arc length, angles, or partial perimeters."
			),
		showCenterDot: z
			.boolean()
			.describe(
				"Whether to display a small dot at the circle's center point. Helps identify the center for geometric constructions."
			),
		areaLabel: z
			.string()
			.nullable()
			.transform((val) => (val === "null" || val === "NULL" || val === "" ? null : val))
			.describe(
				"Label for the total area, displayed inside the circle (e.g., 'A = πr²', 'Area = 78.5 cm²', '314 sq units', null). Null shows no area label."
			)
	})
	.strict()
	.describe(
		"Creates geometric circle diagrams with optional sectors, segments, and arcs. Supports full circles, semicircles, and quarter-circles. Essential for geometry lessons on circumference, area, angles, and fractions. Can create pie charts, angle measurements, and annulus (ring) shapes."
	)

export type CircleDiagramProps = z.infer<typeof CircleDiagramPropsSchema>

/**
 * Generates an SVG diagram of a circle and its components.
 */
export const generateCircleDiagram: WidgetGenerator<typeof CircleDiagramPropsSchema> = (props) => {
	const {
		shape,
		rotation,
		width,
		height,
		radius,
		fillColor,
		strokeColor,
		innerRadius,
		annulusFillColor,
		segments,
		sectors,
		arcs,
		showCenterDot,
		areaLabel
	} = props

	const cx = width / 2
	const cy = height / 2
	const mainRadius = Math.min(cx, cy) - PADDING
	const scale = mainRadius / radius

	const toRad = (deg: number) => (deg * Math.PI) / 180
	const pointOnCircle = (angleDeg: number, r: number) => ({
		x: cx + r * Math.cos(toRad(angleDeg)),
		y: cy + r * Math.sin(toRad(angleDeg)) // +y is down in SVG
	})
	const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

	const canvas = new CanvasImpl({
		chartArea: { left: 0, top: 0, width, height },
		fontPxDefault: 12,
		lineHeightDefault: 1.2
	})
	const r = radius * scale

	// Annulus is only compatible with the full "circle" shape.
	if (shape === "circle" && innerRadius && annulusFillColor) {
		const r1 = radius * scale
		const r2 = innerRadius * scale
		const annulusPath = new Path2D()
			.moveTo(cx - r1, cy)
			.arcTo(r1, r1, 0, 0, 1, cx + r1, cy)
			.arcTo(r1, r1, 0, 0, 1, cx - r1, cy)
			.moveTo(cx - r2, cy)
			.arcTo(r2, r2, 0, 0, 1, cx + r2, cy)
			.arcTo(r2, r2, 0, 0, 1, cx - r2, cy)
		canvas.drawPath(annulusPath, {
			fill: annulusFillColor,
			fillRule: "evenodd"
		})
	}

	// Draw sectors first, so the main shape's stroke is drawn on top.
	if (sectors.length > 0) {
		for (const sector of sectors) {
			const start = pointOnCircle(sector.startAngle, r)
			const end = pointOnCircle(sector.endAngle, r)
			const angleDiff = Math.abs(sector.endAngle - sector.startAngle)
			const largeArcFlag: 0 | 1 = angleDiff > 180 ? 1 : 0
			const sectorPath = new Path2D()
				.moveTo(cx, cy)
				.lineTo(start.x, start.y)
				.arcTo(r, r, 0, largeArcFlag, 1, end.x, end.y)
				.closePath()
			canvas.drawPath(sectorPath, {
				fill: sector.fillColor,
				stroke: "none"
			})

			if (sector.showRightAngleMarker && Math.abs(angleDiff - 90) < 0.1) {
				const markerSize = Math.min(r, 20) * 0.8
				const p1 = pointOnCircle(sector.startAngle, markerSize)
				const p3 = pointOnCircle(sector.startAngle + 45, markerSize * Math.sqrt(2))
				const p2 = pointOnCircle(sector.endAngle, markerSize)
				const markerPath = new Path2D().moveTo(p1.x, p1.y).lineTo(p3.x, p3.y).lineTo(p2.x, p2.y)
				canvas.drawPath(markerPath, {
					fill: "none",
					stroke: theme.colors.black,
					strokeWidth: theme.stroke.width.base
				})
			}
		}
	}

	// Draw the main shape's boundary based on the 'shape' prop.
	switch (shape) {
		case "semicircle": {
			// A semicircle path from 0 to 180 degrees, rotated. Closing the path (Z) draws the diameter.
			const startAngle = 0 + rotation
			const endAngle = 180 + rotation
			const start = pointOnCircle(startAngle, r)
			const end = pointOnCircle(endAngle, r)
			const semicirclePath = new Path2D().moveTo(start.x, start.y).arcTo(r, r, 0, 0, 1, end.x, end.y).closePath()
			canvas.drawPath(semicirclePath, {
				fill: fillColor,
				stroke: strokeColor,
				strokeWidth: theme.stroke.width.thick
			})
			break
		}
		case "quarter-circle": {
			// A quarter-circle path from the center, out to the arc, and back to the center.
			const startAngle = 0 + rotation
			const endAngle = 90 + rotation
			const start = pointOnCircle(startAngle, r)
			const end = pointOnCircle(endAngle, r)
			const quarterCirclePath = new Path2D()
				.moveTo(cx, cy)
				.lineTo(start.x, start.y)
				.arcTo(r, r, 0, 0, 1, end.x, end.y)
				.closePath()
			canvas.drawPath(quarterCirclePath, {
				fill: fillColor,
				stroke: strokeColor,
				strokeWidth: theme.stroke.width.thick
			})
			break
		}
		default: {
			canvas.drawCircle(cx, cy, r, {
				fill: fillColor,
				stroke: strokeColor,
				strokeWidth: theme.stroke.width.thick
			})
			break
		}
	}

	// The inner circle is only drawn for the main "circle" shape.
	if (shape === "circle" && innerRadius) {
		const rInner = innerRadius * scale
		canvas.drawCircle(cx, cy, rInner, {
			fill: theme.colors.white,
			stroke: theme.colors.black,
			strokeWidth: theme.stroke.width.thick
		})
	}

	// Arcs are drawn on top of the main shape.
	if (arcs.length > 0) {
		for (const arc of arcs) {
			const start = pointOnCircle(arc.startAngle, r)
			const end = pointOnCircle(arc.endAngle, r)
			const largeArcFlag: 0 | 1 = Math.abs(arc.endAngle - arc.startAngle) > 180 ? 1 : 0
			const arcPath = new Path2D().moveTo(start.x, start.y).arcTo(r, r, 0, largeArcFlag, 1, end.x, end.y)
			canvas.drawPath(arcPath, {
				fill: "none",
				stroke: arc.strokeColor,
				strokeWidth: theme.stroke.width.xxthick
			})
			if (arc.label !== null) {
				const midAngle = (arc.startAngle + arc.endAngle) / 2
				const labelPos = pointOnCircle(midAngle, r + PADDING)
				const finalX = clamp(labelPos.x, PADDING, width - PADDING)
				const finalY = clamp(labelPos.y, PADDING, height - PADDING)
				canvas.drawText({
					x: finalX,
					y: finalY,
					text: arc.label,
					fontPx: theme.font.size.medium,
					fontWeight: theme.font.weight.bold,
					fill: theme.colors.text,
					anchor: "middle",
					dominantBaseline: "middle"
				})
			}
		}
	}

	// Segments (radii/diameters) are drawn on top of the main shape.
	if (segments.length > 0) {
		for (const seg of segments) {
			const lineStart = pointOnCircle(
				seg.type === "diameter" ? seg.angle + 180 : seg.angle,
				seg.type === "diameter" ? r : 0
			)
			const lineEnd = pointOnCircle(seg.angle, r)

			// Correction for radius start point: pointOnCircle with r=0 correctly returns the center (cx,cy)
			if (seg.type === "radius") {
				lineStart.x = cx
				lineStart.y = cy
			}

			canvas.drawLine(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y, {
				stroke: seg.color,
				strokeWidth: theme.stroke.width.thick
			})

			if (seg.label) {
				const labelStartRadius = shape === "circle" && innerRadius ? innerRadius * scale : 0
				const labelAnchorRadius = labelStartRadius + (r - labelStartRadius) / 2
				const mid = pointOnCircle(seg.angle, labelAnchorRadius)
				const angleRad = toRad(seg.angle)
				const verticalOffsetMultiplier = seg.angle > 270 && seg.angle < 360 ? -1 : 1
				const offsetX = -Math.sin(angleRad) * 10
				const offsetY = Math.cos(angleRad) * 10 * verticalOffsetMultiplier
				const finalX = clamp(mid.x + offsetX, PADDING, width - PADDING)
				const finalY = clamp(mid.y + offsetY, PADDING, height - PADDING)
				canvas.drawText({
					x: finalX,
					y: finalY,
					text: seg.label,
					fontPx: theme.font.size.base,
					fill: theme.colors.text,
					anchor: "middle",
					dominantBaseline: "middle"
				})
			}
		}
	}

	if (showCenterDot) {
		canvas.drawCircle(cx, cy, theme.geometry.pointRadius.small, {
			fill: theme.colors.black
		})
	}

	if (areaLabel !== null) {
		const yOffset = -10
		canvas.drawText({
			x: cx,
			y: cy + yOffset,
			text: areaLabel,
			fontPx: theme.font.size.large,
			fontWeight: theme.font.weight.bold,
			fill: theme.colors.text,
			anchor: "middle",
			dominantBaseline: "middle"
		})
	}

	// NEW: Finalize the canvas and construct the root SVG element
	const { svgBody, vbMinX, vbMinY, width: finalWidth, height: finalHeight } = canvas.finalize(PADDING)

	return `<svg width="${finalWidth}" height="${finalHeight}" viewBox="${vbMinX} ${vbMinY} ${finalWidth} ${finalHeight}" xmlns="http://www.w3.org/2000/svg" font-family="${theme.font.family.sans}" font-size="${theme.font.size.base}">${svgBody}</svg>`
}
