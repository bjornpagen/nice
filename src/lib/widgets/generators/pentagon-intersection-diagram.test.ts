import { describe, expect, test } from "bun:test"
import { generatePentagonIntersectionDiagram } from "./pentagon-intersection-diagram"

const generateDiagram = generatePentagonIntersectionDiagram

describe("generatePentagonIntersectionDiagram", () => {
	test("should render pentagon with exact Khan Academy SVG arcs", () => {
		const props = {
			type: "pentagonIntersectionDiagram" as const,
			width: 260,
			height: 246,
			pentagonPoints: [
				{ id: "A", x: 202.042, y: 229.157 }, // Bottom right
				{ id: "B", x: 246.566, y: 92.125 }, // Upper right
				{ id: "C", x: 130, y: 7.435 }, // Top center
				{ id: "D", x: 13.434, y: 92.125 }, // Upper left
				{ id: "E", x: 57.958, y: 229.157 } // Bottom left
			],
			intersectionLines: [
				{ from: "C", to: "E" }, // Diagonal 1
				{ from: "C", to: "A" }, // Diagonal 2
				{ from: "B", to: "D" } // Horizontal line
			],
			khanArcs: [
				{
					// Cyan arc: <path fill="none" stroke="#11accd" d="M106.389 79.95a12.38 12.38 0 0 0-16.214 11.828" stroke-dasharray="0"/>
					startX: 106.389,
					startY: 79.95,
					rx: 12.38,
					ry: 12.38,
					xAxisRotation: 0,
					largeArcFlag: 0,
					sweepFlag: 0,
					endDeltaX: -16.214,
					endDeltaY: 11.828,
					label: "100°",
					color: "#11accd"
				},
				{
					// Green arc: <path fill="none" stroke="#1fab54" d="M98.729 103.515a12.398 12.398 0 0 0 16.225-11.758" stroke-dasharray="0"/>
					startX: 98.729,
					startY: 103.515,
					rx: 12.398,
					ry: 12.398,
					xAxisRotation: 0,
					largeArcFlag: 0,
					sweepFlag: 0,
					endDeltaX: 16.225,
					endDeltaY: -11.758,
					label: "x°",
					color: "#1fab54"
				},
				{
					// Orange arc: <path fill="none" stroke="#e07d10" d="M169.825 91.778a12.38 12.38 0 0 0-16.214-11.828" stroke-dasharray="0"/>
					startX: 169.825,
					startY: 91.778,
					rx: 12.38,
					ry: 12.38,
					xAxisRotation: 0,
					largeArcFlag: 0,
					sweepFlag: 0,
					endDeltaX: -16.214,
					endDeltaY: -11.828,
					label: "100°",
					color: "#e07d10"
				}
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
