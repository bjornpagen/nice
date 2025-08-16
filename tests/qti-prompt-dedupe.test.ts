import { expect, test } from "bun:test"
import { compile } from "@/lib/qti-generation/compiler"
import type { AssessmentItemInput } from "@/lib/qti-generation/schemas"

// This suite focuses ONLY on prompt/body deduplication behavior.

test("dedupes paraphrased prompt - modern-day country of Anatolia", () => {
	const item: AssessmentItemInput = {
		identifier: "hittites-anatolia-modern-country",
		title: "Modern-day country of Anatolia",
		responseDeclarations: [
			{ identifier: "choice_interaction", cardinality: "single", baseType: "identifier", correct: "B" }
		],
		widgets: null,
		body: [
			{ type: "paragraph", content: [{ type: "text", content: "The Hittites were an ancient Anatolian people." }] },
			{ type: "paragraph", content: [{ type: "text", content: "In which modern-day country is Anatolia located?" }] },
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction",
				shuffle: true,
				minChoices: 1,
				maxChoices: 1,
				prompt: [{ type: "text", content: "Select the modern-day country where Anatolia is located." }],
				choices: [
					{
						identifier: "A",
						content: [{ type: "paragraph", content: [{ type: "text", content: "Egypt" }] }],
						feedback: null
					},
					{
						identifier: "B",
						content: [{ type: "paragraph", content: [{ type: "text", content: "Turkey" }] }],
						feedback: null
					},
					{
						identifier: "C",
						content: [{ type: "paragraph", content: [{ type: "text", content: "Poland" }] }],
						feedback: null
					}
				]
			}
		},
		feedback: {
			correct: [{ type: "paragraph", content: [{ type: "text", content: "ok" }] }],
			incorrect: [{ type: "paragraph", content: [{ type: "text", content: "no" }] }]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain("Select the modern-day country where Anatolia is located.")
	// Body variant should be removed
	expect(xml).not.toContain("In which modern-day country is Anatolia located?")
})

test("dedupes paraphrased prompt - red vs green lasers selection phrase", () => {
	const item: AssessmentItemInput = {
		identifier: "red-green-laser-wave-properties",
		title: "Different wave properties for red and green lasers",
		responseDeclarations: [
			{ identifier: "choice_interaction", cardinality: "multiple", baseType: "identifier", correct: ["B", "C"] }
		],
		widgets: {},
		body: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"Two lights, a red laser and a green laser, are shining through a vacuum. Both lights have the same brightness."
					}
				]
			},
			{ type: "paragraph", content: [{ type: "text", content: "Which wave properties are different for the two lights?" }] },
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction",
				shuffle: true,
				minChoices: 1,
				maxChoices: 4,
				prompt: [{ type: "text", content: "Which wave properties are different for the two lights? Select all that apply." }],
				choices: [
					{
						identifier: "A",
						content: [{ type: "paragraph", content: [{ type: "text", content: "amplitude" }] }],
						feedback: null
					},
					{
						identifier: "B",
						content: [{ type: "paragraph", content: [{ type: "text", content: "frequency" }] }],
						feedback: null
					},
					{
						identifier: "C",
						content: [{ type: "paragraph", content: [{ type: "text", content: "wavelength" }] }],
						feedback: null
					},
					{
						identifier: "D",
						content: [{ type: "paragraph", content: [{ type: "text", content: "speed" }] }],
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
							content:
								"Correct! In a vacuum, all electromagnetic waves travel at the same speed, and equal brightness implies equal amplitude. Red light has a longer wavelength and a lower frequency than green light, so the properties that differ are wavelength and frequency."
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
								"Not quite. In a vacuum, the speed is the same for all electromagnetic waves, and equal brightness means equal amplitude. Red and green light differ in wavelength and frequency."
						}
					]
				}
			]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain("Which wave properties are different for the two lights? Select all that apply.")
	// Body variant should be removed
	// Check specifically for the body paragraph, not the prompt substring
	expect(xml).not.toContain("<p>Which wave properties are different for the two lights?</p>")
})

