import { expect, test } from "bun:test"
import { z } from "zod"
import { generateAreaModelMultiplication, AreaModelMultiplicationPropsSchema } from "@/lib/widgets/generators/area-model-multiplication"

type AreaModelMultiplicationInput = z.input<typeof AreaModelMultiplicationPropsSchema>

// Test case 1: Simple area model with one unknown value (like Question 1 from the examples)
test("area-model-multiplication - Single unknown cell", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 400,
		height: 300,
		rowFactors: [{ type: "value", value: 3 }],
		columnFactors: [{ type: "value", value: 70 }],
		cellContents: [[{ type: "unknown" }]],
		cellColors: [["#ffb3ba"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 2: Area model with multiple columns and mixed content types (like Question 2 from the examples)
test("area-model-multiplication - Multiple columns with mixed content", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 500,
		height: 300,
		rowFactors: [{ type: "value", value: 4 }],
		columnFactors: [
			{ type: "value", value: 300 },
			{ type: "value", value: 90 },
			{ type: "value", value: 5 }
		],
		cellContents: [[
			{ type: "unknown" },
			{ type: "unknown" },
			{ type: "unknown" }
		]],
		cellColors: [["#bae1ff", "#ffb3ba", "#ffdfba"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 3: Area model with specific integer values (showing the complete calculation)
test("area-model-multiplication - Specific integer values", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 450,
		height: 250,
		rowFactors: [{ type: "value", value: 6 }],
		columnFactors: [
			{ type: "value", value: 20 },
			{ type: "value", value: 8 }
		],
		cellContents: [[
			{ type: "value", value: 120 },
			{ type: "value", value: 48 }
		]],
		cellColors: [["#baffc9", "#ffffba"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 4: Larger area model with alternating values and unknown cells
test("area-model-multiplication - Large model with alternating content", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 600,
		height: 350,
		rowFactors: [{ type: "value", value: 12 }],
		columnFactors: [
			{ type: "value", value: 50 },
			{ type: "value", value: 30 },
			{ type: "value", value: 15 },
			{ type: "value", value: 5 }
		],
		cellContents: [[
			{ type: "value", value: 600 },
			{ type: "unknown" },
			{ type: "value", value: 180 },
			{ type: "unknown" }
		]],
		cellColors: [["#e0e0e0", "#ffb3ba", "#bae1ff", "#baffc9"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 5: Question 4 example - finding missing multiplier (423 × 5 = 2,115)
test("area-model-multiplication - Missing multiplier 423", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 500,
		height: 250,
		rowFactors: [{ type: "value", value: 5 }],
		columnFactors: [
			{ type: "value", value: 400 },
			{ type: "value", value: 20 },
			{ type: "value", value: 3 }
		],
		cellContents: [[
			{ type: "value", value: 2000 },
			{ type: "value", value: 100 },
			{ type: "value", value: 15 }
		]],
		cellColors: [["#bae1ff", "#ffb3ba", "#baffc9"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 6: Question 3 example - finding missing multiplier (754 × 2 = 1,508)
test("area-model-multiplication - Missing multiplier 2", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 500,
		height: 200,
		rowFactors: [{ type: "value", value: 2 }],
		columnFactors: [
			{ type: "value", value: 700 },
			{ type: "value", value: 50 },
			{ type: "value", value: 4 }
		],
		cellContents: [[
			{ type: "value", value: 1400 },
			{ type: "value", value: 100 },
			{ type: "value", value: 8 }
		]],
		cellColors: [["#ffffba", "#ffdfba", "#e0e0e0"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 7: Question 8 example - 236 × 6 = 1,416 with known column factors and known row factor
test("area-model-multiplication - Known factors 236 × 6", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 500,
		height: 250,
		rowFactors: [{ type: "value", value: 6 }],
		columnFactors: [
			{ type: "value", value: 200 },
			{ type: "value", value: 30 },
			{ type: "value", value: 6 }
		],
		cellContents: [[
			{ type: "value", value: 1200 },
			{ type: "value", value: 180 },
			{ type: "value", value: 36 }
		]],
		cellColors: [["#bae1ff", "#ffb3ba", "#ffdfba"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 8: Question 7 example - 136 × 4 = 544 with known column factors and known row factor
test("area-model-multiplication - Known factors 136 × 4", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 500,
		height: 250,
		rowFactors: [{ type: "value", value: 4 }],
		columnFactors: [
			{ type: "value", value: 100 },
			{ type: "value", value: 30 },
			{ type: "value", value: 6 }
		],
		cellContents: [[
			{ type: "value", value: 400 },
			{ type: "value", value: 120 },
			{ type: "value", value: 24 }
		]],
		cellColors: [["#bae1ff", "#ffb3ba", "#ffdfba"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 9: Unknown row factor example
test("area-model-multiplication - Unknown row factor", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 500,
		height: 250,
		rowFactors: [{ type: "unknown" }],
		columnFactors: [
			{ type: "value", value: 200 },
			{ type: "value", value: 30 },
			{ type: "value", value: 6 }
		],
		cellContents: [[
			{ type: "value", value: 1200 },
			{ type: "value", value: 180 },
			{ type: "value", value: 36 }
		]],
		cellColors: [["#bae1ff", "#ffb3ba", "#ffdfba"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 10: Unknown column factors example
test("area-model-multiplication - Unknown column factors", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 500,
		height: 250,
		rowFactors: [{ type: "value", value: 4 }],
		columnFactors: [
			{ type: "unknown" },
			{ type: "value", value: 30 },
			{ type: "unknown" }
		],
		cellContents: [[
			{ type: "value", value: 160 },
			{ type: "value", value: 120 },
			{ type: "value", value: 12 }
		]],
		cellColors: [["#bae1ff", "#ffb3ba", "#ffdfba"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 11: All factors unknown - completely empty area model
test("area-model-multiplication - All factors unknown", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 500,
		height: 250,
		rowFactors: [{ type: "unknown" }],
		columnFactors: [
			{ type: "unknown" },
			{ type: "unknown" },
			{ type: "unknown" }
		],
		cellContents: [[
			{ type: "unknown" },
			{ type: "unknown" },
			{ type: "unknown" }
		]],
		cellColors: [["#bae1ff", "#ffb3ba", "#ffdfba"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 12: Division problem example - 5,632 ÷ 8 using area model (like Question 9 from user example)
test("area-model-multiplication - Division problem 5632 ÷ 8", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 500,
		height: 250,
		rowFactors: [{ type: "value", value: 8 }],
		columnFactors: [
			{ type: "unknown" },
			{ type: "value", value: 32 }
		],
		cellContents: [[
			{ type: "value", value: 5600 },
			{ type: "value", value: 32 }
		]],
		cellColors: [["#2c72ae1a", "#c07ea41a"]]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 13: Multi-row area model (2×2 grid) - representing the HTML example
test("area-model-multiplication - Multi-row 2x2 grid", async () => {
	const input = {
		type: "areaModelMultiplication",
		width: 500,
		height: 300,
		rowFactors: [
			{ type: "value", value: 70 },
			{ type: "value", value: 2 }
		],
		columnFactors: [
			{ type: "value", value: 90 },
			{ type: "value", value: 10 }
		],
		cellContents: [
			[
				{ type: "unknown" }, // 70 × 90 = 6300 (but shown as unknown)
				{ type: "value", value: 700 } // 70 × 10 = 700
			],
			[
				{ type: "value", value: 180 }, // 2 × 90 = 180  
				{ type: "value", value: 20 } // 2 × 10 = 20
			]
		],
		cellColors: [
			["#bae1ff", "#ffb3ba"], // Top row colors
			["#ffdfba", "#baffc9"]  // Bottom row colors
		]
	} satisfies AreaModelMultiplicationInput

	// Validate the input
	const parseResult = AreaModelMultiplicationPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for area-model-multiplication:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateAreaModelMultiplication(parseResult.data)
	expect(svg).toMatchSnapshot()
})