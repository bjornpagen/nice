import type { AssessmentItemInput } from "@/lib/qti-generation/schemas"

export const doubleNumberLineRatio: AssessmentItemInput = {
	identifier: "double-number-line-ratio",
	title: "Equivalent Ratios on a Double Number Line",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A",
			mapping: null
		}
	],
	widgets: {
		stimulus_dnl: {
			type: "doubleNumberLine",
			width: 400,
			height: 150,
			topLine: { label: "Distance, kilometers", ticks: [0, "", "", 3, ""] },
			bottomLine: { label: "Elevation, meters", ticks: [0, "", "", 120, ""] }
		},
		choice_a_dnl: {
			type: "doubleNumberLine",
			width: 400,
			height: 150,
			topLine: { label: "Distance, kilometers", ticks: [0, 1, 2, 3, 4] },
			bottomLine: { label: "Elevation, meters", ticks: [0, 40, 80, 120, 160] }
		},
		choice_b_dnl: {
			type: "doubleNumberLine",
			width: 400,
			height: 150,
			topLine: { label: "Distance, kilometers", ticks: [0, 1, 2, 3, 4] },
			bottomLine: { label: "Elevation, meters", ticks: [0, 80, 100, 120, 140] }
		}
	},
	body: '<p>Cory hikes up a hill with a constant slope. The double number line shows that after Cory hikes <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mtext> km</mtext></math>, their elevation is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>120</mn><mtext> m</mtext></math>.</p><slot name="stimulus_dnl" /><slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			prompt: "<p>Select the double number line that shows the other values of distance and elevation.</p>",
			minChoices: 1,
			maxChoices: 1,
			shuffle: true,
			choices: [
				{
					identifier: "A",
					content: '<slot name="choice_a_dnl" />',
					feedback: null
				},
				{
					identifier: "B",
					content: '<slot name="choice_b_dnl" />',
					feedback: null
				}
			]
		}
	},
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Correct!</span> The ratio of distance to elevation is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mo>:</mo><mn>120</mn></math>, which simplifies to a unit rate of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mo>:</mo><mn>40</mn></math>. For every <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mtext> km</mtext></math> hiked, the elevation increases by <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>40</mn><mtext> m</mtext></math>. This matches the correct number line.</p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> First, find the unit rate. If Cory\'s elevation is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>120</mn><mtext> m</mtext></math> after <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mtext> km</mtext></math>, the rate is <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mn>120</mn><mtext> m</mtext></mrow><mrow><mn>3</mn><mtext> km</mtext></mrow></mfrac><mo>=</mo><mn>40</mn></math> meters per kilometer. Use this rate to fill in the other values on the number line.</p>'
	}
}

export const evalFractionalExponents: AssessmentItemInput = {
	identifier: "eval-fractional-exponents",
	title: "Evaluate an expression with negative fractional exponents",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "integer",
			correct: 81,
			mapping: null
		}
	],
	body: '<p>Evaluate.</p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mfrac><msup><mn>2</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><msup><mn>54</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup></mfrac><mo>=</mo></mrow></math><slot name="text_entry" />',
	interactions: {
		text_entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 3
		}
	},
	widgets: null,
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Correct!</span> The answer is 81.</p><p>You successfully applied the rule: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><msup><mi>a</mi><mi>n</mi></msup><msup><mi>b</mi><mi>n</mi></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>)</mo></mrow><mi>n</mi></msup></math></p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> Let me help you solve this step by step.</p><p>First, use the rule: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><msup><mi>a</mi><mi>n</mi></msup><msup><mi>b</mi><mi>n</mi></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>)</mo></mrow><mi>n</mi></msup></math></p><p>So: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><msup><mn>2</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><msup><mn>54</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mn>2</mn><mn>54</mn></mfrac><mo>)</mo></mrow><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mn>1</mn><mn>27</mn></mfrac><mo>)</mo></mrow><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><mo>=</mo><msup><mn>27</mn><mfrac><mn>4</mn><mn>3</mn></mfrac></msup></math></p><p>Then: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mn>27</mn><mfrac><mn>4</mn><mn>3</mn></mfrac></msup><mo>=</mo><msup><mrow><mo>(</mo><mroot><mn>27</mn><mn>3</mroot><mo>)</mo></mrow><mn>4</mn></msup><mo>=</mo><msup><mn>3</mn><mn>4</mn></msup><mo>=</mo><mn>81</mn></math></p>'
	}
}

