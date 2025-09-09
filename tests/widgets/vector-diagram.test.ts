import { describe, expect, test } from "bun:test"
import { generateVectorDiagram } from "@/lib/widgets/generators/vector-diagram"

describe("vector diagram", () => {
	test("crossing diagonal vectors like diagram a", async () => {
		const widget = await generateVectorDiagram({
			type: "vectorDiagram",
			width: 300,
			height: 200,
			gridSpacing: 20,
			showGrid: true,
			gridColor: "#e0e0e0",
			vectors: [
				{
					id: "diagonal1",
					start: { x: 50, y: 80 },
					end: { x: 250, y: 120 },
					color: "#0066cc",
					strokeWidth: 2,
					showArrow: true,
					arrowSize: 8
				},
				{
					id: "diagonal2", 
					start: { x: 50, y: 120 },
					end: { x: 250, y: 80 },
					color: "#0066cc",
					strokeWidth: 2,
					showArrow: true,
					arrowSize: 8
				}
			],
			markers: []
		})

		expect(widget).toMatchSnapshot()
	})

	test("vertical vectors like diagram b", async () => {
		const widget = await generateVectorDiagram({
			type: "vectorDiagram",
			width: 300,
			height: 300,
			gridSpacing: 20,
			showGrid: true,
			gridColor: "#e0e0e0",
			vectors: [
				{
					id: "vertical1",
					start: { x: 120, y: 60 },
					end: { x: 120, y: 240 },
					color: "#0066cc",
					strokeWidth: 2,
					showArrow: true,
					arrowSize: 8
				},
				{
					id: "vertical2",
					start: { x: 180, y: 60 },
					end: { x: 180, y: 240 },
					color: "#0066cc", 
					strokeWidth: 2,
					showArrow: true,
					arrowSize: 8
				}
			],
			markers: []
		})

		expect(widget).toMatchSnapshot()
	})

	test("cross pattern with square marker like diagram c", async () => {
		const widget = await generateVectorDiagram({
			type: "vectorDiagram",
			width: 300,
			height: 300,
			gridSpacing: 20,
			showGrid: true,
			gridColor: "#e0e0e0",
			vectors: [
				{
					id: "horizontal",
					start: { x: 40, y: 150 },
					end: { x: 260, y: 150 },
					color: "#0066cc",
					strokeWidth: 2,
					showArrow: true,
					arrowSize: 8
				},
				{
					id: "vertical",
					start: { x: 150, y: 40 },
					end: { x: 150, y: 260 },
					color: "#0066cc",
					strokeWidth: 2,
					showArrow: true,
					arrowSize: 8
				}
			],
			markers: [
				{
					id: "rightAngle",
					position: { x: 150, y: 150 },
					shape: "rightAngle",
					size: 24,
					color: "#ff8800"
				}
			]
		})

		expect(widget).toMatchSnapshot()
	})

	test("angled vectors like diagram d", async () => {
		const widget = await generateVectorDiagram({
			type: "vectorDiagram",
			width: 300,
			height: 300,
			gridSpacing: 20,
			showGrid: true,
			gridColor: "#e0e0e0",
			vectors: [
				{
					id: "vector1",
					start: { x: 150, y: 200 },
					end: { x: 150, y: 80 },
					color: "#0066cc",
					strokeWidth: 2,
					showArrow: true,
					arrowSize: 8
				},
				{
					id: "vector2",
					start: { x: 150, y: 200 },
					end: { x: 230, y: 80 },
					color: "#0066cc",
					strokeWidth: 2,
					showArrow: true,
					arrowSize: 8
				}
			],
			markers: []
		})

		expect(widget).toMatchSnapshot()
	})

	test("v-shaped vectors like diagram e", async () => {
		const widget = await generateVectorDiagram({
			type: "vectorDiagram",
			width: 300,
			height: 300,
			gridSpacing: 20,
			showGrid: true,
			gridColor: "#e0e0e0",
			vectors: [
				{
					id: "vector1",
					start: { x: 100, y: 250 },
					end: { x: 150, y: 100 },
					color: "#0066cc",
					strokeWidth: 2,
					showArrow: true,
					arrowSize: 8
				},
				{
					id: "vector2",
					start: { x: 200, y: 250 },
					end: { x: 150, y: 100 },
					color: "#0066cc",
					strokeWidth: 2,
					showArrow: true,
					arrowSize: 8
				}
			],
			markers: []
		})

		expect(widget).toMatchSnapshot()
	})

	test("no grid background", async () => {
		const widget = await generateVectorDiagram({
			type: "vectorDiagram",
			width: 200,
			height: 200,
			gridSpacing: 20,
			showGrid: false,
			gridColor: "#e0e0e0",
			vectors: [
				{
					id: "simple",
					start: { x: 50, y: 100 },
					end: { x: 150, y: 50 },
					color: "#cc0066",
					strokeWidth: 3,
					showArrow: true,
					arrowSize: 10
				}
			],
			markers: []
		})

		expect(widget).toMatchSnapshot()
	})
})
