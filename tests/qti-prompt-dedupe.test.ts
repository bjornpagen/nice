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
