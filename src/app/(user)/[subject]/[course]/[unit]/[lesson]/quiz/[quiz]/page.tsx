import * as logger from "@superbuilders/slog"
import { and, eq, sql } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { fetchLessonData } from "../../lesson-data"
import { LessonLayout } from "../../lesson-layout"
import { QuizContent } from "./quiz-content"

// Query to get the unit from lesson path (quizzes belong to units, not lessons)
const getUnitByLessonPathQuery = db
	.select({
		id: schema.niceUnits.id,
		path: schema.niceUnits.path
	})
	.from(schema.niceUnits)
	.innerJoin(schema.niceLessons, eq(schema.niceUnits.id, schema.niceLessons.unitId))
	.where(eq(schema.niceLessons.path, sql.placeholder("lessonPath")))
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_quiz_quiz_page_get_unit_by_lesson_path")

// Quiz-specific query - finds quiz by unit and slug (since quizzes belong to units)
const getQuizByUnitAndSlugQuery = db
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
			eq(schema.niceAssessments.slug, sql.placeholder("quizSlug")),
			eq(schema.niceAssessments.type, "Quiz")
		)
	)
	.limit(1)
	.prepare("src_app_user_subject_course_unit_lesson_quiz_quiz_page_get_quiz_by_unit_and_slug")

// Query to fetch all questions for a given quiz through assessment exercises
const getQuizQuestionsQuery = db
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
	.prepare("src_app_user_subject_course_unit_lesson_quiz_quiz_page_get_quiz_questions")

export type Quiz = Awaited<ReturnType<typeof getQuizByUnitAndSlugQuery.execute>>[0]
export type QuizQuestion = Awaited<ReturnType<typeof getQuizQuestionsQuery.execute>>[0] & { qtiIdentifier: string }

export type QuizData = {
	quiz: Quiz
	questions: QuizQuestion[]
}

// Consolidated data fetching function for the quiz page
async function fetchQuizData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
	quiz: string
}): Promise<QuizData> {
	const decodedQuiz = decodeURIComponent(params.quiz)
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

	// Then find the quiz by unit and slug
	const quizResult = await getQuizByUnitAndSlugQuery.execute({
		unitId: unit.id,
		quizSlug: decodedQuiz
	})
	const quiz = quizResult[0]

	if (!quiz) {
		notFound()
	}

	// Fetch questions using the quiz ID
	const questionsFromDb = await getQuizQuestionsQuery.execute({ assessmentId: quiz.id })

	// Add qtiIdentifier to each question using the new format
	const questions = questionsFromDb.map((q) => ({
		...q,
		qtiIdentifier: `nice:${q.id}`
	}))

	return { quiz, questions }
}

export default function QuizPage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; quiz: string }>
}) {
	logger.info("quiz page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonData)
	const quizDataPromise = params.then(fetchQuizData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading quiz...</div>}>
				<QuizContent quizDataPromise={quizDataPromise} />
			</React.Suspense>
		</LessonLayout>
	)
}
