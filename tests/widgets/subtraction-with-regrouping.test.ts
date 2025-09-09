import { describe, expect, it } from "bun:test"
import * as errors from "@superbuilders/errors"
import { generateSubtractionWithRegrouping } from "@/lib/widgets/generators/subtraction-with-regrouping"

describe("generateSubtractionWithRegrouping", () => {
	it("should show only the problem when showRegrouping and showAnswer are false", async () => {
		const html = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 86,
			subtrahend: 69,
			showRegrouping: false,
			showAnswer: false,
			revealUpTo: "complete"
		})

		// Should show the basic problem without regrouping marks or answer
		expect(html).toContain(">8<") // First digit of minuend
		expect(html).toContain(">6<") // Second digit of minuend
		expect(html).toContain(">9<") // Second digit of subtrahend
		expect(html).toContain("−") // Operator
		expect(html).not.toContain("#4472c4") // No answer color
		expect(html).not.toContain("text-decoration: line-through") // No crossed-out digits
		expect(html).not.toContain("#1E90FF") // No regrouping numbers
		expect(html).toMatchSnapshot()
	})

	it("should show regrouping marks without answer when showRegrouping is true and showAnswer is false", async () => {
		const html = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 86,
			subtrahend: 69,
			showRegrouping: true,
			showAnswer: false,
			revealUpTo: "complete"
		})

		// Should show regrouping marks but no answer
		expect(html).toContain("text-decoration: line-through") // Crossed-out digits
		expect(html).toContain("#1E90FF") // Regrouping numbers in blue
		expect(html).not.toContain("#4472c4") // No answer color
		expect(html).toMatchSnapshot()
	})

	it("should show answer without regrouping marks when showRegrouping is false and showAnswer is true", async () => {
		const html = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 86,
			subtrahend: 69,
			showRegrouping: false,
			showAnswer: true,
			revealUpTo: "complete"
		})

		// Should show answer but no regrouping marks
		expect(html).toContain(">1<") // Tens digit of answer
		expect(html).toContain(">7<") // Ones digit of answer
		expect(html).toContain("#4472c4") // Answer color
		expect(html).not.toContain("text-decoration: line-through") // No crossed-out digits
		expect(html).not.toContain("#1E90FF") // No regrouping numbers
		expect(html).toMatchSnapshot()
	})

	it("should show both regrouping marks and answer when both are true", async () => {
		const html = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 86,
			subtrahend: 69,
			showRegrouping: true,
			showAnswer: true,
			revealUpTo: "complete"
		})

		// Should show both regrouping marks and answer
		expect(html).toContain("text-decoration: line-through") // Crossed-out digits
		expect(html).toContain("#1E90FF") // Regrouping numbers
		expect(html).toContain(">1<") // Tens digit of answer
		expect(html).toContain(">7<") // Ones digit of answer
		expect(html).toContain("#4472c4") // Answer color
		expect(html).toMatchSnapshot()
	})

	it("should progressively reveal answer with revealUpTo", async () => {
		const htmlOnes = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 86,
			subtrahend: 69,
			showRegrouping: true,
			showAnswer: true,
			revealUpTo: "ones"
		})

		// Should only show ones digit of answer (7)
		expect(htmlOnes).toContain(">7<") // Ones digit
		// The tens position should be empty when revealing only ones
		expect(htmlOnes).toContain('<td style="padding: 2px 8px; color: #4472c4; font-weight: bold;"></td>') // Empty tens cell
		expect(htmlOnes).toContain('<td style="padding: 2px 8px; color: #4472c4; font-weight: bold;">7</td>') // Ones cell with 7
		expect(htmlOnes).toMatchSnapshot()

		const htmlTens = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 86,
			subtrahend: 69,
			showRegrouping: true,
			showAnswer: true,
			revealUpTo: "tens"
		})

		// Should show both ones and tens digits (17)
		expect(htmlTens).toContain(">1<") // Tens digit
		expect(htmlTens).toContain(">7<") // Ones digit
		expect(htmlTens).toMatchSnapshot()
	})

	it("should handle larger numbers with regrouping", async () => {
		const html = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 5234,
			subtrahend: 2876,
			showRegrouping: true,
			showAnswer: true,
			revealUpTo: "complete"
		})

		// Should handle 4-digit numbers
		expect(html).toContain(">5<") // First digit of minuend
		expect(html).toContain(">2<") // Second digit of minuend
		expect(html).toContain(">3<") // Third digit of minuend
		expect(html).toContain(">4<") // Fourth digit of minuend
		expect(html).toContain(">8<") // Answer contains 8
		expect(html).toContain("text-decoration: line-through") // Should have regrouping
		expect(html).toMatchSnapshot()
	})

	it("should handle numbers that don't require regrouping", async () => {
		const html = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 99,
			subtrahend: 11,
			showRegrouping: true,
			showAnswer: true,
			revealUpTo: "complete"
		})

		// Should work even when no regrouping is needed
		expect(html).toContain(">9<") // Digits of 99
		expect(html).toContain(">1<") // Digits of 11
		expect(html).toContain(">8<") // Digits of 88 answer
		expect(html).not.toContain("text-decoration: line-through") // No regrouping needed
		expect(html).toMatchSnapshot()
	})

	it("should throw error when minuend is not greater than subtrahend", async () => {
		const result = await errors.try(
			generateSubtractionWithRegrouping({
				type: "subtractionWithRegrouping",
				minuend: 50,
				subtrahend: 100,
				showRegrouping: true,
				showAnswer: true,
				revealUpTo: "complete"
			})
		)

		expect(result.error).toBeDefined()
		expect(result.error?.message).toContain("minuend must be greater than subtrahend")
	})

	it("should work with negative numbers", async () => {
		const html = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: -50,
			subtrahend: -100,
			showRegrouping: true,
			showAnswer: true,
			revealUpTo: "complete"
		})

		// -50 - (-100) = 50
		expect(html).toContain(">5<") // Tens digit of answer
		expect(html).toContain(">0<") // Ones digit of answer
		expect(html).toMatchSnapshot()
	})

	it("should handle progressive reveal for hundreds place", async () => {
		const html = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 524,
			subtrahend: 276,
			showRegrouping: true,
			showAnswer: true,
			revealUpTo: "hundreds"
		})

		// Should show all three digits since hundreds is the highest place
		expect(html).toContain(">2<") // Hundreds digit
		expect(html).toContain(">4<") // Tens digit
		expect(html).toContain(">8<") // Ones digit
		expect(html).toMatchSnapshot()
	})

	it("should independently control regrouping marks and answer reveal", async () => {
		// Test case 1: Show regrouping, partial answer
		const html1 = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 423,
			subtrahend: 167,
			showRegrouping: true,
			showAnswer: true,
			revealUpTo: "ones"
		})

		expect(html1).toContain("text-decoration: line-through") // Has regrouping marks
		expect(html1).toContain(">6<") // Shows ones digit of answer
		expect(html1).toMatchSnapshot()

		// Test case 2: No regrouping, full answer
		const html2 = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 423,
			subtrahend: 167,
			showRegrouping: false,
			showAnswer: true,
			revealUpTo: "complete"
		})

		expect(html2).not.toContain("text-decoration: line-through") // No regrouping marks
		expect(html2).toContain(">2<") // Hundreds digit
		expect(html2).toContain(">5<") // Tens digit
		expect(html2).toContain(">6<") // Ones digit
		expect(html2).toMatchSnapshot()

		// Test case 3: Show regrouping, no answer (the key use case)
		const html3 = await generateSubtractionWithRegrouping({
			type: "subtractionWithRegrouping",
			minuend: 423,
			subtrahend: 167,
			showRegrouping: true,
			showAnswer: false,
			revealUpTo: "complete"
		})

		expect(html3).toContain("text-decoration: line-through") // Has regrouping marks
		expect(html3).not.toContain("#4472c4") // No answer color
		expect(html3).toMatchSnapshot()
	})

	describe("Complex regrouping scenarios", () => {
		it("should handle borrowing across zeros", async () => {
			const html = await generateSubtractionWithRegrouping({
				type: "subtractionWithRegrouping",
				minuend: 300,
				subtrahend: 145,
				showRegrouping: true,
				showAnswer: true,
				revealUpTo: "complete"
			})

			// 300 - 145 = 155
			// Should show complex regrouping across zeros
			expect(html).toContain("text-decoration: line-through") // Has regrouping marks
			expect(html).toContain(">1<") // Hundreds digit of answer
			expect(html).toContain(">5<") // Tens and ones digits
			expect(html).toMatchSnapshot()
		})

		it("should handle multiple consecutive borrows", async () => {
			const html = await generateSubtractionWithRegrouping({
				type: "subtractionWithRegrouping",
				minuend: 1000,
				subtrahend: 456,
				showRegrouping: true,
				showAnswer: true,
				revealUpTo: "complete"
			})

			// 1000 - 456 = 544
			// Should show borrowing chain through zeros
			expect(html).toContain("text-decoration: line-through") // Has regrouping marks
			expect(html).toContain(">5<") // Hundreds digit
			expect(html).toContain(">4<") // Tens and ones digits
			expect(html).toMatchSnapshot()
		})

		it("should correctly display regrouping for 423 - 167", async () => {
			const html = await generateSubtractionWithRegrouping({
				type: "subtractionWithRegrouping",
				minuend: 423,
				subtrahend: 167,
				showRegrouping: true,
				showAnswer: false,
				revealUpTo: "complete"
			})

			// In 423 - 167:
			// - 3 becomes 13 (receives borrow) - should be crossed out
			// - 2 becomes 1 (gives borrow) - should be crossed out
			// - 4 stays 4 (no change) - should NOT be crossed out
			expect(html).toContain("text-decoration: line-through") // Has regrouping marks
			expect(html).toContain("#1E90FF") // Blue regrouping numbers
			expect(html).toMatchSnapshot()
		})
	})

	describe("Edge cases", () => {
		it("should handle single digit numbers", async () => {
			const html = await generateSubtractionWithRegrouping({
				type: "subtractionWithRegrouping",
				minuend: 9,
				subtrahend: 5,
				showRegrouping: true,
				showAnswer: true,
				revealUpTo: "complete"
			})

			expect(html).toContain(">9<")
			expect(html).toContain(">5<")
			expect(html).toContain(">4<") // Answer
			expect(html).toMatchSnapshot()
		})

		it("should handle very large numbers", async () => {
			const html = await generateSubtractionWithRegrouping({
				type: "subtractionWithRegrouping",
				minuend: 90023,
				subtrahend: 12345,
				showRegrouping: true,
				showAnswer: true,
				revealUpTo: "complete"
			})

			expect(html).toContain("text-decoration: line-through") // Has regrouping
			expect(html).toContain("#4472c4") // Answer color
			expect(html).toMatchSnapshot()
		})

		it("should handle small result", async () => {
			const html = await generateSubtractionWithRegrouping({
				type: "subtractionWithRegrouping",
				minuend: 101,
				subtrahend: 100,
				showRegrouping: true,
				showAnswer: true,
				revealUpTo: "complete"
			})

			expect(html).toContain(">1<") // Answer should be 1
			expect(html).toMatchSnapshot()
		})
	})
})
