import { expect, test } from "bun:test"
import type { z } from "zod"
import { generateNumberLineWithAction, NumberLineWithActionPropsSchema } from "@/lib/widgets/generators"

type NumberLineWithActionInput = z.input<typeof NumberLineWithActionPropsSchema>

test("number-line-with-action - fraction subtraction (3/5 - 1/5 = 2/5)", async () => {
	const input = {
		type: "numberLineWithAction",
		width: 600,
		height: 180,
		orientation: "horizontal",
		min: 0,
		max: 1,
		tickInterval: { type: "whole", interval: 1 },
		secondaryTickInterval: { type: "fraction", numerator: 1, denominator: 5 },
		startValue: 0.6, // 3/5
		actions: [
			{
				delta: {
					type: "fraction",
					numerator: 1,
					denominator: 5,
					sign: "-"
				}
			}
		]
	} satisfies NumberLineWithActionInput

	const parseResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for numberLineWithAction:", parseResult.error)
		return
	}

	const svg = await generateNumberLineWithAction(parseResult.data)
	expect(svg).toMatchSnapshot()
})

test("number-line-with-action - fraction addition (3/7 + 1/7 = 4/7)", async () => {
	const input = {
		type: "numberLineWithAction",
		width: 600,
		height: 180,
		orientation: "horizontal",
		min: 0,
		max: 1,
		tickInterval: { type: "whole", interval: 1 },
		secondaryTickInterval: { type: "fraction", numerator: 1, denominator: 7 },
		startValue: 3/7,
		actions: [
			{
				delta: {
					type: "fraction",
					numerator: 1,
					denominator: 7,
					sign: "+"
				}
			}
		]
	} satisfies NumberLineWithActionInput

	const parseResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for numberLineWithAction:", parseResult.error)
		return
	}

	const svg = await generateNumberLineWithAction(parseResult.data)
	expect(svg).toMatchSnapshot()
})

test("number-line-with-action - multiple integer operations", async () => {
	const input = {
		type: "numberLineWithAction",
		width: 700,
		height: 200,
		orientation: "horizontal",
		min: -5,
		max: 15,
		tickInterval: { type: "whole", interval: 5 },
		secondaryTickInterval: { type: "whole", interval: 1 },
		startValue: 3,
		actions: [
			{
				delta: {
					type: "whole",
					value: 5,
					sign: "+"
				}
			},
			{
				delta: {
					type: "whole",
					value: 3,
					sign: "-"
				}
			}
		]
	} satisfies NumberLineWithActionInput

	const parseResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for numberLineWithAction:", parseResult.error)
		return
	}

	const svg = await generateNumberLineWithAction(parseResult.data)
	expect(svg).toMatchSnapshot()
})

test("number-line-with-action - vertical orientation with mixed numbers", async () => {
	const input = {
		type: "numberLineWithAction",
		width: 200,
		height: 600,
		orientation: "vertical",
		min: 0,
		max: 4,
		tickInterval: { type: "fraction", numerator: 1, denominator: 2 },
		secondaryTickInterval: null,
		startValue: 1.5,
		actions: [
			{
				delta: {
					type: "mixed",
					whole: 1,
					numerator: 1,
					denominator: 2,
					sign: "+"
				}
			}
		]
	} satisfies NumberLineWithActionInput

	const parseResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for numberLineWithAction:", parseResult.error)
		return
	}

	const svg = await generateNumberLineWithAction(parseResult.data)
	expect(svg).toMatchSnapshot()
})

test("number-line-with-action - fractional operations", async () => {
	const input = {
		type: "numberLineWithAction",
		width: 650,
		height: 160,
		orientation: "horizontal",
		min: 0,
		max: 5,
		tickInterval: { type: "whole", interval: 1 },
		secondaryTickInterval: { type: "fraction", numerator: 1, denominator: 2 },
		startValue: 2.5,
		actions: [
			{
				delta: {
					type: "fraction",
					numerator: 3,
					denominator: 2,
					sign: "+"
				}
			},
			{
				delta: {
					type: "fraction",
					numerator: 1,
					denominator: 2,
					sign: "-"
				}
			}
		]
	} satisfies NumberLineWithActionInput

	const parseResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for numberLineWithAction:", parseResult.error)
		return
	}

	const svg = await generateNumberLineWithAction(parseResult.data)
	expect(svg).toMatchSnapshot()
})

test("number-line-with-action - single large jump", async () => {
	const input = {
		type: "numberLineWithAction",
		width: 500,
		height: 150,
		orientation: "horizontal",
		min: -10,
		max: 10,
		tickInterval: { type: "whole", interval: 10 },
		secondaryTickInterval: { type: "whole", interval: 1 },
		startValue: -5,
		actions: [
			{
				delta: {
					type: "whole",
					value: 12,
					sign: "+"
				}
			}
		]
	} satisfies NumberLineWithActionInput

	const parseResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for numberLineWithAction:", parseResult.error)
		return
	}

	const svg = await generateNumberLineWithAction(parseResult.data)
	expect(svg).toMatchSnapshot()
})