test("dedupes paraphrased prompt - balanced forces selection phrase", () => {
	const item: AssessmentItemInput = {
		identifier: "balanced-forces-conditions",
		title: "Conditions for Balanced Forces",
		responseDeclarations: [
			{ identifier: "choice_interaction_1", cardinality: "multiple", baseType: "identifier", correct: ["A", "C"] }
		],
		widgets: {},
		body: [
			{ type: "paragraph", content: [{ type: "text", content: "Two forces are balanced." }] },
			{ type: "paragraph", content: [{ type: "text", content: "What must be true of the two forces?" }] },
			{ type: "blockSlot", slotId: "choice_interaction_1" }
		],
		interactions: {
			choice_interaction_1: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction_1",
				shuffle: true,
				minChoices: 1,
				maxChoices: 4,
				prompt: [{ type: "text", content: "What must be true of the two forces? Select all that apply." }],
				choices: [
					{
						identifier: "A",
						content: [{ type: "paragraph", content: [{ type: "text", content: "The forces act on the same object." }] }],
						feedback: null
					},
					{
						identifier: "B",
						content: [{ type: "paragraph", content: [{ type: "text", content: "The forces act on different objects." }] }],
						feedback: null
					},
					{
						identifier: "C",
						content: [{ type: "paragraph", content: [{ type: "text", content: "The forces have the same strength." }] }],
						feedback: null
					},
					{
						identifier: "D",
						content: [{ type: "paragraph", content: [{ type: "text", content: "The forces have different strengths." }] }],
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
							content:
								"Correct! Balanced forces act on the same object and have equal strength in opposite directions, so their effects cancel."
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
								"Not quite. For forces to be balanced, they must act on the same object with equal strength and in opposite directions."
						}
					]
				}
			]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain("What must be true of the two forces? Select all that apply.")
	// Body variant should be removed
	expect(xml).not.toContain("<p>What must be true of the two forces?</p>")
})

test("dedupes paraphrased prompt - food provides describe vs describes", () => {
	const item: AssessmentItemInput = {
		identifier: "what-food-provides-organisms-multiselect",
		title: "What food provides to organisms",
		responseDeclarations: [
			{ identifier: "choice_interaction", cardinality: "multiple", baseType: "identifier", correct: ["A", "B"] }
		],
		widgets: {},
		body: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content: "Which of the following best describe what food provides to organisms?"
					}
				]
			},
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction",
				shuffle: true,
				minChoices: 1,
				maxChoices: 3,
				prompt: [{ type: "text", content: "Which of the following best describes what food provides to organisms?" }],
				choices: [
					{
						identifier: "A",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "Molecules that can be used for growth" }] }
						],
						feedback: null
					},
					{
						identifier: "B",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "Energy that can power cellular processes" }] }
						],
						feedback: null
					},
					{
						identifier: "C",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "New mitochondria that can carry out cellular respiration" }] }
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
						{ type: "text", content: "Correct! Food provides molecules for growth and energy for cellular processes." }
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
								"Not quite. Food provides molecules that organisms use to build and grow, as well as energy to power cellular processes."
						}
					]
				}
			]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain("Which of the following best describes what food provides to organisms?")
	// Body variant should be removed
	expect(xml).not.toContain("<p>Which of the following best describe what food provides to organisms?</p>")
})

