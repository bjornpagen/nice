import { expect, test } from "bun:test"
import type { z } from "zod"
import { generatePopulationChangeEventGraph, PopulationChangeEventGraphPropsSchema } from "@/lib/widgets/generators"

type PopulationChangeEventGraphInput = z.input<typeof PopulationChangeEventGraphPropsSchema>

test("population change event graph - initial question prompt", () => {
	const input = {
		type: "populationChangeEventGraph",
		width: 400,
		height: 300,
		xAxisLabel: "Time",
		yAxisLabel: "Deer population size",
		xAxisMin: 0,
		xAxisMax: 10,
		yAxisMin: 0,
		yAxisMax: 10,
		beforeSegment: {
			points: [
				{ x: 0, y: 5 },
				{ x: 1, y: 4.8 },
				{ x: 2, y: 5.2 },
				{ x: 3, y: 5.1 },
				{ x: 4, y: 5.3 },
				{ x: 5, y: 5.0 }
			],
			color: "#000000",
			label: "Before decreased rain"
		},
		afterSegment: {
			points: [],
			color: "#00A2C7",
			label: "After decreased rain"
		},
		showLegend: false
	} satisfies PopulationChangeEventGraphInput

	const parsed = PopulationChangeEventGraphPropsSchema.parse(input)
	const svg = generatePopulationChangeEventGraph(parsed)
	expect(svg).toMatchSnapshot()
})

test("population change event graph - choice A steady population", () => {
	const input = {
		type: "populationChangeEventGraph",
		width: 400,
		height: 300,
		xAxisLabel: "Time",
		yAxisLabel: "Deer population size",
		xAxisMin: 0,
		xAxisMax: 10,
		yAxisMin: 0,
		yAxisMax: 10,
		beforeSegment: {
			points: [
				{ x: 0, y: 5 },
				{ x: 1, y: 4.8 },
				{ x: 2, y: 5.2 },
				{ x: 3, y: 5.1 },
				{ x: 4, y: 5.3 },
				{ x: 5, y: 5.0 }
			],
			color: "#000000",
			label: "Before decreased rain"
		},
		afterSegment: {
			points: [
				{ x: 5, y: 5.0 },
				{ x: 6, y: 4.8 },
				{ x: 7, y: 5.1 },
				{ x: 8, y: 4.9 },
				{ x: 9, y: 5.0 },
				{ x: 10, y: 4.8 }
			],
			color: "#00A2C7",
			label: "After decreased rain"
		},
		showLegend: true
	} satisfies PopulationChangeEventGraphInput

	const parsed = PopulationChangeEventGraphPropsSchema.parse(input)
	const svg = generatePopulationChangeEventGraph(parsed)
	expect(svg).toMatchSnapshot()
})

test("population change event graph - choice B decreased population", () => {
	const input = {
		type: "populationChangeEventGraph",
		width: 400,
		height: 300,
		xAxisLabel: "Time",
		yAxisLabel: "Deer population size",
		xAxisMin: 0,
		xAxisMax: 10,
		yAxisMin: 0,
		yAxisMax: 10,
		beforeSegment: {
			points: [
				{ x: 0, y: 5 },
				{ x: 1, y: 4.8 },
				{ x: 2, y: 5.2 },
				{ x: 3, y: 5.1 },
				{ x: 4, y: 5.3 },
				{ x: 5, y: 5.0 }
			],
			color: "#000000",
			label: "Before decreased rain"
		},
		afterSegment: {
			points: [
				{ x: 5, y: 5.0 },
				{ x: 6, y: 2.0 },
				{ x: 7, y: 1.8 },
				{ x: 8, y: 2.1 },
				{ x: 9, y: 1.9 },
				{ x: 10, y: 2.0 }
			],
			color: "#00A2C7",
			label: "After decreased rain"
		},
		showLegend: true
	} satisfies PopulationChangeEventGraphInput

	const parsed = PopulationChangeEventGraphPropsSchema.parse(input)
	const svg = generatePopulationChangeEventGraph(parsed)
	expect(svg).toMatchSnapshot()
})

test("population change event graph - choice C increased population", () => {
	const input = {
		type: "populationChangeEventGraph",
		width: 400,
		height: 300,
		xAxisLabel: "Time",
		yAxisLabel: "Deer population size",
		xAxisMin: 0,
		xAxisMax: 10,
		yAxisMin: 0,
		yAxisMax: 10,
		beforeSegment: {
			points: [
				{ x: 0, y: 5 },
				{ x: 1, y: 4.8 },
				{ x: 2, y: 5.2 },
				{ x: 3, y: 5.1 },
				{ x: 4, y: 5.3 },
				{ x: 5, y: 5.0 }
			],
			color: "#000000",
			label: "Before decreased rain"
		},
		afterSegment: {
			points: [
				{ x: 5, y: 5.0 },
				{ x: 6, y: 8.0 },
				{ x: 7, y: 7.8 },
				{ x: 8, y: 8.1 },
				{ x: 9, y: 7.9 },
				{ x: 10, y: 8.0 }
			],
			color: "#00A2C7",
			label: "After decreased rain"
		},
		showLegend: true
	} satisfies PopulationChangeEventGraphInput

	const parsed = PopulationChangeEventGraphPropsSchema.parse(input)
	const svg = generatePopulationChangeEventGraph(parsed)
	expect(svg).toMatchSnapshot()
})
