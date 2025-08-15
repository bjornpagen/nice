import { test, expect } from "bun:test"
import { generateConceptualGraph, ConceptualGraphPropsSchema } from "@/lib/widgets/generators"

test("conceptual graph - frog population size", () => {
	const input = {
		type: "conceptualGraph" as const,
		width: 400,
		height: 400,
		xAxisLabel: "Time",
		yAxisLabel: "Frog population size",
		curvePoints: [
			{ x: 0.5, y: 0.5 },
			{ x: 1.5, y: 1 },
			{ x: 2.5, y: 2 },
			{ x: 3.5, y: 4 },
			{ x: 4.5, y: 6 },
			{ x: 5.5, y: 8 },
			{ x: 6.5, y: 9 },
			{ x: 7.5, y: 8.8 },
			{ x: 8.5, y: 8.2 },
			{ x: 9.5, y: 8.4 }
		],
		curveColor: "#00A2C7",
		highlightPoints: [
			{ x: 2.5, y: 2, label: "A" },
			{ x: 4.5, y: 6, label: "B" },
			{ x: 6.5, y: 9, label: "C" }
		],
		highlightPointColor: "#000000", // Changed from "black" to hex format
		highlightPointRadius: 6
	}

	// Validate the input
	const parsed = ConceptualGraphPropsSchema.parse(input)
	
	// Generate the SVG
	const svg = generateConceptualGraph(parsed)
	
	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})
