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
			],
			distances: null,
			polylines: null
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
			polygons: [],
			distances: null,
			polylines: null
		}
		const result = errors.trySync(() => generateDiagram(props))
		if (result.error) {
			expect(errors.is(result.error, ErrInvalidDimensions)).toBe(true)
			expect(result.error.message).toMatchSnapshot()
		} else {
			throw errors.new("expected an error to be thrown")
		}
	})

	describe("Line Equation Types", () => {
		test("should render a line from a standard form equation", () => {
			const props = {
				type: "coordinatePlane" as const,
				width: 400,
				height: 400,
				xAxis: { label: "x", min: -5, max: 5, tickInterval: 1, showGridLines: true },
				yAxis: { label: "y", min: -5, max: 5, tickInterval: 1, showGridLines: true },
				showQuadrantLabels: false,
				points: null,
				lines: [
					{
						id: "l1",
						equation: { type: "standard" as const, A: 2, B: 3, C: 6 },
						style: "solid" as const,
						color: "red"
					}
				],
				polygons: null,
				distances: null,
				polylines: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a line from a point-slope form equation", () => {
			const props = {
				type: "coordinatePlane" as const,
				width: 400,
				height: 400,
				xAxis: { label: "x", min: -5, max: 5, tickInterval: 1, showGridLines: true },
				yAxis: { label: "y", min: -5, max: 5, tickInterval: 1, showGridLines: true },
				showQuadrantLabels: false,
				points: null,
				lines: [
					{
						id: "l1",
						equation: { type: "pointSlope" as const, x1: 2, y1: 3, slope: -0.5 },
						style: "dashed" as const,
						color: "blue"
					}
				],
				polygons: null,
				distances: null,
				polylines: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a vertical line from standard form", () => {
			const props = {
				type: "coordinatePlane" as const,
				width: 400,
				height: 400,
				xAxis: { label: "x", min: -5, max: 5, tickInterval: 1, showGridLines: true },
				yAxis: { label: "y", min: -5, max: 5, tickInterval: 1, showGridLines: true },
				showQuadrantLabels: false,
				points: null,
				lines: [
					{
						id: "l1",
						equation: { type: "standard" as const, A: 1, B: 0, C: 3 },
						style: "solid" as const,
						color: "green"
					}
				],
				polygons: null,
				distances: null,
				polylines: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Distance Visualization", () => {
		test("should render the distance between two points with legs", () => {
			const props = {
				type: "coordinatePlane" as const,
				width: 400,
				height: 400,
				xAxis: { label: "x", min: -10, max: 10, tickInterval: 2, showGridLines: true },
				yAxis: { label: "y", min: -10, max: 10, tickInterval: 2, showGridLines: true },
				showQuadrantLabels: false,
				points: [
					{ id: "p1", x: -2, y: 7, label: "A", color: "blue", style: "closed" as const },
					{ id: "p2", x: 7, y: -1, label: "B", color: "blue", style: "closed" as const }
				],
				lines: null,
				polygons: null,
				distances: [
					{
						pointId1: "p1",
						pointId2: "p2",
						showLegs: true,
						showLegLabels: false,
						hypotenuseLabel: null,
						color: "purple",
						style: "dashed" as const
					}
				],
				polylines: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render distance without legs", () => {
			const props = {
				type: "coordinatePlane" as const,
				width: 400,
				height: 400,
				xAxis: { label: "x", min: -5, max: 5, tickInterval: 1, showGridLines: true },
				yAxis: { label: "y", min: -5, max: 5, tickInterval: 1, showGridLines: true },
				showQuadrantLabels: false,
				points: [
					{ id: "p1", x: -3, y: -2, label: "P", color: "red", style: "closed" as const },
					{ id: "p2", x: 4, y: 3, label: "Q", color: "red", style: "closed" as const }
				],
				lines: null,
				polygons: null,
				distances: [
					{
						pointId1: "p1",
						pointId2: "p2",
						showLegs: false,
						showLegLabels: false,
						hypotenuseLabel: null,
						color: "orange",
						style: "solid" as const
					}
				],
				polylines: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Polyline Graphing", () => {
		test("should render a multi-segment polyline", () => {
			const props = {
				type: "coordinatePlane" as const,
				width: 400,
				height: 400,
				xAxis: { label: "x", min: -5, max: 5, tickInterval: 1, showGridLines: true },
				yAxis: { label: "y", min: -5, max: 5, tickInterval: 1, showGridLines: true },
				showQuadrantLabels: false,
				points: null,
				lines: null,
				polygons: null,
				distances: null,
				polylines: [
					{
						id: "func1",
						points: [
							{ x: -4, y: 4 },
							{ x: -2, y: -3 },
							{ x: 0, y: 2 },
							{ x: 1, y: -1 },
							{ x: 4, y: 3 }
						],
						color: "green",
						style: "solid" as const
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a dashed polyline function", () => {
			const props = {
				type: "coordinatePlane" as const,
				width: 400,
				height: 400,
				xAxis: { label: "x", min: -6, max: 6, tickInterval: 2, showGridLines: true },
				yAxis: { label: "y", min: -6, max: 6, tickInterval: 2, showGridLines: true },
				showQuadrantLabels: false,
				points: null,
				lines: null,
				polygons: null,
				distances: null,
				polylines: [
					{
						id: "piecewise",
						points: [
							{ x: -5, y: -5 },
							{ x: -3, y: -5 },
							{ x: -3, y: 0 },
							{ x: 0, y: 0 },
							{ x: 0, y: 3 },
							{ x: 3, y: 3 },
							{ x: 3, y: -2 },
							{ x: 5, y: -2 }
						],
						color: "magenta",
						style: "dashed" as const
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render a trigonometric function like Khan Academy sine wave", () => {
			// Generate points for y = 2sin(2x) from -2π to 2π
			const points = []
			const startX = -2 * Math.PI
			const endX = 2 * Math.PI
			const numPoints = 200 // Dense sampling for smooth curve

			for (let i = 0; i <= numPoints; i++) {
				const x = startX + (i / numPoints) * (endX - startX)
				const y = 2 * Math.sin(2 * x) // y = 2sin(2x) based on visual analysis
				points.push({ x, y })
			}

			const props = {
				type: "coordinatePlane" as const,
				width: 425,
				height: 425,
				xAxis: {
					label: "x",
					min: -2 * Math.PI,
					max: 2 * Math.PI,
					tickInterval: Math.PI / 2,
					showGridLines: true
				},
				yAxis: {
					label: "y",
					min: -3,
					max: 3,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				points: [
					// Key points for function analysis questions
					{ id: "origin", x: 0, y: 0, label: "(0,0)", color: "red", style: "closed" as const },
					{ id: "max1", x: -Math.PI, y: 2, label: "max", color: "red", style: "closed" as const },
					{ id: "max2", x: Math.PI, y: 2, label: "max", color: "red", style: "closed" as const },
					{ id: "min1", x: -Math.PI / 2, y: -2, label: "min", color: "blue", style: "closed" as const },
					{ id: "min2", x: Math.PI / 2, y: -2, label: "min", color: "blue", style: "closed" as const }
				],
				lines: null,
				polygons: null,
				distances: null,
				polylines: [
					{
						id: "sine-function",
						points: points,
						color: "#4A90E2", // Blue color matching Khan Academy style
						style: "solid" as const
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
