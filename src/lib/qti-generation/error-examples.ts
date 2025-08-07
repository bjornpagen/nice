/**
 * QTI Validation Error Examples
 *
 * This file contains examples that are designed to fail QTI validation.
 * These are used for testing that our compiler correctly catches various
 * validation errors. Each example represents a specific type of QTI
 * content model violation or XML formatting error.
 *
 * DO NOT include these in the main examples.ts allExamples array!
 */

import type { AssessmentItemInput } from "./schemas"

// Error Class 1: text-entry-interaction placement errors (142 occurrences)
export const textEntryPlacementError1: AssessmentItemInput = {
	identifier: "text-entry-placement-error-1",
	title: "Text Entry Direct After Paragraph",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "answer"
		}
	],
	body: '<p>Enter your answer:</p><slot name="text_entry" />',
	interactions: {
		text_entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 10
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

export const textEntryPlacementError2: AssessmentItemInput = {
	identifier: "text-entry-placement-error-2",
	title: "Text Entry Between Block Elements",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "42"
		}
	],
	body: '<div>Question</div><slot name="entry" /><p>units</p>',
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 5
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Well done!</p>",
		incorrect: "<p>Not quite.</p>"
	}
}

export const textEntryPlacementError3: AssessmentItemInput = {
	identifier: "text-entry-placement-error-3",
	title: "Text Entry in List",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "value"
		}
	],
	body: '<ul><li>Item 1</li><li>Answer: <slot name="answer" /></li></ul>',
	interactions: {
		answer: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 10
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

// Error Class 2: math elements in inline contexts (81 occurrences)
export const mathInlineContextError1: AssessmentItemInput = {
	identifier: "math-inline-context-error-1",
	title: "Math in Paragraph",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "4"
		}
	],
	body: '<p>Solve: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn><mo>+</mo><mn>2</mn></math> = <slot name="answer" /></p>',
	interactions: {
		answer: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 2
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

export const mathInlineContextError2: AssessmentItemInput = {
	identifier: "math-inline-context-error-2",
	title: "Math in Choice Prompt",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "TRUE"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt:
				'Is <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn><mo>+</mo><mn>2</mn><mo>=</mo><mn>4</mn></math>?',
			choices: [
				{
					identifier: "TRUE",
					content: "<p>Yes</p>",
					feedback: null
				},
				{
					identifier: "FALSE",
					content: "<p>No</p>",
					feedback: null
				}
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Incorrect.</p>"
	}
}

export const mathInlineContextError3: AssessmentItemInput = {
	identifier: "math-inline-context-error-3",
	title: "Math in Choice Feedback",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "What is 5 + 5?",
			choices: [
				{
					identifier: "A",
					content: "<p>10</p>",
					feedback:
						'Yes, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn><mo>+</mo><mn>5</mn><mo>=</mo><mn>10</mn></math>'
				},
				{
					identifier: "B",
					content: "<p>11</p>",
					feedback:
						'No, <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn><mo>+</mo><mn>5</mn><mo>≠</mo><mn>11</mn></math>'
				}
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Well done!</p>",
		incorrect: "<p>Please review addition.</p>"
	}
}

// Error Class 3: div elements in inline contexts (78 occurrences)
export const divInlineContextError1: AssessmentItemInput = {
	identifier: "div-inline-context-error-1",
	title: "Div in Choice Content",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "What is the value?",
			choices: [
				{ identifier: "A", content: "<p>5</p>", feedback: null },
				{ identifier: "B", content: "<p>10</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

export const divInlineContextError2: AssessmentItemInput = {
	identifier: "div-inline-context-error-2",
	title: "Div with Widget",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<p>Look at the graph: <slot name="widget1" /></p><slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "What does it show?",
			choices: [
				{ identifier: "A", content: "<p>Linear growth</p>", feedback: null },
				{ identifier: "B", content: "<p>Exponential growth</p>", feedback: null }
			]
		}
	},
	widgets: {
		widget1: {
			type: "number-line",
			labelRange: { min: 0, max: 10, step: 1 },
			labelStyle: "adaptive",
			width: 500,
			height: 200,
			lineRange: { min: 0, max: 10 },
			isInteractive: false,
			snapDivisions: 10
		}
	},
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Look at the scale carefully.</p>"
	}
}

export const divInlineContextError3: AssessmentItemInput = {
	identifier: "div-inline-context-error-3",
	title: "Nested Divs",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "answer"
		}
	],
	body: '<p>Content with <div>nested div</div> inside.</p><slot name="entry" />',
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 10
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

