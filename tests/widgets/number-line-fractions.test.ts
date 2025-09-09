import { describe, expect, test } from "bun:test"
import { generateNumberLine } from "@/lib/widgets/generators/number-line"

describe("number-line fraction examples", () => {
	test("should generate number line showing 2/5 fraction", async () => {
		const widget = {
			type: "numberLine" as const,
			width: 400,
			height: 80,
			orientation: "horizontal" as const,
			min: 0,
			max: 1,
			tickInterval: { type: "fraction" as const, denominator: 5 },
			secondaryTickInterval: null,
			showTickLabels: true,
			highlightedPoints: [
				{
					value: 2/5,
					color: "#FF0000",
					style: "arrowAndDot" as const,
					label: null
				}
			]
		}

		const svg = await generateNumberLine(widget)
		expect(svg).toMatchSnapshot()
	})

	test("should generate number line showing 4/8 fraction", async () => {
		const widget = {
			type: "numberLine" as const,
			width: 400,
			height: 80,
			orientation: "horizontal" as const,
			min: 0,
			max: 1,
			tickInterval: { type: "fraction" as const, denominator: 8 },
			secondaryTickInterval: null,
			showTickLabels: true,
			highlightedPoints: [
				{
					value: 4/8,
					color: "#FF0000",
					style: "arrowAndDot" as const,
					label: null
				}
			]
		}

		const svg = await generateNumberLine(widget)
		expect(svg).toMatchSnapshot()
	})

	test("should generate number line showing 2/5 with visible tick marks", async () => {
		const widget = {
			type: "numberLine" as const,
			width: 500,
			height: 100,
			orientation: "horizontal" as const,
			min: 0,
			max: 1,
			tickInterval: { type: "fraction" as const, denominator: 5 },
			secondaryTickInterval: null,
			showTickLabels: true,
			highlightedPoints: [
				{
					value: 0.4, // 2/5 as decimal
					color: "#FF0000",
					style: "arrowAndDot" as const,
					label: null
				}
			]
		}

		const svg = await generateNumberLine(widget)
		expect(svg).toMatchSnapshot()
	})

	test("should generate number line showing 1/2 (4/8) with eighths divisions", async () => {
		const widget = {
			type: "numberLine" as const,
			width: 500,
			height: 100,
			orientation: "horizontal" as const,
			min: 0,
			max: 1,
			tickInterval: { type: "fraction" as const, denominator: 8 },
			secondaryTickInterval: null,
			showTickLabels: true,
			highlightedPoints: [
				{
					value: 0.5, // 4/8 = 1/2 as decimal
					color: "#FF0000",
					style: "arrowAndDot" as const,
					label: null
				}
			]
		}

		const svg = await generateNumberLine(widget)
		expect(svg).toMatchSnapshot()
	})
})
