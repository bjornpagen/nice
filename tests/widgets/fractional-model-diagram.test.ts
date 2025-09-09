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
		leftShape: { numerator: 1, denominator: 2, color: "#4472C4" },
		rightShape: { numerator: 1, denominator: 2, color: "#ED7D31" },
		operator: "="
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
		leftShape: { numerator: 3, denominator: 4, color: "#1E90FF" },
		rightShape: { numerator: 2, denominator: 5, color: "#FF7F50" },
		operator: ">"
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
		leftShape: { numerator: 1, denominator: 3, color: "#11A579" },
		rightShape: { numerator: 3, denominator: 4, color: "#9E034E" },
		operator: "<"
	} satisfies FractionModelInput

	const parsed = FractionModelDiagramPropsSchema.safeParse(input)
	if (!parsed.success) throw new Error(parsed.error.message)

	const svg = await generateFractionModelDiagram(parsed.data)
	expect(svg).toMatchSnapshot()
})


