import { expect, test } from "bun:test"
import { z } from "zod"
import { generateNPolygon, NPolygonPropsSchema } from "@/lib/widgets/generators/n-polygon"

type NPolygonInput = z.input<typeof NPolygonPropsSchema>

// Test case 1: Triangle
test("n-polygon - Triangle", async () => {
	const input = {
		type: "nPolygon",
		width: 200,
		height: 200,
		shape: "triangle",
		fillColor: "#ff6b6b"
	} satisfies NPolygonInput

	const parseResult = NPolygonPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for n-polygon triangle:", parseResult.error)
		return
	}

	const svg = await generateNPolygon(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 2: Square
test("n-polygon - Square", async () => {
	const input = {
		type: "nPolygon",
		width: 200,
		height: 200,
		shape: "square",
		fillColor: "#4ecdc4"
	} satisfies NPolygonInput

	const parseResult = NPolygonPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for n-polygon square:", parseResult.error)
		return
	}

	const svg = await generateNPolygon(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 3: Rectangle
test("n-polygon - Rectangle", async () => {
	const input = {
		type: "nPolygon",
		width: 300,
		height: 200,
		shape: "rectangle",
		fillColor: "#45b7d1"
	} satisfies NPolygonInput

	const parseResult = NPolygonPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for n-polygon rectangle:", parseResult.error)
		return
	}

	const svg = await generateNPolygon(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 4: Pentagon
test("n-polygon - Pentagon", async () => {
	const input = {
		type: "nPolygon",
		width: 200,
		height: 200,
		shape: "pentagon",
		fillColor: "#f7dc6f"
	} satisfies NPolygonInput

	const parseResult = NPolygonPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for n-polygon pentagon:", parseResult.error)
		return
	}

	const svg = await generateNPolygon(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 5: Hexagon
test("n-polygon - Hexagon", async () => {
	const input = {
		type: "nPolygon",
		width: 200,
		height: 200,
		shape: "hexagon",
		fillColor: "#bb8fce"
	} satisfies NPolygonInput

	const parseResult = NPolygonPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for n-polygon hexagon:", parseResult.error)
		return
	}

	const svg = await generateNPolygon(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 6: Heptagon
test("n-polygon - Heptagon", async () => {
	const input = {
		type: "nPolygon",
		width: 200,
		height: 200,
		shape: "heptagon",
		fillColor: "#85c1e9"
	} satisfies NPolygonInput

	const parseResult = NPolygonPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for n-polygon heptagon:", parseResult.error)
		return
	}

	const svg = await generateNPolygon(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 7: Octagon
test("n-polygon - Octagon", async () => {
	const input = {
		type: "nPolygon",
		width: 200,
		height: 200,
		shape: "octagon",
		fillColor: "#f8c471"
	} satisfies NPolygonInput

	const parseResult = NPolygonPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for n-polygon octagon:", parseResult.error)
		return
	}

	const svg = await generateNPolygon(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 8: Rectangle with different aspect ratio
test("n-polygon - Wide rectangle", async () => {
	const input = {
		type: "nPolygon",
		width: 400,
		height: 150,
		shape: "rectangle",
		fillColor: "#58d68d"
	} satisfies NPolygonInput

	const parseResult = NPolygonPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for n-polygon wide rectangle:", parseResult.error)
		return
	}

	const svg = await generateNPolygon(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 9: Tall rectangle
test("n-polygon - Tall rectangle", async () => {
	const input = {
		type: "nPolygon",
		width: 150,
		height: 400,
		shape: "rectangle",
		fillColor: "#ec7063"
	} satisfies NPolygonInput

	const parseResult = NPolygonPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for n-polygon tall rectangle:", parseResult.error)
		return
	}

	const svg = await generateNPolygon(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 10: Small size
test("n-polygon - Small triangle", async () => {
	const input = {
		type: "nPolygon",
		width: 100,
		height: 100,
		shape: "triangle",
		fillColor: "#af7ac5"
	} satisfies NPolygonInput

	const parseResult = NPolygonPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for n-polygon small triangle:", parseResult.error)
		return
	}

	const svg = await generateNPolygon(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 11: Validation - Invalid shape
test("n-polygon - Schema validation rejects invalid shape", () => {
	const input = {
		type: "nPolygon",
		width: 200,
		height: 200,
		shape: "circle", // Invalid shape
		fillColor: "#ff6b6b"
	}

	const parseResult = NPolygonPropsSchema.safeParse(input)
	expect(parseResult.success).toBe(false)
})

// Test case 12: Validation - Invalid color format
test("n-polygon - Schema validation rejects invalid color", () => {
	const input = {
		type: "nPolygon",
		width: 200,
		height: 200,
		shape: "triangle",
		fillColor: "red" // Invalid color format, should be hex
	}

	const parseResult = NPolygonPropsSchema.safeParse(input)
	expect(parseResult.success).toBe(false)
})

// Test case 13: Validation - Negative dimensions
test("n-polygon - Schema validation rejects negative dimensions", () => {
	const input = {
		type: "nPolygon",
		width: -200,
		height: 200,
		shape: "triangle",
		fillColor: "#ff6b6b"
	}

	const parseResult = NPolygonPropsSchema.safeParse(input)
	expect(parseResult.success).toBe(false)
})
