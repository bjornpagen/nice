import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { generateScaleCopiesSlider, ScaleCopiesSliderPropsSchema } from "./scale-copies-slider"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const validationResult = ScaleCopiesSliderPropsSchema.safeParse(props)
	if (!validationResult.success) {
		throw errors.wrap(validationResult.error, "schema validation failed")
	}
	return generateScaleCopiesSlider(validationResult.data)
}

describe("generateScaleCopiesSlider", () => {
	test("should render a standard case where Shape A is the scale copy (stretching)", () => {
		const props = {
			type: "scaleCopiesSlider" as const,
			width: null,
			height: null,
			shapeA: {
				label: "Shape A",
				before: { width: 50, height: 50 },
				after: { width: 100, height: 100 }, // Proportional stretch (x2)
				color: "#9AB8ED"
			},
			shapeB: {
				label: "Shape B",
				before: { width: 50, height: 50 },
				after: { width: 100, height: 50 }, // Non-proportional stretch
				color: "#9BEDCE"
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render a case where Shape B is the scale copy (shrinking)", () => {
		const props = {
			type: "scaleCopiesSlider" as const,
			width: 550,
			height: 250,
			shapeA: {
				label: "Shape A",
				before: { width: 120, height: 80 },
				after: { width: 60, height: 80 }, // Non-proportional shrink
				color: "#9AB8ED"
			},
			shapeB: {
				label: "Shape B",
				before: { width: 120, height: 80 },
				after: { width: 60, height: 40 }, // Proportional shrink (x0.5)
				color: "#9BEDCE"
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should handle distortion (width increases, height decreases)", () => {
		const props = {
			type: "scaleCopiesSlider" as const,
			width: null,
			height: null,
			shapeA: {
				label: "Shape A",
				before: { width: 40, height: 100 },
				after: { width: 80, height: 50 }, // Distorted
				color: "#FFDDC1"
			},
			shapeB: {
				label: "Shape B",
				before: { width: 40, height: 100 },
				after: { width: 60, height: 150 }, // Proportional stretch (x1.5)
				color: "#C1FFD7"
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render correctly with different aspect ratios", () => {
		const props = {
			type: "scaleCopiesSlider" as const,
			width: null,
			height: null,
			shapeA: {
				label: "Shape A",
				before: { width: 150, height: 30 }, // Wide rectangle
				after: { width: 75, height: 15 }, // Proportional shrink (x0.5)
				color: "#fada5e"
			},
			shapeB: {
				label: "Shape B",
				before: { width: 30, height: 150 }, // Tall rectangle
				after: { width: 60, height: 150 }, // Non-proportional stretch
				color: "#d9534f"
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with minimal props, applying defaults", () => {
		const props = {
			type: "scaleCopiesSlider" as const,
			width: null,
			height: null,
			shapeA: {
				label: "Transformation 1",
				before: { width: 20, height: 30 },
				after: { width: 40, height: 60 },
				color: null // Test default color
			},
			shapeB: {
				label: "Transformation 2",
				before: { width: 20, height: 30 },
				after: { width: 20, height: 60 },
				color: "#9BEDCE"
			}
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
