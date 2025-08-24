#!/usr/bin/env bun
import * as readline from "node:readline/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas/nice"
import { eq, isNotNull } from "drizzle-orm"

// --- Constants ---
const CONFIRMATION = "YES, I AM ABSOLUTELY SURE"
const INDENT_SPACES = "  "

// --- Helper Functions ---

/**
 * Recursively checks if the given JSON object contains any dropdown interactions.
 * This includes top-level inlineChoiceInteractions or dropdowns inside dataTable widgets.
 * @param json The structured JSON object (AssessmentItemInput).
 * @returns true if any dropdown is found, false otherwise.
 */
function hasDropdowns(json: any): boolean {
	if (typeof json !== "object" || json === null) {
		return false
	}

	// Check for top-level inlineChoiceInteraction in 'interactions'
	if (json.interactions && typeof json.interactions === "object") {
		for (const key in json.interactions) {
			const interaction = json.interactions[key]
			if (interaction && typeof interaction === "object" && interaction.type === "inlineChoiceInteraction") {
				return true
			}
		}
	}

	// Check for dropdowns inside 'widgets'
	if (json.widgets && typeof json.widgets === "object") {
		for (const key in json.widgets) {
			const widget = json.widgets[key]
			if (widget && typeof widget === "object" && widget.type === "dataTable") {
				// Check data rows
				if (Array.isArray(widget.data)) {
					for (const row of widget.data) {
						if (Array.isArray(row)) {
							for (const cell of row) {
								if (cell && typeof cell === "object" && cell.type === "dropdown") {
									return true
								}
							}
						}
					}
				}
				// Check footer rows
				if (Array.isArray(widget.footer)) {
					for (const cell of widget.footer) {
						if (cell && typeof cell === "object" && cell.type === "dropdown") {
							return true
						}
					}
				}
			}
		}
	}

	return false // No dropdowns found
}

/**
 * Helper function to format objects for display in the console.
 * Copied and adapted from atom-bomb-wipe.ts for self-containment.
 */
function formatObject(obj: unknown, indentLevel = 0): string {
	const spaces = INDENT_SPACES.repeat(indentLevel)

	if (obj === null) {
		return `${spaces}null`
	}
	if (obj === undefined) {
		return `${spaces}undefined`
	}

	if (typeof obj !== "object") {
		return `${spaces}${JSON.stringify(obj)}`
	}

	if (Array.isArray(obj)) {
		if (obj.length === 0) return `${spaces}[]`
		const formattedItems = obj.map((item) => formatObject(item, indentLevel + 1)).join(",\n")
		return `${spaces}[\n${formattedItems}\n${spaces}]`
	}

	const entries = Object.entries(obj)
	if (entries.length === 0) return `${spaces}{}`

	const lines = entries.map(([key, value]) => {
		if (typeof value === "object" && value !== null && Object.keys(value as object).length > 0) {
			return `${spaces}${INDENT_SPACES}${key}:\n${formatObject(value, indentLevel + 2)}`
		}
		return `${spaces}${INDENT_SPACES}${key}: ${JSON.stringify(value)}`
	})

	return `${spaces}{\n${lines.join(",\n")}\n${spaces}}`
}

/**
 * Asks for user confirmation before performing a destructive action.
 * Copied and adapted from atom-bomb-wipe.ts for self-containment.
 */
async function confirmAction(count: number): Promise<boolean> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

	process.stdout.write(
		"\n🚨 DANGER ZONE 🚨\n" +
			`This will PERMANENTLY NULLIFY structuredJson and XML for ${count} questions.\n` +
			"There is NO UNDO.\n\n" +
			`Type "${CONFIRMATION}" to proceed:\n> `
	)

	const answer = await rl.question("")
	rl.close()

	return answer === CONFIRMATION
}

/**
 * Fetches questions from the database and filters them for dropdown interactions.
 * @returns An array of questions found with dropdowns.
 */
async function fetchQuestionsWithDropdowns(): Promise<
	Array<{ id: string; structuredJson: any; xml: string | null }>
