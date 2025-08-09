import { describe, expect, test } from "bun:test"
import { CircleDiagramPropsSchema, generateCircleDiagram } from "./circle-diagram"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = CircleDiagramPropsSchema.parse(props)
	return generateCircleDiagram(parsedProps)
}

describe("generateCircleDiagram", () => {
	describe("Basic Circle Configurations", () => {
		test("should render simple circle with default properties", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 250,
				height: 250,
				radius: 80,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render filled circle with custom colors", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 100,
				fillColor: "rgba(100, 181, 246, 0.5)",
				strokeColor: "#1976D2",
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render circle without center dot", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 200,
				height: 200,
				radius: 60,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: false,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render circle with area label", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 90,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "A = πr²"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Concentric Circles and Annulus", () => {
		test("should render concentric circles without annulus fill", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 350,
				height: 350,
				radius: 120,
				fillColor: null,
				strokeColor: "black",
				innerRadius: 60,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render annulus with custom fill color", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 400,
				height: 400,
				radius: 140,
				fillColor: null,
				strokeColor: "black",
				innerRadius: 80,
				annulusFillColor: "rgba(255, 193, 7, 0.6)",
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Ring Area"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render thin annulus", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: 85,
				annulusFillColor: "rgba(76, 175, 80, 0.7)",
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render thick annulus", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 350,
				height: 350,
				radius: 120,
				fillColor: null,
				strokeColor: null,
				innerRadius: 40,
				annulusFillColor: "rgba(156, 39, 176, 0.5)",
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Radius and Diameter Segments", () => {
		test("should render single radius", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: "r",
						color: null,
						angle: null
					}
				],
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render multiple radii at different angles", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 350,
				height: 350,
				radius: 110,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: "r₁",
						color: "#D32F2F",
						angle: 0
					},
					{
						type: "radius" as const,
						label: "r₂",
						color: "#1976D2",
						angle: 90
					},
					{
						type: "radius" as const,
						label: "r₃",
						color: "#388E3C",
						angle: 180
					},
					{
						type: "radius" as const,
						label: "r₄",
						color: "#F57C00",
						angle: 270
					}
				],
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render diameter", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 320,
				height: 320,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "diameter" as const,
						label: "d",
						color: "#7B1FA2",
						angle: 30
					}
				],
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render multiple diameters", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 380,
				height: 380,
				radius: 120,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "diameter" as const,
						label: "d₁",
						color: "#D32F2F",
						angle: 0
					},
					{
						type: "diameter" as const,
						label: "d₂",
						color: "#1976D2",
						angle: 45
					}
				],
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render radii and diameters together", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 400,
				height: 400,
				radius: 130,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: "r",
						color: "#D32F2F",
						angle: 30
					},
					{
						type: "diameter" as const,
						label: "d",
						color: "#1976D2",
						angle: 60
					}
				],
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render segments without labels", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 90,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: null,
						color: "#FF5722",
						angle: 45
					},
					{
						type: "diameter" as const,
						label: null,
						color: "#9C27B0",
						angle: 120
					}
				],
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Sectors (Pie Slices)", () => {
		test("should render single sector", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 90,
						fillColor: null,
						label: "90°",
						showRightAngleMarker: false
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render quarter circle with right angle marker", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 320,
				height: 320,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 90,
						fillColor: "rgba(76, 175, 80, 0.6)",
						label: "90°",
						showRightAngleMarker: true
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render semicircle", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 350,
				height: 350,
				radius: 110,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 180,
						fillColor: "rgba(255, 193, 7, 0.7)",
						label: "180°",
						showRightAngleMarker: false
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render multiple sectors", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 380,
				height: 380,
				radius: 120,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 120,
						fillColor: "rgba(244, 67, 54, 0.6)",
						label: "120°",
						showRightAngleMarker: false
					},
					{
						startAngle: 120,
						endAngle: 240,
						fillColor: "rgba(33, 150, 243, 0.6)",
						label: "120°",
						showRightAngleMarker: false
					},
					{
						startAngle: 240,
						endAngle: 360,
						fillColor: "rgba(76, 175, 80, 0.6)",
						label: "120°",
						showRightAngleMarker: false
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render pie chart representation", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 400,
				height: 400,
				radius: 130,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 144,
						fillColor: "rgba(244, 67, 54, 0.8)",
						label: "40%",
						showRightAngleMarker: false
					},
					{
						startAngle: 144,
						endAngle: 252,
						fillColor: "rgba(33, 150, 243, 0.8)",
						label: "30%",
						showRightAngleMarker: false
					},
					{
						startAngle: 252,
						endAngle: 324,
						fillColor: "rgba(76, 175, 80, 0.8)",
						label: "20%",
						showRightAngleMarker: false
					},
					{
						startAngle: 324,
						endAngle: 360,
						fillColor: "rgba(255, 193, 7, 0.8)",
						label: "10%",
						showRightAngleMarker: false
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render sectors without labels", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 90,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 60,
						fillColor: "rgba(156, 39, 176, 0.7)",
						label: null,
						showRightAngleMarker: false
					},
					{
						startAngle: 180,
						endAngle: 270,
						fillColor: "rgba(255, 87, 34, 0.7)",
						label: null,
						showRightAngleMarker: true
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Arcs", () => {
		test("should render single arc", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: [
					{
						startAngle: 30,
						endAngle: 120,
						strokeColor: null,
						label: "Arc"
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render multiple arcs with different colors", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 350,
				height: 350,
				radius: 110,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: [
					{
						startAngle: 0,
						endAngle: 90,
						strokeColor: "#F44336",
						label: "Arc 1"
					},
					{
						startAngle: 180,
						endAngle: 270,
						strokeColor: "#2196F3",
						label: "Arc 2"
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render major arc (greater than 180°)", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 380,
				height: 380,
				radius: 120,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: [
					{
						startAngle: 45,
						endAngle: 315,
						strokeColor: "#9C27B0",
						label: "Major Arc"
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render arcs without labels", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 90,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: [
					{
						startAngle: 60,
						endAngle: 150,
						strokeColor: "#FF5722",
						label: null
					},
					{
						startAngle: 210,
						endAngle: 300,
						strokeColor: "#607D8B",
						label: null
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render semicircular arc", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 350,
				height: 350,
				radius: 110,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: [
					{
						startAngle: 0,
						endAngle: 180,
						strokeColor: "#4CAF50",
						label: "Semicircle"
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Complex Combinations", () => {
		test("should render circle with all elements combined", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 450,
				height: 450,
				radius: 150,
				fillColor: "rgba(224, 224, 224, 0.3)",
				strokeColor: "black",
				innerRadius: 75,
				annulusFillColor: "rgba(255, 235, 59, 0.4)",
				segments: [
					{
						type: "radius" as const,
						label: "r",
						color: "#D32F2F",
						angle: 0
					},
					{
						type: "diameter" as const,
						label: "d",
						color: "#1976D2",
						angle: 45
					}
				],
				sectors: [
					{
						startAngle: 90,
						endAngle: 180,
						fillColor: "rgba(76, 175, 80, 0.6)",
						label: "90°",
						showRightAngleMarker: true
					}
				],
				arcs: [
					{
						startAngle: 270,
						endAngle: 360,
						strokeColor: "#9C27B0",
						label: "Arc"
					}
				],
				showCenterDot: true,
				areaLabel: "Circle"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render geometry problem setup", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 400,
				height: 400,
				radius: 130,
				fillColor: null,
				strokeColor: "black",
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: "5cm",
						color: "#D32F2F",
						angle: 0
					},
					{
						type: "radius" as const,
						label: null,
						color: "#D32F2F",
						angle: 60
					}
				],
				sectors: [
					{
						startAngle: 0,
						endAngle: 60,
						fillColor: "rgba(100, 181, 246, 0.5)",
						label: "60°",
						showRightAngleMarker: false
					}
				],
				arcs: [
					{
						startAngle: 0,
						endAngle: 60,
						strokeColor: "#1976D2",
						label: "s"
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render fractional parts visualization", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 350,
				height: 350,
				radius: 110,
				fillColor: null,
				strokeColor: "black",
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 90,
						fillColor: "rgba(244, 67, 54, 0.7)",
						label: "1/4",
						showRightAngleMarker: false
					},
					{
						startAngle: 90,
						endAngle: 180,
						fillColor: "rgba(33, 150, 243, 0.7)",
						label: "1/4",
						showRightAngleMarker: false
					},
					{
						startAngle: 180,
						endAngle: 270,
						fillColor: "rgba(76, 175, 80, 0.7)",
						label: "1/4",
						showRightAngleMarker: false
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: "3/4"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render concentric circles with sectors", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 400,
				height: 400,
				radius: 140,
				fillColor: null,
				strokeColor: "black",
				innerRadius: 70,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 120,
						fillColor: "rgba(244, 67, 54, 0.5)",
						label: "Outer",
						showRightAngleMarker: false
					},
					{
						startAngle: 180,
						endAngle: 270,
						fillColor: "rgba(33, 150, 243, 0.5)",
						label: "Inner",
						showRightAngleMarker: false
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Canvas and Sizing", () => {
		test("should render with custom large dimensions", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 600,
				height: 500,
				radius: 180,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: "r",
						color: null,
						angle: null
					}
				],
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Large Circle"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with small dimensions", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 150,
				height: 150,
				radius: 40,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 90,
						fillColor: null,
						label: "90°",
						showRightAngleMarker: false
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with square canvas", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 400,
				height: 400,
				radius: 150,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Square Canvas"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with rectangular canvas (wide)", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 500,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Wide Canvas"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with rectangular canvas (tall)", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 500,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Tall Canvas"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Edge Cases and Special Configurations", () => {
		test("should render very small radius", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 200,
				height: 200,
				radius: 10,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Tiny"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render very large radius", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 400,
				height: 400,
				radius: 500,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Huge"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render complete circle arc (360°)", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 90,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: [
					{
						startAngle: 0,
						endAngle: 360,
						strokeColor: "#E91E63",
						label: "360°"
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render tiny arc", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: [
					{
						startAngle: 85,
						endAngle: 95,
						strokeColor: "#795548",
						label: "10°"
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render segments at extreme angles", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 350,
				height: 350,
				radius: 110,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: "0°",
						color: "#F44336",
						angle: 0
					},
					{
						type: "radius" as const,
						label: "359°",
						color: "#4CAF50",
						angle: 359
					}
				],
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with inner radius almost equal to outer radius", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: 98,
				annulusFillColor: "rgba(255, 87, 34, 0.8)",
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Thin Ring"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Semicircle and Quarter Circle Shapes", () => {
		test("should render basic semicircle", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "semicircle" as const,
				rotation: null, // defaults to 0
				width: 300,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render filled semicircle with custom color", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "semicircle" as const,
				rotation: 0,
				width: 350,
				height: 350,
				radius: 120,
				fillColor: "rgba(100, 181, 246, 0.5)",
				strokeColor: "#1976D2",
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "A = πr²/2"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotated semicircle at 90 degrees", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "semicircle" as const,
				rotation: 90,
				width: 300,
				height: 300,
				radius: 100,
				fillColor: "rgba(76, 175, 80, 0.5)",
				strokeColor: "black",
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotated semicircle at 180 degrees", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "semicircle" as const,
				rotation: 180,
				width: 320,
				height: 320,
				radius: 110,
				fillColor: null,
				strokeColor: "#D32F2F",
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: false,
				areaLabel: "Upper Half"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotated semicircle at 270 degrees", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "semicircle" as const,
				rotation: 270,
				width: 300,
				height: 300,
				radius: 90,
				fillColor: "rgba(255, 193, 7, 0.6)",
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render basic quarter circle", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "quarter-circle" as const,
				rotation: null, // defaults to 0
				width: 250,
				height: 250,
				radius: 80,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render filled quarter circle with custom color", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "quarter-circle" as const,
				rotation: 0,
				width: 300,
				height: 300,
				radius: 100,
				fillColor: "rgba(244, 67, 54, 0.5)",
				strokeColor: "#C62828",
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "A = πr²/4"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotated quarter circle at 90 degrees", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "quarter-circle" as const,
				rotation: 90,
				width: 280,
				height: 280,
				radius: 90,
				fillColor: "rgba(33, 150, 243, 0.5)",
				strokeColor: "black",
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotated quarter circle at 180 degrees", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "quarter-circle" as const,
				rotation: 180,
				width: 300,
				height: 300,
				radius: 100,
				fillColor: "rgba(76, 175, 80, 0.5)",
				strokeColor: "#388E3C",
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: false,
				areaLabel: "Q3"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotated quarter circle at 270 degrees", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "quarter-circle" as const,
				rotation: 270,
				width: 320,
				height: 320,
				radius: 110,
				fillColor: "rgba(156, 39, 176, 0.5)",
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render semicircle with radius segment", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "semicircle" as const,
				rotation: 0,
				width: 350,
				height: 350,
				radius: 120,
				fillColor: null,
				strokeColor: "black",
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: "r",
						color: "#D32F2F",
						angle: 90
					}
				],
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render quarter circle with radius segments", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "quarter-circle" as const,
				rotation: 0,
				width: 300,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: "black",
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: "r₁",
						color: "#D32F2F",
						angle: 0
					},
					{
						type: "radius" as const,
						label: "r₂",
						color: "#1976D2",
						angle: 90
					}
				],
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render semicircle with arc", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "semicircle" as const,
				rotation: 0,
				width: 380,
				height: 380,
				radius: 130,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: [
					{
						startAngle: 45,
						endAngle: 135,
						strokeColor: "#9C27B0",
						label: "Arc"
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render quarter circle with arc", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "quarter-circle" as const,
				rotation: 0,
				width: 300,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: [
					{
						startAngle: 30,
						endAngle: 60,
						strokeColor: "#FF5722",
						label: "30°"
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render semicircle with sectors", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "semicircle" as const,
				rotation: 0,
				width: 400,
				height: 400,
				radius: 140,
				fillColor: null,
				strokeColor: "black",
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 60,
						fillColor: "rgba(244, 67, 54, 0.6)",
						label: "60°",
						showRightAngleMarker: false
					},
					{
						startAngle: 120,
						endAngle: 180,
						fillColor: "rgba(33, 150, 243, 0.6)",
						label: "60°",
						showRightAngleMarker: false
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render quarter circle with right angle sector", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "quarter-circle" as const,
				rotation: 0,
				width: 320,
				height: 320,
				radius: 110,
				fillColor: "rgba(224, 224, 224, 0.3)",
				strokeColor: "black",
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: [
					{
						startAngle: 0,
						endAngle: 90,
						fillColor: "rgba(76, 175, 80, 0.7)",
						label: "90°",
						showRightAngleMarker: true
					}
				],
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotated semicircle at 45 degrees with multiple elements", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "semicircle" as const,
				rotation: 45,
				width: 420,
				height: 420,
				radius: 150,
				fillColor: "rgba(255, 235, 59, 0.3)",
				strokeColor: "black",
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: "r",
						color: "#D32F2F",
						angle: 45
					},
					{
						type: "diameter" as const,
						label: "d",
						color: "#1976D2",
						angle: 45
					}
				],
				sectors: [
					{
						startAngle: 45,
						endAngle: 135,
						fillColor: "rgba(156, 39, 176, 0.5)",
						label: "90°",
						showRightAngleMarker: true
					}
				],
				arcs: [
					{
						startAngle: 135,
						endAngle: 225,
						strokeColor: "#FF5722",
						label: "Arc"
					}
				],
				showCenterDot: true,
				areaLabel: "Rotated"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render rotated quarter circle at 45 degrees with elements", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "quarter-circle" as const,
				rotation: 45,
				width: 350,
				height: 350,
				radius: 120,
				fillColor: null,
				strokeColor: "black",
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: "5cm",
						color: "#4CAF50",
						angle: 45
					}
				],
				sectors: null,
				arcs: [
					{
						startAngle: 45,
						endAngle: 90,
						strokeColor: "#2196F3",
						label: "45°"
					}
				],
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render default shape (circle) when shape is null", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null,
				width: 300,
				height: 300,
				radius: 100,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Default Circle"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render semicircle in non-square canvas", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "semicircle" as const,
				rotation: 0,
				width: 400,
				height: 250,
				radius: 100,
				fillColor: "rgba(100, 181, 246, 0.5)",
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render quarter circle in non-square canvas", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: "quarter-circle" as const,
				rotation: 0,
				width: 250,
				height: 400,
				radius: 100,
				fillColor: "rgba(76, 175, 80, 0.5)",
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Default Values", () => {
		test("should render with width null (defaults to 250)", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: null,
				height: 250,
				radius: 80,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Default Width"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with height null (defaults to 250)", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: 250,
				height: null,
				radius: 80,
				fillColor: null,
				strokeColor: null,
				innerRadius: null,
				annulusFillColor: null,
				segments: null,
				sectors: null,
				arcs: null,
				showCenterDot: true,
				areaLabel: "Default Height"
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with all default properties", () => {
			const props = {
				type: "circleDiagram" as const,
				shape: null, // defaults to "circle"
				rotation: null, // defaults to 0
				width: null, // defaults to 250
				height: null, // defaults to 250
				radius: 100,
				fillColor: null, // defaults to "none"
				strokeColor: null, // defaults to "black"
				innerRadius: null,
				annulusFillColor: null,
				segments: [
					{
						type: "radius" as const,
						label: null,
						color: null, // defaults to "#4A4A4A"
						angle: null // defaults to 0
					}
				],
				sectors: [
					{
						startAngle: 0,
						endAngle: 90,
						fillColor: null, // defaults to "rgba(100, 181, 246, 0.5)"
						label: null,
						showRightAngleMarker: false // defaults to false
					}
				],
				arcs: [
					{
						startAngle: 180,
						endAngle: 270,
						strokeColor: null, // defaults to "#D32F2F"
						label: null
					}
				],
				showCenterDot: true, // defaults to true
				areaLabel: null
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