export const compare3DigitNumbers: AssessmentItemInput = {
	identifier: "compare-3-digit-numbers",
	title: "Compare 3-digit numbers",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "ordered",
			baseType: "identifier",
			correct: ["A", "B", "C"],
			mapping: null
		}
	],
	body: '<slot name="order_interaction" />',
	interactions: {
		order_interaction: {
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
	},
	widgets: null,
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Correct!</span> You have arranged the cards as <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>708</mn><mo>&gt;</mo><mn>79</mn></math>, which is a true comparison.</p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> Make sure the largest number is on the left and the symbol correctly represents the relationship.</p>'
	}
}

export const inequalityNumberLine: AssessmentItemInput = {
	identifier: "inequality-number-line",
	title: "Identify an inequality from a number-line graph",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "C",
			mapping: null
		}
	],
	widgets: {
		inequality_widget: {
			type: "inequalityNumberLine",
			width: 500,
			height: 100,
			min: -5,
			max: 5,
			tickInterval: 1,
			ranges: [
				{
					start: { value: 0, type: "open" },
					end: null,
					color: "#4285F4"
				}
			]
		}
	},
	body: '<slot name="inequality_widget" /><slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: false,
			minChoices: 1,
			maxChoices: 1,
			prompt: "<p>Choose the inequality that represents the graph.</p>",
			choices: [
				{
					identifier: "A",
					content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>&lt;</mo><mn>0</mn></math>',
					feedback: null
				},
				{
					identifier: "B",
					content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>≤</mo><mn>0</mn></math>',
					feedback: null
				},
				{
					identifier: "C",
					content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>&gt;</mo><mn>0</mn></math>',
					feedback: null
				},
				{
					identifier: "D",
					content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>≥</mo><mn>0</mn></math>',
					feedback: null
				}
			]
		}
	},
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Correct!</span> The graph shows an open point at 0 with an arrow to the right, representing all values strictly greater than 0, so the inequality is <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>&gt;</mo><mn>0</mn></math>.</p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> The open point at <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>0</mn></math> means <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>0</mn></math> itself is not included, and the arrow pointing right indicates values greater than <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>0</mn></math>.</p>'
	}
}

export const verticalNumberLineComparison: AssessmentItemInput = {
	identifier: "vertical-number-line-comparison",
	title: "Compare numbers on a vertical number line",
	responseDeclarations: [
		{
			identifier: "RESPONSE_POS",
			cardinality: "single",
			baseType: "identifier",
			correct: "ABOVE",
			mapping: null
		},
		{
			identifier: "RESPONSE_COMP",
			cardinality: "single",
			baseType: "identifier",
			correct: "GT",
			mapping: null
		}
	],
	widgets: {
		vertical_nl: {
			type: "numberLine",
			width: 120,
			height: 350,
			orientation: "vertical",
			min: -8,
			max: 2,
			majorTickInterval: 2,
			minorTicksPerInterval: 1,
			specialTickLabels: null,
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
		}
	},
	body: '<p>Use the number line to compare the numbers.</p><slot name="vertical_nl" /><p>-1.4 is <slot name="pos_choice" /> -6.4, so -1.4 is <slot name="comp_choice" /> -6.4.</p>',
	interactions: {
		pos_choice: {
			type: "inlineChoiceInteraction",
			responseIdentifier: "RESPONSE_POS",
			shuffle: false,
			choices: [
				{ identifier: "ABOVE", content: "above" },
				{ identifier: "BELOW", content: "below" }
			]
		},
		comp_choice: {
			type: "inlineChoiceInteraction",
			responseIdentifier: "RESPONSE_COMP",
			shuffle: false,
			choices: [
				{ identifier: "GT", content: "greater than" },
				{ identifier: "LT", content: "less than" }
			]
		}
	},
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Correct!</span> On a vertical number line, numbers higher up are greater. Since <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is above <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>, it is the greater number.</p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> Look at the positions on the number line. <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is located higher up than <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>. This means <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is above <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>, and therefore <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1.4</mn></math> is greater than <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6.4</mn></math>.</p>'
	}
}

