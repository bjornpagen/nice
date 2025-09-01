#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

async function main() {
	logger.info("counting questions with widgets in math courses", {
		courseIds: HARDCODED_MATH_COURSE_IDS,
		courseCount: HARDCODED_MATH_COURSE_IDS.length
	})

	// Get total questions in math courses
	const totalQuestionsResult = await errors.try(
		db
			.select({ count: sql<number>`count(*)` })
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(inArray(niceCourses.id, [...HARDCODED_MATH_COURSE_IDS]))
	)

	const totalQuestions = totalQuestionsResult.data?.[0]?.count || 0
	logger.info("total questions in math courses", { count: totalQuestions })

	// Get questions with structured_json
	const withStructuredJsonResult = await errors.try(
		db
			.select({ count: sql<number>`count(*)` })
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
	)

	const withStructuredJson = withStructuredJsonResult.data?.[0]?.count || 0
	logger.info("questions with structured_json", { count: withStructuredJson })

	// Get questions with widgets in structured_json
	const withWidgetsResult = await errors.try(
		db
			.select({ count: sql<number>`count(*)` })
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
	)

	const withWidgets = withWidgetsResult.data?.[0]?.count || 0
	logger.info("questions with widgets in structured_json", { count: withWidgets })

	// Get breakdown by course
	const courseBreakdownResult = await errors.try(
		db
			.select({
				courseId: niceCourses.id,
				courseTitle: niceCourses.title,
				totalQuestions: sql<number>`count(*)`,
				withStructuredJson: sql<number>`count(case when ${niceQuestions.structuredJson} is not null then 1 end)`,
				withWidgets: sql<number>`count(case when ${niceQuestions.structuredJson} is not null and ${niceQuestions.structuredJson}::jsonb -> 'widgets' != '{}'::jsonb then 1 end)`
			})
			.from(niceQuestions)
			.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
			.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
			.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
			.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
			.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
			.where(inArray(niceCourses.id, [...HARDCODED_MATH_COURSE_IDS]))
			.groupBy(niceCourses.id, niceCourses.title)
			.orderBy(niceCourses.title)
	)

	const breakdown = courseBreakdownResult.data || []

	// Display results
	console.log("\n" + "=".repeat(80))
	console.log("MATH COURSES WIDGET ANALYSIS")
	console.log("=".repeat(80))

	console.log(`\n📊 OVERALL STATISTICS:`)
	console.log(`   Total questions in math courses: ${totalQuestions.toLocaleString()}`)
	console.log(`   Questions with structured_json: ${withStructuredJson.toLocaleString()} (${((withStructuredJson / totalQuestions) * 100).toFixed(1)}%)`)
	console.log(`   Questions with widgets: ${withWidgets.toLocaleString()} (${((withWidgets / totalQuestions) * 100).toFixed(1)}%)`)

	console.log(`\n📋 PER-COURSE BREAKDOWN:`)
	breakdown.forEach(course => {
		console.log(`\n   ${course.courseTitle} (${course.courseId}):`)
		console.log(`     Total questions: ${course.totalQuestions}`)
		console.log(`     With structured_json: ${course.withStructuredJson} (${((course.withStructuredJson / course.totalQuestions) * 100).toFixed(1)}%)`)
		console.log(`     With widgets: ${course.withWidgets} (${((course.withWidgets / course.totalQuestions) * 100).toFixed(1)}%)`)
	})

	// Summary assessment
	console.log(`\n🎯 ASSESSMENT:`)
	if (withWidgets === 0) {
		console.log(`   ❌ No questions with widgets found in math courses`)
		console.log(`   This means we cannot generate widget tests from the structured_json data`)
	} else if (withWidgets < 10) {
		console.log(`   ⚠️  Only ${withWidgets} questions with widgets found`)
		console.log(`   Limited data available for comprehensive test generation`)
	} else {
		console.log(`   ✅ ${withWidgets} questions with widgets found`)
		console.log(`   Sufficient data available for meaningful test generation`)
	}

	console.log("\n" + "=".repeat(80))

	logger.info("analysis complete", {
		totalQuestions,
		withStructuredJson,
		withWidgets,
		courseCount: HARDCODED_MATH_COURSE_IDS.length
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("analysis failed", { error: result.error })
	process.exit(1)
}
