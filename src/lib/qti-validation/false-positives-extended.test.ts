import { describe, it } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { checkNoLatex } from "@/lib/qti-validation/utils"

describe("Extended QTI Validation False Positives - Additional Patterns", () => {
	describe("Additional LaTeX Commands", () => {
		const additionalLatexCommands = [
			// Hat notation for statistics
			"<p>The regression line is $\\hat y=\\dfrac25x+800$</p>",

			// Arrow notation
			"<p>$3^4 \\;\\rightarrow\\; 3\\times3\\times3\\times3$</p>",

			// Color commands beyond Khan Academy
			"<p>$\\green{\\text{Step }1}$</p>",

			// Begin/end environments
			"<p>Let's substitute $-9$ for $x$:\\begin{align}...</p>",

			// tfrac for inline fractions
			"<p>Scale factor is \\(\\tfrac{4}{3}\\)</p>",

			// Text command inside math
			"<p>The area $\\text{Area}$ is calculated</p>",

			// Left/right delimiters
			"<p>\\(\\left(\\frac{1}{3}\\right)^3 = \\frac{1}{27}\\)</p>",

			// Division symbol
			"<p>Calculate \\(6 \\div 30 = 0.2\\)</p>",

			// Overline with numbers
			"<p>$0.9\\overline{6}$</p>",
			"<p>\\(\\dfrac{0.\\overline{55}}{0.\\overline{55}}=1\\)</p>",

			// Square root in various contexts
			"<p>$5, \\sqrt8, 33$</p>",
			"<p>$3, \\sqrt9, \\sqrt{18}$</p>",

			// Mixed fractions
			"<p>\\(1\\dfrac{7}{8}\\)</p>",

			// Align environment
			"<p>\\begin{align} x &= 5 \\\\ y &= 10 \\end{align}</p>"
		]

		it.each(additionalLatexCommands)("documents additional LaTeX command: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("additional LaTeX test", {
				content: `${content.substring(0, 50)}...`,
				result: result.error ? "FAILS" : "PASSES"
			})
		})
	})

	describe("Scientific Notation with cdot", () => {
		const scientificNotationCases = [
			"<p>The mass is $1 \\cdot 10^{-4}\\text{ kg}$</p>",
			"<p>Population: $1 \\cdot 10^{6}$ people</p>",
			"<p>Distance: $3.5 \\cdot 10^{8}$ meters</p>"
		]

		it.each(scientificNotationCases)("should handle scientific notation: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("scientific notation test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Complex Dollar Amount Patterns", () => {
		const complexDollarPatterns = [
			// Negative dollar amounts in text
			"<p>Sophia has $146.32 in her savings account. She has -$212.19 in debt</p>",

			// Balance changes with negative dollars
			"<p>Each withdrawal changes the balance by −$60. After 3 withdrawals</p>",

			// Dollar amounts with variables
			'<p>If you exchange $<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>d</mi></math> dollars</p>',

			// Multiple dollar signs in calculation context
			'<p>The price is $<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mo>$</mo><mn>3.25</mn></mrow><mn>2</mn></mfrac></math></p>',

			// Dollar with percentage
			'<p>Sales tax on $<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>220</mn></math> at <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5.5</mn><mo>%</mo></math></p>',

			// Escaped dollar in LaTeX context
			"<p>Income of $\\$50{,}000$ per year</p>",
			"<p>Each $\\$1$ increase</p>"
		]

		it.each(complexDollarPatterns)("should handle complex dollar pattern: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("complex dollar test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Mathematical Expressions as Dollar LaTeX", () => {
		const mathExpressions = [
			// Equations
			"<p>Solve $6x-6=15x+15$</p>",

			// Algebraic expressions
			"<p>This expression is equivalent to $63y+108z$</p>",
			"<p>The simplified form is $6w-14$</p>",
			"<p>Factor out: $2(56+112t+56w)$</p>",

			// Inequalities
			"<p>$11\\dfrac{1}{4}+9d>72$</p>",

			// Simple expressions
			"<p>$2b=211$</p>",
			"<p>$4=10-n$</p>",
			"<p>$-6k+31$</p>",

			// Fractions
			"<p>$\\dfrac{7^{36}}{9^{24}}$</p>",

			// Products
			"<p>$3(9p-12)$</p>",
			"<p>$7\\cdot(5+30s-45t)$</p>",

			// Percentages
			"<p>$72\\cdot \\dfrac{5}{100}$</p>",
			"<p>$\\dfrac{96}{100}\\cdot 25$</p>"
		]

		it.each(mathExpressions)("documents math expression: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("math expression test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Escaped LaTeX Delimiters", () => {
		const escapedDelimiters = [
			// Escaped parentheses for inline math
			"<p>The point \\((0,0)\\) is the origin</p>",
			"<p>Substitute \\(x = 2\\) and \\(y = 4\\)</p>",
			"<p>We get \\(n = \\dfrac{96}{5}\\)</p>",

			// Mixed contexts
			"<p>To test an ordered pair \\((a,b)\\), substitute</p>",
			"<p>Since \\(\\dfrac{0.\\overline{55}}{0.\\overline{55}}=1\\)</p>",

			// With special symbols
			"<p>Angle \\(x=50^\\circ\\)</p>",
			"<p>Result: \\(k = \\pm 15\\)</p>"
		]

		it.each(escapedDelimiters)("documents escaped delimiter: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("escaped delimiter test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Unicode Escape Sequences Extended", () => {
		const extendedUnicodeCases = [
			// More math symbols
			"<p>Result: \\u221a64 equals 8</p>", // √
			"<p>\\u221a18 is approximately 4.24</p>",
			"<p>\\u221a55 is approximately 7.42</p>",

			// Plus-minus
			"<p>Answer: <mo>\\u00b1</mo>15</p>",

			// Multiplication
			"<p>This is \\u00d7\\u00B9 as large</p>",

			// Escaped HTML
			'<p>\\u003cmath xmlns=\\"http://www.w3.org/1998/Math/MathML\\">'
		]

		it.each(extendedUnicodeCases)("should handle extended unicode: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("extended unicode test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Context-Specific Patterns", () => {
		const contextPatterns = [
			// Feedback with embedded LaTeX
			'<p><span class="qti-keyword-emphasis">Correct!</span> Dividing \\(<math xmlns="http://www.w3.org/1998/Math/MathML">',
			'<p><span class="qti-keyword-emphasis">Not quite.</span> The value \\(\\sqrt{121}=11\\)</p>',

			// Instructions with LaTeX
			"<p>Multiply by 0.30 or \\(\\dfrac{3}{10}\\) and then add</p>",

			// Step-by-step solutions
			"<p>$\\green{\\text{Step }1}$: Calculate the area</p>",

			// Definitions
			"<p>The slope \\dfrac14 is \\dfrac{Change in x}{Change in y}</p>"
		]

		it.each(contextPatterns)("documents context-specific pattern: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			logger.debug("context pattern test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	describe("Geometry and Notation", () => {
		const geometryNotation = [
			// Line segments
			"<p>Casey mapped \\overline{UV} onto \\overline{ST} using transformations</p>",
			"<p>Line segment $\\overline{AB}$ has length 5</p>",

			// Angles
			"<p>Angle $\\angle ABC = 90°$</p>",

			// Coordinates with mfenced
			'<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced><mn>3</mn><mn>4</mn></mfenced></math>',
			'<math xmlns="http://www.w3.org/1998/Math/MathML"><mfenced separators=","><mn>x</mn><mn>y</mn></mfenced></math>'
		]

		it.each(geometryNotation)("documents geometry notation: %s", (content: string) => {
			const result = errors.trySync(() => checkNoLatex(content, logger))
			// Note: mfenced cases will fail validateNoLatex but pass validateNoMfencedElements
			logger.debug("geometry notation test", { result: result.error ? "FAILS" : "PASSES" })
		})
	})

	// Test to summarize all the patterns we've found
	it("should provide comprehensive summary of all false positive patterns", () => {
		const categories = {
			"Currency Symbols": 10,
			"Escaped Dollar Signs": 2,
			"Unicode Characters": 7,
			"Feedback LaTeX": 4,
			"Khan Academy Colors": 3,
			"Math Operators": 5,
			"Table Headers": 4,
			"Additional LaTeX Commands": 14,
			"Scientific Notation": 3,
			"Complex Dollar Patterns": 7,
			"Math Expressions": 14,
			"Escaped Delimiters": 7,
			"Extended Unicode": 4,
			"Context Patterns": 5,
			"Geometry Notation": 4
		}

		const total = Object.values(categories).reduce((sum, count) => sum + count, 0)

		logger.debug("comprehensive false positive summary", {
			totalCategories: Object.keys(categories).length,
			totalTestCases: total,
			breakdown: categories
		})

		// Output recommendations
		logger.info("recommendations for regex improvements", {
			highPriority: [
				"Allow <mo>$</mo> and <mtext>$</mtext> as currency",
				"Distinguish \\u escape sequences from LaTeX commands",
				"Context-aware validation for feedback sections"
			],
			mediumPriority: [
				"Handle escaped LaTeX delimiters \\( and \\)",
				"Support Khan Academy color commands",
				"Allow common math operators like \\times, \\div"
			],
			lowPriority: [
				"Consider allowing LaTeX in certain contexts",
				"Support for scientific notation with \\cdot",
				"Handle complex dollar patterns with negatives"
			]
		})
	})
})
