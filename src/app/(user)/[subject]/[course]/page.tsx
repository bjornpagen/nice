import * as logger from "@superbuilders/slog"
import { and, eq, inArray, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { Content } from "./content"

// 1. Drizzle prepared statements are colocated and explicitly select columns.
//    Names are prefixed with the file path in snake_case per linting rules.
const getCourseByPathQuery = db
	.select({
		id: schema.niceCourses.id,
		title: schema.niceCourses.title,
		description: schema.niceCourses.description,
		path: schema.niceCourses.path
	})
	.from(schema.niceCourses)
	.where(eq(schema.niceCourses.path, sql.placeholder("path")))
	.limit(1)
	.prepare("src_app_user_subject_course_page_get_course_by_path")

const getUnitsByCourseIdQuery = db
	.select({
		id: schema.niceUnits.id,
		title: schema.niceUnits.title,
		path: schema.niceUnits.path,
		ordering: schema.niceUnits.ordering
	})
	.from(schema.niceUnits)
	.where(eq(schema.niceUnits.courseId, sql.placeholder("courseId")))
	.orderBy(schema.niceUnits.ordering)
	.prepare("src_app_user_subject_course_page_get_units_by_course_id")

const getLessonCountByCourseIdQuery = db
	.select({
		count: sql<number>`count(*)::int`
	})
	.from(schema.niceLessons)
	.where(
		inArray(
			schema.niceLessons.unitId,
			db
				.select({ id: schema.niceUnits.id })
				.from(schema.niceUnits)
				.where(eq(schema.niceUnits.courseId, sql.placeholder("courseId")))
		)
	)
	.prepare("src_app_user_subject_course_page_get_lesson_count_by_course_id")

const getCourseChallengesQuery = db
	.select({
		id: schema.niceAssessments.id,
		path: schema.niceAssessments.path
	})
	.from(schema.niceAssessments)
	.where(
		and(
			eq(schema.niceAssessments.parentId, sql.placeholder("courseId")),
			eq(schema.niceAssessments.parentType, "Course")
		)
	)
	.prepare("src_app_user_subject_course_page_get_course_challenges")

// NEW: Query to get all lesson contents with exercises (similar to unit page)
const getLessonsContentQuery = db
	.select({
		lessonId: schema.niceLessonContents.lessonId,
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
	.orderBy(schema.niceLessonContents.lessonId, schema.niceLessonContents.ordering)
// Note: We'll add the WHERE clause dynamically when executing

// Helper function to get lessons by unit IDs (dynamic query since inArray doesn't work with prepared statements)
async function getLessonsByUnitIds(unitIds: string[]) {
	if (unitIds.length === 0) {
		return []
	}

	return await db
		.select({
			id: schema.niceLessons.id,
			unitId: schema.niceLessons.unitId,
			slug: schema.niceLessons.slug,
			title: schema.niceLessons.title,
			description: schema.niceLessons.description,
			path: schema.niceLessons.path,
			ordering: schema.niceLessons.ordering
		})
		.from(schema.niceLessons)
		.where(inArray(schema.niceLessons.unitId, unitIds))
		.orderBy(schema.niceLessons.ordering)
}

// NEW: Helper function to get questions for exercises (from unit page)
async function getQuestionsForExercises(exerciseIds: string[]): Promise<Map<string, Question[]>> {
	if (exerciseIds.length === 0) return new Map()

	const questions = await db
		.select({
			id: schema.niceQuestions.id,
			exerciseId: schema.niceQuestions.exerciseId,
			sha: schema.niceQuestions.sha,
			parsedData: schema.niceQuestions.parsedData
		})
		.from(schema.niceQuestions)
		.where(inArray(schema.niceQuestions.exerciseId, exerciseIds))

	const questionsByExerciseId = new Map<string, Question[]>()
	for (const q of questions) {
		if (!questionsByExerciseId.has(q.exerciseId)) {
			questionsByExerciseId.set(q.exerciseId, [])
		}
		questionsByExerciseId.get(q.exerciseId)?.push({
			id: q.id,
			sha: q.sha,
			parsedData: q.parsedData
		})
	}

	return questionsByExerciseId
}

// Helper function to get unit assessments (quizzes and unit tests)
async function getUnitAssessments(unitIds: string[]) {
	if (unitIds.length === 0) {
		return []
	}

	return await db
		.select({
			id: schema.niceAssessments.id,
			type: schema.niceAssessments.type,
			parentId: schema.niceAssessments.parentId,
			title: schema.niceAssessments.title,
			slug: schema.niceAssessments.slug,
			path: schema.niceAssessments.path,
			ordering: schema.niceAssessments.ordering,
			description: schema.niceAssessments.description
		})
		.from(schema.niceAssessments)
		.where(and(inArray(schema.niceAssessments.parentId, unitIds), eq(schema.niceAssessments.parentType, "Unit")))
		.orderBy(schema.niceAssessments.ordering)
}

// Type guard to ensure assessment is Quiz or UnitTest
function isUnitAssessment(assessment: UnitAssessment): assessment is UnitAssessment & { type: "Quiz" | "UnitTest" } {
	return assessment.type === "Quiz" || assessment.type === "UnitTest"
}

// 2. Types are derived from the queries and exported for use in child components.
export type Course = Awaited<ReturnType<typeof getCourseByPathQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getUnitsByCourseIdQuery.execute>>[0]
export type Lesson = Awaited<ReturnType<typeof getLessonsByUnitIds>>[0]
export type UnitAssessment = Awaited<ReturnType<typeof getUnitAssessments>>[0]
export type CourseChallenge = Awaited<ReturnType<typeof getCourseChallengesQuery.execute>>[0]

// NEW: Exercise-related types (from unit page)
export type Question = { id: string; sha: string; parsedData: unknown }
export type Video = NonNullable<typeof schema.niceVideos.$inferSelect> & { ordering: number }
export type Article = NonNullable<typeof schema.niceArticles.$inferSelect> & { ordering: number }
export type Exercise = NonNullable<typeof schema.niceExercises.$inferSelect> & {
	questions: Question[]
	ordering: number
}

// UPDATED: Combined unit child types with exercises
export type UnitChild =
	| (Lesson & { type: "Lesson"; videos: Video[]; exercises: Exercise[]; articles: Article[] })
	| (UnitAssessment & { type: "Quiz" })
	| (UnitAssessment & { type: "UnitTest" })

export type UnitWithChildren = Unit & {
	children: UnitChild[]
}

export type CourseData = {
	params: { subject: string; course: string }
	course: Course
	units: UnitWithChildren[]
	lessonCount: number
	challenges: CourseChallenge[]
}

// Shared data fetching function - separated for clarity and reusability
async function fetchCourseData(params: { subject: string; course: string }): Promise<CourseData> {
	const path = `/${params.subject}/${params.course}`
	logger.debug("course page: fetching course by path", { path })

	const courseResult = await getCourseByPathQuery.execute({ path })
	const course = courseResult[0]

	if (!course) {
		logger.warn("course page: course not found for path", { path })
		notFound()
	}

	// First get units
	const units = await getUnitsByCourseIdQuery.execute({ courseId: course.id })

	// Extract unit IDs for lessons and assessments queries
	const unitIds = units.map((unit) => unit.id)

	// Fetch lessons, assessments, and other data in parallel
	const [lessons, assessments, lessonCountResult, challenges] = await Promise.all([
		getLessonsByUnitIds(unitIds),
		getUnitAssessments(unitIds),
		getLessonCountByCourseIdQuery.execute({ courseId: course.id }),
		getCourseChallengesQuery.execute({ courseId: course.id })
	])

	// NEW: Get lesson contents with exercises (similar to unit page)
	const lessonIds = lessons.map((lesson) => lesson.id)

	type LessonContentRow = {
		lessonId: string
		contentId: string
		contentType: "Video" | "Article" | "Exercise"
		ordering: number
		video: typeof schema.niceVideos.$inferSelect | null
		article: typeof schema.niceArticles.$inferSelect | null
		exercise: typeof schema.niceExercises.$inferSelect | null
	}

	let lessonContents: LessonContentRow[] = []
	if (lessonIds.length > 0) {
		lessonContents = await getLessonsContentQuery.where(inArray(schema.niceLessonContents.lessonId, lessonIds))
	}

	// NEW: Get questions for exercises
	const allExerciseIds = lessonContents.filter((c) => c.contentType === "Exercise").map((c) => c.contentId)
	const questionsByExerciseId = await getQuestionsForExercises(allExerciseIds)

	// NEW: Build content by lesson ID
	const contentsByLessonId: Record<string, { videos: Video[]; articles: Article[]; exercises: Exercise[] }> = {}

	for (const row of lessonContents) {
		if (!contentsByLessonId[row.lessonId]) {
			contentsByLessonId[row.lessonId] = { videos: [], articles: [], exercises: [] }
		}

		const lessonContent = contentsByLessonId[row.lessonId]
		if (!lessonContent) continue

		if (row.contentType === "Video" && row.video) {
			lessonContent.videos.push({ ...row.video, ordering: row.ordering })
		} else if (row.contentType === "Article" && row.article) {
			lessonContent.articles.push({ ...row.article, ordering: row.ordering })
		} else if (row.contentType === "Exercise" && row.exercise) {
			lessonContent.exercises.push({
				...row.exercise,
				questions: questionsByExerciseId.get(row.exercise.id) || [],
				ordering: row.ordering
			})
		}
	}

	// UPDATED: Combine lessons and assessments into unitChildren for each unit with exercises
	const unitsWithChildren: UnitWithChildren[] = units.map((unit) => {
		const unitLessons: UnitChild[] = lessons
			.filter((lesson) => lesson.unitId === unit.id)
			.map((lesson) => {
				const contents = contentsByLessonId[lesson.id] || { videos: [], articles: [], exercises: [] }
				return { ...lesson, ...contents, type: "Lesson" as const }
			})

		const unitAssessments: UnitChild[] = assessments
			.filter((assessment) => assessment.parentId === unit.id)
			.filter(isUnitAssessment)
			.map((assessment) => ({
				...assessment,
				type: assessment.type
			}))

		// Combine and sort by ordering
		const children = [...unitLessons, ...unitAssessments].sort((a, b) => a.ordering - b.ordering)

		return {
			...unit,
			children
		}
	})

	const lessonCount = lessonCountResult[0]?.count ?? 0

	return {
		params,
		course,
		units: unitsWithChildren,
		lessonCount,
		challenges
	}
}

// 3. The page component is NOT async. It orchestrates promises and renders immediately.
export default function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	logger.info("course page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchCourseData)

	return <Content dataPromise={dataPromise} />
}
