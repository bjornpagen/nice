import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import {
	generateNumberLineForOpposites,
	NumberLineForOppositesPropsSchema
} from "@/lib/widgets/generators/number-line-for-opposites"

// helper to enforce schema prior to generation using safeParse
const generateDiagram = (props: unknown) => {
	const validation = NumberLineForOppositesPropsSchema.safeParse(props)
	if (!validation.success) {
		throw errors.wrap(validation.error, "number line for opposites props validation")
	}
	return generateNumberLineForOpposites(validation.data)
}

describe("generateNumberLineForOpposites", () => {
	test("renders with required explicit props", () => {
		const props = {
			type: "numberLineForOpposites" as const,
			width: 460,
			height: 90,
			maxAbsValue: 10,
			tickInterval: 2,
			value: 7,
			positiveLabel: "7",
			negativeLabel: "-7",
			showArrows: true
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})

	test("hides labels when empty strings provided", () => {
		const props = {
			type: "numberLineForOpposites" as const,
			width: 600,
			height: 120,
			maxAbsValue: 12,
			tickInterval: 3,
			value: -9, // sign ignored; magnitude used for symmetry
			positiveLabel: "",
			negativeLabel: "",
			showArrows: false
		}
		expect(generateDiagram(props)).toMatchSnapshot()
	})
})