test("dedupes paraphrased prompt - american decline excerpt", () => {
	const item: AssessmentItemInput = {
		identifier: "american-decline-belief",
		title: "Factors contributing to belief in “American decline”",
		responseDeclarations: [
			{ identifier: "choice_interaction", cardinality: "single", baseType: "identifier", correct: "A" }
		],
		widgets: null,
		body: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"“American decline is real, though the apocalyptic version of it reflects the familiar ruling-class perception that anything short of total control amounts to total disaster. Despite the piteous laments, the United States remains the world’s dominant power by a large margin, with no competitor in sight, and not only in the military dimension, in which, of course, the United States reigns supreme.”"
					}
				]
			},
			{
				type: "paragraph",
				content: [{ type: "text", content: "Source: Noam Chomsky, historian, “Who Rules the World?”, 2016." }]
			},
			{
				type: "paragraph",
				content: [{ type: "text", content: "Vocabulary: piteous — heartbreaking; pitiful; laments — cries; wails." }]
			},
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"Which of the following most likely contributed to the rise in belief of the “American decline” referred to in the excerpt?"
					}
				]
			},
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction",
				shuffle: true,
				minChoices: 1,
				maxChoices: 1,
				prompt: [
					{
						type: "text",
						content:
							"Which of the following most likely contributed to the rise in belief in the “American decline” referred to in the excerpt?"
					}
				],
				choices: [
					{
						identifier: "A",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										content: "The Great Recession of 2008, a global financial crisis that affected the U.S. economy."
									}
								]
							}
						],
						feedback: null
					},
					{
						identifier: "B",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										content:
											"The search for and subsequent death of Osama bin Laden, who led al-Qaeda at the time of the September 11 attacks."
									}
								]
							}
						],
						feedback: null
					},
					{
						identifier: "C",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										content:
											"The September 11 attacks, which involved coordinated strikes on the World Trade Center and the Pentagon."
									}
								]
							}
						],
						feedback: null
					},
					{
						identifier: "D",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										content:
											"The election of Barack Obama, the first Black man to serve as president of the United States."
									}
								]
							}
						],
						feedback: null
					}
				]
			}
		},
		feedback: {
			correct: [{ type: "paragraph", content: [{ type: "text", content: "ok" }] }],
			incorrect: [{ type: "paragraph", content: [{ type: "text", content: "no" }] }]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain(
		"Which of the following most likely contributed to the rise in belief in the “American decline” referred to in the excerpt?"
	)
	// Body variant should be removed
	expect(xml).not.toContain(
		"Which of the following most likely contributed to the rise in belief of the “American decline” referred to in the excerpt?"
	)
})

test("dedupes paraphrased prompt - affordable care act provisions", () => {
	const item: AssessmentItemInput = {
		identifier: "affordable-care-act-provisions",
		title: "Provisions of the Affordable Care Act",
		responseDeclarations: [
			{ identifier: "choice_interaction", cardinality: "single", baseType: "identifier", correct: "A" }
		],
		widgets: null,
		body: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content: "Which of the following were among the provisions of the Affordable Care Act?"
					}
				]
			},
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction",
				shuffle: true,
				minChoices: 1,
				maxChoices: 1,
				prompt: [
					{ type: "text", content: "Which of the following was among the provisions of the Affordable Care Act?" }
				],
				choices: [
					{
						identifier: "A",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										content:
											"The law made health insurance coverage mandatory for American citizens and made it illegal for insurance companies to deny coverage for preexisting conditions."
									}
								]
							}
						],
						feedback: null
					},
					{
						identifier: "B",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										content:
											'The law made it illegal for health insurance companies to charge "unaffordable" rates for individual insurance, which was defined as more than '
									},
									{ type: "math", mathml: "<mn>10</mn><mo>%</mo>" },
									{ type: "text", content: " of an individual's take-home pay." }
								]
							}
						],
						feedback: null
					},
					{
						identifier: "C",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										content:
											"The law created a nationalized health system in which the government took over management of all hospitals and health insurance."
									}
								]
							}
						],
						feedback: null
					}
				]
			}
		},
		feedback: {
			correct: [{ type: "paragraph", content: [{ type: "text", content: "ok" }] }],
			incorrect: [
				{
					type: "paragraph",
					content: [
						{ type: "text", content: "Not quite. The law did not impose a price cap defined as more than " },
						{ type: "math", mathml: "<mn>10</mn><mo>%</mo>" },
						{
							type: "text",
							content:
								" of take-home pay, and it did not create a nationalized health system. The federal government did not take over management of hospitals or all health insurance."
						}
					]
				}
			]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain("Which of the following was among the provisions of the Affordable Care Act?")
	// Body variant should be removed
	expect(xml).not.toContain("Which of the following were among the provisions of the Affordable Care Act?")
})

