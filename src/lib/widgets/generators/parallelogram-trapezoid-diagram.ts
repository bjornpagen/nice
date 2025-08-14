import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import {
	type CompositeShapeDiagramProps,
	CompositeShapeDiagramPropsSchema,
	generateCompositeShapeDiagram
} from "./composite-shape-diagram"

// Base parallelogram schema without refine for discriminated union
const ParallelogramShapeBaseSchema = z
	.object({
		type: z.literal("parallelogram"),
		base: z.number().positive().describe("The length of the base of the parallelogram."),
		height: z.number().positive().describe("The perpendicular height of the parallelogram."),
		sideLength: z.number().positive().describe("The length of the non-base side."),
		labels: z
			.object({
				base: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" ? null : val)),
				height: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" ? null : val)),
				sideLength: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" ? null : val))
			})
			.nullable()
			.transform((val) => val ?? null)
			.describe("Optional custom labels for the dimensions.")
	})
	.strict()

// Schema for a Trapezoid
const TrapezoidShapeSchema = z
	.object({
		type: z.literal("trapezoid"),
		topBase: z.number().positive().describe("The length of the top base of the trapezoid."),
		bottomBase: z.number().positive().describe("The length of the bottom base of the trapezoid."),
		height: z.number().positive().describe("The perpendicular height of the trapezoid."),
		leftSideLength: z
			.number()
			.positive()
			.nullable()
			.describe("The length of the left non-parallel side. If omitted, a right trapezoid is assumed."),
		labels: z
			.object({
				topBase: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" ? null : val)),
				bottomBase: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" ? null : val)),
				height: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" ? null : val)),
				leftSide: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" ? null : val)),
				rightSide: z
					.string()
					.nullable()
					.transform((val) => (val === "null" || val === "NULL" ? null : val))
			})
			.nullable()
			.transform((val) => val ?? null)
			.describe("Optional custom labels for the dimensions.")
	})
	.strict()

// Main schema for the new generator
export const ParallelogramTrapezoidDiagramPropsSchema = z
	.object({
		type: z.literal("parallelogramTrapezoidDiagram"),
		width: z
			.number()
			.nullable()
			.transform((val) => val ?? 400)
			.describe("The total width of the output SVG container in pixels."),
		height: z
			.number()
			.nullable()
			.transform((val) => val ?? 250)
			.describe("The total height of the output SVG container in pixels."),
		shape: z
			.discriminatedUnion("type", [ParallelogramShapeBaseSchema, TrapezoidShapeSchema])
			.describe("The specific shape and its geometric properties.")
	})
	.strict()
	.describe(
		"Generates a diagram of a parallelogram or a trapezoid with labeled sides and height. This widget simplifies the creation of these specific shapes by calculating vertex positions from geometric properties, and then uses the composite shape generator for rendering."
	)

export type ParallelogramTrapezoidDiagramProps = z.infer<typeof ParallelogramTrapezoidDiagramPropsSchema>

/**
 * Generates an SVG diagram for a parallelogram or trapezoid by calculating vertices
 * and reusing the generic composite shape diagram generator.
 */
