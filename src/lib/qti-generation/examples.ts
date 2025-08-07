import type { AssessmentItemInput } from "./schemas"

export const doubleNumberLineRatio: AssessmentItemInput = {
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
	body: [
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					content: "Cory hikes up a hill with a constant slope. The double number line shows that after Cory hikes "
				},
				{ type: "math", mathml: "<mn>3</mn><mtext> km</mtext>" },
				{ type: "text", content: ", their elevation is " },
				{ type: "math", mathml: "<mn>120</mn><mtext> m</mtext>" },
				{ type: "text", content: "." }
			]
		},
		{ type: "blockSlot", slotId: "stimulus_dnl" },
		{ type: "blockSlot", slotId: "choice_interaction" }
	],
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			prompt: [
				{
					type: "text",
					content: "Select the double number line that shows the other values of distance and elevation."
				}
			],
			minChoices: 1,
			maxChoices: 1,
			shuffle: true,
			choices: [
				{
					identifier: "A",
					content: [{ type: "blockSlot", slotId: "choice_a_dnl" }],
					feedback: null
				},
				{
					identifier: "B",
					content: [{ type: "blockSlot", slotId: "choice_b_dnl" }],
					feedback: null
				}
			]
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! The ratio of distance to elevation is " },
					{ type: "math", mathml: "<mn>3</mn><mo>:</mo><mn>120</mn>" },
					{ type: "text", content: ", which simplifies to a unit rate of " },
					{ type: "math", mathml: "<mn>1</mn><mo>:</mo><mn>40</mn>" },
					{ type: "text", content: ". For every " },
					{ type: "math", mathml: "<mn>1</mn><mtext> km</mtext>" },
					{ type: "text", content: " hiked, the elevation increases by " },
					{ type: "math", mathml: "<mn>40</mn><mtext> m</mtext>" },
					{ type: "text", content: ". This matches the correct number line." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Not quite. First, find the unit rate. If Cory's elevation is " },
					{ type: "math", mathml: "<mn>120</mn><mtext> m</mtext>" },
					{ type: "text", content: " after " },
					{ type: "math", mathml: "<mn>3</mn><mtext> km</mtext>" },
					{ type: "text", content: ", the rate is " },
					{
						type: "math",
						mathml:
							"<mfrac><mrow><mn>120</mn><mtext> m</mtext></mrow><mrow><mn>3</mn><mtext> km</mtext></mrow></mfrac><mo>=</mo><mn>40</mn>"
					},
					{
						type: "text",
						content: " meters per kilometer. Use this rate to fill in the other values on the number line."
					}
				]
			}
		]
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
			correct: 81
		}
	],
	body: [
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "Evaluate." },
				{
					type: "math",
					mathml:
						"<mrow><mfrac><msup><mn>2</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><msup><mn>54</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup></mfrac><mo>=</mo></mrow>"
				},
				{ type: "text", content: " " },
				{ type: "inlineSlot", slotId: "text_entry" }
			]
		}
	],
	interactions: {
		text_entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 3
		}
	},
	widgets: null,
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! The answer is " },
					{ type: "math", mathml: "<mn>81</mn>" },
					{ type: "text", content: "." }
				]
			},
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "You successfully applied the rule: " },
					{
						type: "math",
						mathml:
							"<mfrac><msup><mi>a</mi><mi>n</mi></msup><msup><mi>b</mi><mi>n</mi></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>)</mo></mrow><mi>n</mi></msup>"
					}
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [{ type: "text", content: "Not quite. Let me help you solve this step by step." }]
			},
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "First, use the rule: " },
					{
						type: "math",
						mathml:
							"<mfrac><msup><mi>a</mi><mi>n</mi></msup><msup><mi>b</mi><mi>n</mi></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>)</mo></mrow><mi>n</mi></msup>"
					}
				]
			},
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "So: " },
					{
						type: "math",
						mathml:
							"<mfrac><msup><mn>2</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><msup><mn>54</mn><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup></mfrac><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mn>2</mn><mn>54</mn></mfrac><mo>)</mo></mrow><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><mo>=</mo><msup><mrow><mo>(</mo><mfrac><mn>1</mn><mn>27</mn></mfrac><mo>)</mo></mrow><mrow><mo>-</mo><mfrac><mn>4</mn><mn>3</mn></mfrac></mrow></msup><mo>=</mo><msup><mn>27</mn><mfrac><mn>4</mn><mn>3</mn></mfrac></msup>"
					}
				]
			},
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Then: " },
					{
						type: "math",
						mathml:
							"<msup><mn>27</mn><mfrac><mn>4</mn><mn>3</mn></mfrac></msup><mo>=</mo><msup><mrow><mo>(</mo><mroot><mn>27</mn><mn>3</mn></mroot><mo>)</mo></mrow><mn>4</mn></msup><mo>=</mo><msup><mn>3</mn><mn>4</mn></msup><mo>=</mo><mn>81</mn>"
					}
				]
			}
		]
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
			correct: ["A", "B", "C"]
		}
	],
	body: [{ type: "blockSlot", slotId: "order_interaction" }],
	interactions: {
		order_interaction: {
			type: "orderInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			orientation: "horizontal",
			prompt: [{ type: "text", content: "Arrange the cards to make a true comparison." }],
			choices: [
				{
					identifier: "A",
					content: [
						{
							type: "paragraph",
							content: [{ type: "math", mathml: "<mn>708</mn>" }]
						}
					],
					feedback: [
						{ type: "text", content: "Correct! " },
						{ type: "math", mathml: "<mn>708</mn><mo>&gt;</mo><mn>79</mn>" },
						{ type: "text", content: "." }
					]
				},
				{
					identifier: "B",
					content: [
						{
							type: "paragraph",
							content: [{ type: "math", mathml: "<mo>&gt;</mo>" }]
						}
					],
					feedback: [
						{ type: "text", content: "That symbol belongs between " },
						{ type: "math", mathml: "<mn>708</mn>" },
						{ type: "text", content: " and " },
						{ type: "math", mathml: "<mn>79</mn>" },
						{ type: "text", content: " to make a true statement." }
					]
				},
				{
					identifier: "C",
					content: [
						{
							type: "paragraph",
							content: [{ type: "math", mathml: "<mn>79</mn>" }]
						}
					],
					feedback: [
						{ type: "math", mathml: "<mn>79</mn>" },
						{ type: "text", content: " is the smaller number on the right." }
					]
				}
			]
		}
	},
	widgets: null,
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! You have arranged the cards as " },
					{ type: "math", mathml: "<mn>708</mn><mo>&gt;</mo><mn>79</mn>" },
					{ type: "text", content: ", which is a true comparison." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"Not quite. Make sure the largest number is on the left and the symbol correctly represents the relationship."
					}
				]
			}
		]
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
			correct: "C"
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
	body: [
		{ type: "blockSlot", slotId: "inequality_widget" },
		{ type: "blockSlot", slotId: "choice_interaction" }
	],
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: [{ type: "text", content: "Choose the inequality that represents the graph." }],
			choices: [
				{
					identifier: "A",
					content: [
						{
							type: "paragraph",
							content: [{ type: "math", mathml: "<mi>x</mi><mo>&lt;</mo><mn>0</mn>" }]
						}
					],
					feedback: null
				},
				{
					identifier: "B",
					content: [
						{
							type: "paragraph",
							content: [{ type: "math", mathml: "<mi>x</mi><mo>≤</mo><mn>0</mn>" }]
						}
					],
					feedback: null
				},
				{
					identifier: "C",
					content: [
						{
							type: "paragraph",
							content: [{ type: "math", mathml: "<mi>x</mi><mo>&gt;</mo><mn>0</mn>" }]
						}
					],
					feedback: null
				},
				{
					identifier: "D",
					content: [
						{
							type: "paragraph",
							content: [{ type: "math", mathml: "<mi>x</mi><mo>≥</mo><mn>0</mn>" }]
						}
					],
					feedback: null
				}
			]
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content: "Correct! The graph shows an open point at "
					},
					{ type: "math", mathml: "<mn>0</mn>" },
					{ type: "text", content: " with an arrow to the right, representing all values strictly greater than " },
					{ type: "math", mathml: "<mn>0</mn>" },
					{ type: "text", content: ", so the inequality is " },
					{ type: "math", mathml: "<mi>x</mi><mo>&gt;</mo><mn>0</mn>" },
					{ type: "text", content: "." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Not quite. The open point at " },
					{ type: "math", mathml: "<mn>0</mn>" },
					{ type: "text", content: " means " },
					{ type: "math", mathml: "<mn>0</mn>" },
					{
						type: "text",
						content: " itself is not included, and the arrow pointing right indicates values greater than "
					},
					{ type: "math", mathml: "<mn>0</mn>" },
					{ type: "text", content: "." }
				]
			}
		]
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
			correct: "ABOVE"
		},
		{
			identifier: "RESPONSE_COMP",
			cardinality: "single",
			baseType: "identifier",
			correct: "GT"
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
	body: [
		{
			type: "paragraph",
			content: [{ type: "text", content: "Use the number line to compare the numbers." }]
		},
		{ type: "blockSlot", slotId: "vertical_nl" },
		{
			type: "paragraph",
			content: [
				{ type: "math", mathml: "<mo>-</mo><mn>1.4</mn>" },
				{ type: "text", content: " is " },
				{ type: "inlineSlot", slotId: "pos_choice" },
				{ type: "text", content: " " },
				{ type: "math", mathml: "<mo>-</mo><mn>6.4</mn>" },
				{ type: "text", content: ", so " },
				{ type: "math", mathml: "<mo>-</mo><mn>1.4</mn>" },
				{ type: "text", content: " is " },
				{ type: "inlineSlot", slotId: "comp_choice" },
				{ type: "text", content: " " },
				{ type: "math", mathml: "<mo>-</mo><mn>6.4</mn>" },
				{ type: "text", content: "." }
			]
		}
	],
	interactions: {
		pos_choice: {
			type: "inlineChoiceInteraction",
			responseIdentifier: "RESPONSE_POS",
			shuffle: true,
			choices: [
				{
					identifier: "ABOVE",
					content: [{ type: "text", content: "above" }]
				},
				{
					identifier: "BELOW",
					content: [{ type: "text", content: "below" }]
				}
			]
		},
		comp_choice: {
			type: "inlineChoiceInteraction",
			responseIdentifier: "RESPONSE_COMP",
			shuffle: true,
			choices: [
				{
					identifier: "GT",
					content: [{ type: "text", content: "greater than" }]
				},
				{
					identifier: "LT",
					content: [{ type: "text", content: "less than" }]
				}
			]
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! On a vertical number line, numbers higher up are greater. Since " },
					{ type: "math", mathml: "<mo>-</mo><mn>1.4</mn>" },
					{ type: "text", content: " is above " },
					{ type: "math", mathml: "<mo>-</mo><mn>6.4</mn>" },
					{ type: "text", content: ", it is the greater number." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Not quite. Look at the positions on the number line. " },
					{ type: "math", mathml: "<mo>-</mo><mn>1.4</mn>" },
					{ type: "text", content: " is located higher up than " },
					{ type: "math", mathml: "<mo>-</mo><mn>6.4</mn>" },
					{ type: "text", content: ". This means " },
					{ type: "math", mathml: "<mo>-</mo><mn>1.4</mn>" },
					{ type: "text", content: " is above " },
					{ type: "math", mathml: "<mo>-</mo><mn>6.4</mn>" },
					{ type: "text", content: ", and therefore " },
					{ type: "math", mathml: "<mo>-</mo><mn>1.4</mn>" },
					{ type: "text", content: " is greater than " },
					{ type: "math", mathml: "<mo>-</mo><mn>6.4</mn>" },
					{ type: "text", content: "." }
				]
			}
		]
	}
}