test("dedupes repeated prompt - kinetic energy selection phrase (duplicate body)", () => {
	const item: AssessmentItemInput = {
		identifier: "which-objects-have-kinetic-energy",
		title: "Identify objects with kinetic energy",
		responseDeclarations: [
			{ identifier: "choice_interaction", cardinality: "multiple", baseType: "identifier", correct: ["A", "B", "E"] }
		],
		widgets: {},
		body: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Which of the following objects have kinetic energy? Select all that apply." }
				]
			},
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction",
				shuffle: true,
				minChoices: 1,
				maxChoices: 6,
				prompt: [
					{ type: "text", content: "Which of the following objects have kinetic energy? Select all that apply." }
				],
				choices: [
					{
						identifier: "A",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "the Earth traveling around the Sun" }] }
						],
						feedback: null
					},
					{
						identifier: "B",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "a train slowing down" }] }
						],
						feedback: null
					},
					{
						identifier: "C",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "a bucket hanging at rest from a rope" }] }
						],
						feedback: null
					},
					{
						identifier: "D",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "an arrow pulled back in a bow, ready to be released" }] }
						],
						feedback: null
					},
					{
						identifier: "E",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "a soccer ball that has just been kicked" }] }
						],
						feedback: null
					},
					{
						identifier: "F",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "a car that is stopped at a stoplight" }] }
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
							content:
								"Correct! Kinetic energy is the energy of motion, so any object that is moving has kinetic energy."
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
								"Not quite. Kinetic energy is the energy of motion. Only objects that are moving have kinetic energy."
						}
					]
				}
			]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain("Which of the following objects have kinetic energy? Select all that apply.")
	// Body variant should be removed
	expect(xml).not.toContain("<p>Which of the following objects have kinetic energy? Select all that apply.</p>")
})

test("dedupes paraphrased prompt - same pitch different loudness wave properties", () => {
	const item: AssessmentItemInput = {
		identifier: "same-pitch-different-loudness-wave-properties",
		title: "Identify wave properties shared by two sounds in the same medium",
		responseDeclarations: [
			{ identifier: "choice_interaction", cardinality: "multiple", baseType: "identifier", correct: ["B", "C", "D"] }
		],
		widgets: {},
		body: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"Two speakers are in the same room filled with air. Both are playing sounds with the same pitch. One speaker’s sound is louder than the other’s."
					}
				]
			},
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Which wave properties are the same for the two sounds? Select all that apply." }
				]
			},
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction",
				shuffle: true,
				minChoices: 1,
				maxChoices: 4,
				prompt: [
					{ type: "text", content: "Which wave properties are the same for the two sounds? Select all that apply." }
				],
				choices: [
					{ identifier: "A", content: [{ type: "paragraph", content: [{ type: "text", content: "amplitude" }] }], feedback: null },
					{ identifier: "B", content: [{ type: "paragraph", content: [{ type: "text", content: "frequency" }] }], feedback: null },
					{ identifier: "C", content: [{ type: "paragraph", content: [{ type: "text", content: "wavelength" }] }], feedback: null },
					{ identifier: "D", content: [{ type: "paragraph", content: [{ type: "text", content: "speed" }] }], feedback: null }
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
								"Correct! In the same medium, sound waves travel at the same speed. If two sounds have the same pitch, they have the same frequency, and with equal speed, they also have the same wavelength. Loudness relates to amplitude, which can differ."
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
								"Not quite. Pitch corresponds to frequency, and in the same medium all sound waves have the same speed. With equal speed and equal frequency, the wavelength is also the same. Loudness depends on amplitude and can be different."
						}
					]
				}
			]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain("Which wave properties are the same for the two sounds? Select all that apply.")
	// Body variant should be removed (only the question paragraph, not the context paragraph)
	expect(xml).not.toContain("<p>Which wave properties are the same for the two sounds? Select all that apply.</p>")
})

