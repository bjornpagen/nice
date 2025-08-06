import { describe, expect, test } from "bun:test"
import {
	generateNumberLineWithFractionGroups,
	NumberLineWithFractionGroupsPropsSchema
} from "./number-line-with-fraction-groups"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = NumberLineWithFractionGroupsPropsSchema.parse(props)
	return generateNumberLineWithFractionGroups(parsedProps)
}

describe("generateNumberLineWithFractionGroups", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "numberLineWithFractionGroups" as const,
			width: null,
			height: null,
			min: 0,
			max: 2,
			denominator: 4,
			groupedFractions: [
				{ start: 0, end: 1, color: null },
				{ start: 1, end: 2, color: null }
			],
			markedPoints: null
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "numberLineWithFractionGroups" as const,
			width: 700,
			height: 120,
			min: 0,
			max: 3,
			denominator: 6,
			groupedFractions: [
				{ start: 0, end: 1, color: "rgba(255, 107, 107, 0.3)" },
				{ start: 1, end: 2, color: "rgba(76, 237, 196, 0.3)" },
				{ start: 2, end: 3, color: "rgba(69, 183, 209, 0.3)" }
			],
			markedPoints: [
				{ value: 0.5, label: "1/2", color: "#ff6b6b" },
				{ value: 1.33, label: "4/3", color: "#4ecdc4" },
				{ value: 2.5, label: "5/2", color: "#45b7d1" }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
