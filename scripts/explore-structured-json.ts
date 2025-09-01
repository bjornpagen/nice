#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

async function main() {
	logger.info("exploring structured_json data from math courses", {
		courseIds: HARDCODED_MATH_COURSE_IDS,
		courseCount: HARDCODED_MATH_COURSE_IDS.length
	})

	// Get all questions from the hardcoded math courses
	const questionsResult = await errors.try(
		db
			.select({
				questionId: niceQuestions.id,
				exerciseId: niceQuestions.exerciseId,
				exerciseTitle: niceExercises.title,
				courseId: niceCourses.id,
				courseTitle: niceCourses.title,
				structuredJson: niceQuestions.structuredJson,
				parsedData: niceQuestions.parsedData
			})
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(and(
				inArray(niceCourses.id, [...HARDCODED_MATH_COURSE_IDS]),
				isNotNull(niceQuestions.structuredJson)
			))
			.limit(10) // Get first 10 for exploration
	)

	if (questionsResult.error) {
		logger.error("failed to fetch questions", { error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions")
	}

	const questions = questionsResult.data
	logger.info("found questions with structured_json", {
		totalCount: questions.length,
		courseBreakdown: HARDCODED_MATH_COURSE_IDS.reduce((acc: Record<string, number>, courseId) => {
			acc[courseId] = questions.filter(q => q.courseId === courseId).length
			return acc
		}, {})
	})

	// Output the first 5 examples
	console.log("\n" + "=".repeat(80))
	console.log("FIRST 5 QUESTIONS WITH STRUCTURED_JSON DATA")
	console.log("=".repeat(80))

	questions.slice(0, 5).forEach((question, index) => {
		console.log(`\n[${index + 1}] Question ID: ${question.questionId}`)
		console.log(`    Course: ${question.courseTitle} (${question.courseId})`)
		console.log(`    Exercise: ${question.exerciseTitle} (${question.exerciseId})`)
		console.log(`    Has structured_json: ${question.structuredJson ? 'YES' : 'NO'}`)

		if (question.structuredJson) {
			const structured = question.structuredJson as any

			console.log(`    Widgets present: ${structured.widgets ? Object.keys(structured.widgets).length : 0}`)

			if (structured.widgets) {
				console.log(`    Widget types: ${Object.values(structured.widgets).map((w: any) => w?.type || 'unknown').join(', ')}`)
				console.log(`    Widget keys: [${Object.keys(structured.widgets).join(', ')}]`)

				// Show the actual widget data for the first widget
				const firstWidgetKey = Object.keys(structured.widgets)[0]
				if (firstWidgetKey) {
					console.log(`\n    Sample widget data (${firstWidgetKey}):`)
					console.log(`    ${JSON.stringify(structured.widgets[firstWidgetKey], null, 4).split('\n').map(line => `    ${line}`).join('\n')}`)
				}
			}

			console.log(`    Full structured_json keys: [${Object.keys(structured).join(', ')}]`)
		}

		console.log("-".repeat(60))
	})

	// Summary statistics
	const allWidgets = questions.flatMap(q => {
		if (!q.structuredJson) return []
		const structured = q.structuredJson as any
		if (!structured.widgets) return []
		return Object.values(structured.widgets).map((w: any) => w?.type || 'unknown')
	})

	const widgetTypeCounts = allWidgets.reduce((acc: Record<string, number>, type) => {
		acc[type] = (acc[type] || 0) + 1
		return acc
	}, {})

	console.log("\n" + "=".repeat(80))
	console.log("WIDGET TYPE SUMMARY")
	console.log("=".repeat(80))
	Object.entries(widgetTypeCounts)
		.sort(([,a], [,b]) => b - a)
		.forEach(([type, count]) => {
			console.log(`${type}: ${count}`)
		})

	logger.info("exploration complete", {
		questionsAnalyzed: questions.length,
		uniqueWidgetTypes: Object.keys(widgetTypeCounts).length,
		totalWidgets: allWidgets.length
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("exploration failed", { error: result.error })
	process.exit(1)
}
