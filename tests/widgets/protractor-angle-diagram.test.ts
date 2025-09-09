import { describe, expect, test } from "bun:test"
import { generateProtractorAngleDiagram } from "@/lib/widgets/generators/protractor-angle-diagram"

describe("protractor-angle-diagram", () => {
	test("generates 120 degree angle with labels", async () => {
		const result = await generateProtractorAngleDiagram({
			type: "protractorAngleDiagram",
			width: 600,
			height: 400,
			angle: 120,
			startPointLabel: "A",
			centerPointLabel: "B", 
			endPointLabel: "C",
			showAngleLabel: true
		})

		expect(result).toMatchSnapshot()
	})

	test("generates 45 degree angle without labels and no angle label", async () => {
		const result = await generateProtractorAngleDiagram({
			type: "protractorAngleDiagram",
			width: 500,
			height: 350,
			angle: 45,
			startPointLabel: "",
			centerPointLabel: "",
			endPointLabel: "",
			showAngleLabel: false
		})

		expect(result).toMatchSnapshot()
	})

	test("generates 90 degree angle with partial labels", async () => {
		const result = await generateProtractorAngleDiagram({
			type: "protractorAngleDiagram",
			width: 550,
			height: 380,
			angle: 90,
			startPointLabel: "P",
			centerPointLabel: "O",
			endPointLabel: "",
			showAngleLabel: true
		})

		expect(result).toMatchSnapshot()
	})
})
