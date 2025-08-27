import { expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { PolygonGraphPropsSchema, generatePolygonGraph } from "@/lib/widgets/generators"

type PolygonGraphInput = z.input<typeof PolygonGraphPropsSchema>

test("polygon graph - house-shaped pentagon with labeled vertices", () => {
	const input = {
		type: "polygonGraph",
		width: 500,
		height: 500,
		xAxis: {
			label: "X-axis",
			min: -10,
			max: 10,
			tickInterval: 2,
			showGridLines: true
		},
		yAxis: {
			label: "Y-axis",
			min: -10,
			max: 10,
			tickInterval: 2,
			showGridLines: true
		},
		showQuadrantLabels: true,
		points: [
			{
				id: "A",
				x: -4,
				y: -2,
				label: "A",
				color: "#000000",
				style: "closed"
			},
			{
				id: "B",
				x: 4,
				y: -2,
				label: "B",
				color: "#000000",
				style: "closed"
			},
			{
				id: "C",
				x: 4,
				y: 3,
				label: "C",
				color: "#000000",
				style: "closed"
			},
			{
				id: "D",
				x: 0,
				y: 6,
				label: "D",
				color: "#000000",
				style: "closed"
			},
			{
				id: "E",
				x: -4,
				y: 3,
				label: "E",
				color: "#000000",
				style: "closed"
			}
		],
		polygons: [
			{
				vertices: ["A", "B", "C", "D", "E"],
				isClosed: true,
				fillColor: "#6495ED66",
				strokeColor: "#003366",
				label: "Pentagon ABCDE"
			}
		]
	} satisfies PolygonGraphInput

	// Validate the input
	const parseResult = errors.trySync(() => PolygonGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data

	// Generate the SVG
	const svg = generatePolygonGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})

test("polygon graph - multiple shapes with shared vertices", () => {
	const input = {
		type: "polygonGraph",
		width: 600,
		height: 600,
		xAxis: {
			label: "x",
			min: -8,
			max: 8,
			tickInterval: 2,
			showGridLines: false
		},
		yAxis: {
			label: "y",
			min: -8,
			max: 8,
			tickInterval: 2,
			showGridLines: false
		},
		showQuadrantLabels: false,
		points: [
			// Triangle vertices
			{ id: "P1", x: -6, y: -4, label: "P1", color: "#FF0000", style: "closed" },
			{ id: "P2", x: -2, y: -4, label: "P2", color: "#FF0000", style: "closed" },
			{ id: "P3", x: -4, y: -1, label: "P3", color: "#FF0000", style: "closed" },
			// Rectangle vertices (P2 is shared)
			{ id: "P4", x: 2, y: -4, label: "P4", color: "#0000FF", style: "closed" },
			{ id: "P5", x: 2, y: 2, label: "P5", color: "#0000FF", style: "closed" },
			{ id: "P6", x: -2, y: 2, label: "P6", color: "#0000FF", style: "closed" },
			// Pentagon vertices
			{ id: "Q1", x: -3, y: 4, label: "Q1", color: "#00FF00", style: "closed" },
			{ id: "Q2", x: 0, y: 6, label: "Q2", color: "#00FF00", style: "closed" },
			{ id: "Q3", x: 3, y: 4, label: "Q3", color: "#00FF00", style: "closed" },
			{ id: "Q4", x: 2, y: 3, label: "Q4", color: "#00FF00", style: "closed" },
			{ id: "Q5", x: -2, y: 3, label: "Q5", color: "#00FF00", style: "closed" }
		],
		polygons: [
			{
				vertices: ["P1", "P2", "P3"],
				isClosed: true,
				fillColor: "#FF00004D",
				strokeColor: "#FF0000",
				label: "Triangle"
			},
			{
				vertices: ["P2", "P4", "P5", "P6"],
				isClosed: true,
				fillColor: "#0000FF4D",
				strokeColor: "#0000FF",
				label: "Rectangle"
			},
			{
				vertices: ["Q1", "Q2", "Q3", "Q4", "Q5"],
				isClosed: true,
				fillColor: "#00FF004D",
				strokeColor: "#00FF00",
				label: "Pentagon"
			}
		]
	} satisfies PolygonGraphInput

	// Validate the input
	const parseResult = errors.trySync(() => PolygonGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data

	// Generate the SVG
	const svg = generatePolygonGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})

test("polygon graph - open polyline with standalone points", () => {
	const input = {
		type: "polygonGraph",
		width: 400,
		height: 400,
		xAxis: {
			label: "",
			min: -5,
			max: 5,
			tickInterval: 1,
			showGridLines: true
		},
		yAxis: {
			label: "",
			min: -5,
			max: 5,
			tickInterval: 1,
			showGridLines: true
		},
		showQuadrantLabels: true,
		points: [
			// Points for the polyline
			{ id: "start", x: -3, y: 2, label: "Start", color: "#800080", style: "closed" },
			{ id: "mid1", x: -1, y: 3, label: "", color: "#800080", style: "closed" },
			{ id: "mid2", x: 1, y: 1, label: "", color: "#800080", style: "closed" },
			{ id: "end", x: 3, y: 2, label: "End", color: "#800080", style: "closed" },
			// Standalone points
			{ id: "A", x: -2, y: -3, label: "A", color: "#FFA500", style: "open" },
			{ id: "B", x: 0, y: -2, label: "B", color: "#FFA500", style: "open" },
			{ id: "C", x: 2, y: -3, label: "C", color: "#FFA500", style: "open" }
		],
		polygons: [
			{
				vertices: ["start", "mid1", "mid2", "end"],
				isClosed: false,
				fillColor: "#00000000",
				strokeColor: "#800080",
				label: "Path"
			}
		]
	} satisfies PolygonGraphInput

	// Validate the input
	const parseResult = errors.trySync(() => PolygonGraphPropsSchema.parse(input))
	if (parseResult.error) {
		logger.error("input validation", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "input validation")
	}
	const parsed = parseResult.data

	// Generate the SVG
	const svg = generatePolygonGraph(parsed)

	// Snapshot test the generated SVG
	expect(svg).toMatchSnapshot()
})