test("dedupes repeated prompt - heliocentric model selection phrase", () => {
	const item: AssessmentItemInput = {
		identifier: "heliocentric-model-multi-select",
		title: "Facts about the heliocentric model",
		responseDeclarations: [
			{ identifier: "choice_interaction_1", cardinality: "multiple", baseType: "identifier", correct: ["B", "C"] }
		],
		widgets: {},
		body: [
			{
				type: "paragraph",
				content: [
					{ type: "text", content: "Which statements are true about the heliocentric model? Select all that apply." }
				]
			},
			{ type: "blockSlot", slotId: "choice_interaction_1" }
		],
		interactions: {
			choice_interaction_1: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction_1",
				shuffle: true,
				minChoices: 1,
				maxChoices: 4,
				prompt: [
					{ type: "text", content: "Which statements are true about the heliocentric model? Select all that apply." }
				],
				choices: [
					{
						identifier: "A",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "It shows Earth as the center of the universe." }] }
						],
						feedback: null
					},
					{
						identifier: "B",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "It shows the Sun as the center of the universe." }] }
						],
						feedback: null
					},
					{
						identifier: "C",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "It replaced the geocentric model." }] }
						],
						feedback: null
					},
					{
						identifier: "D",
						content: [
							{ type: "paragraph", content: [{ type: "text", content: "It was replaced by the geocentric model." }] }
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
							content:
								"Correct! In the heliocentric model, the Sun is at the center, and this model replaced the earlier geocentric model."
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
								"Not quite. The heliocentric model places the Sun at the center and superseded the geocentric model."
						}
					]
				}
			]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain("Which statements are true about the heliocentric model? Select all that apply.")
	// Body variant should be removed
	expect(xml).not.toContain("<p>Which statements are true about the heliocentric model? Select all that apply.</p>")
})