export const twoWayFrequencyTable: AssessmentItemInput = {
	identifier: "two-way-frequency-table-cold-study",
	title: "Complete a Two-Way Frequency Table",
	responseDeclarations: [
		{ identifier: "RESP_A", cardinality: "single", baseType: "integer", correct: 23 },
		{ identifier: "RESP_B", cardinality: "single", baseType: "integer", correct: 20 },
		{ identifier: "RESP_C", cardinality: "single", baseType: "integer", correct: 27 },
		{ identifier: "RESP_D", cardinality: "single", baseType: "integer", correct: 30 }
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
				[
					"Cold lasted longer than 7 days",
					{ type: "input", responseIdentifier: "RESP_A", expectedLength: 3 },
					{ type: "input", responseIdentifier: "RESP_B", expectedLength: 3 }
				],
				[
					"Cold did <em>not</em> last longer than 7 days",
					{ type: "input", responseIdentifier: "RESP_C", expectedLength: 3 },
					{ type: "input", responseIdentifier: "RESP_D", expectedLength: 3 }
				]
			],
			footer: null
		}
	},
	body: [
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "The Cold Be Gone Company conducted a study with " },
				{ type: "math", mathml: "<mn>100</mn>" },
				{
					type: "text",
					content:
						" participants. Each participant either received cold medicine or did not receive cold medicine, and the company recorded whether the participant's cold lasted "
				},
				{ type: "math", mathml: "<mn>7</mn>" },
				{ type: "text", content: " days or longer." }
			]
		},
		{ type: "blockSlot", slotId: "venn_widget" },
		{
			type: "paragraph",
			content: [{ type: "text", content: "Complete the following two-way frequency table." }]
		},
		{ type: "blockSlot", slotId: "table_widget" }
	],
	interactions: {},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [{ type: "text", content: "Correct! The completed table is:" }]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Not quite. Use the numbers in the Venn diagram. The overlap (" },
					{ type: "math", mathml: "<mn>23</mn>" },
					{ type: "text", content: ') belongs in the "Received medicine" & "Cold ' },
					{ type: "math", mathml: "<mo>≥</mo><mn>7</mn>" },
					{ type: "text", content: ' days" cell. Then distribute the other counts accordingly.' }
				]
			}
		]
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
			correct: ["A", "B"]
		}
	],
	widgets: {
		stimulus_shape: {
			type: "partitionedShape",
			mode: "partition",
			width: 180,
			height: 88,
			layout: null,
			overlays: null,
			shapes: [
				{
					type: "rectangle",
					totalParts: 6,
					shadedCells: [0, 1, 2],
					hatchedCells: [],
					rows: 1,
					columns: 6,
					shadeColor: null,
					shadeOpacity: 0.5
				}
			]
		},
		choice_a_shape: {
			type: "partitionedShape",
			mode: "partition",
			width: 180,
			height: 88,
			layout: null,
			overlays: null,
			shapes: [
				{
					type: "rectangle",
					totalParts: 8,
					shadedCells: [0, 1, 2, 3],
					hatchedCells: [],
					rows: 2,
					columns: 4,
					shadeColor: null,
					shadeOpacity: 0.5
				}
			]
		},
		choice_b_shape: {
			type: "partitionedShape",
			mode: "partition",
			width: 180,
			height: 88,
			layout: null,
			overlays: null,
			shapes: [
				{
					type: "rectangle",
					totalParts: 4,
					shadedCells: [0, 1],
					hatchedCells: [],
					rows: 2,
					columns: 2,
					shadeColor: null,
					shadeOpacity: 0.5
				}
			]
		},
		choice_c_shape: {
			type: "partitionedShape",
			mode: "partition",
			width: 180,
			height: 88,
			layout: null,
			overlays: null,
			shapes: [
				{
					type: "rectangle",
					totalParts: 4,
					shadedCells: [0, 1, 2],
					hatchedCells: [],
					rows: 2,
					columns: 2,
					shadeColor: null,
					shadeOpacity: 0.5
				}
			]
		}
	},
	body: [
		{
			type: "paragraph",
			content: [
				{ type: "math", mathml: "<mfrac><mn>3</mn><mn>6</mn></mfrac>" },
				{ type: "text", content: " of the following rectangle is shaded." }
			]
		},
		{ type: "blockSlot", slotId: "stimulus_shape" },
		{ type: "blockSlot", slotId: "choice_interaction" }
	],
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 0,
			maxChoices: 3,
			prompt: [
				{ type: "text", content: "Which of the following rectangles have exactly " },
				{ type: "math", mathml: "<mfrac><mn>3</mn><mn>6</mn></mfrac>" },
				{ type: "text", content: " of their area shaded?" }
			],
			choices: [
				{
					identifier: "A",
					content: [{ type: "blockSlot", slotId: "choice_a_shape" }],
					feedback: [
						{ type: "text", content: "Correct! This rectangle has " },
						{ type: "math", mathml: "<mn>4</mn>" },
						{ type: "text", content: " out of " },
						{ type: "math", mathml: "<mn>8</mn>" },
						{ type: "text", content: " parts shaded, which equals " },
						{ type: "math", mathml: "<mfrac><mn>4</mn><mn>8</mn></mfrac>" },
						{ type: "text", content: " = " },
						{ type: "math", mathml: "<mfrac><mn>1</mn><mn>2</mn></mfrac>" },
						{ type: "text", content: " = " },
						{ type: "math", mathml: "<mfrac><mn>3</mn><mn>6</mn></mfrac>" },
						{ type: "text", content: "." }
					]
				},
				{
					identifier: "B",
					content: [{ type: "blockSlot", slotId: "choice_b_shape" }],
					feedback: [
						{ type: "text", content: "Correct! This rectangle has " },
						{ type: "math", mathml: "<mn>2</mn>" },
						{ type: "text", content: " out of " },
						{ type: "math", mathml: "<mn>4</mn>" },
						{ type: "text", content: " parts shaded, which equals " },
						{ type: "math", mathml: "<mfrac><mn>2</mn><mn>4</mn></mfrac>" },
						{ type: "text", content: " = " },
						{ type: "math", mathml: "<mfrac><mn>1</mn><mn>2</mn></mfrac>" },
						{ type: "text", content: " = " },
						{ type: "math", mathml: "<mfrac><mn>3</mn><mn>6</mn></mfrac>" },
						{ type: "text", content: "." }
					]
				},
				{
					identifier: "C",
					content: [{ type: "blockSlot", slotId: "choice_c_shape" }],
					feedback: [
						{ type: "text", content: "Not quite. This rectangle has " },
						{ type: "math", mathml: "<mn>3</mn>" },
						{ type: "text", content: " out of " },
						{ type: "math", mathml: "<mn>4</mn>" },
						{ type: "text", content: " parts shaded, which equals " },
						{ type: "math", mathml: "<mfrac><mn>3</mn><mn>4</mn></mfrac>" },
						{ type: "text", content: ". Since " },
						{ type: "math", mathml: "<mfrac><mn>3</mn><mn>4</mn></mfrac>" },
						{ type: "text", content: " is not equal to " },
						{ type: "math", mathml: "<mfrac><mn>3</mn><mn>6</mn></mfrac>" },
						{ type: "text", content: " (which equals " },
						{ type: "math", mathml: "<mfrac><mn>1</mn><mn>2</mn></mfrac>" },
						{ type: "text", content: "), this is incorrect." }
					]
				}
			]
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Excellent! You correctly identified that " },
					{ type: "math", mathml: "<mfrac><mn>3</mn><mn>6</mn></mfrac>" },
					{ type: "text", content: " = " },
					{ type: "math", mathml: "<mfrac><mn>1</mn><mn>2</mn></mfrac>" },
					{ type: "text", content: ", and found both rectangles that have exactly half of their area shaded: " },
					{ type: "math", mathml: "<mfrac><mn>4</mn><mn>8</mn></mfrac>" },
					{ type: "text", content: " and " },
					{ type: "math", mathml: "<mfrac><mn>2</mn><mn>4</mn></mfrac>" },
					{ type: "text", content: " both equal " },
					{ type: "math", mathml: "<mfrac><mn>1</mn><mn>2</mn></mfrac>" },
					{ type: "text", content: "." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Not quite. First, simplify " },
					{ type: "math", mathml: "<mfrac><mn>3</mn><mn>6</mn></mfrac>" },
					{ type: "text", content: " to " },
					{ type: "math", mathml: "<mfrac><mn>1</mn><mn>2</mn></mfrac>" },
					{
						type: "text",
						content: ". Then count the shaded parts in each rectangle and check if that fraction equals "
					},
					{ type: "math", mathml: "<mfrac><mn>1</mn><mn>2</mn></mfrac>" },
					{ type: "text", content: ". Remember: " },
					{ type: "math", mathml: "<mfrac><mn>4</mn><mn>8</mn></mfrac>" },
					{ type: "text", content: " = " },
					{ type: "math", mathml: "<mfrac><mn>1</mn><mn>2</mn></mfrac>" },
					{ type: "text", content: ", " },
					{ type: "math", mathml: "<mfrac><mn>2</mn><mn>4</mn></mfrac>" },
					{ type: "text", content: " = " },
					{ type: "math", mathml: "<mfrac><mn>1</mn><mn>2</mn></mfrac>" },
					{ type: "text", content: ", but " },
					{ type: "math", mathml: "<mfrac><mn>3</mn><mn>4</mn></mfrac>" },
					{ type: "text", content: " ≠ " },
					{ type: "math", mathml: "<mfrac><mn>1</mn><mn>2</mfrac>" },
					{ type: "text", content: "." }
				]
			}
		]
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
			correct: ["B", "C"]
		}
	],
	widgets: {
		multi_shape: {
			type: "partitionedShape",
			mode: "partition",
			width: 320,
			height: 103,
			layout: "horizontal",
			overlays: null,
			shapes: [
				{
					type: "circle",
					totalParts: 4,
					shadedCells: [0],
					hatchedCells: [],
					rows: null,
					columns: null,
					shadeColor: null,
					shadeOpacity: 0.5
				},
				{
					type: "circle",
					totalParts: 4,
					shadedCells: [0],
					hatchedCells: [],
					rows: null,
					columns: null,
					shadeColor: null,
					shadeOpacity: 0.5
				},
				{
					type: "circle",
					totalParts: 4,
					shadedCells: [0],
					hatchedCells: [],
					rows: null,
					columns: null,
					shadeColor: null,
					shadeOpacity: 0.5
				}
			]
		}
	},
	body: [
		{ type: "blockSlot", slotId: "multi_shape" },
		{ type: "blockSlot", slotId: "choice_interaction" }
	],
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 0,
			maxChoices: 3,
			prompt: [{ type: "text", content: "How can we calculate the shaded area?" }],
			choices: [
				{
					identifier: "A",
					content: [
						{
							type: "paragraph",
							content: [
								{ type: "math", mathml: "<mrow><mn>4</mn><mo>×</mo><mfrac><mn>1</mn><mn>3</mn></mfrac></mrow>" }
							]
						}
					],
					feedback: [
						{ type: "text", content: "Not quite. This would mean " },
						{ type: "math", mathml: "<mn>4</mn>" },
						{ type: "text", content: " groups of " },
						{ type: "math", mathml: "<mfrac><mn>1</mn><mn>3</mn></mfrac>" },
						{ type: "text", content: " each. But we have " },
						{ type: "math", mathml: "<mn>3</mn>" },
						{ type: "text", content: " circles, each with " },
						{ type: "math", mathml: "<mfrac><mn>1</mn><mn>4</mn></mfrac>" },
						{ type: "text", content: " shaded, not " },
						{ type: "math", mathml: "<mn>4</mn>" },
						{ type: "text", content: " groups of " },
						{ type: "math", mathml: "<mfrac><mn>1</mn><mn>3</mn></mfrac>" },
						{ type: "text", content: "." }
					]
				},
				{
					identifier: "B",
					content: [
						{
							type: "paragraph",
							content: [
								{ type: "math", mathml: "<mrow><mn>3</mn><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></mrow>" }
							]
						}
					],
					feedback: [
						{ type: "text", content: "Correct! There are " },
						{ type: "math", mathml: "<mn>3</mn>" },
						{ type: "text", content: " circles and " },
						{ type: "math", mathml: "<mfrac><mn>1</mn><mn>4</mn></mfrac>" },
						{ type: "text", content: " of each circle is shaded. We can multiply: " },
						{ type: "math", mathml: "<mn>3</mo><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac>" },
						{ type: "text", content: "." }
					]
				},
				{
					identifier: "C",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "math",
									mathml:
										"<mrow><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac></mrow>"
								}
							]
						}
					],
					feedback: [
						{ type: "text", content: "Correct! Since we have " },
						{ type: "math", mathml: "<mn>3</mn>" },
						{ type: "text", content: " circles and each has " },
						{ type: "math", mathml: "<mfrac><mn>1</mn><mn>4</mn></mfrac>" },
						{ type: "text", content: " shaded, we can add: " },
						{
							type: "math",
							mathml:
								"<mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac>"
						},
						{ type: "text", content: "." }
					]
				}
			]
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content: "Excellent! You found both correct ways to calculate the shaded area. Since we have "
					},
					{ type: "math", mathml: "<mn>3</mn>" },
					{ type: "text", content: " circles with " },
					{ type: "math", mathml: "<mfrac><mn>1</mn><mn>4</mn></mfrac>" },
					{ type: "text", content: " shaded in each, we can either multiply " },
					{ type: "math", mathml: "<mn>3</mo><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac>" },
					{ type: "text", content: " or add " },
					{
						type: "math",
						mathml:
							"<mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac>"
					},
					{ type: "text", content: ". Both give us " },
					{ type: "math", mathml: "<mfrac><mn>3</mn><mn>4</mn></mfrac>" },
					{ type: "text", content: " as the total shaded area." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Not quite. Look carefully at the image. There are " },
					{ type: "math", mathml: "<mn>3</mn>" },
					{ type: "text", content: " circles, and " },
					{ type: "math", mathml: "<mfrac><mn>1</mn><mn>4</mn></mfrac>" },
					{
						type: "text",
						content: " of each circle is shaded. We can find the total shaded area by either: (1) multiplying "
					},
					{ type: "math", mathml: "<mn>3</mn><mo>×</mo><mfrac><mn>1</mn><mn>4</mn></mfrac>" },
					{ type: "text", content: ", or (2) adding " },
					{
						type: "math",
						mathml:
							"<mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>+</mo><mfrac><mn>1</mn><mn>4</mn></mfrac>"
					},
					{ type: "text", content: "." }
				]
			}
		]
	}
}

