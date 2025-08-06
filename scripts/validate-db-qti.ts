#!/usr/bin/env bun

import { appendFileSync, writeFileSync } from "node:fs"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas/nice"
import { qti } from "@/lib/clients"

/**
 * Comprehensive QTI XML Validation Script
 *
 * Validates all questions in the database that have non-null XML against the QTI API.
 * Captures detailed logs, errors, and responses for analysis.
 */

interface ValidationResult {
	questionId: string
	exerciseId: string
	xmlLength: number
	success: boolean
	errors?: string[]
	warnings?: string[] | undefined
	apiError?: string
	processingTimeMs: number
}

interface ValidationSummary {
	totalQuestions: number
	validQuestions: number
	invalidQuestions: number
	apiErrors: number
	averageProcessingTime: number
	errorPatterns: Record<string, number>
	warningPatterns: Record<string, number>
}

async function main(): Promise<void> {
	logger.info("starting db qti validation analysis")

	const qtiClient = qti
	const results: ValidationResult[] = []
	const startTime = Date.now()
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
	const failureLogFile = `qti-validation-failures-${timestamp}.jsonl`

	// Initialize failure log with header
	const headerResult = errors.trySync(() =>
		writeFileSync(
			failureLogFile,
			`{"timestamp":"${new Date().toISOString()}","type":"header","message":"QTI Validation Failures Log"}\n`
		)
	)
	if (headerResult.error) {
		logger.error("failed to initialize failure log", { error: headerResult.error, file: failureLogFile })
		throw errors.wrap(headerResult.error, "failure log initialization")
	}

	logger.info("failure log initialized", { failureLogFile })

	// Query all questions with non-null XML
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
	logger.info("found questions with xml", { count: questions?.length, type: typeof questions })

	if (!questions || !Array.isArray(questions)) {
		logger.error("invalid questions result", { questions })
		throw errors.new("questions query returned invalid data")
	}

	if (questions.length === 0) {
		logger.warn("no questions found with xml data")
		return
	}

	// Process each question
	let processedCount = 0
	for (const question of questions) {
		processedCount++
		const questionStartTime = Date.now()

		logger.debug("validating question", {
			questionId: question.id,
			exerciseId: question.exerciseId,
			progress: `${processedCount}/${questions.length}`,
			xmlLength: question.xml?.length || 0
		})

		const result: ValidationResult = {
			questionId: question.id,
			exerciseId: question.exerciseId,
			xmlLength: question.xml?.length || 0,
			success: false,
			processingTimeMs: 0
		}

		// Validate the XML
		if (!question.xml) {
			logger.warn("question has null xml despite query filter", { questionId: question.id })
			result.apiError = "xml is null"
			result.processingTimeMs = Date.now() - questionStartTime
			results.push(result)
			continue
		}

		const validationResult = await errors.try(
			qtiClient.validateXml({
				xml: question.xml,
				schema: "item"
			})
		)

		result.processingTimeMs = Date.now() - questionStartTime

		if (validationResult.error) {
			logger.error("qti validation api error", {
				questionId: question.id,
				error: validationResult.error,
				processingTimeMs: result.processingTimeMs
			})
			result.apiError = validationResult.error.toString()

			// Immediately write API error to log file
			const apiErrorEntry = {
				timestamp: new Date().toISOString(),
				type: "api_error",
				questionId: question.id,
				exerciseId: question.exerciseId,
				apiError: validationResult.error.toString(),
				processingTimeMs: result.processingTimeMs,
				xmlLength: question.xml?.length || 0,
				xml: question.xml
			}

			const writeApiErrorResult = errors.trySync(() =>
				appendFileSync(failureLogFile, `${JSON.stringify(apiErrorEntry, null, 2)}\n`)
			)
			if (writeApiErrorResult.error) {
				logger.error("failed to write api error entry", {
					error: writeApiErrorResult.error,
					questionId: question.id
				})
			}
		} else {
			const response = validationResult.data
			result.success = response.success
			result.errors = response.validationErrors
			result.warnings =
				"validationWarnings" in response && Array.isArray(response.validationWarnings)
					? response.validationWarnings
					: undefined

			if (response.success) {
				logger.debug("question validation passed", {
					questionId: question.id,
					warnings:
						"validationWarnings" in response && Array.isArray(response.validationWarnings)
							? response.validationWarnings?.length || 0
							: undefined,
					processingTimeMs: result.processingTimeMs
				})
			} else {
				logger.warn("question validation failed", {
					questionId: question.id,
					errors: response.validationErrors,
					warnings:
						"validationWarnings" in response && Array.isArray(response.validationWarnings)
							? response.validationWarnings
							: undefined,
					processingTimeMs: result.processingTimeMs
				})

				// Immediately write failure to log file
				const failureEntry = {
					timestamp: new Date().toISOString(),
					type: "validation_failure",
					questionId: question.id,
					exerciseId: question.exerciseId,
					errors: response.validationErrors,
					warnings:
						"validationWarnings" in response && Array.isArray(response.validationWarnings)
							? response.validationWarnings
							: undefined,
					processingTimeMs: result.processingTimeMs,
					xmlLength: question.xml?.length || 0,
					xml: question.xml
				}

				const writeFailureResult = errors.trySync(() =>
					appendFileSync(failureLogFile, `${JSON.stringify(failureEntry)}\n`)
				)
				if (writeFailureResult.error) {
					logger.error("failed to write failure entry", {
						error: writeFailureResult.error,
						questionId: question.id
					})
				}
			}
		}

		results.push(result)

		// Rate limiting: add delay between requests to avoid overwhelming the API
		await new Promise((resolve) => setTimeout(resolve, 200)) // 100ms delay

		// Progress logging every 10 questions
		if (processedCount % 10 === 0) {
			const validCount = results.filter((r) => r.success).length
			const invalidCount = results.filter((r) => !r.success && !r.apiError).length
			const errorCount = results.filter((r) => r.apiError).length

			logger.info("validation progress", {
				processed: processedCount,
				total: questions.length,
				valid: validCount,
				invalid: invalidCount,
				apiErrors: errorCount,
				percentComplete: Math.round((processedCount / questions.length) * 100)
			})
		}

		// Rate limiting: 100ms delay between requests
		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	// Generate comprehensive summary
	const summary = generateSummary(results)
	const totalTime = Date.now() - startTime

	logger.info("db qti validation analysis complete", {
		...summary,
		totalProcessingTimeMs: totalTime,
		averageQuestionTime: Math.round(totalTime / questions.length)
	})

	// Log detailed error analysis
	if (summary.errorPatterns && Object.keys(summary.errorPatterns).length > 0) {
		const topErrorPatterns: Record<string, number> = {}
		for (const [pattern, count] of Object.entries(summary.errorPatterns)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)) {
			topErrorPatterns[pattern] = count
		}

		logger.info("most common validation errors", {
			errorPatterns: topErrorPatterns
		})
	}

	if (summary.warningPatterns && Object.keys(summary.warningPatterns).length > 0) {
		const topWarningPatterns: Record<string, number> = {}
		for (const [pattern, count] of Object.entries(summary.warningPatterns)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)) {
			topWarningPatterns[pattern] = count
		}

		logger.info("most common validation warnings", {
			warningPatterns: topWarningPatterns
		})
	}

	// Write detailed results to file for analysis
	const resultsFile = `qti-validation-results-${timestamp}.json`

	const fileOutput = {
		timestamp: new Date().toISOString(),
		summary,
		totalProcessingTimeMs: totalTime,
		results: results.map((r) => ({
			questionId: r.questionId,
			exerciseId: r.exerciseId,
			success: r.success,
			errors: r.errors,
			warnings: r.warnings,
			apiError: r.apiError,
			processingTimeMs: r.processingTimeMs,
			xmlLength: r.xmlLength
		}))
	}

	const writeResult = errors.trySync(() => writeFileSync(resultsFile, JSON.stringify(fileOutput, null, 2)))
	if (writeResult.error) {
		logger.error("failed to write results file", { error: writeResult.error, file: resultsFile })
		throw errors.wrap(writeResult.error, "file write")
	}

	logger.info("results written to file", {
		file: resultsFile,
		questionsAnalyzed: fileOutput.results.length,
		fileSizeKB: Math.round(JSON.stringify(fileOutput).length / 1024)
	})

	// Log questions with API errors for investigation
	const apiErrorQuestions = results.filter((r) => r.apiError)
	if (apiErrorQuestions.length > 0) {
		logger.error("questions with api errors", {
			count: apiErrorQuestions.length,
			examples: apiErrorQuestions.slice(0, 5).map((q) => ({
				questionId: q.questionId,
				exerciseId: q.exerciseId,
				error: q.apiError
			}))
		})
	}

	// Log performance metrics
	const processingTimes = results.map((r) => r.processingTimeMs)
	const avgTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
	const maxTime = Math.max(...processingTimes)
	const minTime = Math.min(...processingTimes)

	logger.info("performance metrics", {
		averageProcessingTime: Math.round(avgTime),
		maxProcessingTime: maxTime,
		minProcessingTime: minTime,
		totalApiCalls: results.length,
		successfulCalls: results.filter((r) => !r.apiError).length
	})
}

