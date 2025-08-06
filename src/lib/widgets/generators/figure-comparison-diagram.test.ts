import { describe, expect, test } from "bun:test"
import { FigureComparisonDiagramPropsSchema, generateFigureComparisonDiagram } from "./figure-comparison-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = FigureComparisonDiagramPropsSchema.parse(props)
	return generateFigureComparisonDiagram(parsedProps)
}

describe("generateFigureComparisonDiagram", () => {
	describe("Scale Copies and Similarity Problems", () => {
		test("should render scale copies of parallelograms like Perseus example", () => {
			const props = {
				type: "figureComparisonDiagram" as const,
				width: 400,
				height: 220,
				layout: "horizontal" as const,
				spacing: 60,
				figures: [
					{
						// Figure A - smaller parallelogram (blue)
						vertices: [
							{ x: 0, y: 50 }, // Bottom left
							{ x: 37.5, y: 0 }, // Top left (offset for parallelogram)
							{ x: 137.5, y: 0 }, // Top right
							{ x: 100, y: 50 } // Bottom right
						],
						fillColor: null,
						strokeColor: "#11accd", // Blue like Perseus
						strokeWidth: 2,
						sideLabels: ["10", null, "16", null], // Bottom and top sides labeled
						sideLabelOffset: 15,
						figureLabel: {
							text: "Figure A",
							position: "bottom" as const,
							offset: 25
						}
					},
					{
						// Figure B - larger parallelogram (green)
						vertices: [
							{ x: 0, y: 62.5 }, // Bottom left
							{ x: 46.875, y: 0 }, // Top left (offset for parallelogram)
							{ x: 171.875, y: 0 }, // Top right
							{ x: 125, y: 62.5 } // Bottom right
						],
						fillColor: null,
						strokeColor: "#1fab54", // Green like Perseus
						strokeWidth: 2,
						sideLabels: ["12.5", null, "x", null], // Bottom and top sides labeled
						sideLabelOffset: 15,
						figureLabel: {
							text: "Figure B",
							position: "bottom" as const,
							offset: 25
						}
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render two triangles for similarity comparison", () => {
			const props = {
				type: "figureComparisonDiagram" as const,
				width: 350,
				height: 200,
				layout: "horizontal" as const,
				spacing: 40,
				figures: [
					{
						// Small triangle
						vertices: [
							{ x: 0, y: 60 },
							{ x: 40, y: 60 },
							{ x: 20, y: 20 }
						],
						fillColor: "rgba(255, 165, 0, 0.3)",
						strokeColor: "#ff8c00",
						strokeWidth: 2,
						sideLabels: ["4", "3", "5"],
						sideLabelOffset: 12,
						figureLabel: {
							text: "Triangle P",
							position: "bottom" as const,
							offset: 20
						}
					},
					{
						// Large triangle (scaled by factor of 2)
						vertices: [
							{ x: 0, y: 80 },
							{ x: 80, y: 80 },
							{ x: 40, y: 0 }
						],
						fillColor: "rgba(135, 206, 235, 0.3)",
						strokeColor: "#4682b4",
						strokeWidth: 2,
						sideLabels: ["8", "6", "10"],
						sideLabelOffset: 12,
						figureLabel: {
							text: "Triangle Q",
							position: "bottom" as const,
							offset: 20
						}
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rectangles in vertical layout with different proportions", () => {
			const props = {
				type: "figureComparisonDiagram" as const,
				width: 300,
				height: 400,
				layout: "vertical" as const,
				spacing: 30,
				figures: [
					{
						// Original rectangle
						vertices: [
							{ x: 0, y: 0 },
							{ x: 60, y: 0 },
							{ x: 60, y: 40 },
							{ x: 0, y: 40 }
						],
						fillColor: "rgba(144, 238, 144, 0.4)",
						strokeColor: "#32cd32",
						strokeWidth: 2,
						sideLabels: ["6", "4", "6", "4"],
						sideLabelOffset: 10,
						figureLabel: {
							text: "Original",
							position: "top" as const,
							offset: 15
						}
					},
					{
						// Scaled rectangle (1.5x)
						vertices: [
							{ x: 0, y: 0 },
							{ x: 90, y: 0 },
							{ x: 90, y: 60 },
							{ x: 0, y: 60 }
						],
						fillColor: "rgba(255, 182, 193, 0.4)",
						strokeColor: "#dc143c",
						strokeWidth: 2,
						sideLabels: ["9", "6", "9", "6"],
						sideLabelOffset: 10,
						figureLabel: {
							text: "Scaled",
							position: "top" as const,
							offset: 15
						}
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render pentagons with proportional side lengths", () => {
			const props = {
				type: "figureComparisonDiagram" as const,
				width: 450,
				height: 250,
				layout: "horizontal" as const,
				spacing: 50,
				figures: [
					{
						// Regular pentagon - smaller
						vertices: [
							{ x: 30, y: 0 }, // Top
							{ x: 58.5, y: 21.4 }, // Top right
							{ x: 48.5, y: 56.3 }, // Bottom right
							{ x: 11.5, y: 56.3 }, // Bottom left
							{ x: 1.5, y: 21.4 } // Top left
						],
						fillColor: "rgba(255, 215, 0, 0.4)",
						strokeColor: "#ffa500",
						strokeWidth: 2,
						sideLabels: ["3", "3", "3", "3", "3"],
						sideLabelOffset: 12,
						figureLabel: {
							text: "Pentagon A",
							position: "bottom" as const,
							offset: 20
						}
					},
					{
						// Regular pentagon - larger (2x scale)
						vertices: [
							{ x: 60, y: 0 }, // Top
							{ x: 117, y: 42.8 }, // Top right
							{ x: 97, y: 112.6 }, // Bottom right
							{ x: 23, y: 112.6 }, // Bottom left
							{ x: 3, y: 42.8 } // Top left
						],
						fillColor: "rgba(147, 112, 219, 0.4)",
						strokeColor: "#9370db",
						strokeWidth: 2,
						sideLabels: ["6", "6", "6", "6", "6"],
						sideLabelOffset: 12,
						figureLabel: {
							text: "Pentagon B",
							position: "bottom" as const,
							offset: 20
						}
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Layout and Positioning", () => {
		test("should render single figure centered", () => {
			const props = {
				type: "figureComparisonDiagram" as const,
				width: 250,
				height: 200,
				layout: "horizontal" as const,
				spacing: 0,
				figures: [
					{
						vertices: [
							{ x: 0, y: 0 },
							{ x: 50, y: 0 },
							{ x: 50, y: 50 },
							{ x: 0, y: 50 }
						],
						fillColor: "rgba(173, 216, 230, 0.5)",
						strokeColor: "#4169e1",
						strokeWidth: 2,
						sideLabels: ["5", "5", "5", "5"],
						sideLabelOffset: 12,
						figureLabel: {
							text: "Square",
							position: "center" as const,
							offset: 0
						}
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render three figures horizontally", () => {
			const props = {
				type: "figureComparisonDiagram" as const,
				width: 500,
				height: 180,
				layout: "horizontal" as const,
				spacing: 30,
				figures: [
					{
						// Small triangle
						vertices: [
							{ x: 0, y: 40 },
							{ x: 30, y: 40 },
							{ x: 15, y: 10 }
						],
						fillColor: "rgba(255, 99, 71, 0.3)",
						strokeColor: "#ff6347",
						strokeWidth: 2,
						sideLabels: ["2", "2", "2"],
						sideLabelOffset: 8,
						figureLabel: {
							text: "Small",
							position: "bottom" as const,
							offset: 15
						}
					},
					{
						// Medium triangle
						vertices: [
							{ x: 0, y: 60 },
							{ x: 45, y: 60 },
							{ x: 22.5, y: 15 }
						],
						fillColor: "rgba(60, 179, 113, 0.3)",
						strokeColor: "#3cb371",
						strokeWidth: 2,
						sideLabels: ["3", "3", "3"],
						sideLabelOffset: 10,
						figureLabel: {
							text: "Medium",
							position: "bottom" as const,
							offset: 18
						}
					},
					{
						// Large triangle
						vertices: [
							{ x: 0, y: 80 },
							{ x: 60, y: 80 },
							{ x: 30, y: 20 }
						],
						fillColor: "rgba(147, 112, 219, 0.3)",
						strokeColor: "#9370db",
						strokeWidth: 2,
						sideLabels: ["4", "4", "4"],
						sideLabelOffset: 12,
						figureLabel: {
							text: "Large",
							position: "bottom" as const,
							offset: 20
						}
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should handle figures with no labels", () => {
			const props = {
				type: "figureComparisonDiagram" as const,
				width: 300,
				height: 150,
				layout: "horizontal" as const,
				spacing: 40,
				figures: [
					{
						vertices: [
							{ x: 0, y: 0 },
							{ x: 40, y: 0 },
							{ x: 40, y: 30 },
							{ x: 0, y: 30 }
						],
						fillColor: "rgba(255, 182, 193, 0.5)",
						strokeColor: "#ff69b4",
						strokeWidth: 2,
						sideLabels: null,
						sideLabelOffset: 10,
						figureLabel: null
					},
					{
						vertices: [
							{ x: 0, y: 0 },
							{ x: 60, y: 0 },
							{ x: 60, y: 45 },
							{ x: 0, y: 45 }
						],
						fillColor: "rgba(144, 238, 144, 0.5)",
						strokeColor: "#90ee90",
						strokeWidth: 2,
						sideLabels: null,
						sideLabelOffset: 10,
						figureLabel: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Edge Cases and Scaling", () => {
		test("should handle very large figures with automatic scaling", () => {
			const props = {
				type: "figureComparisonDiagram" as const,
				width: 300,
				height: 200,
				layout: "horizontal" as const,
				spacing: 20,
				figures: [
					{
						vertices: [
							{ x: 0, y: 0 },
							{ x: 200, y: 0 },
							{ x: 200, y: 150 },
							{ x: 0, y: 150 }
						],
						fillColor: "rgba(255, 165, 0, 0.3)",
						strokeColor: "#ffa500",
						strokeWidth: 3,
						sideLabels: ["200", "150", "200", "150"],
						sideLabelOffset: 20,
						figureLabel: {
							text: "Large Rectangle",
							position: "center" as const,
							offset: 0
						}
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should handle complex irregular polygons", () => {
			const props = {
				type: "figureComparisonDiagram" as const,
				width: 400,
				height: 250,
				layout: "horizontal" as const,
				spacing: 30,
				figures: [
					{
						// Irregular hexagon
						vertices: [
							{ x: 25, y: 0 },
							{ x: 50, y: 15 },
							{ x: 60, y: 40 },
							{ x: 40, y: 60 },
							{ x: 10, y: 55 },
							{ x: 0, y: 25 }
						],
						fillColor: "rgba(255, 20, 147, 0.3)",
						strokeColor: "#ff1493",
						strokeWidth: 2,
						sideLabels: ["a", "b", "c", "d", "e", "f"],
						sideLabelOffset: 12,
						figureLabel: {
							text: "Hexagon 1",
							position: "bottom" as const,
							offset: 18
						}
					},
					{
						// Similar hexagon, scaled
						vertices: [
							{ x: 37.5, y: 0 },
							{ x: 75, y: 22.5 },
							{ x: 90, y: 60 },
							{ x: 60, y: 90 },
							{ x: 15, y: 82.5 },
							{ x: 0, y: 37.5 }
						],
						fillColor: "rgba(0, 191, 255, 0.3)",
						strokeColor: "#00bfff",
						strokeWidth: 2,
						sideLabels: ["1.5a", "1.5b", "1.5c", "1.5d", "1.5e", "1.5f"],
						sideLabelOffset: 12,
						figureLabel: {
							text: "Hexagon 2",
							position: "bottom" as const,
							offset: 18
						}
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should handle minimal triangle", () => {
			const props = {
				type: "figureComparisonDiagram" as const,
				width: 200,
				height: 150,
				layout: "horizontal" as const,
				spacing: 0,
				figures: [
					{
						vertices: [
							{ x: 0, y: 30 },
							{ x: 30, y: 30 },
							{ x: 15, y: 0 }
						],
						fillColor: null,
						strokeColor: null,
						strokeWidth: null,
						sideLabels: null,
						sideLabelOffset: null,
						figureLabel: null
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
