import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { ConceptualGraphPropsSchema, generateConceptualGraph } from "@/lib/widgets/generators"

type ConceptualGraphInput = z.input<typeof ConceptualGraphPropsSchema>

function computeCumulativeArcLengths(points: { x: number; y: number }[]): number[] {
	const cum: number[] = [0]
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1]
		const curr = points[i]
		if (!prev || !curr) continue
		const dx = curr.x - prev.x
		const dy = curr.y - prev.y
		cum[i] = (cum[i - 1] ?? 0) + Math.hypot(dx, dy)
	}
	return cum
}

function tForVertex(points: { x: number; y: number }[], index: number): number {
	const cum = computeCumulativeArcLengths(points)
	const total = cum[cum.length - 1] ?? 1
	const value = cum[index] ?? 0
	return value / total
}

function tForX(points: { x: number; y: number }[], targetX: number): number {
	const cum = computeCumulativeArcLengths(points)
	const total = cum[cum.length - 1] ?? 1
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i]
		const p1 = points[i + 1]
		if (!p0 || !p1) continue
		const x0 = p0.x
		const x1 = p1.x
		if (targetX >= x0 && targetX <= x1) {
			const segLen = (cum[i + 1] ?? 0) - (cum[i] ?? 0)
			const u = x1 === x0 ? 0 : (targetX - x0) / (x1 - x0)
			const dist = (cum[i] ?? 0) + u * segLen
			return dist / total
		}
	}
	return 1
}

test("conceptual graph - frog population size", async () => {
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
			{
				t: tForVertex(
					[
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
					2
				),
				label: "A"
			},
			{
				t: tForVertex(
					[
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
					4
				),
				label: "B"
			},
			{
				t: tForVertex(
					[
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
					6
				),
				label: "C"
			}
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
	const svg = await generateConceptualGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})

test("conceptual graph - wolf population lowest competition", async () => {
	const input = {
		type: "conceptualGraph",
		width: 300,
		height: 300,
		xAxisLabel: "Time",
		yAxisLabel: "Wolf population size",
		curvePoints: [
			{ x: 26, y: 236 },
			{ x: 50, y: 225 },
			{ x: 80, y: 205 },
			{ x: 110, y: 170 },
			{ x: 140, y: 120 },
			{ x: 170, y: 80 },
			{ x: 200, y: 62 },
			{ x: 230, y: 58 }
		],
		curveColor: "#11accd",
		highlightPoints: [
			{
				t: tForX(
					[
						{ x: 26, y: 236 },
						{ x: 50, y: 225 },
						{ x: 80, y: 205 },
						{ x: 110, y: 170 },
						{ x: 140, y: 120 },
						{ x: 170, y: 80 },
						{ x: 200, y: 62 },
						{ x: 230, y: 58 }
					],
					129.464
				),
				label: "A"
			},
			{
				t: tForX(
					[
						{ x: 26, y: 236 },
						{ x: 50, y: 225 },
						{ x: 80, y: 205 },
						{ x: 110, y: 170 },
						{ x: 140, y: 120 },
						{ x: 170, y: 80 },
						{ x: 200, y: 62 },
						{ x: 230, y: 58 }
					],
					155.134
				),
				label: "B"
			},
			{
				t: tForX(
					[
						{ x: 26, y: 236 },
						{ x: 50, y: 225 },
						{ x: 80, y: 205 },
						{ x: 110, y: 170 },
						{ x: 140, y: 120 },
						{ x: 170, y: 80 },
						{ x: 200, y: 62 },
						{ x: 230, y: 58 }
					],
					191.964
				),
				label: "C"
			}
		],
		highlightPointColor: "#000000",
		highlightPointRadius: 4
	} satisfies ConceptualGraphInput

	// Validate the input
	const parseResult = errors.trySync(() => ConceptualGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data

	// Generate the SVG
	const svg = await generateConceptualGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})
