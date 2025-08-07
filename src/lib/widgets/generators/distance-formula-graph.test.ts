import { describe, expect, test } from "bun:test"
import { generateDistanceFormulaGraph } from "@/lib/widgets/generators/distance-formula-graph"

describe("generateDistanceFormulaGraph", () => {
	test("should render distances between two points with legs", () => {
		const props = {
			type: "distanceFormulaGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -10, max: 10, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -10, max: 10, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			points: [
				{ id: "A", x: -3, y: 4, label: "A", color: "#4285F4", style: "closed" as const },
				{ id: "B", x: 5, y: -2, label: "B", color: "#4285F4", style: "closed" as const }
			],
			distances: [
				{
					pointId1: "A",
					pointId2: "B",
					showLegs: true,
					showLegLabels: true,
					hypotenuseLabel: "d",
					color: "gray",
					style: "dashed" as const
				}
			]
		}
		expect(generateDistanceFormulaGraph(props)).toMatchSnapshot()
	})

	test("should render distance without legs", () => {
		const props = {
			type: "distanceFormulaGraph" as const,
			width: 400,
			height: 400,
			xAxis: { min: -5, max: 5, tickInterval: 1, label: null, showGridLines: false },
			yAxis: { min: -5, max: 5, tickInterval: 1, label: null, showGridLines: false },
			showQuadrantLabels: true,
			points: [
				{ id: "P1", x: -2, y: 3, label: "P", color: "#EA4335", style: "closed" as const },
				{ id: "P2", x: 3, y: -1, label: "Q", color: "#34A853", style: "closed" as const }
			],
			distances: [
				{
					pointId1: "P1",
					pointId2: "P2",
					showLegs: false,
					showLegLabels: false,
					hypotenuseLabel: null,
					color: "black",
					style: "solid" as const
				}
			]
		}
		expect(generateDistanceFormulaGraph(props)).toMatchSnapshot()
	})

	test("should handle multiple distances", () => {
		const props = {
			type: "distanceFormulaGraph" as const,
			width: 500,
			height: 500,
			xAxis: { min: -6, max: 6, tickInterval: 2, label: "x", showGridLines: true },
			yAxis: { min: -6, max: 6, tickInterval: 2, label: "y", showGridLines: true },
			showQuadrantLabels: false,
			points: [
				{ id: "A", x: -4, y: 2, label: "A", color: "red", style: "closed" as const },
				{ id: "B", x: 2, y: 4, label: "B", color: "blue", style: "closed" as const },
				{ id: "C", x: 3, y: -3, label: "C", color: "green", style: "closed" as const }
			],
			distances: [
				{
					pointId1: "A",
					pointId2: "B",
					showLegs: true,
					showLegLabels: false,
					hypotenuseLabel: "AB",
					color: "purple",
					style: "dashed" as const
				},
				{
					pointId1: "B",
					pointId2: "C",
					showLegs: true,
					showLegLabels: true,
					hypotenuseLabel: "BC",
					color: "orange",
					style: "solid" as const
				}
			]
		}
		expect(generateDistanceFormulaGraph(props)).toMatchSnapshot()
	})
})
