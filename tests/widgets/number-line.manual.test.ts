// ============================================================================
// MANUAL TEST FILE - NEW SCHEMA FORMAT
// ============================================================================
// This file contains the same test cases as number-line.extracted.test.ts
// but converted to use the new schema format with bounds, interval, 
// primaryLabels, and secondaryLabels.
//
// Run tests: bun test tests/widgets/number-line.manual.test.ts
// Update snapshots: bun test tests/widgets/number-line.manual.test.ts --update-snapshots
// ============================================================================

import { expect, test } from "bun:test"
import type { z } from "zod"
import { generateNumberLine, NumberLinePropsSchema } from "@/lib/widgets/generators"

type NumberLineInput = z.input<typeof NumberLinePropsSchema>


// Extracted from question: xb3704fceda59f25f
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -15,
				"upper": 15
		},
		"interval": 3,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-3,
						0,
						3
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -15,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xdae754517ed494ca
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -15,
				"upper": 15
		},
		"interval": 3,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-3,
						0,
						3
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -12,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x34d24c3693e1d844
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 10,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-2,
						0,
						2
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -6,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xbe02b8fb6422f7af
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -25,
				"upper": 25
		},
		"interval": 5,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-5,
						0,
						5
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -20,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc004713f8a564a33
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -20,
				"upper": 20
		},
		"interval": 4,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-4,
						0,
						4
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -16,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x49b3274645e4b5aa
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: number_line_initial
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -20,
				"upper": 20
		},
		"interval": 4,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "unlabeled"
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x49b3274645e4b5aa
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: number_line_choice_a
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -20,
				"upper": 20
		},
		"interval": 4,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": null,
								"value": 12,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x49b3274645e4b5aa
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: number_line_choice_b
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -20,
				"upper": 20
		},
		"interval": 4,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": null,
								"value": 8,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x49b3274645e4b5aa
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: number_line_choice_c
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -20,
				"upper": 20
		},
		"interval": 4,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": null,
								"value": 16,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6e0f8f4f89d5d1f9
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: number_line_initial
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "unlabeled"
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6e0f8f4f89d5d1f9
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: number_line_choice_a
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": " ",
								"value": 8,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6e0f8f4f89d5d1f9
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: number_line_choice_b
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": " ",
								"value": 6,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6e0f8f4f89d5d1f9
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: number_line_choice_c
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": " ",
								"value": 10,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x316c0770a8b9704f
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -20,
				"upper": 20
		},
		"interval": 20,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-4,
						4
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0c7f99",
								"label": "?",
								"value": -12,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xbe60cd481ef15a99
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -20,
				"upper": 20
		},
		"interval": 4,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-4,
						0,
						4
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0c7f99",
								"label": "?",
								"value": 16,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x07b6fc89523b9a35
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -15,
				"upper": 15
		},
		"interval": 3,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-3,
						0,
						3
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#29abca",
								"label": "?",
								"value": -6,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x5ac3d3b0638e144a
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -10,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x98647957d1ad2fc1
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -25,
				"upper": 25
		},
		"interval": 5,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-5,
						0,
						5
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -15,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xd82a2829e11b6beb
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -30,
				"upper": 30
		},
		"interval": 6,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-6,
						0,
						6
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0c7f99",
								"label": "?",
								"value": 18,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x5a611e4cc4eed8d6
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -30,
				"upper": 30
		},
		"interval": 6,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -30,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xacb997c47313a606
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -30,
				"upper": 30
		},
		"interval": 6,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-6,
						0,
						6
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -12,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xcf9144cd5aaae605
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 2,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-2,
						0,
						2
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -6,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x0009c4c3efb4c38d
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -35,
				"upper": 35
		},
		"interval": 7,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-7,
						0,
						7
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0c7f99",
								"label": "?",
								"value": -14,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc45824ff7ae607c9
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -40,
				"upper": 40
		},
		"interval": 8,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-8,
						0,
						8
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0c7f99",
								"label": "?",
								"value": -32,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x24a5d0824f1a3298
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -25,
				"upper": 25
		},
		"interval": 5,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-5,
						0,
						5
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0C7F99",
								"label": "?",
								"value": -10,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x493cf88fe059a1e2