export const generateParallelogramTrapezoidDiagram: WidgetGenerator<typeof ParallelogramTrapezoidDiagramPropsSchema> = (
	props
) => {
	const { width, height, shape } = props

	let compositeProps: CompositeShapeDiagramProps

	// --- SCALING LOGIC START ---
	const padding = 50 // Generous padding for labels
	const availableWidth = width - padding
	const availableHeight = height - padding

	let shapeWidth = 0
	let shapeHeight = 0

	if (shape.type === "parallelogram") {
		const offset = Math.sqrt(shape.sideLength ** 2 - shape.height ** 2)
		shapeWidth = shape.base + offset
		shapeHeight = shape.height
	} else {
		// Trapezoid
		shapeWidth = shape.bottomBase
		shapeHeight = shape.height
	}

	const scale = Math.min(availableWidth / shapeWidth, availableHeight / shapeHeight)
	// --- SCALING LOGIC END ---

	if (shape.type === "parallelogram") {
		const { base, height: h, sideLength, labels } = shape

		// Validate that side length is at least as long as height for a valid parallelogram
		if (sideLength < h) {
			throw errors.new("side length must be greater than or equal to height for a valid parallelogram")
		}

		const scaledBase = base * scale
		const scaledH = h * scale
		const scaledSide = sideLength * scale
		const scaledOffset = Math.sqrt(scaledSide * scaledSide - scaledH * scaledH)

		const vertices = [
			{ x: 0, y: scaledH }, // 0: Bottom-left
			{ x: scaledBase, y: scaledH }, // 1: Bottom-right
			{ x: scaledBase + scaledOffset, y: 0 }, // 2: Top-right
			{ x: scaledOffset, y: 0 }, // 3: Top-left
			{ x: scaledOffset, y: scaledH } // 4: Point for height line base
		]

		compositeProps = {
			type: "compositeShapeDiagram",
			width,
			height,
			vertices,
			outerBoundary: [0, 1, 2, 3],
			outerBoundaryLabels: [
				{ text: labels?.base ?? String(base), offset: 15 },
				{ text: labels?.sideLength ?? String(sideLength), offset: 15 },
				{ text: labels?.base ?? String(base), offset: 15 },
				{ text: labels?.sideLength ?? String(sideLength), offset: 15 }
			],
			internalSegments: [
				{
					fromVertexIndex: 3,
					toVertexIndex: 4,
					style: "dashed",
					label: labels?.height ?? String(h)
				}
			],
			shadedRegions: [],
			regionLabels: [],
			rightAngleMarkers: [
				{
					cornerVertexIndex: 4,
					adjacentVertex1Index: 3,
					adjacentVertex2Index: 0
				}
			]
		}
	} else {
		// shape.type === "trapezoid"
		const { topBase, bottomBase, height: h, leftSideLength, labels } = shape

		const scaledTop = topBase * scale
		const scaledBottom = bottomBase * scale
		const scaledH = h * scale
		const scaledLeft = leftSideLength ? leftSideLength * scale : null

		let leftOffset: number
		if (scaledLeft) {
			if (scaledLeft < scaledH) {
				throw errors.new("left side length cannot be less than height")
			}
			leftOffset = Math.sqrt(scaledLeft * scaledLeft - scaledH * scaledH)
		} else {
			leftOffset = 0 // Right trapezoid
		}

		const vertices = [
			{ x: 0, y: scaledH }, // 0: Bottom-left
			{ x: scaledBottom, y: scaledH }, // 1: Bottom-right
			{ x: leftOffset + scaledTop, y: 0 }, // 2: Top-right
			{ x: leftOffset, y: 0 }, // 3: Top-left
			{ x: leftOffset, y: scaledH } // 4: Point for left height
		]

		const rightOffset = scaledBottom - (leftOffset + scaledTop)
		const rightSideLengthVal = Math.sqrt(rightOffset * rightOffset + scaledH * scaledH) / scale

		compositeProps = {
			type: "compositeShapeDiagram",
			width,
			height,
			vertices,
			outerBoundary: [0, 1, 2, 3],
			outerBoundaryLabels: [
				{ text: labels?.bottomBase ?? String(bottomBase), offset: 15 },
				{ text: labels?.rightSide ?? String(Number.parseFloat(rightSideLengthVal.toFixed(2))), offset: 15 },
				{ text: labels?.topBase ?? String(topBase), offset: 15 },
				{ text: labels?.leftSide ?? String(leftSideLength ?? h), offset: 15 }
			],
			internalSegments: [
				{
					fromVertexIndex: 3,
					toVertexIndex: 4,
					style: "dashed",
					label: labels?.height ?? String(h)
				}
			],
			shadedRegions: [],
			regionLabels: [],
			rightAngleMarkers: [
				{
					cornerVertexIndex: 4,
					adjacentVertex1Index: 3,
					adjacentVertex2Index: 0
				}
			]
		}
	}

	const parsedCompositeProps = CompositeShapeDiagramPropsSchema.parse(compositeProps)
	return generateCompositeShapeDiagram(parsedCompositeProps)
}
