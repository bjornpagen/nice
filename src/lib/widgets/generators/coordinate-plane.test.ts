import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { CoordinatePlanePropsSchema, ErrInvalidDimensions, generateCoordinatePlane } from "./coordinate-plane"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = CoordinatePlanePropsSchema.parse(props)
	return generateCoordinatePlane(parsedProps)
}

describe("generateCoordinatePlane", () => {
	test("should render a full-featured coordinate plane", () => {
		const props = {
			type: "coordinatePlane" as const,
			width: 500,
			height: 500,
			xAxis: { label: "X-Axis", min: -10, max: 10, tickInterval: 2, showGridLines: true },
			yAxis: { label: "Y-Axis", min: -10, max: 10, tickInterval: 2, showGridLines: true },
			showQuadrantLabels: true,
			points: [
				{ id: "p1", x: -4, y: 6, label: "A", color: "red", style: "closed" as const },
				{ id: "p2", x: 5, y: -5, label: "B", style: "open" as const, color: "blue" },
				{ id: "p3", x: 8, y: 8, label: "C", color: "green", style: "closed" as const }
			],
			lines: [
				{
					id: "l1",
					equation: { type: "slopeIntercept" as const, slope: 1, yIntercept: 1 },
					style: "dashed" as const,
					color: "purple"
				}
			],
			polygons: [
				{
					vertices: ["p1", "p2", "p3"],
					isClosed: true,
					fillColor: "rgba(0, 255, 0, 0.3)",
					strokeColor: "green",
					label: null
				}
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should handle error case with invalid dimensions", () => {
		const props = {
			type: "coordinatePlane" as const,
			width: 10,
			height: 10,
			xAxis: { min: 10, max: 0, tickInterval: 1, label: null, showGridLines: false },
			yAxis: { min: 10, max: 0, tickInterval: 1, label: null, showGridLines: false },
			showQuadrantLabels: false,
			points: null,
			lines: [],
			polygons: []
		}
		const result = errors.trySync(() => generateDiagram(props))
		if (result.error) {
			expect(errors.is(result.error, ErrInvalidDimensions)).toBe(true)
			expect(result.error.message).toMatchSnapshot()
		} else {
			throw errors.new("expected an error to be thrown")
		}
	})
})
