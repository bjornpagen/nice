#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

async function main() {
	logger.info("analyzing widget types in math courses", {
		courseIds: HARDCODED_MATH_COURSE_IDS,
		courseCount: HARDCODED_MATH_COURSE_IDS.length
	})

	// Get all questions with widgets from math courses
	const questionsResult = await errors.try(
		db
			.select({
				questionId: niceQuestions.id,
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
				inArray(niceCourses.id, [...HARDCODED_MATH_COURSE_IDS]),
				isNotNull(niceQuestions.structuredJson),
				sql`${niceQuestions.structuredJson}::jsonb -> 'widgets' != '{}'::jsonb`
			))
			.limit(1000) // Sample first 1000 for analysis
	)

	if (questionsResult.error) {
		logger.error("failed to fetch questions with widgets", { error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions with widgets")
	}

	const questions = questionsResult.data
	logger.info("analyzing widget types", { questionCount: questions.length })

	// Analyze widget types
	const widgetStats = {
		totalWidgets: 0,
		questionsWithWidgets: questions.length,
		widgetTypes: new Map<string, { count: number; courses: Set<string> }>(),
		widgetTypeCombinations: new Map<string, number>(),
		courseWidgetBreakdown: new Map<string, Map<string, number>>()
	}

	for (const question of questions) {
		const courseTitle = question.courseTitle
		const structured = question.structuredJson as any

		if (!structured?.widgets) continue

		const widgetKeys = Object.keys(structured.widgets)
		const widgetTypes = widgetKeys.map(key => structured.widgets[key]?.type || 'unknown')
		const widgetTypeString = widgetTypes.sort().join(', ')

		// Track per-course breakdown
		if (!widgetStats.courseWidgetBreakdown.has(courseTitle)) {
			widgetStats.courseWidgetBreakdown.set(courseTitle, new Map())
		}
		const courseMap = widgetStats.courseWidgetBreakdown.get(courseTitle)!

		// Count individual widget types
		for (const widgetType of widgetTypes) {
			widgetStats.totalWidgets++

			if (!widgetStats.widgetTypes.has(widgetType)) {
				widgetStats.widgetTypes.set(widgetType, { count: 0, courses: new Set() })
			}
			const typeStats = widgetStats.widgetTypes.get(widgetType)!
			typeStats.count++
			typeStats.courses.add(courseTitle)

			// Per-course count
			courseMap.set(widgetType, (courseMap.get(widgetType) || 0) + 1)
		}

		// Track combinations
		widgetStats.widgetTypeCombinations.set(
			widgetTypeString,
			(widgetStats.widgetTypeCombinations.get(widgetTypeString) || 0) + 1
		)
	}

	// Display results
	console.log("\n" + "=".repeat(80))
	console.log("MATH COURSES WIDGET TYPE ANALYSIS")
	console.log("=".repeat(80))

	console.log(`\n📊 SUMMARY:`)
	console.log(`   Questions analyzed: ${questions.length.toLocaleString()}`)
	console.log(`   Total widgets found: ${widgetStats.totalWidgets.toLocaleString()}`)
	console.log(`   Unique widget types: ${widgetStats.widgetTypes.size}`)
	console.log(`   Average widgets per question: ${(widgetStats.totalWidgets / questions.length).toFixed(2)}`)

	console.log(`\n🎯 WIDGET TYPES (sorted by frequency):`)
	const sortedTypes = Array.from(widgetStats.widgetTypes.entries())
		.sort(([,a], [,b]) => b.count - a.count)

	sortedTypes.forEach(([type, stats]) => {
		const percentage = ((stats.count / widgetStats.totalWidgets) * 100).toFixed(1)
		const courseList = Array.from(stats.courses).join(', ')
		console.log(`   ${type}: ${stats.count.toLocaleString()} (${percentage}%) [${courseList}]`)
	})

	console.log(`\n🏫 PER-COURSE BREAKDOWN:`)
	for (const [courseTitle, courseMap] of widgetStats.courseWidgetBreakdown) {
		console.log(`\n   ${courseTitle}:`)
		const sortedCourseTypes = Array.from(courseMap.entries())
			.sort(([,a], [,b]) => b - a)

		sortedCourseTypes.forEach(([type, count]) => {
			const percentage = ((count / Array.from(courseMap.values()).reduce((a, b) => a + b, 0)) * 100).toFixed(1)
			console.log(`     ${type}: ${count} (${percentage}%)`)
		})
	}

	console.log(`\n🔗 COMMON WIDGET COMBINATIONS:`)
	const sortedCombinations = Array.from(widgetStats.widgetTypeCombinations.entries())
		.sort(([,a], [,b]) => b - a)
		.slice(0, 10) // Top 10 combinations

	sortedCombinations.forEach(([combination, count]) => {
		console.log(`   "${combination}": ${count} questions`)
	})

	console.log(`\n💡 RECOMMENDATIONS:`)
	if (widgetStats.widgetTypes.size <= 5) {
		console.log(`   ✅ Manageable number of widget types (${widgetStats.widgetTypes.size})`)
		console.log(`   Good candidate for comprehensive test generation`)
	} else if (widgetStats.widgetTypes.size <= 10) {
		console.log(`   ⚠️  Moderate number of widget types (${widgetStats.widgetTypes.size})`)
		console.log(`   Consider prioritizing the most common types first`)
	} else {
		console.log(`   🚨 Large number of widget types (${widgetStats.widgetTypes.size})`)
		console.log(`   May want to focus on the top 5-10 most frequent types`)
	}

	console.log("\n" + "=".repeat(80))

	logger.info("analysis complete", {
		questionsAnalyzed: questions.length,
		totalWidgets: widgetStats.totalWidgets,
		uniqueTypes: widgetStats.widgetTypes.size
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("analysis failed", { error: result.error })
	process.exit(1)
}
