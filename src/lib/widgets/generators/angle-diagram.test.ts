import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import {
	AngleDiagramPropsSchema,
	findLineIntersection,
	generateAngleDiagram
} from "@/lib/widgets/generators/angle-diagram"

// helper to adapt legacy props (used across tests) to the new discriminated union schema
// - labels null -> ""
// - shapes null -> "circle"
// - angles: isRightAngle -> type 'right'; otherwise type 'arc'
// - provide defaults for color and radius expected by schema

type LegacyPoint = { id: string; x: number; y: number; label: string | null; shape: string | null }
type LegacyAngle = {
	vertices?: string[]
	label: string | null
	color: string | null
	radius: number | null
	isRightAngle: boolean
}

type LegacyPropsBase = {
	width: number
	height: number
	points?: unknown[] | null
	rays?: { from: string; to: string }[] | null
	angles?: unknown[] | null
}

const isLegacyPoint = (v: unknown): v is LegacyPoint => {
	if (typeof v !== "object" || v === null) return false
	const idVal = Reflect.get(v, "id")
	const xVal = Reflect.get(v, "x")
	const yVal = Reflect.get(v, "y")
	const labelVal = Reflect.get(v, "label")
	const shapeVal = Reflect.get(v, "shape")
	if (typeof idVal !== "string") return false
	if (typeof xVal !== "number") return false
	if (typeof yVal !== "number") return false
	if (!(typeof labelVal === "string" || labelVal === null)) return false
	if (!(typeof shapeVal === "string" || shapeVal === null)) return false
	return true
}

const isLegacyAngle = (v: unknown): v is LegacyAngle => {
	if (typeof v !== "object" || v === null) return false
	const verticesVal = Reflect.get(v, "vertices")
	const labelVal = Reflect.get(v, "label")
	const colorVal = Reflect.get(v, "color")
	const radiusVal = Reflect.get(v, "radius")
	const isRightAngleVal = Reflect.get(v, "isRightAngle")
	if (!(verticesVal === undefined || Array.isArray(verticesVal))) return false
	if (!(typeof labelVal === "string" || labelVal === null)) return false
	if (!(typeof colorVal === "string" || colorVal === null)) return false
	if (!(typeof radiusVal === "number" || radiusVal === null)) return false
	if (typeof isRightAngleVal !== "boolean") return false
	return true
}

function adaptProps<T extends LegacyPropsBase>(props: T): Record<string, unknown> {
	const rawPoints: unknown[] = Array.isArray(props.points) ? props.points : []
	const points = rawPoints.filter(isLegacyPoint).map((p) => ({
		id: p.id,
		x: p.x,
		y: p.y,
		label: p.label == null ? "" : p.label,
		shape: p.shape == null ? "circle" : p.shape
	}))

	const rawAngles: unknown[] = Array.isArray(props.angles) ? props.angles : []
	const angles = rawAngles.filter(isLegacyAngle).map((a) => {
		const vertices = Array.isArray(a.vertices) ? a.vertices : []
		const label = a.label == null ? "" : a.label
		const color = a.color == null ? "rgba(217, 95, 79, 0.8)" : a.color
		if (a.isRightAngle) return { type: "right", vertices, label, color } as const
		const radius = a.radius == null ? 30 : a.radius
		return { type: "arc", vertices, label, color, radius } as const
	})

	return {
		type: "angleDiagram",
		width: props.width,
		height: props.height,
		points,
		rays: Array.isArray(props.rays) ? props.rays : [],
		angles
	}
}

// helper function to generate diagram with schema validation (safeParse)
const generateDiagram = (rawProps: LegacyPropsBase) => {
	const adapted = adaptProps(rawProps)
	const result = AngleDiagramPropsSchema.safeParse(adapted)
	if (!result.success) {
		throw errors.wrap(result.error, "angle diagram props validation")
	}
	return generateAngleDiagram(result.data)
}

