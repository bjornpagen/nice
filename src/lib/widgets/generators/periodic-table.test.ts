import { describe, expect, test } from "bun:test"
import { generatePeriodicTable } from "@/lib/widgets/generators/periodic-table"

describe("generatePeriodicTable", () => {
	test("should render with minimal props", () => {
		const result = generatePeriodicTable({
			type: "periodicTable",
			alt: "periodic table",
			width: null,
			height: null,
			caption: null
		})

		expect(result).toMatchSnapshot()
		expect(result).toContain('alt="periodic table"')
		expect(result).toContain("data:image/svg+xml;base64,")
	})

	test("should render with width, height, and caption", () => {
		const result = generatePeriodicTable({
			type: "periodicTable",
			alt: "periodic table annotated",
			width: 800,
			height: 600,
			caption: "full periodic table"
		})

		expect(result).toMatchSnapshot()
		expect(result).toContain("width: 800px;")
		expect(result).toContain("height: 600px;")
		expect(result).toContain("full periodic table")
	})
})
