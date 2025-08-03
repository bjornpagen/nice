import { describe, expect, test } from "bun:test"
import { compile } from "./compiler"
// Import the new Input type
import type { AssessmentItemInput } from "./schemas"

describe("QTI Compiler", () => {
	test("should correctly compile a choice interaction item with widgets", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "double-number-line-ratio",
			title: "Equivalent Ratios on a Double Number Line",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "identifier",
					correct: "A"
				}
			],
			body: [
				'<p>Cory hikes up a hill with a constant slope. The double number line shows that after Cory hikes <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mtext> km</mtext></math>, their elevation is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>120</mn><mtext> m</mtext></math>.</p>',
				{
					type: "doubleNumberLine",
					width: 400,
					height: 150,
					topLine: { label: "Distance, kilometers", ticks: [0, "", "", 3, ""] },
					bottomLine: { label: "Elevation, meters", ticks: [0, "", "", 120, ""] }
				},
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					prompt: "<p>Select the double number line that shows the other values of distance and elevation.</p>",
					minChoices: 1,
					maxChoices: 1,
					shuffle: true,
					choices: [
						{
							identifier: "A",
							content: {
								type: "doubleNumberLine",
								width: 400,
								height: 150,
								topLine: { label: "Distance, kilometers", ticks: [0, 1, 2, 3, 4] },
								bottomLine: { label: "Elevation, meters", ticks: [0, 40, 80, 120, 160] }
							}
						},
						{
							identifier: "B",
							content: {
								type: "doubleNumberLine",
								width: 400,
								height: 150,
								topLine: { label: "Distance, kilometers", ticks: [0, 1, 2, 3, 4] },
								bottomLine: { label: "Elevation, meters", ticks: [0, 80, 100, 120, 140] }
							}
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> The ratio of distance to elevation is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mo>:</mo><mn>120</mn></math>, which simplifies to a unit rate of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mo>:</mo><mn>40</mn></math>. For every <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mtext> km</mtext></math> hiked, the elevation increases by <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>40</mn><mtext> m</mtext></math>. This matches the correct number line.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> First, find the unit rate. If Cory\'s elevation is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>120</mn><mtext> m</mtext></math> after <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mtext> km</mtext></math>, the rate is <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mn>120</mn><mtext> m</mtext></mrow><mrow><mn>3</mn><mtext> km</mtext></mrow></mfrac><mo>=</mo><mn>40</mn></math> meters per kilometer. Use this rate to fill in the other values on the number line.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		// Validate key parts exist in the output
		expect(compiledXml).toContain('identifier="double-number-line-ratio"')
		expect(compiledXml).toContain("RESPONSE")
		expect(compiledXml).toContain("Select the double number line")
		expect(compiledXml.match(/<img src="data:image\/svg\+xml,/g)?.length).toBe(3)
	})

	test("should correctly compile a text entry interaction for fractional exponents", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "eval-fractional-exponents",
			title: "Evaluate an expression with negative fractional exponents",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "integer",
					correct: 81
				}
			],
			body: [
				"<p>Evaluate.</p>",
				'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfrac><msup><mn>2</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><msup><mn>54</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup></mfrac><mo>=</mo></mrow></math>',
				{
					type: "textEntryInteraction",
					responseIdentifier: "RESPONSE",
					expectedLength: 3
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> The answer is 81.</p><p>You successfully applied the rule: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><msup><mi>a</mi><mi>n</mi></msup><msup><mi>b</mi><mi>n</mi></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>)</mo></mrow><mi>n</mi></msup></math></p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> Let me help you solve this step by step.</p><p>First, use the rule: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><msup><mi>a</mi><mi>n</mi></msup><msup><mi>b</mi><mi>n</mi></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>)</mo></mrow><mi>n</mi></msup></math></p><p>So: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><msup><mn>2</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><msup><mn>54</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mn>2</mn><mn>54</mn></mfrac><mo>)</mo></mrow><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mn>1</mn><mn>27</mn></mfrac><mo>)</mo></mrow><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><mo>=</mo><msup><mn>27</mn><mfrac><mn>4</mn><mn>3</mn></mfrac></msup></math></p><p>Then: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mn>27</mn><mfrac><mn>4</mn><mn>3</mn></mfrac></msup><mo>=</mo><msup><mrow><mo>(</mo><mroot><mn>27</mn><mn>3</mroot><mo>)</mo></mrow><mn>4</mn></msup><mo>=</mo><msup><mn>3</mn><mn>4</mn></msup><mo>=</mo><mn>81</mn></math></p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="eval-fractional-exponents"')
		expect(compiledXml).toContain("RESPONSE")
	})

	test("should correctly compile an order interaction for comparing numbers", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "compare-3-digit-numbers",
			title: "Compare 3-digit numbers",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "ordered",
					baseType: "identifier",
					correct: ["A", "B", "C"]
				}
			],
			body: [
				{
					type: "orderInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					orientation: "horizontal",
					prompt: "<p>Arrange the cards to make a true comparison.</p>",
					choices: [
						{
							identifier: "A",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>708</mn></math>',
							feedback:
								'<p>Correct! <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>708</mn><mo>&gt;</mo><mn>79</mn></math>.</p>'
						},
						{
							identifier: "B",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&gt;</mo></math>',
							feedback:
								'<p>That symbol belongs between <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>708</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>79</mn></math> to make a true statement.</p>'
						},
						{
							identifier: "C",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>79</mn></math>',
							feedback:
								'<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>79</mn></math> is the smaller number on the right.</p>'
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> You have arranged the cards as <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>708</mn><mo>&gt;</mo><mn>79</mn></math>, which is a true comparison.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> Make sure the largest number is on the left and the symbol correctly represents the relationship.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="compare-3-digit-numbers"')
		expect(compiledXml).toContain("qti-order-interaction")
	})

	test("should correctly compile a choice interaction with inequality number line", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "inequality-number-line",
			title: "Identify an inequality from a number-line graph",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "identifier",
					correct: "C"
				}
			],
			body: [
				{
					type: "inequalityNumberLine",
					width: 500,
					height: 100,
					min: -5,
					max: 5,
					tickInterval: 1,
					ranges: [
						{
							start: { value: 0, type: "open" },
							color: "#4285F4"
						}
					]
				},
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: false,
					minChoices: 1,
					maxChoices: 1,
					prompt: "<p>Choose the inequality that represents the graph.</p>",
					choices: [
						{
							identifier: "A",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>&lt;</mo><mn>0</mn></math>'
						},
						{
							identifier: "B",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>≤</mo><mn>0</mn></math>'
						},
						{
							identifier: "C",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>&gt;</mo><mn>0</mn></math>'
						},
						{
							identifier: "D",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>≥</mo><mn>0</mn></math>'
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> The graph shows an open point at 0 with an arrow to the right, representing all values strictly greater than 0, so the inequality is <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>&gt;</mo><mn>0</mn></math>.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> The open point at <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>0</mn></math> means <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>0</mn></math> itself is not included, and the arrow pointing right indicates values greater than <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>0</mn></math>.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="inequality-number-line"')
		expect(compiledXml).toContain("inequalityNumberLine")
	})

	test("should correctly compile a vertical number line comparison", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "vertical-number-line-comparison",
			title: "Compare numbers on a vertical number line",
			responseDeclarations: [
				{
					identifier: "RESPONSE_POS",
					cardinality: "single",
					baseType: "identifier",
					correct: "ABOVE"
				},
				{
					identifier: "RESPONSE_COMP",
					cardinality: "single",
					baseType: "identifier",
					correct: "GT"
				}
			],
			body: [
				"<p>Use the number line to compare the numbers.</p>",
				{
					type: "numberLine",
					width: 120,
					height: 350,
					orientation: "vertical",
					min: -8,
					max: 2,
					majorTickInterval: 2,
					minorTicksPerInterval: 1,
					points: [
						{
							value: -1.4,
							label: "-1.4",
							color: "purple",
							labelPosition: "left"
						},
						{
							value: -6.4,
							label: "-6.4",
							color: "maroon",
							labelPosition: "left"
						}
					]
				},
				"<p>Complete the statements.</p>",
				'<p>On the number line, <math xmlns="http://www.w3.org/1998/Math/MathML"><mstyle mathcolor="purple"><mo>-</mo><mn>1.4</mn></mstyle></math> is ',
				{
					type: "inlineChoiceInteraction",
					responseIdentifier: "RESPONSE_POS",
					shuffle: false,
					choices: [
						{ identifier: "ABOVE", content: "<p>above</p>" },
						{ identifier: "BELOW", content: "<p>below</p>" }
					]
				},
				' <math xmlns="http://www.w3.org/1998/Math/MathML"><mstyle mathcolor="maroon"><mo>-</mo><mn>6.4</mn></mstyle></math>.</p>',
				'<p>This means <math xmlns="http://www.w3.org/1998/Math/MathML"><mstyle mathcolor="purple"><mo>-</mo><mn>1.4</mn></mstyle></math> is ',
				{
					type: "inlineChoiceInteraction",
					responseIdentifier: "RESPONSE_COMP",
					shuffle: false,
					choices: [
						{ identifier: "GT", content: "<p>greater than</p>" },
						{ identifier: "LT", content: "<p>less than</p>" }
					]
				},
				' <math xmlns="http://www.w3.org/1998/Math/MathML"><mstyle mathcolor="maroon"><mo>-</mo><mn>6.4</mn></mstyle></math>.</p>'
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> On a vertical number line, numbers higher up are greater. Since <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is above <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>, it is the greater number.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> Look at the positions on the number line. <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is located higher up than <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>. This means <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is above <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>, and therefore <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is greater than <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="vertical-number-line-comparison"')
		expect(compiledXml).toContain("numberLine")
	})

	test("should correctly compile a two-way frequency table with Venn diagram", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "two-way-frequency-table-cold-study",
			title: "Complete a Two-Way Frequency Table",
			responseDeclarations: [
				{ identifier: "RESP_A", cardinality: "single", baseType: "integer", correct: 23 },
				{ identifier: "RESP_B", cardinality: "single", baseType: "integer", correct: 20 },
				{ identifier: "RESP_C", cardinality: "single", baseType: "integer", correct: 27 },
				{ identifier: "RESP_D", cardinality: "single", baseType: "integer", correct: 30 }
			],
			body: [
				'<p>The Cold Be Gone Company conducted a study with <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>100</mn></math> participants. Each participant either <em>received</em> cold medicine or <em>did not receive</em> cold medicine, and the company recorded whether the participant\'s cold lasted <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn></math> days or longer.</p>',
				{
					type: "vennDiagram",
					width: 350,
					height: 262,
					circleA: { label: "Cold Medicine", count: 27 },
					circleB: { label: "Cold longer than 7 days", count: 20 },
					intersectionCount: 23,
					outsideCount: 30
				},
				"<p>Complete the following two-way frequency table.</p>",
				{
					type: "dataTable",
					columnHeaders: ["", "Received cold medicine", "Did not receive cold medicine"],
					rows: [
						{
							isHeader: true,
							cells: [
								"Cold lasted longer than 7 days",
								{ type: "input", responseIdentifier: "RESP_A", expectedLength: 3 },
								{ type: "input", responseIdentifier: "RESP_B", expectedLength: 3 }
							]
						},
						{
							isHeader: true,
							cells: [
								"Cold did <em>not</em> last longer than 7 days",
								{ type: "input", responseIdentifier: "RESP_C", expectedLength: 3 },
								{ type: "input", responseIdentifier: "RESP_D", expectedLength: 3 }
							]
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> The completed table is:</p><table class="qti-bordered"><thead><tr><th scope="col"></th><th scope="col" class="qti-align-center">Received cold medicine</th><th scope="col" class="qti-align-center">Did not receive cold medicine</th></tr></thead><tbody><tr><th scope="row" class="qti-align-left">Cold <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>≥</mo></math> 7 days</th><td class="qti-align-center">23</td><td class="qti-align-center">20</td></tr><tr><th scope="row" class="qti-align-left">Cold <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&lt;</mo></math> 7 days</th><td class="qti-align-center">27</td><td class="qti-align-center">30</td></tr></tbody></table>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> Use the numbers in the Venn diagram. The overlap (<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>23</mn></math>) belongs in the “Received medicine” & “Cold <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>≥</mo><mn>7</mn></math> days” cell. Then distribute the other counts accordingly.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="two-way-frequency-table-cold-study"')
		expect(compiledXml).toContain("vennDiagram")
	})

	test("should correctly compile equivalent fractions with partitioned shapes", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "equivalent-fraction-images",
			title: "Identifying Equivalent Fractions with Images",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "multiple",
					baseType: "identifier",
					correct: ["A", "B"]
				}
			],
			body: [
				'<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math> of the following rectangle is shaded.</p>',
				{
					type: "partitionedShape",
					width: 180,
					height: 88,
					shapes: [
						{
							type: "rectangle",
							totalParts: 6,
							shadedParts: 3,
							rows: 1,
							columns: 6
						}
					]
				},
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 0,
					maxChoices: 3,
					prompt:
						'<p>Which of the following rectangles have exactly <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math> of their area shaded?</p>',
					choices: [
						{
							identifier: "A",
							content: {
								type: "partitionedShape",
								width: 180,
								height: 88,
								shapes: [{ type: "rectangle", totalParts: 8, shadedParts: 4, rows: 2, columns: 4 }]
							},
							feedback:
								'<p>Correct! This rectangle has <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> out of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> parts shaded, which equals <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>4</mn><mn>8</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math>.</p>'
						},
						{
							identifier: "B",
							content: {
								type: "partitionedShape",
								width: 180,
								height: 88,
								shapes: [{ type: "rectangle", totalParts: 4, shadedParts: 2, rows: 2, columns: 2 }]
							},
							feedback:
								'<p>Correct! This rectangle has <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn></math> out of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> parts shaded, which equals <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>2</mn><mn>4</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math>.</p>'
						},
						{
							identifier: "C",
							content: {
								type: "partitionedShape",
								width: 180,
								height: 88,
								shapes: [{ type: "rectangle", totalParts: 4, shadedParts: 3, rows: 2, columns: 2 }]
							},
							feedback:
								'<p>Not quite. This rectangle has <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> out of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> parts shaded, which equals <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>4</mn></mfrac></math>. Since <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>4</mn></mfrac></math> is not equal to <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math> (which equals <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>), this is incorrect.</p>'
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Excellent!</span> You correctly identified that <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>, and found both rectangles that have exactly half of their area shaded: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>4</mn><mn>8</mn></mfrac></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>2</mn><mn>4</mn></mfrac></math> both equal <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> First, simplify <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math> to <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>. Then count the shaded parts in each rectangle and check if that fraction equals <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>. Remember: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>4</mn><mn>8</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>2</mn><mn>4</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>, but <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>4</mn></mfrac></math> ≠ <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="equivalent-fraction-images"')
		expect(compiledXml).toContain("partitionedShape")
	})

	test("should correctly compile calculating shaded area of multiple shapes", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "calculate-shaded-area",
			title: "Calculating Shaded Area of Multiple Shapes",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "multiple",
					baseType: "identifier",
					correct: ["B", "C"]
				}
			],
			body: [
				{
					type: "partitionedShape",
					width: 320,
					height: 103,
					layout: "horizontal",
					shapes: [
						{ type: "circle", totalParts: 4, shadedParts: 1 },
						{ type: "circle", totalParts: 4, shadedParts: 1 },
						{ type: "circle", totalParts: 4, shadedParts: 1 }
					]
				},
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 0,
					maxChoices: 3,
					prompt: "<p>How can we calculate the shaded area?</p>",
					choices: [
						{
							identifier: "A",
							content:
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>4</mn><mo>×</mo><mfrac><mn>1</mn><mn>3</mn></mfrac></mrow></math>',
							feedback:
								'<p>Not quite. This would mean <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> groups of <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>3</mn></mfrac></math> each. But we have <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> circles, each with <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac></math> shaded, not <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> groups of <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>3</mn></mfrac></math>.</p>'
						},
						{
							identifier: "B",
							content:
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mn>3</mn><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></mrow></math>',
							feedback:
								'<p>Correct! There are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> circles and <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac></math> of each circle is shaded. We can multiply: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math>.</p>'
						},
						{
							identifier: "C",
							content:
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></mrow></math>',
							feedback:
								'<p>Correct! Since we have <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> circles and each has <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac></math> shaded, we can add: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math>.</p>'
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Excellent!</span> You found both correct ways to calculate the shaded area. Since we have <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> circles with <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac></math> shaded in each, we can either multiply <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math> or add <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math>. Both give us <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>4</mn></mfrac></math> as the total shaded area.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> Look carefully at the image. There are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> circles, and <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac></math> of each circle is shaded. We can find the total shaded area by either: (1) multiplying <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math>, or (2) adding <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math>.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="calculate-shaded-area"')
		expect(compiledXml).toContain("partitionedShape")
	})

	test("should correctly compile circle equation center and radius problem", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "circle-equation-center-radius",
			title: "Find the center and radius of a circle from its equation",
			responseDeclarations: [
				{ identifier: "RESPONSE_X", cardinality: "single", baseType: "integer", correct: -9 },
				{ identifier: "RESPONSE_Y", cardinality: "single", baseType: "integer", correct: -7 },
				{ identifier: "RESPONSE_R", cardinality: "single", baseType: "integer", correct: 5 }
			],
			body: [
				"<p>A certain circle can be represented by the following equation.</p>",
				'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>+</mo><mn>14</mn><mi>y</mi><mo>+</mo><mn>105</mn><mo>=</mo><mn>0</mn></mrow></math>',
				"<p>What is the center of this circle?</p>",
				"<p>(",
				{ type: "textEntryInteraction", responseIdentifier: "RESPONSE_X", expectedLength: 3 },
				"<span>, </span>",
				{ type: "textEntryInteraction", responseIdentifier: "RESPONSE_Y", expectedLength: 3 },
				")</p>",
				"<p>What is the radius of this circle?</p>",
				"<p>",
				{ type: "textEntryInteraction", responseIdentifier: "RESPONSE_R", expectedLength: 2 },
				"<span> units</span></p>"
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> You successfully found that the circle is centered at (<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>9</mn></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>7</mn></math>) with a radius of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math> units.</p><p>You correctly converted the equation to standard form: <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>(</mo><mi>x</mi><mo>+</mo><mn>9</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup><mo>+</mo><mo>(</mo><mi>y</mi><mo>+</mo><mn>7</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup><mo>=</mo><mn>25</mn></math></p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> Let\'s complete the square to find the center and radius.</p><p>Starting with: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>+</mo><mn>14</mn><mi>y</mi><mo>+</mo><mn>105</mn><mo>=</mo><mn>0</mn></math></p><ul><li>Group the x-terms and y-terms: <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>(</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>)</mo><mo>+</mo><mo>(</mo><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>14</mn><mi>y</mi><mo>)</mo><mo>=</mo><mo>-</mo><mn>105</mn></math></li><li>Complete the square for x: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>+</mo><mn>81</mn><mo>=</mo><mo>(</mo><mi>x</mi><mo>+</mo><mn>9</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup></math></li><li>Complete the square for y: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>14</mn><mi>y</mi><mo>+</mo><mn>49</mn><mo>=</mo><mo>(</mo><mi>y</mi><mo>+</mo><mn>7</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup></math></li><li>Don\'t forget to add <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>81</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>49</mn></math> to both sides!</li><li>Final form: <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>(</mo><mi>x</mi><mo>+</mo><mn>9</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup><mo>+</mo><mo>(</mo><mi>y</mi><mo>+</mo><mn>7</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup><mo>=</mo><mn>25</mn></math></li></ul><p>Therefore: center = (<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>9</mn></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>7</mn></math>) and radius = <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math></p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="circle-equation-center-radius"')
	})

	test("should correctly compile find missing data point given mean", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "haruka-exam-score",
			title: "Find a missing data point given the mean",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "integer",
					correct: 87
				}
			],
			body: [
				"<p>The following table shows each of Haruka's final exam scores last semester.</p>",
				{
					type: "dataTable",
					columnHeaders: ["Final exam", "Score on a 100-point scale"],
					rows: [
						{ cells: ["Astronomy", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>72</mn></math>'] },
						{ cells: ["Biology", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>85</mn></math>'] },
						{ cells: ["Physics", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>92</mn></math>'] },
						{ cells: ["Chemistry", "?"] }
					]
				},
				'<p>If the mean of the data set is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>84</mn></math> points, find Haruka\'s final exam score in chemistry.</p>',
				"<p>",
				{
					type: "textEntryInteraction",
					responseIdentifier: "RESPONSE",
					expectedLength: 3
				},
				"<span> points</span></p>"
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> Haruka scored <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>87</mn></math> points on her chemistry exam.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> To find the missing score, use the formula for mean:</p><p>Mean = (Sum of all scores) ÷ (Number of scores)</p><ol><li>Calculate the total points: Mean × Number of exams = <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>84</mn><mo>×</mo><mn>4</mn><mo>=</mo><mn>336</mn></math> points</li><li>Add up the known scores: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>72</mn><mo>+</mo><mn>85</mn><mo>+</mo><mn>92</mn><mo>=</mo><mn>249</mn></math> points</li><li>Find the missing score: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>336</mn><mo>-</mo><mn>249</mn><mo>=</mo><mn>87</mn></math> points</li></ol><p>Therefore, Haruka scored <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>87</mn></math> points on her chemistry exam.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="haruka-exam-score"')
		expect(compiledXml).toContain("<table")
	})

	test("should correctly compile business cycle trough identification", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "libertyville-business-cycle",
			title: "Business Cycle Trough Identification",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "identifier",
					correct: "C"
				}
			],
			body: [
				"<em>The table below shows the gross domestic product (GDP) and unemployment data for Libertyville over five years</em>",
				{
					type: "dataTable",
					columnHeaders: ["Year", "GDP (% change)", "Unemployment (% of the labor force)"],
					rows: [
						{
							cells: [
								"2014",
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>0</mn><mo>%</mo></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn><mo>%</mo></math>'
							]
						},
						{
							cells: [
								"2015",
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1</mn><mo>%</mo></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn><mo>%</mo></math>'
							]
						},
						{
							cells: [
								"2016",
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>2</mn><mo>%</mo></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>10</mn><mo>%</mo></math>'
							]
						},
						{
							cells: [
								"2017",
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn><mo>%</mo></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>6</mn><mo>%</mo></math>'
							]
						},
						{
							cells: [
								"2018",
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn><mo>%</mo></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn><mo>%</mo></math>'
							]
						},
						{
							cells: [
								"2019",
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mo>%</mo></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>6</mn><mo>%</mo></math>'
							]
						}
					]
				},
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 1,
					maxChoices: 1,
					prompt:
						"<p>In which of the years was Libertyville most likely experiencing a trough in its business cycle?</p>",
					choices: [
						{
							identifier: "A",
							content: "<p>2014</p>",
							feedback:
								"<p>GDP fell for the two years following 2014, indicating that Libertyville entered the recession phase of its business cycle in 2014. A trough is the turning point at which a recession ends and an expansion begins.</p>"
						},
						{
							identifier: "B",
							content: "<p>2015</p>",
							feedback:
								"<p>GDP fell in 2015, indicating that Libertyville was in the recession phase of its business cycle in 2015. However the economy still had further to fall before it started to turn around. A trough is the turning point at which a recession ends and an expansion begins.</p>"
						},
						{
							identifier: "C",
							content: "<p>2016</p>",
							feedback:
								"<p>GDP fell in 2016 but increased in 2017, indicating that 2016 was the turning point at which Libertyville's two year recession ended and the economy entered the recovery/expansion phase of its business cycle.</p>"
						},
						{
							identifier: "D",
							content: "<p>2017</p>",
							feedback:
								"<p>GDP increased in 2017, indicating that Libertyville was in the expansion phase of its business cycle. A trough is the turning point at which a recession ends and an expansion begins.</p>"
						},
						{
							identifier: "E",
							content: "<p>2018</p>",
							feedback:
								"<p>GDP increased in 2018, indicating that Libertyville was in the expansion phase of its business cycle. A trough is the turning point at which a recession ends and an expansion begins.</p>"
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> 2016 was the trough year. The GDP had been declining for two years (2015 and 2016) but then began recovering in 2017. A trough marks the lowest point of a recession before recovery begins.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> A trough occurs at the bottom of a recession, when GDP stops falling and starts growing again. Notice that GDP fell in 2015 (<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1</mn><mo>%</mo></math>) and 2016 (<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>2</mn><mo>%</mo></math>), then rose in 2017 (<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>+</mo><mn>2</mn><mo>%</mo></math>). This makes 2016 the trough year.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="libertyville-business-cycle"')
		expect(compiledXml).toContain("<table")
	})

	test("should correctly compile continuity and differentiability of piecewise function", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "continuity-differentiability-piecewise",
			title: "Continuity and Differentiability of a Piecewise Function",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "identifier",
					correct: "C"
				}
			],
			body: [
				'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>f</mi><mo stretchy="false">(</mo><mi>x</mi><mo stretchy="false">)</mo><mo>=</mo><mrow><mo>{</mo><mtable><mtr><mtd columnalign="left"><mrow><mo>-</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>3</mn></mrow></mtd><mtd columnalign="left"><mrow><mo>,</mo><mi>x</mi><mo>≤</mo><mn>2</mn></mrow></mtd></mtr><mtr><mtd columnalign="left"><mrow><msup><mrow><mo stretchy="false">(</mo><mi>x</mi><mo>-</mo><mn>4</mn><mo stretchy="false">)</mo></mrow><mn>2</mn></msup><mo>-</mo><mn>5</mn></mrow></mtd><mtd columnalign="left"><mrow><mo>,</mo><mi>x</mi><mo>&gt;</mo><mn>2</mn></mrow></mtd></mtr></mtable></mrow></mrow></math>',
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 1,
					maxChoices: 1,
					prompt:
						'Is the function given below continuous/differentiable at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>?',
					choices: [
						{
							identifier: "A",
							content: "<p>continuous, not differentiable</p>",
							feedback:
								'<p>This would be the case if the function values matched at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math> but the derivatives from left and right were different. Check both the limit values and the derivatives.</p>'
						},
						{
							identifier: "B",
							content: "<p>differentiable, not continuous</p>",
							feedback:
								"<p>This is impossible! A function must be continuous at a point to be differentiable there.</p>"
						},
						{
							identifier: "C",
							content: "<p>both continuous and differentiable</p>",
							feedback:
								'<p>Correct! The function values match at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math> (both equal <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1</mn></math>) and the derivatives from both sides equal <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>4</mn></math>, so the function is both continuous and differentiable.</p>'
						},
						{
							identifier: "D",
							content: "<p>neither continuous nor differentiable</p>",
							feedback:
								'<p>Not quite. The function doesn\'t have a jump discontinuity at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>. Check if the left and right limits at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math> are equal.</p>'
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><strong>Correct!</strong> The function is both continuous and differentiable at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>.</p><p>For continuity: <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo>(</mo><mn>2</mn><mo>)</mo><mo>=</mo><mo>-</mo><mn>4</mn><mo>+</mo><mn>3</mn><mo>=</mo><mo>-</mo><mn>1</mn></math>, and both one-sided limits equal <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1</mn></math>.</p><p>For differentiability: The left derivative is <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>2</mn><mi>x</mi><msub><mo>|</mo><mrow><mi>x</mi><mo>=</mo><mn>2</mn></mrow></msub><mo>=</mo><mo>-</mo><mn>4</mn></math>, and the right derivative is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn><mo>(</mo><mi>x</mi><mo>-</mo><mn>4</mn><mo>)</mo><msub><mo>|</mo><mrow><mi>x</mi><mo>=</mo><mn>2</mn></mrow></msub><mo>=</mo><mo>-</mo><mn>4</mn></math>. Since they match, <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo>\'</mo><mo>(</mo><mn>2</mn><mo>)</mo><mo>=</mo><mo>-</mo><mn>4</mn></math>.</p>',
				incorrect:
					'<p><strong>Not quite.</strong> Let\'s check both continuity and differentiability at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>:</p><p><strong>Continuity:</strong> We need <math xmlns="http://www.w3.org/1998/Math/MathML"><munder><mo>lim</mo><mrow><mi>x</mi><mo>→</mo><msup><mn>2</mn><mo>-</mo></msup></mrow></munder><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><munder><mo>lim</mo><mrow><mi>x</mi><mo>→</mo><msup><mn>2</mn><mo>+</mo></msup></mrow></munder><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><mi>f</mi><mo>(</mo><mn>2</mn><mo>)</mo></math></p><ul><li><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo>(</mo><mn>2</mn><mo>)</mo><mo>=</mo><mo>-</mo><msup><mn>2</mn><mn>2</mn></msup><mo>+</mo><mn>3</mn><mo>=</mo><mo>-</mo><mn>1</mn></math></li><li><math xmlns="http://www.w3.org/1998/Math/MathML"><munder><mo>lim</mo><mrow><mi>x</mi><mo>→</mo><msup><mn>2</mn><mo>-</mo></msup></mrow></munder><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</mo><munder><mo>lim</mo><mrow><mi>x</mi><mo>→</mo><msup><mn>2</mn><mo>-</mo></msup></mrow></munder><mo>(</mo><mo>-</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>3</mn><mo>)</mo><mo>=</mo><mo>-</mo><mn>1</mn></math></li><li><math xmlns="http://www.w3.org/1998/Math/MathML"><munder><mo>lim</mo><mrow><mi>x</mi><mo>→</mo><msup><mn>2</mn><mo>+</mo></msup></mrow></munder><mi>f</mi><mo>(</mo><mi>x</mi><mo>)</mo><mo>=</munder><mo>lim</mo><mrow><mi>x</mi><mo>→</mo><msup><mn>2</mn><mo>+</mo></msup></mrow></munder><mo>(</mo><msup><mrow><mo>(</mo><mi>x</mi><mo>-</mo><mn>4</mn><mo>)</mo></mrow><mn>2</mn></msup><mo>-</mo><mn>5</mn><mo>)</mo><mo>=</mo><msup><mrow><mo>(</mo><mn>2</mn><mo>-</mo><mn>4</mn><mo>)</mo></mrow><mn>2</mn></msup><mo>-</mo><mn>5</mn><mo>=</mo><mn>4</mn><mo>-</mo><mn>5</mn><mo>=</mo><mo>-</mo><mn>1</mn></math></li></ul><p>All three values equal <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1</mn></math>, so the function is continuous.</p><p><strong>Differentiability:</strong> We need the left and right derivatives to be equal.</p><ul><li>Left derivative: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mi>d</mi><mrow><mi>d</mi><mi>x</mi></mrow></mfrac><mo>(</mo><mo>-</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>3</mn><mo>)</mo><mo>=</mo><mo>-</mo><mn>2</mn><mi>x</mi></math>, so at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>: <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>4</mn></math></li><li>Right derivative: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mi>d</mi><mrow><mi>d</mi><mi>x</mi></mrow></mfrac><mo>(</mo><msup><mrow><mo>(</mo><mi>x</mi><mo>-</mo><mn>4</mn><mo>)</mo></mrow><mn>2</mn></msup><mo>-</mo><mn>5</mn><mo>)</mo><mo>=</mo><mn>2</mn><mo>(</mo><mi>x</mi><mo>-</mo><mn>4</mn><mo>)</mo></math>, so at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn><mo>(</mo><mo>-</mo><mn>2</mn><mo>)</mo><mo>=</mo><mo>-</mo><mn>4</mn></math></li></ul><p>Both derivatives equal <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>4</mn></math>, so the function is differentiable at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="continuity-differentiability-piecewise"')
	})

	test("should correctly compile Stokes' theorem surface integral rewrite", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "stokes-theorem-rewrite",
			title: "Rewrite Surface Integral using Stokes' Theorem",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "string",
					correct: "x^2/2-x*cos(z)"
				}
			],
			body: [
				'<p>Assume that <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>S</mi></math> is an inwardly oriented, piecewise-smooth surface with a piecewise-smooth, simple, closed boundary curve <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>C</mi></math> oriented <em>negatively</em> with respect to the orientation of <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>S</mi></math>.</p>',
				'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msub><mo>∬</mo><mi>S</mi></msub><mrow><mo>[</mo><mrow><mn>4</mn><mi>z</mi><mover><mi>i</mi><mo>^</mo></mover><mo>+</mo><mo stretchy="false">(</mo><mi>x</mi><mo>-</mo><mi>cos</mi><mo stretchy="false">(</mo><mi>z</mi><mo stretchy="false">)</mo><mo stretchy="false">)</mo><mover><mi>j</mi><mo>^</mo></mover><mo>+</mo><mn>2</mn><mover><mi>k</mi><mo>^</mo></mover></mrow><mo>]</mo></mrow><mo>·</mo><mi>d</mi><mi>S</mi></mrow></math>',
				"<p>Use Stokes' theorem to rewrite the surface integral as a line integral.</p>",
				'<p><em>Leave out extraneous functions of <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>z</mi></math> and constant coefficients.</em></p>',
				'<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msub><mo>∮</mo><mi>C</mi></msub><mo stretchy="false">(</mo><mo stretchy="false">(</mo><mn>2</mn><mi>y</mi><mo stretchy="false">)</mo><mover><mi>i</mi><mo>^</mo></mover><mo>+</mo><mo stretchy="false">(</mo><mn>2</mn><msup><mi>z</mi><mn>2</mn></msup><mo stretchy="false">)</mo><mover><mi>j</mi><mo>^</mo></mover><mo>+</mo></mrow></math>',
				{
					type: "textEntryInteraction",
					responseIdentifier: "RESPONSE",
					expectedLength: 20
				},
				'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mover><mi>k</mi><mo>^</mo></mover><mo stretchy="false">)</mo><mo>·</mo><mi>d</mi><mi>r</mi></mrow></math></p>'
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> The missing component is <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfrac><msup><mi>x</mi><mn>2</mn></msup><mn>2</mn></mfrac><mo>-</mo><mi>x</mi><mi>cos</mi><mo stretchy="false">(</mo><mi>z</mi><mo stretchy="false">)</mo></mrow></math>.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> Let\'s use Stokes\' theorem to solve this.</p><p>Stokes\' theorem states: <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msub><mo>∮</mo><mi>C</mi></msub><mi>F</mi><mo>·</mo><mi>d</mi><mi>r</mi><mo>=</mo><msub><mo>∬</mo><mi>S</mi></msub><mi>curl</mi><mo stretchy="false">(</mo><mi>F</mi><mo stretchy="false">)</mo><mo>·</mo><mi>d</mi><mi>S</mi></mrow></math></p><p>Since the curve <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>C</mi></math> is negatively oriented, we must have:</p><p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>curl</mi><mo stretchy="false">(</mo><mi>F</mi><mo stretchy="false">)</mo><mo>=</mo><mo>-</mo><mrow><mo>[</mo><mrow><mn>4</mn><mi>z</mi><mover><mi>i</mi><mo>^</mo></mover><mo>+</mo><mo stretchy="false">(</mo><mi>x</mi><mo>-</mo><mi>cos</mi><mo stretchy="false">(</mo><mi>z</mi><mo stretchy="false">)</mo><mo stretchy="false">)</mo><mover><mi>j</mi><mo>^</mo></mover><mo>+</mo><mn>2</mn><mover><mi>k</mi><mo>^</mo></mover></mrow><mo>]</mo></mrow><mo>=</mo><mo stretchy="false">(</mo><mo>-</mo><mn>4</mn><mi>z</mi><mo stretchy="false">)</mo><mover><mi>i</mi><mo>^</mo></mover><mo>+</mo><mo stretchy="false">(</mo><mi>cos</mi><mo stretchy="false">(</mo><mi>z</mi><mo stretchy="false">)</mo><mo>-</mo><mi>x</mi><mo stretchy="false">)</mo><mover><mi>j</mi><mo>^</mo></mover><mo>-</mo><mn>2</mn><mover><mi>k</mi><mo>^</mo></mover></mrow></math></p><p>Let the unknown component of <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>F</mi></math> be <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>P</mi></math>. We are given <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>F</mi><mo>=</mo><mn>2</mn><mi>y</mi><mover><mi>i</mi><mo>^</mo></mover><mo>+</mo><mn>2</mn><msup><mi>z</mi><mn>2</mn></msup><mover><mi>j</mi><mo>^</mo></mover><mo>+</mo><mi>P</mi><mover><mi>k</mi><mo>^</mo></mover></math>. Calculating its curl:</p><p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>curl</mi><mo stretchy="false">(</mo><mi>F</mi><mo stretchy="false">)</mo><mo>=</mo><mrow><mo>(</mo><mrow><mfrac><mrow><mo>∂</mo><mi>P</mi></mrow><mrow><mo>∂</mo><mi>y</mi></mrow></mfrac><mo>-</mo><mn>4</mn><mi>z</mi></mrow><mo>)</mo></mrow><mover><mi>i</mi><mo>^</mo></mover><mo>+</mo><mrow><mo>(</mo><mrow><mo>-</mo><mfrac><mrow><mo>∂</mo><mi>P</mi></mrow><mrow><mo>∂</mo><mi>x</mi></mrow></mfrac></mrow><mo>)</mo></mrow><mover><mi>j</mi><mo>^</mo></mover><mo>+</mo><mo stretchy="false">(</mo><mo>-</mo><mn>2</mn><mo stretchy="false">)</mo><mover><mi>k</mi><mo>^</mo></mover></mrow></math></p><p>By comparing components, we get:</p><p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfrac><mrow><mo>∂</mo><mi>P</mi></mrow><mrow><mo>∂</mo><mi>y</mi></mrow></mfrac><mo>-</mo><mn>4</mn><mi>z</mi><mo>=</mo><mo>-</mo><mn>4</mn><mi>z</mi><mspace width="1em"/><mo>⇒</mo><mspace width="1em"/><mfrac><mrow><mo>∂</mo><mi>P</mi></mrow><mrow><mo>∂</mo><mi>y</mi></mrow></mfrac><mo>=</mo><mn>0</mn></mrow></math></p><p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mo>-</mo><mfrac><mrow><mo>∂</mo><mi>P</mi></mrow><mrow><mo>∂</mo><mi>x</mi></mrow></mfrac><mo>=</mo><mi>cos</mi><mo stretchy="false">(</mo><mi>z</mi><mo stretchy="false">)</mo><mo>-</mo><mi>x</mi></mrow></math></p><p>Integrating the second equation with respect to <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math> gives a solution for <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>P</mi></math> (ignoring extraneous functions of <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>z</mi></math>):</p><p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>P</mi><mo>=</mo><mfrac><msup><mi>x</mi><mn>2</mn></msup><mn>2</mn></mfrac><mo>-</mo><mi>x</mi><mi>cos</mi><mo stretchy="false">(</mo><mi>z</mi><mo stretchy="false">)</mo></mrow></math></p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="stokes-theorem-rewrite"')
	})

	test("should correctly compile estimate derivative from table", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "estimate-derivative-from-table",
			title: "Estimate derivative from a table of values",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "identifier",
					correct: "D"
				}
			],
			body: [
				'This table gives select values of the differentiable function <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>h</mi></math>.',
				{
					type: "dataTable",
					rows: [
						{
							cells: [
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>9</mn></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>8</mn></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6</mn></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>3</mn></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>2</mn></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1</mn></math>'
							]
						},
						{
							cells: [
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>h</mi><mo>(</mo><mi>x</mi><mo>)</mo></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>30</mn></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>29</mn></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>36</mn></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>20</mn></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>35</mn></math>',
								'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>47</mn></math>'
							]
						}
					]
				},
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 1,
					maxChoices: 1,
					prompt:
						'What is the best estimate for <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msup><mi>h</mi><mo>\'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></mrow></math> we can make based on this table?',
					choices: [
						{
							identifier: "A",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>28</mn></math>',
							feedback:
								'Were you trying to pick a value between <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>36</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>20</mn></math>? This can be an estimate for <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>h</mi><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></math>, but we are looking for <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>h</mi><mo>\'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></math>.'
						},
						{
							identifier: "B",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>13.5</mn></math>',
							feedback:
								'Were you trying to find <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>h</mi><mo>(</mo><mo>-</mo><mn>1</mn><mo>)</mo><mo>-</mo><mi>h</mi><mo>(</mo><mo>-</mo><mn>3</mn><mo>)</mo></mrow><mrow><mo>-</mo><mn>1</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>3</mn><mo>)</mo></mrow></mfrac></math>? This is the average rate of change, or the slope of a secant line, of <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>h</mi></math> over the interval <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>[</mo><mo>-</mo><mn>3</mn><mo>,</mo><mo>-</mo><mn>1</mn><mo>]</mo></math>. We should pick an interval that includes <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn></math>.'
						},
						{
							identifier: "C",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>2.125</mn></math>',
							feedback:
								'Were you trying to find <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>h</mi><mo>(</mo><mo>-</mo><mn>1</mn><mo>)</mo><mo>-</mo><mi>h</mi><mo>(</mo><mo>-</mo><mn>9</mn><mo>)</mo></mrow><mrow><mo>-</mo><mn>1</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>9</mn><mo>)</mo></mrow></mfrac></math>? This is the average rate of change, or the slope of a secant line, of <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>h</mi></math> over the entire interval <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>[</mo><mo>-</mo><mn>9</mn><mo>,</mo><mo>-</mo><mn>1</mn><mo>]</mo></math>. We can pick a closer interval to estimate <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>h</mi><mo>\'</mo></msup></math> specifically at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn></math>.'
						},
						{
							identifier: "D",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5.33</mn></math>',
							feedback:
								'Correct! The best estimate for <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>h</mi><mo>\'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></math> is the average rate of change over the narrowest interval available that contains <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>4</mn></math>, which is <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>[</mo><mo>-</mo><mn>6</mn><mo>,</mo><mo>-</mo><mn>3</mn><mo>]</mo></math>.'
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> The best estimate for <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>h</mi><mo>\'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></math> is the average rate of change of <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>h</mi></math> over the narrowest interval containing <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>4</mn></math> that can be formed from the table. This interval is <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>[</mo><mo>-</mo><mn>6</mn><mo>,</mo><mo>-</mo><mn>3</mn><mo>]</mo></math>. The average rate of change is <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>h</mi><mo>(</mo><mo>-</mo><mn>3</mn><mo>)</mo><mo>-</mo><mi>h</mi><mo>(</mo><mo>-</mo><mn>6</mn><mo>)</mo></mrow><mrow><mo>-</mo><mn>3</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>6</mn><mo>)</mo></mrow></mfrac><mo>=</mo><mfrac><mrow><mo>-</mo><mn>20</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>36</mn><mo>)</mo></mrow><mn>3</mn></mfrac><mo>=</mo><mfrac><mn>16</mn><mn>3</mn></mfrac><mo>≈</mo><mn>5.33</mn></math>.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> To estimate the derivative <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>h</mi><mo>\'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></math>, you should calculate the average rate of change over the smallest interval that contains <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>4</mn></math>. Looking at the table, the points closest to <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn></math> are <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>6</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>3</mn></math>. The average rate of change is <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>h</mi><mo>(</mo><mo>-</mo><mn>3</mn><mo>)</mo><mo>-</mo><mi>h</mi><mo>(</mo><mo>-</mo><mn>6</mn><mo>)</mo></mrow><mrow><mo>-</mo><mn>3</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>6</mn><mo>)</mo></mrow></mfrac><mo>=</mo><mfrac><mrow><mo>-</mo><mn>20</mo><mo>-</mo><mo>(</mo><mo>-</mo><mn>36</mn><mo>)</mo></mrow><mn>3</mn></mfrac><mo>=</mo><mfrac><mn>16</mn><mn>3</mn></mfrac><mo>≈</mo><mn>5.33</mn></math>.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="estimate-derivative-from-table"')
		expect(compiledXml).toContain("<table")
	})

	test("should correctly compile count the apples with discrete object diagrams", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "count-apples-emoji",
			title: "Count the apples",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "identifier",
					correct: "CHOICE_5"
				}
			],
			body: [
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 1,
					maxChoices: 1,
					prompt: '<p>Which box has <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math> apples?</p>',
					choices: [
						{
							identifier: "CHOICE_3",
							content: {
								type: "discreteObjectRatioDiagram",
								width: 250,
								height: 120,
								layout: "grid",
								objects: [{ count: 3, emoji: "🍎" }]
							}
						},
						{
							identifier: "CHOICE_4",
							content: {
								type: "discreteObjectRatioDiagram",
								width: 250,
								height: 120,
								layout: "grid",
								objects: [{ count: 4, emoji: "🍎" }]
							}
						},
						{
							identifier: "CHOICE_5",
							content: {
								type: "discreteObjectRatioDiagram",
								width: 250,
								height: 120,
								layout: "grid",
								objects: [{ count: 5, emoji: "🍎" }]
							}
						},
						{
							identifier: "CHOICE_6",
							content: {
								type: "discreteObjectRatioDiagram",
								width: 250,
								height: 120,
								layout: "grid",
								objects: [{ count: 6, emoji: "🍎" }]
							}
						}
					]
				}
			],
			feedback: {
				correct: '<p><span class="qti-keyword-emphasis">Great job!</span> That box has exactly five apples.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Try again.</span> Count the apples in each box to find the one with exactly five.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="count-apples-emoji"')
		expect(compiledXml).toContain("discreteObjectRatioDiagram")
	})

	test("should correctly compile bar graph for shapes in a bin", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "shape-bin-barchart-choice",
			title: "Create a bar graph for shapes in a bin",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "identifier",
					correct: "A"
				}
			],
			body: [
				"<p>A second grade classroom has a bin of shapes.</p>",
				{
					type: "dataTable",
					columnHeaders: ["Type of shape", "Number of shapes"],
					rows: [
						{ cells: ["Triangles", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math>'] },
						{ cells: ["Circles", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math>'] },
						{ cells: ["Rectangles", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math>'] },
						{ cells: ["Squares", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>9</mn></math>'] }
					]
				},
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 1,
					maxChoices: 1,
					prompt: "<p>Which bar graph correctly shows the number of shapes in the bin?</p>",
					choices: [
						{
							identifier: "A",
							content: {
								type: "barChart",
								width: 400,
								height: 300,
								xAxisLabel: "Type of shape",
								yAxis: { label: "Number of shape", min: 0, max: 10, tickInterval: 2 },
								data: [
									{ label: "Triangles", value: 8 },
									{ label: "Circles", value: 5 },
									{ label: "Rectangles", value: 3 },
									{ label: "Squares", value: 9 }
								]
							}
						},
						{
							identifier: "B",
							content: {
								type: "barChart",
								width: 400,
								height: 300,
								xAxisLabel: "Type of shape",
								yAxis: { label: "Number of shape", min: 0, max: 10, tickInterval: 2 },
								data: [
									{ label: "Triangles", value: 9 },
									{ label: "Circles", value: 5 },
									{ label: "Rectangles", value: 3 },
									{ label: "Squares", value: 8 }
								]
							}
						},
						{
							identifier: "C",
							content: {
								type: "barChart",
								width: 400,
								height: 300,
								xAxisLabel: "Type of shape",
								yAxis: { label: "Number of shape", min: 0, max: 10, tickInterval: 2 },
								data: [
									{ label: "Triangles", value: 7 },
									{ label: "Circles", value: 4 },
									{ label: "Rectangles", value: 2 },
									{ label: "Squares", value: 10 }
								]
							}
						},
						{
							identifier: "D",
							content: {
								type: "barChart",
								width: 400,
								height: 300,
								xAxisLabel: "Type of shape",
								yAxis: { label: "Number of shape", min: 0, max: 10, tickInterval: 2 },
								data: [
									{ label: "Triangles", value: 4 },
									{ label: "Circles", value: 8 },
									{ label: "Rectangles", value: 9 },
									{ label: "Squares", value: 3 }
								]
							}
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> The chosen graph perfectly matches the data provided in the table: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> Triangles, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math> Circles, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> Rectangles, and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>9</mn></math> Squares.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> Match the number of shapes from the table to the height of the bar for each shape type. For example, the table says there are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> Triangles, so the "Triangles" bar should reach the line for the number <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> on the vertical axis.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="shape-bin-barchart-choice"')
		expect(compiledXml).toContain("barChart")
	})

	test("should correctly compile pencil lengths line plot", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "pencil-length-line-plot-choice",
			title: "Represent Pencil Lengths on a Line Plot",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "identifier",
					correct: "A"
				}
			],
			body: [
				'The lengths of 4 pencils were measured. The lengths are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>11</mn></math> cm, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> cm, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> cm, and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> cm.',
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 1,
					maxChoices: 1,
					prompt: "<p>Which line plot correctly shows the length of each pencil?</p>",
					choices: [
						{
							identifier: "A",
							content: {
								type: "dotPlot",
								width: 450,
								height: 150,
								axis: { min: 0, max: 12, tickInterval: 2 },
								data: [
									{ value: 3, count: 1 },
									{ value: 8, count: 2 },
									{ value: 11, count: 1 }
								],
								dotColor: "#0074c8",
								dotRadius: 8
							},
							feedback:
								"<p>This plot correctly shows a dot for each of the 4 pencils at its measured length. There is one dot at 3, two dots at 8, and one dot at 11.</p>"
						},
						{
							identifier: "B",
							content: {
								type: "dotPlot",
								width: 450,
								height: 150,
								axis: { min: 0, max: 12, tickInterval: 2 },
								data: [
									{ value: 3, count: 1 },
									{ value: 8, count: 1 },
									{ value: 11, count: 1 }
								],
								dotColor: "#0074c8",
								dotRadius: 8
							},
							feedback:
								'<p>This plot only shows one dot for the length of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> cm. Remember, there were two pencils with this length, so there should be two dots above the number <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math>.</p>'
						},
						{
							identifier: "C",
							content: {
								type: "dotPlot",
								width: 450,
								height: 150,
								axis: { min: 0, max: 12, tickInterval: 2 },
								data: [{ value: 4, count: 4 }],
								dotColor: "#0074c8",
								dotRadius: 8
							},
							feedback:
								'<p>This plot shows four dots above the number <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math>. This represents the total number of pencils, not their individual lengths.</p>'
						},
						{
							identifier: "D",
							content: {
								type: "dotPlot",
								width: 450,
								height: 150,
								axis: { min: 0, max: 12, tickInterval: 2 },
								data: [
									{ value: 4, count: 1 },
									{ value: 9, count: 2 },
									{ value: 12, count: 1 }
								],
								dotColor: "#0074c8",
								dotRadius: 8
							},
							feedback:
								"<p>This plot shows lengths of 4 cm, 9 cm, and 12 cm. Check the data again carefully to make sure the dots are placed above the correct numbers on the line plot.</p>"
						}
					]
				}
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> The data set {11, 8, 8, 3} has one pencil of length <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> cm, two pencils of length <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> cm, and one pencil of length <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>11</mn></math> cm. The chosen plot correctly displays a dot for each of these measurements.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> To create the line plot, place one dot above the correct number on the line for each pencil measured. The lengths are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> cm, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> cm, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> cm, and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>11</mn></math> cm. This means there should be one dot above <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math>, two dots above <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math>, and one dot above <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>11</mn></math>.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="pencil-length-line-plot-choice"')
		expect(compiledXml).toContain("dotPlot")
	})

	test("should correctly compile reading a bar chart", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "games-won-barchart",
			title: "Reading a bar chart",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "integer",
					correct: 14
				}
			],
			body: [
				"<p>The Lions, Tigers, and Bears won baseball games last summer.</p>",
				"<p>This bar graph shows how many games each team won.</p>",
				{
					type: "barChart",
					width: 480,
					height: 340,
					xAxisLabel: "Team",
					yAxis: {
						label: "Games Won",
						min: 0,
						max: 16,
						tickInterval: 2
					},
					data: [
						{ label: "Lions", value: 14 },
						{ label: "Tigers", value: 2 },
						{ label: "Bears", value: 7 }
					]
				},
				"<p>How many games did the Lions win?</p>",
				"<p>",
				{
					type: "textEntryInteraction",
					responseIdentifier: "RESPONSE",
					expectedLength: 3
				},
				"<span> games</span></p>"
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> The bar for the Lions goes up to the line for <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>14</mn></math>, so they won <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>14</mn></math> games.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> To find the number of games the Lions won, first find the "Lions" label on the horizontal axis. Then, follow that bar up to the top. The number on the vertical axis that aligns with the top of the bar is the answer. The Lions\' bar reaches the line for <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>14</mn></math> games.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="games-won-barchart"')
		expect(compiledXml).toContain("barChart")
	})

	test("should correctly compile interpreting a line plot", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "doll-height-line-plot",
			title: "Interpreting a line plot",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "integer",
					correct: 5
				}
			],
			body: [
				"<p>The heights of Sabrina's dolls are shown below.</p>",
				{
					type: "dotPlot",
					width: 350,
					height: 200,
					axis: {
						label: "Doll Height (centimeters)",
						min: 20,
						max: 25,
						tickInterval: 1
					},
					data: [
						{ value: 21, count: 1 },
						{ value: 22, count: 2 },
						{ value: 23, count: 3 },
						{ value: 24, count: 2 }
					],
					dotRadius: 6
				},
				'<p>How many dolls are taller than <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>22</mn></math> centimeters?</p>',
				"<p>",
				{
					type: "textEntryInteraction",
					responseIdentifier: "RESPONSE",
					expectedLength: 3
				},
				"<span> dolls</span></p>"
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> There are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> dolls that are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>23</mn></math> cm tall and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn></math> dolls that are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>24</mn></math> cm tall. In total, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mo>+</mo><mn>2</mn><mo>=</mo><mn>5</mn></math> dolls are taller than <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>22</mn></math> cm.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> To find the number of dolls taller than <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>22</mn></math> cm, count all the dots that are to the right of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>22</mn></math> on the line plot. There are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> dots above <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>23</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn></math> dots above <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>24</mn></math>. That makes a total of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math> dolls.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="doll-height-line-plot"')
		expect(compiledXml).toContain("dotPlot")
	})

	test("should correctly compile time on number line", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "time-on-number-line-detailed-final",
			title: "What time is shown on the number line?",
			responseDeclarations: [
				{ identifier: "RESPONSE_HR", cardinality: "single", baseType: "integer", correct: 12 },
				{ identifier: "RESPONSE_MIN", cardinality: "single", baseType: "integer", correct: 55, mapping: { "05": 5 } }
			],
			body: [
				"<p>Look at the following number line.</p>",
				{
					type: "numberLine",
					width: 700,
					height: 100,
					min: 0,
					max: 60,
					majorTickInterval: 15,
					minorTicksPerInterval: 14,
					specialTickLabels: [
						{ value: 0, label: "12:00" },
						{ value: 15, label: "12:15" },
						{ value: 30, label: "12:30" },
						{ value: 45, label: "12:45" },
						{ value: 60, label: "1:00" }
					],
					points: [{ value: 55, label: "A", color: "#A0522D", labelPosition: "below" }]
				},
				"<p>What time is shown on the number line?</p>",
				"<p>",
				{ type: "textEntryInteraction", responseIdentifier: "RESPONSE_HR", expectedLength: 2 },
				"<span> : </span>",
				{ type: "textEntryInteraction", responseIdentifier: "RESPONSE_MIN", expectedLength: 2 },
				"</p>"
			],
			feedback: {
				correct: '<p><span class="qti-keyword-emphasis">Correct!</span> The time shown is 12:55.</p>',
				incorrect:
					"<p><span class=\"qti-keyword-emphasis\">Not quite.</span> The point 'A' is located after the 12:00 mark but before the 1:00 mark, so the hour is 12. The mark for 12:45 is shown. The next medium tick represents 5 minutes later, which is 12:50. The next medium tick represents another 5 minutes, which is 12:55. Point 'A' is on that mark. The time is 12:55.</p>"
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="time-on-number-line-detailed-final"')
		expect(compiledXml).toContain("numberLine")
	})

	test("should correctly compile compare 2-digit numbers", () => {
		const itemDefinition: AssessmentItemInput = {
			identifier: "nice-tmp_x754a72ff9e868e57",
			title: "Compare 2-digit numbers",
			responseDeclarations: [
				{
					identifier: "RESPONSE",
					cardinality: "single",
					baseType: "identifier",
					correct: "GT"
				}
			],
			body: [
				'<p>Compare using <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&gt;</mo></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&lt;</mo></math>, or <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>=</mo></math>.</p>',
				'<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>83</mn></math>',
				{
					type: "inlineChoiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: false,
					choices: [
						{
							identifier: "GT",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&gt;</mo></math>'
						},
						{
							identifier: "LT",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&lt;</mo></math>'
						},
						{
							identifier: "EQ",
							content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>=</mo></math>'
						}
					]
				},
				'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>58</mn></math></p>'
			],
			feedback: {
				correct:
					'<p><span class="qti-keyword-emphasis">Correct!</span> <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>83</mn></math> is greater than <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>58</mn></math>, so the correct symbol is <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&gt;</mo></math>.</p>',
				incorrect:
					'<p><span class="qti-keyword-emphasis">Not quite.</span> Remember, when comparing two numbers, the symbol <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&gt;</mo></math> points to the smaller number. Since <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>83</mn></math> is larger than <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>58</mn></math>, the correct comparison is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>83</mn><mo>&gt;</mo><mn>58</mn></math>.</p>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="nice-tmp_x754a72ff9e868e57"')
		expect(compiledXml).toContain("qti-inline-choice-interaction")
	})
})