export const twoWayFrequencyTableColdStudy: AssessmentItemInput = {
	identifier: "two-way-frequency-table-cold-study",
	title: "Complete a Two-Way Frequency Table",
	responseDeclarations: [
		{ identifier: "RESP_A", cardinality: "single", baseType: "integer", correct: 23, mapping: null },
		{ identifier: "RESP_B", cardinality: "single", baseType: "integer", correct: 20, mapping: null },
		{ identifier: "RESP_C", cardinality: "single", baseType: "integer", correct: 27, mapping: null },
		{ identifier: "RESP_D", cardinality: "single", baseType: "integer", correct: 30, mapping: null }
	],
	widgets: {
		venn_widget: {
			type: "vennDiagram",
			width: 350,
			height: 262,
			circleA: { label: "Cold Medicine", count: 27, color: null },
			circleB: { label: "Cold longer than 7 days", count: 20, color: null },
			intersectionCount: 23,
			outsideCount: 30
		},
		table_widget: {
			type: "dataTable",
			title: null,
			columns: [
				{ key: "condition", label: "", isNumeric: false },
				{ key: "received", label: "Received cold medicine", isNumeric: false },
				{ key: "notReceived", label: "Did not receive cold medicine", isNumeric: false }
			],
			rowHeaderKey: "condition",
			data: [
				{
					condition: "Cold lasted longer than 7 days",
					received: { type: "input", responseIdentifier: "RESP_A", expectedLength: 3 },
					notReceived: { type: "input", responseIdentifier: "RESP_B", expectedLength: 3 }
				},
				{
					condition: "Cold did <em>not</em> last longer than 7 days",
					received: { type: "input", responseIdentifier: "RESP_C", expectedLength: 3 },
					notReceived: { type: "input", responseIdentifier: "RESP_D", expectedLength: 3 }
				}
			],
			footer: null
		}
	},
	body: '<p>The Cold Be Gone Company conducted a study with <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>100</mn></math> participants. Each participant either <em>received</em> cold medicine or <em>did not receive</em> cold medicine, and the company recorded whether the participant\'s cold lasted <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn></math> days or longer.</p><slot name="venn_widget" /><p>Complete the following two-way frequency table.</p><slot name="table_widget" />',
	interactions: {},
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Correct!</span> The completed table is:</p><table class="qti-bordered"><thead><tr><th scope="col"></th><th scope="col" class="qti-align-center">Received cold medicine</th><th scope="col" class="qti-align-center">Did not receive cold medicine</th></tr></thead><tbody><tr><th scope="row" class="qti-align-left">Cold <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>≥</mo></math> 7 days</th><td class="qti-align-center">23</td><td class="qti-align-center">20</td></tr><tr><th scope="row" class="qti-align-left">Cold <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>&lt;</mo></math> 7 days</th><td class="qti-align-center">27</td><td class="qti-align-center">30</td></tr></tbody></table>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> Use the numbers in the Venn diagram. The overlap (<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>23</mn></math>) belongs in the "Received medicine" & "Cold <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>≥</mo><mn>7</mn></math> days" cell. Then distribute the other counts accordingly.</p>'
	}
}

