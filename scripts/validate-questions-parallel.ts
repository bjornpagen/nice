#!/usr/bin/env bun

import { writeFileSync } from "node:fs"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas/nice"
import { qti } from "@/lib/clients"

/**
 * parallel qti xml validation script
 *
 * fetches all questions with non-null xml and validates them in parallel
 * against the qti validation service. outputs only the failed validations.
 */

interface ValidationResult {
	questionId: string
	exerciseId: string
	xmlLength: number
	success: boolean
	errors?: string[]
	apiError?: string
	processingTimeMs: number
}

interface ValidationFailure {
	timestamp: string
	questionId: string
	exerciseId: string
	xmlLength: number
	errors?: string[]
	apiError?: string
	processingTimeMs: number
	xml: string
}

async function validateQuestion(question: { id: string; exerciseId: string; xml: string }): Promise<ValidationResult> {
	const startTime = Date.now()

	logger.debug("validating question", {
		questionId: question.id,
		exerciseId: question.exerciseId,
		xmlLength: question.xml.length
	})

	const result: ValidationResult = {
		questionId: question.id,
		exerciseId: question.exerciseId,
		xmlLength: question.xml.length,
		success: false,
		processingTimeMs: 0
	}

	const validationResult = await errors.try(
		qti.validateXml({
			xml: question.xml,
			schema: "item"
		})
	)

	result.processingTimeMs = Date.now() - startTime

	if (validationResult.error) {
		logger.error("qti validation api error", {
			questionId: question.id,
			error: validationResult.error,
			processingTimeMs: result.processingTimeMs
		})
		result.apiError = validationResult.error.toString()
		return result
	}

	const response = validationResult.data
	result.success = response.success
	result.errors = response.validationErrors

	if (response.success) {
		logger.debug("question validation passed", {
			questionId: question.id,
			processingTimeMs: result.processingTimeMs
		})
	} else {
		logger.warn("question validation failed", {
			questionId: question.id,
			errors: response.validationErrors,
			processingTimeMs: result.processingTimeMs
		})
	}

	return result
}

async function main(): Promise<void> {
	logger.info("starting parallel qti validation")

	const startTime = Date.now()
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
	const failuresFile = `qti-validation-failures-${timestamp}.json`

	// fetch all questions with non-null xml
	logger.info("querying questions with xml")
	const questionsResult = await errors.try(
		db
			.select({
				id: niceQuestions.id,
				exerciseId: niceQuestions.exerciseId,
				xml: niceQuestions.xml
			})
			.from(niceQuestions)
			.where(isNotNull(niceQuestions.xml))
	)
	if (questionsResult.error) {
		logger.error("failed to query questions", { error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "database query")
	}

	const questions = questionsResult.data
	logger.info("found questions with xml", { count: questions.length })

	if (questions.length === 0) {
		logger.warn("no questions found with xml data")
		return
	}

	// filter out questions with null xml (shouldn't happen but being safe)
	const validQuestions = questions.filter((q): q is { id: string; exerciseId: string; xml: string } => q.xml !== null)

	if (validQuestions.length !== questions.length) {
		logger.warn("filtered out questions with null xml", {
			originalCount: questions.length,
			filteredCount: validQuestions.length
		})
	}

	// validate questions in batches to avoid overwhelming the api
	const BATCH_SIZE = 20
	const BATCH_DELAY_MS = 500

	logger.info("starting batched parallel validation", {
		questionCount: validQuestions.length,
		batchSize: BATCH_SIZE,
		batchDelayMs: BATCH_DELAY_MS
	})

	const validationResults: PromiseSettledResult<ValidationResult>[] = []

	for (let i = 0; i < validQuestions.length; i += BATCH_SIZE) {
		const batch = validQuestions.slice(i, i + BATCH_SIZE)
		const batchNumber = Math.floor(i / BATCH_SIZE) + 1
		const totalBatches = Math.ceil(validQuestions.length / BATCH_SIZE)

		logger.debug("processing batch", {
			batchNumber,
			totalBatches,
			batchSize: batch.length,
			progress: `${i + batch.length}/${validQuestions.length}`
		})

		const batchResults = await Promise.allSettled(batch.map((question) => validateQuestion(question)))

		validationResults.push(...batchResults)

		// add delay between batches (except for the last batch)
		if (i + BATCH_SIZE < validQuestions.length) {
			await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
		}
	}

	// process results and collect failures
	const failures: ValidationFailure[] = []
	let successCount = 0
	let apiErrorCount = 0
	let validationErrorCount = 0

	for (let i = 0; i < validationResults.length; i++) {
		const result = validationResults[i]
		const question = validQuestions[i]

		if (!result || !question) {
			logger.error("missing result or question data", { index: i })
			continue
		}

		if (result.status === "rejected") {
			// promise rejection - this shouldn't happen bc we handle errors in validateQuestion
			logger.error("unexpected promise rejection", {
				questionId: question.id,
				error: result.reason
			})
			failures.push({
				timestamp: new Date().toISOString(),
				questionId: question.id,
				exerciseId: question.exerciseId,
				xmlLength: question.xml.length,
				apiError: `promise rejection: ${result.reason}`,
				processingTimeMs: 0,
				xml: question.xml
			})
			apiErrorCount++
			continue
		}

		const validationResult = result.value

		if (validationResult.apiError) {
			apiErrorCount++
			failures.push({
				timestamp: new Date().toISOString(),
				questionId: validationResult.questionId,
				exerciseId: validationResult.exerciseId,
				xmlLength: validationResult.xmlLength,
				apiError: validationResult.apiError,
				processingTimeMs: validationResult.processingTimeMs,
				xml: question.xml
			})
		} else if (!validationResult.success) {
			validationErrorCount++
			failures.push({
				timestamp: new Date().toISOString(),
				questionId: validationResult.questionId,
				exerciseId: validationResult.exerciseId,
				xmlLength: validationResult.xmlLength,
				errors: validationResult.errors,
				processingTimeMs: validationResult.processingTimeMs,
				xml: question.xml
			})
		} else {
			successCount++
		}
	}

	const totalTime = Date.now() - startTime

	// write failures to file
	if (failures.length > 0) {
		const writeResult = errors.trySync(() => writeFileSync(failuresFile, JSON.stringify(failures, null, 2)))
		if (writeResult.error) {
			logger.error("failed to write failures file", { error: writeResult.error })
			throw errors.wrap(writeResult.error, "write failures file")
		}
		logger.info("wrote validation failures", { file: failuresFile, count: failures.length })
	}

	// log summary
	logger.info("parallel validation completed", {
		totalQuestions: validQuestions.length,
		successCount,
		validationErrorCount,
		apiErrorCount,
		failureCount: failures.length,
		totalTimeMs: totalTime,
		failuresFile: failures.length > 0 ? failuresFile : "none"
	})

	if (failures.length > 0) {
		logger.info("validation failures summary", {
			failuresFile,
			totalFailures: failures.length,
			totalQuestions: validQuestions.length,
			validationErrors: validationErrorCount,
			apiErrors: apiErrorCount
		})
	}
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
