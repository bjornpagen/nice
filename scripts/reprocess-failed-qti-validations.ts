#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { inArray } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas/nice"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"

/**
 * Reprocessing Script for Failed QTI Validations
 *
 * Takes a JSONL failure log from validate-db-qti.ts, clears XML for failed questions,
 * triggers parallel recompilation via Inngest, and re-validates the results.
 */

interface ReprocessingResult {
	questionId: string
	status: "success" | "failed" | "api_error"
	errors?: string[]
	warnings?: string[]
	apiError?: string
	processingTimeMs: number
}

interface ReprocessingSummary {
	totalFailedQuestions: number
	reprocessedQuestions: number
	successfulReprocessing: number
	stillFailingValidation: number
	apiErrors: number
	averageProcessingTime: number
	improvementRate: number
}

async function main(): Promise<void> {
	const failureLogPath = process.argv[2]
	const revalidateOnly = process.argv.includes("--revalidate-only")

	if (!failureLogPath) {
		logger.error("usage: bun run scripts/reprocess-failed-qti-validations.ts <failure-log.jsonl> [--revalidate-only]")
		logger.error(
			"example: bun run scripts/reprocess-failed-qti-validations.ts qti-validation-failures-2025-08-06T01-23-17-419Z.jsonl"
		)
		logger.error(
			"revalidate only: bun run scripts/reprocess-failed-qti-validations.ts qti-validation-failures-2025-08-06T01-23-17-419Z.jsonl --revalidate-only"
		)
		throw errors.new("missing failure log path argument")
	}

	logger.info("starting qti validation reprocessing", { failureLogPath, revalidateOnly })

	// Step 1: Parse failure log to extract failed question IDs
	logger.info("parsing failure log")
	const failedQuestionIds = await parseFailureLog(failureLogPath)
	logger.info("found failed questions", { count: failedQuestionIds.length })

	if (failedQuestionIds.length === 0) {
		logger.warn("no failed questions found in log")
		return
	}

	if (!revalidateOnly) {
		// Step 2: Clear XML for failed questions
		logger.info("clearing xml for failed questions")
		await clearXmlForQuestions(failedQuestionIds)

		// Step 3: Trigger parallel recompilation via Inngest
		logger.info("triggering parallel recompilation")
		await triggerRecompilation(failedQuestionIds)

		// Step 4: Wait for recompilation to complete (with exponential backoff)
		logger.info("waiting for recompilation to complete")
		await waitForRecompilation(failedQuestionIds)
	} else {
		logger.info("skipping xml clearing and recompilation (revalidate-only mode)")
	}

	// Step 5: Re-validate the newly generated XML
	logger.info("re-validating reprocessed questions")
	const revalidationResults = await revalidateQuestions(failedQuestionIds)

	// Step 6: Generate summary report
	const summary = generateReprocessingSummary(failedQuestionIds.length, revalidationResults)

	// Step 7: Write results to file
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
	const resultsFile = `qti-reprocessing-results-${timestamp}.json`

	const output = {
		timestamp: new Date().toISOString(),
		originalFailureLog: failureLogPath,
		summary,
		results: revalidationResults
	}

	const writeResult = errors.trySync(() => writeFileSync(resultsFile, JSON.stringify(output, null, 2)))
	if (writeResult.error) {
		logger.error("failed to write results file", { error: writeResult.error, file: resultsFile })
		throw errors.wrap(writeResult.error, "file write")
	}

	logger.info("reprocessing complete", {
		...summary,
		resultsFile,
		fileSizeKB: Math.round(JSON.stringify(output).length / 1024)
	})
}

