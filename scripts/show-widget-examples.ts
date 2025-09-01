#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

async function main() {
	logger.info("showing widget examples from math courses")

	// Get sample questions with widgets from each course
	const sampleQuestionsResult = await errors.try(
		db
			.select({
				questionId: niceQuestions.id,
				courseId: niceCourses.id,
				courseTitle: niceCourses.title,
				exerciseTitle: niceExercises.title,
				structuredJson: niceQuestions.structuredJson
			})
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(and(
				inArray(niceCourses.id, [...HARDCODED_MATH_COURSE_IDS]),
				isNotNull(niceQuestions.structuredJson),
				sql`${niceQuestions.structuredJson}::jsonb -> 'widgets' != '{}'::jsonb`
			))
			.limit(50) // Get more samples for variety
	)

	if (sampleQuestionsResult.error) {
		logger.error("failed to fetch sample questions", { error: sampleQuestionsResult.error })
		throw errors.wrap(sampleQuestionsResult.error, "fetch sample questions")
	}

	const questions = sampleQuestionsResult.data
	logger.info("found sample questions with widgets", { count: questions.length })

	// Group by widget type and collect examples
	const widgetExamples = new Map<string, Array<{
		questionId: string
		courseTitle: string
		exerciseTitle: string
		widgetData: any
		widgetKey: string
	}>>

	for (const question of questions) {
		const structured = question.structuredJson as any
		if (!structured?.widgets) continue

		for (const [widgetKey, widgetData] of Object.entries(structured.widgets)) {
			const widgetType = (widgetData as any)?.type || 'unknown'

			if (!widgetExamples.has(widgetType)) {
				widgetExamples.set(widgetType, [])
			}

			const examples = widgetExamples.get(widgetType)!
			if (examples.length < 3) { // Limit to 3 examples per type
				examples.push({
					questionId: question.questionId,
					courseTitle: question.courseTitle,
					exerciseTitle: question.exerciseTitle,
					widgetData,
					widgetKey
				})
			}
		}
	}

	// Display examples for the top widget types
	const topTypes = [
		'angleDiagram',
		'dataTable',
		'triangleDiagram',
		'numberLine',
		'inequalityNumberLine',
		'scatterPlot',
		'pointPlotGraph'
	]

	console.log("\n" + "=".repeat(100))
	console.log("WIDGET DATA EXAMPLES FOR TEST RECONSTRUCTION")
	console.log("=".repeat(100))

	for (const widgetType of topTypes) {
		const examples = widgetExamples.get(widgetType)
		if (!examples || examples.length === 0) continue

		console.log(`\n🎯 ${widgetType.toUpperCase()} (${examples.length} examples)`)
		console.log("-".repeat(80))

		examples.forEach((example, index) => {
			console.log(`\nExample ${index + 1}:`)
			console.log(`   Question: ${example.questionId}`)
			console.log(`   Course: ${example.courseTitle}`)
			console.log(`   Exercise: ${example.exerciseTitle}`)
			console.log(`   Widget Key: ${example.widgetKey}`)
			console.log(`   Widget Data:`)

			// Pretty print the widget data with indentation
			const widgetJson = JSON.stringify(example.widgetData, null, 3)
			const indented = widgetJson.split('\n').map(line => `      ${line}`).join('\n')
			console.log(indented)

			// Show what input we could reconstruct
			console.log(`\n   → RECONSTRUCTED INPUT:`)
			const reconstructed = reconstructWidgetInput(example.widgetData)
			console.log(`      ${JSON.stringify(reconstructed, null, 2).split('\n').map(line => `      ${line}`).join('\n')}`)

			console.log("-".repeat(40))
		})
	}

	console.log("\n" + "=".repeat(100))
	console.log("SUMMARY")
	console.log("=".repeat(100))

	console.log(`\n✅ Found examples for ${widgetExamples.size} widget types`)
	console.log(`📊 Total examples collected: ${Array.from(widgetExamples.values()).reduce((sum, arr) => sum + arr.length, 0)}`)

	const reconstructable = Array.from(widgetExamples.entries()).filter(([type, examples]) =>
		examples.some(ex => canReconstructInput(ex.widgetData))
	).length

	console.log(`🔧 Widget types we can reconstruct input for: ${reconstructable}/${widgetExamples.size}`)

	logger.info("examples analysis complete", {
		widgetTypes: widgetExamples.size,
		totalExamples: Array.from(widgetExamples.values()).reduce((sum, arr) => sum + arr.length, 0)
	})
}

// Helper function to reconstruct widget input from widget data
function reconstructWidgetInput(widgetData: any): any {
	const { type, ...props } = widgetData

	// Remove properties that aren't part of the input schema
	const inputProps = { ...props }

	// Remove output-only properties (these vary by widget type)
	delete inputProps.id
	delete inputProps.interactionState
	delete inputProps.__state
	delete inputProps._isValid
	delete inputProps._error

	// Add type if it's not already there
	if (!inputProps.type && type) {
		inputProps.type = type
	}

	return inputProps
}

// Helper function to check if we can reconstruct input
function canReconstructInput(widgetData: any): boolean {
	try {
		const reconstructed = reconstructWidgetInput(widgetData)
		return Object.keys(reconstructed).length > 1 // Has more than just type
	} catch {
		return false
	}
}

const result = await errors.try(main())
if (result.error) {
	logger.error("examples analysis failed", { error: result.error })
	process.exit(1)
}
