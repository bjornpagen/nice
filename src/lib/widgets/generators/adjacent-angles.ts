import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"

export const ErrMismatchedRaysAndAngles = errors.new("must be one more ray label than angles")

// Defines a single angle segment in the diagram
const AngleSegmentSchema = z.object({
	id: z.string().optional().describe("An optional unique identifier for this angle segment."),
	value: z.number().describe("The measure of the angle in degrees."),
	label: z.string().describe('The text label for the angle measure (e.g., "35°", "x").'),
	color: z.string().describe("The primary color for the angle arc and fill, as a CSS color string."),
	arcRadius: z.number().describe("The radius of the arc used to denote this angle."),
	fill: z.boolean().default(false).describe("If true, render a semi-transparent fill for the angle sector.")
})

// Defines the optional total angle that encompasses all segments
const TotalAngleSchema = z.object({
	label: z.string().describe('The text label for the total angle measure (e.g., "135°").'),
	color: z.string().describe("The color for the total angle arc, as a CSS color string."),
	arcRadius: z.number().describe("The radius for the outer arc representing the total angle.")
})

// The main Zod schema for the adjacentAngles function
export const AdjacentAnglesPropsSchema = z
	.object({
		width: z.number().default(600).describe("The total width of the output SVG container in pixels."),
		height: z.number().default(400).describe("The total height of the output SVG container in pixels."),
		vertexLabel: z.string().default("A").describe("The label for the common vertex point."),
		rayLabels: z
			.array(z.string())
			.describe(
				'An array of labels for the endpoints of the rays, starting from the baseline ray (e.g., ["B", "C", "D", "E"]).'
			),
		angles: z
			.array(AngleSegmentSchema)
			.describe(
				"An array of angle segments, ordered from the baseline. The number of angles should be one less than the number of rays."
			),
		totalAngle: TotalAngleSchema.optional().describe(
			"An optional configuration for displaying the total angle arc and label."
		),
		baselineAngle: z
			.number()
			.default(0)
			.describe("The angle in degrees of the first ray, typically 0 for a horizontal baseline.")
	})
	.describe(
		'This template generates a precise geometric diagram of multiple adjacent angles sharing a common vertex. It is ideal for questions based on the Angle Addition Postulate, where parts of a larger angle sum up to the whole. The generator will render an SVG containing a set of rays originating from a single point. Each individual angle formed by adjacent rays is highlighted with a distinct colored arc. These arcs can be labeled with a number (e.g., "35°") or a variable (e.g., "x"). An optional larger arc can be drawn to span across all the smaller angles, complete with its own label (e.g., "135°").'
	)

export type AdjacentAnglesProps = z.infer<typeof AdjacentAnglesPropsSchema>

/**
 * This template generates a precise geometric diagram of multiple adjacent angles sharing a common vertex.
 * It is ideal for questions based on the Angle Addition Postulate.
 */