export const circleEquationCenterRadius: AssessmentItemInput = {
	identifier: "circle-equation-center-radius",
	title: "Find the center and radius of a circle from its equation",
	responseDeclarations: [
		{ identifier: "RESPONSE_X", cardinality: "single", baseType: "integer", correct: -9 },
		{ identifier: "RESPONSE_Y", cardinality: "single", baseType: "integer", correct: -7 },
		{ identifier: "RESPONSE_R", cardinality: "single", baseType: "integer", correct: 5 }
	],
	body: [
		{
			type: "paragraph",
			content: [{ type: "text", content: "A certain circle can be represented by the following equation." }]
		},
		{
			type: "paragraph",
			content: [
				{
					type: "math",
					mathml:
						"<mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>+</mo><mn>14</mn><mi>y</mi><mo>+</mo><mn>105</mn><mo>=</mo><mn>0</mn></mrow>"
				}
			]
		},
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "What is the center of this circle? (" },
				{ type: "inlineSlot", slotId: "x_entry" },
				{ type: "text", content: ", " },
				{ type: "inlineSlot", slotId: "y_entry" },
				{ type: "text", content: ") and radius " },
				{ type: "inlineSlot", slotId: "r_entry" },
				{ type: "text", content: "?" }
			]
		}
	],
	interactions: {
		x_entry: { type: "textEntryInteraction", responseIdentifier: "RESPONSE_X", expectedLength: 3 },
		y_entry: { type: "textEntryInteraction", responseIdentifier: "RESPONSE_Y", expectedLength: 3 },
		r_entry: { type: "textEntryInteraction", responseIdentifier: "RESPONSE_R", expectedLength: 2 }
	},
	widgets: null,
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! You successfully found that the circle is centered at (" },
					{ type: "math", mathml: "<mo>-</mo><mn>9</mn>" },
					{ type: "text", content: ", " },
					{ type: "math", mathml: "<mo>-</mo><mn>7</mn>" },
					{ type: "text", content: ") with a radius of " },
					{ type: "math", mathml: "<mn>5</mn>" },
					{ type: "text", content: " units." }
				]
			},
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "You correctly converted the equation to standard form: " },
					{
						type: "math",
						mathml:
							"<msup><mrow><mo>(</mo><mi>x</mi><mo>+</mo><mn>9</mn><mo>)</mo></mrow><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><mi>y</mi><mo>+</mo><mn>7</mn><mo>)</mo></mrow><mn>2</mn></msup><mo>=</mo><mn>25</mn>"
					}
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [{ type: "text", content: "Not quite. Let's complete the square to find the center and radius." }]
			},
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Starting with: " },
					{
						type: "math",
						mathml:
							"<msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>18</mn><mi>x</mi><mo>+</mo><mn>14</mn><mi>y</mi><mo>+</mo><mn>105</mn><mo>=</mo><mn>0</mn>"
					}
				]
			},
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Therefore: center = (" },
					{ type: "math", mathml: "<mo>-</mo><mn>9</mn>" },
					{ type: "text", content: ", " },
					{ type: "math", mathml: "<mo>-</mo><mn>7</mn>" },
					{ type: "text", content: ") and radius = " },
					{ type: "math", mathml: "<mn>5</mn>" }
				]
			}
		]
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
			correct: 87
		}
	],
	widgets: {
		score_table: {
			type: "dataTable",
			title: null,
			columns: [
				{ key: "exam", label: "Final exam", isNumeric: false },
				{ key: "score", label: "Score on a 100-point scale", isNumeric: true }
			],
			rowHeaderKey: null,
			data: [
				["Astronomy", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>72</mn></math>'],
				["Biology", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>85</mn></math>'],
				["Physics", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>92</mn></math>'],
				["Chemistry", "?"]
			],
			footer: null
		}
	},
	body: [
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "The following table shows each of Haruka's final exam scores last semester." }
			]
		},
		{ type: "blockSlot", slotId: "score_table" },
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "If the mean of the data set is " },
				{ type: "math", mathml: "<mn>84</mn>" },
				{ type: "text", content: " points, find Haruka's final exam score in chemistry. " },
				{ type: "inlineSlot", slotId: "text_entry" }
			]
		}
	],
	interactions: {
		text_entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 3
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! Haruka scored " },
					{ type: "math", mathml: "<mn>87</mn>" },
					{ type: "text", content: " points on her chemistry exam." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [{ type: "text", content: "Not quite. To find the missing score, use the formula for mean:" }]
			},
			{
				type: "paragraph",
				content: [{ type: "text", content: "Mean = (Sum of all scores) ÷ (Number of scores)" }]
			},
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Therefore, Haruka scored " },
					{ type: "math", mathml: "<mn>87</mn>" },
					{ type: "text", content: " points on her chemistry exam." }
				]
			}
		]
	}
}

