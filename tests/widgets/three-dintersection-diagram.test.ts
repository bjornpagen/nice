import { expect, test } from "bun:test"
import type { z } from "zod"
import { generateThreeDIntersectionDiagram, ThreeDIntersectionDiagramPropsSchema } from "@/lib/widgets/generators/3d-intersection-diagram"

type ThreeDIntersectionDiagramInput = z.input<typeof ThreeDIntersectionDiagramPropsSchema>

// Manual test modeling a pentagonal prism with an oblique slicing plane
test("three-dintersection-diagram - pentagonal prism with oblique plane", () => {
	const input = {
		plane: {
			orientation: "oblique",
			position: 0.55,
			angle: -12
		},
		solid: {
			type: "pentagonalPrism",
			side: 8,
			height: 20
		},
		width: 500,
		height: 350,
		viewOptions: {
			showLabels: false,
			projectionAngle: 30,
			showHiddenEdges: true,
			intersectionColor: "#ffb6c180"
		},
		type: "threeDIntersectionDiagram"
	} satisfies ThreeDIntersectionDiagramInput

	const parseResult = ThreeDIntersectionDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for threeDIntersectionDiagram:", parseResult.error)
		return
	}

	const svg = generateThreeDIntersectionDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})


