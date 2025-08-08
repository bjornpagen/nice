import { describe, expect, test } from "bun:test"
import {
	CoordinatePlaneComprehensivePropsSchema,
	generateCoordinatePlaneComprehensive
} from "@/lib/widgets/generators/coordinate-plane-comprehensive"
import {
	DistanceFormulaGraphPropsSchema,
	generateDistanceFormulaGraph
} from "@/lib/widgets/generators/distance-formula-graph"
import { FunctionPlotGraphPropsSchema, generateFunctionPlotGraph } from "@/lib/widgets/generators/function-plot-graph"
import { generateLineEquationGraph, LineEquationGraphPropsSchema } from "@/lib/widgets/generators/line-equation-graph"
import { generatePointPlotGraph, PointPlotGraphPropsSchema } from "@/lib/widgets/generators/point-plot-graph"
import { generatePolygonGraph, PolygonGraphPropsSchema } from "@/lib/widgets/generators/polygon-graph"
import {
	generateShapeTransformationGraph,
	ShapeTransformationGraphPropsSchema
} from "@/lib/widgets/generators/shape-transformation-graph"

// Helper functions to generate diagrams with schema validation
const generatePointPlotDiagram = (props: unknown) => {
	const parsedProps = PointPlotGraphPropsSchema.parse(props)
	return generatePointPlotGraph(parsedProps)
}

const generateLineEquationDiagram = (props: unknown) => {
	const parsedProps = LineEquationGraphPropsSchema.parse(props)
	return generateLineEquationGraph(parsedProps)
}

const generatePolygonDiagram = (props: unknown) => {
	const parsedProps = PolygonGraphPropsSchema.parse(props)
	return generatePolygonGraph(parsedProps)
}

const generateDistanceFormulaDiagram = (props: unknown) => {
	const parsedProps = DistanceFormulaGraphPropsSchema.parse(props)
	return generateDistanceFormulaGraph(parsedProps)
}

const generateFunctionPlotDiagram = (props: unknown) => {
	const parsedProps = FunctionPlotGraphPropsSchema.parse(props)
	return generateFunctionPlotGraph(parsedProps)
}

const generateShapeTransformationDiagram = (props: unknown) => {
	const parsedProps = ShapeTransformationGraphPropsSchema.parse(props)
	return generateShapeTransformationGraph(parsedProps)
}

const generateComprehensiveDiagram = (props: unknown) => {
	const parsedProps = CoordinatePlaneComprehensivePropsSchema.parse(props)
	return generateCoordinatePlaneComprehensive(parsedProps)
}

