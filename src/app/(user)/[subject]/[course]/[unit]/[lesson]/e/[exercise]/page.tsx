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

export type Exercise = Awaited<ReturnType<typeof getExerciseByPathQuery.execute>>[0]

// Server component for fetching exercise data
async function StreamingExerciseContent({
	params
}: {
	params: { subject: string; course: string; unit: string; lesson: string; exercise: string }
}) {
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

	return <ExerciseContent exercise={exercise} />
}

export default function ExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	logger.info("exercise page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchLessonData)

	return (
		<LessonLayout dataPromise={dataPromise}>
			<React.Suspense fallback={<div className="p-8">Loading exercise...</div>}>
				<StreamingExerciseContent params={React.use(params)} />
			</React.Suspense>
		</LessonLayout>
	)
}
