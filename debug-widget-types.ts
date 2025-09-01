#!/usr/bin/env bun
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"

async function main() {
	const courseIds = ["x0267d782"]

	const questions = await db
		.select({
			questionId: niceQuestions.id,
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
		.limit(5)

	console.log("Sample questions with widgets:")
	for (const question of questions) {
		const structured = question.structuredJson as any
		const widgets = structured.widgets || {}
		console.log(`Question ${question.questionId}:`)
		for (const [key, widgetData] of Object.entries(widgets)) {
			const widgetType = (widgetData as any)?.type || 'unknown'
			console.log(`  ${key}: ${widgetType}`)
		}
	}
}

main().catch(console.error)
