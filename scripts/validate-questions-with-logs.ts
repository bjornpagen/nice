#!/usr/bin/env bun

import { writeFileSync } from "node:fs"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { isNotNull } from "drizzle-orm"
import { createSpinner } from "nanospinner"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas/nice"
import { qti } from "@/lib/clients"

/**
 * parallel qti validation with enhanced output
 *
 * validates all questions with non-null xml and provides comprehensive
 * failure analysis in a format suitable for llm pattern analysis.
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
		result.apiError = validationResult.error.toString()
		return result
	}

	const response = validationResult.data
	result.success = response.success
	result.errors = response.validationErrors

	return result
}

async function main(): Promise<void> {
	const startTime = Date.now()
	const spinner = createSpinner("loading questions from database...").start()

	// fetch all questions with non-null xml
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
		spinner.error({ text: "failed to load questions from database" })
		logger.error("database query failed", { error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "database query")
	}

	const questions = questionsResult.data
	spinner.update({ text: `found ${questions.length.toLocaleString()} questions to validate...` })

	if (questions.length === 0) {
		spinner.error({ text: "no questions found with xml data" })
		return
	}

	// filter out questions with null xml (shouldn't happen but being safe)
	const validQuestions = questions.filter((q): q is { id: string; exerciseId: string; xml: string } => q.xml !== null)

	// validate questions in batches to avoid overwhelming the api
	const BATCH_SIZE = 20
	const BATCH_DELAY_MS = 500

	spinner.update({ text: `starting validation in ${Math.ceil(validQuestions.length / BATCH_SIZE)} batches...` })

	const validationResults: PromiseSettledResult<ValidationResult>[] = []

	for (let i = 0; i < validQuestions.length; i += BATCH_SIZE) {
		const batch = validQuestions.slice(i, i + BATCH_SIZE)
		const batchNumber = Math.floor(i / BATCH_SIZE) + 1
		const totalBatches = Math.ceil(validQuestions.length / BATCH_SIZE)

		spinner.update({ text: `validating batch ${batchNumber}/${totalBatches}...` })

		const batchResults = await Promise.allSettled(batch.map((question) => validateQuestion(question)))

		validationResults.push(...batchResults)

		// add delay between batches (except for the last batch)
		if (i + BATCH_SIZE < validQuestions.length) {
			await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
		}
	}

	spinner.update({ text: "processing results..." })

	// process results and collect failures
	const failures: ValidationFailure[] = []
	let successCount = 0
	let apiErrorCount = 0
	let validationErrorCount = 0

	for (let i = 0; i < validationResults.length; i++) {
		const result = validationResults[i]
		const question = validQuestions[i]

		if (!result || !question) {
			continue
		}

		if (result.status === "rejected") {
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
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
	const outputFile = `qti-validation-failures-${timestamp}.json`

	// write failures to file if any exist
	if (failures.length > 0) {
		spinner.update({ text: "writing failure analysis..." })
		const writeResult = errors.trySync(() => writeFileSync(outputFile, JSON.stringify(failures, null, 2)))
		if (writeResult.error) {
			spinner.error({ text: "failed to write failures file" })
			logger.error("write failures file failed", { error: writeResult.error })
			throw errors.wrap(writeResult.error, "write failures file")
		}
	}

	spinner.success({ text: "validation completed!" })

	// print beautiful summary
	printBeautifulSummary({
		totalQuestions: validQuestions.length,
		successCount,
		validationErrorCount,
		apiErrorCount,
		failureCount: failures.length,
		totalTimeMs: totalTime,
		outputFile: failures.length > 0 ? outputFile : undefined
	})
}

interface SummaryStats {
	totalQuestions: number
	successCount: number
	validationErrorCount: number
	apiErrorCount: number
	failureCount: number
	totalTimeMs: number
	outputFile?: string
}

function printBeautifulSummary(stats: SummaryStats): void {
	const timeInSeconds = (stats.totalTimeMs / 1000).toFixed(1)

	process.stdout.write(`\n${"=".repeat(70)}\n`)
	process.stdout.write("🧪 QTI VALIDATION ANALYSIS COMPLETE\n")
	process.stdout.write(`${"=".repeat(70)}\n\n`)

	process.stdout.write("📊 VALIDATION STATISTICS\n")
	process.stdout.write(`   Total Questions:     ${stats.totalQuestions.toLocaleString()}\n`)
	process.stdout.write(
		`   ✅ Successful:        ${stats.successCount.toLocaleString()} (${((stats.successCount / stats.totalQuestions) * 100).toFixed(1)}%)\n`
	)
	process.stdout.write(
		`   ❌ Failed:            ${stats.failureCount.toLocaleString()} (${((stats.failureCount / stats.totalQuestions) * 100).toFixed(1)}%)\n\n`
	)

	process.stdout.write("🔍 FAILURE BREAKDOWN\n")
	process.stdout.write(`   🌐 API Errors:        ${stats.apiErrorCount.toLocaleString()}\n`)
	process.stdout.write(`   📝 Validation Errors: ${stats.validationErrorCount.toLocaleString()}\n\n`)

	process.stdout.write("⏱️  PERFORMANCE\n")
	process.stdout.write(`   Execution Time:      ${timeInSeconds}s\n\n`)

	if (stats.outputFile) {
		process.stdout.write("📁 OUTPUT FILES\n")
		process.stdout.write(`   📋 Failure Analysis:  ${stats.outputFile}\n`)
		process.stdout.write("   🔧 Ready for LLM:     ✅\n\n")

		process.stdout.write("💡 NEXT STEPS\n")
		process.stdout.write("   Feed the failure analysis file to an LLM to identify patterns\n")
		process.stdout.write("   in failing questions and validation errors.\n")
		process.stdout.write("   For full logs: run with 2>&1 | tee validation.log\n")
	} else {
		process.stdout.write("🎉 ALL VALIDATIONS PASSED!\n")
		process.stdout.write("   No issues found in the QTI XML validation.\n")
	}

	process.stdout.write(`\n${"=".repeat(70)}\n`)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("wrapper script failed", { error: result.error })
	process.exit(1)
}
