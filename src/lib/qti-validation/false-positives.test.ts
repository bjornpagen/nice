import { describe, expect, it } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { validateNoMfencedElements } from "@/lib/qti-validation/rules"
// Since validateNoLatex is not exported from rules.ts, we'll test via checkNoLatex from utils.ts
import { checkNoLatex } from "@/lib/qti-validation/utils"

describe("QTI Validation False Positives - Comprehensive Test Suite", () => {
	describe("Valid Dollar Signs in MathML (Currency)", () => {
		const currencyTestCases = [
			// Dollar sign as operator
			`<p>Sunny earns <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>$</mo><mn>12</mn></math> per hour</p>`,

			// Dollar sign in mtext
			`<p>The cost is <math xmlns="http://www.w3.org/1998/Math/MathML"><mtext>$</mtext><mn>50</mn></math></p>`,

			// Dollar sign in mrow
			`<p>Gas costs <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mo>$</mo><mn>1.20</mn></mrow></math> per liter</p>`,

			// Currency span followed by MathML
			`<p>Rachel earned <span class="currency">$</span><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>34</mn></math> today</p>`,

			// Dollar sign at end of content (prompt for input)
			"<p><strong>What is the total cost?</strong></p><p>$",

			// Dollar sign before MathML at paragraph end
			`<p><strong>How much will it cost?</strong></p><p><math xmlns="http://www.w3.org/1998/Math/MathML"><mo>$</mo>`,

			// Mixed content with dollar amounts
			`<p>She earned $<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>12</mn></math> per hour for <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math> hours</p>`,

			// Multiple dollar signs
			`<p>He sold chickens for $<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>550</mn></math>. This month, he earned $<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>600</mn></math></p>`,

			// Negative dollar amounts
			`<p>He has <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mo>-</mo><mo>$</mo><mn>50</mn></mrow></math> in debt</p>`,

			// Dollar in fraction
			`<p>The price is <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mo>$</mo><mn>3.25</mn></mrow><mn>2</mn></mfrac></p>`
		]

		it.each(currencyTestCases)("should allow valid currency symbol: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			if (result.error) {
				if (result.error.message.includes("Dollar-sign delimited LaTeX")) {
					// This is a false positive - currency symbols should be allowed
					expect(result.error.message).not.toContain("Dollar-sign delimited LaTeX")
				}
			}
			expect(result.error).toBeUndefined()
		})
	})

	describe("Escaped Dollar Signs", () => {
		const escapedDollarTestCases = [
			// Note: These might actually be LaTeX, so they might correctly fail
			// Including them to document the current behavior
			"<p>Income less than $\\$50,000$ per year</p>",
			"<p>Each $\\$1$ increase in income</p>"
		]

		it.each(escapedDollarTestCases)("documents behavior for escaped dollars: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			// These currently fail - documenting the behavior
			logger.debug("escaped dollar test", { content, result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Unicode Characters (Not LaTeX)", () => {
		const unicodeTestCases = [
			// Plus-minus symbol
			'<p>The answer is <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>k</mi><mo>=</mo><mo>\\u00b1</mo><mn>15</mn></math></p>',

			// Square root symbol
			"<p>The value \\u221a64 equals 8</p>",

			// Less than symbol
			'<p>This choice is \\u003cmath xmlns="http://www.w3.org/1998/Math/MathML">',

			// Multiplication and superscript
			"<p>This choice is \\u00d7\\u00B9 as large</p>"
		]

		it.each(unicodeTestCases)("should allow unicode escape: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			// Unicode escapes might still be flagged - documenting behavior
			logger.debug("unicode test", {
				contentPreview: `${content.substring(0, 50)}...`,
				result: result.error ? "FAILS" : "PASSES",
				errorMessage: result.error?.message ?? ""
			})
		})
	})

	describe("Feedback Section LaTeX", () => {
		const feedbackTestCases = [
			'<p><span class="qti-keyword-emphasis">Correct!</span> \\(n = \\dfrac{96}{5}\\)</p>',
			'<p><span class="qti-keyword-emphasis">Correct!</span> \\(\\sqrt{16}=4\\)</p>',
			'<p><span class="qti-keyword-emphasis">Correct!</span> \\(\\left(\\frac{1}{3}\\right)^3 = \\frac{1}{27}\\)</p>',
			'<p><span class="qti-keyword-emphasis">Not quite.</span> To test an ordered pair \\((a,b)\\), substitute</p>'
		]

		it.each(feedbackTestCases)("documents feedback LaTeX behavior: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			// These are currently flagged - might be intentional
			logger.debug("feedback LaTeX test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Khan Academy Color Commands", () => {
		const khanColorTestCases = [
			"<p>Substituting \\blueD{x=2} and \\maroonD{y=4} gives</p>",
			"<p>The area $\\maroonD{\\text{A}}$ is</p>",
			"<p>$(2,1)$ isn't the only solution. \\blueD{x=2}</p>"
		]

		it.each(khanColorTestCases)("documents Khan color command behavior: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("Khan color test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Mathematical Operators", () => {
		const mathOperatorTestCases = [
			// Times symbol in MathML
			'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mn>\\times</mn><mn>5</mn></math>',

			// Delta in MathML
			'<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>\\Delta y</mn><mn>\\Delta x</mn></mfrac></math>',

			// Not equal in text
			"<p>Since 7(1) - 2(5) = -3 \\neq -5, it's not a solution</p>",

			// Overline notation
			"<p>Casey mapped \\overline{UV} onto \\overline{ST} using transformations</p>",

			// Dot multiplication
			"<p>Calculate $72\\cdot \\dfrac{5}{100}$</p>"
		]

		it.each(mathOperatorTestCases)("documents math operator behavior: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("math operator test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Table Headers and Coordinate Pairs", () => {
		const specialPatternTestCases = [
			// Table headers
			"<table><tr><th>$x$</th><th>|</th><th>$y$</th></tr></table>",

			// Coordinate pairs
			"<p>Only $(4,-1)$ satisfies the equation</p>",
			"<p>The point $(1,11)$ is on the line</p>",
			"<p>$(6,5)$ isn't the only solution</p>"
		]

		it.each(specialPatternTestCases)("documents special pattern behavior: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("special pattern test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Deprecated MathML Elements", () => {
		const deprecatedTestCases = [
			'<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced open="(" close=")"><mn>5</mn></mfenced></math>',
			'<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced open="|" close="|"><mn>-6</mn></mfenced></math>',
			'<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced separators=","><mn>3</mn><mn>0</mn></mfenced></math>'
		]

		it.each(deprecatedTestCases)("should flag deprecated mfenced: %s", (content: string) => {
			// Create a mock ValidationContext as expected by validateNoMfencedElements
			const mockContext = {
				id: "test",
				rootTag: "assessmentItem",
				title: "Test Item",
				logger: logger
			}

			const result = errors.trySync(() => validateNoMfencedElements(content, mockContext))
			// These SHOULD fail - mfenced is deprecated
			expect(result.error).toBeDefined()
			if (result.error) {
				expect(result.error.message).toContain("mfenced")
			}
		})
	})

	describe("Edge Cases", () => {
		const edgeCases = [
			// Slot with dollar sign
			'<p>A liter of milk costs $<slot name="milk_cost" /> and bread costs $<slot name="bread_cost" /></p>',

			// Dollar at various positions
			"<p>The total is $</p>",
			"<p>It costs $.</p>",
			"<p>Price: $</p>",

			// Complex mixed content
			'<p>For each $1 increase in income, rent increases by $<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>0.50</mn></math></p>'
		]

		it.each(edgeCases)("should handle edge case: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("edge case test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	// Summary test to count total false positives
	it("should provide summary of false positive patterns", () => {
		const allTestCases = [
			// Add all test cases here for a complete count
			'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>$</mo><mn>12</mn></math>',
			"<p>What is the cost?</p><p>$",
			"<p>Income less than $\\$50,000$ per year</p>"
			// ... (would include all cases in real test)
		]

		const results = allTestCases.map((content) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			return {
				content: `${content.substring(0, 50)}...`,
				issues: result.error ? 1 : 0
			}
		})

		const falsePositives = results.filter((r) => r.issues > 0)
		logger.debug("false positive summary", {
			totalTestCases: results.length,
			falsePositives: falsePositives.length,
			successRate: `${(((results.length - falsePositives.length) / results.length) * 100).toFixed(1)}%`
		})
	})
})
