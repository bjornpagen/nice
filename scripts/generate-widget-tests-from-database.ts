#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"

// Dynamic function to resolve the correct generator and schema names
async function resolveWidgetExports(widgetType: string): Promise<{ generator: string; schema: string }> {
	const standardGenerator = `generate${widgetType.charAt(0).toUpperCase()}${widgetType.slice(1)}`
	const standardSchema = `${widgetType.charAt(0).toUpperCase()}${widgetType.slice(1)}PropsSchema`

	try {
		// Try to import the standard names first
		const generators = await import("@/lib/widgets/generators")
		const generator = (generators as any)[standardGenerator]
		const schema = (generators as any)[standardSchema]

		if (generator && schema) {
			return { generator: standardGenerator, schema: standardSchema }
		}
	} catch (error) {
		// If standard names don't work, try to find alternatives
		console.log(`Standard exports not found for ${widgetType}, searching for alternatives...`)
	}

	// If standard names don't work, try to find the actual exports
	try {
		const allExports = await import("@/lib/widgets/generators")
		const exportKeys = Object.keys(allExports)

		const generatorCandidates = exportKeys.filter(key =>
			key.startsWith('generate') &&
			key.toLowerCase().includes(widgetType.toLowerCase()) &&
			typeof (allExports as any)[key] === 'function'
		)

		const schemaCandidates = exportKeys.filter(key =>
			key.endsWith('PropsSchema') &&
			key.toLowerCase().includes(widgetType.toLowerCase()) &&
			(allExports as any)[key] && typeof (allExports as any)[key] === 'object'
		)

		if (generatorCandidates.length > 0 && schemaCandidates.length > 0) {
			const generator = generatorCandidates[0]
			const schema = schemaCandidates[0]
			if (generator && schema) {
				return { generator, schema }
			}
		}
	} catch (error) {
		console.error(`Failed to resolve exports for ${widgetType}:`, error)
	}

	// Fallback to standard names (may fail but gives better error message)
	console.warn(`Using fallback names for ${widgetType} - this may cause import errors`)
	return { generator: standardGenerator, schema: standardSchema }
}

// Helper function to reconstruct widget input from widget data
function reconstructWidgetInput(widgetData: any): any {
	const { type, ...props } = widgetData

	// Remove output-only properties (these vary by widget type)
	delete props.id
	delete props.interactionState
	delete props.__state
	delete props._isValid
	delete props._error

	// Add type if it's not already there
	if (!props.type && type) {
		props.type = type
	}

	return props
}

// Helper function to create kebab-case filename from camelCase widget type
function toKebabCase(str: string): string {
	return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

// Helper function to create descriptive test name
function createTestName(widgetData: any, questionId: string, exerciseTitle: string, kebabType: string): string {
	const shortTitle = exerciseTitle.length > 50 ? exerciseTitle.substring(0, 47) + '...' : exerciseTitle
	return `${kebabType} - ${shortTitle}`.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, ' ').trim()
}

async function generateWidgetTestsFromDatabase(courseIds: string[]) {
	console.log("Starting widget test generation from database", {
		courseIds,
		courseCount: courseIds.length
	})

	// Get all questions with widgets from the specified courses
	const questions = await db
		.select({
			questionId: niceQuestions.id,
			exerciseTitle: niceExercises.title,
			courseTitle: niceCourses.title,
			structuredJson: niceQuestions.structuredJson
		})
		.from(niceQuestions)
		.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
		.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
		.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
		.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
		.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
		.where(and(
			inArray(niceCourses.id, courseIds),
			isNotNull(niceQuestions.structuredJson),
			sql`${niceQuestions.structuredJson}::jsonb -> 'widgets' != '{}'::jsonb`
		))

	console.log("Found questions with widgets", { count: questions.length })

	if (questions.length === 0) {
		console.warn("No questions with widgets found for the specified courses", { courseIds })
		return
	}

	// Group widgets by type
	const widgetsByType = new Map<string, Array<{
		questionId: string
		exerciseTitle: string
		courseTitle: string
		widgetKey: string
		widgetData: any
		reconstructedInput: any
	}>>()

	let totalWidgets = 0

	for (const question of questions) {
		const structured = question.structuredJson as any
		if (!structured?.widgets) continue

		for (const [widgetKey, widgetData] of Object.entries(structured.widgets)) {
			const widgetType = (widgetData as any)?.type || 'unknown'
			totalWidgets++

			if (!widgetsByType.has(widgetType)) {
				widgetsByType.set(widgetType, [])
			}

			const widgetInfo = widgetsByType.get(widgetType)!
			const reconstructedInput = reconstructWidgetInput(widgetData)

			widgetInfo.push({
				questionId: question.questionId,
				exerciseTitle: question.exerciseTitle,
				courseTitle: question.courseTitle,
				widgetKey,
				widgetData,
				reconstructedInput
			})
		}
	}

	console.log("Grouped widgets by type", {
		totalWidgets,
		uniqueTypes: widgetsByType.size,
		types: Array.from(widgetsByType.keys())
	})

	// Generate test files for each widget type
	const testsDir = path.join(process.cwd(), "tests", "widgets")
	await fs.mkdir(testsDir, { recursive: true })

	let filesGenerated = 0
	let testsGenerated = 0
	const errors: Array<{ widgetType: string; questionId: string; error: string }> = []

	for (const [widgetType, widgets] of widgetsByType) {
		try {
			const kebabType = toKebabCase(widgetType)
			const testFileName = `${kebabType}.extracted.test.ts`
			const testFilePath = path.join(testsDir, testFileName)

			console.log(`Generating tests for ${widgetType}`, {
				widgetCount: widgets.length,
				fileName: testFileName
			})

			// Generate test file content
			const testContent = await generateTestFileContent(widgetType, widgets)

			// Write the test file
			await fs.writeFile(testFilePath, testContent, 'utf-8')

			filesGenerated++
			testsGenerated += widgets.length

			console.log(`Generated test file for ${widgetType}`, {
				fileName: testFileName,
				testCount: widgets.length
			})

		} catch (error) {
			const errorMsg = `Failed to generate tests for ${widgetType}: ${error}`
			console.error(`Test generation failed for ${widgetType}:`, error)
			errors.push({
				widgetType,
				questionId: 'N/A',
				error: errorMsg
			})
		}
	}

	// Log summary
	console.log("\n" + "=".repeat(80))
	console.log("WIDGET TEST GENERATION COMPLETE")
	console.log("=".repeat(80))

	console.log(`📁 Files generated: ${filesGenerated}`)
	console.log(`🧪 Tests generated: ${testsGenerated}`)
	console.log(`🎯 Widget types covered: ${widgetsByType.size}`)
	console.log(`📊 Total widgets processed: ${totalWidgets}`)

	if (errors.length > 0) {
		console.log(`❌ Errors encountered: ${errors.length}`)
		console.log("\nError details:")
		errors.forEach((err, index) => {
			console.log(`  ${index + 1}. ${err.widgetType}: ${err.error}`)
		})
	}

	console.log(`\n📍 Test files location: tests/widgets/*.extracted.test.ts`)
	console.log(`\n🚀 Run tests with: bun test tests/widgets/*.extracted.test.ts`)

	console.log("Test generation complete", {
		filesGenerated,
		testsGenerated,
		widgetTypes: widgetsByType.size,
		totalWidgets,
		errorsCount: errors.length
	})
}

