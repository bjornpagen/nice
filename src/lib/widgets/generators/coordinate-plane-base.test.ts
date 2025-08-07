import { describe, expect, test } from "bun:test"
import {
	createAxisOptionsSchema,
	createDistanceSchema,
	createLineSchema,
	createPlotPointSchema,
	createPolygonSchema,
	createPolylineSchema
} from "@/lib/widgets/generators/coordinate-plane-base"

describe("coordinate-plane-base schemas", () => {
	test("createAxisOptionsSchema should create valid schema", () => {
		const schema = createAxisOptionsSchema()
		const validData = {
			label: "x-axis",
			min: -10,
			max: 10,
			tickInterval: 2,
			showGridLines: true
		}
		const result = schema.safeParse(validData)
		expect(result.success).toBe(true)
	})

	test("createPlotPointSchema should create valid schema", () => {
		const schema = createPlotPointSchema()
		const validData = {
			id: "point-1",
			x: 5,
			y: -3,
			label: "A",
			color: "#FF0000",
			style: "closed"
		}
		const result = schema.safeParse(validData)
		expect(result.success).toBe(true)
	})

	test("createLineSchema should create valid schema with different equation types", () => {
		const schema = createLineSchema()

		// Test slope-intercept form
		const slopeInterceptLine = {
			id: "line-1",
			equation: {
				type: "slopeIntercept",
				slope: 2,
				yIntercept: -3
			},
			color: "blue",
			style: "solid"
		}
		expect(schema.safeParse(slopeInterceptLine).success).toBe(true)

		// Test standard form
		const standardLine = {
			id: "line-2",
			equation: {
				type: "standard",
				A: 3,
				B: -2,
				C: 6
			},
			color: null,
			style: null
		}
		expect(schema.safeParse(standardLine).success).toBe(true)

		// Test point-slope form
		const pointSlopeLine = {
			id: "line-3",
			equation: {
				type: "pointSlope",
				x1: 2,
				y1: 5,
				slope: -0.5
			},
			color: "green",
			style: "dashed"
		}
		expect(schema.safeParse(pointSlopeLine).success).toBe(true)
	})

	test("createPolygonSchema should create valid schema", () => {
		const schema = createPolygonSchema()
		const validData = {
			vertices: ["A", "B", "C", "D"],
			isClosed: true,
			fillColor: "rgba(0, 0, 255, 0.2)",
			strokeColor: "blue",
			label: "Square ABCD"
		}
		const result = schema.safeParse(validData)
		expect(result.success).toBe(true)
	})

	test("createDistanceSchema should create valid schema", () => {
		const schema = createDistanceSchema()
		const validData = {
			pointId1: "A",
			pointId2: "B",
			showLegs: true,
			showLegLabels: false,
			hypotenuseLabel: "d",
			color: "gray",
			style: "dashed"
		}
		const result = schema.safeParse(validData)
		expect(result.success).toBe(true)
	})

	test("createPolylineSchema should create valid schema", () => {
		const schema = createPolylineSchema()
		const validData = {
			id: "function-1",
			points: [
				{ x: -5, y: 25 },
				{ x: -4, y: 16 },
				{ x: -3, y: 9 },
				{ x: -2, y: 4 },
				{ x: -1, y: 1 },
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
				{ x: 2, y: 4 },
				{ x: 3, y: 9 },
				{ x: 4, y: 16 },
				{ x: 5, y: 25 }
			],
			color: "red",
			style: "solid"
		}
		const result = schema.safeParse(validData)
		expect(result.success).toBe(true)
	})
})
