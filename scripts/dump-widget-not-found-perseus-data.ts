/**
 * Script to dump Perseus JSON data for a list of question IDs.
 *
 * Prerequisites:
 * - Input JSON file with question IDs must exist
 * - Database connection must be available
 *
 * Usage:
 *   bun run scripts/dump-widget-not-found-perseus-data.ts <path-to-question-ids.json>
 *
 * Example:
 *   bun run scripts/dump-widget-not-found-perseus-data.ts widget-not-found-question-ids.json
 *   bun run scripts/dump-widget-not-found-perseus-data.ts non-widget-error-question-ids.json
 *
 * Output:
 *   Creates a markdown file with the same base name as input (e.g., widget-not-found-perseus-data.md)
 */

import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"

async function main(inputFilePath: string) {
	logger.info("starting perseus data dump", { inputFile: inputFilePath })

	// Read the question IDs from the JSON file
	const questionIdsPath = path.isAbsolute(inputFilePath) ? inputFilePath : path.join(process.cwd(), inputFilePath)
	const readResult = errors.trySync(() => fs.readFileSync(questionIdsPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read question ids file", { error: readResult.error })
		throw errors.wrap(readResult.error, "read question ids")
	}

	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse question ids json", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "parse question ids")
	}

	// Validate the parsed data with Zod
	const QuestionIdsSchema = z.array(z.string())
	const validationResult = QuestionIdsSchema.safeParse(parseResult.data)
	if (!validationResult.success) {
		logger.error("invalid question ids format", { error: validationResult.error })
		throw errors.new("invalid question ids format")
	}

	const questionIds = validationResult.data
	logger.info("loaded question ids", { count: questionIds.length })

	// Initialize markdown content
	const inputBaseName = path.basename(inputFilePath, ".json")
	let markdownContent = `# Perseus Data for ${inputBaseName}\n\n`
	markdownContent += `Generated on: ${new Date().toISOString()}\n\n`
	markdownContent += `Source File: ${inputFilePath}\n\n`
	markdownContent += `Total Questions: ${questionIds.length}\n\n`
	markdownContent += "---\n\n"

	// Process in batches to avoid overwhelming the database
	const batchSize = 50
	let processedCount = 0
	let foundCount = 0

	for (let i = 0; i < questionIds.length; i += batchSize) {
		const batch = questionIds.slice(i, i + batchSize)
		logger.debug("processing batch", {
			batchNumber: Math.floor(i / batchSize) + 1,
			batchSize: batch.length,
			progress: `${i}/${questionIds.length}`
		})

		// Query the database for this batch
		const queryResult = await errors.try(
			db
				.select({
					id: niceQuestions.id,
					parsedData: niceQuestions.parsedData,
					exerciseId: niceQuestions.exerciseId,
					exerciseSlug: niceExercises.slug,
					exerciseTitle: niceExercises.title
				})
				.from(niceQuestions)
				.leftJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
				.where(inArray(niceQuestions.id, batch))
		)

		if (queryResult.error) {
			logger.error("database query failed", {
				error: queryResult.error,
				batchStart: i,
				batchEnd: i + batch.length
			})
			throw errors.wrap(queryResult.error, "database query")
		}

		// Create a map for easy lookup
		const questionsMap = new Map(queryResult.data.map((q) => [q.id, q]))

		// Process each question ID in order
		for (const questionId of batch) {
			processedCount++
			const question = questionsMap.get(questionId)

			if (!question) {
				logger.warn("question not found in database", { questionId })
				markdownContent += `## Question ID: ${questionId}\n\n`
				markdownContent += "**Status**: Not found in database\n\n"
				markdownContent += "---\n\n"
				continue
			}

			if (!question.parsedData) {
				logger.warn("question has no perseus data", { questionId })
				markdownContent += `## Question ID: ${questionId}\n\n`
				markdownContent += "**Status**: No Perseus data available\n\n"
				markdownContent += `**Exercise Slug**: ${question.exerciseSlug || "N/A"}\n\n`
				markdownContent += `**Exercise Title**: ${question.exerciseTitle || "N/A"}\n\n`
				markdownContent += `**Exercise ID**: ${question.exerciseId || "N/A"}\n\n`
				markdownContent += "---\n\n"
				continue
			}

			foundCount++

			// Add question to markdown
			markdownContent += `## Question ID: ${questionId}\n\n`
			markdownContent += `**Exercise Slug**: ${question.exerciseSlug || "N/A"}\n\n`
			markdownContent += `**Exercise Title**: ${question.exerciseTitle || "N/A"}\n\n`
			markdownContent += `**Exercise ID**: ${question.exerciseId || "N/A"}\n\n`
			markdownContent += "### Perseus JSON:\n\n"
			markdownContent += "```json\n"
			markdownContent += JSON.stringify(question.parsedData, null, 2)
			markdownContent += "\n```\n\n"
			markdownContent += "---\n\n"
		}

		logger.debug("batch processed", {
			processedCount,
			foundCount,
			notFoundCount: processedCount - foundCount
		})
	}

	// Add summary at the end
	markdownContent += "\n## Summary\n\n"
	markdownContent += `- Total Question IDs: ${questionIds.length}\n`
	markdownContent += `- Questions Found: ${foundCount}\n`
	markdownContent += `- Questions Not Found: ${processedCount - foundCount}\n`

	// Write the markdown file
	const outputFileName = `${inputBaseName.replace("-question-ids", "-perseus-data")}.md`
	const outputPath = path.join(process.cwd(), outputFileName)
	const writeResult = await errors.try(fs.promises.writeFile(outputPath, markdownContent, "utf-8"))

	if (writeResult.error) {
		logger.error("failed to write markdown file", { error: writeResult.error })
		throw errors.wrap(writeResult.error, "write markdown file")
	}

	logger.info("perseus data dump completed", {
		outputFile: outputPath,
		totalQuestions: questionIds.length,
		foundQuestions: foundCount,
		notFoundQuestions: processedCount - foundCount
	})
}

// Get the filepath from command line arguments
const args = process.argv.slice(2)
if (args.length !== 1) {
	logger.error("incorrect number of arguments", {
		expected: 1,
		received: args.length,
		usage: "bun run scripts/dump-widget-not-found-perseus-data.ts <path-to-question-ids.json>"
	})
	process.exit(1)
}

const inputFilePath = args[0]
if (!inputFilePath) {
	logger.error("no input file path provided")
	process.exit(1)
}

// Run the script
const result = await errors.try(main(inputFilePath))
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

logger.info("script completed successfully")
process.exit(0)