export const equivalentFractionImages: AssessmentItemInput = {
	identifier: "equivalent-fraction-images",
	title: "Identifying Equivalent Fractions with Images",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "multiple",
			baseType: "identifier",
			correct: ["A", "B"],
			mapping: null
		}
	],
	widgets: {
		stimulus_shape: {
			type: "partitionedShape",
			width: 180,
			height: 88,
			layout: null,
			shapes: [{ type: "rectangle", totalParts: 6, shadedParts: 3, rows: 1, columns: 6, shadeColor: null }]
		},
		choice_a_shape: {
			type: "partitionedShape",
			width: 180,
			height: 88,
			layout: null,
			shapes: [{ type: "rectangle", totalParts: 8, shadedParts: 4, rows: 2, columns: 4, shadeColor: null }]
		},
		choice_b_shape: {
			type: "partitionedShape",
			width: 180,
			height: 88,
			layout: null,
			shapes: [{ type: "rectangle", totalParts: 4, shadedParts: 2, rows: 2, columns: 2, shadeColor: null }]
		},
		choice_c_shape: {
			type: "partitionedShape",
			width: 180,
			height: 88,
			layout: null,
			shapes: [{ type: "rectangle", totalParts: 4, shadedParts: 3, rows: 2, columns: 2, shadeColor: null }]
		}
	},
	body: '<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math> of the following rectangle is shaded.</p><slot name="stimulus_shape" /><slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
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
					content: '<slot name="choice_a_shape" />',
					feedback:
						'<p>Correct! This rectangle has <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> out of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> parts shaded, which equals <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>4</mn><mn>8</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math>.</p>'
				},
				{
					identifier: "B",
					content: '<slot name="choice_b_shape" />',
					feedback:
						'<p>Correct! This rectangle has <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn></math> out of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> parts shaded, which equals <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>2</mn><mn>4</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math>.</p>'
				},
				{
					identifier: "C",
					content: '<slot name="choice_c_shape" />',
					feedback:
						'<p>Not quite. This rectangle has <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> out of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> parts shaded, which equals <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>4</mn></mfrac></math>. Since <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>4</mn></mfrac></math> is not equal to <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math> (which equals <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>), this is incorrect.</p>'
				}
			]
		}
	},
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Excellent!</span> You correctly identified that <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>, and found both rectangles that have exactly half of their area shaded: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>4</mn><mn>8</mn></mfrac></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>2</mn><mn>4</mn></mfrac></math> both equal <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>.</p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> First, simplify <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>6</mn></mfrac></math> to <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>. Then count the shaded parts in each rectangle and check if that fraction equals <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>. Remember: <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>4</mn><mn>8</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>2</mn><mn>4</mn></mfrac></math> = <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>, but <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>4</mn></mfrac></math> ≠ <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>.</p>'
	}
}

export const calculateShadedArea: AssessmentItemInput = {
	identifier: "calculate-shaded-area",
	title: "Calculating Shaded Area of Multiple Shapes",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "multiple",
			baseType: "identifier",
			correct: ["B", "C"],
			mapping: null
		}
	],
	widgets: {
		multi_shape: {
			type: "partitionedShape",
			width: 320,
			height: 103,
			layout: "horizontal",
			shapes: [
				{ type: "circle", totalParts: 4, shadedParts: 1, rows: null, columns: null, shadeColor: null },
				{ type: "circle", totalParts: 4, shadedParts: 1, rows: null, columns: null, shadeColor: null },
				{ type: "circle", totalParts: 4, shadedParts: 1, rows: null, columns: null, shadeColor: null }
			]
		}
	},
	body: '<slot name="multi_shape" /><slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
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
	},
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Excellent!</span> You found both correct ways to calculate the shaded area. Since we have <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> circles with <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac></math> shaded in each, we can either multiply <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math> or add <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math>. Both give us <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>3</mn><mn>4</mn></mfrac></math> as the total shaded area.</p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> Look carefully at the image. There are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> circles, and <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac></math> of each circle is shaded. We can find the total shaded area by either: (1) multiplying <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math>, or (2) adding <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></math>.</p>'
	}
}