export const generateAdjacentAngles: WidgetGenerator<typeof AdjacentAnglesPropsSchema> = (data) => {
	const { width, height, vertexLabel, rayLabels, angles, totalAngle, baselineAngle } = data

	if (rayLabels.length !== angles.length + 1) {
		throw errors.wrap(ErrMismatchedRaysAndAngles, `received ${rayLabels.length} ray labels and ${angles.length} angles`)
	}

	const centerX = width / 2
	const centerY = height / 2
	const rayLength = Math.min(width, height) / 2 - 40
	const toRad = (deg: number) => (deg * Math.PI) / 180
	const ySign = -1 // SVG y-axis is inverted
	const round = (num: number) => Number.parseFloat(num.toFixed(2))

	let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14">`

	// Draw vertex and its label
	svg += `<circle cx="${centerX}" cy="${centerY}" r="3" fill="black" />`
	svg += `<text x="${centerX - 12}" y="${centerY + 12}" fill="black" font-weight="bold">${vertexLabel}</text>`

	let currentAngleDeg = baselineAngle
	let accumulatedAngleDeg = baselineAngle

	// Draw first ray and its label
	const firstRayRad = toRad(currentAngleDeg)
	svg += `<line x1="${centerX}" y1="${centerY}" x2="${round(centerX + rayLength * Math.cos(firstRayRad))}" y2="${round(centerY + ySign * rayLength * Math.sin(firstRayRad))}" stroke="black" />`
	svg += `<text x="${round(centerX + (rayLength + 15) * Math.cos(firstRayRad))}" y="${round(centerY + ySign * (rayLength + 15) * Math.sin(firstRayRad))}" fill="black" text-anchor="middle" dominant-baseline="middle">${rayLabels[0]}</text>`

	// Draw angle segments and subsequent rays
	for (let i = 0; i < angles.length; i++) {
		const angle = angles[i]
		if (!angle) continue
		const startAngleDeg = accumulatedAngleDeg
		accumulatedAngleDeg += angle.value
		const endAngleDeg = accumulatedAngleDeg

		const startRad = toRad(startAngleDeg)
		const endRad = toRad(endAngleDeg)

		// Draw ray
		const rayX = round(centerX + rayLength * Math.cos(endRad))
		const rayY = round(centerY + ySign * rayLength * Math.sin(endRad))
		svg += `<line x1="${centerX}" y1="${centerY}" x2="${rayX}" y2="${rayY}" stroke="black" />`
		svg += `<text x="${round(rayX + 15 * Math.cos(endRad))}" y="${round(rayY + ySign * 15 * Math.sin(endRad))}" fill="black" text-anchor="middle" dominant-baseline="middle">${rayLabels[i + 1]}</text>`

		// Draw arc
		const arcStartX = round(centerX + angle.arcRadius * Math.cos(startRad))
		const arcStartY = round(centerY + ySign * angle.arcRadius * Math.sin(startRad))
		const arcEndX = round(centerX + angle.arcRadius * Math.cos(endRad))
		const arcEndY = round(centerY + ySign * angle.arcRadius * Math.sin(endRad))
		const largeArcFlag = angle.value > 180 ? 1 : 0
		svg += `<path d="M ${arcStartX} ${arcStartY} A ${angle.arcRadius} ${angle.arcRadius} 0 ${largeArcFlag} 1 ${arcEndX} ${arcEndY}" fill="none" stroke="${angle.color}" stroke-width="2" />`

		// Draw fill if requested
		if (angle.fill) {
			svg += `<path d="M ${centerX} ${centerY} L ${arcStartX} ${arcStartY} A ${angle.arcRadius} ${angle.arcRadius} 0 ${largeArcFlag} 1 ${arcEndX} ${arcEndY} Z" fill="${angle.color}" opacity="0.2" />`
		}

		// Draw angle label
		const labelAngleRad = toRad(startAngleDeg + angle.value / 2)
		const labelRadius = angle.arcRadius + 15
		svg += `<text x="${round(centerX + labelRadius * Math.cos(labelAngleRad))}" y="${round(centerY + ySign * labelRadius * Math.sin(labelAngleRad))}" fill="black" text-anchor="middle" dominant-baseline="middle">${angle.label}</text>`
	}

	// Draw total angle if specified
	if (totalAngle) {
		const totalAngleValue = angles.reduce((sum, a) => sum + a.value, 0)
		const startRad = toRad(baselineAngle)
		const endRad = toRad(baselineAngle + totalAngleValue)

		const arcStartX = round(centerX + totalAngle.arcRadius * Math.cos(startRad))
		const arcStartY = round(centerY + ySign * totalAngle.arcRadius * Math.sin(startRad))
		const arcEndX = round(centerX + totalAngle.arcRadius * Math.cos(endRad))
		const arcEndY = round(centerY + ySign * totalAngle.arcRadius * Math.sin(endRad))
		const largeArcFlag = totalAngleValue > 180 ? 1 : 0

		svg += `<path d="M ${arcStartX} ${arcStartY} A ${totalAngle.arcRadius} ${totalAngle.arcRadius} 0 ${largeArcFlag} 1 ${arcEndX} ${arcEndY}" fill="none" stroke="${totalAngle.color}" stroke-width="2" />`

		const labelAngleRad = toRad(baselineAngle + totalAngleValue / 2)
		const labelRadius = totalAngle.arcRadius + 15
		svg += `<text x="${round(centerX + labelRadius * Math.cos(labelAngleRad))}" y="${round(centerY + ySign * labelRadius * Math.sin(labelAngleRad))}" fill="black" text-anchor="middle" dominant-baseline="middle">${totalAngle.label}</text>`
	}

	svg += "</svg>"
	return svg
}