describe("generateAngleDiagram", () => {
	describe("Basic Angle Configurations", () => {
		test("should render single angle with three points", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 150, label: "A", shape: null },
					{ id: "B", x: 150, y: 150, label: "B", shape: null },
					{ id: "C", x: 250, y: 100, label: "C", shape: null }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "∠ABC",
						color: null,
						radius: null,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render right angle with square marker", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "P", x: 100, y: 200, label: "P", shape: null },
					{ id: "Q", x: 200, y: 200, label: "Q", shape: null },
					{ id: "R", x: 200, y: 100, label: "R", shape: null }
				],
				rays: [
					{ from: "Q", to: "P" },
					{ from: "Q", to: "R" }
				],
				angles: [
					{
						vertices: ["P", "Q", "R"],
						label: "90°",
						color: null,
						radius: null,
						isRightAngle: true
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render acute angle with custom color", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "X", x: 80, y: 180, label: "X", shape: null },
					{ id: "Y", x: 180, y: 180, label: "Y", shape: null },
					{ id: "Z", x: 220, y: 120, label: "Z", shape: null }
				],
				rays: [
					{ from: "Y", to: "X" },
					{ from: "Y", to: "Z" }
				],
				angles: [
					{
						vertices: ["X", "Y", "Z"],
						label: "45°",
						color: "rgba(66, 133, 244, 0.8)",
						radius: null,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render obtuse angle with custom radius", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "M", x: 60, y: 150, label: "M", shape: null },
					{ id: "N", x: 160, y: 150, label: "N", shape: null },
					{ id: "O", x: 220, y: 200, label: "O", shape: null }
				],
				rays: [
					{ from: "N", to: "M" },
					{ from: "N", to: "O" }
				],
				angles: [
					{
						vertices: ["M", "N", "O"],
						label: "120°",
						color: null,
						radius: 50,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Multiple Angles", () => {
		test("should render two adjacent angles", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 150, label: "A", shape: null },
					{ id: "B", x: 150, y: 150, label: "B", shape: null },
					{ id: "C", x: 250, y: 100, label: "C", shape: null },
					{ id: "D", x: 250, y: 200, label: "D", shape: null }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" },
					{ from: "B", to: "D" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "α",
						color: "rgba(217, 95, 79, 0.8)",
						radius: null,
						isRightAngle: false
					},
					{
						vertices: ["C", "B", "D"],
						label: "β",
						color: "rgba(66, 133, 244, 0.8)",
						radius: null,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render vertical angles", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 50, y: 100, label: "A", shape: null },
					{ id: "B", x: 200, y: 150, label: "B", shape: null },
					{ id: "C", x: 350, y: 200, label: "C", shape: null },
					{ id: "D", x: 50, y: 200, label: "D", shape: null },
					{ id: "E", x: 350, y: 100, label: "E", shape: null }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" },
					{ from: "B", to: "D" },
					{ from: "B", to: "E" }
				],
				angles: [
					{
						vertices: ["A", "B", "D"],
						label: "x",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 25,
						isRightAngle: false
					},
					{
						vertices: ["C", "B", "E"],
						label: "x",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 25,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render complementary angles", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "P", x: 100, y: 200, label: "P", shape: null },
					{ id: "Q", x: 200, y: 200, label: "Q", shape: null },
					{ id: "R", x: 200, y: 100, label: "R", shape: null },
					{ id: "S", x: 250, y: 130, label: "S", shape: null }
				],
				rays: [
					{ from: "Q", to: "P" },
					{ from: "Q", to: "R" },
					{ from: "Q", to: "S" }
				],
				angles: [
					{
						vertices: ["P", "Q", "S"],
						label: "30°",
						color: "rgba(76, 175, 80, 0.6)",
						radius: null,
						isRightAngle: false
					},
					{
						vertices: ["S", "Q", "R"],
						label: "60°",
						color: "rgba(255, 193, 7, 0.6)",
						radius: null,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Complex Geometric Figures", () => {
		test("should render triangle with all interior angles", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 200, y: 50, label: "A", shape: null },
					{ id: "B", x: 100, y: 200, label: "B", shape: null },
					{ id: "C", x: 300, y: 200, label: "C", shape: null }
				],
				rays: [
					{ from: "A", to: "B" },
					{ from: "A", to: "C" },
					{ from: "B", to: "A" },
					{ from: "B", to: "C" },
					{ from: "C", to: "A" },
					{ from: "C", to: "B" }
				],
				angles: [
					{
						vertices: ["B", "A", "C"],
						label: "60°",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 25,
						isRightAngle: false
					},
					{
						vertices: ["A", "B", "C"],
						label: "60°",
						color: "rgba(66, 133, 244, 0.8)",
						radius: 25,
						isRightAngle: false
					},
					{
						vertices: ["A", "C", "B"],
						label: "60°",
						color: "rgba(76, 175, 80, 0.8)",
						radius: 25,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render parallel lines with transversal", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 500,
				height: 400,
				points: [
					{ id: "A", x: 50, y: 120, label: "A", shape: null },
					{ id: "B", x: 450, y: 120, label: "B", shape: null },
					{ id: "C", x: 50, y: 280, label: "C", shape: null },
					{ id: "D", x: 450, y: 280, label: "D", shape: null },
					{ id: "E", x: 150, y: 50, label: "E", shape: null },
					{ id: "F", x: 350, y: 350, label: "F", shape: null },
					{ id: "P", x: 200, y: 120, label: null, shape: null },
					{ id: "Q", x: 300, y: 280, label: null, shape: null }
				],
				rays: [
					{ from: "A", to: "B" },
					{ from: "C", to: "D" },
					{ from: "E", to: "F" }
				],
				angles: [
					{
						vertices: ["A", "P", "E"],
						label: "1",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 20,
						isRightAngle: false
					},
					{
						vertices: ["C", "Q", "F"],
						label: "1",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 20,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render parallel lines with multiple intersecting transversals and angles", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 600,
				height: 400,
				points: [
					// Central intersection point
					{ id: "A", x: 300, y: 200, label: "A", shape: null },
					// Bottom horizontal line points (D-A-E forms the bottom horizontal line)
					{ id: "D", x: 100, y: 200, label: "D", shape: null },
					{ id: "E", x: 500, y: 200, label: "E", shape: null },
					// Top horizontal line points (B-C forms the top horizontal line)
					{ id: "B", x: 150, y: 100, label: "B", shape: null },
					{ id: "C", x: 450, y: 100, label: "C", shape: null },
					// Bottom point for diagonal line
					// F is positioned so that F-A-C are collinear
					{ id: "F", x: 150, y: 300, label: "F", shape: null }
				],
				rays: [
					// Five rays emanating from central point A
					{ from: "A", to: "B" },
					{ from: "A", to: "C" },
					{ from: "A", to: "D" },
					{ from: "A", to: "E" },
					{ from: "A", to: "F" },
					// Top horizontal line (to show it extends beyond B)
					{ from: "B", to: "C" }
				],
				angles: [
					// 42° angle at B (green)
					{
						vertices: ["C", "B", "A"],
						label: "42°",
						color: "rgba(76, 175, 80, 0.8)",
						radius: 30,
						isRightAngle: false
					},
					// 105° angle at A (purple) - between rays AD and AF
					{
						vertices: ["D", "A", "F"],
						label: "105°",
						color: "rgba(156, 39, 176, 0.8)",
						radius: 30,
						isRightAngle: false
					},
					// x° angle at A (light blue) - between rays AE and AC
					{
						vertices: ["E", "A", "C"],
						label: "x°",
						color: "rgba(33, 150, 243, 0.8)",
						radius: 25,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Special Cases", () => {
		test("should render angle with algebraic label", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 80, y: 180, label: "A", shape: null },
					{ id: "B", x: 180, y: 180, label: "B", shape: null },
					{ id: "C", x: 250, y: 120, label: "C", shape: null }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "2x + 15°",
						color: null,
						radius: null,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render angle without label", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "X", x: 100, y: 150, label: "X", shape: null },
					{ id: "Y", x: 200, y: 150, label: "Y", shape: null },
					{ id: "Z", x: 300, y: 100, label: "Z", shape: null }
				],
				rays: [
					{ from: "Y", to: "X" },
					{ from: "Y", to: "Z" }
				],
				angles: [
					{
						vertices: ["X", "Y", "Z"],
						label: null,
						color: "rgba(156, 39, 176, 0.8)",
						radius: null,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render points without labels", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "P1", x: 100, y: 150, label: null, shape: null },
					{ id: "P2", x: 200, y: 150, label: null, shape: null },
					{ id: "P3", x: 300, y: 100, label: null, shape: null }
				],
				rays: [
					{ from: "P2", to: "P1" },
					{ from: "P2", to: "P3" }
				],
				angles: [
					{
						vertices: ["P1", "P2", "P3"],
						label: "θ",
						color: null,
						radius: null,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render reflex angle", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 100, y: 150, label: "A", shape: null },
					{ id: "B", x: 200, y: 150, label: "B", shape: null },
					{ id: "C", x: 180, y: 100, label: "C", shape: null }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "300°",
						color: "rgba(233, 30, 99, 0.8)",
						radius: 40,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Canvas and Sizing", () => {
		test("should render with custom canvas dimensions", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 600,
				height: 500,
				points: [
					{ id: "A", x: 150, y: 250, label: "A", shape: null },
					{ id: "B", x: 300, y: 250, label: "B", shape: null },
					{ id: "C", x: 450, y: 150, label: "C", shape: null }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "∠ABC",
						color: null,
						radius: null,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with small canvas dimensions", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 200,
				height: 150,
				points: [
					{ id: "A", x: 50, y: 75, label: "A", shape: null },
					{ id: "B", x: 100, y: 75, label: "B", shape: null },
					{ id: "C", x: 150, y: 50, label: "C", shape: null }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "45°",
						color: null,
						radius: 15,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Default Values", () => {
		test("should render with explicit width", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 100, y: 150, label: "A", shape: null },
					{ id: "B", x: 200, y: 150, label: "B", shape: null },
					{ id: "C", x: 300, y: 100, label: "C", shape: null }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "60°",
						color: null,
						radius: null,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with explicit height", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 100, y: 150, label: "A", shape: null },
					{ id: "B", x: 200, y: 150, label: "B", shape: null },
					{ id: "C", x: 300, y: 100, label: "C", shape: null }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "60°",
						color: null,
						radius: null,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render with all default angle properties", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 100, y: 150, label: "A", shape: null },
					{ id: "B", x: 200, y: 150, label: "B", shape: null },
					{ id: "C", x: 300, y: 100, label: "C", shape: null }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "Default",
						color: null, // Will default to "rgba(217, 95, 79, 0.8)"
						radius: null, // Will default to 30
						isRightAngle: false // Will default to false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render points with ellipse shape for Perseus compatibility", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 300,
				height: 200,
				points: [
					{ id: "A", x: 50, y: 100, label: "A", shape: "ellipse" as const },
					{ id: "B", x: 150, y: 100, label: "B", shape: "ellipse" as const },
					{ id: "C", x: 250, y: 80, label: "C", shape: "circle" as const }
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "x°",
						color: "#1fab54",
						radius: 25,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("Dynamic Angle Label Positioning", () => {
		test("should position labels correctly for very small angles without overlap", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 100, y: 200, label: "A", shape: null },
					{ id: "B", x: 200, y: 200, label: "B", shape: null },
					{ id: "C", x: 350, y: 205, label: "C", shape: null } // Very small angle (~2.9°)
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "3°",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 20,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should handle medium angle with normal positioning", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 400,
				height: 300,
				points: [
					{ id: "A", x: 100, y: 200, label: "A", shape: null },
					{ id: "B", x: 200, y: 200, label: "B", shape: null },
					{ id: "C", x: 270, y: 130, label: "C", shape: null } // ~45° angle
				],
				rays: [
					{ from: "B", to: "A" },
					{ from: "B", to: "C" }
				],
				angles: [
					{
						vertices: ["A", "B", "C"],
						label: "45°",
						color: "rgba(217, 95, 79, 0.8)",
						radius: 20,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})

	describe("New Features", () => {
		test("findLineIntersection should calculate intersection of two lines", () => {
			// Test with perpendicular lines intersecting at (100, 100)
			const intersection1 = findLineIntersection(
				{ x: 50, y: 100 }, // Point on horizontal line
				{ x: 150, y: 100 }, // Point on horizontal line
				{ x: 100, y: 50 }, // Point on vertical line
				{ x: 100, y: 150 } // Point on vertical line
			)
			expect(intersection1).toEqual({ x: 100, y: 100 })

			// Test with diagonal lines
			const intersection2 = findLineIntersection(
				{ x: 0, y: 0 }, // Line from (0,0) to (100,100)
				{ x: 100, y: 100 },
				{ x: 0, y: 100 }, // Line from (0,100) to (100,0)
				{ x: 100, y: 0 }
			)
			expect(intersection2).toEqual({ x: 50, y: 50 })

			// Test with parallel lines (should return null)
			const intersection3 = findLineIntersection({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 10 }, { x: 100, y: 10 })
			expect(intersection3).toBeNull()
		})

		test("should render Perseus-style vertical angles diagram", () => {
			// Calculate intersection point of diagonals
			const intersection = findLineIntersection(
				{ x: 50, y: 50 }, // Top-left corner
				{ x: 250, y: 150 }, // Bottom-right corner (diagonal 1)
				{ x: 200, y: 50 }, // Top-right corner
				{ x: 100, y: 150 } // Bottom-left corner (diagonal 2)
			)

			const props = {
				type: "angleDiagram" as const,
				width: 300,
				height: 200,
				points: [
					{ id: "A", x: 50, y: 50, label: null, shape: "ellipse" as const },
					{ id: "B", x: 200, y: 50, label: null, shape: "ellipse" as const },
					{ id: "C", x: 250, y: 150, label: null, shape: "ellipse" as const },
					{ id: "D", x: 100, y: 150, label: null, shape: "ellipse" as const },
					{ id: "I", x: intersection?.x, y: intersection?.y, label: null, shape: "ellipse" as const }
				],
				rays: [
					// Quadrilateral edges
					{ from: "A", to: "B" },
					{ from: "B", to: "C" },
					{ from: "C", to: "D" },
					{ from: "D", to: "A" },
					// Diagonals
					{ from: "A", to: "C" },
					{ from: "B", to: "D" }
				],
				angles: [
					{
						vertices: ["A", "I", "B"],
						label: "95°",
						color: "#1fab54",
						radius: 20,
						isRightAngle: false
					},
					{
						vertices: ["C", "I", "D"],
						label: "x°",
						color: "#e07d10",
						radius: 20,
						isRightAngle: false
					},
					{
						vertices: ["B", "C", "D"],
						label: "60°",
						color: "#11accd",
						radius: 20,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render QTI vertical angles problem with 60° and (x+40)°", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 300,
				height: 150,
				points: [
					{ id: "O", x: 150, y: 75, label: null, shape: null },
					{ id: "A", x: 30, y: 75, label: null, shape: null },
					{ id: "B", x: 270, y: 75, label: null, shape: null },
					{ id: "C", x: 60, y: 20, label: null, shape: null },
					{ id: "D", x: 240, y: 130, label: null, shape: null }
				],
				rays: [
					// Horizontal line (both directions from center)
					{ from: "O", to: "A" },
					{ from: "O", to: "B" },
					// Diagonal line (both directions from center)
					{ from: "O", to: "C" },
					{ from: "O", to: "D" }
				],
				angles: [
					{
						vertices: ["B", "O", "D"],
						label: "60°",
						color: "#11accd",
						radius: 28,
						isRightAngle: false
					},
					{
						vertices: ["A", "O", "C"],
						label: "(x+40)°",
						color: "#e07d10",
						radius: 28,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})

		test("should render QTI complementary angles problem - exact recreation", () => {
			const props = {
				type: "angleDiagram" as const,
				width: 168,
				height: 198,
				points: [
					{ id: "P", x: 59.042, y: 25.237, label: "P", shape: null },
					{ id: "Q", x: 18, y: 138, label: "Q", shape: null },
					{ id: "R", x: 117.485, y: 70.897, label: "R", shape: null },
					{ id: "S", x: 130.763, y: 179.042, label: "S", shape: null }
				],
				rays: [
					{ from: "Q", to: "P" },
					{ from: "Q", to: "R" },
					{ from: "Q", to: "S" }
				],
				angles: [
					{
						vertices: ["P", "Q", "S"],
						label: "",
						color: "#000000",
						radius: 30,
						isRightAngle: true
					},
					{
						vertices: ["P", "Q", "R"],
						label: "36°",
						color: "#1f77b4",
						radius: 16,
						isRightAngle: false
					},
					{
						vertices: ["R", "Q", "S"],
						label: "x",
						color: "#d62728",
						radius: 24,
						isRightAngle: false
					}
				]
			}
			expect(generateDiagram(props)).toMatchSnapshot()
		})
	})
})