test("does not remove instruction-augmented body question - zinc pieces vs concentration", () => {
	const item: AssessmentItemInput = {
		identifier: "zinc-pieces-temperature-rise",
		title: "Identify the experiment with larger zinc pieces",
		responseDeclarations: [
			{ identifier: "choice_interaction", cardinality: "single", baseType: "identifier", correct: "D" }
		],
		widgets: {
			image_2: {
				type: "urlImage",
				alt: "irregularly shaped chunks of silvery-grey zinc metal ",
				url: "https://cdn.kastatic.org/ka-content-images/96db70681a015a8d299513e780cb965ba88a4287.jpg",
				width: 353,
				height: 270,
				caption: "Large chunks of zinc metal",
				attribution: '"Zinc-sample" by Benjah-bmm27. Public Domain.'
			},
			temp_data_table: {
				type: "dataTable",
				title: "Temperature data over time",
				columns: [
					{ key: "time", label: [{ type: "text", content: "Time (min)" }], isNumeric: true },
					{ key: "test_a", label: [{ type: "text", content: "Test A" }], isNumeric: true },
					{ key: "test_b", label: [{ type: "text", content: "Test B" }], isNumeric: true }
				],
				rowHeaderKey: "time",
				footer: null,
				data: [
					[
						{ type: "number", value: 0 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>22.0</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>22.0</mn><mo>°</mo><mi>C</mi>" }] }
					],
					[
						{ type: "number", value: 1 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>27.8</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>23.8</mn><mo>°</mo><mi>C</mi>" }] }
					],
					[
						{ type: "number", value: 2 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>33.2</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>25.1</mn><mo>°</mo><mi>C</mi>" }] }
					],
					[
						{ type: "number", value: 3 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>36.8</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>26.2</mn><mo>°</mo><mi>C</mi>" }] }
					],
					[
						{ type: "number", value: 4 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>38.9</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>27.1</mn><mo>°</mo><mi>C</mi>" }] }
					],
					[
						{ type: "number", value: 5 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>40.1</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>27.8</mn><mo>°</mo><mi>C</mi>" }] }
					]
				]
			}
		},
		body: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"A group of students measured the change in temperature over time for a chemical reaction between zinc and hydrochloric acid."
					}
				]
			},
			{ type: "blockSlot", slotId: "image_2" },
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"They conducted multiple experiments with different modifications. In one test, they used larger pieces of zinc instead of small pieces. In another test, they used a more concentrated acid. The amount of each reactant was held constant across both tests. Their data are shown below."
					}
				]
			},
			{ type: "blockSlot", slotId: "temp_data_table" },
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"Which experiment represents the trial where they used larger pieces of zinc? Justify your answer using evidence from the data."
					}
				]
			},
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction",
				shuffle: true,
				minChoices: 1,
				maxChoices: 1,
				prompt: [
					{
						type: "text",
						content: "Which experiment represents the trial where they used larger pieces of zinc? Select one answer."
					}
				],
				choices: [
					{
						identifier: "A",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										content: "Test A, because the temperature rose faster and the total change in temperature was greater."
									}
								]
							}
						],
						feedback: null
					},
					{
						identifier: "B",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", content: "Test A, because it reached its final temperature in less time." }
								]
							}
						],
						feedback: null
					},
					{
						identifier: "C",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", content: "Test B, because the temperature change was more consistent after each minute." }
								]
							}
						],
						feedback: null
					},
					{
						identifier: "D",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", content: "Test B, because the temperature increased more slowly and the total change was smaller." }
								]
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
							content:
								"Correct! Larger pieces of zinc provide less surface area, which reduces the frequency of collisions and slows the reaction rate. The data set with the slower temperature increase and smaller overall change corresponds to the test with larger zinc pieces."
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
								"Not quite. Larger pieces of zinc mean less surface area is exposed, so the reaction proceeds more slowly. Look for the data set where the temperature rises more gradually and the total change is smaller."
						}
					]
				}
			]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain(
		"Which experiment represents the trial where they used larger pieces of zinc? Select one answer."
	)
	// The body question includes an extra instruction; it MUST be preserved
	expect(xml).toContain("Justify your answer using evidence from the data.")
})