export const libertyvilleBusinessCycle: AssessmentItemInput = {
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
	widgets: {
		gdp_table: {
			type: "dataTable",
			title: null,
			columns: [
				{ key: "year", label: "Year", isNumeric: false },
				{ key: "gdp", label: "GDP (% change)", isNumeric: true },
				{ key: "unemployment", label: "Unemployment (% of the labor force)", isNumeric: true }
			],
			rowHeaderKey: null,
			data: [
				[
					"2014",
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>0</mn><mo>%</mo></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>7</mn><mo>%</mo></math>'
				],
				[
					"2015",
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1</mn><mo>%</mo></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn><mo>%</mo></math>'
				],
				[
					"2016",
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>2</mn><mo>%</mo></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>10</mn><mo>%</mo></math>'
				],
				[
					"2017",
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn><mo>%</mo></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>6</mn><mo>%</mo></math>'
				],
				[
					"2018",
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn><mo>%</mo></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn><mo>%</mo></math>'
				],
				[
					"2019",
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>1</mn><mo>%</mo></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>6</mn><mo>%</mo></math>'
				]
			],
			footer: null
		}
	},
	body: [
		{
			type: "paragraph",
			content: [
				{
					type: "text",
					content:
						"The table below shows the gross domestic product (GDP) and unemployment data for Libertyville over five years"
				}
			]
		},
		{ type: "blockSlot", slotId: "gdp_table" },
		{ type: "blockSlot", slotId: "choice_interaction" }
	],
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: [
				{
					type: "text",
					content: "In which of the years was Libertyville most likely experiencing a trough in its business cycle?"
				}
			],
			choices: [
				{
					identifier: "A",
					content: [
						{
							type: "paragraph",
							content: [{ type: "text", content: "2014" }]
						}
					],
					feedback: [
						{
							type: "text",
							content:
								"GDP fell for the two years following 2014, indicating that Libertyville entered the recession phase of its business cycle in 2014. A trough is the turning point at which a recession ends and an expansion begins."
						}
					]
				},
				{
					identifier: "B",
					content: [{ type: "paragraph", content: [{ type: "text", content: "2015" }] }],
					feedback: [
						{
							type: "text",
							content:
								"GDP fell in 2015, indicating that Libertyville was in the recession phase of its business cycle in 2015. However the economy still had further to fall before it started to turn around. A trough is the turning point at which a recession ends and an expansion begins."
						}
					]
				},
				{
					identifier: "C",
					content: [{ type: "paragraph", content: [{ type: "text", content: "2016" }] }],
					feedback: [
						{
							type: "text",
							content:
								"GDP fell in 2016 but increased in 2017, indicating that 2016 was the turning point at which Libertyville's two year recession ended and the economy entered the recovery/expansion phase of its business cycle."
						}
					]
				},
				{
					identifier: "D",
					content: [{ type: "paragraph", content: [{ type: "text", content: "2017" }] }],
					feedback: [
						{
							type: "text",
							content:
								"GDP increased in 2017, indicating that Libertyville was in the expansion phase of its business cycle. A trough is the turning point at which a recession ends and an expansion begins."
						}
					]
				},
				{
					identifier: "E",
					content: [{ type: "paragraph", content: [{ type: "text", content: "2018" }] }],
					feedback: [
						{
							type: "text",
							content:
								"GDP increased in 2018, indicating that Libertyville was in the expansion phase of its business cycle. A trough is the turning point at which a recession ends and an expansion begins."
						}
					]
				}
			]
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"Correct! 2016 was the trough year. The GDP had been declining for two years (2015 and 2016) but then began recovering in 2017. A trough marks the lowest point of a recession before recovery begins."
					}
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"Not quite. A trough occurs at the bottom of a recession, when GDP stops falling and starts growing again. Notice that GDP fell in 2015 ("
					},
					{ type: "math", mathml: "<mo>-</mo><mn>1</mn><mo>%</mo>" },
					{ type: "text", content: ") and 2016 (" },
					{ type: "math", mathml: "<mo>-</mo><mn>2</mn><mo>%</mo>" },
					{ type: "text", content: "), then rose in 2017 (" },
					{ type: "math", mathml: "<mo>+</mo><mn>2</mn><mo>%</mo>" },
					{ type: "text", content: "). This makes 2016 the trough year." }
				]
			}
		]
	}
}

