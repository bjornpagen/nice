import { describe, expect, test } from "bun:test"
import { compile } from "./compiler"
import type { AssessmentItem } from "./schemas"

describe("QTI Compiler", () => {
	test("should correctly compile a choice interaction item with widgets", () => {
		const itemDefinition: AssessmentItem = {
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
				'Cory hikes up a hill with a constant slope. The double number line shows that after Cory hikes <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mtext> km</mtext></math>, their elevation is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>120</mn><mtext> m</mtext></math>.',
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
					prompt: "Select the double number line that shows the other values of distance and elevation.",
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
					"The ratio of distance to elevation is 3:120, which simplifies to a unit rate of 1:40. For every 1 km hiked, the elevation increases by 40 m. This matches the correct number line.",
				incorrect:
					"First, find the unit rate. If Cory's elevation is 120 m after 3 km, the rate is 120m/3km = 40 meters per kilometer. Use this rate to fill in the other values on the number line."
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
		const itemDefinition: AssessmentItem = {
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
				"Evaluate.",
				{
					type: "mathml",
					xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfrac><msup><mn>2</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><msup><mn>54</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup></mfrac><mo>=</mo></mrow></math>'
				},
				{
					type: "textEntryInteraction",
					responseIdentifier: "RESPONSE",
					expectedLength: 3
				}
			],
			feedback: {
				correct:
					'The answer is 81. You successfully applied the rule: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><msup><mi>a</mi><mi>n</mi></msup><msup><mi>b</mi><mi>n</mi></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>)</mo></mrow><mi>n</mi></msup></math>',
				incorrect:
					'Let me help you solve this step by step. First, use the rule: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><msup><mi>a</mi><mi>n</mi></msup><msup><mi>b</mi><mi>n</mi></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>)</mo></mrow><mi>n</mi></msup></math> So: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><msup><mn>2</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><msup><mn>54</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mn>2</mn><mn>54</mn></mfrac><mo>)</mo></mrow><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mn>1</mn><mn>27</mn></mfrac><mo>)</mo></mrow><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><mo>=</mo><msup><mn>27</mn><mfrac><mn>4</mn><mn>3</mn></mfrac></msup></math> Then: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mn>27</mn><mfrac><mn>4</mn><mn>3</mn></mfrac></msup><mo>=</mo><msup><mrow><mo>(</mo><mroot><mn>27</mn><mn>3</mroot><mo>)</mo></mrow><mn>4</mn></msup><mo>=</mo><msup><mn>3</mn><mn>4</mn></msup><mo>=</mo><mn>81</mn></math>'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="eval-fractional-exponents"')
		expect(compiledXml).toContain("RESPONSE")
	})

	test("should correctly compile an order interaction for comparing numbers", () => {
		const itemDefinition: AssessmentItem = {
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
					prompt: "Arrange the cards to make a true comparison.",
					choices: [
						{
							identifier: "A",
							content: { type: "mathml", xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>708</mn></math>' },
							feedback: "Correct! 708 > 79."
						},
						{
							identifier: "B",
							content: { type: "mathml", xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>></mo></math>' },
							feedback: "That symbol belongs between 708 and 79 to make a true statement."
						},
						{
							identifier: "C",
							content: { type: "mathml", xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>79</mn></math>' },
							feedback: "79 is the smaller number on the right."
						}
					]
				}
			],
			feedback: {
				correct: "You have arranged the cards as 708 > 79, which is a true comparison.",
				incorrect: "Make sure the largest number is on the left and the symbol correctly represents the relationship."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="compare-3-digit-numbers"')
		expect(compiledXml).toContain("qti-order-interaction")
	})

	test("should correctly compile a choice interaction with inequality number line", () => {
		const itemDefinition: AssessmentItem = {
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
				"Note: The open circle at 0 and the arrow pointing right indicate all values greater than 0.",
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: false,
					minChoices: 1,
					maxChoices: 1,
					prompt: "Choose the inequality that represents the graph.",
					choices: [
						{
							identifier: "A",
							content: {
								type: "mathml",
								xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>&lt;</mo><mn>0</mn></math>'
							}
						},
						{
							identifier: "B",
							content: {
								type: "mathml",
								xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>≤</mo><mn>0</mn></math>'
							}
						},
						{
							identifier: "C",
							content: {
								type: "mathml",
								xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>&gt;</mo><mn>0</mn></math>'
							}
						},
						{
							identifier: "D",
							content: {
								type: "mathml",
								xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>≥</mo><mn>0</mn></math>'
							}
						}
					]
				}
			],
			feedback: {
				correct:
					'The graph shows an open point at 0 with an arrow to the right, representing all values strictly greater than 0, so the inequality is <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>&gt;</mo><mn>0</mn></math>.',
				incorrect:
					"The open point at 0 means 0 itself is not included, and the arrow pointing right indicates values greater than 0."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="inequality-number-line"')
		expect(compiledXml).toContain("inequalityNumberLine")
	})

	test("should correctly compile a vertical number line comparison", () => {
		const itemDefinition: AssessmentItem = {
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
				"Use the number line to compare the numbers.",
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
				"Complete the statements.",
				'<p>On the number line, <math xmlns="http://www.w3.org/1998/Math/MathML"><mstyle mathcolor="purple"><mo>-</mo><mn>1.4</mn></mstyle></math> is ',
				{
					type: "inlineChoiceInteraction",
					responseIdentifier: "RESPONSE_POS",
					shuffle: false,
					choices: [
						{ identifier: "ABOVE", content: "above" },
						{ identifier: "BELOW", content: "below" }
					]
				},
				' <math xmlns="http://www.w3.org/1998/Math/MathML"><mstyle mathcolor="maroon"><mo>-</mo><mn>6.4</mn></mstyle></math>.</p>',
				'<p>This means <math xmlns="http://www.w3.org/1998/Math/MathML"><mstyle mathcolor="purple"><mo>-</mo><mn>1.4</mn></mstyle></math> is ',
				{
					type: "inlineChoiceInteraction",
					responseIdentifier: "RESPONSE_COMP",
					shuffle: false,
					choices: [
						{ identifier: "GT", content: "greater than" },
						{ identifier: "LT", content: "less than" }
					]
				},
				' <math xmlns="http://www.w3.org/1998/Math/MathML"><mstyle mathcolor="maroon"><mo>-</mo><mn>6.4</mn></mstyle></math>.</p>'
			],
			feedback: {
				correct:
					'On a vertical number line, numbers higher up are greater. Since <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is above <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>, it is the greater number.',
				incorrect:
					'Look at the positions on the number line. <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is located higher up than <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>. This means <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is above <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>, and therefore <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is greater than <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>.'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="vertical-number-line-comparison"')
		expect(compiledXml).toContain("numberLine")
	})

	test("should correctly compile a two-way frequency table with Venn diagram", () => {
		const itemDefinition: AssessmentItem = {
			identifier: "two-way-frequency-table-cold-study",
			title: "Complete a Two-Way Frequency Table",
			responseDeclarations: [
				{ identifier: "RESP_A", cardinality: "single", baseType: "integer", correct: 23 },
				{ identifier: "RESP_B", cardinality: "single", baseType: "integer", correct: 20 },
				{ identifier: "RESP_C", cardinality: "single", baseType: "integer", correct: 27 },
				{ identifier: "RESP_D", cardinality: "single", baseType: "integer", correct: 30 }
			],
			body: [
				'The Cold Be Gone Company conducted a study with <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>100</mn></math> participants. Each participant either <em>received</em> cold medicine or <em>did not receive</em> cold medicine, and the company recorded whether the participant\'s cold lasted <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn></math> days or longer.',
				{
					type: "vennDiagram",
					width: 350,
					height: 262,
					circleA: { label: "Cold Medicine", count: 27 },
					circleB: { label: "Cold longer than 7 days", count: 20 },
					intersectionCount: 23,
					outsideCount: 30
				},
				"Note: The diagram shows 23 participants who both received cold medicine and had colds lasting at least 7 days. There are 27 who received medicine but had shorter colds, 20 who did not receive medicine but had longer colds, and 30 who neither received medicine nor had colds lasting longer than 7 days.",
				"Complete the following two-way frequency table.",
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
				correct: "The completed table correctly reflects the Venn diagram data.",
				incorrect:
					'Use the numbers in the Venn diagram. The overlap (23) belongs in the "Received medicine" & "Cold ≥ 7 days" cell. Then distribute the other counts accordingly.'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="two-way-frequency-table-cold-study"')
		expect(compiledXml).toContain("vennDiagram")
	})

	test("should correctly compile equivalent fractions with partitioned shapes", () => {
		const itemDefinition: AssessmentItem = {
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
						'Which of the following rectangles have exactly <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math> of their area shaded?',
					choices: [
						{
							identifier: "A",
							content: {
								type: "partitionedShape",
								width: 180,
								height: 88,
								shapes: [{ type: "rectangle", totalParts: 8, shadedParts: 4, rows: 2, columns: 4 }]
							},
							feedback: "Correct! This rectangle has 4 out of 8 parts shaded, which equals 4/8 = 1/2 = 3/6."
						},
						{
							identifier: "B",
							content: {
								type: "partitionedShape",
								width: 180,
								height: 88,
								shapes: [{ type: "rectangle", totalParts: 4, shadedParts: 2, rows: 2, columns: 2 }]
							},
							feedback: "Correct! This rectangle has 2 out of 4 parts shaded, which equals 2/4 = 1/2 = 3/6."
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
								"Not quite. This rectangle has 3 out of 4 parts shaded, which equals 3/4. Since 3/4 is not equal to 3/6 (which equals 1/2), this is incorrect."
						}
					]
				}
			],
			feedback: {
				correct:
					"Excellent! You correctly identified that 3/6 = 1/2, and found both rectangles that have exactly half of their area shaded: 4/8 and 2/4 both equal 1/2.",
				incorrect:
					"Not quite. First, simplify 3/6 to 1/2. Then count the shaded parts in each rectangle and check if that fraction equals 1/2. Remember: 4/8 = 1/2, 2/4 = 1/2, but 3/4 ≠ 1/2."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="equivalent-fraction-images"')
		expect(compiledXml).toContain("partitionedShape")
	})

	test("should correctly compile calculating shaded area of multiple shapes", () => {
		const itemDefinition: AssessmentItem = {
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
					prompt: "How can we calculate the shaded area?",
					choices: [
						{
							identifier: "A",
							content: {
								type: "mathml",
								xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn><mo>×</mo><mfrac><mn>1</mn><mn>3</mn></mfrac></math>'
							},
							feedback:
								"Not quite. This would mean 4 groups of 1/3 each. But we have 3 circles, each with 1/4 shaded, not 4 groups of 1/3."
						},
						{
							identifier: "B",
							content: {
								type: "mathml",
								xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math>'
							},
							feedback: "Correct! There are 3 circles and 1/4 of each circle is shaded. We can multiply: 3 × 1/4."
						},
						{
							identifier: "C",
							content: {
								type: "mathml",
								xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math>'
							},
							feedback: "Correct! Since we have 3 circles and each has 1/4 shaded, we can add: 1/4 + 1/4 + 1/4."
						}
					]
				}
			],
			feedback: {
				correct:
					"Excellent! You found both correct ways to calculate the shaded area. Since we have 3 circles with 1/4 shaded in each, we can either multiply 3 × 1/4 or add 1/4 + 1/4 + 1/4. Both give us 3/4 as the total shaded area.",
				incorrect:
					"Not quite. Look carefully at the image. There are 3 circles, and 1/4 of each circle is shaded. We can find the total shaded area by either: (1) multiplying 3 × 1/4, or (2) adding 1/4 + 1/4 + 1/4."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="calculate-shaded-area"')
		expect(compiledXml).toContain("partitionedShape")
	})

	test("should correctly compile circle equation center and radius problem", () => {
		const itemDefinition: AssessmentItem = {
			identifier: "circle-equation-center-radius",
			title: "Find the center and radius of a circle from its equation",
			responseDeclarations: [
				{ identifier: "RESPONSE_X", cardinality: "single", baseType: "integer", correct: -9 },
				{ identifier: "RESPONSE_Y", cardinality: "single", baseType: "integer", correct: -7 },
				{ identifier: "RESPONSE_R", cardinality: "single", baseType: "integer", correct: 5 }
			],
			body: [
				"A certain circle can be represented by the following equation.",
				{
					type: "mathml",
					xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>+</mo><mn>14</mn><mi>y</mi><mo>+</mo><mn>105</mn><mo>=</mo><mn>0</mn></math>'
				},
				"What is the center of this circle?",
				"(",
				{ type: "textEntryInteraction", responseIdentifier: "RESPONSE_X", expectedLength: 3 },
				", ",
				{ type: "textEntryInteraction", responseIdentifier: "RESPONSE_Y", expectedLength: 3 },
				")",
				"What is the radius of this circle?",
				{ type: "textEntryInteraction", responseIdentifier: "RESPONSE_R", expectedLength: 2 },
				" units"
			],
			feedback: {
				correct:
					"You successfully found that the circle is centered at (–9, –7) with a radius of 5 units. You correctly converted the equation to standard form: (x+9)²+(y+7)²=25",
				incorrect:
					"Let's complete the square to find the center and radius. Starting with: x²+y²+18x+14y+105=0. Group the x-terms and y-terms: (x²+18x)+(y²+14y)=-105. Complete the square for x: x²+18x+81=(x+9)². Complete the square for y: y²+14y+49=(y+7)². Don't forget to add 81 and 49 to both sides! Final form: (x+9)²+(y+7)²=25. Therefore: center = (–9, –7) and radius = 5"
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="circle-equation-center-radius"')
	})

	test("should correctly compile find missing data point given mean", () => {
		const itemDefinition: AssessmentItem = {
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
				"The following table shows each of Haruka's final exam scores last semester.",
				{
					type: "dataTable",
					columnHeaders: ["Final exam", "Score on a 100-point scale"],
					rows: [
						{ cells: ["Astronomy", 72] },
						{ cells: ["Biology", 85] },
						{ cells: ["Physics", 92] },
						{ cells: ["Chemistry", "?"] }
					]
				},
				"If the mean of the data set is 84 points, find Haruka's final exam score in chemistry.",
				{
					type: "textEntryInteraction",
					responseIdentifier: "RESPONSE",
					expectedLength: 3
				},
				" points"
			],
			feedback: {
				correct: "Haruka scored 87 points on her chemistry exam.",
				incorrect:
					"To find the missing score, use the formula for mean: Mean = (Sum of all scores) ÷ (Number of scores). 1. Calculate the total points: Mean × Number of exams = 84 × 4 = 336 points. 2. Add up the known scores: 72 + 85 + 92 = 249 points. 3. Find the missing score: 336 - 249 = 87 points. Therefore, Haruka scored 87 points on her chemistry exam."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="haruka-exam-score"')
		expect(compiledXml).toContain("dataTable")
	})

	test("should correctly compile business cycle trough identification", () => {
		const itemDefinition: AssessmentItem = {
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
						{ cells: ["2014", "0%", "7%"] },
						{ cells: ["2015", "-1%", "8%"] },
						{ cells: ["2016", "-2%", "10%"] },
						{ cells: ["2017", "2%", "6%"] },
						{ cells: ["2018", "4%", "5%"] },
						{ cells: ["2019", "1%", "6%"] }
					]
				},
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 1,
					maxChoices: 1,
					prompt: "In which of the years was Libertyville most likely experiencing a trough in its business cycle?",
					choices: [
						{
							identifier: "A",
							content: "2014",
							feedback:
								"GDP fell for the two years following 2014, indicating that Libertyville entered the recession phase of its business cycle in 2014. A trough is the turning point at which a recession ends and an expansion begins."
						},
						{
							identifier: "B",
							content: "2015",
							feedback:
								"GDP fell in 2015, indicating that Libertyville was in the recession phase of its business cycle in 2015. However the economy still had further to fall before it started to turn around. A trough is the turning point at which a recession ends and an expansion begins."
						},
						{
							identifier: "C",
							content: "2016",
							feedback:
								"GDP fell in 2016 but increased in 2017, indicating that 2016 was the turning point at which Libertyville's two year recession ended and the economy entered the recovery/expansion phase of its business cycle."
						},
						{
							identifier: "D",
							content: "2017",
							feedback:
								"GDP increased in 2017, indicating that Libertyville was in the expansion phase of its business cycle. A trough is the turning point at which a recession ends and an expansion begins."
						},
						{
							identifier: "E",
							content: "2018",
							feedback:
								"GDP increased in 2018, indicating that Libertyville was in the expansion phase of its business cycle. A trough is the turning point at which a recession ends and an expansion begins."
						}
					]
				}
			],
			feedback: {
				correct:
					"2016 was the trough year. The GDP had been declining for two years (2015 and 2016) but then began recovering in 2017. A trough marks the lowest point of a recession before recovery begins.",
				incorrect:
					"A trough occurs at the bottom of a recession, when GDP stops falling and starts growing again. Notice that GDP fell in 2015 (–1%) and 2016 (–2%), then rose in 2017 (+2%). This makes 2016 the trough year."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="libertyville-business-cycle"')
		expect(compiledXml).toContain("dataTable")
	})

	test("should correctly compile continuity and differentiability of piecewise function", () => {
		const itemDefinition: AssessmentItem = {
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
				{
					type: "mathml",
					xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo stretchy="false">(</mo><mi>x</mi><mo stretchy="false">)</mo><mo>=</mo><mrow><mo>{</mo><mtable><mtr><mtd columnalign="left"><mo>-</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>3</mn></mtd><mtd columnalign="left"><mo>,</mo><mi>x</mi><mo>≤</mo><mn>2</mn></mtd></mtr><mtr><mtd columnalign="left"><msup><mrow><mo stretchy="false">(</mo><mi>x</mi><mo>-</mo><mn>4</mn><mo stretchy="false">)</mo></mrow><mn>2</mn></msup><mo>-</mo><mn>5</mn></mtd><mtd columnalign="left"><mo>,</mo><mi>x</mi><mo>></mo><mn>2</mn></mtd></mtr></mtable></mrow></math>'
				},
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
							content: "continuous, not differentiable",
							feedback:
								"This would be the case if the function values matched at x=2 but the derivatives from left and right were different. Check both the limit values and the derivatives."
						},
						{
							identifier: "B",
							content: "differentiable, not continuous",
							feedback: "This is impossible! A function must be continuous at a point to be differentiable there."
						},
						{
							identifier: "C",
							content: "both continuous and differentiable",
							feedback:
								"Correct! The function values match at x=2 (both equal -1) and the derivatives from both sides equal -4, so the function is both continuous and differentiable."
						},
						{
							identifier: "D",
							content: "neither continuous nor differentiable",
							feedback:
								"Not quite. The function doesn't have a jump discontinuity at x=2. Check if the left and right limits at x=2 are equal."
						}
					]
				}
			],
			feedback: {
				correct:
					"The function is both continuous and differentiable at x=2. For continuity: f(2) = -4+3 = -1, and both one-sided limits equal -1. For differentiability: The left derivative is -2x at x=2 -> -4, and the right derivative is 2(x-4) at x=2 -> -4. Since they match, f'(2) = -4.",
				incorrect:
					"Check both continuity (do the limits from left and right equal the function value?) and differentiability (do the derivatives from left and right match?)."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="continuity-differentiability-piecewise"')
	})

	test("should correctly compile Stokes' theorem surface integral rewrite", () => {
		const itemDefinition: AssessmentItem = {
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
				'Assume that <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>S</mi></math> is an inwardly oriented, piecewise-smooth surface with a piecewise-smooth, simple, closed boundary curve <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>C</mi></math> oriented <em>negatively</em> with respect to the orientation of <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>S</mi></math>.',
				'<math xmlns="http://www.w3.org/1998/Math/MathML"><msub><mo>∬</mo><mi>S</mi></msub><mrow><mo>[</mo><mn>4</mn><mi>z</mi><mover><mi>i</mi><mo>^</mo></mover><mo>+</mo><mo stretchy="false">(</mo><mi>x</mi><mo>-</mo><mi>cos</mi><mo stretchy="false">(</mo><mi>z</mi><mo stretchy="false">)</mo><mo stretchy="false">)</mo><mover><mi>j</mi><mo>^</mo></mover><mo>+</mo><mn>2</mn><mover><mi>k</mi><mo>^</mo></mover><mo>]</mo></mrow><mo>·</mo><mi>d</mi><mi>S</mi></math>',
				"Use Stokes' theorem to rewrite the surface integral as a line integral.",
				'<em>Leave out extraneous functions of <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>z</mi></math> and constant coefficients.</em>',
				'<p><math xmlns="http://www.w3.org/1998/Math/MathML"><msub><mo>∮</mo><mi>C</mi></msub><mo stretchy="false">(</mo><mo stretchy="false">(</mo><mn>2</mn><mi>y</mi><mo stretchy="false">)</mo><mover><mi>i</mi><mo>^</mo></mover><mo>+</mo><mo stretchy="false">(</mo><mn>2</mn><msup><mi>z</mi><mn>2</mn></msup><mo stretchy="false">)</mo><mover><mi>j</mi><mo>^</mo></mover><mo>+</mo></math>',
				{
					type: "textEntryInteraction",
					responseIdentifier: "RESPONSE",
					expectedLength: 20
				},
				'<math xmlns="http://www.w3.org/1998/Math/MathML"><mover><mi>k</mi><mo>^</mo></mover><mo stretchy="false">)</mo><mo>·</mo><mi>d</mi><mi>r</mi></math></p>'
			],
			feedback: {
				correct:
					'The missing component is <math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfrac><msup><mi>x</mi><mn>2</mn></msup><mn>2</mn></mfrac><mo>-</mo><mi>x</mi><mi>cos</mi><mo stretchy="false">(</mo><mi>z</mi><mo stretchy="false">)</mo></mrow></math>.',
				incorrect:
					"Let curl(F) = -[integral]. Given F = 2y i + 2z^2 j + P k, calculate curl(F) and set its components equal to the integrand's components. Solve the resulting partial differential equations for P."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="stokes-theorem-rewrite"')
	})

	test("should correctly compile estimate derivative from table", () => {
		const itemDefinition: AssessmentItem = {
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
					rows: [{ cells: ["x", -9, -8, -6, -3, -2, -1] }, { cells: ["h(x)", -30, -29, -36, -20, -35, -47] }]
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
							content: {
								type: "mathml",
								xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>28</mn></math>'
							}
						},
						{
							identifier: "B",
							content: {
								type: "mathml",
								xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>13.5</mn></math>'
							}
						},
						{
							identifier: "C",
							content: {
								type: "mathml",
								xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>2.125</mn></math>'
							}
						},
						{
							identifier: "D",
							content: { type: "mathml", xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5.33</mn></math>' }
						}
					]
				}
			],
			feedback: {
				correct:
					"The best estimate for h'(-4) is the average rate of change over the narrowest interval available that contains -4, which is [-6, -3]. The average rate of change is (h(-3) - h(-6)) / (-3 - (-6)) = (-20 - (-36)) / 3 = 16/3 ≈ 5.33.",
				incorrect:
					"To estimate the derivative h'(-4), calculate the average rate of change over the smallest interval that contains -4. The closest points are x=-6 and x=-3. The average rate of change is (h(-3) - h(-6)) / (-3 - (-6)) = (-20 - (-36)) / 3 = 16/3 ≈ 5.33."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="estimate-derivative-from-table"')
		expect(compiledXml).toContain("dataTable")
	})

	test("should correctly compile count the apples with discrete object diagrams", () => {
		const itemDefinition: AssessmentItem = {
			identifier: "count-apples-mc-div-version",
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
					prompt: "Which box has 5 apples?",
					choices: [
						{
							identifier: "CHOICE_3",
							content: {
								type: "discreteObjectRatioDiagram",
								width: 250,
								height: 120,
								layout: "grid",
								objects: [
									{ count: 3, icon: "circle", color: "#DC143C" },
									{ count: 0, icon: "square", color: "#228B22" }
								]
							}
						},
						{
							identifier: "CHOICE_4",
							content: {
								type: "discreteObjectRatioDiagram",
								width: 250,
								height: 120,
								layout: "grid",
								objects: [
									{ count: 4, icon: "circle", color: "#DC143C" },
									{ count: 0, icon: "square", color: "#228B22" }
								]
							}
						},
						{
							identifier: "CHOICE_5",
							content: {
								type: "discreteObjectRatioDiagram",
								width: 250,
								height: 120,
								layout: "grid",
								objects: [
									{ count: 5, icon: "circle", color: "#DC143C" },
									{ count: 0, icon: "square", color: "#228B22" }
								]
							}
						},
						{
							identifier: "CHOICE_6",
							content: {
								type: "discreteObjectRatioDiagram",
								width: 250,
								height: 120,
								layout: "grid",
								objects: [
									{ count: 6, icon: "circle", color: "#DC143C" },
									{ count: 0, icon: "square", color: "#228B22" }
								]
							}
						}
					]
				}
			],
			feedback: {
				correct: "Great job! That box has exactly five apples.",
				incorrect: "Try again. Count the apples in each box to find the one with exactly five."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="count-apples-mc-div-version"')
		expect(compiledXml).toContain("discreteObjectRatioDiagram")
	})

	test("should correctly compile bar graph for shapes in a bin", () => {
		const itemDefinition: AssessmentItem = {
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
				"A second grade classroom has a bin of shapes.",
				{
					type: "dataTable",
					columnHeaders: ["Type of shape", "Number of shapes"],
					rows: [
						{ cells: ["Triangles", 8] },
						{ cells: ["Circles", 5] },
						{ cells: ["Rectangles", 3] },
						{ cells: ["Squares", 9] }
					]
				},
				{
					type: "choiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: true,
					minChoices: 1,
					maxChoices: 1,
					prompt: "Which bar graph correctly shows the number of shapes in the bin?",
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
						}
					]
				}
			],
			feedback: {
				correct:
					"The chosen graph perfectly matches the data provided in the table: 8 Triangles, 5 Circles, 3 Rectangles, and 9 Squares.",
				incorrect:
					'Match the number of shapes from the table to the height of the bar for each shape type. For example, the table says there are 8 Triangles, so the "Triangles" bar should reach the line for the number 8 on the vertical axis.'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="shape-bin-barchart-choice"')
		expect(compiledXml).toContain("barChart")
	})

	test("should correctly compile pencil lengths line plot", () => {
		const itemDefinition: AssessmentItem = {
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
					prompt: "Which line plot correctly shows the length of each pencil?",
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
							}
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
							}
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
							}
						}
					]
				}
			],
			feedback: {
				correct:
					"The data set {11, 8, 8, 3} has one pencil of length 3 cm, two pencils of length 8 cm, and one pencil of length 11 cm. The chosen plot correctly displays a dot for each of these measurements.",
				incorrect:
					"To create the line plot, place one dot above the correct number on the line for each pencil measured. The lengths are 3 cm, 8 cm, 8 cm, and 11 cm. This means there should be one dot above 3, two dots above 8, and one dot above 11."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="pencil-length-line-plot-choice"')
		expect(compiledXml).toContain("dotPlot")
	})

	test("should correctly compile reading a bar chart", () => {
		const itemDefinition: AssessmentItem = {
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
				"The Lions, Tigers, and Bears won baseball games last summer.",
				"This bar graph shows how many games each team won.",
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
				"How many games did the Lions win?",
				{
					type: "textEntryInteraction",
					responseIdentifier: "RESPONSE",
					expectedLength: 3
				},
				" games"
			],
			feedback: {
				correct: "The bar for the Lions goes up to the line for 14, so they won 14 games.",
				incorrect:
					"To find the number of games the Lions won, first find the 'Lions' label on the horizontal axis. Then, follow that bar up to the top. The number on the vertical axis that aligns with the top of the bar is the answer. The Lions' bar reaches the line for 14 games."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="games-won-barchart"')
		expect(compiledXml).toContain("barChart")
	})

	test("should correctly compile interpreting a line plot", () => {
		const itemDefinition: AssessmentItem = {
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
				"The heights of Sabrina's dolls are shown below.",
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
				"How many dolls are taller than 22 centimeters?",
				{
					type: "textEntryInteraction",
					responseIdentifier: "RESPONSE",
					expectedLength: 3
				},
				" dolls"
			],
			feedback: {
				correct:
					"There are 3 dolls that are 23 cm tall and 2 dolls that are 24 cm tall. In total, 3 + 2 = 5 dolls are taller than 22 cm.",
				incorrect:
					"To find the number of dolls taller than 22 cm, count all the dots that are to the right of 22 on the line plot. There are 3 dots above 23 and 2 dots above 24. That makes a total of 5 dolls."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="doll-height-line-plot"')
		expect(compiledXml).toContain("dotPlot")
	})

	test("should correctly compile time on number line", () => {
		const itemDefinition: AssessmentItem = {
			identifier: "time-on-number-line-detailed-final",
			title: "What time is shown on the number line?",
			responseDeclarations: [
				{ identifier: "RESPONSE_HR", cardinality: "single", baseType: "integer", correct: 12 },
				{ identifier: "RESPONSE_MIN", cardinality: "single", baseType: "integer", correct: 55, mapping: { "05": 5 } }
			],
			body: [
				"Look at the following number line.",
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
				"What time is shown on the number line?",
				"<p>",
				{ type: "textEntryInteraction", responseIdentifier: "RESPONSE_HR", expectedLength: 2 },
				" : ",
				{ type: "textEntryInteraction", responseIdentifier: "RESPONSE_MIN", expectedLength: 2 },
				"</p>"
			],
			feedback: {
				correct: "The time shown is 12:55.",
				incorrect:
					"The point 'A' is located after the 12:00 mark but before the 1:00 mark, so the hour is 12. The mark for 12:45 is shown. The next medium tick represents 5 minutes later, which is 12:50. The next medium tick represents another 5 minutes, which is 12:55. Point 'A' is on that mark. The time is 12:55."
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="time-on-number-line-detailed-final"')
		expect(compiledXml).toContain("numberLine")
	})

	test("should correctly compile compare 2-digit numbers", () => {
		const itemDefinition: AssessmentItem = {
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
				'Compare using <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&gt;</mo></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&lt;</mo></math>, or <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>=</mo></math>.',
				'<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>83</mn></math>',
				{
					type: "inlineChoiceInteraction",
					responseIdentifier: "RESPONSE",
					shuffle: false,
					choices: [
						{
							identifier: "GT",
							content: { type: "mathml", xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&gt;</mo></math>' }
						},
						{
							identifier: "LT",
							content: { type: "mathml", xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&lt;</mo></math>' }
						},
						{
							identifier: "EQ",
							content: { type: "mathml", xml: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>=</mo></math>' }
						}
					]
				},
				'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>58</mn></math></p>'
			],
			feedback: {
				correct:
					'83 is greater than 58, so the correct symbol is <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&gt;</mo></math>.',
				incorrect:
					'Remember, when comparing two numbers, the symbol <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&gt;</mo></math> points to the smaller number. Since 83 is larger than 58, the correct comparison is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>83</mn><mo>&gt;</mo><mn>58</mn></math>.'
			}
		}

		const compiledXml = compile(itemDefinition)
		expect(compiledXml).toMatchSnapshot()
		expect(compiledXml).toContain('identifier="nice-tmp_x754a72ff9e868e57"')
		expect(compiledXml).toContain("qti-inline-choice-interaction")
	})
})