function generateSummary(results: ValidationResult[]): ValidationSummary {
	const validQuestions = results.filter((r) => r.success).length
	const invalidQuestions = results.filter((r) => !r.success && !r.apiError).length
	const apiErrors = results.filter((r) => r.apiError).length

	const errorPatterns: Record<string, number> = {}
	const warningPatterns: Record<string, number> = {}

	// Analyze error and warning patterns
	for (const result of results) {
		if (result.errors) {
			for (const error of result.errors) {
				// Extract meaningful error patterns
				const pattern = extractErrorPattern(error)
				errorPatterns[pattern] = (errorPatterns[pattern] || 0) + 1
			}
		}

		if (result.warnings) {
			for (const warning of result.warnings) {
				const pattern = extractWarningPattern(warning)
				warningPatterns[pattern] = (warningPatterns[pattern] || 0) + 1
			}
		}
	}

	const processingTimes = results.map((r) => r.processingTimeMs)
	const averageProcessingTime =
		processingTimes.length > 0 ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) : 0

	return {
		totalQuestions: results.length,
		validQuestions,
		invalidQuestions,
		apiErrors,
		averageProcessingTime,
		errorPatterns,
		warningPatterns
	}
}

function extractErrorPattern(error: string): string {
	// Extract meaningful patterns from QTI validation errors
	// Remove specific values and focus on structural issues

	// Common QTI validation error patterns
	if (error.includes("Element") && error.includes("not expected")) {
		const match = error.match(/Element '([^']+)'.*not expected/)
		return match ? `unexpected_element_${match[1]}` : "unexpected_element_unknown"
	}

	if (error.includes("Character content") && error.includes("not allowed")) {
		return "character_content_not_allowed"
	}

	if (error.includes("Missing child element")) {
		const match = error.match(/Missing child element\(s\): (.+)/)
		return match?.[1] ? `missing_child_${match[1].replace(/[, ]/g, "_")}` : "missing_child_unknown"
	}

	if (error.includes("not permitted")) {
		return "element_not_permitted"
	}

	if (error.includes("Invalid content")) {
		return "invalid_content"
	}

	// Fallback: use first few words as pattern
	const words = error.split(/\s+/).slice(0, 3).join("_").toLowerCase()
	return words.replace(/[^a-z0-9_]/g, "")
}

function extractWarningPattern(warning: string): string {
	// Similar to error patterns but for warnings
	const words = warning.split(/\s+/).slice(0, 3).join("_").toLowerCase()
	return words.replace(/[^a-z0-9_]/g, "")
}

// Execute the script
const scriptResult = await errors.try(main())
if (scriptResult.error) {
	logger.error("script execution failed", { error: scriptResult.error })
	process.exit(1)
}

logger.info("script completed successfully")
