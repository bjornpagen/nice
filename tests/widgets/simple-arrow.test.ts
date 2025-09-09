import { describe, expect, it } from "bun:test"
import { generateSimpleArrow, SimpleArrowPropsSchema } from "@/lib/widgets/generators/simple-arrow"

describe("simple-arrow", () => {
	it("generates forward vertical arrow", async () => {
		const props = {
			type: "simpleArrow" as const,
			width: 100,
			height: 200,
			orientation: "vertical" as const,
			direction: "forward" as const
		}

		const validationResult = SimpleArrowPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSimpleArrow(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates backward vertical arrow", async () => {
		const props = {
			type: "simpleArrow" as const,
			width: 100,
			height: 200,
			orientation: "vertical" as const,
			direction: "backward" as const
		}

		const validationResult = SimpleArrowPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSimpleArrow(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates bidirectional vertical arrow", async () => {
		const props = {
			type: "simpleArrow" as const,
			width: 100,
			height: 200,
			orientation: "vertical" as const,
			direction: "bidirectional" as const
		}

		const validationResult = SimpleArrowPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSimpleArrow(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates vertical arrow with circles", async () => {
		const props = {
			type: "simpleArrow" as const,
			width: 100,
			height: 200,
			circles: [
				{ position: 0.2, radius: 4, fill: "#000000" },
				{ position: 0.8, radius: 4, fill: "#000000" }
			]
		}

		const validationResult = SimpleArrowPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSimpleArrow(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates forward horizontal arrow (like your diagram)", async () => {
		const props = {
			type: "simpleArrow" as const,
			width: 200,
			height: 100,
			orientation: "horizontal" as const,
			direction: "forward" as const
		}

		const validationResult = SimpleArrowPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSimpleArrow(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates styled arrow", async () => {
		const props = {
			type: "simpleArrow" as const,
			width: 120,
			height: 250,
			color: "#0066cc",
			strokeWidth: 3,
			arrowSize: 8
		}

		const validationResult = SimpleArrowPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSimpleArrow(validationResult.data)
		expect(svg).toMatchSnapshot()
	})

	it("generates arrow with multiple circles", async () => {
		const props = {
			type: "simpleArrow" as const,
			width: 80,
			height: 300,
			circles: [
				{ position: 0.1, radius: 3, fill: "#ff0000" },
				{ position: 0.3, radius: 5, fill: "#00ff00" },
				{ position: 0.5, radius: 4, fill: "#0000ff" },
				{ position: 0.7, radius: 6, fill: "#ffaa00" },
				{ position: 0.9, radius: 3, fill: "#aa00ff" }
			]
		}

		const validationResult = SimpleArrowPropsSchema.safeParse(props)
		expect(validationResult.success).toBe(true)

		if (!validationResult.success) return

		const svg = await generateSimpleArrow(validationResult.data)
		expect(svg).toMatchSnapshot()
	})
})
