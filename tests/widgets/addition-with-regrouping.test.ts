import { describe, expect, it } from "bun:test"
import { generateAdditionWithRegrouping } from "@/lib/widgets/generators/addition-with-regrouping"

describe("generateAdditionWithRegrouping", () => {
	it("should show only the problem when showCarrying and showAnswer are false", async () => {
		const html = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 47,
			addend2: 38,
			showCarrying: false,
			showAnswer: false
		})

		// Should show the basic problem without carrying marks or answer
		expect(html).toContain(">4<") // First digit of first addend
		expect(html).toContain(">7<") // Second digit of first addend
		expect(html).toContain(">3<") // First digit of second addend
		expect(html).toContain(">8<") // Second digit of second addend
		expect(html).toContain("+") // Operator
		expect(html).not.toContain("#4472c4") // No answer color
		expect(html).not.toContain("#1E90FF") // No carrying numbers
		expect(html).toMatchSnapshot()
	})

	it("should show carrying marks without answer when showCarrying is true and showAnswer is false", async () => {
		const html = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 47,
			addend2: 38,
			showCarrying: true,
			showAnswer: false
		})

		// Should show carrying marks but no answer
		expect(html).toContain("#1E90FF") // Carrying numbers in blue
		expect(html).not.toContain("#4472c4") // No answer color
		expect(html).toMatchSnapshot()
	})

	it("should show answer without carrying marks when showCarrying is false and showAnswer is true", async () => {
		const html = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 47,
			addend2: 38,
			showCarrying: false,
			showAnswer: true
		})

		// Should show answer but no carrying marks
		expect(html).toContain(">8<") // Tens digit of answer
		expect(html).toContain(">5<") // Ones digit of answer
		expect(html).toContain("#4472c4") // Answer color
		expect(html).not.toContain("#1E90FF") // No carrying numbers
		expect(html).toMatchSnapshot()
	})

	it("should show both carrying marks and answer when both are true", async () => {
		const html = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 47,
			addend2: 38,
			showCarrying: true,
			showAnswer: true
		})

		// Should show both carrying marks and answer
		expect(html).toContain("#1E90FF") // Carrying numbers
		expect(html).toContain(">8<") // Tens digit of answer
		expect(html).toContain(">5<") // Ones digit of answer
		expect(html).toContain("#4472c4") // Answer color
		expect(html).toMatchSnapshot()
	})

	it("should progressively reveal answer with revealUpTo", async () => {
		const htmlOnes = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 47,
			addend2: 38,
			showCarrying: true,
			showAnswer: true,
			revealUpTo: "ones"
		})

		// Should only show ones digit of answer (5)
		expect(htmlOnes).toContain(">5<") // Ones digit
		// The tens position should be empty when revealing only ones
		expect(htmlOnes).toContain('<td style="padding: 2px 8px;"></td>') // Empty tens cell
		expect(htmlOnes).toMatchSnapshot()

		const htmlTens = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 47,
			addend2: 38,
			showCarrying: true,
			showAnswer: true,
			revealUpTo: "tens"
		})

		// Should show both ones and tens digits (85)
		expect(htmlTens).toContain(">8<") // Tens digit
		expect(htmlTens).toContain(">5<") // Ones digit
		expect(htmlTens).toMatchSnapshot()
	})

	it("should handle larger numbers with carrying", async () => {
		const html = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 456,
			addend2: 789,
			showCarrying: true,
			showAnswer: true
		})

		// Should handle 3-digit numbers with multiple carries
		expect(html).toContain(">4<")
		expect(html).toContain(">5<")
		expect(html).toContain(">6<")
		expect(html).toContain(">7<")
		expect(html).toContain(">8<")
		expect(html).toContain(">9<")
		expect(html).toContain("#1E90FF") // Should have carrying marks
		expect(html).toContain("#4472c4") // Answer color
		expect(html).toMatchSnapshot()
	})

	it("should handle numbers that don't require carrying", async () => {
		const html = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 123,
			addend2: 456,
			showCarrying: true,
			showAnswer: true
		})

		// Should work even when no carrying is needed
		expect(html).toContain(">5<") // Hundreds digit of answer
		expect(html).toContain(">7<") // Tens digit of answer
		expect(html).toContain(">9<") // Ones digit of answer
		expect(html).not.toContain("#1E90FF") // No carrying needed
		expect(html).toMatchSnapshot()
	})

	it("should handle the example from the user's reference", async () => {
		const html = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 20129,
			addend2: 9028,
			showCarrying: true,
			showAnswer: true
		})

		// 20129 + 9028 = 29157
		expect(html).toContain(">2<")
		expect(html).toContain(">9<")
		expect(html).toContain(">1<")
		expect(html).toContain(">5<")
		expect(html).toContain(">7<")
		expect(html).toContain("#1E90FF") // Should have carrying marks
		expect(html).toContain("#4472c4") // Answer color
		expect(html).toMatchSnapshot()
	})

	it("should handle single digit addition", async () => {
		const html = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 7,
			addend2: 8,
			showCarrying: true,
			showAnswer: true
		})

		// 7 + 8 = 15
		expect(html).toContain(">7<")
		expect(html).toContain(">8<")
		expect(html).toContain(">1<") // Tens digit
		expect(html).toContain(">5<") // Ones digit
		expect(html).toMatchSnapshot()
	})

	it("should handle progressive reveal for hundreds place", async () => {
		const html = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 456,
			addend2: 278,
			showCarrying: true,
			showAnswer: true,
			revealUpTo: "hundreds"
		})

		// Should show all three digits since hundreds is the highest place
		expect(html).toContain(">7<") // Hundreds digit
		expect(html).toContain(">3<") // Tens digit
		expect(html).toContain(">4<") // Ones digit
		expect(html).toMatchSnapshot()
	})

	it("should independently control carrying marks and answer reveal", async () => {
		// Test case 1: Show carrying, partial answer
		const html1 = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 456,
			addend2: 378,
			showCarrying: true,
			showAnswer: true,
			revealUpTo: "ones"
		})

		expect(html1).toContain("#1E90FF") // Has carrying marks
		expect(html1).toContain(">4<") // Shows ones digit of answer
		expect(html1).toMatchSnapshot()

		// Test case 2: No carrying marks, full answer
		const html2 = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 456,
			addend2: 378,
			showCarrying: false,
			showAnswer: true,
			revealUpTo: "complete"
		})

		expect(html2).not.toContain("#1E90FF") // No carrying marks
		expect(html2).toContain(">8<") // Hundreds digit
		expect(html2).toContain(">3<") // Tens digit
		expect(html2).toContain(">4<") // Ones digit
		expect(html2).toMatchSnapshot()

		// Test case 3: Show carrying, no answer (the key use case)
		const html3 = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 456,
			addend2: 378,
			showCarrying: true,
			showAnswer: false
		})

		expect(html3).toContain("#1E90FF") // Has carrying marks
		expect(html3).not.toContain("#4472c4") // No answer color
		expect(html3).toMatchSnapshot()
	})

	describe("Complex carrying scenarios", () => {
		it("should handle carrying to create an extra digit", async () => {
			const html = await generateAdditionWithRegrouping({
				type: "additionWithRegrouping",
				addend1: 999,
				addend2: 1,
				showCarrying: true,
				showAnswer: true
			})

			// 999 + 1 = 1000
			expect(html).toContain(">1<") // Thousands digit
			expect(html).toContain(">0<") // Zeros in hundreds, tens, ones
			expect(html).toContain("#1E90FF") // Carrying marks
			expect(html).toMatchSnapshot()
		})

		it("should handle multiple consecutive carries", async () => {
			const html = await generateAdditionWithRegrouping({
				type: "additionWithRegrouping",
				addend1: 999,
				addend2: 999,
				showCarrying: true,
				showAnswer: true
			})

			// 999 + 999 = 1998
			expect(html).toContain(">1<") // Thousands digit
			expect(html).toContain(">9<") // Hundreds and tens
			expect(html).toContain(">8<") // Ones
			expect(html).toContain("#1E90FF") // Multiple carrying marks
			expect(html).toMatchSnapshot()
		})

		it("should correctly display carrying for 456 + 378", async () => {
			const html = await generateAdditionWithRegrouping({
				type: "additionWithRegrouping",
				addend1: 456,
				addend2: 378,
				showCarrying: true,
				showAnswer: false
			})

			// In 456 + 378:
			// - 6 + 8 = 14, carry 1
			// - 5 + 7 + 1 = 13, carry 1
			// - 4 + 3 + 1 = 8
			expect(html).toContain("#1E90FF") // Blue carrying numbers
			expect(html).toMatchSnapshot()
		})
	})

	describe("Edge cases", () => {
		it("should handle adding zero", async () => {
			const html = await generateAdditionWithRegrouping({
				type: "additionWithRegrouping",
				addend1: 123,
				addend2: 0,
				showCarrying: true,
				showAnswer: true
			})

			expect(html).toContain(">1<")
			expect(html).toContain(">2<")
			expect(html).toContain(">3<")
			expect(html).not.toContain("#1E90FF") // No carrying needed
			expect(html).toMatchSnapshot()
		})

		it("should handle very large numbers", async () => {
			const html = await generateAdditionWithRegrouping({
				type: "additionWithRegrouping",
				addend1: 99999,
				addend2: 1,
				showCarrying: true,
				showAnswer: true
			})

			// 99999 + 1 = 100000
			expect(html).toContain(">1<") // Leading 1
			expect(html).toContain(">0<") // Multiple zeros
			expect(html).toContain("#1E90FF") // Carrying cascade
			expect(html).toMatchSnapshot()
		})

		it("should handle equal addends", async () => {
			const html = await generateAdditionWithRegrouping({
				type: "additionWithRegrouping",
				addend1: 555,
				addend2: 555,
				showCarrying: true,
				showAnswer: true
			})

			// 555 + 555 = 1110
			expect(html).toContain(">1<") // Thousands and hundreds
			expect(html).toContain(">0<") // Ones
			expect(html).toContain("#1E90FF") // Carrying marks
			expect(html).toMatchSnapshot()
		})
	})
})