export const continuityDifferentiabilityPiecewise: AssessmentItemInput = {
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
			type: "paragraph",
			content: [
				{
					type: "math",
					mathml:
						'<mrow><mi>f</mi><mo stretchy="false">(</mo><mi>x</mi><mo stretchy="false">)</mo><mo>=</mo><mrow><mo>{</mo><mtable><mtr><mtd columnalign="left"><mrow><mo>-</mo><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>3</mn></mrow></mtd><mtd columnalign="left"><mrow><mo>,</mo><mi>x</mi><mo>≤</mo><mn>2</mn></mrow></mtd></mtr><mtr><mtd columnalign="left"><mrow><msup><mrow><mo stretchy="false">(</mo><mi>x</mi><mo>-</mo><mn>4</mn><mo stretchy="false">)</mo></mrow><mn>2</mn></msup><mo>-</mo><mn>5</mn></mrow></mtd><mtd columnalign="left"><mrow><mo>,</mo><mi>x</mi><mo>&gt;</mo><mn>2</mn></mrow></mtd></mtr></mtable></mrow></mrow>'
				}
			]
		},
		{ type: "blockSlot", slotId: "choice_interaction" }
	],
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: [
				{ type: "text", content: "Is the function given below continuous/differentiable at " },
				{ type: "math", mathml: "<mi>x</mi><mo>=</mo><mn>2</mn>" },
				{ type: "text", content: "?" }
			],
			choices: [
				{
					identifier: "A",
					content: [{ type: "paragraph", content: [{ type: "text", content: "continuous, not differentiable" }] }],
					feedback: [
						{ type: "text", content: "This would be the case if the function values matched at " },
						{ type: "math", mathml: "<mi>x</mi><mo>=</mo><mn>2</mn>" },
						{
							type: "text",
							content:
								" but the derivatives from left and right were different. Check both the limit values and the derivatives."
						}
					]
				},
				{
					identifier: "B",
					content: [{ type: "paragraph", content: [{ type: "text", content: "differentiable, not continuous" }] }],
					feedback: [
						{
							type: "text",
							content: "This is impossible! A function must be continuous at a point to be differentiable there."
						}
					]
				},
				{
					identifier: "C",
					content: [{ type: "paragraph", content: [{ type: "text", content: "both continuous and differentiable" }] }],
					feedback: [
						{ type: "text", content: "Correct! The function values match at " },
						{ type: "math", mathml: "<mi>x</mi><mo>=</mo><mn>2</mn>" },
						{ type: "text", content: " (both equal " },
						{ type: "math", mathml: "<mo>-</mo><mn>1</mn>" },
						{ type: "text", content: ") and the derivatives from both sides equal " },
						{ type: "math", mathml: "<mo>-</mo><mn>4</mn>" },
						{ type: "text", content: ", so the function is both continuous and differentiable." }
					]
				},
				{
					identifier: "D",
					content: [
						{ type: "paragraph", content: [{ type: "text", content: "neither continuous nor differentiable" }] }
					],
					feedback: [
						{ type: "text", content: "Not quite. The function doesn't have a jump discontinuity at " },
						{ type: "math", mathml: "<mi>x</mi><mo>=</mo><mn>2</mn>" },
						{ type: "text", content: ". Check if the left and right limits at " },
						{ type: "math", mathml: "<mi>x</mi><mo>=</mo><mn>2</mn>" },
						{ type: "text", content: " are equal." }
					]
				}
			]
		}
	},
	widgets: null,
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! The function is both continuous and differentiable at " },
					{ type: "math", mathml: "<mi>x</mi><mo>=</mo><mn>2</mn>" },
					{ type: "text", content: "." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Not quite. Let's check both continuity and differentiability at " },
					{ type: "math", mathml: "<mi>x</mi><mo>=</mo><mn>2</mn>" },
					{ type: "text", content: "." }
				]
			}
		]
	}
}