export const circleEquationCenterRadius: AssessmentItemInput = {
	identifier: "circle-equation-center-radius",
	title: "Find the center and radius of a circle from its equation",
	responseDeclarations: [
		{ identifier: "RESPONSE_X", cardinality: "single", baseType: "integer", correct: -9, mapping: null },
		{ identifier: "RESPONSE_Y", cardinality: "single", baseType: "integer", correct: -7, mapping: null },
		{ identifier: "RESPONSE_R", cardinality: "single", baseType: "integer", correct: 5, mapping: null }
	],
	body: '<p>A certain circle can be represented by the following equation.</p><math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>+</mo><mn>14</mn><mi>y</mi><mo>+</mo><mn>105</mn><mo>=</mo><mn>0</mn></mrow></math><p>What is the center of this circle? (<slot name="x_entry" />, <slot name="y_entry" />) and radius <slot name="r_entry" />?</p>',
	interactions: {
		x_entry: { type: "textEntryInteraction", responseIdentifier: "RESPONSE_X", expectedLength: 3 },
		y_entry: { type: "textEntryInteraction", responseIdentifier: "RESPONSE_Y", expectedLength: 3 },
		r_entry: { type: "textEntryInteraction", responseIdentifier: "RESPONSE_R", expectedLength: 2 }
	},
	widgets: null,
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Correct!</span> You successfully found that the circle is centered at (<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>9</mn></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>7</mn></math>) with a radius of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math> units.</p><p>You correctly converted the equation to standard form: <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>(</mo><mi>x</mi><mo>+</mo><mn>9</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup><mo>+</mo><mo>(</mo><mi>y</mi><mo>+</mo><mn>7</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup><mo>=</mo><mn>25</mn></math></p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> Let\'s complete the square to find the center and radius.</p><p>Starting with: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>+</mo><mn>14</mn><mi>y</mi><mo>+</mo><mn>105</mn><mo>=</mo><mn>0</mn></math></p><ul><li>Group the x-terms and y-terms: <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>(</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>)</mo><mo>+</mo><mo>(</mo><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>14</mn><mi>y</mi><mo>)</mo><mo>=</mo><mo>-</mo><mn>105</mn></math></li><li>Complete the square for x: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>+</mo><mn>81</mn><mo>=</mo><mo>(</mo><mi>x</mi><mo>+</mo><mn>9</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup></math></li><li>Complete the square for y: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>14</mn><mi>y</mi><mo>+</mo><mn>49</mn><mo>=</mo><mo>(</mo><mi>y</mi><mo>+</mo><mn>7</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup></math></li><li>Don\'t forget to add <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>81</mn></math> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>49</mn></math> to both sides!</li><li>Final form: <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>(</mo><mi>x</mi><mo>+</mo><mn>9</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup><mo>+</mo><mo>(</mo><mi>y</mi><mo>+</mo><mn>7</mn><mo>)</mo><msup><mrow></mrow><mn>2</mn></msup><mo>=</mo><mn>25</mn></math></li></ul><p>Therefore: center = (<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>9</mn></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>7</mn></math>) and radius = <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math></p>'
	}
}

export const harukaExamScore: AssessmentItemInput = {
	identifier: "haruka-exam-score",
	title: "Find a missing data point given the mean",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "integer",
			correct: 87,
			mapping: null
		}
	],
	body: '<p>Haruka took <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math> exams in a marking period. On the first <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math> exams, they received scores of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>79</mn></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>81</mn></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>91</mn></math>, and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>77</mn></math>.</p><p>What score would Haruka need on the fifth exam to have an overall average of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>83</mn></math>?</p><p><slot name="text_entry" /></p>',
	interactions: {
		text_entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 3
		}
	},
	widgets: null,
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Correct!</span> Haruka needs to score <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>87</mn></math> on the fifth exam.</p><p>When you multiply the average by the number of values, you get the total: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>83</mn><mo>×</mo><mn>5</mn><mo>=</mo><mn>415</mn></math>. The sum of the first four scores is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>328</mn></math>, so the fifth score must be <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>415</mn><mo>-</mo><mn>328</mn><mo>=</mo><mn>87</mn></math>.</p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> Let me help you work through this step by step.</p><p>To find the missing score, use the formula for mean (average):</p><math xmlns="http://www.w3.org/1998/Math/MathML" class="qti-block-math"><mtext>mean</mtext><mo>=</mo><mfrac><mtext>sum of all values</mtext><mtext>number of values</mtext></mfrac></math><p>Given information:</p><ul><li>Mean (average) = <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>83</mn></math></li><li>Number of exams = <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math></li><li>First four scores: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>79</mn></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>81</mn></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>91</mn></math>, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>77</mn></math></li></ul><p>Step 1: Find the sum of all <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math> scores using the mean formula:</p><math xmlns="http://www.w3.org/1998/Math/MathML" class="qti-block-math"><mn>83</mn><mo>=</mo><mfrac><mtext>sum of all 5 scores</mtext><mn>5</mn></mfrac></math><p>Multiply both sides by <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math>:</p><math xmlns="http://www.w3.org/1998/Math/MathML" class="qti-block-math"><mn>83</mn><mo>×</mo><mn>5</mn><mo>=</mo><mn>415</mn></math><p>Step 2: Find the sum of the first four scores:</p><math xmlns="http://www.w3.org/1998/Math/MathML" class="qti-block-math"><mn>79</mn><mo>+</mo><mn>81</mn><mo>+</mo><mn>91</mn><mo>+</mo><mn>77</mn><mo>=</mo><mn>328</mn></math><p>Step 3: Find the fifth score:</p><math xmlns="http://www.w3.org/1998/Math/MathML" class="qti-block-math"><mtext>Fifth score</mtext><mo>=</mo><mn>415</mn><mo>-</mo><mn>328</mn><mo>=</mo><mn>87</mn></math><p>Therefore, Haruka needs to score <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>87</mn></math> on the fifth exam.</p>'
	}
}

