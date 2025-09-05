import { expect, test } from "bun:test"
import type { z } from "zod"
import { generatePolyhedronDiagram, PolyhedronDiagramPropsSchema } from "@/lib/widgets/generators"

type PolyhedronDiagramInput = z.input<typeof PolyhedronDiagramPropsSchema>

test("polyhedron-diagram - Square pyramid with slant height and right-angle marker", () => {
	const input = {
		type: "polyhedronDiagram",
		width: 400,
		height: 300,
		shape: {
			type: "rectangularPyramid",
			baseWidth: 70,
			baseLength: 70,
			height: 98.99 // Calculated from Pythagorean theorem: sqrt(140^2 - 35^2)
		},
		labels: [
			{
				text: "70 cm",
				target: "baseWidth"
			}
		],
		segments: [
			{
				from: { type: "vertex", index: 4 }, // apex
				to: { type: "edgeMidpoint", a: 0, b: 1 }, // midpoint of front base edge
				label: "140 cm"
			}
		],
		angleMarkers: [
			{
				type: "right",
				at: { type: "edgeMidpoint", a: 0, b: 1 }, // midpoint of front base edge
				from: { type: "vertex", index: 4 }, // apex (for slant height direction)
				to: { type: "vertex", index: 1 }, // right corner of base edge (for base direction)
				sizePx: 12
			}
		],
		diagonals: [],
		shadedFace: null,
		showHiddenEdges: true
	} satisfies PolyhedronDiagramInput

	// Validate the input
	const parseResult = PolyhedronDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for polyhedron diagram:", parseResult.error)
		throw new Error("Schema validation failed")
	}

	// Generate the widget
	const svg = generatePolyhedronDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})
