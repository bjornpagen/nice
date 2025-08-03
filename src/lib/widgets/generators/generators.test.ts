import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"

// Import all generators and their props schemas
import {
	AbsoluteValueNumberLinePropsSchema,
	ErrInvalidRange as ErrAVNLInvalidRange,
	generateAbsoluteValueNumberLine
} from "./absolute-value-number-line"
import { AdjacentAnglesPropsSchema, ErrMismatchedRaysAndAngles, generateAdjacentAngles } from "./adjacent-angles"
import {
	BarChartPropsSchema,
	ErrInvalidDimensions as ErrBarChartInvalidDimensions,
	generateBarChart
} from "./bar-chart"
import { BoxPlotPropsSchema, ErrInvalidRange as ErrBoxPlotInvalidRange, generateBoxPlot } from "./box-plot"
import { CompositeShapeDiagramPropsSchema, generateCompositeShapeDiagram } from "./composite-shape-diagram"
import {
	CoordinatePlanePropsSchema,
	ErrInvalidDimensions as ErrCoordinatePlaneInvalidDimensions,
	generateCoordinatePlane
} from "./coordinate-plane"
import { DataTablePropsSchema, generateDataTable } from "./data-table"
import {
	DiscreteObjectRatioDiagramPropsSchema,
	generateDiscreteObjectRatioDiagram
} from "./discrete-object-ratio-diagram"
import { DotPlotPropsSchema, ErrInvalidDimensions as ErrDotPlotInvalidDimensions, generateDotPlot } from "./dot-plot"
import { DoubleNumberLinePropsSchema, generateDoubleNumberLine } from "./double-number-line"
import { GeometricSolidDiagramPropsSchema, generateGeometricSolidDiagram } from "./geometric-solid-diagram"
import { generateHangerDiagram, HangerDiagramPropsSchema } from "./hanger-diagram"
import { generateHistogram, HistogramPropsSchema } from "./histogram"
import { generateInequalityNumberLine, InequalityNumberLinePropsSchema } from "./inequality-number-line"
import { generateNumberLine, NumberLinePropsSchema } from "./number-line"
import { generateNumberLineForOpposites, NumberLineForOppositesPropsSchema } from "./number-line-for-opposites"
import { generateNumberLineWithAction, NumberLineWithActionPropsSchema } from "./number-line-with-action"
import {
	generateNumberLineWithFractionGroups,
	NumberLineWithFractionGroupsPropsSchema
} from "./number-line-with-fraction-groups"
import { generateNumberSetDiagram, NumberSetDiagramPropsSchema } from "./number-set-diagram"
import { generateParallelLinesTransversal, ParallelLinesTransversalPropsSchema } from "./parallel-lines-transversal"
import { generatePartitionedShape, PartitionedShapePropsSchema } from "./partitioned-shape"
import { generatePictograph, PictographPropsSchema } from "./pictograph"
import { generatePolyhedronDiagram, PolyhedronDiagramPropsSchema } from "./polyhedron-diagram"
import {
	ErrInvalidBaseShape,
	generatePolyhedronNetDiagram,
	PolyhedronNetDiagramPropsSchema
} from "./polyhedron-net-diagram"
import { generatePythagoreanProofDiagram, PythagoreanProofDiagramPropsSchema } from "./pythagorean-proof-diagram"
import { generateScatterPlot, ScatterPlotPropsSchema } from "./scatter-plot"
import { generateStackedItemsDiagram, StackedItemsDiagramPropsSchema } from "./stacked-items-diagram"
import { generateTapeDiagram, TapeDiagramPropsSchema } from "./tape-diagram"
import { generateUnitBlockDiagram, UnitBlockDiagramPropsSchema } from "./unit-block-diagram"
import { generateVennDiagram, VennDiagramPropsSchema } from "./venn-diagram"
import { generateVerticalArithmeticSetup, VerticalArithmeticSetupPropsSchema } from "./vertical-arithmetic-setup"