export const stokesTheoremRewrite: AssessmentItemInput = {
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
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "Use Stokes' theorem to rewrite the surface integral as a line integral. " },
				{ type: "inlineSlot", slotId: "text_entry" }
			]
		}
	],
	interactions: {
		text_entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 20
		}
	},
	widgets: null,
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [{ type: "text", content: "Correct!" }]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [{ type: "text", content: "Not quite. Let's use Stokes' theorem to solve this." }]
			}
		]
	}
}

export const estimateDerivativeFromTable: AssessmentItemInput = {
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
	widgets: {
		h_table: {
			type: "dataTable",
			title: null,
			columns: [
				{ key: "x", label: null, isNumeric: false },
				{ key: "minus9", label: null, isNumeric: true },
				{ key: "minus8", label: null, isNumeric: true },
				{ key: "minus6", label: null, isNumeric: true },
				{ key: "minus3", label: null, isNumeric: true },
				{ key: "minus2", label: null, isNumeric: true },
				{ key: "minus1", label: null, isNumeric: true }
			],
			rowHeaderKey: "x",
			data: [
				[
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>9</mn></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>8</mn></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>6</mn></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>3</mn></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>2</mn></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>1</mn></math>'
				],
				[
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>h</mi><mo>(</mo><mi>x</mi><mo>)</mo></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>30</mn></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>29</mn></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>36</mn></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>20</mn></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>35</mn></math>',
					'<math xmlns="http://www.w3.org/1998/Math/MathML"><mo>-</mo><mn>47</mn></math>'
				]
			],
			footer: null
		}
	},
	body: [
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "This table gives select values of the differentiable function " },
				{ type: "math", mathml: "<mi>h</mi>" },
				{ type: "text", content: "." }
			]
		},
		{ type: "blockSlot", slotId: "h_table" },
		{ type: "blockSlot", slotId: "choice_interaction" }
	],
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: [
				{ type: "text", content: "What is the best estimate for " },
				{
					type: "math",
					mathml: "<mrow><msup><mi>h</mi><mo>'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo></mrow>"
				},
				{ type: "text", content: " we can make based on this table?" }
			],
			choices: [
				{
					identifier: "A",
					content: [{ type: "paragraph", content: [{ type: "math", mathml: "<mo>-</mo><mn>28</mn>" }] }],
					feedback: [
						{ type: "text", content: "This can be an estimate for " },
						{ type: "math", mathml: "<mi>h</mi><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo>" },
						{ type: "text", content: ", but we are looking for " },
						{ type: "math", mathml: "<msup><mi>h</mi><mo>'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo>" },
						{ type: "text", content: "." }
					]
				},
				{
					identifier: "B",
					content: [{ type: "paragraph", content: [{ type: "math", mathml: "<mo>-</mo><mn>13.5</mn>" }] }],
					feedback: [
						{ type: "text", content: "We should pick an interval that includes " },
						{ type: "math", mathml: "<mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn>" },
						{ type: "text", content: "." }
					]
				},
				{
					identifier: "C",
					content: [{ type: "paragraph", content: [{ type: "math", mathml: "<mo>-</mo><mn>2.125</mn>" }] }],
					feedback: [
						{ type: "text", content: "We can pick a closer interval to estimate " },
						{ type: "math", mathml: "<msup><mi>h</mi><mo>'</mo></msup>" },
						{ type: "text", content: " specifically at " },
						{ type: "math", mathml: "<mi>x</mi><mo>=</mo><mo>-</mo><mn>4</mn>" },
						{ type: "text", content: "." }
					]
				},
				{
					identifier: "D",
					content: [{ type: "paragraph", content: [{ type: "math", mathml: "<mn>5.33</mn>" }] }],
					feedback: [
						{
							type: "text",
							content: "Correct! The best estimate uses the narrowest interval available that contains -4."
						}
					]
				}
			]
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! The best estimate for " },
					{ type: "math", mathml: "<msup><mi>h</mi><mo>'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo>" },
					{ type: "text", content: " is approximately " },
					{ type: "math", mathml: "<mn>5.33</mn>" },
					{ type: "text", content: "." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content: "Not quite. To estimate the derivative "
					},
					{ type: "math", mathml: "<msup><mi>h</mi><mo>'</mo></msup><mo>(</mo><mo>-</mo><mn>4</mn><mo>)</mo>" },
					{ type: "text", content: ", calculate the average rate of change over the smallest interval containing " },
					{ type: "math", mathml: "<mo>-</mo><mn>4</mn>" },
					{ type: "text", content: "." }
				]
			}
		]
	}
}

export const countApplesEmoji: AssessmentItemInput = {
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
	widgets: {
		choice_3_apples: {
			type: "discreteObjectRatioDiagram",
			title: null,
			width: 250,
			height: 120,
			layout: "grid",
			objects: [{ count: 3, emoji: "🍎" }]
		},
		choice_4_apples: {
			type: "discreteObjectRatioDiagram",
			title: null,
			width: 250,
			height: 120,
			layout: "grid",
			objects: [{ count: 4, emoji: "🍎" }]
		},
		choice_5_apples: {
			type: "discreteObjectRatioDiagram",
			title: null,
			width: 250,
			height: 120,
			layout: "grid",
			objects: [{ count: 5, emoji: "🍎" }]
		},
		choice_6_apples: {
			type: "discreteObjectRatioDiagram",
			title: null,
			width: 250,
			height: 120,
			layout: "grid",
			objects: [{ count: 6, emoji: "🍎" }]
		}
	},
	body: [{ type: "blockSlot", slotId: "choice_interaction" }],
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: [
				{ type: "text", content: "Which box has " },
				{ type: "math", mathml: "<mn>5</mn>" },
				{ type: "text", content: " apples?" }
			],
			choices: [
				{
					identifier: "CHOICE_3",
					content: [{ type: "blockSlot", slotId: "choice_3_apples" }],
					feedback: null
				},
				{
					identifier: "CHOICE_4",
					content: [{ type: "blockSlot", slotId: "choice_4_apples" }],
					feedback: null
				},
				{
					identifier: "CHOICE_5",
					content: [{ type: "blockSlot", slotId: "choice_5_apples" }],
					feedback: null
				},
				{
					identifier: "CHOICE_6",
					content: [{ type: "blockSlot", slotId: "choice_6_apples" }],
					feedback: null
				}
			]
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [{ type: "text", content: "Great job! That box has exactly five apples." }]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Try again. Count the apples in each box to find the one with exactly five." }
				]
			}
		]
	}
}

