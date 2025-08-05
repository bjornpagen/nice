import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"

// Import all generators and error constants
import { ErrInvalidRange as ErrAVNLInvalidRange, generateAbsoluteValueNumberLine } from "./absolute-value-number-line"
import { ErrInvalidDimensions as ErrBarChartInvalidDimensions, generateBarChart } from "./bar-chart"
import { ErrInvalidRange as ErrBoxPlotInvalidRange, generateBoxPlot } from "./box-plot"
import { generateCompositeShapeDiagram } from "./composite-shape-diagram"
import {
	ErrInvalidDimensions as ErrCoordinatePlaneInvalidDimensions,
	generateCoordinatePlane
} from "./coordinate-plane"
import { generateDataTable } from "./data-table"
import { generateDiscreteObjectRatioDiagram } from "./discrete-object-ratio-diagram"
import { ErrInvalidDimensions as ErrDotPlotInvalidDimensions, generateDotPlot } from "./dot-plot"
import { generateDoubleNumberLine } from "./double-number-line"
import { generateGeometricSolidDiagram } from "./geometric-solid-diagram"
import { generateHangerDiagram } from "./hanger-diagram"
import { generateHistogram } from "./histogram"
import { generateInequalityNumberLine } from "./inequality-number-line"
import { generateNumberLine } from "./number-line"
import { generateNumberLineForOpposites } from "./number-line-for-opposites"
import { generateNumberLineWithAction } from "./number-line-with-action"
import { generateNumberLineWithFractionGroups } from "./number-line-with-fraction-groups"
import { generateNumberSetDiagram } from "./number-set-diagram"
import { generateParallelLinesTransversal } from "./parallel-lines-transversal"
import { generatePartitionedShape } from "./partitioned-shape"
import { generatePictograph } from "./pictograph"
import { generatePolyhedronDiagram } from "./polyhedron-diagram"
import { ErrInvalidBaseShape, generatePolyhedronNetDiagram } from "./polyhedron-net-diagram"
import { generatePythagoreanProofDiagram } from "./pythagorean-proof-diagram"
import { generateScatterPlot } from "./scatter-plot"
import { generateStackedItemsDiagram } from "./stacked-items-diagram"
import { generateTapeDiagram } from "./tape-diagram"
import { generateUnitBlockDiagram } from "./unit-block-diagram"
import { generateVennDiagram } from "./venn-diagram"
import { generateVerticalArithmeticSetup } from "./vertical-arithmetic-setup"

