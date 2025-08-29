import { expect, test } from "bun:test"
import type { z } from "zod"
import { generateNumberLineWithAction, NumberLineWithActionPropsSchema } from "@/lib/widgets/generators"

type NumberLineWithActionInput = z.input<typeof NumberLineWithActionPropsSchema>

test("number line with action - horizontal single addition", () => {
	const input = {
		type: "numberLineWithAction",
		width: 600,
		height: 150,
		orientation: "horizontal",
		min: 0,
		max: 10,
		tickInterval: 1,
		startValue: 3,
		customLabels: [],
		actions: [
			{
				delta: 4,
				label: "+4"
			}
		]
	} satisfies NumberLineWithActionInput

	const parsedResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parsedResult.success) {
		expect(parsedResult.success).toBeTrue()
		return
	}
	const svg = generateNumberLineWithAction(parsedResult.data)
	expect(svg).toMatchSnapshot()
})

test("number line with action - horizontal multi-step operations", () => {
	const input = {
		type: "numberLineWithAction",
		width: 700,
		height: 200,
		orientation: "horizontal",
		min: -5,
		max: 15,
		tickInterval: 2,
		startValue: 2,
		customLabels: [],
		actions: [
			{
				delta: 6,
				label: "+6"
			},
			{
				delta: -3,
				label: "-3"
			},
			{
				delta: 4,
				label: "+4"
			}
		]
	} satisfies NumberLineWithActionInput

	const parsedResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parsedResult.success) {
		expect(parsedResult.success).toBeTrue()
		return
	}
	const svg = generateNumberLineWithAction(parsedResult.data)
	expect(svg).toMatchSnapshot()
})

test("number line with action - vertical with custom labels", () => {
	const input = {
		type: "numberLineWithAction",
		width: 200,
		height: 500,
		orientation: "vertical",
		min: -3,
		max: 7,
		tickInterval: 1,
		startValue: 0,
		customLabels: [
			{
				value: 0,
				text: "Start"
			},
			{
				value: 5,
				text: "Goal"
			}
		],
		actions: [
			{
				delta: 2,
				label: "up 2"
			},
			{
				delta: 3,
				label: "up 3"
			}
		]
	} satisfies NumberLineWithActionInput

	const parsedResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parsedResult.success) {
		expect(parsedResult.success).toBeTrue()
		return
	}
	const svg = generateNumberLineWithAction(parsedResult.data)
	expect(svg).toMatchSnapshot()
})

test("number line with action - negative operations with decimals", () => {
	const input = {
		type: "numberLineWithAction",
		width: 800,
		height: 180,
		orientation: "horizontal",
		min: -8,
		max: 2,
		tickInterval: 0.5,
		startValue: -1,
		customLabels: [],
		actions: [
			{
				delta: -2.5,
				label: "-2.5"
			},
			{
				delta: -1.5,
				label: "-1.5"
			},
			{
				delta: 3,
				label: "+3"
			}
		]
	} satisfies NumberLineWithActionInput

	const parsedResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parsedResult.success) {
		expect(parsedResult.success).toBeTrue()
		return
	}
	const svg = generateNumberLineWithAction(parsedResult.data)
	expect(svg).toMatchSnapshot()
})

test("number line with action - word problem with custom labels", () => {
	const input = {
		type: "numberLineWithAction",
		width: 650,
		height: 160,
		orientation: "horizontal",
		min: 0,
		max: 12,
		tickInterval: 1,
		startValue: 4,
		customLabels: [
			{
				value: 4,
				text: "Home"
			},
			{
				value: 10,
				text: "School"
			}
		],
		actions: [
			{
				delta: 6,
				label: "walk to school"
			},
			{
				delta: -2,
				label: "back to park"
			}
		]
	} satisfies NumberLineWithActionInput

	const parsedResult = NumberLineWithActionPropsSchema.safeParse(input)
	if (!parsedResult.success) {
		expect(parsedResult.success).toBeTrue()
		return
	}
	const svg = generateNumberLineWithAction(parsedResult.data)
	expect(svg).toMatchSnapshot()
})
