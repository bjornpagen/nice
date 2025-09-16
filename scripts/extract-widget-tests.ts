import { db } from "@/db"
import { niceQuestions, niceCourses, niceExercises, niceLessonContents, niceLessons, niceUnits } from "@/db/schemas/nice"
import { sql, and, eq, inArray, isNotNull } from "drizzle-orm"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs"
import { join } from "path"
import { Command } from "commander"
import { WidgetCollectionNameSchema, type WidgetCollectionName } from "@/inngest/events/qti"

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

interface CLIOptions {
	widgets: string[]
	collections: WidgetCollectionName[]
	courses: string[]
	overwrite: boolean
}

function parseWidgetCollections(): Record<WidgetCollectionName, string[]> {
	const widgetsPath = join(process.cwd(), "widgets.md")
	
	if (!existsSync(widgetsPath)) {
		logger.error("widgets.md file not found", { path: widgetsPath })
		throw errors.new("widgets.md file not found - required for widget collection definitions")
	}
	
	const widgetsContent = readFileSync(widgetsPath, "utf-8")
	const collections: Record<WidgetCollectionName, string[]> = {
		"fourth-grade-math": [],
		"math-core": [],
		"science": [],
		"simple-visual": []
	}
	
	// Parse each collection definition from widgets.md
	for (const collectionName of Object.keys(collections) as WidgetCollectionName[]) {
		const collectionRegex = new RegExp(
			`export const ${collectionName.replace(/-/g, "")}Collection = \\{[\\s\\S]*?schemas: \\{([\\s\\S]*?)\\}`,
			"i"
		)
		
		const match = widgetsContent.match(collectionRegex)
		if (match && match[1]) {
			const schemasSection = match[1]
			// Extract widget names (keys before colons)
			const widgetMatches = schemasSection.match(/(\w+):/g)
			if (widgetMatches) {
				const widgets = widgetMatches.map(w => w.replace(":", ""))
				collections[collectionName] = widgets
				logger.debug("parsed widget collection", { 
					collection: collectionName, 
					widgets: widgets.length 
				})
			}
		} else {
			logger.warn("could not parse widget collection from widgets.md", { 
				collection: collectionName 
			})
		}
	}
	
	// Handle science collection special case (includes simple-visual widgets)
	const simpleVisualWidgets = collections["simple-visual"]
	if (simpleVisualWidgets.length > 0) {
		// Science collection includes all simple-visual widgets plus its own
		const scienceOnlyWidgets = collections["science"].filter(w => !simpleVisualWidgets.includes(w))
		collections["science"] = [...simpleVisualWidgets, ...scienceOnlyWidgets]
	}
	
	return collections
}

function resolveWidgetTypes(options: CLIOptions, widgetCollections: Record<WidgetCollectionName, string[]>): string[] {
	const widgetTypes = new Set<string>()
	
	// Add widgets from --widgets flag
	for (const widgetType of options.widgets) {
		// Convert kebab-case to camelCase
		const camelCase = widgetType.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
		widgetTypes.add(camelCase)
	}
	
	// Add widgets from --collections flag (widget collections)
	for (const collectionName of options.collections) {
		const collectionWidgets = widgetCollections[collectionName]
		if (collectionWidgets) {
			for (const widgetType of collectionWidgets) {
				widgetTypes.add(widgetType)
			}
		}
	}
	
	return Array.from(widgetTypes)
}

