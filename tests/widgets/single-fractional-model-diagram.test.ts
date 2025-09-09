import { expect, test } from "bun:test"
import { z } from "zod"
import { generateSingleFractionalModelDiagram, SingleFractionalModelDiagramPropsSchema } from "@/lib/widgets/generators/single-fractional-model-diagram"

type SingleFractionalModelDiagramInput = z.input<typeof SingleFractionalModelDiagramPropsSchema>

// Test case 1: Question 4 example - 3/6 fraction with rectangle
test("single-fractional-model-diagram - Rectangle 3/6", async () => {
	const input = {
		type: "singleFractionalModelDiagram",
		width: 300,
		height: 200,
		shape: {
			type: "rectangle",
			rows: 2,
			columns: 3
		},
		totalParts: 6,
		shadedParts: 3,
		shadeColor: "#4472C4"
	} satisfies SingleFractionalModelDiagramInput

	// Validate the input
	const parseResult = SingleFractionalModelDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for single-fractional-model-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateSingleFractionalModelDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 2: Question 3 example - 1/6 fraction with rectangle
test("single-fractional-model-diagram - Rectangle 1/6", async () => {
	const input = {
		type: "singleFractionalModelDiagram",
		width: 300,
		height: 200,
		shape: {
			type: "rectangle",
			rows: 2,
			columns: 3
		},
		totalParts: 6,
		shadedParts: 1,
		shadeColor: "#FF6B6B"
	} satisfies SingleFractionalModelDiagramInput

	// Validate the input
	const parseResult = SingleFractionalModelDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for single-fractional-model-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateSingleFractionalModelDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 3: Circle fraction - 3/8
test("single-fractional-model-diagram - Circle 3/8", async () => {
	const input = {
		type: "singleFractionalModelDiagram",
		width: 250,
		height: 250,
		shape: {
			type: "circle"
		},
		totalParts: 8,
		shadedParts: 3,
		shadeColor: "#9FE2BF"
	} satisfies SingleFractionalModelDiagramInput

	// Validate the input
	const parseResult = SingleFractionalModelDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for single-fractional-model-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateSingleFractionalModelDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 4: Triangle (3-sided polygon) - 2/3
test("single-fractional-model-diagram - Triangle 2/3", async () => {
	const input = {
		type: "singleFractionalModelDiagram",
		width: 250,
		height: 250,
		shape: {
			type: "polygon",
			sides: 3,
			rotation: 0
		},
		totalParts: 3,
		shadedParts: 2,
		shadeColor: "#FFD93D"
	} satisfies SingleFractionalModelDiagramInput

	// Validate the input
	const parseResult = SingleFractionalModelDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for single-fractional-model-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateSingleFractionalModelDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 5: Hexagon - 4/6
test("single-fractional-model-diagram - Hexagon 4/6", async () => {
	const input = {
		type: "singleFractionalModelDiagram",
		width: 250,
		height: 250,
		shape: {
			type: "polygon",
			sides: 6,
			rotation: 0
		},
		totalParts: 6,
		shadedParts: 4,
		shadeColor: "#DE3163"
	} satisfies SingleFractionalModelDiagramInput

	// Validate the input
	const parseResult = SingleFractionalModelDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for single-fractional-model-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateSingleFractionalModelDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 6: Large rectangle grid - 7/12
test("single-fractional-model-diagram - Rectangle 7/12", async () => {
	const input = {
		type: "singleFractionalModelDiagram",
		width: 400,
		height: 200,
		shape: {
			type: "rectangle",
			rows: 3,
			columns: 4
		},
		totalParts: 12,
		shadedParts: 7,
		shadeColor: "#40E0D0"
	} satisfies SingleFractionalModelDiagramInput

	// Validate the input
	const parseResult = SingleFractionalModelDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for single-fractional-model-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateSingleFractionalModelDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 7: Rotated square (diamond) - 1/4
test("single-fractional-model-diagram - Diamond 1/4", async () => {
	const input = {
		type: "singleFractionalModelDiagram",
		width: 250,
		height: 250,
		shape: {
			type: "polygon",
			sides: 4,
			rotation: 45
		},
		totalParts: 4,
		shadedParts: 1,
		shadeColor: "#E6E6FA"
	} satisfies SingleFractionalModelDiagramInput

	// Validate the input
	const parseResult = SingleFractionalModelDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for single-fractional-model-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateSingleFractionalModelDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 8: No shaded parts - 0/5
test("single-fractional-model-diagram - Circle 0/5", async () => {
	const input = {
		type: "singleFractionalModelDiagram",
		width: 250,
		height: 250,
		shape: {
			type: "circle"
		},
		totalParts: 5,
		shadedParts: 0,
		shadeColor: "#FF1493"
	} satisfies SingleFractionalModelDiagramInput

	// Validate the input
	const parseResult = SingleFractionalModelDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for single-fractional-model-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateSingleFractionalModelDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 9: Question 136848 example - 8/14 fraction with rectangle (base fraction for 8/14 × 4)
test("single-fractional-model-diagram - Rectangle 8/14", async () => {
	const input = {
		type: "singleFractionalModelDiagram",
		width: 350,
		height: 200,
		shape: {
			type: "rectangle",
			rows: 2,
			columns: 7
		},
		totalParts: 14,
		shadedParts: 8,
		shadeColor: "#4472C4"
	} satisfies SingleFractionalModelDiagramInput

	// Validate the input
	const parseResult = SingleFractionalModelDiagramPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for single-fractional-model-diagram:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateSingleFractionalModelDiagram(parseResult.data)
	expect(svg).toMatchSnapshot()
})