describe("Widget Generators", () => {
	describe("generateAbsoluteValueNumberLine", () => {
		test("should render with minimal props", () => {
			const props = AbsoluteValueNumberLinePropsSchema.parse({
				min: -10,
				max: 10,
				tickInterval: 5,
				value: -7
			})
			expect(generateAbsoluteValueNumberLine(props)).toMatchSnapshot()
		})

		test("should render with all props specified", () => {
			const props = AbsoluteValueNumberLinePropsSchema.parse({
				width: 600,
				height: 100,
				min: -20,
				max: 20,
				tickInterval: 10,
				value: 15,
				highlightColor: "blue",
				showDistanceLabel: false
			})
			expect(generateAbsoluteValueNumberLine(props)).toMatchSnapshot()
		})

		test("should handle error case where min >= max", () => {
			const props = AbsoluteValueNumberLinePropsSchema.parse({
				min: 10,
				max: -10,
				tickInterval: 1,
				value: 5
			})
			const result = errors.trySync(() => generateAbsoluteValueNumberLine(props))
			if (result.error) {
				expect(errors.is(result.error, ErrAVNLInvalidRange)).toBe(true)
				expect(result.error.message).toMatchSnapshot()
			} else {
				throw errors.new("expected an error to be thrown")
			}
		})
	})

	describe("generateAdjacentAngles", () => {
		test("should render with minimal props", () => {
			const props = AdjacentAnglesPropsSchema.parse({
				rayLabels: ["B", "C", "D"],
				angles: [
					{ value: 30, label: "30°", color: "red", arcRadius: 40 },
					{ value: 45, label: "45°", color: "blue", arcRadius: 40 }
				]
			})
			expect(generateAdjacentAngles(props)).toMatchSnapshot()
		})

		test("should render with all props specified", () => {
			const props = AdjacentAnglesPropsSchema.parse({
				width: 500,
				height: 300,
				vertexLabel: "V",
				rayLabels: ["P", "Q", "R"],
				angles: [
					{ id: "a1", value: 60, label: "x", color: "green", arcRadius: 50, fill: true },
					{ id: "a2", value: 20, label: "y", color: "purple", arcRadius: 60, fill: false }
				],
				totalAngle: { label: "80°", color: "black", arcRadius: 80 },
				baselineAngle: 20
			})
			expect(generateAdjacentAngles(props)).toMatchSnapshot()
		})

		test("should handle error case with mismatched rays and angles", () => {
			const props = AdjacentAnglesPropsSchema.parse({
				rayLabels: ["B", "C"],
				angles: [
					{ value: 30, label: "30°", color: "red", arcRadius: 40 },
					{ value: 45, label: "45°", color: "blue", arcRadius: 40 }
				]
			})
			const result = errors.trySync(() => generateAdjacentAngles(props))
			if (result.error) {
				expect(errors.is(result.error, ErrMismatchedRaysAndAngles)).toBe(true)
				expect(result.error.message).toMatchSnapshot()
			} else {
				throw errors.new("expected an error to be thrown")
			}
		})
	})

	describe("generateBarChart", () => {
		test("should render with minimal props", () => {
			const props = BarChartPropsSchema.parse({
				yAxis: { tickInterval: 10 },
				data: [
					{ label: "A", value: 25 },
					{ label: "B", value: 42, state: "unknown" }
				]
			})
			expect(generateBarChart(props)).toMatchSnapshot()
		})

		test("should render with all props specified", () => {
			const props = BarChartPropsSchema.parse({
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
					{ label: "Glenda", value: 80 },
					{ label: "Bartholomew", value: 55 },
					{ label: "Xylia", value: 95, state: "unknown" }
				],
				barColor: "purple"
			})
			expect(generateBarChart(props)).toMatchSnapshot()
		})

		test("should handle empty data array", () => {
			const props = BarChartPropsSchema.parse({
				data: [],
				yAxis: { tickInterval: 10 }
			})
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
			const props = BoxPlotPropsSchema.parse({
				axis: { min: 0, max: 100 },
				summary: { min: 10, q1: 25, median: 50, q3: 75, max: 95 }
			})
			expect(generateBoxPlot(props)).toMatchSnapshot()
		})

		test("should render with all props specified", () => {
			const props = BoxPlotPropsSchema.parse({
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
			})
			expect(generateBoxPlot(props)).toMatchSnapshot()
		})

		test("should handle error case where axis.min >= axis.max", () => {
			const props = BoxPlotPropsSchema.parse({
				axis: { min: 100, max: 0 },
				summary: { min: 10, q1: 25, median: 50, q3: 75, max: 95 }
			})
			const result = errors.trySync(() => generateBoxPlot(props))
			if (result.error) {
				expect(errors.is(result.error, ErrBoxPlotInvalidRange)).toBe(true)
				expect(result.error.message).toMatchSnapshot()
			} else {
				throw errors.new("expected an error to be thrown")
			}
		})

		test("should render with custom colors", () => {
			const props = BoxPlotPropsSchema.parse({
				axis: { min: 0, max: 50 },
				summary: { min: 5, q1: 15, median: 25, q3: 35, max: 45 },
				boxColor: "#90EE90",
				medianColor: "#FF1493"
			})
			expect(generateBoxPlot(props)).toMatchSnapshot()
		})

		test("should have sufficient padding for long axis labels", () => {
			const props = BoxPlotPropsSchema.parse({
				axis: {
					min: 0,
					max: 100,
					label: "A very long and descriptive label for the horizontal axis to test spacing",
					tickLabels: [0, 20, 40, 60, 80, 100]
				},
				summary: { min: 5, q1: 30, median: 45, q3: 80, max: 100 }
			})
			expect(generateBoxPlot(props)).toMatchSnapshot()
		})
	})

	describe("generateCompositeShapeDiagram", () => {
		test("should render an L-shape with all features", () => {
			const props = CompositeShapeDiagramPropsSchema.parse({
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
					{ fromVertexIndex: 3, toVertexIndex: 5, style: "dashed", label: "60 units" },
					{ fromVertexIndex: 3, toVertexIndex: 1, style: "dashed", label: "60 units" }
				],
				regionLabels: [
					{ text: "A", position: { x: 20, y: 50 } },
					{ text: "B", position: { x: 70, y: 20 } }
				],
				rightAngleMarkers: [
					{ cornerVertexIndex: 0, adjacentVertex1Index: 5, adjacentVertex2Index: 1 },
					{ cornerVertexIndex: 2, adjacentVertex1Index: 1, adjacentVertex2Index: 3 }
				]
			})
			expect(generateCompositeShapeDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateCoordinatePlane", () => {
		test("should render a full-featured coordinate plane", () => {
			const props = CoordinatePlanePropsSchema.parse({
				width: 500,
				height: 500,
				xAxis: { label: "X-Axis", min: -10, max: 10, tickInterval: 2, showGridLines: true },
				yAxis: { label: "Y-Axis", min: -10, max: 10, tickInterval: 2, showGridLines: true },
				showQuadrantLabels: true,
				points: [
					{ id: "p1", x: -4, y: 6, label: "A", color: "red" },
					{ id: "p2", x: 5, y: -5, label: "B", style: "open" },
					{ id: "p3", x: 8, y: 8, label: "C" }
				],
				lines: [{ id: "l1", equation: { type: "slopeIntercept", slope: 1, yIntercept: 1 }, style: "dashed" }],
				polygons: [
					{
						vertices: ["p1", "p2", "p3"],
						isClosed: true,
						fillColor: "rgba(0, 255, 0, 0.3)",
						strokeColor: "green"
					}
				]
			})
			expect(generateCoordinatePlane(props)).toMatchSnapshot()
		})

		test("should handle error case with invalid dimensions", () => {
			const props = CoordinatePlanePropsSchema.parse({
				width: 10,
				height: 10,
				xAxis: { min: 10, max: 0, tickInterval: 1 },
				yAxis: { min: 10, max: 0, tickInterval: 1 }
			})
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
			const props = DataTablePropsSchema.parse({
				title: "Student Scores",
				columnHeaders: ["Name", "Score", "Notes"],
				rows: [
					{
						isHeader: true,
						cells: ["Class A", 1600, "Excellent"]
					},
					{
						cells: ["Alice", 85, "Good"]
					},
					{
						cells: ["Bob", { type: "input", responseIdentifier: "BOB_SCORE", expectedLength: 3 }, "Needs improvement"]
					}
				],
				footer: ["Total", { type: "input", responseIdentifier: "TOTAL", expectedLength: 5 }, "Summary"]
			})
			expect(generateDataTable(props)).toMatchSnapshot()
		})
	})

	describe("generateDiscreteObjectRatioDiagram", () => {
		test("should render a grid layout", () => {
			const props = DiscreteObjectRatioDiagramPropsSchema.parse({
				objects: [
					{ count: 5, icon: "square", color: "blue" },
					{ count: 3, icon: "circle", color: "red" }
				],
				layout: "grid",
				title: "Shapes"
			})
			expect(generateDiscreteObjectRatioDiagram(props)).toMatchSnapshot()
		})

		test("should render a cluster layout", () => {
			const props = DiscreteObjectRatioDiagramPropsSchema.parse({
				objects: [
					{ count: 6, icon: "triangle", color: "green" },
					{ count: 4, icon: "square", color: "orange" }
				],
				layout: "cluster"
			})
			expect(generateDiscreteObjectRatioDiagram(props)).toMatchSnapshot()
		})

		test("should wrap to new row in grid layout when exceeding width", () => {
			const props = DiscreteObjectRatioDiagramPropsSchema.parse({
				width: 200,
				objects: [
					{ count: 15, icon: "circle", color: "blue" },
					{ count: 5, icon: "square", color: "red" }
				],
				layout: "grid",
				iconSize: 30
			})
			expect(generateDiscreteObjectRatioDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateDotPlot", () => {
		test("should render a basic dot plot", () => {
			const props = DotPlotPropsSchema.parse({
				width: 500,
				axis: { label: "Number of Pets", min: 0, max: 5, tickInterval: 1 },
				data: [
					{ value: 0, count: 2 },
					{ value: 1, count: 5 },
					{ value: 2, count: 3 },
					{ value: 4, count: 1 }
				],
				dotColor: "teal",
				dotRadius: 6
			})
			expect(generateDotPlot(props)).toMatchSnapshot()
		})

		test("should handle error case with invalid dimensions", () => {
			const props = DotPlotPropsSchema.parse({
				width: 50,
				height: 20,
				axis: { min: 10, max: 0, tickInterval: 1 },
				data: []
			})
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
			const props = DoubleNumberLinePropsSchema.parse({
				width: 500,
				topLine: {
					label: "Miles",
					ticks: [0, 60, 120, 180]
				},
				bottomLine: {
					label: "Hours",
					ticks: [0, 1, 2, "?"]
				}
			})
			expect(generateDoubleNumberLine(props)).toMatchSnapshot()
		})

		test("should handle minimal props", () => {
			const props = DoubleNumberLinePropsSchema.parse({
				topLine: {
					label: "Top",
					ticks: [0, 5, 10]
				},
				bottomLine: {
					label: "Bottom",
					ticks: [0, 1, 2]
				}
			})
			expect(generateDoubleNumberLine(props)).toMatchSnapshot()
		})
	})

	describe("generateGeometricSolidDiagram", () => {
		test("should render a labeled cylinder", () => {
			const props = GeometricSolidDiagramPropsSchema.parse({
				width: 200,
				height: 250,
				shape: { type: "cylinder", radius: 5, height: 10 },
				labels: [
					{ target: "radius", text: "r = 5" },
					{ target: "height", text: "h = 10" }
				]
			})
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})

		test("should render cylinder without labels", () => {
			const props = GeometricSolidDiagramPropsSchema.parse({
				shape: { type: "cylinder", radius: 8, height: 15 },
				labels: []
			})
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})

		test("should render cone shape", () => {
			const props = GeometricSolidDiagramPropsSchema.parse({
				width: 200,
				height: 250,
				shape: { type: "cone", radius: 6, height: 12 },
				labels: []
			})
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})

		test("should render cone with labels", () => {
			const props = GeometricSolidDiagramPropsSchema.parse({
				width: 200,
				height: 250,
				shape: { type: "cone", radius: 5, height: 8 },
				labels: [
					{ target: "radius", text: "r = 5" },
					{ target: "height", text: "h = 8" }
				]
			})
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})

		test("should render sphere without labels", () => {
			const props = GeometricSolidDiagramPropsSchema.parse({
				width: 200,
				height: 200,
				shape: { type: "sphere", radius: 7 },
				labels: []
			})
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})

		test("should render sphere with radius label", () => {
			const props = GeometricSolidDiagramPropsSchema.parse({
				width: 200,
				height: 200,
				shape: { type: "sphere", radius: 6 },
				labels: [{ target: "radius", text: "r = 6" }]
			})
			expect(generateGeometricSolidDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateHangerDiagram", () => {
		test("should render a complex hanger diagram", () => {
			const props = HangerDiagramPropsSchema.parse({
				width: 400,
				height: 300,
				leftSide: [
					{ label: "x", shape: "square", color: "#fada5e" },
					{ label: "x", shape: "square", color: "#fada5e" },
					{ label: 5, shape: "circle" }
				],
				rightSide: [{ label: 17, shape: "pentagon" }]
			})
			expect(generateHangerDiagram(props)).toMatchSnapshot()
		})

		test("should render hanger with triangles", () => {
			const props = HangerDiagramPropsSchema.parse({
				width: 350,
				height: 250,
				leftSide: [
					{ label: 3, shape: "triangle", color: "#ff6b6b" },
					{ label: 3, shape: "triangle", color: "#ff6b6b" }
				],
				rightSide: [{ label: "y", shape: "triangle", color: "#4ecdc4" }]
			})
			expect(generateHangerDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateHistogram", () => {
		test("should render a histogram with all features", () => {
			const props = HistogramPropsSchema.parse({
				width: 500,
				height: 350,
				title: "Exam Scores",
				xAxis: { label: "Score Range" },
				yAxis: { label: "Frequency", max: 15, tickInterval: 5 },
				bins: [
					{ label: "50-60", frequency: 2 },
					{ label: "60-70", frequency: 5 },
					{ label: "70-80", frequency: 12 },
					{ label: "80-90", frequency: 8 },
					{ label: "90-100", frequency: 3 }
				]
			})
			expect(generateHistogram(props)).toMatchSnapshot()
		})

		test("should handle error case with invalid dimensions", () => {
			const props = HistogramPropsSchema.parse({
				width: 50,
				height: 50,
				xAxis: { label: "X" },
				yAxis: { label: "Y" },
				bins: []
			})
			expect(generateHistogram(props)).toMatchSnapshot()
		})

		test("should handle histogram without title or custom y-axis settings", () => {
			const props = HistogramPropsSchema.parse({
				xAxis: { label: "Values" },
				yAxis: { label: "Count" },
				bins: [
					{ label: "A", frequency: 10 },
					{ label: "B", frequency: 5 }
				]
			})
			expect(generateHistogram(props)).toMatchSnapshot()
		})
	})

	describe("generateInequalityNumberLine", () => {
		test("should render a simple inequality (x > 5)", () => {
			const props = InequalityNumberLinePropsSchema.parse({
				min: 0,
				max: 10,
				tickInterval: 1,
				ranges: [{ start: { value: 5, type: "open" } }]
			})
			expect(generateInequalityNumberLine(props)).toMatchSnapshot()
		})

		test("should render a compound 'and' inequality (-2 <= x < 3)", () => {
			const props = InequalityNumberLinePropsSchema.parse({
				min: -5,
				max: 5,
				tickInterval: 1,
				ranges: [
					{
						start: { value: -2, type: "closed" },
						end: { value: 3, type: "open" },
						color: "purple"
					}
				]
			})
			expect(generateInequalityNumberLine(props)).toMatchSnapshot()
		})

		test("should render a compound 'or' inequality (x < -1 or x >= 4)", () => {
			const props = InequalityNumberLinePropsSchema.parse({
				min: -5,
				max: 5,
				tickInterval: 1,
				ranges: [{ end: { value: -1, type: "open" } }, { start: { value: 4, type: "closed" } }]
			})
			expect(generateInequalityNumberLine(props)).toMatchSnapshot()
		})
	})

	describe("generateNumberLine", () => {
		test("should render a horizontal number line with all features", () => {
			const props = NumberLinePropsSchema.parse({
				width: 600,
				orientation: "horizontal",
				min: -10,
				max: 10,
				majorTickInterval: 5,
				minorTicksPerInterval: 4,
				points: [
					{ value: -7, label: "A", color: "red", labelPosition: "above" },
					{ value: 2.5, label: "B", color: "blue", labelPosition: "below" }
				],
				specialTickLabels: [{ value: 0, label: "Origin" }]
			})
			expect(generateNumberLine(props)).toMatchSnapshot()
		})

		test("should render a vertical number line", () => {
			const props = NumberLinePropsSchema.parse({
				height: 400,
				orientation: "vertical",
				min: 0,
				max: 100,
				majorTickInterval: 25,
				points: [{ value: 30, label: "Low", color: "green", labelPosition: "right" }]
			})
			expect(generateNumberLine(props)).toMatchSnapshot()
		})

		test("should render horizontal number line with left/right point labels", () => {
			const props = NumberLinePropsSchema.parse({
				width: 500,
				orientation: "horizontal",
				min: 0,
				max: 20,
				majorTickInterval: 5,
				minorTicksPerInterval: 4,
				points: [
					{ value: 5, label: "Left", color: "red", labelPosition: "left" },
					{ value: 15, label: "Right", color: "blue", labelPosition: "right" }
				]
			})
			expect(generateNumberLine(props)).toMatchSnapshot()
		})

		test("should render vertical number line with special labels and left-positioned points", () => {
			const props = NumberLinePropsSchema.parse({
				height: 300,
				orientation: "vertical",
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
					{ value: -30, label: "Freezing", color: "lightblue", labelPosition: "left" },
					{ value: 40, label: "Hot", color: "red", labelPosition: "above" }
				]
			})
			expect(generateNumberLine(props)).toMatchSnapshot()
		})
	})

	describe("generateNumberLineForOpposites", () => {
		test("should render opposites with custom labels", () => {
			const props = NumberLineForOppositesPropsSchema.parse({
				maxAbsValue: 10,
				tickInterval: 2,
				value: 7,
				positiveLabel: "7",
				negativeLabel: "?",
				showArrows: true
			})
			expect(generateNumberLineForOpposites(props)).toMatchSnapshot()
		})
	})

	describe("generateNumberLineWithAction", () => {
		test("should render a vertical thermometer with action", () => {
			const props = NumberLineWithActionPropsSchema.parse({
				orientation: "vertical",
				min: -20,
				max: 20,
				tickInterval: 10,
				customLabels: [
					{ value: -11, text: "-11°C" },
					{ value: 13, text: "?°C" }
				],
				action: { startValue: -11, change: 24, label: "+24°C" }
			})
			expect(generateNumberLineWithAction(props)).toMatchSnapshot()
		})

		test("should render a horizontal number line with action", () => {
			const props = NumberLineWithActionPropsSchema.parse({
				orientation: "horizontal",
				min: 0,
				max: 50,
				tickInterval: 10,
				customLabels: [
					{ value: 15, text: "Start" },
					{ value: 35, text: "End" }
				],
				action: { startValue: 15, change: 20, label: "+20" }
			})
			expect(generateNumberLineWithAction(props)).toMatchSnapshot()
		})

		test("should handle error case where min >= max", () => {
			const props = NumberLineWithActionPropsSchema.parse({
				orientation: "horizontal",
				min: 50,
				max: 0,
				tickInterval: 10,
				customLabels: [],
				action: { startValue: 10, change: 5, label: "+5" }
			})
			expect(generateNumberLineWithAction(props)).toMatchSnapshot()
		})
	})

	describe("generateNumberLineWithFractionGroups", () => {
		test("should render fraction groups on a number line", () => {
			const props = NumberLineWithFractionGroupsPropsSchema.parse({
				min: 0,
				max: 2,
				ticks: [
					{ value: 0, label: "0", isMajor: true },
					{ value: 0.375, label: "3/8" },
					{ value: 1, label: "1", isMajor: true },
					{ value: 2, label: "2", isMajor: true }
				],
				segments: [
					{ start: 0, end: 0.375, color: "teal", label: "1 group" },
					{ start: 0.375, end: 0.75, color: "orange", label: "2 groups" }
				]
			})
			expect(generateNumberLineWithFractionGroups(props)).toMatchSnapshot()
		})
	})

	describe("generateNumberSetDiagram", () => {
		test("should render the number set diagram", () => {
			const props = NumberSetDiagramPropsSchema.parse({
				sets: {
					whole: { label: "Whole", color: "#E8F0FE" },
					integer: { label: "Integer", color: "#D2E3FC" },
					rational: { label: "Rational", color: "#AECBFA" },
					irrational: { label: "Irrational", color: "#FAD2CF" }
				}
			})
			expect(generateNumberSetDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateParallelLinesTransversal", () => {
		test("should render with labels and rotations", () => {
			const props = ParallelLinesTransversalPropsSchema.parse({
				width: 400,
				height: 350,
				linesAngle: 20,
				transversalAngle: 80,
				labels: [
					{ intersection: "top", position: "topLeft", label: "120°", color: "red" },
					{ intersection: "bottom", position: "bottomRight", label: "x", color: "blue" }
				]
			})
			expect(generateParallelLinesTransversal(props)).toMatchSnapshot()
		})
	})

	describe("generatePartitionedShape", () => {
		test("should render multiple shapes to show > 100%", () => {
			const props = PartitionedShapePropsSchema.parse({
				shapes: [
					{ type: "rectangle", totalParts: 4, shadedParts: 4, rows: 2, columns: 2 },
					{
						type: "rectangle",
						totalParts: 4,
						shadedParts: 1,
						rows: 2,
						columns: 2,
						shadeColor: "purple"
					}
				],
				layout: "horizontal"
			})
			expect(generatePartitionedShape(props)).toMatchSnapshot()
		})

		test("should render a partitioned circle", () => {
			const props = PartitionedShapePropsSchema.parse({
				shapes: [{ type: "circle", totalParts: 8, shadedParts: 3 }]
			})
			expect(generatePartitionedShape(props)).toMatchSnapshot()
		})
	})

	describe("generatePictograph", () => {
		test("should render a full pictograph", () => {
			const props = PictographPropsSchema.parse({
				title: "Home Runs Hit",
				key: { icon: "⚾", label: "= 1 home run" },
				data: [
					{ category: "Lancers", iconCount: 5 },
					{ category: "Gladiators", iconCount: 3 },
					{ category: "Knights", iconCount: 6 }
				]
			})
			expect(generatePictograph(props)).toMatchSnapshot()
		})
	})

	describe("generatePolyhedronDiagram", () => {
		test("should render a labeled rectangular prism", () => {
			const props = PolyhedronDiagramPropsSchema.parse({
				shape: { type: "rectangularPrism", length: 10, width: 8, height: 6 },
				labels: [
					{ text: "10 cm", target: "length" },
					{ text: "8 cm", target: "width" },
					{ text: "6 cm", target: "height" }
				],
				shadedFace: "top_face"
			})
			expect(generatePolyhedronDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generatePolyhedronNetDiagram", () => {
		test("should render a labeled cube net", () => {
			const props = PolyhedronNetDiagramPropsSchema.parse({
				polyhedronType: "cube",
				dimensions: {
					base: { type: "square", side: 5 }
				},
				showLabels: true
			})
			expect(generatePolyhedronNetDiagram(props)).toMatchSnapshot()
		})

		test("should handle error case for cube with non-square base", () => {
			const props = PolyhedronNetDiagramPropsSchema.parse({
				polyhedronType: "cube",
				dimensions: {
					base: { type: "rectangle", length: 5, width: 3 }
				},
				showLabels: false
			})
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
			const props = PythagoreanProofDiagramPropsSchema.parse({
				squareA: { area: 9, sideLabel: "a" },
				squareB: { area: 16, sideLabel: "b" },
				squareC: { area: 25, sideLabel: "c" }
			})
			expect(generatePythagoreanProofDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateScatterPlot", () => {
		test("should render a scatter plot with linear and quadratic trend lines", () => {
			const props = ScatterPlotPropsSchema.parse({
				title: "Data Trends",
				xAxis: { label: "Time", min: 0, max: 10, tickInterval: 2, gridLines: true },
				yAxis: { label: "Value", min: 0, max: 100, tickInterval: 20 },
				points: [
					{ x: 1, y: 10 },
					{ x: 2, y: 25 },
					{ x: 5, y: 40 },
					{ x: 8, y: 90 },
					{ x: 9, y: 85 }
				],
				trendLines: [
					{
						id: "l1",
						data: { type: "linear", slope: 8, yIntercept: 5 },
						color: "red",
						style: "dashed"
					},
					{
						id: "q1",
						data: { type: "quadratic", a: 1, b: 2, c: 5 },
						color: "green"
					}
				]
			})
			expect(generateScatterPlot(props)).toMatchSnapshot()
		})

		test("should render with both x and y grid lines", () => {
			const props = ScatterPlotPropsSchema.parse({
				xAxis: { label: "X", min: 0, max: 10, tickInterval: 2, gridLines: true },
				yAxis: { label: "Y", min: 0, max: 50, tickInterval: 10, gridLines: true },
				points: [
					{ x: 2, y: 10, label: "A" },
					{ x: 5, y: 25 },
					{ x: 8, y: 40, label: "B" }
				]
			})
			expect(generateScatterPlot(props)).toMatchSnapshot()
		})

		test("should handle error case with invalid dimensions", () => {
			const props = ScatterPlotPropsSchema.parse({
				width: 50,
				height: 50,
				xAxis: { label: "X", min: 10, max: 0, tickInterval: 1 },
				yAxis: { label: "Y", min: 0, max: 10, tickInterval: 2 },
				points: []
			})
			expect(generateScatterPlot(props)).toMatchSnapshot()
		})
	})

	describe("generateStackedItemsDiagram", () => {
		test("should render a vertical stack of items", () => {
			const props = StackedItemsDiagramPropsSchema.parse({
				width: 100,
				height: 250,
				altText: "An ice cream cone with 3 scoops.",
				baseItem: {
					src: "https://via.placeholder.com/80x120.png/F2D2BD/000000?text=Cone",
					width: 80,
					height: 120,
					alt: "ice cream cone"
				},
				stackedItem: {
					src: "https://via.placeholder.com/80x50.png/FFC0CB/000000?text=Scoop",
					width: 80,
					height: 50,
					alt: "scoop of ice cream"
				},
				count: 3,
				orientation: "vertical",
				overlap: 0.6
			})
			expect(generateStackedItemsDiagram(props)).toMatchSnapshot()
		})

		test("should render a horizontal stack of items", () => {
			const props = StackedItemsDiagramPropsSchema.parse({
				width: 300,
				height: 100,
				altText: "A row of 4 coins",
				baseItem: {
					src: "https://via.placeholder.com/50x50.png/FFD700/000000?text=Base",
					width: 50,
					height: 50,
					alt: "base coin"
				},
				stackedItem: {
					src: "https://via.placeholder.com/50x50.png/C0C0C0/000000?text=Coin",
					width: 50,
					height: 50,
					alt: "silver coin"
				},
				count: 4,
				orientation: "horizontal",
				overlap: 0.3
			})
			expect(generateStackedItemsDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateTapeDiagram", () => {
		test("should render a full tape diagram with bracket", () => {
			const props = TapeDiagramPropsSchema.parse({
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
			})
			expect(generateTapeDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateUnitBlockDiagram", () => {
		test("should render multiple hundred blocks", () => {
			const props = UnitBlockDiagramPropsSchema.parse({
				totalBlocks: 8,
				shadedUnitsPerBlock: 1,
				blocksPerRow: 4,
				shadeColor: "green"
			})
			expect(generateUnitBlockDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateVennDiagram", () => {
		test("should render a complete Venn diagram", () => {
			const props = VennDiagramPropsSchema.parse({
				circleA: { label: "Have a Dog", count: 12, color: "rgba(217, 95, 79, 0.5)" },
				circleB: { label: "Have a Cat", count: 8, color: "rgba(66, 133, 244, 0.5)" },
				intersectionCount: 5,
				outsideCount: 3
			})
			expect(generateVennDiagram(props)).toMatchSnapshot()
		})

		test("should render with custom dimensions", () => {
			const props = VennDiagramPropsSchema.parse({
				width: 500,
				height: 400,
				circleA: { label: "Group A", count: 15 },
				circleB: { label: "Group B", count: 20 },
				intersectionCount: 8,
				outsideCount: 5
			})
			expect(generateVennDiagram(props)).toMatchSnapshot()
		})
	})

	describe("generateVerticalArithmeticSetup", () => {
		test("should render a multiplication problem", () => {
			const props = VerticalArithmeticSetupPropsSchema.parse({
				title: "Calculate the product:",
				operand1: "1.84",
				operand2: "7.2",
				operator: "×"
			})
			expect(generateVerticalArithmeticSetup(props)).toMatchSnapshot()
		})

		test("should render an addition problem", () => {
			const props = VerticalArithmeticSetupPropsSchema.parse({
				operand1: "503",
				operand2: "29",
				operator: "+"
			})
			expect(generateVerticalArithmeticSetup(props)).toMatchSnapshot()
		})
	})
})
