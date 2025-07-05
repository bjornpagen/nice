import * as logger from "@superbuilders/slog"
import { and, count, eq, inArray, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { Content } from "./content"

// --- QUERIES ---
const getCourseBySlugQuery = db
	.select({
		id: schema.niceCourses.id,
		title: schema.niceCourses.title,
		path: schema.niceCourses.path,
		description: schema.niceCourses.description
	})
	.from(schema.niceCourses)
	.where(eq(schema.niceCourses.slug, sql.placeholder("courseSlug")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_page_get_course_by_slug")

const getAllUnitsByCourseIdQuery = db
	.select({
		id: schema.niceUnits.id,
		title: schema.niceUnits.title,
		path: schema.niceUnits.path,
		slug: schema.niceUnits.slug,
		description: schema.niceUnits.description
	})
	.from(schema.niceUnits)
	.where(eq(schema.niceUnits.courseId, sql.placeholder("courseId")))
	.prepare("src_app_user_subject_course_unit_page_get_all_units_by_course_id")

const getLessonCountByCourseIdQuery = db
	.select({ count: count() })
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
	.prepare("src_app_user_subject_course_unit_page_get_lesson_count_by_course_id")

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
	.prepare("src_app_user_subject_course_unit_page_get_course_challenges")

const getUnitByPathQuery = db
	.select({
		id: schema.niceUnits.id,
		title: schema.niceUnits.title,
		description: schema.niceUnits.description,
		slug: schema.niceUnits.slug,
		path: schema.niceUnits.path
	})
	.from(schema.niceUnits)
	.where(eq(schema.niceUnits.path, sql.placeholder("path")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_page_get_unit_by_path")

// NEW: A single query to get all children of a unit, correctly ordered.
const getUnitChildrenQuery = db
	.select({
		id: sql<string>`id`,
		title: sql<string>`title`,
		path: sql<string>`path`,
		type: sql<string>`type`,
		ordering: sql<number>`ordering`
	})
	.from(
		sql`(
			SELECT id, title, path, 'Lesson'::text as type, ordering FROM ${schema.niceLessons} WHERE unit_id = ${sql.placeholder("unitId")}
			UNION ALL
			SELECT id, title, path, type::text as type, ordering FROM ${schema.niceAssessments} WHERE parent_id = ${sql.placeholder("unitId")} AND parent_type = 'Unit'
		) as children`
	)
	.orderBy(sql`ordering`)
	.prepare("src_app_user_subject_course_unit_page_get_unit_children")

// NEW: A single query to get all contents for all lessons in a unit.
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

// --- TYPES ---
export type Course = Awaited<ReturnType<typeof getCourseBySlugQuery.execute>>[0]
export type Unit = Awaited<ReturnType<typeof getAllUnitsByCourseIdQuery.execute>>[0]
export type CourseChallenge = Awaited<ReturnType<typeof getCourseChallengesQuery.execute>>[0]
export type Question = { id: string; sha: string; parsedData: unknown }
export type Video = NonNullable<typeof schema.niceVideos.$inferSelect>
export type Article = NonNullable<typeof schema.niceArticles.$inferSelect>
export type Exercise = NonNullable<typeof schema.niceExercises.$inferSelect> & { questions: Question[] }

export type Lesson = {
	id: string
	title: string
	path: string
	ordering: number
	type: "Lesson"
	videos: Video[]
	exercises: Exercise[]
	articles: Article[]
}
export type Quiz = { id: string; title: string; path: string; ordering: number; type: "Quiz" }
export type UnitTest = { id: string; title: string; path: string; ordering: number; type: "UnitTest" }
export type UnitChild = Lesson | Quiz | UnitTest

export type HydratedUnitData = {
	params: { subject: string; course: string; unit: string }
	course: Course
	allUnits: Unit[]
	lessonCount: number
	challenges: CourseChallenge[]
	unit: Unit
	unitChildren: UnitChild[]
}

// NEW HELPER (optional but good practice)
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

// --- PAGE COMPONENT (Refactored) ---
export default function UnitPage({ params }: { params: Promise<{ subject: string; course: string; unit: string }> }) {
	logger.info("unit page: received request, initiating data fetches")

	const hydratedUnitDataPromise: Promise<HydratedUnitData> = params.then(async (p) => {
		const path = `/${p.subject}/${p.course}/${p.unit}`

		const [courseResults, unitResults] = await Promise.all([
			getCourseBySlugQuery.execute({ courseSlug: p.course }),
			getUnitByPathQuery.execute({ path })
		])

		const course = courseResults[0]
		const unit = unitResults[0]

		if (!course || !unit) {
			notFound()
		}

		const [allUnits, lessonCountResult, challenges, unitChildrenResult] = await Promise.all([
			getAllUnitsByCourseIdQuery.execute({ courseId: course.id }),
			getLessonCountByCourseIdQuery.execute({ courseId: course.id }),
			getCourseChallengesQuery.execute({ courseId: course.id }),
			getUnitChildrenQuery.execute({ unitId: unit.id })
		])

		const lessonCount = lessonCountResult[0]?.count ?? 0
		const lessonIds = unitChildrenResult.filter((c) => c.type === "Lesson").map((l) => l.id)

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

		const allExerciseIds = lessonContents.filter((c) => c.contentType === "Exercise").map((c) => c.contentId)
		const questionsByExerciseId = await getQuestionsForExercises(allExerciseIds)

		const contentsByLessonId: Record<string, { videos: Video[]; articles: Article[]; exercises: Exercise[] }> = {}

		for (const row of lessonContents) {
			if (!contentsByLessonId[row.lessonId]) {
				contentsByLessonId[row.lessonId] = { videos: [], articles: [], exercises: [] }
			}

			const lessonContent = contentsByLessonId[row.lessonId]
			if (!lessonContent) continue

			if (row.contentType === "Video" && row.video) {
				lessonContent.videos.push(row.video)
			} else if (row.contentType === "Article" && row.article) {
				lessonContent.articles.push(row.article)
			} else if (row.contentType === "Exercise" && row.exercise) {
				lessonContent.exercises.push({ ...row.exercise, questions: questionsByExerciseId.get(row.exercise.id) || [] })
			}
		}

		const unitChildren: UnitChild[] = unitChildrenResult.map((child) => {
			if (child.type === "Lesson") {
				const contents = contentsByLessonId[child.id] || { videos: [], articles: [], exercises: [] }
				return { ...child, ...contents, type: "Lesson" }
			}
			return child as Quiz | UnitTest
		})

		return { params: p, course, allUnits, lessonCount, challenges, unit, unitChildren }
	})

	return (
		<React.Suspense fallback={null}>
			<Content hydratedUnitDataPromise={hydratedUnitDataPromise} />
		</React.Suspense>
	)
}
