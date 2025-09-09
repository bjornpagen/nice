import { expect, test } from "bun:test"
import { z } from "zod"
import { generatePatternDiagram, PatternDiagramPropsSchema } from "@/lib/widgets/generators/pattern-diagram"

type PatternDiagramInput = z.input<typeof PatternDiagramPropsSchema>

// Test case 1: Simple pattern with shapes only
test("pattern-diagram - Simple shapes pattern", async () => {
	const input = {
		type: "patternDiagram",
		width: 400,
		height: 150,
		shapeSize: 60,
		items: [
			{ type: "shape", shape: "triangle", fillColor: "#ff6b6b" },
			{ type: "shape", shape: "square", fillColor: "#4ecdc4" },
			{ type: "shape", shape: "triangle", fillColor: "#ff6b6b" },
			{ type: "shape", shape: "square", fillColor: "#4ecdc4" }
		]
	} satisfies PatternDiagramInput

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for pattern-diagram simple shapes:", parseResult.error)
		return
	}

	const html = await generatePatternDiagram(parseResult.data)
	expect(html).toMatchSnapshot()
})

// Test case 2: Pattern with placeholders
test("pattern-diagram - Pattern with placeholders", async () => {
	const input = {
		type: "patternDiagram",
		width: 500,
		height: 150,
		shapeSize: 60,
		items: [
			{ type: "shape", shape: "circle", fillColor: "#f39c12" },
			{ type: "shape", shape: "rectangle", fillColor: "#9b59b6" },
			{ type: "placeholder" },
			{ type: "shape", shape: "rectangle", fillColor: "#9b59b6" },
			{ type: "placeholder" }
		]
	} satisfies PatternDiagramInput

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for pattern-diagram with placeholders:", parseResult.error)
		return
	}

	const html = await generatePatternDiagram(parseResult.data)
	expect(html).toMatchSnapshot()
})

// Test case 3: Complex polygon pattern
test("pattern-diagram - Complex polygon pattern", async () => {
	const input = {
		type: "patternDiagram",
		width: 600,
		height: 120,
		shapeSize: 50,
		items: [
			{ type: "shape", shape: "pentagon", fillColor: "#e74c3c" },
			{ type: "shape", shape: "hexagon", fillColor: "#3498db" },
			{ type: "shape", shape: "heptagon", fillColor: "#2ecc71" },
			{ type: "shape", shape: "octagon", fillColor: "#f1c40f" },
			{ type: "placeholder" },
			{ type: "shape", shape: "hexagon", fillColor: "#3498db" }
		]
	} satisfies PatternDiagramInput

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for pattern-diagram complex polygons:", parseResult.error)
		return
	}

	const html = await generatePatternDiagram(parseResult.data)
	expect(html).toMatchSnapshot()
})

// Test case 4: All shapes showcase
test("pattern-diagram - All supported shapes", async () => {
	const input = {
		type: "patternDiagram",
		width: 800,
		height: 200,
		shapeSize: 70,
		items: [
			{ type: "shape", shape: "triangle", fillColor: "#ff6b6b" },
			{ type: "shape", shape: "square", fillColor: "#4ecdc4" },
			{ type: "shape", shape: "rectangle", fillColor: "#45b7d1" },
			{ type: "shape", shape: "pentagon", fillColor: "#f7dc6f" },
			{ type: "shape", shape: "hexagon", fillColor: "#bb8fce" },
			{ type: "shape", shape: "heptagon", fillColor: "#85c1e9" },
			{ type: "shape", shape: "octagon", fillColor: "#f8c471" },
			{ type: "shape", shape: "circle", fillColor: "#58d68d" }
		]
	} satisfies PatternDiagramInput

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for pattern-diagram all shapes:", parseResult.error)
		return
	}

	const html = await generatePatternDiagram(parseResult.data)
	expect(html).toMatchSnapshot()
})

