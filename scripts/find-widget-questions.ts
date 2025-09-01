#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"

async function main() {
	logger.info("finding questions with widgets in structured_json")

	// First, let's see how many questions have structured_json at all
	const totalWithStructuredJsonResult = await errors.try(
		db
			.select({ count: sql<number>`count(*)` })
			.from(niceQuestions)
			.where(isNotNull(niceQuestions.structuredJson))
	)

	const totalWithStructuredJson = totalWithStructuredJsonResult.data?.[0]?.count || 0
	logger.info("total questions with structured_json", { count: totalWithStructuredJson })

	// Now let's find questions that have widgets in their structured_json
	const questionsWithWidgetsResult = await errors.try(
		db
			.select({
				questionId: niceQuestions.id,
				exerciseId: niceQuestions.exerciseId,
				exerciseTitle: niceExercises.title,
				courseId: niceCourses.id,
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
				isNotNull(niceQuestions.structuredJson),
				sql`${niceQuestions.structuredJson}::jsonb -> 'widgets' != '{}'::jsonb`
			))
			.limit(20)
	)

	if (questionsWithWidgetsResult.error) {
		logger.error("failed to fetch questions with widgets", { error: questionsWithWidgetsResult.error })
		throw errors.wrap(questionsWithWidgetsResult.error, "fetch questions with widgets")
	}

	const questionsWithWidgets = questionsWithWidgetsResult.data
	logger.info("found questions with widgets", { count: questionsWithWidgets.length })

	if (questionsWithWidgets.length === 0) {
		console.log("No questions found with widgets in structured_json")
		return
	}

	// Analyze the widgets
	const allWidgetTypes: string[] = []
	const widgetTypeCounts: Record<string, number> = {}

	questionsWithWidgets.forEach((question, index) => {
		console.log(`\n[${index + 1}] Question ID: ${question.questionId}`)
		console.log(`    Course: ${question.courseTitle} (${question.courseId})`)
		console.log(`    Exercise: ${question.exerciseTitle} (${question.exerciseId})`)

		if (question.structuredJson) {
			const structured = question.structuredJson as any

			if (structured.widgets) {
				const widgetKeys = Object.keys(structured.widgets)
				const widgetTypes = Object.values(structured.widgets).map((w: any) => w?.type || 'unknown')

				console.log(`    Widget count: ${widgetKeys.length}`)
				console.log(`    Widget types: ${widgetTypes.join(', ')}`)
				console.log(`    Widget keys: [${widgetKeys.join(', ')}]`)

				// Collect stats
				widgetTypes.forEach(type => {
					allWidgetTypes.push(type)
					widgetTypeCounts[type] = (widgetTypeCounts[type] || 0) + 1
				})

				// Show sample widget data
				if (widgetKeys.length > 0) {
					const firstWidgetKey = widgetKeys[0]
					const firstWidget = firstWidgetKey ? structured.widgets[firstWidgetKey] : undefined
					if (firstWidget) {
						console.log(`\n    Sample widget (${firstWidgetKey}):`)
						console.log(`    ${JSON.stringify(firstWidget, null, 2).split('\n').map(line => `    ${line}`).join('\n')}`)
					}
				}
			}
		}

		console.log("-".repeat(60))
	})

	// Summary
	console.log("\n" + "=".repeat(80))
	console.log("WIDGET TYPE SUMMARY")
	console.log("=".repeat(80))
	Object.entries(widgetTypeCounts)
		.sort(([,a], [,b]) => b - a)
		.forEach(([type, count]) => {
			console.log(`${type}: ${count}`)
		})

	console.log(`\nTotal widget instances: ${allWidgetTypes.length}`)
	console.log(`Unique widget types: ${Object.keys(widgetTypeCounts).length}`)

	logger.info("analysis complete", {
		questionsWithWidgets: questionsWithWidgets.length,
		totalWidgets: allWidgetTypes.length,
		uniqueTypes: Object.keys(widgetTypeCounts).length
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("analysis failed", { error: result.error })
	process.exit(1)
}
