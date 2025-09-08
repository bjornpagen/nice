import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { compile } from "@/lib/qti-generation/compiler"
import type { AssessmentItemInput } from "@/lib/qti-generation/schemas"

function buildDiploidItem(): AssessmentItemInput {
	const p1 = "Choose the best phrase to fill in the blank."
	const p2 = "A diploid organism has _____ in each cell."

	const item: AssessmentItemInput = {
		identifier: "diploid-organism-fill-blank-multi",
		title: "Choose the best phrase to fill in the blank",
		responseDeclarations: [{ identifier: "RESPONSE", cardinality: "single", baseType: "identifier", correct: "A" }],
		widgets: null,
		body: [
			{ type: "paragraph", content: [{ type: "text", content: p1 }] },
			{ type: "paragraph", content: [{ type: "text", content: p2 }] },
			{ type: "blockSlot", slotId: "choice_interaction" }
		],
		interactions: {
			choice_interaction: {
				type: "choiceInteraction",
				responseIdentifier: "RESPONSE",
				shuffle: true,
				minChoices: 1,
				maxChoices: 1,
				prompt: [{ type: "text", content: `${p1} ${p2}` }],
				choices: [
					{
						identifier: "A",
						content: [{ type: "paragraph", content: [{ type: "text", content: "two sets of chromosomes" }] }],
						feedback: null
					},
					{
						identifier: "B",
						content: [{ type: "paragraph", content: [{ type: "text", content: "one set of chromosomes" }] }],
						feedback: null
					}
				]
			}
		},
		feedback: {
			correct: [
				{
					type: "paragraph",
					content: [{ type: "text", content: "Correct! A diploid cell contains two sets of chromosomes." }]
				}
			],
			incorrect: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							content: "Not quite. A diploid organism has two complete sets of chromosomes in each cell."
						}
					]
				}
			]
		}
	}
	return item
}

async function main(): Promise<void> {
	const item = buildDiploidItem()
	const result = await errors.try(compile(item))
	if (result.error) {
		logger.error("compile failed", { error: result.error })
		throw errors.wrap(result.error, "compile example")
	}
	// print to stdout
	process.stdout.write(result.data)
}

const run = await errors.try(main())
if (run.error) {
	logger.error("operation failed", { error: run.error })
	process.exit(1)
}