export const shapeBinBarChart: AssessmentItemInput = {
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
	widgets: {
		shapes_table: {
			type: "dataTable",
			title: null,
			columns: [
				{ key: "shape", label: "Type of shape", isNumeric: false },
				{ key: "count", label: "Number of shapes", isNumeric: true }
			],
			rowHeaderKey: null,
			data: [
				["Triangles", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>8</mn></math>'],
				["Circles", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math>'],
				["Rectangles", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math>'],
				["Squares", '<math xmlns="http://www.w3.org/1998/Math/MathML"><mn>9</mn></math>']
			],
			footer: null
		},
		chart_a: {
			type: "barChart",
			title: null,
			width: 400,
			height: 300,
			xAxisLabel: "Type of shape",
			yAxis: { label: "Number of shape", min: 0, max: 10, tickInterval: 2 },
			data: [
				{ label: "Triangles", value: 8, state: null },
				{ label: "Circles", value: 5, state: null },
				{ label: "Rectangles", value: 3, state: null },
				{ label: "Squares", value: 9, state: null }
			],
			barColor: null
		},
		chart_b: {
			type: "barChart",
			title: null,
			width: 400,
			height: 300,
			xAxisLabel: "Type of shape",
			yAxis: { label: "Number of shape", min: 0, max: 10, tickInterval: 2 },
			data: [
				{ label: "Triangles", value: 9, state: null },
				{ label: "Circles", value: 5, state: null },
				{ label: "Rectangles", value: 3, state: null },
				{ label: "Squares", value: 8, state: null }
			],
			barColor: null
		},
		chart_c: {
			type: "barChart",
			title: null,
			width: 400,
			height: 300,
			xAxisLabel: "Type of shape",
			yAxis: { label: "Number of shape", min: 0, max: 10, tickInterval: 2 },
			data: [
				{ label: "Triangles", value: 7, state: null },
				{ label: "Circles", value: 4, state: null },
				{ label: "Rectangles", value: 2, state: null },
				{ label: "Squares", value: 10, state: null }
			],
			barColor: null
		},
		chart_d: {
			type: "barChart",
			title: null,
			width: 400,
			height: 300,
			xAxisLabel: "Type of shape",
			yAxis: { label: "Number of shape", min: 0, max: 10, tickInterval: 2 },
			data: [
				{ label: "Triangles", value: 4, state: null },
				{ label: "Circles", value: 8, state: null },
				{ label: "Rectangles", value: 9, state: null },
				{ label: "Squares", value: 3, state: null }
			],
			barColor: null
		}
	},
	body: [
		{
			type: "paragraph",
			content: [{ type: "text", content: "A second grade classroom has a bin of shapes." }]
		},
		{ type: "blockSlot", slotId: "shapes_table" },
		{ type: "blockSlot", slotId: "choice_interaction" }
	],
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: [{ type: "text", content: "Which bar graph correctly shows the number of shapes in the bin?" }],
			choices: [
				{
					identifier: "A",
					content: [{ type: "blockSlot", slotId: "chart_a" }],
					feedback: null
				},
				{
					identifier: "B",
					content: [{ type: "blockSlot", slotId: "chart_b" }],
					feedback: null
				},
				{
					identifier: "C",
					content: [{ type: "blockSlot", slotId: "chart_c" }],
					feedback: null
				},
				{
					identifier: "D",
					content: [{ type: "blockSlot", slotId: "chart_d" }],
					feedback: null
				}
			]
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! The chosen graph perfectly matches the data provided in the table." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"Not quite. Match the number of shapes from the table to the height of the bar for each shape type."
					}
				]
			}
		]
	}
}

export const pencilLengthLinePlot: AssessmentItemInput = {
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
	widgets: {
		plot_a: {
			type: "dotPlot",
			width: 450,
			height: 150,
			axis: { min: 0, max: 12, tickInterval: 2, label: null },
			data: [
				{ value: 3, count: 1 },
				{ value: 8, count: 2 },
				{ value: 11, count: 1 }
			],
			dotColor: "#0074c8",
			dotRadius: 8
		},
		plot_b: {
			type: "dotPlot",
			width: 450,
			height: 150,
			axis: { min: 0, max: 12, tickInterval: 2, label: null },
			data: [
				{ value: 3, count: 1 },
				{ value: 8, count: 1 },
				{ value: 11, count: 1 }
			],
			dotColor: "#0074c8",
			dotRadius: 8
		},
		plot_c: {
			type: "dotPlot",
			width: 450,
			height: 150,
			axis: { min: 0, max: 12, tickInterval: 2, label: null },
			data: [{ value: 4, count: 4 }],
			dotColor: "#0074c8",
			dotRadius: 8
		},
		plot_d: {
			type: "dotPlot",
			width: 450,
			height: 150,
			axis: { min: 0, max: 12, tickInterval: 2, label: null },
			data: [
				{ value: 4, count: 1 },
				{ value: 9, count: 2 },
				{ value: 12, count: 1 }
			],
			dotColor: "#0074c8",
			dotRadius: 8
		}
	},
	body: [
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "The lengths of 4 pencils were measured. The lengths are " },
				{ type: "math", mathml: "<mn>11</mn><mtext> cm</mtext>" },
				{ type: "text", content: ", " },
				{ type: "math", mathml: "<mn>8</mn><mtext> cm</mtext>" },
				{ type: "text", content: ", " },
				{ type: "math", mathml: "<mn>8</mn><mtext> cm</mtext>" },
				{ type: "text", content: ", and " },
				{ type: "math", mathml: "<mn>3</mn><mtext> cm</mtext>" },
				{ type: "text", content: "." }
			]
		},
		{ type: "blockSlot", slotId: "choice_interaction" }
	],
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: [{ type: "text", content: "Which line plot correctly shows the length of each pencil?" }],
			choices: [
				{
					identifier: "A",
					content: [{ type: "blockSlot", slotId: "plot_a" }],
					feedback: [
						{
							type: "text",
							content: "This plot correctly shows a dot for each of the 4 pencils at its measured length."
						}
					]
				},
				{
					identifier: "B",
					content: [{ type: "blockSlot", slotId: "plot_b" }],
					feedback: [
						{
							type: "text",
							content: "This plot only shows one dot for the length of "
						},
						{ type: "math", mathml: "<mn>8</mn><mtext> cm</mtext>" },
						{ type: "text", content: ". Remember, there were two pencils with this length." }
					]
				},
				{
					identifier: "C",
					content: [{ type: "blockSlot", slotId: "plot_c" }],
					feedback: [
						{
							type: "text",
							content: "This plot shows four dots above the number "
						},
						{ type: "math", mathml: "<mn>4</mn>" },
						{ type: "text", content: ". This represents the total number of pencils, not their individual lengths." }
					]
				},
				{
					identifier: "D",
					content: [{ type: "blockSlot", slotId: "plot_d" }],
					feedback: [
						{
							type: "text",
							content: "Check the data again carefully to make sure the dots are placed above the correct numbers."
						}
					]
				}
			]
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! The chosen plot correctly displays a dot for each of these measurements." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"Not quite. To create the line plot, place one dot above the correct number on the line for each pencil measured."
					}
				]
			}
		]
	}
}

