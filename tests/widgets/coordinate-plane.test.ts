import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { generateCoordinatePlane, CoordinatePlaneComprehensivePropsSchema } from "@/lib/widgets/generators"

type CoordinatePlaneInput = z.input<typeof CoordinatePlaneComprehensivePropsSchema>

test("coordinate plane - kinetic energy vs mass", () => {
	const input = {
		type: "coordinatePlane",
		width: 363,
		height: 300,
		xAxis: {
			label: "mass (kg)",
			min: -1.8,
			max: 18.2,
			tickInterval: 5,
			showGridLines: true
		},
		yAxis: {
			label: "kinetic energy (J)",
			min: -4,
			max: 76,
			tickInterval: 10,
			showGridLines: true
		},
		showQuadrantLabels: false,
		points: [],
		lines: [],
		polygons: [],
		distances: [],
		polylines: []
	} satisfies CoordinatePlaneInput

	// Validate the input
	const parseResult = errors.trySync(() => CoordinatePlaneComprehensivePropsSchema.safeParse(input))
	if (parseResult.error) {
		logger.error("parsing failed", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "schema parsing")
	}
	
	const validation = parseResult.data
	if (!validation.success) {
		logger.error("input validation failed", { error: validation.error })
		throw errors.wrap(validation.error, "input validation")
	}
	const parsed = validation.data

	// Generate the SVG
	const svg = generateCoordinatePlane(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})