> {
	logger.info("fetching questions with structuredJson")

	const allQuestions = await db
		.select({
			id: niceQuestions.id,
			structuredJson: niceQuestions.structuredJson,
			xml: niceQuestions.xml,
		})
		.from(niceQuestions)
		.where(isNotNull(niceQuestions.structuredJson))

	logger.debug("filtering for dropdowns", { totalQuestions: allQuestions.length })

	const dropdownQuestions = allQuestions.filter((q) => hasDropdowns(q.structuredJson))

	logger.info("dropdown scan complete", {
		scanned: allQuestions.length,
		found: dropdownQuestions.length
	})

	return dropdownQuestions
}

/**
 * Updates the database to nullify structuredJson and xml for a given question.
 * @param questionId The ID of the question to update.
 * @param dryRun If true, only logs the action without performing the update.
 */
async function deleteQuestionData(questionId: string, dryRun: boolean): Promise<void> {
	if (dryRun) {
		logger.debug("dry run: would nullify", { questionId })
		return
	}

	const result = await errors.try(
		db
			.update(niceQuestions)
			.set({ structuredJson: null, xml: null })
			.where(eq(niceQuestions.id, questionId))
	)

	if (result.error) {
		logger.error("failed to nullify question data", { questionId, error: result.error })
		throw errors.wrap(result.error, `failed to nullify data for question ${questionId}`)
	}

	logger.debug("nullified question data", { questionId })
}

/**
 * Main script execution logic.
 */
async function main() {
	const args = process.argv.slice(2)
	const shouldDelete = args.includes("--delete")
	const dryRun = !shouldDelete

	logger.info("starting dropdown scan", { mode: dryRun ? "dry-run" : "delete" })

	const questionsToProcess = await fetchQuestionsWithDropdowns()

	if (questionsToProcess.length === 0) {
		logger.info("no dropdown questions found")
		process.stdout.write("\nNo questions with dropdown interactions found.\n")
		return
	}

	process.stdout.write(`\n✅ Found ${questionsToProcess.length} questions with dropdown interactions\n`)

	if (dryRun) {
		logger.info("dry run complete", { questionsFound: questionsToProcess.length })
		process.stdout.write("\nThis was a DRY RUN. No changes were made.\n")
		process.stdout.write("To perform deletion, re-run with the --delete flag.\n")
		return
	}

	const confirmed = await confirmAction(questionsToProcess.length)
	if (!confirmed) {
		logger.info("deletion aborted by user")
		process.stdout.write("Aborted deletion.\n")
		return
	}

	logger.info("starting deletion", { count: questionsToProcess.length })
	process.stdout.write("\n💣 Nullifying structuredJson and XML data...\n")
	process.stdout.write(`  🚀 Launching ${questionsToProcess.length} parallel updates...\n`)

	const updatePromises = questionsToProcess.map(async (q) => {
		const result = await errors.try(deleteQuestionData(q.id, false))
		return {
			questionId: q.id,
			success: !result.error,
			error: result.error,
		}
	})

	const results = await Promise.allSettled(updatePromises)

	let successCount = 0
	let failedCount = 0
	const failures: Array<{ questionId: string; error: unknown }> = []

	for (const result of results) {
		if (result.status === "fulfilled") {
			const updateResult = result.value
			if (updateResult.success) {
				successCount++
			} else {
				failedCount++
				failures.push({
					questionId: updateResult.questionId,
					error: updateResult.error,
				})
			}
		} else {
			failedCount++
			logger.error("unexpected promise rejection during update", { reason: result.reason })
		}
	}

	logger.info("deletion complete", { 
		success: successCount, 
		failed: failedCount,
		total: questionsToProcess.length 
	})
	
	process.stdout.write(`\nDropdown Wipe Complete:\n`)
	process.stdout.write(`  ✅ Nullified: ${successCount}\n`)
	process.stdout.write(`  ❌ Failed: ${failedCount}\n`)

	if (failures.length > 0) {
		process.stdout.write("\nFailed nullifications:\n")
		for (const failure of failures) {
			process.stdout.write(`  ❌ ${failure.questionId}\n`)
			logger.error("nullification failed", {
				questionId: failure.questionId,
				error: failure.error,
			})
		}
	}
}

// Execute main function
const result = await errors.try(main())
if (result.error) {
	logger.error("fatal script error", { error: result.error })
	process.exit(1)
}

process.exit(0)