export const continuityDifferentiabilityPiecewise: AssessmentItemInput = {
	identifier: "continuity-differentiability-piecewise",
	title: "Continuity and differentiability of a piecewise function",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "C",
			mapping: null
		}
	],
	body: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>f</mi><mo stretchy="false">(</mo><mi>x</mi><mo stretchy="false">)</mo><mo>=</mo><mrow><mo>{</mo><mtable><mtr><mtd columnalign="left"><mrow><mo>-</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>3</mn></mrow></mtd><mtd columnalign="left"><mrow><mo>,</mo><mi>x</mi><mo>≤</mo><mn>2</mn></mrow></mtd></mtr><mtr><mtd columnalign="left"><mrow><msup><mrow><mo stretchy="false">(</mo><mi>x</mi><mo>-</mo><mn>4</mn><mo stretchy="false">)</mo></mrow><mn>2</mn></msup><mo>-</mo><mn>5</mn></mrow></mtd><mtd columnalign="left"><mrow><mo>,</mo><mi>x</mi><mo>&gt;</mo><mn>2</mn></mrow></mtd></mtr></mtable></mrow></mrow></math><slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt:
				'<p>Is the function given below continuous/differentiable at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>?</p>',
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
					feedback: "<p>This is impossible! A function must be continuous at a point to be differentiable there.</p>"
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
	},
	widgets: null,
	feedback: {
		correct:
			'<p><strong>Correct!</strong> The function is both continuous and differentiable at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>.</p><p>For continuity: <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo>(</mo><mn>2</mn><mo>)</mo><mo>=</mo><mo>-</mo><mn>4</mn><mo>+</mo><mn>3</mn><mo>=</mo><mo>-</mo><mn>1</mn></math>, and both one-sided limits equal <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1</mn></math>.</p><p>For differentiability: The left derivative is <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>2</mn><mi>x</mi><msub><mo>|</mo><mrow><mi>x</mi><mo>=</mo><mn>2</mn></mrow></msub><mo>=</mo><mo>-</mo><mn>4</mn></math>, and the right derivative is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn><mo>(</mo><mi>x</mi><mo>-</mo><mn>4</mn><mo>)</mo><msub><mo>|</mo><mrow><mi>x</mi><mo>=</mo><mn>2</mn></mrow></msub><mo>=</mo><mo>-</mo><mn>4</mn></math>. Since they match, <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>f</mi><mo>\'</mo><mo>(</mo><mn>2</mn><mo>)</mo><mo>=</mo><mo>-</mo><mn>4</mn></math>.</p>',
		incorrect:
			'<p><strong>Not quite.</strong> Let\'s check both continuity and differentiability at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>.</p><p>For continuity, we need to check if the left and right limits equal the function value at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math>.</p><p>For differentiability, we need to check if the left and right derivatives at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mn>2</mn></math> are equal.</p>'
	}
}

