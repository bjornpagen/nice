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
			ticks: [
				{ value: 0, label: "0", isMajor: true },
				{ value: 0.25, label: null, isMajor: null },
				{ value: 0.5, label: "1/2", isMajor: null },
				{ value: 0.75, label: null, isMajor: null },
				{ value: 1, label: "1", isMajor: true },
				{ value: 1.25, label: null, isMajor: null },
				{ value: 1.5, label: "3/2", isMajor: null },
				{ value: 1.75, label: null, isMajor: null },
				{ value: 2, label: "2", isMajor: true }
			],
			segments: null
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
			ticks: [
				{ value: 0, label: "0", isMajor: true },
				{ value: 0.5, label: "1/2", isMajor: false },
				{ value: 1, label: "1", isMajor: true },
				{ value: 1.5, label: "3/2", isMajor: false },
				{ value: 2, label: "2", isMajor: true },
				{ value: 2.5, label: "5/2", isMajor: false },
				{ value: 3, label: "3", isMajor: true }
			],
			segments: [
				{ start: 0, end: 1, color: "rgba(255, 107, 107, 0.3)", label: "Group 1" },
				{ start: 1, end: 2, color: "rgba(76, 237, 196, 0.3)", label: "Group 2" },
				{ start: 2, end: 3, color: "rgba(69, 183, 209, 0.3)", label: "Group 3" }
			]
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