// Test case 5: Small shapes pattern
test("pattern-diagram - Small shapes", async () => {
	const input = {
		type: "patternDiagram",
		width: 300,
		height: 100,
		shapeSize: 30,
		items: [
			{ type: "shape", shape: "triangle", fillColor: "#e67e22" },
			{ type: "shape", shape: "circle", fillColor: "#8e44ad" },
			{ type: "placeholder" },
			{ type: "shape", shape: "circle", fillColor: "#8e44ad" },
			{ type: "shape", shape: "triangle", fillColor: "#e67e22" }
		]
	} satisfies PatternDiagramInput

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for pattern-diagram small shapes:", parseResult.error)
		return
	}

	const html = await generatePatternDiagram(parseResult.data)
	expect(html).toMatchSnapshot()
})

// Test case 6: Large shapes pattern
test("pattern-diagram - Large shapes", async () => {
	const input = {
		type: "patternDiagram",
		width: 600,
		height: 200,
		shapeSize: 100,
		items: [
			{ type: "shape", shape: "square", fillColor: "#c0392b" },
			{ type: "placeholder" },
			{ type: "shape", shape: "square", fillColor: "#c0392b" }
		]
	} satisfies PatternDiagramInput

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for pattern-diagram large shapes:", parseResult.error)
		return
	}

	const html = await generatePatternDiagram(parseResult.data)
	expect(html).toMatchSnapshot()
})

// Test case 7: Only placeholders
test("pattern-diagram - Only placeholders", async () => {
	const input = {
		type: "patternDiagram",
		width: 300,
		height: 100,
		shapeSize: 50,
		items: [
			{ type: "placeholder" },
			{ type: "placeholder" },
			{ type: "placeholder" }
		]
	} satisfies PatternDiagramInput

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for pattern-diagram only placeholders:", parseResult.error)
		return
	}

	const html = await generatePatternDiagram(parseResult.data)
	expect(html).toMatchSnapshot()
})

// Test case 8: Single item pattern
test("pattern-diagram - Single shape", async () => {
	const input = {
		type: "patternDiagram",
		width: 150,
		height: 150,
		shapeSize: 80,
		items: [
			{ type: "shape", shape: "hexagon", fillColor: "#16a085" }
		]
	} satisfies PatternDiagramInput

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for pattern-diagram single shape:", parseResult.error)
		return
	}

	const html = await generatePatternDiagram(parseResult.data)
	expect(html).toMatchSnapshot()
})

// Test case 9: Validation - Invalid shape
test("pattern-diagram - Schema validation rejects invalid shape", () => {
	const input = {
		type: "patternDiagram",
		width: 400,
		height: 150,
		shapeSize: 60,
		items: [
			{ type: "shape", shape: "star", fillColor: "#ff6b6b" } // Invalid shape
		]
	}

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	expect(parseResult.success).toBe(false)
})

// Test case 10: Validation - Invalid color format
test("pattern-diagram - Schema validation rejects invalid color", () => {
	const input = {
		type: "patternDiagram",
		width: 400,
		height: 150,
		shapeSize: 60,
		items: [
			{ type: "shape", shape: "triangle", fillColor: "red" } // Invalid color format
		]
	}

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	expect(parseResult.success).toBe(false)
})

// Test case 11: Validation - Negative dimensions
test("pattern-diagram - Schema validation rejects negative dimensions", () => {
	const input = {
		type: "patternDiagram",
		width: -400,
		height: 150,
		shapeSize: 60,
		items: [
			{ type: "shape", shape: "triangle", fillColor: "#ff6b6b" }
		]
	}

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	expect(parseResult.success).toBe(false)
})

// Test case 12: Validation - Empty items array
test("pattern-diagram - Schema validation allows empty items array", () => {
	const input = {
		type: "patternDiagram",
		width: 400,
		height: 150,
		shapeSize: 60,
		items: []
	}

	const parseResult = PatternDiagramPropsSchema.safeParse(input)
	expect(parseResult.success).toBe(true)
})