test("does not remove instruction-augmented body question - stirred vs cooled trial", () => {
	const item: AssessmentItemInput = {
		identifier: "stirred-vs-cooled-temperature-trial",
		title: "Identify the stirred reaction trial from temperature data",
		responseDeclarations: [
			{ identifier: "choice_interaction", cardinality: "single", baseType: "identifier", correct: "A" }
		],
		widgets: {
			image_1: {
				type: "urlImage",
				alt: "Continuously stirring a reaction mixture",
				url: "https://cdn.kastatic.org/ka-content-images/ef43d00e9a5d843b3d8ee18f5206b7674ed760cb.gif",
				width: 350,
				height: 231,
				caption: "Continuously stirring a reaction mixture",
				attribution: "Khan Academy"
			},
			temperature_table: {
				type: "dataTable",
				title: "Temperature over Time for Two Tests",
				columns: [
					{ key: "time", label: [{ type: "text", content: "Time (min)" }], isNumeric: true },
					{ key: "test_a", label: [{ type: "text", content: "Test A" }], isNumeric: true },
					{ key: "test_b", label: [{ type: "text", content: "Test B" }], isNumeric: true }
				],
				rowHeaderKey: "time",
				footer: null,
				data: [
					[
						{ type: "number", value: 0 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>22.0</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>15.0</mn><mo>°</mo><mi>C</mi>" }] }
					],
					[
						{ type: "number", value: 1 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>27.1</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>16.8</mn><mo>°</mo><mi>C</mi>" }] }
					],
					[
						{ type: "number", value: 2 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>32.8</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>19.1</mn><mo>°</mo><mi>C</mi>" }] }
					],
					[
						{ type: "number", value: 3 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>35.1</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>21.6</mn><mo>°</mo><mi>C</mi>" }] }
					],
					[
						{ type: "number", value: 4 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>35.7</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>24.2</mn><mo>°</mo><mi>C</mi>" }] }
					],
					[
						{ type: "number", value: 5 },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>35.3</mn><mo>°</mo><mi>C</mi>" }] },
						{ type: "inline", content: [{ type: "math", mathml: "<mn>26.9</mn><mo>°</mo><mi>C</mi>" }] }
					]
				]
			}
		},
		body: [
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"A group of students measured the temperature change over time for a chemical reaction between zinc and hydrochloric acid."
					}
				]
			},
			{ type: "paragraph", content: [{ type: "text", content: "Examine the image below." }] },
			{ type: "blockSlot", slotId: "image_1" },
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"They conducted multiple experiments with different modifications. In one test, they continuously stirred the mixture during the reaction. In another test, they cooled the reaction container in an ice bath before starting. Their data is shown below."
					}
				]
			},
			{ type: "blockSlot", slotId: "temperature_table" },
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						content:
							"Which experiment represents the trial where they continuously stirred the mixture? Justify your answer using evidence from the data."
					}
				]
			},
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "choice_interaction",
				shuffle: true,
				minChoices: 1,
				maxChoices: 1,
				prompt: [
					{
						type: "text",
						content:
							"Which experiment represents the trial where they continuously stirred the mixture? Select one answer."
					}
				],
				choices: [
					{
						identifier: "A",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										content:
											"Test A, because the temperature rose more quickly and reached its peak in less time."
										}
								]
							}
						],
						feedback: null
					},
					{
						identifier: "B",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", content: "Test A, because the temperature decreased in the final minute." }
								]
							}
						],
						feedback: null
					},
					{
						identifier: "C",
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										content:
											"Test B, because the temperature increased more slowly and the total change was smaller."
										}
								]
							}
						],
						feedback: null
					},
					{
						identifier: "D",
						content: [
							{
								type: "paragraph",
								content: [
									{ type: "text", content: "Test B, because the temperature change was more consistent after each minute." }
								]
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
							content:
								"Correct! Stirring increases the frequency of collisions between reactant particles, so the temperature rises more quickly and reaches its peak sooner."
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
								"Not quite. Stirring speeds up the reaction. Look for the test in which the temperature increases faster and reaches its maximum earlier."
						}
					]
				}
			]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain(
		"Which experiment represents the trial where they continuously stirred the mixture? Select one answer."
	)
	// The body question includes an extra instruction; it MUST be preserved
	expect(xml).toContain("Justify your answer using evidence from the data.")
})