async function parseFailureLog(logPath: string): Promise<string[]> {
	const readResult = errors.trySync(() => readFileSync(logPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read failure log", { error: readResult.error, path: logPath })
		throw errors.wrap(readResult.error, "failure log read")
	}

	const lines = readResult.data.trim().split("\n")
	const questionIds: string[] = []

	for (const line of lines) {
		if (!line.trim()) continue

		const parseResult = errors.trySync(() => JSON.parse(line))
		if (parseResult.error) {
			logger.warn("failed to parse log line", { error: parseResult.error, line })
			continue
		}

		const entry = parseResult.data
		if (
			entry &&
			typeof entry === "object" &&
			"type" in entry &&
			"questionId" in entry &&
			entry.type === "validation_failure" &&
			typeof entry.questionId === "string"
		) {
			questionIds.push(entry.questionId)
		}
	}

	return [...new Set(questionIds)] // Remove duplicates
}

async function clearXmlForQuestions(questionIds: string[]): Promise<void> {
	logger.debug("clearing xml for questions", { count: questionIds.length })

	const updateResult = await errors.try(
		db.update(niceQuestions).set({ xml: "" }).where(inArray(niceQuestions.id, questionIds))
	)

	if (updateResult.error) {
		logger.error("failed to clear xml", { error: updateResult.error, count: questionIds.length })
		throw errors.wrap(updateResult.error, "xml clear")
	}

	logger.info("cleared xml for questions", { count: questionIds.length })
}

async function triggerRecompilation(questionIds: string[]): Promise<void> {
	// Generate events for Inngest
	const events = questionIds.map((questionId) => ({
		name: "qti/item.migrate" as const,
		data: { questionId }
	}))

	// Send events in batches to avoid payload size limits
	const BATCH_SIZE = 500
	let sentCount = 0

	for (let i = 0; i < events.length; i += BATCH_SIZE) {
		const batch = events.slice(i, i + BATCH_SIZE)

		const sendResult = await errors.try(inngest.send(batch))
		if (sendResult.error) {
			logger.error("failed to send event batch", {
				error: sendResult.error,
				batchStart: i,
				batchSize: batch.length
			})
			throw errors.wrap(sendResult.error, "event batch send")
		}

		sentCount += batch.length
		logger.debug("sent recompilation events", {
			batchNumber: Math.floor(i / BATCH_SIZE) + 1,
			batchSize: batch.length,
			totalSent: sentCount,
			totalQuestions: questionIds.length
		})
	}

	logger.info("triggered recompilation for all questions", {
		totalEvents: events.length,
		batches: Math.ceil(events.length / BATCH_SIZE)
	})
}

async function waitForRecompilation(questionIds: string[]): Promise<void> {
	const MAX_WAIT_TIME = 30 * 60 * 1000 // 30 minutes max
	const INITIAL_DELAY = 5 * 1000 // Start with 5 seconds
	let currentDelay = INITIAL_DELAY
	const startTime = Date.now()

	logger.debug("starting to wait for recompilation", {
		questionCount: questionIds.length,
		maxWaitMinutes: MAX_WAIT_TIME / 60000
	})

	while (Date.now() - startTime < MAX_WAIT_TIME) {
		// Check how many questions now have non-empty XML
		const checkResult = await errors.try(
			db
				.select({
					id: niceQuestions.id,
					hasXml: niceQuestions.xml
				})
				.from(niceQuestions)
				.where(inArray(niceQuestions.id, questionIds))
		)

		if (checkResult.error) {
			logger.error("failed to check recompilation progress", { error: checkResult.error })
			throw errors.wrap(checkResult.error, "recompilation progress check")
		}

		const questionsWithXml = checkResult.data.filter((q) => q.hasXml && q.hasXml.trim() !== "")
		const completionRate = questionsWithXml.length / questionIds.length

		logger.debug("recompilation progress", {
			completed: questionsWithXml.length,
			total: questionIds.length,
			completionRate: Math.round(completionRate * 100),
			elapsedMinutes: Math.round((Date.now() - startTime) / 60000)
		})

		// If 95% complete, consider it done (some might have failed)
		if (completionRate >= 0.95) {
			logger.info("recompilation appears complete", {
				completedQuestions: questionsWithXml.length,
				totalQuestions: questionIds.length,
				finalCompletionRate: Math.round(completionRate * 100)
			})
			break
		}

		// Wait with exponential backoff
		logger.debug("waiting for more recompilation", { delayMs: currentDelay })
		await new Promise((resolve) => setTimeout(resolve, currentDelay))
		currentDelay = Math.min(currentDelay * 1.5, 60000) // Cap at 1 minute
	}

	const totalWaitTime = Date.now() - startTime
	if (totalWaitTime >= MAX_WAIT_TIME) {
		logger.warn("reached maximum wait time for recompilation", {
			waitTimeMinutes: totalWaitTime / 60000
		})
	}
}

async function revalidateQuestions(questionIds: string[]): Promise<ReprocessingResult[]> {
	const qtiClient = qti
	const results: ReprocessingResult[] = []

	logger.debug("starting revalidation", { questionCount: questionIds.length })

	// Get questions that now have XML
	const questionsResult = await errors.try(
		db
			.select({
				id: niceQuestions.id,
				xml: niceQuestions.xml
			})
			.from(niceQuestions)
			.where(inArray(niceQuestions.id, questionIds))
	)

	if (questionsResult.error) {
		logger.error("failed to fetch questions for revalidation", { error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "revalidation query")
	}

	const questions = questionsResult.data

	// Process questions in parallel batches to avoid overwhelming the API
	const CONCURRENT_VALIDATIONS = 10

	for (let i = 0; i < questions.length; i += CONCURRENT_VALIDATIONS) {
		const batch = questions.slice(i, i + CONCURRENT_VALIDATIONS)

		const batchPromises = batch.map(async (question) => {
			const startTime = Date.now()

			if (!question.xml || question.xml.trim() === "") {
				return {
					questionId: question.id,
					status: "failed" as const,
					errors: ["No XML generated during recompilation"],
					processingTimeMs: Date.now() - startTime
				}
			}

			const validationResult = await errors.try(
				qtiClient.validateXml({
					xml: question.xml,
					schema: "item"
				})
			)

			if (validationResult.error) {
				return {
					questionId: question.id,
					status: "api_error" as const,
					apiError: validationResult.error.toString(),
					processingTimeMs: Date.now() - startTime
				}
			}

			const response = validationResult.data
			if (response.success) {
				return {
					questionId: question.id,
					status: "success" as const,
					warnings:
						"validationWarnings" in response && Array.isArray(response.validationWarnings)
							? response.validationWarnings
							: undefined,
					processingTimeMs: Date.now() - startTime
				}
			}

			return {
				questionId: question.id,
				status: "failed" as const,
				errors: response.validationErrors,
				warnings:
					"validationWarnings" in response && Array.isArray(response.validationWarnings)
						? response.validationWarnings
						: undefined,
				processingTimeMs: Date.now() - startTime
			}
		})

		const batchResults = await Promise.all(batchPromises)
		results.push(...batchResults)

		logger.debug("completed validation batch", {
			batchNumber: Math.floor(i / CONCURRENT_VALIDATIONS) + 1,
			batchSize: batch.length,
			totalCompleted: results.length,
			totalQuestions: questions.length
		})

		// Small delay between batches
		if (i + CONCURRENT_VALIDATIONS < questions.length) {
			await new Promise((resolve) => setTimeout(resolve, 200))
		}
	}

	return results
}

function generateReprocessingSummary(originalFailureCount: number, results: ReprocessingResult[]): ReprocessingSummary {
	const successfulReprocessing = results.filter((r) => r.status === "success").length
	const stillFailingValidation = results.filter((r) => r.status === "failed").length
	const apiErrors = results.filter((r) => r.status === "api_error").length
	const reprocessedQuestions = results.length

	const processingTimes = results.map((r) => r.processingTimeMs)
	const averageProcessingTime =
		processingTimes.length > 0 ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) : 0

	const improvementRate =
		originalFailureCount > 0 ? Math.round((successfulReprocessing / originalFailureCount) * 100) : 0

	return {
		totalFailedQuestions: originalFailureCount,
		reprocessedQuestions,
		successfulReprocessing,
		stillFailingValidation,
		apiErrors,
		averageProcessingTime,
		improvementRate
	}
}

// Execute the script
const scriptResult = await errors.try(main())
if (scriptResult.error) {
	logger.error("reprocessing script failed", { error: scriptResult.error })
	process.exit(1)
}

logger.info("reprocessing script completed successfully")
