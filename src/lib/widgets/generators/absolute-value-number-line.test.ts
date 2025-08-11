import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import {
	AbsoluteValueNumberLinePropsSchema,
	ErrInvalidRange,
	generateAbsoluteValueNumberLine
} from "@/lib/widgets/generators/absolute-value-number-line"

// helper: schema validation using safeParse per zod usage rule
const generateDiagram = (props: unknown) => {
	const validation = AbsoluteValueNumberLinePropsSchema.safeParse(props)
	if (!validation.success) {
		throw errors.wrap(validation.error, "input validation")
	}
	return generateAbsoluteValueNumberLine(validation.data)
}

describe("generateAbsoluteValueNumberLine", () => {
	test("should render with minimal props", () => {
		const props = {
			type: "absoluteValueNumberLine",
			width: 500,
			height: 80,
			min: -10,
			max: 10,
			tickInterval: 5,
			value: -7,
			highlightColor: "rgba(217, 95, 79, 0.8)",
			showDistanceLabel: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("should render with all props specified", () => {
		const props = {
			type: "absoluteValueNumberLine",
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
			type: "absoluteValueNumberLine",
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
			return
		}
		throw errors.new("expected an error to be thrown")
	})
})
