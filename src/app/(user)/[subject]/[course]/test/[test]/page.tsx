import * as logger from "@superbuilders/slog"
import { and, eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { TestContent } from "./test-content"
import { TestLayout } from "./test-layout"

// Query to get course by path
const getCourseByPathQuery = db
	.select({
		id: schema.niceCourses.id,
		title: schema.niceCourses.title,
		path: schema.niceCourses.path
	})
	.from(schema.niceCourses)
	.where(eq(schema.niceCourses.path, sql.placeholder("coursePath")))
	.limit(1)
	.prepare("src_app_user_subject_course_test_test_page_get_course_by_path")

// Query to get course challenge by course ID and slug
const getCourseTestBySlugQuery = db
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
			eq(schema.niceAssessments.parentId, sql.placeholder("courseId")),
			eq(schema.niceAssessments.slug, sql.placeholder("testSlug")),
			eq(schema.niceAssessments.type, "CourseChallenge")
		)
	)
	.limit(1)
	.prepare("src_app_user_subject_course_test_test_page_get_course_test_by_slug")

// Query to fetch all questions for a given course test through assessment exercises
const getTestQuestionsQuery = db
	.select({
		id: schema.niceQuestions.id,
		qtiIdentifier: schema.niceQuestions.qtiIdentifier,
		exerciseId: schema.niceQuestions.exerciseId
	})
	.from(schema.niceQuestions)
	.innerJoin(
		schema.niceAssessmentExercises,
		eq(schema.niceQuestions.exerciseId, schema.niceAssessmentExercises.exerciseId)
	)
	.where(eq(schema.niceAssessmentExercises.assessmentId, sql.placeholder("assessmentId")))
	.prepare("src_app_user_subject_course_test_test_page_get_test_questions")

export type CourseTest = Awaited<ReturnType<typeof getCourseTestBySlugQuery.execute>>[0]
export type TestQuestion = Awaited<ReturnType<typeof getTestQuestionsQuery.execute>>[0]

export type TestData = {
	test: CourseTest
	questions: TestQuestion[]
}

export type CourseData = {
	subject: string
	course: { title: string; path: string }
	test: CourseTest
}

// Consolidated data fetching function for the test page
async function fetchTestData(params: { subject: string; course: string; test: string }): Promise<TestData> {
	const decodedTest = decodeURIComponent(params.test)
	const coursePath = `/${params.subject}/${params.course}`

	// First, find the course
	const courseResult = await getCourseByPathQuery.execute({ coursePath })
	const course = courseResult[0]

	if (!course) {
		notFound()
	}

	// Then find the test by course and slug
	const testResult = await getCourseTestBySlugQuery.execute({
		courseId: course.id,
		testSlug: decodedTest
	})
	const test = testResult[0]

	if (!test) {
		notFound()
	}

	// Fetch questions using the test ID
	const questions = await getTestQuestionsQuery.execute({ assessmentId: test.id })

	return { test, questions }
}

// Course data fetching function for the layout
async function fetchCourseData(params: { subject: string; course: string; test: string }): Promise<CourseData> {
	const decodedTest = decodeURIComponent(params.test)
	const coursePath = `/${params.subject}/${params.course}`

	// Find the course
	const courseResult = await getCourseByPathQuery.execute({ coursePath })
	const course = courseResult[0]

	if (!course) {
		notFound()
	}

	// Find the test by course and slug
	const testResult = await getCourseTestBySlugQuery.execute({
		courseId: course.id,
		testSlug: decodedTest
	})
	const test = testResult[0]

	if (!test) {
		notFound()
	}

	return {
		subject: params.subject,
		course: { title: course.title, path: course.path },
		test
	}
}

export default function TestPage({ params }: { params: Promise<{ subject: string; course: string; test: string }> }) {
	logger.info("test page: received request, rendering layout immediately")

	const courseDataPromise = params.then(fetchCourseData)
	const testDataPromise = params.then(fetchTestData)

	return (
		<TestLayout courseDataPromise={courseDataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading test...</div>}>
				<TestContent testDataPromise={testDataPromise} />
			</React.Suspense>
		</TestLayout>
	)
}