// Course: 6th grade math
// Exercise: Negative numbers on the number line
// Widget key: image_2
test("number-line - Negative numbers on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 77,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -35,
				"upper": 35
		},
		"interval": 7,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						-7,
						0,
						7
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#29abca",
								"label": "?",
								"value": -35,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x9bdd37009fb0e6e0
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 4
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "C",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xa7a6286b688fd181
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "B",
								"value": -1,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6260dd813b89d59e
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: nl_choice_a
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": " ",
								"value": -3,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6260dd813b89d59e
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: nl_choice_b
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": " ",
								"value": 3,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6260dd813b89d59e
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: nl_choice_c
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": " ",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6260dd813b89d59e
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_initial
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "unlabeled"
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xbaadddeb
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 10
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -4,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": 6,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 7,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 10,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x57b35c359b98a3f4
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": "D",
								"value": -1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc527646af4c9351b
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.6,
				"upper": 0.6
		},
		"interval": 0.2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": "F",
								"value": -0.4,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x4258e7f78f578111
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_initial
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": "B",
								"value": -3,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x4258e7f78f578111
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_a
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": " ",
								"value": -3,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x4258e7f78f578111
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_b
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": " ",
								"value": 3,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x4258e7f78f578111
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_c
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": " ",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xf3d9cc00e32d464f
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": 5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xb258023ca47a4510
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": "D",
								"value": -1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc1ac295ed6fa5fa1
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_initial
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc1ac295ed6fa5fa1
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_a
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "-A",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc1ac295ed6fa5fa1
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_b
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "-A",
								"value": -2,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc1ac295ed6fa5fa1
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_c
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "-A",
								"value": 2,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x0a5a1f1a80352070
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_initial
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "unlabeled"
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x0a5a1f1a80352070
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_a
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": null,
								"value": -2.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x0a5a1f1a80352070
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_b
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": null,
								"value": 2.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x0a5a1f1a80352070
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_c
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": null,
								"value": -1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x5c584447c7fbea75
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.6,
				"upper": 0.6
		},
		"interval": 0.2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ED",
								"label": "E",
								"value": 0.2,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xd2a3d7af
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 10
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -5,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -4,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": -2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8aa5a97c4a23bc52
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_a
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": " ",
								"value": 3.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8aa5a97c4a23bc52
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_b
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": " ",
								"value": -3.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8aa5a97c4a23bc52
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_c
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": " ",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6d35fcf1b7fa9959
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_initial
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ED",
								"label": "C",
								"value": 0.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6d35fcf1b7fa9959
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_a
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#FFA500",
								"label": "-C",
								"value": -0.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6d35fcf1b7fa9959
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_b
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#FFA500",
								"label": "-C",
								"value": 0.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x6d35fcf1b7fa9959
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_c
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#FFA500",
								"label": "-C",
								"value": -1,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x71fd721566a5360d
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "C",
								"value": 0.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xa3c11a88943b406b
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_initial
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ED",
								"label": "C",
								"value": 1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xa3c11a88943b406b
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_a
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ED",
								"label": "-(-C)",
								"value": 1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xa3c11a88943b406b
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_b
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ED",
								"label": "-(-C)",
								"value": -1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xa3c11a88943b406b
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_c
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ED",
								"label": "-(-C)",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8fb40438b7f86b03
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": 6,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x39165496dae143a7
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": "F",
								"value": -1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x86b2a3e066427391
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": "C",
								"value": 1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x62c748d6
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -7,
				"upper": 7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -7,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": 3,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 4,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 7,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xec3627429af7b5ea
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.6,
				"upper": 0.6
		},
		"interval": 0.2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ED",
								"label": "E",
								"value": 0.6,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x2d9a73dec8936789
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_a
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": " ",
								"value": -1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x2d9a73dec8936789
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_b
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": " ",
								"value": 1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x2d9a73dec8936789
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: number_line_choice_c
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": " ",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x11099043
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 10
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -4,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": 4,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 7,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 9,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xfee6aa630d739238
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ED",
								"label": "B",
								"value": -7,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xa4b45b740128203d
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -3,
				"upper": 3
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "D",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xb6d191d1
// Course: 6th grade math
// Exercise: Negative symbol as opposite
// Widget key: image_1
test("number-line - Negative symbol as opposite", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 10
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -5,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -4,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": -2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x24f798bd
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: image_1
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -7,
				"upper": 7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -7,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": 3,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 4,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 7,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x16fab81c
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: image_1
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 10
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -5,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -4,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": -2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x1b944977
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: image_1
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -7,
				"upper": 7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -6,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -3,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": -1,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 1,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x81ab69357992c427
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_initial
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -6,
				"upper": 6
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "unlabeled"
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x81ab69357992c427
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_choice_a
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 500,
		"height": 100,
		"orientation": "horizontal",
		"bounds": {
				"lower": -6,
				"upper": 6
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": null,
								"value": -4,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x81ab69357992c427
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_choice_b
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 500,
		"height": 100,
		"orientation": "horizontal",
		"bounds": {
				"lower": -6,
				"upper": 6
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": null,
								"value": 4,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x81ab69357992c427
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_choice_c
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 500,
		"height": 100,
		"orientation": "horizontal",
		"bounds": {
				"lower": -6,
				"upper": 6
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": null,
								"value": -2,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xcb3e37851559832d
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_initial
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -1.5,
				"upper": 1.5
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "unlabeled"
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xcb3e37851559832d
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_choice_a
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -1.5,
				"upper": 1.5
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": " ",
								"value": -1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xcb3e37851559832d
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_choice_b
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -1.5,
				"upper": 1.5
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": " ",
								"value": 1.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xcb3e37851559832d
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_choice_c
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -1.5,
				"upper": 1.5
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": " ",
								"value": -1,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x7da07235
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: image_1
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -7,
				"upper": 7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -7,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": 0,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 7,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xd1cb5115
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: image_1
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 10
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -5,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": 0,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 2,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 7,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x10a2191e
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: image_1
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -7,
				"upper": 7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -7,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -4,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": 0,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 3,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 7,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8f7d9f5cd0ea9740
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_initial
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "unlabeled"
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8f7d9f5cd0ea9740
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_choice_a
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": " ",
								"value": 0.4,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8f7d9f5cd0ea9740
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_choice_b
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": " ",
								"value": -0.4,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8f7d9f5cd0ea9740
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: number_line_choice_c
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": " ",
								"value": 0.6,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8d5fa3f4
// Course: 6th grade math
// Exercise: Number opposites
// Widget key: image_1
test("number-line - Number opposites", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -7,
				"upper": 7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -6,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -4,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": -1,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": 1,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "E",
								"value": 4,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x29aea29b0fa53f17
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -6,
				"upper": -4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#DAA520",
								"label": "A",
								"value": -5.85,
								"labelPosition": "above"
						},
						{
								"color": "#E53935",
								"label": "B",
								"value": -5.55,
								"labelPosition": "above"
						},
						{
								"color": "#8E44AD",
								"label": "C",
								"value": -5,
								"labelPosition": "above"
						},
						{
								"color": "#009688",
								"label": "D",
								"value": -4.35,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x29aea29b0fa53f17
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_a_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 500,
		"height": 100,
		"orientation": "horizontal",
		"bounds": {
				"lower": -6,
				"upper": -4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#DAA520",
								"label": "A",
								"value": -5.85,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x29aea29b0fa53f17
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_b_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 500,
		"height": 100,
		"orientation": "horizontal",
		"bounds": {
				"lower": -6,
				"upper": -4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#E53935",
								"label": "B",
								"value": -5.55,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x29aea29b0fa53f17
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_c_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 500,
		"height": 100,
		"orientation": "horizontal",
		"bounds": {
				"lower": -6,
				"upper": -4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#8E44AD",
								"label": "C",
								"value": -5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x29aea29b0fa53f17
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_d_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 500,
		"height": 100,
		"orientation": "horizontal",
		"bounds": {
				"lower": -6,
				"upper": -4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#009688",
								"label": "D",
								"value": -4.35,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xdbfaa778348e2ec0
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 86,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -0.66,
				"upper": -0.54
		},
		"interval": 0.01,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#29abca",
								"label": " ",
								"value": -0.58,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xd517f5fb6cdfc91a
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 86,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -8.1,
				"upper": -6.9
		},
		"interval": 0.1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#29abca",
								"label": "?",
								"value": -7.4,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc3ebd036c8e54375
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.6,
				"upper": -0.4
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#E1A158",
								"label": "A",
								"value": -0.585,
								"labelPosition": "above"
						},
						{
								"color": "#FC6255",
								"label": "B",
								"value": -0.565,
								"labelPosition": "above"
						},
						{
								"color": "#9A72AC",
								"label": "C",
								"value": -0.445,
								"labelPosition": "above"
						},
						{
								"color": "#55C1A7",
								"label": "D",
								"value": -0.415,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc3ebd036c8e54375
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_a_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.6,
				"upper": -0.4
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#E1A158",
								"label": "A",
								"value": -0.585,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc3ebd036c8e54375
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_b_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.6,
				"upper": -0.4
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#FC6255",
								"label": "B",
								"value": -0.565,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc3ebd036c8e54375
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_c_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.6,
				"upper": -0.4
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#9A72AC",
								"label": "C",
								"value": -0.445,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc3ebd036c8e54375
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_d_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.6,
				"upper": -0.4
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#55C1A7",
								"label": "D",
								"value": -0.415,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x9df6ca1b23a494bb
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 86.4,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -5.6,
				"upper": -4.4
		},
		"interval": 0.1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#29abca",
								"label": "?",
								"value": -4.9,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x1efaaf1d882f1a6a
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 86.4,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -11.6,
				"upper": -10.4
		},
		"interval": 0.3,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#29abca",
								"label": "?",
								"value": -11.3,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x14e9f1fac8768ced
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 86,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -3.1,
				"upper": -1.9
		},
		"interval": 0.1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#29abca",
								"label": "?",
								"value": -2.1,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x60b42de6a30dbff3
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -9,
				"upper": -7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#DAA520",
								"label": "A",
								"value": -8.75,
								"labelPosition": "above"
						},
						{
								"color": "#E74C3C",
								"label": "B",
								"value": -8.65,
								"labelPosition": "above"
						},
						{
								"color": "#8E44AD",
								"label": "C",
								"value": -7.55,
								"labelPosition": "above"
						},
						{
								"color": "#11ACCD",
								"label": "D",
								"value": -7.15,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x3f9fabfbe3ac2cbc
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.2,
				"upper": 0
		},
		"interval": 0.1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#e1a158",
								"label": "A",
								"value": -0.175,
								"labelPosition": "above"
						},
						{
								"color": "#fc6255",
								"label": "B",
								"value": -0.155,
								"labelPosition": "above"
						},
						{
								"color": "#9a72ac",
								"label": "C",
								"value": -0.095,
								"labelPosition": "above"
						},
						{
								"color": "#55c1a7",
								"label": "D",
								"value": -0.055,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x3f9fabfbe3ac2cbc
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_a_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.2,
				"upper": 0
		},
		"interval": 0.1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#e1a158",
								"label": "A",
								"value": -0.175,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x3f9fabfbe3ac2cbc
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_b_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.2,
				"upper": 0
		},
		"interval": 0.1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#fc6255",
								"label": "B",
								"value": -0.155,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x3f9fabfbe3ac2cbc
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_c_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.2,
				"upper": 0
		},
		"interval": 0.1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#9a72ac",
								"label": "C",
								"value": -0.095,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x3f9fabfbe3ac2cbc
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_d_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.2,
				"upper": 0
		},
		"interval": 0.1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#55c1a7",
								"label": "D",
								"value": -0.055,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x5823476d1dc18d37
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_a_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": -2
		},
		"interval": 0.2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -3.8,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x5823476d1dc18d37
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_b_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": -2
		},
		"interval": 0.2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "B",
								"value": -3.35,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x5823476d1dc18d37
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_c_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": -2
		},
		"interval": 0.2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "C",
								"value": -2.95,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x5823476d1dc18d37
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_d_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": -2
		},
		"interval": 0.2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "D",
								"value": -2.2,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x5823476d1dc18d37
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: number_line_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": -2
		},
		"interval": 0.2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "A",
								"value": -3.8,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": -3.35,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": -2.95,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "D",
								"value": -2.2,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xbef9886a4ca6a4b2
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -9,
				"upper": -7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#e1a158",
								"label": "A",
								"value": -8.95,
								"labelPosition": "above"
						},
						{
								"color": "#fc6255",
								"label": "B",
								"value": -8.45,
								"labelPosition": "above"
						},
						{
								"color": "#9a72ac",
								"label": "C",
								"value": -8.15,
								"labelPosition": "above"
						},
						{
								"color": "#55c1a7",
								"label": "D",
								"value": -7.75,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x3084215479d28e9d
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -3,
				"upper": -1
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#FFB800",
								"label": "A",
								"value": -2.15,
								"labelPosition": "above"
						},
						{
								"color": "#E53935",
								"label": "B",
								"value": -1.85,
								"labelPosition": "above"
						},
						{
								"color": "#8E44AD",
								"label": "C",
								"value": -1.45,
								"labelPosition": "above"
						},
						{
								"color": "#11ACCD",
								"label": "D",
								"value": -1.05,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xaf24a4f1eb7b57f3
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 86.4,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -7.1,
				"upper": -5.9
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#29abca",
								"label": "?",
								"value": -6.8,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc5d9c30fb36fc4af
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 86.4,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -3.26,
				"upper": -3.14
		},
		"interval": 0.01,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#29abca",
								"label": "?",
								"value": -3.21,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xe224445baec45957
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -9,
				"upper": -7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#DAA520",
								"label": "A",
								"value": -8.7,
								"labelPosition": "above"
						},
						{
								"color": "#E53935",
								"label": "B",
								"value": -8.25,
								"labelPosition": "above"
						},
						{
								"color": "#8E44AD",
								"label": "C",
								"value": -7.75,
								"labelPosition": "above"
						},
						{
								"color": "#11ACCD",
								"label": "D",
								"value": -7.55,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xe224445baec45957
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_a_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -9,
				"upper": -7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#DAA520",
								"label": "A",
								"value": -8.7,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xe224445baec45957
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_b_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -9,
				"upper": -7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#E53935",
								"label": "B",
								"value": -8.25,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xe224445baec45957
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_c_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -9,
				"upper": -7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#8E44AD",
								"label": "C",
								"value": -7.75,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xe224445baec45957
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_d_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -9,
				"upper": -7
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#11ACCD",
								"label": "D",
								"value": -7.55,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x2c21184e2764adc1
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 86,
		"height": 240,
		"orientation": "vertical",
		"bounds": {
				"lower": -1.14,
				"upper": -1.04
		},
		"interval": 0.01,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#29abca",
								"label": "?",
								"value": -1.13,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xae3d2ea11f397d71
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.3,
				"upper": -0.1
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#E1A158",
								"label": "A",
								"value": -0.265,
								"labelPosition": "above"
						},
						{
								"color": "#FC6255",
								"label": "B",
								"value": -0.215,
								"labelPosition": "above"
						},
						{
								"color": "#9A72AC",
								"label": "C",
								"value": -0.175,
								"labelPosition": "above"
						},
						{
								"color": "#55C1A7",
								"label": "D",
								"value": -0.135,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xae3d2ea11f397d71
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_a_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.3,
				"upper": -0.1
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#E1A158",
								"label": "A",
								"value": -0.265,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xae3d2ea11f397d71
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_b_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.3,
				"upper": -0.1
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#FC6255",
								"label": "B",
								"value": -0.215,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xae3d2ea11f397d71
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_c_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.3,
				"upper": -0.1
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#9A72AC",
								"label": "C",
								"value": -0.175,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xae3d2ea11f397d71
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_d_visual
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -0.3,
				"upper": -0.1
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#55C1A7",
								"label": "D",
								"value": -0.135,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xde6ccea133eaaffa
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: image_1
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -1,
				"upper": -0.8
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#e1a158",
								"label": "A",
								"value": -0.95,
								"labelPosition": "above"
						},
						{
								"color": "#fc6255",
								"label": "B",
								"value": -0.905,
								"labelPosition": "above"
						},
						{
								"color": "#9a72ac",
								"label": "C",
								"value": -0.88,
								"labelPosition": "above"
						},
						{
								"color": "#55c1a7",
								"label": "D",
								"value": -0.835,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xde6ccea133eaaffa
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_a_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -1,
				"upper": -0.8
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#e1a158",
								"label": "A",
								"value": -0.95,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xde6ccea133eaaffa
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_b_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -1,
				"upper": -0.8
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#fc6255",
								"label": "B",
								"value": -0.905,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xde6ccea133eaaffa
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_c_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -1,
				"upper": -0.8
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#9a72ac",
								"label": "C",
								"value": -0.88,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xde6ccea133eaaffa
// Course: 6th grade math
// Exercise: Negative decimals on the number line
// Widget key: choice_d_image
test("number-line - Negative decimals on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -1,
				"upper": -0.8
		},
		"interval": 0.05,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#55c1a7",
								"label": "D",
								"value": -0.835,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xa475bef900ac39d7
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 80,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -1,
				"upper": 1
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#11accd",
								"label": " ",
								"value": -0.6666666666666666,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xe1edaad8beed5751
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 380,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 5
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "A",
								"value": -3.5,
								"labelPosition": "above"
						},
						{
								"color": "#9e034e",
								"label": "B",
								"value": -2.5,
								"labelPosition": "above"
						},
						{
								"color": "#543b78",
								"label": "C",
								"value": 2.5,
								"labelPosition": "above"
						},
						{
								"color": "#208170",
								"label": "D",
								"value": 3.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xd7741eb9316d7cf8
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 380,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -3,
				"upper": 3
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "A",
								"value": -2.75,
								"labelPosition": "above"
						},
						{
								"color": "#9e034e",
								"label": "B",
								"value": -1.75,
								"labelPosition": "above"
						},
						{
								"color": "#543b78",
								"label": "C",
								"value": -0.25,
								"labelPosition": "above"
						},
						{
								"color": "#208170",
								"label": "D",
								"value": 1.75,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x3913551001193e80
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 380,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -3,
				"upper": 3
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#11accd",
								"label": " ",
								"value": -1.1666666666666667,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xf3451ee9a41cff2b
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 80,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -3,
				"upper": 3
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "D",
								"value": -1.3333333333,
								"labelPosition": "right"
						},
						{
								"color": "#000000",
								"label": "C",
								"value": -0.6666666667,
								"labelPosition": "right"
						},
						{
								"color": "#000000",
								"label": "B",
								"value": 0.6666666667,
								"labelPosition": "right"
						},
						{
								"color": "#000000",
								"label": "A",
								"value": 1.3333333333,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x20f54014b426ee0b
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 380,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "A",
								"value": -2,
								"labelPosition": "above"
						},
						{
								"color": "#9e034e",
								"label": "B",
								"value": -1.625,
								"labelPosition": "above"
						},
						{
								"color": "#543b78",
								"label": "C",
								"value": -0.625,
								"labelPosition": "above"
						},
						{
								"color": "#208170",
								"label": "D",
								"value": 0.625,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xfad84ed676e52ee6
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 80,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -2,
				"upper": 1
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#208170",
								"label": "D",
								"value": -1.1666666667,
								"labelPosition": "right"
						},
						{
								"color": "#543B78",
								"label": "C",
								"value": -0.1666666667,
								"labelPosition": "right"
						},
						{
								"color": "#9E034E",
								"label": "B",
								"value": 0.1666666667,
								"labelPosition": "right"
						},
						{
								"color": "#A75A05",
								"label": "A",
								"value": 0.8333333333,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x7eaab7b4893b97ab
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 380,
		"height": 100,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 1
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#11accd",
								"label": " ",
								"value": -3.25,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x52c875c67916e191
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 80,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -3,
				"upper": 3
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#11accd",
								"label": " ",
								"value": -2.5,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x7b7f2a8fdad7a6ff
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 80,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -2,
				"upper": 1
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#208170",
								"label": "D",
								"value": -1.625,
								"labelPosition": "right"
						},
						{
								"color": "#543b78",
								"label": "C",
								"value": -1.375,
								"labelPosition": "right"
						},
						{
								"color": "#9e034e",
								"label": "B",
								"value": -0.625,
								"labelPosition": "right"
						},
						{
								"color": "#a75a05",
								"label": "A",
								"value": 0.375,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x7143c04d7dd02c60
// Course: 6th grade math
// Exercise: Negative fractions on the number line
// Widget key: image_1
test("number-line - Negative fractions on the number line", () => {
	const input = {
		"type": "numberLine",
		"width": 80,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#11accd",
								"label": " ",
								"value": -1.25,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x43717a1e6c056612
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 320,
		"height": 90,
		"orientation": "horizontal",
		"bounds": {
				"lower": -7,
				"upper": 1
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#ca337c",
								"label": " ",
								"value": -5.3,
								"labelPosition": "above"
						},
						{
								"color": "#7854ab",
								"label": " ",
								"value": -0.8,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x17a4b145738ad7fb
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 100,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -6,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": -4.4,
								"labelPosition": "right"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": 1.2,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x3696bd8a34c4bf95
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 100,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -6,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": 0.1666667,
								"labelPosition": "right"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": -3.75,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x2fa6108b95444f8e
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 320,
		"height": 90,
		"orientation": "horizontal",
		"bounds": {
				"lower": -6,
				"upper": 3
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#ca337c",
								"label": " ",
								"value": -4.666666666666667,
								"labelPosition": "above"
						},
						{
								"color": "#7854ab",
								"label": " ",
								"value": 1.7142857142857142,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xfdede3ef5b94f114
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 100,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -7,
				"upper": 1
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": -6.2,
								"labelPosition": "right"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": -3.7,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xc768ecc77ce1221a
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 100,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -8,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": null,
								"value": -1.4,
								"labelPosition": "right"
						},
						{
								"color": "#ca337c",
								"label": null,
								"value": -6.4,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x89dccd41cb5265aa
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 100,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -8,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": -2.2222222222,
								"labelPosition": "right"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": -6.6666666667,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x926e7a33353efa1d
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 320,
		"height": 90,
		"orientation": "horizontal",
		"bounds": {
				"lower": -3,
				"upper": 6
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": 5.1,
								"labelPosition": "above"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": -1.9,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xd3d944e40c0bc157
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 320,
		"height": 90,
		"orientation": "horizontal",
		"bounds": {
				"lower": -3,
				"upper": 3
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": -1.1428571428571428,
								"labelPosition": "above"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": 2.25,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x84388493f94ef2c8
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 100,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -5,
				"upper": 5
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#ca337c",
								"label": " ",
								"value": 3.8,
								"labelPosition": "right"
						},
						{
								"color": "#7854ab",
								"label": " ",
								"value": -2.2857142857142856,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x9b4a71e56bdb9bec
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 100,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -3,
				"upper": 3
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": 2.3,
								"labelPosition": "left"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": -2.6,
								"labelPosition": "left"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xaaa92e7ce5eeaf77
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 320,
		"height": 90,
		"orientation": "horizontal",
		"bounds": {
				"lower": -9,
				"upper": 1
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": -7.7,
								"labelPosition": "above"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": -3.3,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xfbb37f1cb114c9a2
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 320,
		"height": 90,
		"orientation": "horizontal",
		"bounds": {
				"lower": -7,
				"upper": 1
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": -6.375,
								"labelPosition": "above"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": -4.1111111111,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x0b02571c9974b1ac
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 320,
		"height": 90,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": -2.4,
								"labelPosition": "above"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": 0.6,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x552ce2d68833781e
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 320,
		"height": 90,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 2
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#ca337c",
								"label": " ",
								"value": -2.5,
								"labelPosition": "above"
						},
						{
								"color": "#7854ab",
								"label": " ",
								"value": -0.6666667,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xae369f6f8763ba86
// Course: 6th grade math
// Exercise: Compare rational numbers using a number line
// Widget key: image_1
test("number-line - Compare rational numbers using a number line", () => {
	const input = {
		"type": "numberLine",
		"width": 100,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -3,
				"upper": 3
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#7854ab",
								"label": " ",
								"value": -2.3333333333333335,
								"labelPosition": "left"
						},
						{
								"color": "#ca337c",
								"label": " ",
								"value": -1.2,
								"labelPosition": "left"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x5db05ceda936c5d0
// Course: 6th grade math
// Exercise: Compare rational numbers
// Widget key: image_1
test("number-line - Compare rational numbers", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -2,
				"upper": 2
		},
		"interval": 0.5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "-1.3",
								"value": -1.3,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "0.7",
								"value": 0.7,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x63be039102b62a98
// Course: 6th grade math
// Exercise: Compare rational numbers
// Widget key: image_1
test("number-line - Compare rational numbers", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "unlabeled"
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x97fa696c66e0b11e
// Course: 6th grade math
// Exercise: Compare rational numbers
// Widget key: image_1
test("number-line - Compare rational numbers", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -20,
				"upper": 20
		},
		"interval": 10,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "−12",
								"value": -12,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "18",
								"value": 18,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x7c61e7280f77ac6a
// Course: 6th grade math
// Exercise: Compare rational numbers
// Widget key: image_1
test("number-line - Compare rational numbers", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -100,
				"upper": 100
		},
		"interval": 50,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": "-76",
								"value": -76,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": "59",
								"value": 59,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x7b49e10b83d18dbc
// Course: 6th grade math
// Exercise: Compare rational numbers
// Widget key: image_1
test("number-line - Compare rational numbers", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 5,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#000000",
								"label": ":[",
								"value": -7.5,
								"labelPosition": "above"
						},
						{
								"color": "#000000",
								"label": ":[",
								"value": 5.7,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x78e22152b5909760
// Course: 6th grade math
// Exercise: Meaning of absolute value
// Widget key: image_1
test("number-line - Meaning of absolute value", () => {
	const input = {
		"type": "numberLine",
		"width": 380,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -100,
				"upper": 100
		},
		"interval": 25,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "Carrie's bill",
								"value": 75,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x3439ba4c308f386b
// Course: 6th grade math
// Exercise: Meaning of absolute value
// Widget key: image_1
test("number-line - Meaning of absolute value", () => {
	const input = {
		"type": "numberLine",
		"width": 380,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "Kendra",
								"value": -6,
								"labelPosition": "above"
						},
						{
								"color": "#0c7f99",
								"label": "Jamal",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x663e2f4f73d9ee79
// Course: 6th grade math
// Exercise: Meaning of absolute value
// Widget key: image_1
test("number-line - Meaning of absolute value", () => {
	const input = {
		"type": "numberLine",
		"width": 144,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -10,
				"upper": 10
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "Temuco",
								"value": 7,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x4bfd696981b7127c
// Course: 6th grade math
// Exercise: Meaning of absolute value
// Widget key: image_1
test("number-line - Meaning of absolute value", () => {
	const input = {
		"type": "numberLine",
		"width": 380,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -400,
				"upper": 400
		},
		"interval": 100,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "Tuition bill",
								"value": -250,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8b9e8ddc0e6e073b
// Course: 6th grade math
// Exercise: Meaning of absolute value
// Widget key: image_1
test("number-line - Meaning of absolute value", () => {
	const input = {
		"type": "numberLine",
		"width": 144,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -4000,
				"upper": 4000
		},
		"interval": 1000,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						0
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "Lhasa",
								"value": 3656,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x85500f36b27c686e
// Course: 6th grade math
// Exercise: Meaning of absolute value
// Widget key: image_1
test("number-line - Meaning of absolute value", () => {
	const input = {
		"type": "numberLine",
		"width": 380,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -8,
				"upper": 8
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "bean bag",
								"value": -4,
								"labelPosition": "above"
						},
						{
								"color": "#0c7f99",
								"label": "hole",
								"value": 0,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xfe3aa964c3345520
// Course: 6th grade math
// Exercise: Meaning of absolute value
// Widget key: image_1
test("number-line - Meaning of absolute value", () => {
	const input = {
		"type": "numberLine",
		"width": 144,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -12,
				"upper": 4
		},
		"interval": 2,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "Ulaanbaatar",
								"value": -8,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x0ddc47203b87395f
// Course: 6th grade math
// Exercise: Meaning of absolute value
// Widget key: image_1
test("number-line - Meaning of absolute value", () => {
	const input = {
		"type": "numberLine",
		"width": 144,
		"height": 325,
		"orientation": "vertical",
		"bounds": {
				"lower": -200,
				"upper": 200
		},
		"interval": 50,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						0
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#a75a05",
								"label": "Lima",
								"value": 154,
								"labelPosition": "right"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x3fbc546d5ef83967
// Course: 6th grade math
// Exercise: Meaning of absolute value
// Widget key: image_1
test("number-line - Meaning of absolute value", () => {
	const input = {
		"type": "numberLine",
		"width": 380,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 5
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#0c7f99",
								"label": "Hole",
								"value": 0,
								"labelPosition": "above"
						},
						{
								"color": "#a75a05",
								"label": "Marble",
								"value": 3,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x8e87fe951d093335
// Course: 6th grade math
// Exercise: Comparing absolute values challenge
// Widget key: image_1
test("number-line - Comparing absolute values challenge", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 5
		},
		"interval": 1,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						0
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ED",
								"label": "a",
								"value": 0,
								"labelPosition": "above"
						},
						{
								"color": "#FF00AF",
								"label": "b",
								"value": 2,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xefd9b9156491a4fa
// Course: 6th grade math
// Exercise: Comparing absolute values challenge
// Widget key: image_1
test("number-line - Comparing absolute values challenge", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": "a",
								"value": -1,
								"labelPosition": "above"
						},
						{
								"color": "#ff00af",
								"label": "b",
								"value": 3.5,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x089a4f0a8b2040ce
// Course: 6th grade math
// Exercise: Comparing absolute values challenge
// Widget key: image_1
test("number-line - Comparing absolute values challenge", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -4,
				"upper": 4
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": "a",
								"value": -3,
								"labelPosition": "above"
						},
						{
								"color": "#ff00af",
								"label": "b",
								"value": 1,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x67bae3afb4e07b89
// Course: 6th grade math
// Exercise: Comparing absolute values challenge
// Widget key: image_1
test("number-line - Comparing absolute values challenge", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 5
		},
		"interval": 1,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						0
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": "a",
								"value": -3,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xad56e1ee6f2d38db
// Course: 6th grade math
// Exercise: Comparing absolute values challenge
// Widget key: image_1
test("number-line - Comparing absolute values challenge", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -1,
				"upper": 1
		},
		"interval": 1,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						0
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ed",
								"label": "a",
								"value": 0.33,
								"labelPosition": "above"
						},
						{
								"color": "#ff00af",
								"label": "b",
								"value": 0.78,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x843497a4f244d2cd
// Course: 6th grade math
// Exercise: Comparing absolute values challenge
// Widget key: image_1
test("number-line - Comparing absolute values challenge", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 80,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 5
		},
		"interval": 5,
		"primaryLabels": {
				"type": "filtered",
				"values": [
						0
				]
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#6495ED",
								"label": "a",
								"value": 2,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: xe6ce0ba1a0c0daa5
// Course: 6th grade math
// Exercise: Graphing basic inequalities
// Widget key: choice_c_number_line
test("number-line - Graphing basic inequalities", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 120,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 5
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#333333",
								"label": null,
								"value": -2,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x0ea6ddf2623b5753
// Course: 6th grade math
// Exercise: Graphing basic inequalities
// Widget key: choice_b_number_line
test("number-line - Graphing basic inequalities", () => {
	const input = {
		"type": "numberLine",
		"width": 600,
		"height": 100,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 5
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "labeled",
				"points": [
						{
								"color": "#1E90FF",
								"label": " ",
								"value": -4,
								"labelPosition": "above"
						}
				]
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})


// Extracted from question: x7af81be6b2c580c8
// Course: 6th grade math
// Exercise: Plotting inequalities
// Widget key: number_line_empty
test("number-line - Plotting inequalities", () => {
	const input = {
		"type": "numberLine",
		"width": 460,
		"height": 64,
		"orientation": "horizontal",
		"bounds": {
				"lower": -5,
				"upper": 5
		},
		"interval": 1,
		"primaryLabels": {
				"type": "unfiltered"
		},
		"secondaryLabels": {
				"type": "unlabeled"
		}
} satisfies NumberLineInput

	// Validate the input
	const parseResult = NumberLinePropsSchema.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted numberLine:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = generateNumberLine(parseResult.data)
	expect(svg).toMatchSnapshot()
})