async function main() {
	// Setup CLI
	const program = new Command()
	program
		.name("extract-widget-tests")
		.description("Extract widget test cases from database structured JSON")
		.option("-w, --widgets <widgets...>", "only extract specific widget types (kebab-case)", [])
		.option("-c, --collections <collections...>", "extract widgets from specific collections", [])
		.option("--courses <courseIds...>", "only extract from specific course IDs", [])
		.option("--overwrite", "overwrite existing test files", false)
		.parse()

	const options = program.opts<CLIOptions>()
	
	// Validate widget collection names
	for (const collectionName of options.collections) {
		const result = WidgetCollectionNameSchema.safeParse(collectionName)
		if (!result.success) {
			logger.error("invalid widget collection name", { 
				collectionName, 
				validOptions: WidgetCollectionNameSchema.options 
			})
			throw errors.new(`invalid widget collection: ${collectionName}`)
		}
	}
	
	logger.info("starting widget test extraction", {
		widgets: options.widgets,
		collections: options.collections,
		courseFilter: options.courses,
		overwrite: options.overwrite
	})

	// Parse widget collections from widgets.md
	logger.info("parsing widget collections from widgets.md")
	const widgetCollections = parseWidgetCollections()
	
	// Log parsed collections for debugging
	for (const [collectionName, widgets] of Object.entries(widgetCollections)) {
		logger.debug("parsed collection", {
			collection: collectionName,
			widgetCount: widgets.length,
			widgets: widgets.slice(0, 5) // Show first 5 widgets
		})
	}

	// Resolve which widget types to extract
	const targetWidgetTypes = resolveWidgetTypes(options, widgetCollections)
	if (targetWidgetTypes.length > 0) {
		logger.info("filtering to specific widget types", { 
			widgetTypes: targetWidgetTypes,
			count: targetWidgetTypes.length 
		})
	}

	// Build database query with optional course filtering
	let query = db
		.select({
			id: niceQuestions.id,
			structuredJson: niceQuestions.structuredJson
		})
		.from(niceQuestions)
		.where(sql`structured_json IS NOT NULL AND jsonb_typeof(structured_json->'widgets') = 'object' AND structured_json->'widgets' != '{}'::jsonb`)

	// Add course filtering if specified
	if (options.courses.length > 0) {
		query = db
			.select({
				id: niceQuestions.id,
				structuredJson: niceQuestions.structuredJson
			})
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(and(
				inArray(niceCourses.id, options.courses),
				isNotNull(niceQuestions.structuredJson),
				sql`jsonb_typeof(structured_json->'widgets') = 'object' AND structured_json->'widgets' != '{}'::jsonb`
			))
	}

	const result = await errors.try(query)
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

		// Filter widgets based on CLI options
		const filteredWidgets = targetWidgetTypes.length > 0 
			? questionWidgets.filter(w => targetWidgetTypes.includes(w.type))
			: questionWidgets

		if (filteredWidgets.length > 0) {
			extractedWidgets.push({
				questionId: question.id,
				questionTitle,
				widgets: filteredWidgets
			})

			// create test cases for each filtered widget
			for (let i = 0; i < filteredWidgets.length; i++) {
				const widget = filteredWidgets[i]
				if (!widget) continue
				
				const widgetNumber = filteredWidgets.filter(w => w.type === widget.type).length > 1 ? i + 1 : undefined

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
	let filesGenerated = 0
	let filesSkipped = 0
	
	for (const [widgetType, testCases] of testCasesByType) {
		const kebabCaseType = widgetType.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
		const testFileName = `${kebabCaseType}.extracted.test.ts`
		const testFilePath = join(testsDir, testFileName)

		// Check if file exists and overwrite flag
		if (!options.overwrite && existsSync(testFilePath)) {
			logger.debug("skipping existing test file", {
				widgetType,
				fileName: testFileName,
				testCaseCount: testCases.length
			})
			filesSkipped++
			continue
		}

		logger.info("generating test file", {
			widgetType,
			fileName: testFileName,
			testCaseCount: testCases.length,
			overwriting: existsSync(testFilePath)
		})

		const testFileContent = generateTestFile(widgetType, testCases)
		writeFileSync(testFilePath, testFileContent, "utf-8")
		filesGenerated++

		logger.debug("wrote test file", {
			filePath: testFilePath,
			size: testFileContent.length
		})
	}

	logger.info("widget test extraction completed", {
		testFilesGenerated: filesGenerated,
		testFilesSkipped: filesSkipped,
		totalWidgetTypes: testCasesByType.size
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

process.exit(0)
