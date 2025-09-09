import { expect, test } from "bun:test"
import { z } from "zod"
import { generateFractionMultiplicationModel, FractionMultiplicationModelPropsSchema } from "@/lib/widgets/generators/fraction-multiplication-model"

type FractionMultiplicationModelInput = z.input<typeof FractionMultiplicationModelPropsSchema>

// Test case 1: Basic rectangle multiplication - 3/6 × 2 = 6/6
test("fraction-multiplication-model - Rectangle 3/6 × 2", async () => {
	const input = {
		type: "fractionMultiplicationModel",
		width: 800,
		height: 300,
		leftOperand: {
			shape: {
				type: "rectangle",
				rows: 2,
				columns: 3
			},
			totalParts: 6,
			shadedParts: 3,
			shadeColor: "#4472C4"
		},
		middleTerm: {
			type: "number",
			value: 2
		},
		rightOperand: {
			shape: {
				type: "rectangle",
				rows: 2,
				columns: 3
			},
			totalParts: 6,
			shadedParts: 6,
			shadeColor: "#4472C4"
		}
	} satisfies FractionMultiplicationModelInput

	// Validate the input
	const parseResult = FractionMultiplicationModelPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for fraction-multiplication-model:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateFractionMultiplicationModel(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 2: Question 136848 example - 8/14 × 4 = 32/14
test("fraction-multiplication-model - Rectangle 8/14 × 4", async () => {
	const input = {
		type: "fractionMultiplicationModel",
		width: 900,
		height: 300,
		leftOperand: {
			shape: {
				type: "rectangle",
				rows: 2,
				columns: 7
			},
			totalParts: 14,
			shadedParts: 8,
			shadeColor: "#4472C4"
		},
		middleTerm: {
			type: "number",
			value: 4
		},
		rightOperand: {
			shape: {
				type: "rectangle",
				rows: 2,
				columns: 7
			},
			totalParts: 14,
			shadedParts: 32,
			shadeColor: "#4472C4"
		}
	} satisfies FractionMultiplicationModelInput

	// Validate the input
	const parseResult = FractionMultiplicationModelPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for fraction-multiplication-model:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateFractionMultiplicationModel(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 3: Circle multiplication - 2/8 × 3 = 6/8
test("fraction-multiplication-model - Circle 2/8 × 3", async () => {
	const input = {
		type: "fractionMultiplicationModel",
		width: 800,
		height: 300,
		leftOperand: {
			shape: {
				type: "circle"
			},
			totalParts: 8,
			shadedParts: 2,
			shadeColor: "#FF6B6B"
		},
		middleTerm: {
			type: "number",
			value: 3
		},
		rightOperand: {
			shape: {
				type: "circle"
			},
			totalParts: 8,
			shadedParts: 6,
			shadeColor: "#FF6B6B"
		}
	} satisfies FractionMultiplicationModelInput

	// Validate the input
	const parseResult = FractionMultiplicationModelPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for fraction-multiplication-model:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateFractionMultiplicationModel(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 4: Triangle multiplication - 1/3 × 2 = 2/3
test("fraction-multiplication-model - Triangle 1/3 × 2", async () => {
	const input = {
		type: "fractionMultiplicationModel",
		width: 800,
		height: 300,
		leftOperand: {
			shape: {
				type: "polygon",
				sides: 3,
				rotation: 0
			},
			totalParts: 3,
			shadedParts: 1,
			shadeColor: "#9FE2BF"
		},
		middleTerm: {
			type: "number",
			value: 2
		},
		rightOperand: {
			shape: {
				type: "polygon",
				sides: 3,
				rotation: 0
			},
			totalParts: 3,
			shadedParts: 2,
			shadeColor: "#9FE2BF"
		}
	} satisfies FractionMultiplicationModelInput

	// Validate the input
	const parseResult = FractionMultiplicationModelPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for fraction-multiplication-model:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateFractionMultiplicationModel(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 5: Hexagon multiplication - 2/6 × 3 = 6/6
test("fraction-multiplication-model - Hexagon 2/6 × 3", async () => {
	const input = {
		type: "fractionMultiplicationModel",
		width: 800,
		height: 300,
		leftOperand: {
			shape: {
				type: "polygon",
				sides: 6,
				rotation: 0
			},
			totalParts: 6,
			shadedParts: 2,
			shadeColor: "#FFD93D"
		},
		middleTerm: {
			type: "number",
			value: 3
		},
		rightOperand: {
			shape: {
				type: "polygon",
				sides: 6,
				rotation: 0
			},
			totalParts: 6,
			shadedParts: 6,
			shadeColor: "#FFD93D"
		}
	} satisfies FractionMultiplicationModelInput

	// Validate the input
	const parseResult = FractionMultiplicationModelPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for fraction-multiplication-model:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateFractionMultiplicationModel(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 6: Placeholder middle term - 1/4 × ? = 3/4
test("fraction-multiplication-model - Rectangle 1/4 × placeholder", async () => {
	const input = {
		type: "fractionMultiplicationModel",
		width: 800,
		height: 300,
		leftOperand: {
			shape: {
				type: "rectangle",
				rows: 2,
				columns: 2
			},
			totalParts: 4,
			shadedParts: 1,
			shadeColor: "#DE3163"
		},
		middleTerm: {
			type: "placeholder"
		},
		rightOperand: {
			shape: {
				type: "rectangle",
				rows: 2,
				columns: 2
			},
			totalParts: 4,
			shadedParts: 3,
			shadeColor: "#DE3163"
		}
	} satisfies FractionMultiplicationModelInput

	// Validate the input
	const parseResult = FractionMultiplicationModelPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for fraction-multiplication-model:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateFractionMultiplicationModel(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 7: Mixed shapes - Rectangle × 2 = Circle
test("fraction-multiplication-model - Mixed shapes 3/12 × 2", async () => {
	const input = {
		type: "fractionMultiplicationModel",
		width: 800,
		height: 300,
		leftOperand: {
			shape: {
				type: "rectangle",
				rows: 3,
				columns: 4
			},
			totalParts: 12,
			shadedParts: 3,
			shadeColor: "#40E0D0"
		},
		middleTerm: {
			type: "number",
			value: 2
		},
		rightOperand: {
			shape: {
				type: "circle"
			},
			totalParts: 12,
			shadedParts: 6,
			shadeColor: "#40E0D0"
		}
	} satisfies FractionMultiplicationModelInput

	// Validate the input
	const parseResult = FractionMultiplicationModelPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for fraction-multiplication-model:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateFractionMultiplicationModel(parseResult.data)
	expect(svg).toMatchSnapshot()
})

// Test case 8: Zero multiplication - 0/5 × 3 = 0/5
test("fraction-multiplication-model - Circle 0/5 × 3", async () => {
	const input = {
		type: "fractionMultiplicationModel",
		width: 800,
		height: 300,
		leftOperand: {
			shape: {
				type: "circle"
			},
			totalParts: 5,
			shadedParts: 0,
			shadeColor: "#E6E6FA"
		},
		middleTerm: {
			type: "number",
			value: 3
		},
		rightOperand: {
			shape: {
				type: "circle"
			},
			totalParts: 5,
			shadedParts: 0,
			shadeColor: "#E6E6FA"
		}
	} satisfies FractionMultiplicationModelInput

	// Validate the input
	const parseResult = FractionMultiplicationModelPropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for fraction-multiplication-model:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = await generateFractionMultiplicationModel(parseResult.data)
	expect(svg).toMatchSnapshot()
})
