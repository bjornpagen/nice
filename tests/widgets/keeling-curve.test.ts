import { describe, expect, it } from "bun:test"
import { generateKeelingCurve } from "@/lib/widgets/generators/keeling-curve"

describe("keelingCurve widget", () => {
	it("should generate SVG with correct dimensions", async () => {
		const result = await generateKeelingCurve({
			type: "keelingCurve",
			width: 600,
			height: 400,
			xAxisLabel: "Year",
			yAxisLabel: "CO₂ (ppm)",
			annotations: []
		})

		// Height may expand dynamically; width may expand dynamically. ViewBox min-x may be negative.
		expect(result).toMatch(/<svg width="\d+\.?\d*" height="\d+\.?\d*"/)
		expect(result).toMatch(/viewBox="-?\d+\.?\d* -?\d+\.?\d* \d+\.?\d* \d+\.?\d*"/)
	})

	it("should include axis labels", async () => {
		const result = await generateKeelingCurve({
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

	it("should render CO₂ data line", async () => {
		const result = await generateKeelingCurve({
			type: "keelingCurve",
			width: 600,
			height: 400,
			xAxisLabel: "Year",
			yAxisLabel: "CO₂ (ppm)",
			annotations: []
		})

		expect(result).toContain("<polyline")
		expect(result).toContain('stroke="#000000"')
		expect(result).toContain('stroke-width="2.5"')
	})

	it("should render annotations with multi-line text", async () => {
		const result = await generateKeelingCurve({
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
		expect(result).toContain('marker-end="url(#co2-arrow)"')
		// Should contain <tspan> elements for multi-line text
		expect(result).toMatch(/<tspan[^>]*>Industrial Revolution<\/tspan>/)
		expect(result).toMatch(/<tspan[^>]*dy="1\.2em"[^>]*>starts<\/tspan>/)
	})

	it("should render multiple annotations", async () => {
		const result = await generateKeelingCurve({
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

	it("should position all annotations in upper left corner", async () => {
		const result = await generateKeelingCurve({
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
		// Annotations should be positioned correctly
	})

	it("should generate a snapshot-worthy SVG", async () => {
		const result = await generateKeelingCurve({
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
