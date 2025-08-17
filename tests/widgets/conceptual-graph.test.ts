import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { ConceptualGraphPropsSchema, generateConceptualGraph } from "@/lib/widgets/generators"

type ConceptualGraphInput = z.input<typeof ConceptualGraphPropsSchema>

test("conceptual graph - frog population size", () => {
	const input = {
		type: "conceptualGraph",
		width: 400,
		height: 400,
		xAxisLabel: "Time",
		yAxisLabel: "Frog population size",
		curvePoints: [
			{ x: 0.5, y: 0.5 },
			{ x: 1.5, y: 1 },
			{ x: 2.5, y: 2 },
			{ x: 3.5, y: 4 },
			{ x: 4.5, y: 6 },
			{ x: 5.5, y: 8 },
			{ x: 6.5, y: 9 },
			{ x: 7.5, y: 8.8 },
			{ x: 8.5, y: 8.2 },
			{ x: 9.5, y: 8.4 }
		],
		curveColor: "#00A2C7",
		highlightPoints: [
			{ x: 2.5, y: 2, label: "A" },
			{ x: 4.5, y: 6, label: "B" },
			{ x: 6.5, y: 9, label: "C" }
		],
		highlightPointColor: "#000000", // Changed from "black" to hex format
		highlightPointRadius: 6
	} satisfies ConceptualGraphInput

	// Validate the input
	const parseResult = errors.trySync(() => ConceptualGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data

	// Generate the SVG
	const svg = generateConceptualGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})