describe("Widget Generators", () => {
	describe("generateAbsoluteValueNumberLine", () => {
		test("should render with minimal props", () => {
			const props = {
				type: "absoluteValueNumberLine" as const,
				width: 500,
				height: 80,
				min: -10,
				max: 10,
				tickInterval: 5,
				value: -7,
				highlightColor: "#ff6b6b",
				showDistanceLabel: true
			}
			expect(generateAbsoluteValueNumberLine(props)).toMatchSnapshot()
		})

		test("should render with all props specified", () => {
			const props = {
				type: "absoluteValueNumberLine" as const,
				width: 600,
				height: 100,
				min: -20,
				max: 20,
				tickInterval: 10,
				value: 15,
				highlightColor: "blue",
				showDistanceLabel: false
			}
			expect(generateAbsoluteValueNumberLine(props)).toMatchSnapshot()
		})

		test("should handle error case where min >= max", () => {
			const props = {
				type: "absoluteValueNumberLine" as const,
				width: 500,
				height: 80,
				min: 10,
				max: -10,
				tickInterval: 1,
				value: 5,
				highlightColor: "#ff6b6b",
				showDistanceLabel: true
			}
			const result = errors.trySync(() => generateAbsoluteValueNumberLine(props))
			if (result.error) {
				expect(errors.is(result.error, ErrAVNLInvalidRange)).toBe(true)
				expect(result.error.message).toMatchSnapshot()
			} else {
				throw errors.new("expected an error to be thrown")
			}
		})
	})

	describe("generateBarChart", () => {
		test("should render with minimal props", () => {
			const props = {
				type: "barChart" as const,
				width: 400,
				height: 300,
				title: null,
				xAxisLabel: null,
				yAxis: {
					min: 0,
					max: null,
					tickInterval: 10,
					label: null
				},
				data: [
					{ label: "A", value: 25, state: "normal" as const },
					{ label: "B", value: 42, state: "unknown" as const }
				],
				barColor: "#4285f4"
			}
			expect(generateBarChart(props)).toMatchSnapshot()
		})

		test("should render with all props specified", () => {
			const props = {
				type: "barChart" as const,
				width: 500,
				height: 350,
				title: "Puppet Count",
				xAxisLabel: "Puppeteer",
				yAxis: {
					label: "Number of Puppets",
					min: 0,
					max: 100,
					tickInterval: 20
				},
				data: [
					{ label: "Glenda", value: 80, state: "normal" as const },
					{ label: "Bartholomew", value: 55, state: "normal" as const },
					{ label: "Xylia", value: 95, state: "unknown" as const }
				],
				barColor: "purple"
			}
			expect(generateBarChart(props)).toMatchSnapshot()
		})

		test("should handle empty data array", () => {
			const props = {
				type: "barChart" as const,
				width: 400,
				height: 300,
				title: null,
				xAxisLabel: null,
				yAxis: {
					min: 0,
					max: null,
					tickInterval: 10,
					label: null
				},
				data: [],
				barColor: "#4285f4"
			}
			const result = errors.trySync(() => generateBarChart(props))
			if (result.error) {
				expect(errors.is(result.error, ErrBarChartInvalidDimensions)).toBe(true)
				expect(result.error.message).toMatchSnapshot()
			} else {
				throw errors.new("expected an error to be thrown")
			}
		})
	})

	describe("generateBoxPlot", () => {
		test("should render with minimal props", () => {
			const props = {
				type: "boxPlot" as const,
				width: 400,
				height: 150,
				axis: {
					min: 0,
					max: 100,
					label: null,
					tickLabels: null
				},
				summary: { min: 10, q1: 25, median: 50, q3: 75, max: 95 },
				boxColor: "#e0e0e0",
				medianColor: "#333333"
			}
			expect(generateBoxPlot(props)).toMatchSnapshot()
		})

		test("should render with all props specified", () => {
			const props = {
				type: "boxPlot" as const,
				width: 500,
				height: 150,
				axis: {
					min: 0,
					max: 100,
					label: "Number of cookies",
					tickLabels: [0, 20, 40, 60, 80, 100]
				},
				summary: { min: 5, q1: 30, median: 45, q3: 80, max: 100 },
				boxColor: "#fada5e",
				medianColor: "#d9534f"
			}
			expect(generateBoxPlot(props)).toMatchSnapshot()
		})

		test("should handle error case where axis.min >= axis.max", () => {
			const props = {
				type: "boxPlot" as const,
				width: 400,
				height: 150,
				axis: {
					min: 100,
					max: 0,
					label: null,
					tickLabels: null
				},
				summary: { min: 10, q1: 25, median: 50, q3: 75, max: 95 },
				boxColor: "#e0e0e0",
				medianColor: "#333333"
			}
			const result = errors.trySync(() => generateBoxPlot(props))
			if (result.error) {
				expect(errors.is(result.error, ErrBoxPlotInvalidRange)).toBe(true)
				expect(result.error.message).toMatchSnapshot()
			} else {
				throw errors.new("expected an error to be thrown")
			}
		})

		test("should render with custom colors", () => {
			const props = {
				type: "boxPlot" as const,
				width: 400,
				height: 150,
				axis: {
					min: 0,
					max: 50,
					label: null,
					tickLabels: null
				},
				summary: { min: 5, q1: 15, median: 25, q3: 35, max: 45 },
				boxColor: "#90EE90",
				medianColor: "#FF1493"
			}
			expect(generateBoxPlot(props)).toMatchSnapshot()
		})

		test("should have sufficient padding for long axis labels", () => {
			const props = {
				type: "boxPlot" as const,
				width: 400,
				height: 150,
				axis: {
					min: 0,
					max: 100,
					label: "A very long and descriptive label for the horizontal axis to test spacing",
					tickLabels: [0, 20, 40, 60, 80, 100]
				},
				summary: { min: 5, q1: 30, median: 45, q3: 80, max: 100 },
				boxColor: "#e0e0e0",
				medianColor: "#333333"
			}
			expect(generateBoxPlot(props)).toMatchSnapshot()
		})
	})

	describe("generateCompositeShapeDiagram", () => {
		test("should render an L-shape with all features", () => {
			const props = {
				type: "compositeShapeDiagram" as const,
				width: 350,
				height: 300,
				vertices: [
					{ x: 0, y: 0 },
					{ x: 100, y: 0 },
					{ x: 100, y: 40 },
					{ x: 40, y: 40 },
					{ x: 40, y: 100 },
					{ x: 0, y: 100 }
				],
				outerBoundary: [0, 1, 2, 3, 4, 5],
				internalSegments: [
					{ fromVertexIndex: 3, toVertexIndex: 5, style: "dashed" as const, label: "60 units" },
					{ fromVertexIndex: 3, toVertexIndex: 1, style: "dashed" as const, label: "60 units" }
				],
				regionLabels: [
					{ text: "A", position: { x: 20, y: 50 } },
					{ text: "B", position: { x: 70, y: 20 } }
				],
				rightAngleMarkers: [
					{ cornerVertexIndex: 0, adjacentVertex1Index: 5, adjacentVertex2Index: 1 },
					{ cornerVertexIndex: 2, adjacentVertex1Index: 1, adjacentVertex2Index: 3 }
				]
			}
			expect(generateCompositeShapeDiagram(props)).toMatchSnapshot()
		})
	})

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
			expect(generateCoordinatePlane(props)).toMatchSnapshot()
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
			const result = errors.trySync(() => generateCoordinatePlane(props))
			if (result.error) {
				expect(errors.is(result.error, ErrCoordinatePlaneInvalidDimensions)).toBe(true)
				expect(result.error.message).toMatchSnapshot()
			} else {
				throw errors.new("expected an error to be thrown")
			}
		})
	})

	describe("generateDataTable", () => {
		test("should render a table with all features", () => {
			const props = {
				type: "dataTable" as const,
				title: "Student Scores",
				columns: [
					{ key: "name", label: "Name", isNumeric: false },
					{ key: "score", label: "Score", isNumeric: true },
					{ key: "notes", label: "Notes", isNumeric: false }
				],
				rowHeaderKey: "name",
				data: [
					["Class A", 1600, "Excellent"],
					["Alice", 85, "Good"],
					["Bob", { type: "input" as const, responseIdentifier: "BOB_SCORE", expectedLength: 3 }, "Needs improvement"]
				],
				footer: ["Total", { type: "input" as const, responseIdentifier: "TOTAL", expectedLength: 5 }, "Summary"]
			}
			expect(generateDataTable(props)).toMatchSnapshot()
		})
	})

	describe("generateDiscreteObjectRatioDiagram", () => {
		test("should render a grid layout", () => {
			const props = {
				type: "discreteObjectRatioDiagram" as const,
				width: 400,
				height: 300,
				objects: [
					{ count: 5, emoji: "⭐" },
					{ count: 3, emoji: "🍎" }
				],
				layout: "grid" as const,
				title: "Shapes"
			}
			expect(generateDiscreteObjectRatioDiagram(props)).toMatchSnapshot()
		})

		test("should render a cluster layout", () => {
			const props = {
				type: "discreteObjectRatioDiagram" as const,
				width: 400,
				height: 300,
				objects: [
					{ count: 6, emoji: "🐶" },
					{ count: 4, emoji: "🍎" }
				],
				layout: "cluster" as const,
				title: null
			}
			expect(generateDiscreteObjectRatioDiagram(props)).toMatchSnapshot()
		})

		test("should wrap to new row in grid layout when exceeding width", () => {
			const props = {
				type: "discreteObjectRatioDiagram" as const,
				width: 200,
				height: 300,
				objects: [
					{ count: 15, emoji: "🍎" },
					{ count: 5, emoji: "⭐" }
				],
				layout: "grid" as const,
				title: null
			}
			expect(generateDiscreteObjectRatioDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateDotPlot", () => {
		test("should render a basic dot plot", () => {
			const props = {
				type: "dotPlot" as const,
				width: 500,
				height: 300,
				axis: { label: "Number of Pets", min: 0, max: 5, tickInterval: 1 },
				data: [
					{ value: 0, count: 2 },
					{ value: 1, count: 5 },
					{ value: 2, count: 3 },
					{ value: 4, count: 1 }
				],
				dotColor: "teal",
				dotRadius: 6
			}
			expect(generateDotPlot(props)).toMatchSnapshot()
		})

		test("should handle error case with invalid dimensions", () => {
			const props = {
				type: "dotPlot" as const,
				width: 50,
				height: 20,
				axis: { min: 10, max: 0, tickInterval: 1, label: null },
				data: [],
				dotColor: "blue",
				dotRadius: 3
			}
			const result = errors.trySync(() => generateDotPlot(props))
			if (result.error) {
				expect(errors.is(result.error, ErrDotPlotInvalidDimensions)).toBe(true)
				expect(result.error.message).toMatchSnapshot()
			} else {
				throw errors.new("expected an error to be thrown")
			}
		})
	})

	describe("generateDoubleNumberLine", () => {
		test("should render a double number line for ratios", () => {
			const props = {
				type: "doubleNumberLine" as const,
				width: 500,
				height: 150,
				topLine: {
					label: "Miles",
					ticks: [0, 60, 120, 180]
				},
				bottomLine: {
					label: "Hours",
					ticks: [0, 1, 2, "?"]
				}
			}
			expect(generateDoubleNumberLine(props)).toMatchSnapshot()
		})

		test("should handle minimal props", () => {
			const props = {
				type: "doubleNumberLine" as const,
				width: 400,
				height: 150,
				topLine: {
					label: "Top",
					ticks: [0, 5, 10]
				},
				bottomLine: {
					label: "Bottom",
					ticks: [0, 1, 2]
				}
			}
			expect(generateDoubleNumberLine(props)).toMatchSnapshot()
		})
	})

	describe("generateGeometricSolidDiagram", () => {
		test("should render a labeled cylinder", () => {
			const props = {
				type: "geometricSolidDiagram" as const,
				width: 200,
				height: 250,
				shape: { type: "cylinder" as const, radius: 5, height: 10 },
				labels: [
					{ target: "radius" as const, text: "r = 5" },
					{ target: "height" as const, text: "h = 10" }
				]
			}
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})

		test("should render cylinder without labels", () => {
			const props = {
				type: "geometricSolidDiagram" as const,
				width: 200,
				height: 250,
				shape: { type: "cylinder" as const, radius: 8, height: 15 },
				labels: null
			}
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})

		test("should render cone shape", () => {
			const props = {
				type: "geometricSolidDiagram" as const,
				width: 200,
				height: 250,
				shape: { type: "cone" as const, radius: 6, height: 12 },
				labels: null
			}
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})

		test("should render cone with labels", () => {
			const props = {
				type: "geometricSolidDiagram" as const,
				width: 200,
				height: 250,
				shape: { type: "cone" as const, radius: 5, height: 8 },
				labels: [
					{ target: "radius" as const, text: "r = 5" },
					{ target: "height" as const, text: "h = 8" }
				]
			}
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})

		test("should render sphere without labels", () => {
			const props = {
				type: "geometricSolidDiagram" as const,
				width: 200,
				height: 200,
				shape: { type: "sphere" as const, radius: 7 },
				labels: []
			}
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})

		test("should render sphere with radius label", () => {
			const props = {
				type: "geometricSolidDiagram" as const,
				width: 200,
				height: 200,
				shape: { type: "sphere" as const, radius: 6 },
				labels: [{ target: "radius" as const, text: "r = 6" }]
			}
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateHangerDiagram", () => {
		test("should render a complex hanger diagram", () => {
			const props = {
				type: "hangerDiagram" as const,
				width: 400,
				height: 300,
				leftSide: [
					{ label: "x", shape: "square" as const, color: "#fada5e" },
					{ label: "x", shape: "square" as const, color: "#fada5e" },
					{ label: 5, shape: "circle" as const, color: "#4ecdc4" }
				],
				rightSide: [{ label: 17, shape: "pentagon" as const, color: "#95e1d3" }]
			}
			expect(generateHangerDiagram(props)).toMatchSnapshot()
		})

		test("should render hanger with triangles", () => {
			const props = {
				type: "hangerDiagram" as const,
				width: 350,
				height: 250,
				leftSide: [
					{ label: 3, shape: "triangle" as const, color: "#ff6b6b" },
					{ label: 3, shape: "triangle" as const, color: "#ff6b6b" }
				],
				rightSide: [{ label: "y", shape: "triangle" as const, color: "#4ecdc4" }]
			}
			expect(generateHangerDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateHistogram", () => {
		test("should render a histogram with all features", () => {
			const props = {
				type: "histogram" as const,
				width: 500,
				height: 350,
				title: "Exam Scores",
				xAxis: { label: "Score Range", max: null, tickInterval: null },
				yAxis: { label: "Frequency", max: 15, tickInterval: 5 },
				bins: [
					{ label: "50-60", frequency: 2 },
					{ label: "60-70", frequency: 5 },
					{ label: "70-80", frequency: 12 },
					{ label: "80-90", frequency: 8 },
					{ label: "90-100", frequency: 3 }
				]
			}
			expect(generateHistogram(props)).toMatchSnapshot()
		})

		test("should handle error case with invalid dimensions", () => {
			const props = {
				type: "histogram" as const,
				width: 50,
				height: 50,
				title: null,
				xAxis: { label: "X", max: null, tickInterval: null },
				yAxis: { label: "Y", max: null, tickInterval: null },
				bins: []
			}
			expect(generateHistogram(props)).toMatchSnapshot()
		})

		test("should handle histogram without title or custom y-axis settings", () => {
			const props = {
				type: "histogram" as const,
				width: 400,
				height: 300,
				title: null,
				xAxis: { label: "Values", max: null, tickInterval: null },
				yAxis: { label: "Count", max: null, tickInterval: null },
				bins: [
					{ label: "A", frequency: 10 },
					{ label: "B", frequency: 5 }
				]
			}
			expect(generateHistogram(props)).toMatchSnapshot()
		})
	})

	describe("generateInequalityNumberLine", () => {
		test("should render a simple inequality (x > 5)", () => {
			const props = {
				type: "inequalityNumberLine" as const,
				width: 500,
				height: 80,
				min: 0,
				max: 10,
				tickInterval: 1,
				ranges: [{ start: { value: 5, type: "open" as const }, color: "blue", end: null }]
			}
			expect(generateInequalityNumberLine(props)).toMatchSnapshot()
		})

		test("should render a compound 'and' inequality (-2 <= x < 3)", () => {
			const props = {
				type: "inequalityNumberLine" as const,
				width: 500,
				height: 80,
				min: -5,
				max: 5,
				tickInterval: 1,
				ranges: [
					{
						start: { value: -2, type: "closed" as const },
						end: { value: 3, type: "open" as const },
						color: "purple"
					}
				]
			}
			expect(generateInequalityNumberLine(props)).toMatchSnapshot()
		})

		test("should render a compound 'or' inequality (x < -1 or x >= 4)", () => {
			const props = {
				type: "inequalityNumberLine" as const,
				width: 500,
				height: 80,
				min: -5,
				max: 5,
				tickInterval: 1,
				ranges: [
					{ end: { value: -1, type: "open" as const }, color: "red", start: null },
					{ start: { value: 4, type: "closed" as const }, color: "red", end: null }
				]
			}
			expect(generateInequalityNumberLine(props)).toMatchSnapshot()
		})
	})

	describe("generateNumberLine", () => {
		test("should render a horizontal number line with all features", () => {
			const props = {
				type: "numberLine" as const,
				width: 600,
				height: 100,
				orientation: "horizontal" as const,
				min: -10,
				max: 10,
				majorTickInterval: 5,
				minorTicksPerInterval: 4,
				points: [
					{ value: -7, label: "A", color: "red", labelPosition: "above" as const },
					{ value: 2.5, label: "B", color: "blue", labelPosition: "below" as const }
				],
				specialTickLabels: [{ value: 0, label: "Origin" }]
			}
			expect(generateNumberLine(props)).toMatchSnapshot()
		})

		test("should render a vertical number line", () => {
			const props = {
				type: "numberLine" as const,
				width: 100,
				height: 400,
				orientation: "vertical" as const,
				min: 0,
				max: 100,
				majorTickInterval: 25,
				minorTicksPerInterval: 1,
				points: [{ value: 30, label: "Low", color: "green", labelPosition: "right" as const }],
				specialTickLabels: []
			}
			expect(generateNumberLine(props)).toMatchSnapshot()
		})

		test("should render horizontal number line with left/right point labels", () => {
			const props = {
				type: "numberLine" as const,
				width: 500,
				height: 100,
				orientation: "horizontal" as const,
				min: 0,
				max: 20,
				majorTickInterval: 5,
				minorTicksPerInterval: 4,
				points: [
					{ value: 5, label: "Left", color: "red", labelPosition: "left" as const },
					{ value: 15, label: "Right", color: "blue", labelPosition: "right" as const }
				],
				specialTickLabels: []
			}
			expect(generateNumberLine(props)).toMatchSnapshot()
		})

		test("should render vertical number line with special labels and left-positioned points", () => {
			const props = {
				type: "numberLine" as const,
				width: 100,
				height: 300,
				orientation: "vertical" as const,
				min: -50,
				max: 50,
				majorTickInterval: 25,
				minorTicksPerInterval: 4,
				specialTickLabels: [
					{ value: 0, label: "Zero" },
					{ value: -25, label: "Cold" },
					{ value: 25, label: "Warm" }
				],
				points: [
					{ value: -30, label: "Freezing", color: "lightblue", labelPosition: "left" as const },
					{ value: 40, label: "Hot", color: "red", labelPosition: "above" as const }
				]
			}
			expect(generateNumberLine(props)).toMatchSnapshot()
		})
	})

	describe("generateNumberLineForOpposites", () => {
		test("should render opposites with custom labels", () => {
			const props = {
				type: "numberLineForOpposites" as const,
				width: 500,
				height: 100,
				maxAbsValue: 10,
				tickInterval: 2,
				value: 7,
				positiveLabel: "7",
				negativeLabel: "?",
				showArrows: true
			}
			expect(generateNumberLineForOpposites(props)).toMatchSnapshot()
		})
	})

	describe("generateNumberLineWithAction", () => {
		test("should render a vertical thermometer with action", () => {
			const props = {
				type: "numberLineWithAction" as const,
				width: 100,
				height: 400,
				orientation: "vertical" as const,
				min: -20,
				max: 20,
				tickInterval: 10,
				customLabels: [
					{ value: -11, text: "-11°C" },
					{ value: 13, text: "?°C" }
				],
				action: { startValue: -11, change: 24, label: "+24°C" }
			}
			expect(generateNumberLineWithAction(props)).toMatchSnapshot()
		})

		test("should render a horizontal number line with action", () => {
			const props = {
				type: "numberLineWithAction" as const,
				width: 500,
				height: 100,
				orientation: "horizontal" as const,
				min: 0,
				max: 50,
				tickInterval: 10,
				customLabels: [
					{ value: 15, text: "Start" },
					{ value: 35, text: "End" }
				],
				action: { startValue: 15, change: 20, label: "+20" }
			}
			expect(generateNumberLineWithAction(props)).toMatchSnapshot()
		})

		test("should handle error case where min >= max", () => {
			const props = {
				type: "numberLineWithAction" as const,
				width: 500,
				height: 100,
				orientation: "horizontal" as const,
				min: 50,
				max: 0,
				tickInterval: 10,
				customLabels: [],
				action: { startValue: 10, change: 5, label: "+5" }
			}
			expect(generateNumberLineWithAction(props)).toMatchSnapshot()
		})
	})

	describe("generateNumberLineWithFractionGroups", () => {
		test("should render fraction groups on a number line", () => {
			const props = {
				type: "numberLineWithFractionGroups" as const,
				width: 500,
				height: 150,
				min: 0,
				max: 2,
				ticks: [
					{ value: 0, label: "0", isMajor: true },
					{ value: 0.375, label: "3/8", isMajor: false },
					{ value: 1, label: "1", isMajor: true },
					{ value: 2, label: "2", isMajor: true }
				],
				segments: [
					{ start: 0, end: 0.375, color: "teal", label: "1 group" },
					{ start: 0.375, end: 0.75, color: "orange", label: "2 groups" }
				]
			}
			expect(generateNumberLineWithFractionGroups(props)).toMatchSnapshot()
		})
	})

	describe("generateNumberSetDiagram", () => {
		test("should render the number set diagram", () => {
			const props = {
				type: "numberSetDiagram" as const,
				width: 600,
				height: 400,
				sets: {
					whole: { label: "Whole", color: "#E8F0FE" },
					integer: { label: "Integer", color: "#D2E3FC" },
					rational: { label: "Rational", color: "#AECBFA" },
					irrational: { label: "Irrational", color: "#FAD2CF" }
				}
			}
			expect(generateNumberSetDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateParallelLinesTransversal", () => {
		test("should render with labels and rotations", () => {
			const props = {
				type: "parallelLinesTransversal" as const,
				width: 400,
				height: 350,
				linesAngle: 20,
				transversalAngle: 80,
				labels: [
					{ intersection: "top" as const, position: "topLeft" as const, label: "120°", color: "red" },
					{ intersection: "bottom" as const, position: "bottomRight" as const, label: "x", color: "blue" }
				]
			}
			expect(generateParallelLinesTransversal(props)).toMatchSnapshot()
		})
	})

	describe("generatePartitionedShape", () => {
		test("should render multiple shapes to show > 100%", () => {
			const props = {
				type: "partitionedShape" as const,
				width: 400,
				height: 200,
				shapes: [
					{ type: "rectangle" as const, totalParts: 4, shadedParts: 4, rows: 2, columns: 2, shadeColor: "#4285f4" },
					{
						type: "rectangle" as const,
						totalParts: 4,
						shadedParts: 1,
						rows: 2,
						columns: 2,
						shadeColor: "purple"
					}
				],
				layout: "horizontal" as const
			}
			expect(generatePartitionedShape(props)).toMatchSnapshot()
		})

		test("should render a partitioned circle", () => {
			const props = {
				type: "partitionedShape" as const,
				width: 300,
				height: 300,
				layout: "horizontal" as const,
				shapes: [
					{ type: "circle" as const, totalParts: 8, shadedParts: 3, rows: 1, columns: null, shadeColor: "#4285f4" }
				]
			}
			expect(generatePartitionedShape(props)).toMatchSnapshot()
		})
	})

	describe("generatePictograph", () => {
		test("should render a full pictograph", () => {
			const props = {
				type: "pictograph" as const,
				title: "Home Runs Hit",
				key: { icon: "⚾", label: "= 1 home run" },
				data: [
					{ category: "Lancers", iconCount: 5 },
					{ category: "Gladiators", iconCount: 3 },
					{ category: "Knights", iconCount: 6 }
				]
			}
			expect(generatePictograph(props)).toMatchSnapshot()
		})
	})

	describe("generatePolyhedronDiagram", () => {
		test("should render a labeled rectangular prism", () => {
			const props = {
				type: "polyhedronDiagram" as const,
				width: 400,
				height: 300,
				shape: { type: "rectangularPrism" as const, length: 10, width: 8, height: 6 },
				labels: [
					{ text: "10 cm", target: "length" as const },
					{ text: "8 cm", target: "width" as const },
					{ text: "6 cm", target: "height" as const }
				],
				shadedFace: "top_face",
				showHiddenEdges: true
			}
			expect(generatePolyhedronDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generatePolyhedronNetDiagram", () => {
		test("should render a labeled cube net", () => {
			const props = {
				type: "polyhedronNetDiagram" as const,
				width: 400,
				height: 300,
				polyhedronType: "cube" as const,
				dimensions: {
					base: { type: "square" as const, side: 5 },
					lateralHeight: null
				},
				showLabels: true
			}
			expect(generatePolyhedronNetDiagram(props)).toMatchSnapshot()
		})

		test("should handle error case for cube with non-square base", () => {
			const props = {
				type: "polyhedronNetDiagram" as const,
				width: 400,
				height: 300,
				polyhedronType: "cube" as const,
				dimensions: {
					base: { type: "rectangle" as const, length: 5, width: 3 },
					lateralHeight: null
				},
				showLabels: false
			}
			const result = errors.trySync(() => generatePolyhedronNetDiagram(props))
			if (result.error) {
				expect(errors.is(result.error, ErrInvalidBaseShape)).toBe(true)
				expect(result.error.message).toMatchSnapshot()
			} else {
				throw errors.new("expected an error to be thrown")
			}
		})
	})

	describe("generatePythagoreanProofDiagram", () => {
		test("should render a 3-4-5 pythagorean proof diagram", () => {
			const props = {
				type: "pythagoreanProofDiagram" as const,
				width: 400,
				height: 400,
				squareA: { area: 9, sideLabel: "a" },
				squareB: { area: 16, sideLabel: "b" },
				squareC: { area: 25, sideLabel: "c" }
			}
			expect(generatePythagoreanProofDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateScatterPlot", () => {
		test("should render a scatter plot with linear and quadratic trend lines", () => {
			const props = {
				type: "scatterPlot" as const,
				width: 500,
				height: 400,
				title: "Data Trends",
				xAxis: { label: "Time", min: 0, max: 10, tickInterval: 2, gridLines: true },
				yAxis: { label: "Value", min: 0, max: 100, tickInterval: 20, gridLines: false },
				points: [
					{ x: 1, y: 10, label: null },
					{ x: 2, y: 25, label: null },
					{ x: 5, y: 40, label: null },
					{ x: 8, y: 90, label: null },
					{ x: 9, y: 85, label: null }
				],
				trendLines: [
					{
						id: "l1",
						data: { type: "linear" as const, slope: 8, yIntercept: 5 },
						color: "red",
						style: "dashed" as const,
						label: "Linear Trend"
					},
					{
						id: "q1",
						data: { type: "quadratic" as const, a: 1, b: 2, c: 5 },
						color: "green",
						style: "solid" as const,
						label: "Quadratic Trend"
					}
				]
			}
			expect(generateScatterPlot(props)).toMatchSnapshot()
		})

		test("should render with both x and y grid lines", () => {
			const props = {
				type: "scatterPlot" as const,
				width: 400,
				height: 300,
				title: null,
				xAxis: { label: "X", min: 0, max: 10, tickInterval: 2, gridLines: true },
				yAxis: { label: "Y", min: 0, max: 50, tickInterval: 10, gridLines: true },
				points: [
					{ x: 2, y: 10, label: "A" },
					{ x: 5, y: 25, label: null },
					{ x: 8, y: 40, label: "B" }
				],
				trendLines: null
			}
			expect(generateScatterPlot(props)).toMatchSnapshot()
		})

		test("should handle error case with invalid dimensions", () => {
			const props = {
				type: "scatterPlot" as const,
				width: 50,
				height: 50,
				title: null,
				xAxis: { label: "X", min: 10, max: 0, tickInterval: 1, gridLines: false },
				yAxis: { label: "Y", min: 0, max: 10, tickInterval: 2, gridLines: false },
				points: [],
				trendLines: null
			}
			expect(generateScatterPlot(props)).toMatchSnapshot()
		})
	})

	describe("generateStackedItemsDiagram", () => {
		test("should render a vertical stack of items", () => {
			const props = {
				type: "stackedItemsDiagram" as const,
				width: 100,
				height: 250,
				altText: "An ice cream cone with 3 scoops.",
				baseItem: {
					emoji: "🍦",
					size: 40,
					label: "ice cream cone"
				},
				stackedItem: {
					emoji: "🍨",
					size: 32,
					label: "scoop of ice cream"
				},
				count: 3,
				orientation: "vertical" as const,
				overlap: 0.6
			}
			expect(generateStackedItemsDiagram(props)).toMatchSnapshot()
		})

		test("should render a horizontal stack of items", () => {
			const props = {
				type: "stackedItemsDiagram" as const,
				width: 300,
				height: 100,
				altText: "A row of 4 coins",
				baseItem: {
					emoji: "🪙",
					size: 32,
					label: "base coin"
				},
				stackedItem: {
					emoji: "🪙",
					size: 32,
					label: "silver coin"
				},
				count: 4,
				orientation: "horizontal" as const,
				overlap: 0.3
			}
			expect(generateStackedItemsDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateTapeDiagram", () => {
		test("should render a full tape diagram with bracket", () => {
			const props = {
				type: "tapeDiagram" as const,
				width: 400,
				height: 200,
				topTape: {
					label: "Boys",
					segments: [
						{ label: "w", length: 1 },
						{ label: "w", length: 1 }
					],
					color: "blue"
				},
				bottomTape: {
					label: "Girls",
					segments: [
						{ label: "w", length: 1 },
						{ label: "w", length: 1 },
						{ label: "w", length: 1 }
					],
					color: "pink"
				},
				showTotalBracket: true,
				totalLabel: "Total: 30 students"
			}
			expect(generateTapeDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateUnitBlockDiagram", () => {
		test("should render multiple hundred blocks", () => {
			const props = {
				type: "unitBlockDiagram" as const,
				totalBlocks: 8,
				shadedUnitsPerBlock: 1,
				blocksPerRow: 4,
				shadeColor: "green",
				blockWidth: 80,
				blockHeight: 80
			}
			expect(generateUnitBlockDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateVennDiagram", () => {
		test("should render a complete Venn diagram", () => {
			const props = {
				type: "vennDiagram" as const,
				width: 400,
				height: 300,
				circleA: { label: "Have a Dog", count: 12, color: "rgba(217, 95, 79, 0.5)" },
				circleB: { label: "Have a Cat", count: 8, color: "rgba(66, 133, 244, 0.5)" },
				intersectionCount: 5,
				outsideCount: 3
			}
			expect(generateVennDiagram(props)).toMatchSnapshot()
		})

		test("should render with custom dimensions", () => {
			const props = {
				type: "vennDiagram" as const,
				width: 500,
				height: 400,
				circleA: { label: "Group A", count: 15, color: "rgba(255, 182, 193, 0.5)" },
				circleB: { label: "Group B", count: 20, color: "rgba(173, 216, 230, 0.5)" },
				intersectionCount: 8,
				outsideCount: 5
			}
			expect(generateVennDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateVerticalArithmeticSetup", () => {
		test("should render a multiplication problem", () => {
			const props = {
				type: "verticalArithmeticSetup" as const,
				title: "Calculate the product:",
				operand1: "1.84",
				operand2: "7.2",
				operator: "×" as const
			}
			expect(generateVerticalArithmeticSetup(props)).toMatchSnapshot()
		})

		test("should render an addition problem", () => {
			const props = {
				type: "verticalArithmeticSetup" as const,
				title: null,
				operand1: "503",
				operand2: "29",
				operator: "+" as const
			}
			expect(generateVerticalArithmeticSetup(props)).toMatchSnapshot()
		})
	})
})
