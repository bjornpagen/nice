import { describe, expect, it } from "bun:test"
import { generateKeelingCurve } from "@/lib/widgets/generators/keeling-curve"

describe("keelingCurve widget", () => {
	it("should generate SVG with correct dimensions", () => {
		const result = generateKeelingCurve({
			type: "keelingCurve",
			width: 600,
			height: 400,
			xAxisLabel: "Year",
			yAxisLabel: "CO₂ (ppm)",
			annotations: []
		})

		expect(result).toContain('<svg width="600" height="400"')
		expect(result).toContain('viewBox="0 0 600 400"')
	})

	it("should include axis labels", () => {
		const result = generateKeelingCurve({
			type: "keelingCurve",
			width: 600,
			height: 400,
			xAxisLabel: "Year",
			yAxisLabel: "CO₂ (ppm)",
			annotations: []
		})

		expect(result).toContain("Year")
		expect(result).toContain("CO₂ (ppm)")
	})

	it("should render CO₂ data line", () => {
		const result = generateKeelingCurve({
			type: "keelingCurve",
			width: 600,
			height: 400,
			xAxisLabel: "Year",
			yAxisLabel: "CO₂ (ppm)",
			annotations: []
		})

		expect(result).toContain("<polyline")
		expect(result).toContain('stroke="black"')
		expect(result).toContain('stroke-width="2.5"')
	})

	it("should render annotations with multi-line text", () => {
		const result = generateKeelingCurve({
			type: "keelingCurve",
			width: 600,
			height: 400,
			xAxisLabel: "Year",
			yAxisLabel: "CO₂ (ppm)",
			annotations: [
				{
					year: 1750,
					text: ["Industrial Revolution", "starts"]
				}
			]
		})

		expect(result).toContain("Industrial Revolution")
		expect(result).toContain("starts")
		expect(result).toContain("<tspan")
		expect(result).toContain('marker-end="url(#co2-arrow)"')
	})

	it("should render multiple annotations", () => {
		const result = generateKeelingCurve({
			type: "keelingCurve",
			width: 600,
			height: 400,
			xAxisLabel: "Year",
			yAxisLabel: "CO₂ (ppm)",
			annotations: [
				{
					year: 1750,
					text: ["Industrial Revolution", "starts"]
				},
				{
					year: 2000,
					text: ["21st Century", "begins"]
				}
			]
		})

		expect(result).toContain("Industrial Revolution")
		expect(result).toContain("21st Century")
		expect(result).toContain("begins")
		// Should have two arrows
		expect(result.match(/marker-end="url\(#co2-arrow\)"/g)?.length).toBe(2)
	})

	it("should position all annotations in upper left corner", () => {
		const result = generateKeelingCurve({
			type: "keelingCurve",
			width: 600,
			height: 400,
			xAxisLabel: "Year",
			yAxisLabel: "CO₂ (ppm)",
			annotations: [
				{
					year: 1750,
					text: ["First annotation"]
				},
				{
					year: 2000,
					text: ["Second annotation"]
				}
			]
		})

		// Check that annotations are present
		expect(result).toContain("First annotation")
		expect(result).toContain("Second annotation")
		// Check that text-anchor is start (for left alignment)
		expect(result).toContain("text-anchor: start")
	})

	it("should generate a snapshot-worthy SVG", () => {
		const result = generateKeelingCurve({
			type: "keelingCurve",
			width: 600,
			height: 400,
			xAxisLabel: "Year",
			yAxisLabel: "CO₂ (ppm)",
			annotations: [
				{
					year: 1750,
					text: ["Industrial Revolution", "starts"]
				}
			]
		})

		expect(result).toMatchSnapshot()
	})
})