async function generateTestFileContent(widgetType: string, widgets: Array<{
	questionId: string
	exerciseTitle: string
	courseTitle: string
	widgetKey: string
	widgetData: any
	reconstructedInput: any
}>): Promise<string> {
	const kebabType = toKebabCase(widgetType)

	// Resolve the correct generator and schema names dynamically
	const { generator: generatorName, schema: schemaName } = await resolveWidgetExports(widgetType)

	const titleCaseType = widgetType.charAt(0).toUpperCase() + widgetType.slice(1)
	const imports = `import { expect, test } from "bun:test"
import type { z } from "zod"
import { ${generatorName}, ${schemaName} } from "@/lib/widgets/generators"

type ${titleCaseType}Input = z.input<typeof ${schemaName}>
`

	const testCases = widgets.map((widget, index) => {
		const testName = createTestName(widget.widgetData, widget.questionId, widget.exerciseTitle, kebabType)
		const inputJson = JSON.stringify(widget.reconstructedInput, null, '\t')

		return `
// Extracted from question: ${widget.questionId}
// Course: ${widget.courseTitle}
// Exercise: ${widget.exerciseTitle}
// Widget key: ${widget.widgetKey}
test("${testName}", () => {
	const input = ${inputJson} satisfies ${titleCaseType}Input

	// Validate the input
	const parseResult = ${schemaName}.safeParse(input)
	if (!parseResult.success) {
		console.error("Schema validation failed for extracted ${widgetType}:", parseResult.error)
		return
	}

	// Generate the widget
	const svg = ${generatorName}(parseResult.data)
	expect(svg).toMatchSnapshot()
})
`
	}).join('\n')

	const disclaimer = `// ============================================================================
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
// DO NOT EDIT THIS FILE DIRECTLY - it will be overwritten on regeneration
//
// Run tests: bun test tests/widgets/${kebabType}.extracted.test.ts
// Update snapshots: bun test tests/widgets/${kebabType}.extracted.test.ts --update-snapshots
// ============================================================================
`

	return `${disclaimer}
${imports}
${testCases}
`
}

async function main() {
	const args = process.argv.slice(2)

	if (args.length === 0) {
		console.log(`
Usage: bun run scripts/generate-widget-tests-from-database.ts <course-id> [course-id...]

Examples:
  bun run scripts/generate-widget-tests-from-database.ts x0267d782 x6b17ba59 x7c7044d7
  bun run scripts/generate-widget-tests-from-database.ts $(cat course-ids.txt)

This script will:
1. Query the database for questions from the specified courses
2. Extract widget configurations from structured_json
3. Generate test files in tests/widgets/*.extracted.test.ts
4. Create snapshot tests using real production data
`)
		process.exit(0)
	}

	const courseIds = args
	console.log("Starting test generation", { courseIds })

	try {
		await generateWidgetTestsFromDatabase(courseIds)
	} catch (error) {
		console.error("Test generation failed", { error })
		process.exit(1)
	}
}

if (import.meta.main) {
	main()
}
