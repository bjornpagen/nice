import * as errors from "@superbuilders/errors"
import { z } from "zod"
import type { WidgetGenerator } from "@/lib/widgets/types"
import {
	type CompositeShapeDiagramProps,
	CompositeShapeDiagramPropsSchema,
	generateCompositeShapeDiagram
} from "./composite-shape-diagram"

const Parallelogram = z
	.object({
		type: z.literal("parallelogram").describe("Specifies a parallelogram shape."),
		base: z
			.number()
			.positive()
			.describe("Length of the base (bottom side) in arbitrary units (e.g., 8, 10, 6.5). Parallel to the top side."),
		height: z
			.number()
			.positive()
			.describe(
				"Perpendicular distance between parallel sides in arbitrary units (e.g., 5, 7, 4). Not the slanted side length."
			),
		sideLength: z
			.number()
			.positive()
			.describe(
				"Length of the slanted side in arbitrary units (e.g., 6, 8, 5.5). Both slanted sides have equal length."
			),
		labels: z
			.object({
				base: z
					.string()
					.nullable()
					.describe("Label for the base (e.g., '8 cm', 'b', '10'). Null hides label. Positioned below the base."),
				height: z
					.string()
					.nullable()
					.describe("Label for the height (e.g., '5 cm', 'h', '7'). Null hides label. Shows perpendicular distance."),
				sideLength: z
					.string()
					.nullable()
					.describe("Label for the slanted side (e.g., '6 cm', 's', '8'). Null hides label. Positioned along the side.")
			})
			.strict()
			.nullable()
			.describe("Labels for dimensions. Null object hides all labels.")
	})
	.strict()

const RightTrapezoid = z
	.object({
		type: z.literal("trapezoidRight").describe("Specifies a right trapezoid (one perpendicular side)."),
		topBase: z
			.number()
			.positive()
			.describe("Length of the top parallel side in arbitrary units (e.g., 6, 8, 4.5). Usually shorter than bottom."),
		bottomBase: z
			.number()
			.positive()
			.describe("Length of the bottom parallel side in arbitrary units (e.g., 10, 12, 8). Usually longer than top."),
		height: z
			.number()
			.positive()
			.describe(
				"Perpendicular distance between parallel sides in arbitrary units (e.g., 5, 6, 4). Also the length of the left perpendicular side."
			),
		labels: z
			.object({
				topBase: z.string().nullable().describe("Label for top base (e.g., '6 cm', 'a'). Null hides label."),
				bottomBase: z.string().nullable().describe("Label for bottom base (e.g., '10 cm', 'b'). Null hides label."),
				height: z.string().nullable().describe("Label for height/left side (e.g., '5 cm', 'h'). Null hides label."),
				leftSide: z
					.string()
					.nullable()
					.describe("Label for left perpendicular side (e.g., '5 cm', 'h'). Often same as height. Null hides label."),
				rightSide: z
					.string()
					.nullable()
					.describe("Label for right slanted side (e.g., '6.4 cm', 'c'). Null hides label.")
			})
			.strict()
			.nullable()
			.describe("Labels for dimensions. Null object hides all labels.")
	})
	.strict()

const GeneralTrapezoid = z
	.object({
		type: z.literal("trapezoid").describe("Specifies a general trapezoid (both sides slanted)."),
		topBase: z
			.number()
			.positive()
			.describe("Length of the top parallel side in arbitrary units (e.g., 5, 7, 4). Usually shorter than bottom."),
		bottomBase: z
			.number()
			.positive()
			.describe("Length of the bottom parallel side in arbitrary units (e.g., 9, 12, 8). Usually longer than top."),
		height: z
			.number()
			.positive()
			.describe(
				"Perpendicular distance between parallel sides in arbitrary units (e.g., 4, 6, 5). Measured vertically."
			),
		leftSideLength: z
			.number()
			.positive()
			.describe("Length of the left slanted side in arbitrary units (e.g., 5, 7, 4.5). Can differ from right side."),
		labels: z
			.object({
				topBase: z.string().nullable().describe("Label for top base (e.g., '5 cm', 'a'). Null hides label."),
				bottomBase: z.string().nullable().describe("Label for bottom base (e.g., '9 cm', 'b'). Null hides label."),
				height: z
					.string()
					.nullable()
					.describe("Label for perpendicular height (e.g., '4 cm', 'h'). Shows with dashed line. Null hides label."),
				leftSide: z.string().nullable().describe("Label for left slanted side (e.g., '5 cm', 'c'). Null hides label."),
				rightSide: z
					.string()
					.nullable()
					.describe("Label for right slanted side (e.g., '5.5 cm', 'd'). Null hides label.")
			})
			.strict()
			.nullable()
			.describe("Labels for dimensions. Null object hides all labels.")
	})
	.strict()

export const ParallelogramTrapezoidDiagramPropsSchema = z
	.object({
		type: z
			.literal("parallelogramTrapezoidDiagram")
			.describe("Identifies this as a parallelogram or trapezoid diagram widget."),
		width: z
			.number()
			.positive()
			.describe("Total width of the diagram in pixels (e.g., 400, 500, 350). Must accommodate the shape and labels."),
		height: z
			.number()
			.positive()
			.describe("Total height of the diagram in pixels (e.g., 300, 400, 250). Must accommodate the shape and labels."),
		shape: z
			.discriminatedUnion("type", [Parallelogram, RightTrapezoid, GeneralTrapezoid])
			.describe("The specific quadrilateral to draw with its dimensions and labels.")
	})
	.strict()
	.describe(
		"Creates accurate diagrams of parallelograms and trapezoids with labeled dimensions. Supports three types: parallelograms (opposite sides parallel and equal), right trapezoids (one perpendicular side), and general trapezoids (both sides slanted). Essential for geometry education, area calculations, and quadrilateral properties."
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
	} else if (shape.type === "trapezoidRight") {
		// Right trapezoid
		shapeWidth = shape.bottomBase
		shapeHeight = shape.height
	} else {
		// General trapezoid
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
	} else if (shape.type === "trapezoidRight") {
		// Right trapezoid - left side is perpendicular
		const { topBase, bottomBase, height: h, labels } = shape

		const scaledTop = topBase * scale
		const scaledBottom = bottomBase * scale
		const scaledH = h * scale
		const leftOffset = 0 // Right trapezoid has no offset

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
				{ text: labels?.leftSide ?? String(h), offset: 15 }
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
		// shape.type === "trapezoid" - general trapezoid with both sides slanted
		const { topBase, bottomBase, height: h, leftSideLength, labels } = shape

		const scaledTop = topBase * scale
		const scaledBottom = bottomBase * scale
		const scaledH = h * scale
		const scaledLeft = leftSideLength * scale

		if (scaledLeft < scaledH) {
			throw errors.new("left side length cannot be less than height")
		}

		const leftOffset = Math.sqrt(scaledLeft * scaledLeft - scaledH * scaledH)

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
				{ text: labels?.leftSide ?? String(leftSideLength), offset: 15 }
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