test("dedupes paraphrased prompt - pure substances particle diagrams", () => {
	const item: AssessmentItemInput = {
		identifier: "pure-substance-identification-samples",
		title: "Identify Pure Substances from Particle Diagrams",
		responseDeclarations: [
			{ identifier: "RESPONSE", cardinality: "multiple", baseType: "identifier", correct: ["B", "C"] }
		],
		widgets: {
			choice_a_sample: {
				type: "urlImage",
				alt:
					"Two types of particles: one type consists of two red spheres attached to each other, and the second type consists of single pink spheres.",
				url: "https://cdn.kastatic.org/ka-content-images/e4461e542dae08f2320432899f6fcf5c10904a25.png",
				width: 320,
				height: 200,
				caption:
					"Sample with two particle types: diatomic red pairs and single pink spheres.",
				attribution: "Image courtesy of Khan Academy."
			},
			choice_b_sample: {
				type: "urlImage",
				alt: "A crystal with repeating purple and red spheres arranged in a 1:1 ratio.",
				url: "https://cdn.kastatic.org/ka-content-images/ff13b54c6e5612a91b9159451373850a2790dcd4.png",
				width: 320,
				height: 200,
				caption: "Crystalline lattice showing alternating purple and red spheres in a 1:1 pattern.",
				attribution: "Sodium bromide crystal structure rendering; public domain."
			},
			choice_c_sample: {
				type: "urlImage",
				alt: "Green diatomic molecules; each consists of two green spheres connected to each other.",
				url: "https://cdn.kastatic.org/ka-content-images/2ce2c30ea6cee965835267b3163e05b73e37f8ac.png",
				width: 320,
				height: 200,
				caption: "Sample of green diatomic molecules, each made of two connected green spheres.",
				attribution: "Image courtesy of Khan Academy."
			},
			choice_d_sample: {
				type: "urlImage",
				alt:
					"Three types of particles: one type consists of two red spheres attached to each other; the second type consists of large purple spheres; the third type consists of tiny pink spheres.",
				url: "https://cdn.kastatic.org/ka-content-images/a7d2f5587b0e20be9619a940046ba8d245175b13.png",
				width: 320,
				height: 200,
				caption:
					"Sample with three particle types: red diatomic pairs, large purple spheres, and tiny pink spheres.",
				attribution: "Image courtesy of Khan Academy."
			}
		},
		body: [
			{ type: "paragraph", content: [{ type: "text", content: "Which of the following samples depicts a pure substance?" }] },
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "RESPONSE",
				shuffle: true,
				minChoices: 1,
				maxChoices: 4,
				prompt: [
					{ type: "text", content: "Which of the following samples depict pure substances? Select all that apply." }
				],
				choices: [
					{ identifier: "A", content: [{ type: "blockSlot", slotId: "choice_a_sample" }], feedback: [
						{ type: "text", content: "This sample contains two different substances that are not chemically bonded together. One substance is made of atoms, and the other is made of diatomic molecules. A pure substance may consist of one type of atom or a fixed combination of different atoms bonded together." }
					] },
					{ identifier: "B", content: [{ type: "blockSlot", slotId: "choice_b_sample" }], feedback: [
						{ type: "text", content: "This is a sample of a crystalline compound made of two different elements chemically combined in a repeating " },
						{ type: "math", mathml: "<mn>1</mn><mo>:</mo><mn>1</mn>" },
						{ type: "text", content: " ratio. This is a pure substance." }
					] },
					{ identifier: "C", content: [{ type: "blockSlot", slotId: "choice_c_sample" }], feedback: [
						{ type: "text", content: "This is a sample of a diatomic element composed of one type of molecule. This is a pure substance." }
					] },
					{ identifier: "D", content: [{ type: "blockSlot", slotId: "choice_d_sample" }], feedback: [
						{ type: "text", content: "This sample contains three different substances that are not chemically bonded together. Two substances are made of atoms, and the third is a diatomic element. A pure substance may consist of one type of atom or a fixed combination of different atoms bonded together." }
					] }
				]
			}
		},
		feedback: {
			correct: [
				{
					type: "paragraph",
					content: [
						{ type: "text", content: "Correct! A pure substance can be either a compound with a fixed ratio of elements or an element consisting of identical particles. For example, an ionic crystal with a " },
						{ type: "math", mathml: "<mn>1</mn><mo>:</mo><mn>1</mn>" },
						{ type: "text", content: " ratio and a diatomic element made of identical molecules are both pure substances." }
					]
				}
			],
			incorrect: [
				{
					type: "paragraph",
					content: [
						{ type: "text", content: "Not quite. A pure substance contains only one kind of particle: either a single element (atoms or identical molecules of one element) or a compound with a fixed chemical composition. Mixtures contain two or more different particles that are not chemically bonded together." }
					]
				}
			]
		}
	}

	const xml = compile(item)
	// Prompt must be present
	expect(xml).toContain("Which of the following samples depict pure substances? Select all that apply.")
	// Body variant should be removed
	expect(xml).not.toContain("<p>Which of the following samples depicts a pure substance?</p>")
})