export const derivativeFromTable: AssessmentItemInput = {
	identifier: "derivative-from-table",
	title: "Estimating derivative value from a table",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "D",
			mapping: null
		}
	],
	widgets: {
		h_table: {
			type: "dataTable",
			title: null,
			columns: [
				{ key: "x", label: "<i>x</i>", isNumeric: true },
				{ key: "h_x", label: "<i>h</i>(<i>x</i>)", isNumeric: true }
			],
			rowHeaderKey: null,
			data: [
				{ x: "-9", h_x: "-55" },
				{ x: "-5", h_x: "-36" },
				{ x: "-3", h_x: "-20" },
				{ x: "-1", h_x: "-8" },
				{ x: "0", h_x: "-3" },
				{ x: "1", h_x: "0" },
				{ x: "3", h_x: "3" },
				{ x: "5", h_x: "0" }
			],
			footer: null
		}
	},
	body: 'This table gives select values of the differentiable function <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>h</mi></math>.<slot name="h_table" /><slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
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
					content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5.6</mn></math>',
					feedback:
						'Did you find <math xmlns="http://www.w3.org/1998/Math/MathML"><mfrac><mrow><mi>h</mi><mo>(</mo><mo>-</mo><mn>5</mn><mo>)</mo><mo>-</mo><mi>h</mi><mo>(</mo><mo>-</mo><mn>9</mn><mo>)</mo></mrow><mrow><mo>-</mo><mn>5</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>9</mn><mo>)</mo></mrow></mfrac><mo>=</mo><mfrac><mrow><mo>-</mo><mn>36</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>55</mn><mo>)</mo></mrow><mn>4</mn></mfrac><mo>=</mo><mfrac><mn>19</mn><mn>4</mn></mfrac><mo>=</mo><mn>4.75</mn></math>? This is the slope of the secant line over <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>[</mo><mo>-</mo><mn>9</mn><mo>,</mo><mo>-</mo><mn>5</mn><mo>]</mo></math>. To better estimate <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>h</mi><mo>\'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></math>, use an interval containing <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn></math>.'
				},
				{
					identifier: "D",
					content: '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math>',
					feedback:
						'<p>Correct! The average rate of change over the interval <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>[</mo><mo>-</mo><mn>5</mn><mo>,</mo><mo>-</mo><mn>3</mn><mo>]</mo></math> is:</p><math xmlns="http://www.w3.org/1998/Math/MathML" class="qti-block-math"><mfrac><mrow><mi>h</mi><mo>(</mo><mo>-</mo><mn>3</mn><mo>)</mo><mo>-</mo><mi>h</mi><mo>(</mo><mo>-</mo><mn>5</mn><mo>)</mo></mrow><mrow><mo>-</mo><mn>3</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>5</mn><mo>)</mo></mrow></mfrac><mo>=</mo><mfrac><mrow><mo>-</mo><mn>20</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>36</mn><mo>)</mo></mrow><mn>2</mn></mfrac><mo>=</mo><mn>8</mn></math><p>Since <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn></math> is in the middle of this interval, this is our best estimate for <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>h</mi><mo>\'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></math>.</p>'
				}
			]
		}
	},
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Correct!</span> The average rate of change over the interval <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>[</mo><mo>-</mo><mn>5</mn><mo>,</mo><mo>-</mo><mn>3</mn><mo>]</mo></math> is:</p><math xmlns="http://www.w3.org/1998/Math/MathML" class="qti-block-math"><mfrac><mrow><mi>h</mi><mo>(</mo><mo>-</mo><mn>3</mn><mo>)</mo><mo>-</mo><mi>h</mi><mo>(</mo><mo>-</mo><mn>5</mn><mo>)</mo></mrow><mrow><mo>-</mo><mn>3</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>5</mn><mo>)</mo></mrow></mfrac><mo>=</mo><mfrac><mrow><mo>-</mo><mn>20</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>36</mn><mo>)</mo></mrow><mn>2</mn></mfrac><mo>=</mo><mn>8</mn></math><p>This is the best estimate for <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>h</mi><mo>\'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></math> because <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn></math> is right in the middle of the interval <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>[</mo><mo>-</mo><mn>5</mn><mo>,</mo><mo>-</mo><mn>3</mn><mo>]</mo></math>.</p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> To estimate <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>h</mi><mo>\'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></math>, find the average rate of change over an interval containing <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn></math>.</p><p>The interval <math xmlns="http://www.w3.org/1998/Math/MathML"><mo>[</mo><mo>-</mo><mn>5</mn><mo>,</mo><mo>-</mo><mn>3</mn><mo>]</mo></math> contains <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn></math>. Calculate:</p><math xmlns="http://www.w3.org/1998/Math/MathML" class="qti-block-math"><mfrac><mrow><mi>h</mi><mo>(</mo><mo>-</mo><mn>3</mn><mo>)</mo><mo>-</mo><mi>h</mi><mo>(</mo><mo>-</mo><mn>5</mn><mo>)</mo></mrow><mrow><mo>-</mo><mn>3</mn><mo>-</mo><mo>(</mo><mo>-</mo><mn>5</mn><mo>)</mo></mrow></mfrac></math><p>This gives you the best estimate for the derivative at <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn></math>.</p>'
	}
}