// Error Class 4: Invalid character errors (Char value 25 - 53 occurrences)
export const invalidCharError1: AssessmentItemInput = {
	identifier: "invalid-char-error-1",
	title: "Control Character 25",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select an option",
			choices: [
				{ identifier: "A", content: "<p>Option A</p>", feedback: null },
				{ identifier: "B", content: "<p>Option B</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

export const invalidCharError2: AssessmentItemInput = {
	identifier: "invalid-char-error-2",
	title: "Control Char in Content",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "test"
		}
	],
	body: `<p>Text with control char: ${String.fromCharCode(25)} here</p><slot name="entry" />`,
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 10
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

export const invalidCharError3: AssessmentItemInput = {
	identifier: "invalid-char-error-3",
	title: "Control Char in Choice",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Which option is correct?",
			choices: [
				{
					identifier: "A",
					content: `<p>This is option A${String.fromCharCode(25)}</p>`,
					feedback: null
				},
				{
					identifier: "B",
					content: "<p>This is option B</p>",
					feedback: null
				}
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Incorrect.</p>"
	}
}

// Error Class 5: choice-interaction placement errors (51 occurrences)
export const choiceInteractionPlacementError1: AssessmentItemInput = {
	identifier: "choice-interaction-placement-error-1",
	title: "Choice After Paragraph",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<p>Select your answer:</p><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Choose one:",
			choices: [
				{ identifier: "A", content: "<p>Answer A</p>", feedback: null },
				{ identifier: "B", content: "<p>Answer B</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

export const choiceInteractionPlacementError2: AssessmentItemInput = {
	identifier: "choice-interaction-placement-error-2",
	title: "Choice Between Elements",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "C"
		}
	],
	body: '<div>Instructions</div><slot name="choice" /><p>Additional info</p>',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select your answer:",
			choices: [
				{ identifier: "A", content: "<p>Option 1</p>", feedback: null },
				{ identifier: "B", content: "<p>Option 2</p>", feedback: null },
				{ identifier: "C", content: "<p>Option 3</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Well done!</p>",
		incorrect: "<p>Not quite.</p>"
	}
}

export const choiceInteractionPlacementError3: AssessmentItemInput = {
	identifier: "choice-interaction-placement-error-3",
	title: "Choice After Table",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "B"
		}
	],
	body: '<table><tr><th>X</th><th>Y</th></tr><tr><td>1</td><td>2</td></tr></table><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Based on the table above, select:",
			choices: [
				{ identifier: "A", content: "<p>Choice A</p>", feedback: null },
				{ identifier: "B", content: "<p>Choice B</p>", feedback: null },
				{ identifier: "C", content: "<p>Choice C</p>", feedback: null },
				{ identifier: "D", content: "<p>Choice D</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Excellent!</p>",
		incorrect: "<p>Please review the table.</p>"
	}
}

// Error Class 6: Invalid element names (53 occurrences)
export const invalidElementNameError1: AssessmentItemInput = {
	identifier: "invalid-element-name-error-1",
	title: "Invalid Tag Name",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "answer"
		}
	],
	body: '<p>Question with <x>invalid tag</x></p><slot name="entry" />',
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 10
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

export const invalidElementNameError2: AssessmentItemInput = {
	identifier: "invalid-element-name-error-2",
	title: "Numeric Tag Name",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select:",
			choices: [
				{ identifier: "A", content: "<p>Yes</p>", feedback: null },
				{ identifier: "B", content: "<p>No</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Incorrect.</p>"
	}
}

export const invalidElementNameError3: AssessmentItemInput = {
	identifier: "invalid-element-name-error-3",
	title: "Special Char in Tag",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<p>Text with <test@tag>content</test@tag></p><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Question:",
			choices: [
				{ identifier: "A", content: "<p>A</p>", feedback: null },
				{ identifier: "B", content: "<p>B</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Yes!</p>",
		incorrect: "<p>No.</p>"
	}
}

// Error Class 7: Invalid identifier attribute values (96 occurrences)
export const invalidIdentifierError1: AssessmentItemInput = {
	identifier: "invalid-identifier-error-1",
	title: "Numeric Identifier",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select an option",
			choices: [
				{ identifier: "2", content: "<p>Option 2</p>", feedback: null },
				{ identifier: "3", content: "<p>Option 3</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

export const invalidIdentifierError2: AssessmentItemInput = {
	identifier: "invalid-identifier-error-2",
	title: "Negative Identifier",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select:",
			choices: [
				{ identifier: "-4", content: "<p>Negative 4</p>", feedback: null },
				{ identifier: "-2", content: "<p>Negative 2</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Incorrect.</p>"
	}
}

export const invalidIdentifierError3: AssessmentItemInput = {
	identifier: "invalid-identifier-error-3",
	title: "Special Character Identifier",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Pick one:",
			choices: [
				{ identifier: "x=3pi", content: "<p>x equals 3 pi</p>", feedback: null },
				{ identifier: "y=sqrt100", content: "<p>y equals sqrt 100</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Good!</p>",
		incorrect: "<p>No.</p>"
	}
}

// Error Class 8: Additional invalid character errors (char values 8, 2, etc)
export const invalidCharError4: AssessmentItemInput = {
	identifier: "invalid-char-error-4",
	title: "Control Character 8 (Backspace)",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "answer"
		}
	],
	body: `<p>Text with backspace char: ${String.fromCharCode(8)} here.</p><slot name="entry" />`,
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 10
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

export const invalidCharError5: AssessmentItemInput = {
	identifier: "invalid-char-error-5",
	title: "Control Character 2 (STX)",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: `Question with STX${String.fromCharCode(2)}:`,
			choices: [
				{ identifier: "A", content: "<p>Option A</p>", feedback: null },
				{ identifier: "B", content: "<p>Option B</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Yes!</p>",
		incorrect: "<p>No.</p>"
	}
}

export const invalidCharError6: AssessmentItemInput = {
	identifier: "invalid-char-error-6",
	title: "Control Character 7 (Bell)",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Choose:",
			choices: [
				{
					identifier: "A",
					content: "<p>Option</p>",
					feedback: `Bell char: ${String.fromCharCode(7)}`
				},
				{ identifier: "B", content: "<p>Other</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Right!</p>",
		incorrect: "<p>Wrong.</p>"
	}
}

// Error Class 9: order-interaction placement errors
export const orderInteractionPlacementError1: AssessmentItemInput = {
	identifier: "order-interaction-placement-error-1",
	title: "Order Interaction After Paragraph",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "ordered",
			baseType: "identifier",
			correct: ["A", "B", "C"]
		}
	],
	body: '<p>Order these items:</p><slot name="order" />',
	interactions: {
		order: {
			type: "orderInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			orientation: "vertical",
			prompt: "Arrange in order:",
			choices: [
				{ identifier: "A", content: "<p>First</p>", feedback: null },
				{ identifier: "B", content: "<p>Second</p>", feedback: null },
				{ identifier: "C", content: "<p>Third</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct order!</p>",
		incorrect: "<p>Wrong order.</p>"
	}
}

export const orderInteractionPlacementError2: AssessmentItemInput = {
	identifier: "order-interaction-placement-error-2",
	title: "Order Interaction Between Elements",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "ordered",
			baseType: "identifier",
			correct: ["X", "Y", "Z"]
		}
	],
	body: '<div>Instructions</div><slot name="ordering" /><p>End text</p>',
	interactions: {
		ordering: {
			type: "orderInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			orientation: "horizontal",
			prompt: "Order these:",
			choices: [
				{ identifier: "X", content: "<p>X</p>", feedback: null },
				{ identifier: "Y", content: "<p>Y</p>", feedback: null },
				{ identifier: "Z", content: "<p>Z</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Well done!</p>",
		incorrect: "<p>Try again.</p>"
	}
}

export const orderInteractionPlacementError3: AssessmentItemInput = {
	identifier: "order-interaction-placement-error-3",
	title: "Order Interaction In Choice",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Which is correct?",
			choices: [
				{
					identifier: "A",
					content: '<p>This option has an order interaction: <slot name="order" /></p>',
					feedback: null
				},
				{ identifier: "B", content: "<p>Normal option</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Yes!</p>",
		incorrect: "<p>No.</p>"
	}
}

// Error Class 10: Math elements in wrong places (mo, mi, mn)
export const mathMisplacedElementError1: AssessmentItemInput = {
	identifier: "math-misplaced-element-error-1",
	title: "MO Element Direct in Content",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<p>Math with bare mo: <mo>+</mo> here</p><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select:",
			choices: [
				{ identifier: "A", content: "<p>A</p>", feedback: null },
				{ identifier: "B", content: "<p>B</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Wrong.</p>"
	}
}

export const mathMisplacedElementError2: AssessmentItemInput = {
	identifier: "math-misplaced-element-error-2",
	title: "MI Element Without Math",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "x"
		}
	],
	body: '<p>Variable <mi>x</mi> without math wrapper</p><slot name="entry" />',
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 1
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Yes!</p>",
		incorrect: "<p>No.</p>"
	}
}

export const mathMisplacedElementError3: AssessmentItemInput = {
	identifier: "math-misplaced-element-error-3",
	title: "MN Element in Choice",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Choose number:",
			choices: [
				{ identifier: "A", content: "<p>Number: <mn>42</mn></p>", feedback: null },
				{ identifier: "B", content: "<p>Number: <mn>24</mn></p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Right!</p>",
		incorrect: "<p>Wrong.</p>"
	}
}

// Error Class 11: Table in inline contexts
export const tableInlineError1: AssessmentItemInput = {
	identifier: "table-inline-error-1",
	title: "Table in Paragraph",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<p>Here is a table: <table><tr><td>Cell</td></tr></table> inline</p><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select:",
			choices: [
				{ identifier: "A", content: "<p>Yes</p>", feedback: null },
				{ identifier: "B", content: "<p>No</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Good!</p>",
		incorrect: "<p>Bad.</p>"
	}
}

export const tableInlineError2: AssessmentItemInput = {
	identifier: "table-inline-error-2",
	title: "Table in Choice Content",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select table:",
			choices: [
				{
					identifier: "A",
					content: "<p>Data: <table><tr><td>1</td><td>2</td></tr></table></p>",
					feedback: null
				},
				{ identifier: "B", content: "<p>No table</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Yes!</p>",
		incorrect: "<p>No.</p>"
	}
}

export const tableInlineError3: AssessmentItemInput = {
	identifier: "table-inline-error-3",
	title: "Table in Span",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "answer"
		}
	],
	body: '<p><span>Inline table: <table><tr><th>H</th></tr><tr><td>D</td></tr></table></span></p><slot name="entry" />',
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 10
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Right!</p>",
		incorrect: "<p>Wrong.</p>"
	}
}

// Error Class 12: tfoot placement errors
export const tfootPlacementError1: AssessmentItemInput = {
	identifier: "tfoot-placement-error-1",
	title: "Tfoot Before Tbody",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<table><thead><tr><th>Header</th></tr></thead><tfoot><tr><td>Footer</td></tr></tfoot><tbody><tr><td>Body</td></tr></tbody></table><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Was the table correct?",
			choices: [
				{ identifier: "A", content: "<p>Yes</p>", feedback: null },
				{ identifier: "B", content: "<p>No</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Good!</p>",
		incorrect: "<p>Bad.</p>"
	}
}

export const tfootPlacementError2: AssessmentItemInput = {
	identifier: "tfoot-placement-error-2",
	title: "Tfoot Without Tbody",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "answer"
		}
	],
	body: '<table><thead><tr><th>H1</th><th>H2</th></tr></thead><tfoot><tr><td>F1</td><td>F2</td></tr></tfoot></table><slot name="entry" />',
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 10
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Yes!</p>",
		incorrect: "<p>No.</p>"
	}
}

export const tfootPlacementError3: AssessmentItemInput = {
	identifier: "tfoot-placement-error-3",
	title: "Multiple Tfoot Elements",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "B"
		}
	],
	body: '<table><tfoot><tr><td>Footer 1</td></tr></tfoot><tbody><tr><td>Body</td></tr></tbody><tfoot><tr><td>Footer 2</td></tr></tfoot></table><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Is this valid?",
			choices: [
				{ identifier: "A", content: "<p>Yes</p>", feedback: null },
				{ identifier: "B", content: "<p>No</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Wrong.</p>"
	}
}

// Error Class 13: Entity not defined
export const entityNotDefinedError1: AssessmentItemInput = {
	identifier: "entity-not-defined-error-1",
	title: "NBSP Entity",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "space"
		}
	],
	body: '<p>Non-breaking&nbsp;space here</p><slot name="entry" />',
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 5
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Good!</p>",
		incorrect: "<p>Bad.</p>"
	}
}

export const entityNotDefinedError2: AssessmentItemInput = {
	identifier: "entity-not-defined-error-2",
	title: "Multiple Entities",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select with entities:",
			choices: [
				{ identifier: "A", content: "<p>Line&nbsp;1&mdash;test</p>", feedback: null },
				{ identifier: "B", content: "<p>Line&copy;2&trade;test</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Yes!</p>",
		incorrect: "<p>No.</p>"
	}
}

export const entityNotDefinedError3: AssessmentItemInput = {
	identifier: "entity-not-defined-error-3",
	title: "Custom Entity",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<p>Custom entity: &myentity;</p><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Did you see it?",
			choices: [
				{ identifier: "A", content: "<p>Yes</p>", feedback: null },
				{ identifier: "B", content: "<p>No</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Right!</p>",
		incorrect: "<p>Wrong.</p>"
	}
}

// Error Class 14: Tag mismatch errors
export const tagMismatchError1: AssessmentItemInput = {
	identifier: "tag-mismatch-error-1",
	title: "Unclosed Math Tag",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<p>Math equation: <math xmlns="http://www.w3.org/1998/Math/MathML"><mn>2</mn><mo>+</mo><mn>2</mn></p><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "What is 2+2?",
			choices: [
				{ identifier: "A", content: "<p>4</p>", feedback: null },
				{ identifier: "B", content: "<p>5</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Wrong.</p>"
	}
}

export const tagMismatchError2: AssessmentItemInput = {
	identifier: "tag-mismatch-error-2",
	title: "Mismatched Div and P",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "answer"
		}
	],
	body: '<div>Start of div<p>Paragraph inside</div></p><slot name="entry" />',
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 10
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Good!</p>",
		incorrect: "<p>Bad.</p>"
	}
}

export const tagMismatchError3: AssessmentItemInput = {
	identifier: "tag-mismatch-error-3",
	title: "Wrong Closing Tag",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<p>Text in <span>span</p></span><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Is this valid?",
			choices: [
				{ identifier: "A", content: "<p>No</p>", feedback: null },
				{ identifier: "B", content: "<p>Yes</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Right!</p>",
		incorrect: "<p>Wrong!</p>"
	}
}

// Error Class 15: MathML namespace errors
export const mathmlNamespaceError1: AssessmentItemInput = {
	identifier: "mathml-namespace-error-1",
	title: "Wrong MathML Namespace",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<p>Math: <math xmlns="http://www.w3.org/1998/MathML"><mn>42</mn></math></p><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "What number?",
			choices: [
				{ identifier: "A", content: "<p>42</p>", feedback: null },
				{ identifier: "B", content: "<p>24</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Yes!</p>",
		incorrect: "<p>No.</p>"
	}
}

export const mathmlNamespaceError2: AssessmentItemInput = {
	identifier: "mathml-namespace-error-2",
	title: "Math in QTI Namespace",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "x"
		}
	],
	body: '<p>Variable: <math><mi>x</mi></math></p><slot name="entry" />',
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 1
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Good!</p>",
		incorrect: "<p>Bad.</p>"
	}
}

export const mathmlNamespaceError3: AssessmentItemInput = {
	identifier: "mathml-namespace-error-3",
	title: "Mixed Namespace Elements",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select:",
			choices: [
				{
					identifier: "A",
					content: '<p><math xmlns="http://www.w3.org/1998/Math/MathML"><span>text</span></math></p>',
					feedback: null
				},
				{ identifier: "B", content: "<p>Normal</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Right!</p>",
		incorrect: "<p>Wrong.</p>"
	}
}

// Error Class 16: MathML missing child elements
export const mathmlMissingChildError1: AssessmentItemInput = {
	identifier: "mathml-missing-child-error-1",
	title: "Empty msup Element",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<p>Math: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup></msup></math></p><slot name="choice" />',
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Is this valid?",
			choices: [
				{ identifier: "A", content: "<p>No</p>", feedback: null },
				{ identifier: "B", content: "<p>Yes</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Correct!</p>",
		incorrect: "<p>Wrong.</p>"
	}
}

export const mathmlMissingChildError2: AssessmentItemInput = {
	identifier: "mathml-missing-child-error-2",
	title: "Incomplete msup",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "2"
		}
	],
	body: '<p>x squared: <math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>x</mi></msup></math></p><slot name="entry" />',
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 1
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Yes!</p>",
		incorrect: "<p>No.</p>"
	}
}

export const mathmlMissingChildError3: AssessmentItemInput = {
	identifier: "mathml-missing-child-error-3",
	title: "Wrong msup Children",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Which is x²?",
			choices: [
				{
					identifier: "A",
					content:
						'<p><math xmlns="http://www.w3.org/1998/Math/MathML"><msup><span>x</span><span>2</span></msup></math></p>',
					feedback: null
				},
				{ identifier: "B", content: "<p>x2</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Good!</p>",
		incorrect: "<p>Bad.</p>"
	}
}

// Error Class 17: Invalid character in attribute value
export const invalidAttrCharError1: AssessmentItemInput = {
	identifier: "invalid-attr-char-error-1",
	title: "Control Char in Attribute",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: `<p title="Title with ${String.fromCharCode(25)} char">Text</p><slot name="choice" />`,
	interactions: {
		choice: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Select:",
			choices: [
				{ identifier: "A", content: "<p>A</p>", feedback: null },
				{ identifier: "B", content: "<p>B</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Yes!</p>",
		incorrect: "<p>No.</p>"
	}
}

export const invalidAttrCharError2: AssessmentItemInput = {
	identifier: "invalid-attr-char-error-2",
	title: "Newline in Attribute",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "string",
			correct: "answer"
		}
	],
	body: `<p class="my
class">Text with newline in class</p><slot name="entry" />`,
	interactions: {
		entry: {
			type: "textEntryInteraction",
			responseIdentifier: "RESPONSE",
			expectedLength: 10
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Good!</p>",
		incorrect: "<p>Bad.</p>"
	}
}

export const invalidAttrCharError3: AssessmentItemInput = {
	identifier: "invalid-attr-char-error-3",
	title: "Quote in Attribute",
	responseDeclarations: [
		{
			identifier: "RESPONSE",
			cardinality: "single",
			baseType: "identifier",
			correct: "A"
		}
	],
	body: '<slot name="choice_interaction" />',
	interactions: {
		choice_interaction: {
			type: "choiceInteraction",
			responseIdentifier: "RESPONSE",
			shuffle: true,
			minChoices: 1,
			maxChoices: 1,
			prompt: "Choose:",
			choices: [
				{
					identifier: "A",
					content: '<p data-info="She said "hello" there">Option A</p>',
					feedback: null
				},
				{ identifier: "B", content: "<p>Option B</p>", feedback: null }
			]
		}
	},
	widgets: null,
	feedback: {
		correct: "<p>Right!</p>",
		incorrect: "<p>Wrong.</p>"
	}
}

// Export all error examples as an array for testing
export const allErrorExamples = [
	// Text entry placement errors
	textEntryPlacementError1,
	textEntryPlacementError2,
	textEntryPlacementError3,
	// Math in inline contexts
	mathInlineContextError1,
	mathInlineContextError2,
	mathInlineContextError3,
	// Div in inline contexts
	divInlineContextError1,
	divInlineContextError2,
	divInlineContextError3,
	// Invalid characters
	invalidCharError1,
	invalidCharError2,
	invalidCharError3,
	invalidCharError4,
	invalidCharError5,
	invalidCharError6,
	// Choice interaction placement
	choiceInteractionPlacementError1,
	choiceInteractionPlacementError2,
	choiceInteractionPlacementError3,
	// Invalid element names
	invalidElementNameError1,
	invalidElementNameError2,
	invalidElementNameError3,
	// Invalid identifiers
	invalidIdentifierError1,
	invalidIdentifierError2,
	invalidIdentifierError3,
	// Order interaction placement
	orderInteractionPlacementError1,
	orderInteractionPlacementError2,
	orderInteractionPlacementError3,
	// Math misplaced elements
	mathMisplacedElementError1,
	mathMisplacedElementError2,
	mathMisplacedElementError3,
	// Table in inline contexts
	tableInlineError1,
	tableInlineError2,
	tableInlineError3,
	// Tfoot placement
	tfootPlacementError1,
	tfootPlacementError2,
	tfootPlacementError3,
	// Entity not defined
	entityNotDefinedError1,
	entityNotDefinedError2,
	entityNotDefinedError3,
	// Tag mismatches
	tagMismatchError1,
	tagMismatchError2,
	tagMismatchError3,
	// MathML namespace
	mathmlNamespaceError1,
	mathmlNamespaceError2,
	mathmlNamespaceError3,
	// MathML missing children
	mathmlMissingChildError1,
	mathmlMissingChildError2,
	mathmlMissingChildError3,
	// Invalid attribute characters
	invalidAttrCharError1,
	invalidAttrCharError2,
	invalidAttrCharError3
]
