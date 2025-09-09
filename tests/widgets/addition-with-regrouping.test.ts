import { describe, expect, it } from "bun:test"
import { generateAdditionWithRegrouping } from "@/lib/widgets/generators/addition-with-regrouping"

describe("Addition With Regrouping Widget", () => {
	it("should generate a basic addition problem without answer", async () => {
		const result = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 345,
			addend2: 278,
			showAnswer: false
		})

		expect(result).toContain("<div")
		expect(result).toContain(">3</td>")
		expect(result).toContain(">4</td>")
		expect(result).toContain(">5</td>")
		expect(result).toContain(">2</td>")
		expect(result).toContain(">7</td>")
		expect(result).toContain(">8</td>")
		expect(result).toContain("+")
		expect(result).not.toContain("color: #4472c4") // Should not show answer
		expect(result).toMatchSnapshot()
	})

	it("should generate addition with answer and carrying marks", async () => {
		const result = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 456,
			addend2: 789,
			showAnswer: true
		})

		expect(result).toContain("<div")
		expect(result).toContain(">4</td>")
		expect(result).toContain(">5</td>")
		expect(result).toContain(">6</td>")
		expect(result).toContain(">7</td>")
		expect(result).toContain(">8</td>")
		expect(result).toContain(">9</td>")
		expect(result).toContain("+")
		expect(result).toContain("color: #4472c4") // Should show the sum in blue
		expect(result).toContain("color: #1E90FF") // Should have carry marks in blue
		expect(result).toMatchSnapshot()
	})

	it("should handle the example from the image", async () => {
		const result = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 20129,
			addend2: 9028,
			showAnswer: true
		})

		expect(result).toContain(">2</td>")
		expect(result).toContain(">0</td>")
		expect(result).toContain(">1</td>")
		expect(result).toContain(">9</td>")
		expect(result).toContain("color: #4472c4") // Answer in blue
		expect(result).toMatchSnapshot()
	})

	it("should handle addition with no carrying needed", async () => {
		const result = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 123,
			addend2: 456,
			showAnswer: true
		})

		expect(result).toContain(">1</td>")
		expect(result).toContain(">2</td>")
		expect(result).toContain(">3</td>")
		expect(result).toContain(">4</td>")
		expect(result).toContain(">5</td>")
		expect(result).toContain(">6</td>")
		expect(result).toContain(">7</td>")
		expect(result).toContain(">9</td>")
		expect(result).toMatchSnapshot()
	})

	it("should handle single digit addition", async () => {
		const result = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 7,
			addend2: 8,
			showAnswer: true
		})

		expect(result).toContain(">7</td>")
		expect(result).toContain(">8</td>")
		expect(result).toContain(">1</td>")
		expect(result).toContain(">5</td>")
		expect(result).toMatchSnapshot()
	})

	it("should handle addition with multiple carries", async () => {
		const result = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 999,
			addend2: 999,
			showAnswer: true
		})

		expect(result).toContain(">9</td>")
		expect(result).toContain(">1</td>")
		expect(result).toContain(">8</td>")
		expect(result).toContain("color: #1E90FF") // Should show carry marks
		expect(result).toMatchSnapshot()
	})

	it("should handle asymmetric number lengths", async () => {
		const result = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 9999,
			addend2: 1,
			showAnswer: true
		})

		expect(result).toContain(">9</td>")
		expect(result).toContain(">1</td>")
		expect(result).toContain(">0</td>")
		expect(result).toContain("color: #1E90FF") // Should show carry marks
		expect(result).toMatchSnapshot()
	})

	it("should handle large numbers", async () => {
		const result = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 123456,
			addend2: 789012,
			showAnswer: true
		})

		expect(result).toContain(">1</td>")
		expect(result).toContain(">2</td>")
		expect(result).toContain(">3</td>")
		expect(result).toContain(">4</td>")
		expect(result).toContain(">5</td>")
		expect(result).toContain(">6</td>")
		expect(result).toContain(">7</td>")
		expect(result).toContain(">8</td>")
		expect(result).toContain(">9</td>")
		expect(result).toContain(">0</td>")
		expect(result).toContain("color: #4472c4") // Answer color
	})

	it("should not show carried values when showAnswer is false", async () => {
		const result = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 999,
			addend2: 999,
			showAnswer: false
		})

		expect(result).not.toContain("color: #1E90FF") // No carry marks
		expect(result).not.toContain("color: #4472c4") // No answer
		expect(result).toContain(">9</td>")
	})

	it("should handle zero as an addend", async () => {
		const result = await generateAdditionWithRegrouping({
			type: "additionWithRegrouping",
			addend1: 500,
			addend2: 0,
			showAnswer: true
		})

		expect(result).toContain(">5</td>")
		expect(result).toContain(">0</td>")
		expect(result).toContain("color: #4472c4") // Answer color
	})
})
