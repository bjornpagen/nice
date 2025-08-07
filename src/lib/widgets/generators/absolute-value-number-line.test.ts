import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import {
	AbsoluteValueNumberLinePropsSchema,
	ErrInvalidRange,
	generateAbsoluteValueNumberLine
} from "./absolute-value-number-line"

// Helper function to generate diagram with schema validation
const generateDiagram = (props: unknown) => {
	const parsedProps = AbsoluteValueNumberLinePropsSchema.parse(props)
	return generateAbsoluteValueNumberLine(parsedProps)
}

describe("generateAbsoluteValueNumberLine", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "absoluteValueNumberLine" as const,
			width: 500,
			height: 80,
			min: -10,
			max: 10,
			tickInterval: 5,
			value: -7,
			highlightColor: null,
			showDistanceLabel: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "absoluteValueNumberLine" as const,
			width: 600,
			height: 100,
			min: -20,
			max: 20,
			tickInterval: 10,
			value: 15,
			highlightColor: "blue",
			showDistanceLabel: false
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should handle error case where min >= max", () => {
		const props = {
			type: "absoluteValueNumberLine" as const,
			width: 500,
			height: 80,
			min: 10,
			max: -10,
			tickInterval: 1,
			value: 5,
			highlightColor: "#ff6b6b",
			showDistanceLabel: true
		}
		const result = errors.trySync(() => generateDiagram(props))
		if (result.error) {
			expect(errors.is(result.error, ErrInvalidRange)).toBe(true)
			expect(result.error.message).toMatchSnapshot()
		} else {
			throw errors.new("expected an error to be thrown")
		}
	})
})