describe("Modular Coordinate Plane Generators - Snapshots", () => {
	describe("Point Plot Graph", () => {
		test("should generate a simple point plot", () => {
			const props = {
				type: "pointPlotGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X-Axis",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y-Axis",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				points: [
					{
						id: "point1",
						x: 2,
						y: 3,
						label: "A",
						color: "#FF0000",
						style: "closed" as const
					},
					{
						id: "point2",
						x: -1,
						y: -2,
						label: "B",
						color: "#00FF00",
						style: "open" as const
					}
				]
			}
			expect(generatePointPlotDiagram(props)).toMatchSnapshot()
		})

		test("should handle quadrant labels", () => {
			const props = {
				type: "pointPlotGraph" as const,
				width: 300,
				height: 300,
				xAxis: {
					label: null,
					min: -3,
					max: 3,
					tickInterval: 1,
					showGridLines: false
				},
				yAxis: {
					label: null,
					min: -3,
					max: 3,
					tickInterval: 1,
					showGridLines: false
				},
				showQuadrantLabels: true,
				points: [
					{
						id: "origin",
						x: 0,
						y: 0,
						label: "O",
						color: "#4285F4",
						style: "closed" as const
					}
				]
			}
			expect(generatePointPlotDiagram(props)).toMatchSnapshot()
		})

		test("should handle π-based labels", () => {
			const props = {
				type: "pointPlotGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "Radians",
					min: -Math.PI,
					max: Math.PI,
					tickInterval: Math.PI / 4,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -2,
					max: 2,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				points: [
					{
						id: "pi-point",
						x: Math.PI / 2,
						y: 1,
						label: "π/2",
						color: "#0000FF",
						style: "closed" as const
					}
				]
			}
			expect(generatePointPlotDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Line Equation Graph", () => {
		test("should render slope-intercept lines", () => {
			const props = {
				type: "lineEquationGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				lines: [
					{
						id: "line1",
						equation: {
							type: "slopeIntercept" as const,
							slope: 2,
							yIntercept: 1
						},
						color: "#FF0000",
						style: "solid" as const
					},
					{
						id: "line2",
						equation: {
							type: "slopeIntercept" as const,
							slope: -0.5,
							yIntercept: 3
						},
						color: "#00FF00",
						style: "dashed" as const
					}
				],
				points: [
					{
						id: "intersection",
						x: 1,
						y: 3,
						label: "Intersection",
						color: "#0000FF",
						style: "closed" as const
					}
				]
			}
			expect(generateLineEquationDiagram(props)).toMatchSnapshot()
		})

		test("should render standard form lines including vertical lines", () => {
			const props = {
				type: "lineEquationGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				lines: [
					{
						id: "standard-line",
						equation: {
							type: "standard" as const,
							A: 3,
							B: -2,
							C: 6
						},
						color: "#800080",
						style: "solid" as const
					},
					{
						id: "vertical-line",
						equation: {
							type: "standard" as const,
							A: 1,
							B: 0,
							C: 2
						},
						color: "#FFA500",
						style: "dashed" as const
					}
				],
				points: null
			}
			expect(generateLineEquationDiagram(props)).toMatchSnapshot()
		})

		test("should render point-slope form lines", () => {
			const props = {
				type: "lineEquationGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				lines: [
					{
						id: "point-slope-line",
						equation: {
							type: "pointSlope" as const,
							x1: 1,
							y1: 2,
							slope: 3
						},
						color: "#FF1493",
						style: "solid" as const
					}
				],
				points: [
					{
						id: "known-point",
						x: 1,
						y: 2,
						label: "(1,2)",
						color: "#FF1493",
						style: "closed" as const
					}
				]
			}
			expect(generateLineEquationDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Polygon Graph", () => {
		test("should render closed polygons", () => {
			const props = {
				type: "polygonGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				points: [
					{
						id: "A",
						x: 0,
						y: 3,
						label: "A",
						color: "#FF0000",
						style: "closed" as const
					},
					{
						id: "B",
						x: -2,
						y: -1,
						label: "B",
						color: "#FF0000",
						style: "closed" as const
					},
					{
						id: "C",
						x: 2,
						y: -1,
						label: "C",
						color: "#FF0000",
						style: "closed" as const
					}
				],
				polygons: [
					{
						vertices: ["A", "B", "C"],
						isClosed: true,
						fillColor: "rgba(255, 0, 0, 0.3)",
						strokeColor: "#FF0000",
						label: "Triangle ABC"
					}
				]
			}
			expect(generatePolygonDiagram(props)).toMatchSnapshot()
		})

		test("should render open polylines", () => {
			const props = {
				type: "polygonGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				points: [
					{
						id: "P1",
						x: -3,
						y: 2,
						label: "P1",
						color: "#00FF00",
						style: "closed" as const
					},
					{
						id: "P2",
						x: -1,
						y: 4,
						label: "P2",
						color: "#00FF00",
						style: "closed" as const
					},
					{
						id: "P3",
						x: 1,
						y: 1,
						label: "P3",
						color: "#00FF00",
						style: "closed" as const
					},
					{
						id: "P4",
						x: 3,
						y: 3,
						label: "P4",
						color: "#00FF00",
						style: "closed" as const
					}
				],
				polygons: [
					{
						vertices: ["P1", "P2", "P3", "P4"],
						isClosed: false,
						fillColor: "rgba(0, 255, 0, 0.3)",
						strokeColor: "#00FF00",
						label: null
					}
				]
			}
			expect(generatePolygonDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Distance Formula Graph", () => {
		test("should render distance with legs", () => {
			const props = {
				type: "distanceFormulaGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				points: [
					{
						id: "point1",
						x: 1,
						y: 1,
						label: "A(1,1)",
						color: "#FF0000",
						style: "closed" as const
					},
					{
						id: "point2",
						x: 4,
						y: 5,
						label: "B(4,5)",
						color: "#FF0000",
						style: "closed" as const
					}
				],
				distances: [
					{
						pointId1: "point1",
						pointId2: "point2",
						showLegs: true,
						showLegLabels: false,
						hypotenuseLabel: "Distance AB",
						color: "gray",
						style: "dashed" as const
					}
				]
			}
			expect(generateDistanceFormulaDiagram(props)).toMatchSnapshot()
		})

		test("should render distance without legs", () => {
			const props = {
				type: "distanceFormulaGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -3,
					max: 3,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -3,
					max: 3,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				points: [
					{
						id: "origin",
						x: 0,
						y: 0,
						label: "O",
						color: "#000000",
						style: "closed" as const
					},
					{
						id: "point",
						x: 2,
						y: 2,
						label: "P",
						color: "#000000",
						style: "closed" as const
					}
				],
				distances: [
					{
						pointId1: "origin",
						pointId2: "point",
						showLegs: false,
						showLegLabels: false,
						hypotenuseLabel: null,
						color: "#800080",
						style: "solid" as const
					}
				]
			}
			expect(generateDistanceFormulaDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Function Plot Graph", () => {
		test("should render simple polylines", () => {
			const props = {
				type: "functionPlotGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				polylines: [
					{
						id: "quadratic",
						points: [
							{ x: -3, y: 9 },
							{ x: -2, y: 4 },
							{ x: -1, y: 1 },
							{ x: 0, y: 0 },
							{ x: 1, y: 1 },
							{ x: 2, y: 4 },
							{ x: 3, y: 9 }
						],
						color: "#FF0000",
						style: "solid" as const
					}
				],
				points: [
					{
						id: "vertex",
						x: 0,
						y: 0,
						label: "Vertex",
						color: "#FF0000",
						style: "closed" as const
					}
				]
			}
			expect(generateFunctionPlotDiagram(props)).toMatchSnapshot()
		})

		test("should render trigonometric functions", () => {
			const props = {
				type: "functionPlotGraph" as const,
				width: 500,
				height: 400,
				xAxis: {
					label: "θ (radians)",
					min: -2 * Math.PI,
					max: 2 * Math.PI,
					tickInterval: Math.PI / 2,
					showGridLines: true
				},
				yAxis: {
					label: "f(θ)",
					min: -2,
					max: 2,
					tickInterval: 0.5,
					showGridLines: true
				},
				showQuadrantLabels: false,
				polylines: [
					{
						id: "sine-wave",
						points: Array.from({ length: 50 }, (_, i) => {
							const x = -2 * Math.PI + (i * (4 * Math.PI)) / 49
							return { x, y: Math.sin(x) }
						}),
						color: "#0000FF",
						style: "solid" as const
					},
					{
						id: "cosine-wave",
						points: Array.from({ length: 50 }, (_, i) => {
							const x = -2 * Math.PI + (i * (4 * Math.PI)) / 49
							return { x, y: Math.cos(x) }
						}),
						color: "#FF0000",
						style: "dashed" as const
					}
				],
				points: [
					{ id: "origin", x: 0, y: 0, label: "(0,0)", color: "#000000", style: "closed" as const },
					{ id: "pi", x: Math.PI, y: 0, label: "(π,0)", color: "#FF0000", style: "closed" as const }
				]
			}
			expect(generateFunctionPlotDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Shape Transformation Graph", () => {
		test("should render translation", () => {
			const props = {
				type: "shapeTransformationGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -6,
					max: 6,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -6,
					max: 6,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				preImage: {
					vertices: [
						{ x: 1, y: 1 },
						{ x: 3, y: 1 },
						{ x: 2, y: 3 }
					],
					color: "rgba(255, 0, 0, 0.5)",
					label: "Original"
				},
				transformation: {
					type: "translation" as const,
					vector: { x: 2, y: -3 }
				},
				points: null
			}
			expect(generateShapeTransformationDiagram(props)).toMatchSnapshot()
		})

		test("should render rotation with center point", () => {
			const props = {
				type: "shapeTransformationGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -5,
					max: 5,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				preImage: {
					vertices: [
						{ x: 2, y: 1 },
						{ x: 4, y: 1 },
						{ x: 3, y: 3 }
					],
					color: "rgba(0, 0, 255, 0.5)",
					label: "Triangle"
				},
				transformation: {
					type: "rotation" as const,
					center: { x: 0, y: 0 },
					angle: 90
				},
				points: [
					{
						id: "center",
						x: 0,
						y: 0,
						label: "Center",
						color: "#000000",
						style: "closed" as const
					}
				]
			}
			expect(generateShapeTransformationDiagram(props)).toMatchSnapshot()
		})

		test("should render reflection across y-axis", () => {
			const props = {
				type: "shapeTransformationGraph" as const,
				width: 400,
				height: 400,
				xAxis: {
					label: "X",
					min: -6,
					max: 6,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -4,
					max: 4,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				preImage: {
					vertices: [
						{ x: 2, y: 1 },
						{ x: 4, y: 1 },
						{ x: 4, y: 3 },
						{ x: 2, y: 3 }
					],
					color: "rgba(0, 255, 0, 0.5)",
					label: "Rectangle"
				},
				transformation: {
					type: "reflection" as const,
					axis: "y" as const
				},
				points: null
			}
			expect(generateShapeTransformationDiagram(props)).toMatchSnapshot()
		})

		test("should render dilation with scale factor", () => {
			const props = {
				type: "shapeTransformationGraph" as const,
				width: 500,
				height: 500,
				xAxis: {
					label: "X",
					min: -8,
					max: 8,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "Y",
					min: -8,
					max: 8,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				preImage: {
					vertices: [
						{ x: 1, y: 1 },
						{ x: 2, y: 1 },
						{ x: 2, y: 2 },
						{ x: 1, y: 2 }
					],
					color: "rgba(128, 0, 128, 0.5)",
					label: "Unit Square"
				},
				transformation: {
					type: "dilation" as const,
					center: { x: 0, y: 0 },
					scaleFactor: 3
				},
				points: [
					{
						id: "center",
						x: 0,
						y: 0,
						label: "Center",
						color: "#000000",
						style: "closed" as const
					}
				]
			}
			expect(generateShapeTransformationDiagram(props)).toMatchSnapshot()
		})

		test("should render complex quadrilateral rotation with center point", () => {
			const props = {
				type: "shapeTransformationGraph" as const,
				width: 600,
				height: 600,
				xAxis: {
					label: "x",
					min: -8,
					max: 8,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "y",
					min: -7,
					max: 7,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				preImage: {
					vertices: [
						{ x: 1, y: 4 }, // A
						{ x: -4, y: 3 }, // B
						{ x: -2, y: -3 }, // C
						{ x: 2, y: -4 } // D
					],
					color: "rgba(0, 0, 0, 0.7)",
					label: "ABCD"
				},
				transformation: {
					type: "rotation" as const,
					center: { x: -2, y: 1 }, // Point P
					angle: -90 // 90 degrees clockwise
				},
				points: [
					{
						id: "P",
						x: -2,
						y: 1,
						label: "P",
						color: "#FFA500",
						style: "closed" as const
					},
					// Pre-image vertices
					{
						id: "A",
						x: 1,
						y: 4,
						label: "A",
						color: "#000000",
						style: "closed" as const
					},
					{
						id: "B",
						x: -4,
						y: 3,
						label: "B",
						color: "#000000",
						style: "closed" as const
					},
					{
						id: "C",
						x: -2,
						y: -3,
						label: "C",
						color: "#000000",
						style: "closed" as const
					},
					{
						id: "D",
						x: 2,
						y: -4,
						label: "D",
						color: "#000000",
						style: "closed" as const
					},
					// Transformed image vertices (calculated for -90° rotation around P(-2,1))
					{
						id: "A_prime",
						x: 1, // A' position after rotation
						y: -2,
						label: "A'",
						color: "#00AA00",
						style: "closed" as const
					},
					{
						id: "B_prime",
						x: 0, // B' position after rotation
						y: 3,
						label: "B'",
						color: "#00AA00",
						style: "closed" as const
					},
					{
						id: "C_prime",
						x: -6, // C(-2,-3) -> C'(-2 + (-3-1), 1 - (-2-(-2))) = (-6, 1)
						y: 1,
						label: "C'",
						color: "#00AA00",
						style: "closed" as const
					},
					{
						id: "D_prime",
						x: -7, // D(2,-4) -> D'(-2 + (-4-1), 1 - (2-(-2))) = (-7, -3)
						y: -3,
						label: "D'",
						color: "#00AA00",
						style: "closed" as const
					}
				]
			}
			expect(generateShapeTransformationDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Comprehensive Coordinate Plane", () => {
		test("should render everything together", () => {
			const props = {
				type: "coordinatePlane" as const,
				width: 600,
				height: 600,
				xAxis: {
					label: "X-Axis",
					min: -10,
					max: 10,
					tickInterval: 2,
					showGridLines: true
				},
				yAxis: {
					label: "Y-Axis",
					min: -10,
					max: 10,
					tickInterval: 2,
					showGridLines: true
				},
				showQuadrantLabels: true,
				points: [
					{ id: "A", x: -3, y: 4, label: "A", color: "#FF0000", style: "closed" as const },
					{ id: "B", x: 2, y: 6, label: "B", color: "#FF0000", style: "closed" as const },
					{ id: "C", x: 5, y: 2, label: "C", color: "#FF0000", style: "closed" as const },
					{ id: "D", x: -1, y: -2, label: "D", color: "#00FF00", style: "closed" as const },
					{ id: "E", x: 3, y: -4, label: "E", color: "#00FF00", style: "closed" as const }
				],
				lines: [
					{
						id: "line1",
						equation: {
							type: "slopeIntercept" as const,
							slope: 0.5,
							yIntercept: 2
						},
						color: "#800080",
						style: "dashed" as const
					}
				],
				polygons: [
					{
						vertices: ["A", "B", "C"],
						isClosed: true,
						fillColor: "rgba(255, 0, 0, 0.2)",
						strokeColor: "#FF0000",
						label: "Triangle ABC"
					}
				],
				distances: [
					{
						pointId1: "A",
						pointId2: "B",
						showLegs: true,
						showLegLabels: false,
						hypotenuseLabel: "Distance AB",
						color: "gray",
						style: "dashed" as const
					}
				],
				polylines: [
					{
						id: "curve",
						points: [
							{ x: -8, y: 8 },
							{ x: -6, y: 4 },
							{ x: -4, y: 0 },
							{ x: -2, y: -2 },
							{ x: 0, y: -3 },
							{ x: 2, y: -2 },
							{ x: 4, y: 0 },
							{ x: 6, y: 4 },
							{ x: 8, y: 8 }
						],
						color: "#FF1493",
						style: "solid" as const
					}
				]
			}
			expect(generateComprehensiveDiagram(props)).toMatchSnapshot()
		})

		test("should handle complex mathematical scenarios", () => {
			const props = {
				type: "coordinatePlane" as const,
				width: 500,
				height: 500,
				xAxis: {
					label: "θ (radians)",
					min: -2 * Math.PI,
					max: 2 * Math.PI,
					tickInterval: Math.PI / 2,
					showGridLines: true
				},
				yAxis: {
					label: "f(θ)",
					min: -2,
					max: 2,
					tickInterval: 0.5,
					showGridLines: true
				},
				showQuadrantLabels: false,
				points: [
					{ id: "origin", x: 0, y: 0, label: "(0,0)", color: "#000000", style: "closed" as const },
					{ id: "pi", x: Math.PI, y: 0, label: "(π,0)", color: "#FF0000", style: "closed" as const },
					{ id: "pi2", x: Math.PI / 2, y: 1, label: "(π/2,1)", color: "#FF0000", style: "closed" as const }
				],
				lines: [
					{
						id: "x-axis",
						equation: {
							type: "slopeIntercept" as const,
							slope: 0,
							yIntercept: 0
						},
						color: "#000000",
						style: "solid" as const
					}
				],
				polygons: null,
				distances: null,
				polylines: [
					{
						id: "sine-wave",
						points: Array.from({ length: 50 }, (_, i) => {
							const x = -2 * Math.PI + (i * (4 * Math.PI)) / 49
							return { x, y: Math.sin(x) }
						}),
						color: "#0000FF",
						style: "solid" as const
					},
					{
						id: "cosine-wave",
						points: Array.from({ length: 50 }, (_, i) => {
							const x = -2 * Math.PI + (i * (4 * Math.PI)) / 49
							return { x, y: Math.cos(x) }
						}),
						color: "#FF0000",
						style: "dashed" as const
					}
				]
			}
			expect(generateComprehensiveDiagram(props)).toMatchSnapshot()
		})

		test("should recreate QTI scale copy diagram with two diamond polygons", () => {
			const props = {
				type: "coordinatePlane" as const,
				width: 325,
				height: 325,
				xAxis: {
					label: "",
					min: 0,
					max: 16,
					tickInterval: 1,
					showGridLines: true
				},
				yAxis: {
					label: "",
					min: 0,
					max: 10,
					tickInterval: 1,
					showGridLines: true
				},
				showQuadrantLabels: false,
				points: [
					// Figure 1 (smaller blue diamond) vertices
					{ id: "M", x: 2, y: 4, label: "M", color: "#11accd", style: "closed" as const },
					{ id: "fig1_top", x: 3, y: 5.5, label: "", color: "#11accd", style: "closed" as const },
					{ id: "fig1_right", x: 5, y: 4, label: "", color: "#11accd", style: "closed" as const },
					{ id: "fig1_bottom", x: 3, y: 2.5, label: "", color: "#11accd", style: "closed" as const },

					// Figure 2 (larger green diamond) vertices
					{ id: "A", x: 8, y: 7, label: "A", color: "#1fab54", style: "closed" as const },
					{ id: "B", x: 12, y: 9, label: "B", color: "#1fab54", style: "closed" as const },
					{ id: "C", x: 16, y: 7, label: "C", color: "#1fab54", style: "closed" as const },
					{ id: "D", x: 12, y: 5, label: "D", color: "#1fab54", style: "closed" as const }
				],
				lines: null,
				polygons: [
					{
						vertices: ["M", "fig1_top", "fig1_right", "fig1_bottom"],
						isClosed: true,
						fillColor: "rgba(17, 172, 205, 0.15)",
						strokeColor: "#11accd",
						label: "Figure 1"
					},
					{
						vertices: ["A", "B", "C", "D"],
						isClosed: true,
						fillColor: "rgba(31, 171, 84, 0.15)",
						strokeColor: "#1fab54",
						label: "Figure 2"
					}
				],
				distances: null,
				polylines: null
			}
			expect(generateComprehensiveDiagram(props)).toMatchSnapshot()
		})
	})
})
