import { expect, test } from "bun:test"
import type { z } from "zod"
import {
	CirclePieceComparisonDiagramPropsSchema,
	generateCirclePieceComparisonDiagram
} from "@/lib/widgets/generators"

type CirclePieceComparisonInput = z.input<typeof CirclePieceComparisonDiagramPropsSchema>

test("circle-piece-comparison-diagram - equal fractions (1/2 = 1/2)", async () => {
	const input = {
		type: "circlePieceComparisonDiagram",
		width: 500,
		height: 300,
		leftFraction: { numerator: 1, denominator: 2, color: "#4472C4" },
		rightFraction: { numerator: 1, denominator: 2, color: "#ED7D31" },
		comparison: "="
	} satisfies CirclePieceComparisonInput

	const parseResult = CirclePieceComparisonDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for circlePieceComparisonDiagram:", parseResult.error)
		return
	}

	const svg = await generateCirclePieceComparisonDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

test("circle-piece-comparison-diagram - left larger (3/4 > 2/5)", async () => {
	const input = {
		type: "circlePieceComparisonDiagram",
		width: 520,
		height: 320,
		leftFraction: { numerator: 3, denominator: 4, color: "#1E90FF" },
		rightFraction: { numerator: 2, denominator: 5, color: "#FF7F50" },
		comparison: ">"
	} satisfies CirclePieceComparisonInput

	const parseResult = CirclePieceComparisonDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for circlePieceComparisonDiagram:", parseResult.error)
		return
	}

	const svg = await generateCirclePieceComparisonDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

test("circle-piece-comparison-diagram - right larger (1/3 < 3/4)", async () => {
	const input = {
		type: "circlePieceComparisonDiagram",
		width: 520,
		height: 320,
		leftFraction: { numerator: 1, denominator: 3, color: "#11A579" },
		rightFraction: { numerator: 3, denominator: 4, color: "#9E034E" },
		comparison: "<"
	} satisfies CirclePieceComparisonInput

	const parseResult = CirclePieceComparisonDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for circlePieceComparisonDiagram:", parseResult.error)
		return
	}

	const svg = await generateCirclePieceComparisonDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})


