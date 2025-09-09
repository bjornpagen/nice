import { expect, test } from "bun:test"
import type { z } from "zod"
import { FractionModelDiagramPropsSchema, generateFractionModelDiagram } from "@/lib/widgets/generators"

type FractionModelInput = z.input<typeof FractionModelDiagramPropsSchema>

test("fractional-model-diagram - equal fractions (1/2 = 1/2) circle", async () => {
	const input = {
		type: "fractionModelDiagram",
		width: 500,
		height: 300,
		shapeType: "circle",
		shapes: [
			{ numerator: 1, denominator: 2, color: "#4472C4" },
			{ numerator: 1, denominator: 2, color: "#ED7D31" }
		],
		operators: ["="]
	} satisfies FractionModelInput

	const parsed = FractionModelDiagramPropsSchema.safeParse(input)
	if (!parsed.success) throw new Error(parsed.error.message)

	const svg = await generateFractionModelDiagram(parsed.data)
	expect(svg).toMatchSnapshot()
})

test("fractional-model-diagram - left larger (3/4 > 2/5) polygon", async () => {
	const input = {
		type: "fractionModelDiagram",
		width: 520,
		height: 320,
		shapeType: "polygon",
		shapes: [
			{ numerator: 3, denominator: 4, color: "#1E90FF" },
			{ numerator: 2, denominator: 5, color: "#FF7F50" }
		],
		operators: [">"]
	} satisfies FractionModelInput

	const parsed = FractionModelDiagramPropsSchema.safeParse(input)
	if (!parsed.success) throw new Error(parsed.error.message)

	const svg = await generateFractionModelDiagram(parsed.data)
	expect(svg).toMatchSnapshot()
})

test("fractional-model-diagram - right larger (1/3 < 3/4) box", async () => {
	const input = {
		type: "fractionModelDiagram",
		width: 520,
		height: 320,
		shapeType: "box",
		shapes: [
			{ numerator: 1, denominator: 3, color: "#11A579" },
			{ numerator: 3, denominator: 4, color: "#9E034E" }
		],
		operators: ["<"]
	} satisfies FractionModelInput

	const parsed = FractionModelDiagramPropsSchema.safeParse(input)
	if (!parsed.success) throw new Error(parsed.error.message)

	const svg = await generateFractionModelDiagram(parsed.data)
	expect(svg).toMatchSnapshot()
})

test("fractional-model-diagram - multiple shapes addition (1/4 + 1/4 + 1/4) circle", async () => {
	const input = {
		type: "fractionModelDiagram",
		width: 800,
		height: 300,
		shapeType: "circle",
		shapes: [
			{ numerator: 1, denominator: 4, color: "#FF6B6B" },
			{ numerator: 1, denominator: 4, color: "#4ECDC4" },
			{ numerator: 1, denominator: 4, color: "#45B7D1" }
		],
		operators: ["+", "+"]
	} satisfies FractionModelInput

	const parsed = FractionModelDiagramPropsSchema.safeParse(input)
	if (!parsed.success) throw new Error(parsed.error.message)

	const svg = await generateFractionModelDiagram(parsed.data)
	expect(svg).toMatchSnapshot()
})

test("fractional-model-diagram - single shape without operators", async () => {
	const input = {
		type: "fractionModelDiagram",
		width: 400,
		height: 300,
		shapeType: "polygon",
		shapes: [
			{ numerator: 5, denominator: 8, color: "#9B59B6" }
		],
		operators: null
	} satisfies FractionModelInput

	const parsed = FractionModelDiagramPropsSchema.safeParse(input)
	if (!parsed.success) throw new Error(parsed.error.message)

	const svg = await generateFractionModelDiagram(parsed.data)
	expect(svg).toMatchSnapshot()
})

test("fractional-model-diagram - complex sequence with mixed operators", async () => {
	const input = {
		type: "fractionModelDiagram",
		width: 1000,
		height: 320,
		shapeType: "box",
		shapes: [
			{ numerator: 2, denominator: 3, color: "#E74C3C" },
			{ numerator: 1, denominator: 6, color: "#3498DB" },
			{ numerator: 5, denominator: 6, color: "#2ECC71" },
			{ numerator: 1, denominator: 2, color: "#F39C12" }
		],
		operators: ["+", "=", ">"]
	} satisfies FractionModelInput

	const parsed = FractionModelDiagramPropsSchema.safeParse(input)
	if (!parsed.success) throw new Error(parsed.error.message)

	const svg = await generateFractionModelDiagram(parsed.data)
	expect(svg).toMatchSnapshot()
})