export const gamesWonBarChart: AssessmentItemInput = {
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
	widgets: {
		games_chart: {
			type: "barChart",
			title: null,
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
				{ label: "Lions", value: 14, state: null },
				{ label: "Tigers", value: 2, state: null },
				{ label: "Bears", value: 7, state: null }
			],
			barColor: null
		}
	},
	body: [
		{
			type: "paragraph",
			content: [{ type: "text", content: "The Lions, Tigers, and Bears won baseball games last summer." }]
		},
		{
			type: "paragraph",
			content: [{ type: "text", content: "This bar graph shows how many games each team won." }]
		},
		{ type: "blockSlot", slotId: "games_chart" },
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "How many games did the Lions win? " },
				{ type: "inlineSlot", slotId: "text_entry" }
			]
		}
	],
	interactions: {
		text_entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 3
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! The Lions won " },
					{ type: "math", mathml: "<mn>14</mn>" },
					{ type: "text", content: " games." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Not quite. Find the Lions bar and see where it reaches on the vertical axis." }
				]
			}
		]
	}
}

export const dollHeightLinePlot: AssessmentItemInput = {
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
	widgets: {
		doll_plot: {
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
			dotColor: null,
			dotRadius: 6
		}
	},
	body: [
		{
			type: "paragraph",
			content: [{ type: "text", content: "The heights of Sabrina's dolls are shown below." }]
		},
		{ type: "blockSlot", slotId: "doll_plot" },
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "How many dolls are taller than " },
				{ type: "math", mathml: "<mn>22</mn>" },
				{ type: "text", content: " centimeters? " },
				{ type: "inlineSlot", slotId: "text_entry" }
			]
		}
	],
	interactions: {
		text_entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 3
		}
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! " },
					{ type: "math", mathml: "<mn>5</mn>" },
					{ type: "text", content: " dolls are taller than " },
					{ type: "math", mathml: "<mn>22</mn><mtext> cm</mtext>" },
					{ type: "text", content: "." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Not quite. Count all the dots that are to the right of " },
					{ type: "math", mathml: "<mn>22</mn>" },
					{ type: "text", content: " on the line plot." }
				]
			}
		]
	}
}

export const timeOnNumberLine: AssessmentItemInput = {
	identifier: "time-on-number-line-detailed-final",
	title: "What time is shown on the number line?",
	responseDeclarations: [
		{ identifier: "RESPONSE_HR", cardinality: "single", baseType: "integer", correct: 12 },
		{ identifier: "RESPONSE_MIN", cardinality: "single", baseType: "integer", correct: 55 }
	],
	widgets: {
		time_line: {
			type: "numberLine",
			width: 700,
			height: 100,
			orientation: null,
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
		}
	},
	body: [
		{
			type: "paragraph",
			content: [{ type: "text", content: "Look at the following number line." }]
		},
		{ type: "blockSlot", slotId: "time_line" },
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "What time is shown on the number line? " },
				{ type: "inlineSlot", slotId: "hour_entry" },
				{ type: "text", content: ":" },
				{ type: "inlineSlot", slotId: "minute_entry" }
			]
		}
	],
	interactions: {
		hour_entry: { type: "textEntryInteraction", responseIdentifier: "RESPONSE_HR", expectedLength: 2 },
		minute_entry: { type: "textEntryInteraction", responseIdentifier: "RESPONSE_MIN", expectedLength: 2 }
	},
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [{ type: "text", content: "Correct! The time shown is 12:55." }]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content: "Not quite. Point A is located after the 12:00 mark but before the 1:00 mark. The time is 12:55."
					}
				]
			}
		]
	}
}

export const compare2DigitNumbers: AssessmentItemInput = {
	identifier: "compare-2-digit-numbers",
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
		{
			type: "paragraph",
			content: [{ type: "text", content: "Compare using >, <, or =." }]
		},
		{
			type: "paragraph",
			content: [
				{ type: "math", mathml: "<mn>83</mn>" },
				{ type: "text", content: " " },
				{ type: "inlineSlot", slotId: "comparison" },
				{ type: "text", content: " " },
				{ type: "math", mathml: "<mn>58</mn>" }
			]
		}
	],
	interactions: {
		comparison: {
			type: "inlineChoiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			choices: [
				{
					identifier: "GT",
					content: [{ type: "math", mathml: "<mo>&gt;</mo>" }]
				},
				{
					identifier: "LT",
					content: [{ type: "math", mathml: "<mo>&lt;</mo>" }]
				},
				{
					identifier: "EQ",
					content: [{ type: "math", mathml: "<mo>=</mo>" }]
				}
			]
		}
	},
	widgets: null,
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! " },
					{ type: "math", mathml: "<mn>83</mn>" },
					{ type: "text", content: " is greater than " },
					{ type: "math", mathml: "<mn>58</mn>" },
					{ type: "text", content: ", so the correct symbol is " },
					{ type: "math", mathml: "<mo>&gt;</mo>" },
					{ type: "text", content: "." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Not quite. Since " },
					{ type: "math", mathml: "<mn>83</mn>" },
					{ type: "text", content: " is larger than " },
					{ type: "math", mathml: "<mn>58</mn>" },
					{ type: "text", content: ", the correct comparison is " },
					{ type: "math", mathml: "<mn>83</mn><mo>&gt;</mo><mn>58</mn>" },
					{ type: "text", content: "." }
				]
			}
		]
	}
}

export const greatestCommonFactor: AssessmentItemInput = {
	identifier: "greatest-common-factor-numeric-input",
	title: "Greatest common factor",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "integer",
			correct: 15
		}
	],
	body: [
		{
			type: "paragraph",
			content: [
				{ type: "text", content: "Find the greatest common factor of " },
				{ type: "math", mathml: "<mn>30</mn>" },
				{ type: "text", content: " and " },
				{ type: "math", mathml: "<mn>75</mn>" },
				{ type: "text", content: "." }
			]
		},
		{ type: "blockSlot", slotId: "text_entry_interaction_1" }
	],
	interactions: {
		text_entry_interaction_1: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 3
		}
	},
	widgets: null,
	feedback: {
		correct: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Correct! The greatest common factor of " },
					{ type: "math", mathml: "<mn>30</mn>" },
					{ type: "text", content: " and " },
					{ type: "math", mathml: "<mn>75</mn>" },
					{ type: "text", content: " is " },
					{ type: "math", mathml: "<mn>15</mn>" },
					{ type: "text", content: "." }
				]
			}
		],
		incorrect: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content: "Not quite. Remember to find the largest number that divides both "
					},
					{ type: "math", mathml: "<mn>30</mn>" },
					{ type: "text", content: " and " },
					{ type: "math", mathml: "<mn>75</mn>" },
					{
						type: "text",
						content:
							" without a remainder. The factors of 30 are 1, 2, 3, 5, 6, 10, 15, 30. The factors of 75 are 1, 3, 5, 15, 25, 75. The greatest common factor is "
					},
					{ type: "math", mathml: "<mn>15</mn>" },
					{ type: "text", content: "." }
				]
			}
		]
	}
}

export const allExamples: AssessmentItemInput[] = [
	greatestCommonFactor,
	doubleNumberLineRatio,
	evalFractionalExponents,
	compare3DigitNumbers,
	inequalityNumberLine,
	verticalNumberLineComparison,
	twoWayFrequencyTable,
	equivalentFractionImages,
	calculateShadedArea,
	circleEquationCenterRadius,
	harukaExamScore,
	libertyvilleBusinessCycle,
	continuityDifferentiabilityPiecewise,
	stokesTheoremRewrite,
	estimateDerivativeFromTable,
	countApplesEmoji,
	shapeBinBarChart,
	pencilLengthLinePlot,
	gamesWonBarChart,
	dollHeightLinePlot,
	timeOnNumberLine,
	compare2DigitNumbers
]
