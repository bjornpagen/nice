import * as logger from "@superbuilders/slog"
import { eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { LessonLayout } from "../../lesson-layout"
import { fetchLessonData } from "../../page"
import { ExerciseContent } from "./exercise-content"

// Exercise-specific query
const getExerciseByPathQuery = db
	.select({
		id: schema.niceExercises.id,
		title: schema.niceExercises.title,
		slug: schema.niceExercises.slug,
		description: schema.niceExercises.description
	})
	.from(schema.niceExercises)
	.where(eq(schema.niceExercises.path, sql.placeholder("exercisePath")))
	.limit(1)
	.prepare("exercise_get_by_path")

// NEW: Query to fetch all questions for a given exercise
const getExerciseQuestionsQuery = db
	.select({
		id: schema.niceQuestions.id
	})
	.from(schema.niceQuestions)
	.where(eq(schema.niceQuestions.exerciseId, sql.placeholder("exerciseId")))
	.prepare("src_app_user_subject_course_unit_lesson_e_exercise_page_get_exercise_questions")

export type Exercise = Awaited<ReturnType<typeof getExerciseByPathQuery.execute>>[0]
export type ExerciseQuestion = Awaited<ReturnType<typeof getExerciseQuestionsQuery.execute>>[0] & {
	qtiIdentifier: string
}

export type ExerciseData = {
	exercise: Exercise
	questions: ExerciseQuestion[]
}

// NEW: Consolidated data fetching function for the exercise page
async function fetchExerciseData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	exercise: string
}): Promise<ExerciseData> {
	const decodedExercise = decodeURIComponent(params.exercise)
	const decodedUnit = decodeURIComponent(params.unit)
	const decodedLesson = decodeURIComponent(params.lesson)

	const coursePath = `/${params.subject}/${params.course}`
	const unitPath = `${coursePath}/${decodedUnit}`
	const lessonPath = `${unitPath}/${decodedLesson}`
	const exercisePath = `${lessonPath}/e/${decodedExercise}`

	const exerciseResult = await getExerciseByPathQuery.execute({ exercisePath })
	const exercise = exerciseResult[0]

	if (!exercise) {
		notFound()
	}

	// Fetch questions using the exercise ID
	const questionsFromDb = await getExerciseQuestionsQuery.execute({ exerciseId: exercise.id })

	// Add fake qtiIdentifier to each question
	const questions = questionsFromDb.map((q) => ({
		...q,
		qtiIdentifier: `FAKE_QTI_${q.id}`
	}))

	return { exercise, questions }
}

// REMOVED: StreamingExerciseContent is no longer needed

export default function ExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	logger.info("exercise page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonData)
	const exerciseDataPromise = params.then(fetchExerciseData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading exercise...</div>}>
				<ExerciseContent exerciseDataPromise={exerciseDataPromise} />
			</React.Suspense>
		</LessonLayout>
	)
}
