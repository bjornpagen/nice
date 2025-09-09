import { describe, expect, it } from "bun:test"
import {
	generateSubtractionWithRegrouping,
	SubtractionWithRegroupingPropsSchema
} from "@/lib/widgets/generators/subtraction-with-regrouping"

describe("SubtractionWithRegrouping Widget", () => {
	describe("Schema Validation", () => {
		it("should validate correct input", () => {
			const validInput = {
				type: "subtractionWithRegrouping",
				minuend: 52,
				subtrahend: 27,
				showAnswer: false
			}

			const result = SubtractionWithRegroupingPropsSchema.safeParse(validInput)
			expect(result.success).toBe(true)
		})

		it("should reject invalid type", () => {
			const invalidInput = {
				type: "wrongType",
				minuend: 52,
				subtrahend: 27,
				showAnswer: false
			}

			const result = SubtractionWithRegroupingPropsSchema.safeParse(invalidInput)
			expect(result.success).toBe(false)
		})

		it("should accept negative numbers", () => {
			const validInput = {
				type: "subtractionWithRegrouping",
				minuend: -52,
				subtrahend: -77,
				showAnswer: false
			}

			const result = SubtractionWithRegroupingPropsSchema.safeParse(validInput)
			expect(result.success).toBe(true)
		})

		it("should reject non-integer numbers", () => {
			const invalidInput = {
				type: "subtractionWithRegrouping",
				minuend: 52.5,
				subtrahend: 27,
				showAnswer: false
			}

			const result = SubtractionWithRegroupingPropsSchema.safeParse(invalidInput)
			expect(result.success).toBe(false)
		})
	})

	describe("Widget Generation", () => {
		it("should generate problem without answer", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 52,
				subtrahend: 27,
				showAnswer: false
			}

			const html = await generateSubtractionWithRegrouping(input)

			// Check that HTML contains the problem setup
			// Note: Digits are displayed in separate cells for vertical arithmetic
			expect(html).toContain(">5<")
			expect(html).toContain(">2<")
			expect(html).toContain(">2<")
			expect(html).toContain(">7<")
			expect(html).toContain("−")

			// Check that answer is not shown (2 and 5 would be in separate cells)
			// Look for the answer row which has specific styling
			expect(html).not.toContain("color: #4472c4")
		})

		it("should generate problem with answer and regrouping marks", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 52,
				subtrahend: 27,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)

			// Check that HTML contains the problem (digits in separate cells)
			expect(html).toContain(">5<")
			expect(html).toContain(">2<")
			expect(html).toContain(">2<")
			expect(html).toContain(">7<")
			expect(html).toContain("−")
			// Check answer is shown (in blue)
			expect(html).toContain("color: #4472c4")
			// Answer digits 2 and 5 should be present
			expect(html).toContain(">2</td>")
			expect(html).toContain(">5</td>")

			// Check for regrouping marks (crossed out text)
			expect(html).toContain("text-decoration: line-through")

			// Check for regrouping numbers (in blue)
			expect(html).toContain("#1E90FF")
		})

		it("should handle multi-digit problems", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 1000,
				subtrahend: 456,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)

			// Check that HTML contains the problem digits
			expect(html).toContain(">1<")
			expect(html).toContain(">0<")
			expect(html).toContain(">4<")
			expect(html).toContain(">5<")
			expect(html).toContain(">6<")
			// Check answer is shown
			expect(html).toContain("color: #4472c4")
		})

		it("should handle negative numbers", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: -25,
				subtrahend: -50,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)

			// -25 - (-50) = -25 + 50 = 25
			// Check the negative signs and digits are displayed
			expect(html).toContain("-")
			expect(html).toContain(">2<")
			expect(html).toContain(">5<")
			expect(html).toContain("color: #4472c4") // Answer styling
		})

		it("should throw error when subtrahend is greater than minuend", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 27,
				subtrahend: 52,
				showAnswer: false
			}

			await expect(generateSubtractionWithRegrouping(input)).rejects.toThrow(
				"minuend must be greater than subtrahend for valid subtraction"
			)
		})

		it("should handle the example from the user's image", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 23542,
				subtrahend: 15631,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)

			// Check that HTML contains the problem digits
			expect(html).toContain(">2<")
			expect(html).toContain(">3<")
			expect(html).toContain(">5<")
			expect(html).toContain(">4<")
			expect(html).toContain(">1<")
			expect(html).toContain(">6<")

			// The answer should be 7911 (check for these digits in answer row)
			expect(html).toContain("color: #4472c4") // Answer row styling
			expect(html).toContain(">7</td>")
			expect(html).toContain(">9</td>")
			expect(html).toContain(">1</td>")

			// Should have regrouping marks
			expect(html).toContain("text-decoration: line-through")
		})

		// Snapshot tests for complete HTML output
		it("should generate snapshot for simple problem without answer", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 52,
				subtrahend: 27,
				showAnswer: false
			}

			const html = await generateSubtractionWithRegrouping(input)
			expect(html).toMatchSnapshot()
		})

		it("should generate snapshot for simple problem with answer", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 52,
				subtrahend: 27,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)
			expect(html).toMatchSnapshot()
		})

		it("should generate snapshot for multi-digit problem with regrouping", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 1000,
				subtrahend: 456,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)
			expect(html).toMatchSnapshot()
		})

		it("should generate snapshot for large numbers with complex regrouping", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 23542,
				subtrahend: 15631,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)
			expect(html).toMatchSnapshot()
		})

		it("should generate snapshot for negative numbers", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: -25,
				subtrahend: -50,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)
			expect(html).toMatchSnapshot()
		})

		it("should generate snapshot for no regrouping needed", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 987,
				subtrahend: 123,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)
			expect(html).toMatchSnapshot()
		})

		it("should generate snapshot for problem with zeros", async () => {
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 300,
				subtrahend: 145,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)
			expect(html).toMatchSnapshot()
		})
	})

	describe("Regrouping Logic", () => {
		it("should correctly handle simple borrowing", async () => {
			// 52 - 27 = 25
			// Need to borrow from 5 to make 12 - 7 = 5
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 52,
				subtrahend: 27,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)
			// Check answer digits are present
			expect(html).toContain("color: #4472c4")
			expect(html).toContain(">2</td>")
			expect(html).toContain(">5</td>")
		})

		it("should correctly handle multiple borrowing", async () => {
			// 300 - 145 = 155
			// Need to borrow across zeros
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 300,
				subtrahend: 145,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)
			// Check answer digits are present (155)
			expect(html).toContain("color: #4472c4")
			expect(html).toContain(">1</td>")
			expect(html).toContain(">5</td>")
		})

		it("should correctly handle no borrowing needed", async () => {
			// 987 - 123 = 864
			// No borrowing needed
			const input = {
				type: "subtractionWithRegrouping" as const,
				minuend: 987,
				subtrahend: 123,
				showAnswer: true
			}

			const html = await generateSubtractionWithRegrouping(input)
			// Check answer digits are present (864)
			expect(html).toContain("color: #4472c4")
			expect(html).toContain(">8</td>")
			expect(html).toContain(">6</td>")
			expect(html).toContain(">4</td>")

			// Should not have crossed out digits since no borrowing
			expect(html.match(/text-decoration: line-through/g)).toBeNull()
		})
	})
})
