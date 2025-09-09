import { describe, expect, test } from "bun:test"
import { generateRadiallyConstrainedAngleDiagram } from "@/lib/widgets/generators/radially-constrained-angle-diagram"

describe("radially-constrained-angle-diagram", () => {
	test("generates basic angle diagram with two angles", async () => {
		const svg = await generateRadiallyConstrainedAngleDiagram({
			type: "radiallyConstrainedAngleDiagram",
			width: 400,
			height: 400,
			centerLabel: "O",
			angles: [
				{ value: 60, color: "#ff6b6b" },
				{ value: 120, color: "#4ecdc4" },
			],
			rayLabels: ["A", "B", "C"],
		})

		expect(svg).toMatchSnapshot()
	})

	test("generates diagram with three angles totaling 360 degrees", async () => {
		const svg = await generateRadiallyConstrainedAngleDiagram({
			type: "radiallyConstrainedAngleDiagram",
			width: 500,
			height: 500,
			centerLabel: null,
			angles: [
				{ value: 90, color: "#e74c3c" },
				{ value: 180, color: "#3498db" },
				{ value: 90, color: "#2ecc71" },
			],
			rayLabels: ["P", "Q", "R", "S"],
		})

		expect(svg).toMatchSnapshot()
	})

	test("generates single angle diagram", async () => {
		const svg = await generateRadiallyConstrainedAngleDiagram({
			type: "radiallyConstrainedAngleDiagram",
			width: 300,
			height: 300,
			centerLabel: "X",
			angles: [
				{ value: 45, color: "#9b59b6" },
			],
			rayLabels: ["M", "N"],
		})

		expect(svg).toMatchSnapshot()
	})

	test("handles empty center label correctly", async () => {
		const svg = await generateRadiallyConstrainedAngleDiagram({
			type: "radiallyConstrainedAngleDiagram",
			width: 400,
			height: 400,
			centerLabel: "",
			angles: [
				{ value: 30, color: "#f39c12" },
			],
			rayLabels: ["A", "B"],
		})

		expect(svg).toMatchSnapshot()
	})

	test("generates diagram with maximum angle", async () => {
		const svg = await generateRadiallyConstrainedAngleDiagram({
			type: "radiallyConstrainedAngleDiagram",
			width: 400,
			height: 400,
			centerLabel: "O",
			angles: [
				{ value: 360, color: "#1abc9c" },
			],
			rayLabels: ["A", "B"],
		})

		expect(svg).toMatchSnapshot()
	})

	test("throws error for invalid ray labels count", async () => {
		await expect(generateRadiallyConstrainedAngleDiagram({
			type: "radiallyConstrainedAngleDiagram",
			width: 400,
			height: 400,
			centerLabel: "O",
			angles: [
				{ value: 60, color: "#ff6b6b" },
			],
			rayLabels: ["A", "B", "C"], // Should be 2, not 3
		})).rejects.toThrow("There must be exactly one more ray label than the number of angles.")
	})

	test("throws error for angles exceeding 360 degrees", async () => {
		await expect(generateRadiallyConstrainedAngleDiagram({
			type: "radiallyConstrainedAngleDiagram",
			width: 400,
			height: 400,
			centerLabel: "O",
			angles: [
				{ value: 200, color: "#ff6b6b" },
				{ value: 200, color: "#4ecdc4" },
			],
			rayLabels: ["A", "B", "C"],
		})).rejects.toThrow("The sum of angles must be between 1 and 360 degrees.")
	})

	test("recreates the example diagram with five rays and four colored angles", async () => {
		const svg = await generateRadiallyConstrainedAngleDiagram({
			type: "radiallyConstrainedAngleDiagram",
			width: 500,
			height: 500,
			centerLabel: "O",
			angles: [
				{ value: 48, color: "#4A90E2" }, // blue for 48°
				{ value: 72, color: "#F5A623" }, // orange for 72° 
				{ value: 63, color: "#7ED321" }, // green for 63°
				{ value: 47, color: "#50E3C2" }, // light blue for 47°
			],
			rayLabels: ["A", "B", "C", "D", "E"],
		})

		expect(svg).toMatchSnapshot()
	})
})
