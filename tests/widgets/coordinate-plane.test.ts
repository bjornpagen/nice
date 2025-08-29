import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { CoordinatePlaneComprehensivePropsSchema, generateCoordinatePlane } from "@/lib/widgets/generators"

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
		points: [
			{ id: "p0", x: 0, y: 0, label: "0 kg", color: "#FF0000", style: "closed" },
			{ id: "p1", x: 1, y: 32, label: "1 kg", color: "#FF0000", style: "closed" },
			{ id: "p2", x: 2, y: 64, label: "2 kg", color: "#FF0000", style: "closed" }
		],
		lines: [
			{
				id: "ke-proportional",
				equation: { type: "slopeIntercept", slope: 32, yIntercept: 0 },
				color: "#00A2C7",
				style: "solid"
			},
			{
				id: "x-equals-5",
				equation: { type: "standard", A: 1, B: 0, C: 5 }, // vertical line x = 5
				color: "#555555",
				style: "dashed"
			}
		],
		polygons: [
			{
				vertices: ["p0", "p1", "p2"],
				isClosed: true,
				fillColor: "#FF000080",
				strokeColor: "#FF0000",
				label: "Region"
			}
		],
		distances: [
			{
				pointId1: "p1",
				pointId2: "p2",
				showLegs: true,
				showLegLabels: false,
				hypotenuseLabel: "d",
				color: "#333333",
				style: "solid"
			}
		],
		polylines: [
			{
				id: "sample-curve",
				points: [
					{ x: 0, y: 10 },
					{ x: 3, y: 38 },
					{ x: 6, y: 55 },
					{ x: 9, y: 60 }
				],
				color: "#7C3AED",
				style: "dashed"
			}
		]
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
