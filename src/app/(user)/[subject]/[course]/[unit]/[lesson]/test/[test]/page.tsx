import * as logger from "@superbuilders/slog"
import { and, eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { LessonLayout } from "../../lesson-layout"
import { fetchLessonData } from "../../page"
import { TestContent } from "./test-content"

// Query to get the unit from lesson path (tests belong to units, not lessons)
const getUnitByLessonPathQuery = db
	.select({
		id: schema.niceUnits.id,
		path: schema.niceUnits.path
	})
	.from(schema.niceUnits)
	.innerJoin(schema.niceLessons, eq(schema.niceUnits.id, schema.niceLessons.unitId))
	.where(eq(schema.niceLessons.path, sql.placeholder("lessonPath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_test_test_page_get_unit_by_lesson_path")

// Test-specific query - finds test by unit and slug (since tests belong to units)
const getTestByUnitAndSlugQuery = db
	.select({
		id: schema.niceAssessments.id,
		type: schema.niceAssessments.type,
		title: schema.niceAssessments.title,
		slug: schema.niceAssessments.slug,
		description: schema.niceAssessments.description
	})
	.from(schema.niceAssessments)
	.where(
		and(
			eq(schema.niceAssessments.parentId, sql.placeholder("unitId")),
			eq(schema.niceAssessments.slug, sql.placeholder("testSlug")),
			eq(schema.niceAssessments.type, "UnitTest")
		)
	)
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_test_test_page_get_test_by_unit_and_slug")

// Query to fetch all questions for a given test through assessment exercises
const getTestQuestionsQuery = db
	.select({
		id: schema.niceQuestions.id,
		exerciseId: schema.niceQuestions.exerciseId
	})
	.from(schema.niceQuestions)
	.innerJoin(
		schema.niceAssessmentExercises,
		eq(schema.niceQuestions.exerciseId, schema.niceAssessmentExercises.exerciseId)
	)
	.where(eq(schema.niceAssessmentExercises.assessmentId, sql.placeholder("assessmentId")))
	.prepare("src_app_user_subject_course_unit_lesson_test_test_page_get_test_questions")

export type Test = Awaited<ReturnType<typeof getTestByUnitAndSlugQuery.execute>>[0]
export type TestQuestion = Awaited<ReturnType<typeof getTestQuestionsQuery.execute>>[0] & { qtiIdentifier: string }

export type TestData = {
	test: Test
	questions: TestQuestion[]
}

// Consolidated data fetching function for the test page
async function fetchTestData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	test: string
}): Promise<TestData> {
	const decodedTest = decodeURIComponent(params.test)
	const decodedUnit = decodeURIComponent(params.unit)
	const decodedLesson = decodeURIComponent(params.lesson)

	const coursePath = `/${params.subject}/${params.course}`
	const unitPath = `${coursePath}/${decodedUnit}`
	const lessonPath = `${unitPath}/${decodedLesson}`

	// First, find the unit that contains this lesson
	const unitResult = await getUnitByLessonPathQuery.execute({ lessonPath })
	const unit = unitResult[0]

	if (!unit) {
		notFound()
	}

	// Then find the test by unit and slug
	const testResult = await getTestByUnitAndSlugQuery.execute({
		unitId: unit.id,
		testSlug: decodedTest
	})
	const test = testResult[0]

	if (!test) {
		notFound()
	}

	// Fetch questions using the test ID
	const questionsFromDb = await getTestQuestionsQuery.execute({ assessmentId: test.id })

	// Add qtiIdentifier to each question using the new format
	const questions = questionsFromDb.map((q) => ({
		...q,
		qtiIdentifier: `nice:${q.id}`
	}))

	return { test, questions }
}

export default function TestPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; test: string }>
}) {
	logger.info("test page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonData)
	const testDataPromise = params.then(fetchTestData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading test...</div>}>
				<TestContent testDataPromise={testDataPromise} />
			</React.Suspense>
		</LessonLayout>
	)
}
