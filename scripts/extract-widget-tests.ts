import { db } from "@/db"
import { niceQuestions } from "@/db/schemas/nice"
import { sql } from "drizzle-orm"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

interface WidgetTestCase {
	questionId: string
	questionTitle: string
	widgetKey: string
	widgetType: string
	widgetData: any
	widgetNumber?: number
}

interface ExtractedWidget {
	questionId: string
	questionTitle: string
	widgets: Array<{
		key: string
		type: string
		data: any
	}>
}

async function main() {
	logger.info("starting widget test extraction")

	// get all questions with widgets in their structured json
	const result = await errors.try(
		db
			.select({
				id: niceQuestions.id,
				structuredJson: niceQuestions.structuredJson
			})
			.from(niceQuestions)
			.where(sql`structured_json IS NOT NULL AND jsonb_typeof(structured_json->'widgets') = 'object' AND structured_json->'widgets' != '{}'::jsonb`)
	)
	if (result.error) {
		logger.error("failed to fetch questions with widgets", { error: result.error })
		throw errors.wrap(result.error, "database query")
	}

	const questions = result.data
	logger.info("found questions with widgets", { count: questions.length })

	// extract widgets from each question
	const extractedWidgets: ExtractedWidget[] = []
	const widgetTestCases: WidgetTestCase[] = []

	for (const question of questions) {
		const structuredJson = question.structuredJson as any
		
		if (!structuredJson?.widgets || typeof structuredJson.widgets !== "object") {
			continue
		}

		const questionTitle = structuredJson.title || "untitled question"
		const widgets = structuredJson.widgets

		logger.debug("processing question", {
			questionId: question.id,
			questionTitle,
			widgetKeys: Object.keys(widgets)
		})

		const questionWidgets: Array<{ key: string; type: string; data: any }> = []

		for (const [widgetKey, widgetData] of Object.entries(widgets)) {
			if (!widgetData || typeof widgetData !== "object") {
				continue
			}

			const widgetType = (widgetData as any).type
			if (!widgetType || typeof widgetType !== "string") {
				logger.warn("widget missing type field", {
					questionId: question.id,
					widgetKey
				})
				continue
			}

			questionWidgets.push({
				key: widgetKey,
				type: widgetType,
				data: widgetData
			})
		}

		if (questionWidgets.length > 0) {
			extractedWidgets.push({
				questionId: question.id,
				questionTitle,
				widgets: questionWidgets
			})

			// create test cases for each widget
			for (let i = 0; i < questionWidgets.length; i++) {
				const widget = questionWidgets[i]
				if (!widget) continue
				
				const widgetNumber = questionWidgets.filter(w => w.type === widget.type).length > 1 ? i + 1 : undefined

				widgetTestCases.push({
					questionId: question.id,
					questionTitle,
					widgetKey: widget.key,
					widgetType: widget.type,
					widgetData: widget.data,
					widgetNumber
				})
			}
		}
	}

	logger.info("extracted widgets summary", {
		totalQuestions: extractedWidgets.length,
		totalTestCases: widgetTestCases.length
	})

	// group test cases by widget type
	const testCasesByType = new Map<string, WidgetTestCase[]>()
	for (const testCase of widgetTestCases) {
		const existing = testCasesByType.get(testCase.widgetType) || []
		existing.push(testCase)
		testCasesByType.set(testCase.widgetType, existing)
	}

	logger.info("widget types found", {
		types: Array.from(testCasesByType.keys()),
		counts: Object.fromEntries(
			Array.from(testCasesByType.entries()).map(([type, cases]) => [type, cases.length])
		)
	})

	// ensure tests/widgets directory exists
	const testsDir = join(process.cwd(), "tests", "widgets")
	if (!existsSync(testsDir)) {
		mkdirSync(testsDir, { recursive: true })
	}

	// generate test files for each widget type
	for (const [widgetType, testCases] of testCasesByType) {
		const kebabCaseType = widgetType.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
		const testFileName = `${kebabCaseType}.extracted.test.ts`
		const testFilePath = join(testsDir, testFileName)

		logger.info("generating test file", {
			widgetType,
			fileName: testFileName,
			testCaseCount: testCases.length
		})

		const testFileContent = generateTestFile(widgetType, testCases)
		writeFileSync(testFilePath, testFileContent, "utf-8")

		logger.debug("wrote test file", {
			filePath: testFilePath,
			size: testFileContent.length
		})
	}

	logger.info("widget test extraction completed", {
		testFilesGenerated: testCasesByType.size
	})
}

function generateTestFile(widgetType: string, testCases: WidgetTestCase[]): string {
	const kebabCaseType = widgetType.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
	
	const testCaseCode = testCases.map((testCase, index) => {
		const widgetNumberSuffix = testCase.widgetNumber ? ` (${testCase.widgetNumber})` : ""
		const testName = `${kebabCaseType} - [${testCase.questionId}] ${testCase.questionTitle}${widgetNumberSuffix}`
		const cleanTestName = testName.replace(/"/g, '\\"').replace(/\n/g, ' ')
		
		return `\t// Extracted from question: ${testCase.questionId}
\t// Question: ${testCase.questionTitle}
\t// Widget key: ${testCase.widgetKey}
\ttest("${cleanTestName}", async () => {
\t\t// Note: Database data may not match current library schemas exactly
\t\t// Using runtime validation in generateWidget for flexibility
\t\tconst input = ${JSON.stringify(testCase.widgetData, null, 2).replace(/\n/g, '\n\t\t')} as unknown as WidgetInput

\t\t// Generate the widget (includes runtime validation)
\t\tconst result = await errors.try(generateWidget(input as unknown as Widget))
\t\tif (result.error) {
\t\t\t// If widget generation fails, it likely means the database data doesn't match current schema
\t\t\tlogger.error("widget generation failed for ${widgetType}", { 
\t\t\t\terror: result.error,
\t\t\t\tinputData: input
\t\t\t})
\t\t\tthrow errors.wrap(result.error, "widget generation")
\t\t}
\t\t
\t\tconst svg = result.data
\t\texpect(svg).toMatchSnapshot()
\t})`
	}).join("\n\n")

	const header = `// ============================================================================
// EXTRACTED TEST FILE - AUTO-GENERATED
// ============================================================================
// This file was automatically generated from database structured_json data
// Generated on: ${new Date().toISOString()}
// Widget Type: ${widgetType}
// Source: Real questions from database
//
// These tests use actual widget configurations extracted from production data
// to ensure comprehensive test coverage with realistic scenarios.
//
// Note: Database data may not perfectly match current widget schemas, so these
// tests rely on runtime validation within generateWidget() for flexibility.
//
// DO NOT EDIT THIS FILE DIRECTLY - it will be overwritten on regeneration
//
// Run tests: bun test tests/widgets/${kebabCaseType}.extracted.test.ts
// Update snapshots: bun test tests/widgets/${kebabCaseType}.extracted.test.ts --update-snapshots
// ============================================================================`

	return `${header}

import { expect, test } from "bun:test"
import { generateWidget } from "@superbuilders/qti-assessment-item-generator/widgets/widget-generator"
import type { Widget, WidgetInput } from "@superbuilders/qti-assessment-item-generator/widgets/registry"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

${testCaseCode}
`
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