export const pencilLengthLinePlotChoice: AssessmentItemInput = {
	identifier: "pencil-length-line-plot-choice",
	title: "Pencil Lengths Line Plot",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A",
			mapping: null
		}
	],
	widgets: {
		plot_a: {
			type: "dotPlot",
			width: 500,
			height: 150,
			title: null,
			minValue: 0,
			maxValue: 14,
			majorTickInterval: 1,
			minorTicksPerInterval: 0,
			axisLabel: "Length, cm",
			dataPoints: [
				{ value: 3, frequency: 1 },
				{ value: 8, frequency: 2 },
				{ value: 11, frequency: 1 }
			],
			dotSize: 10,
			dotColor: "#1865F2"
		},
		plot_b: {
			type: "dotPlot",
			width: 500,
			height: 150,
			title: null,
			minValue: 0,
			maxValue: 14,
			majorTickInterval: 1,
			minorTicksPerInterval: 0,
			axisLabel: "Length, cm",
			dataPoints: [
				{ value: 3, frequency: 1 },
				{ value: 8, frequency: 1 },
				{ value: 11, frequency: 1 }
			],
			dotSize: 10,
			dotColor: "#1865F2"
		},
		plot_c: {
			type: "dotPlot",
			width: 500,
			height: 150,
			title: null,
			minValue: 0,
			maxValue: 14,
			majorTickInterval: 1,
			minorTicksPerInterval: 0,
			axisLabel: "Length, cm",
			dataPoints: [{ value: 4, frequency: 4 }],
			dotSize: 10,
			dotColor: "#1865F2"
		},
		plot_d: {
			type: "dotPlot",
			width: 500,
			height: 150,
			title: null,
			minValue: 0,
			maxValue: 14,
			majorTickInterval: 1,
			minorTicksPerInterval: 0,
			axisLabel: "Length, cm",
			dataPoints: [
				{ value: 4, frequency: 1 },
				{ value: 9, frequency: 1 },
				{ value: 12, frequency: 1 }
			],
			dotSize: 10,
			dotColor: "#1865F2"
		}
	},
	body: 'The lengths of 4 pencils were measured. The lengths are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>11</mn></math> cm, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> cm, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> cm, and <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> cm.<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "<p>Which line plot correctly shows the length of each pencil?</p>",
			choices: [
				{
					identifier: "A",
					content: '<slot name="plot_a" />',
					feedback:
						"<p>This plot correctly shows a dot for each of the 4 pencils at its measured length. There is one dot at 3, two dots at 8, and one dot at 11.</p>"
				},
				{
					identifier: "B",
					content: '<slot name="plot_b" />',
					feedback:
						'<p>This plot only shows one dot for the length of <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> cm. Remember, there were two pencils with this length, so there should be two dots above the number <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math>.</p>'
				},
				{
					identifier: "C",
					content: '<slot name="plot_c" />',
					feedback:
						'<p>This plot shows four dots above the number <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math>. This represents the total number of pencils, not their individual lengths.</p>'
				},
				{
					identifier: "D",
					content: '<slot name="plot_d" />',
					feedback:
						"<p>This plot shows lengths of 4 cm, 9 cm, and 12 cm. Check the data again carefully to make sure the dots are placed above the correct numbers on the line plot.</p>"
				}
			]
		}
	},
	feedback: {
		correct:
			'<p><span class="qti-keyword-emphasis">Correct!</span> You found the line plot that correctly represents the data. There is one pencil that is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math> cm long, two pencils that are <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math> cm long, and one pencil that is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>11</mn></math> cm long.</p>',
		incorrect:
			'<p><span class="qti-keyword-emphasis">Not quite.</span> Remember, each dot represents one pencil. If two pencils have the same length, you need two dots above that number.</p>'
	}
}

// Export all examples as an array
export const allExamples: AssessmentItemInput[] = [
	doubleNumberLineRatio,
	evalFractionalExponents,
	compare3DigitNumbers,
	inequalityNumberLine,
	verticalNumberLineComparison,
	twoWayFrequencyTableColdStudy,
	equivalentFractionImages,
	calculateShadedArea,
	circleEquationCenterRadius,
	harukaExamScore,
	continuityDifferentiabilityPiecewise,
	derivativeFromTable,
	pencilLengthLinePlotChoice
]
