import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { generateTapeDiagram, TapeDiagramPropsSchema } from "./tape-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedResult = TapeDiagramPropsSchema.safeParse(props)
	if (!parsedResult.success) {
		throw errors.new(`Invalid props: ${parsedResult.error.message}`)
	}
	return generateTapeDiagram(parsedResult.data)
}

describe("generateTapeDiagram", () => {
	// Group existing tests under "Additive Model"
	describe("Additive Model", () => {
		test("should render with minimal props (defaults to additive)", () => {
			const props = {
				type: "tapeDiagram" as const,
				width: null,
				height: null,
				topTape: {
					label: "Top Tape",
					segments: [
						{ label: "100", length: 100 },
						{ label: "75", length: 75 }
					],
					color: null
				},
				bottomTape: {
					label: "Bottom Tape",
					segments: [
						{ label: "50", length: 50 },
						{ label: "125", length: 125 }
					],
					color: null
				},
				showTotalBracket: null,
				totalLabel: null,
				modelType: null // Explicitly test default
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with all props specified (additive)", () => {
			const props = {
				type: "tapeDiagram" as const,
				width: 500,
				height: 150,
				modelType: "additive" as const, // Explicitly test additive
				topTape: {
					label: "Top Segments",
					segments: [
						{ label: "x", length: 120 },
						{ label: "24", length: 80 }
					],
					color: "#4caf50"
				},
				bottomTape: {
					label: "Bottom Segments",
					segments: [
						{ label: "y", length: 100 },
						{ label: "100", length: 100 }
					],
					color: "#2196f3"
				},
				showTotalBracket: true,
				totalLabel: "300 total"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	// Add new describe block for Ratio Model
	describe("Ratio Model", () => {
		test("should render a 2:3 ratio with equal unit sizes", () => {
			const props = {
				type: "tapeDiagram" as const,
				width: 400,
				height: 200,
				modelType: "ratio" as const,
				topTape: {
					label: "Ratio A",
					segments: [
						{ label: "x", length: 1 },
						{ label: "x", length: 1 }
					],
					color: "#ff6b6b"
				},
				bottomTape: {
					label: "Ratio B",
					segments: [
						{ label: "x", length: 1 },
						{ label: "x", length: 1 },
						{ label: "x", length: 1 }
					],
					color: "#4ecdc4"
				},
				showTotalBracket: true,
				totalLabel: "Total 5 units"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	// Add new describe block for Single Tape Model
	describe("Single Tape Model", () => {
		test("should render a single tape with a total bracket", () => {
			const props = {
				type: "tapeDiagram" as const,
				width: 400,
				height: 150,
				modelType: "additive" as const,
				topTape: {
					label: "Parts",
					segments: [
						{ label: "15", length: 15 },
						{ label: "30", length: 30 }
					],
					color: null
				},
				bottomTape: null, // Test the nullable property
				showTotalBracket: true,
				totalLabel: "Total: 45"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
