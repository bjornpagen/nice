import { expect, test } from "bun:test"
import { z } from "zod"
import { generateQuantityFractionalDiagram, QuantityFractionalDiagramPropsSchema } from "@/lib/widgets/generators/quantity-fractional-diagram"

type QuantityFractionalDiagramInput = z.input<typeof QuantityFractionalDiagramPropsSchema>

// Test case 1: Simple fraction - 3/6 as single shape
test("quantity-fractional-diagram - Rectangle 3/6", async () => {
	const input = {
		type: "quantityFractionalDiagram",
		width: 300,
		height: 200,
		shape: {
			type: "rectangle",
			rows: 2,
			columns: 3
		},
		numerator: 3,
		denominator: 6,
		shadeColor: "#4472C4",
		shapesPerRow: 1
	} satisfies QuantityFractionalDiagramInput

	// Validate the input
	const parseResult = QuantityFractionalDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for quantity-fractional-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateQuantityFractionalDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 2: Mixed number - 2 1/4 (9/4)
test("quantity-fractional-diagram - Mixed number 2 1/4", async () => {
	const input = {
		type: "quantityFractionalDiagram",
		width: 400,
		height: 200,
		shape: {
			type: "circle"
		},
		numerator: 9,
		denominator: 4,
		shadeColor: "#FF6B6B",
		shapesPerRow: 3
	} satisfies QuantityFractionalDiagramInput

	// Validate the input
	const parseResult = QuantityFractionalDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for quantity-fractional-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateQuantityFractionalDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 3: Improper fraction - 7/4
test("quantity-fractional-diagram - Improper fraction 7/4", async () => {
	const input = {
		type: "quantityFractionalDiagram",
		width: 500,
		height: 200,
		shape: {
			type: "rectangle",
			rows: 2,
			columns: 2
		},
		numerator: 7,
		denominator: 4,
		shadeColor: "#9FE2BF",
		shapesPerRow: 4
	} satisfies QuantityFractionalDiagramInput

	// Validate the input
	const parseResult = QuantityFractionalDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for quantity-fractional-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateQuantityFractionalDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 4: Polygon - Triangle 2/3
test("quantity-fractional-diagram - Triangle 2/3", async () => {
	const input = {
		type: "quantityFractionalDiagram",
		width: 250,
		height: 250,
		shape: {
			type: "polygon",
			sides: 3,
			rotation: 0
		},
		numerator: 2,
		denominator: 3,
		shadeColor: "#FFD93D",
		shapesPerRow: 1
	} satisfies QuantityFractionalDiagramInput

	// Validate the input
	const parseResult = QuantityFractionalDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for quantity-fractional-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateQuantityFractionalDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 5: Hexagon - 5/6
test("quantity-fractional-diagram - Hexagon 5/6", async () => {
	const input = {
		type: "quantityFractionalDiagram",
		width: 250,
		height: 250,
		shape: {
			type: "polygon",
			sides: 6,
			rotation: 30
		},
		numerator: 5,
		denominator: 6,
		shadeColor: "#DE3163",
		shapesPerRow: 1
	} satisfies QuantityFractionalDiagramInput

	// Validate the input
	const parseResult = QuantityFractionalDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for quantity-fractional-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateQuantityFractionalDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 6: Whole number - 3/3
test("quantity-fractional-diagram - Whole number 3/3", async () => {
	const input = {
		type: "quantityFractionalDiagram",
		width: 450,
		height: 150,
		shape: {
			type: "rectangle",
			rows: 1,
			columns: 3
		},
		numerator: 3,
		denominator: 3,
		shadeColor: "#40E0D0",
		shapesPerRow: 3
	} satisfies QuantityFractionalDiagramInput

	// Validate the input
	const parseResult = QuantityFractionalDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for quantity-fractional-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateQuantityFractionalDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 7: Rotated square (diamond) - 3/4
test("quantity-fractional-diagram - Diamond 3/4", async () => {
	const input = {
		type: "quantityFractionalDiagram",
		width: 250,
		height: 250,
		shape: {
			type: "polygon",
			sides: 4,
			rotation: 45
		},
		numerator: 3,
		denominator: 4,
		shadeColor: "#E6E6FA",
		shapesPerRow: 1
	} satisfies QuantityFractionalDiagramInput

	// Validate the input
	const parseResult = QuantityFractionalDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for quantity-fractional-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateQuantityFractionalDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 8: Zero numerator - 0/5
test("quantity-fractional-diagram - Zero numerator 0/5", async () => {
	const input = {
		type: "quantityFractionalDiagram",
		width: 250,
		height: 250,
		shape: {
			type: "circle"
		},
		numerator: 0,
		denominator: 5,
		shadeColor: "#FF1493",
		shapesPerRow: 1
	} satisfies QuantityFractionalDiagramInput

	// Validate the input
	const parseResult = QuantityFractionalDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for quantity-fractional-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateQuantityFractionalDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 9: Large mixed number - 3 2/5 (17/5)
test("quantity-fractional-diagram - Large mixed 3 2/5", async () => {
	const input = {
		type: "quantityFractionalDiagram",
		width: 600,
		height: 200,
		shape: {
			type: "rectangle",
			rows: 1,
			columns: 5
		},
		numerator: 17,
		denominator: 5,
		shadeColor: "#98FB98",
		shapesPerRow: 4
	} satisfies QuantityFractionalDiagramInput

	// Validate the input
	const parseResult = QuantityFractionalDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for quantity-fractional-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateQuantityFractionalDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})
