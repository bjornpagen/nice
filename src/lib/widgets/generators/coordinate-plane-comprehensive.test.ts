import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import {
	ErrInvalidDimensions,
	generateCoordinatePlaneComprehensive
} from "@/lib/widgets/generators/coordinate-plane-comprehensive"

describe("generateCoordinatePlaneComprehensive", () => {
	test("should render comprehensive coordinate plane with all features", () => {
		const props = {
			type: "coordinatePlane" as const,
			width: 500,
			height: 500,
			xAxis: { min: -10, max: 10, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -10, max: 10, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: true,
			points: [
				{ id: "A", x: -5, y: 3, label: "A", color: "red", style: "closed" as const },
				{ id: "B", x: 4, y: -2, label: "B", color: "blue", style: "closed" as const },
				{ id: "C", x: 0, y: 5, label: "C", color: "green", style: "closed" as const }
			],
			lines: [
				{
					id: "line1",
					equation: { type: "slopeIntercept" as const, slope: 0.5, yIntercept: -2 },
					color: "purple",
					style: "dashed" as const
				}
			],
			polygons: [
				{
					vertices: ["A", "B", "C"],
					isClosed: true,
					fillColor: "rgba(255, 0, 0, 0.1)",
					strokeColor: "red",
					label: "Triangle"
				}
			],
			distances: [
				{
					pointId1: "A",
					pointId2: "B",
					showLegs: true,
					showLegLabels: false,
					hypotenuseLabel: "AB",
					color: "gray",
					style: "dashed" as const
				}
			],
			polylines: [
				{
					id: "func1",
					points: [
						{ x: -5, y: 2 },
						{ x: -3, y: 1 },
						{ x: -1, y: -1 },
						{ x: 1, y: -2 },
						{ x: 3, y: 0 },
						{ x: 5, y: 3 }
					],
					color: "orange",
					style: "solid" as const
				}
			]
		}
		expect(generateCoordinatePlaneComprehensive(props)).toMatchSnapshot()
	})

	test("should render with minimal features", () => {
		const props = {
			type: "coordinatePlane" as const,
			width: 300,
			height: 300,
			xAxis: { min: -5, max: 5, tickInterval: 1, label: null, showGridLines: false },
			yAxis: { min: -5, max: 5, tickInterval: 1, label: null, showGridLines: false },
			showQuadrantLabels: false,
			points: [{ id: "origin", x: 0, y: 0, label: "O", color: "black", style: "closed" as const }],
			lines: null,
			polygons: null,
			distances: null,
			polylines: null
		}
		expect(generateCoordinatePlaneComprehensive(props)).toMatchSnapshot()
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
			polygons: [],
			distances: null,
			polylines: null
		}
		const result = errors.trySync(() => generateCoordinatePlaneComprehensive(props))
		if (result.error) {
			expect(errors.is(result.error, ErrInvalidDimensions)).toBe(true)
			expect(result.error.message).toMatchSnapshot()
		} else {
			throw errors.new("expected an error to be thrown")
		}
	})
})
