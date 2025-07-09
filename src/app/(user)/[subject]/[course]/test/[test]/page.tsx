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
export type TestQuestion = Awaited<ReturnType<typeof getTestQuestionsQuery.execute>>[0] & { qtiIdentifier: string }

export type TestData = {
	test: CourseTest
	questions: TestQuestion[]
}

export type CourseData = {
	subject: string
	course: { title: string; path: string }
	test: CourseTest
	unit: { title: string; path: string; ordering: number; children: LessonInfo[] }
	lesson: { title: string; path: string; children: LessonChild[] }
}

export type LessonInfo = {
	type: "Lesson"
	id: string
	slug: string
	title: string
	description: string
	path: string
	children: LessonChild[]
}

export type LessonChild = {
	type: "Video" | "Article" | "Exercise"
	id: string
	slug: string
	title: string
	description: string
	path: string
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
	const questionsFromDb = await getTestQuestionsQuery.execute({ assessmentId: test.id })

	// Add fake qtiIdentifier to each question
	const questions = questionsFromDb.map((q) => ({
		...q,
		qtiIdentifier: `FAKE_QTI_${q.id}`
	}))

	return { test, questions }
}

// Additional queries for course data
const getUnitsInCourseQuery = db
	.select({
		id: schema.niceUnits.id,
		title: schema.niceUnits.title,
		path: schema.niceUnits.path,
		ordering: schema.niceUnits.ordering
	})
	.from(schema.niceUnits)
	.where(eq(schema.niceUnits.courseId, sql.placeholder("courseId")))
	.orderBy(schema.niceUnits.ordering)
	.prepare("src_app_user_subject_course_test_test_page_get_units_in_course")

const getLessonsInUnitQuery = db
	.select({
		id: schema.niceLessons.id,
		title: schema.niceLessons.title,
		path: schema.niceLessons.path
	})
	.from(schema.niceLessons)
	.where(eq(schema.niceLessons.unitId, sql.placeholder("unitId")))
	.orderBy(schema.niceLessons.ordering)
	.prepare("src_app_user_subject_course_test_test_page_get_lessons_in_unit")

const getLessonContentQuery = db
	.select({
		contentId: schema.niceLessonContents.contentId,
		contentType: schema.niceLessonContents.contentType,
		ordering: schema.niceLessonContents.ordering,
		video: schema.niceVideos,
		article: schema.niceArticles,
		exercise: schema.niceExercises
	})
	.from(schema.niceLessonContents)
	.leftJoin(schema.niceVideos, eq(schema.niceLessonContents.contentId, schema.niceVideos.id))
	.leftJoin(schema.niceArticles, eq(schema.niceLessonContents.contentId, schema.niceArticles.id))
	.leftJoin(schema.niceExercises, eq(schema.niceLessonContents.contentId, schema.niceExercises.id))
	.where(eq(schema.niceLessonContents.lessonId, sql.placeholder("lessonId")))
	.orderBy(schema.niceLessonContents.ordering)
	.prepare("src_app_user_subject_course_test_test_page_get_lesson_content")

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

	// Get all units in the course
	const unitsResult = await getUnitsInCourseQuery.execute({ courseId: course.id })

	if (unitsResult.length === 0) {
		notFound()
	}

	// Get the last unit
	const lastUnit = unitsResult[unitsResult.length - 1]
	if (!lastUnit) {
		notFound()
	}

	// Get all lessons in the last unit
	const lessonsResult = await getLessonsInUnitQuery.execute({ unitId: lastUnit.id })

	if (lessonsResult.length === 0) {
		notFound()
	}

	// Get the last lesson
	const lastLesson = lessonsResult[lessonsResult.length - 1]
	if (!lastLesson) {
		notFound()
	}

	// Get content for the last lesson
	const lessonContentResult = await getLessonContentQuery.execute({ lessonId: lastLesson.id })

	// Build lesson children
	const lessonChildren: LessonChild[] = []
	for (const row of lessonContentResult) {
		if (row.contentType === "Video" && row.video) {
			lessonChildren.push({
				type: "Video",
				id: row.video.id,
				slug: row.video.slug,
				title: row.video.title,
				description: row.video.description || "",
				path: row.video.path
			})
		} else if (row.contentType === "Article" && row.article) {
			lessonChildren.push({
				type: "Article",
				id: row.article.id,
				slug: row.article.slug,
				title: row.article.title,
				description: "",
				path: row.article.path
			})
		} else if (row.contentType === "Exercise" && row.exercise) {
			lessonChildren.push({
				type: "Exercise",
				id: row.exercise.id,
				slug: row.exercise.slug,
				title: row.exercise.title,
				description: row.exercise.description || "",
				path: row.exercise.path
			})
		}
	}

	// Build all lessons for the unit
	const allLessonsWithContent = await Promise.all(
		lessonsResult.map(async (lesson) => {
			const lessonContentResult = await getLessonContentQuery.execute({ lessonId: lesson.id })
			const children: LessonChild[] = []

			for (const row of lessonContentResult) {
				if (row.contentType === "Video" && row.video) {
					children.push({
						type: "Video",
						id: row.video.id,
						slug: row.video.slug,
						title: row.video.title,
						description: row.video.description || "",
						path: row.video.path
					})
				} else if (row.contentType === "Article" && row.article) {
					children.push({
						type: "Article",
						id: row.article.id,
						slug: row.article.slug,
						title: row.article.title,
						description: "",
						path: row.article.path
					})
				} else if (row.contentType === "Exercise" && row.exercise) {
					children.push({
						type: "Exercise",
						id: row.exercise.id,
						slug: row.exercise.slug,
						title: row.exercise.title,
						description: row.exercise.description || "",
						path: row.exercise.path
					})
				}
			}

			return {
				type: "Lesson" as const,
				id: lesson.id,
				slug: lesson.path.split("/").pop() || lesson.id,
				title: lesson.title,
				description: "",
				path: lesson.path,
				children
			}
		})
	)

	return {
		subject: params.subject,
		course: { title: course.title, path: course.path },
		test,
		unit: {
			title: lastUnit.title,
			path: lastUnit.path,
			ordering: lastUnit.ordering,
			children: allLessonsWithContent
		},
		lesson: {
			title: lastLesson.title,
			path: lastLesson.path,
			children: lessonChildren
		}
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
