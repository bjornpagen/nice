import * as errors from "@superbuilders/errors"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import {
	niceAssessmentExercises,
	niceAssessments,
	niceLessonContents,
	niceLessons,
	niceQuestions,
	niceUnits
} from "@/db/schemas"
import { inngest } from "@/inngest/client"

export const requestAllItemMigrationsForCourse = inngest.createFunction(
	{
		id: "request-all-item-migrations-for-course",
		name: "Request All Item Migrations for Course"
	},
	{ event: "qti/course.migrate-all-items" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting all assessment item migrations for course", { courseId })

		// Step 1: Get all exercise IDs from lessons
		const lessonExercisesResult = await errors.try(
			db
				.select({ exerciseId: niceLessonContents.contentId })
				.from(niceLessonContents)
				.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
				.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
				.where(eq(niceUnits.courseId, courseId))
		)

		if (lessonExercisesResult.error) {
			logger.error("failed to fetch lesson exercises for course", { courseId, error: lessonExercisesResult.error })
			throw errors.wrap(lessonExercisesResult.error, "db query for lesson exercises")
		}

		// Get all exercise IDs from assessments
		const assessmentExercisesResult = await errors.try(
			db
				.select({ exerciseId: niceAssessmentExercises.exerciseId })
				.from(niceAssessmentExercises)
				.innerJoin(niceAssessments, eq(niceAssessmentExercises.assessmentId, niceAssessments.id))
				.innerJoin(niceUnits, eq(niceAssessments.parentId, niceUnits.id))
				.where(eq(niceUnits.courseId, courseId))
		)

		if (assessmentExercisesResult.error) {
			logger.error("failed to fetch assessment exercises for course", {
				courseId,
				error: assessmentExercisesResult.error
			})
			throw errors.wrap(assessmentExercisesResult.error, "db query for assessment exercises")
		}

		// Combine all exercise IDs
		const allExerciseIds = [
			...lessonExercisesResult.data.map((row) => row.exerciseId),
			...assessmentExercisesResult.data.map((row) => row.exerciseId)
		]

		// Remove duplicates
		const uniqueExerciseIds = [...new Set(allExerciseIds)]

		if (uniqueExerciseIds.length === 0) {
			logger.info("no exercises found for course", { courseId })
			return { status: "completed", courseId, migratedCount: 0 }
		}

		// Step 2: Get all questions for these exercises
		const questionsResult = await errors.try(
			db
				.select({ id: niceQuestions.id })
				.from(niceQuestions)
				.where(inArray(niceQuestions.exerciseId, uniqueExerciseIds))
		)

		if (questionsResult.error) {
			logger.error("failed to fetch questions for course", { courseId, error: questionsResult.error })
			throw errors.wrap(questionsResult.error, "db query")
		}

		const questionIds = questionsResult.data.map((q) => q.id)
		logger.info("found questions to migrate", { courseId, count: questionIds.length })

		if (questionIds.length === 0) {
			logger.info("no questions found for course", { courseId })
			return { status: "completed", courseId, migratedCount: 0 }
		}

		// Step 3: Send migration events for each question
		// NOTE: Using "math-core" as default widget collection. In the future, this might need
		// to be determined based on the course or question metadata.
		const migrationEvents = questionIds.map((questionId) => ({
			name: "qti/item.migrate" as const,
			data: {
				questionId,
				widgetCollection: "math-core" as const // Default to math-core for course-wide migration
			}
		}))

		await step.run("send-migration-events", async () => {
			const sendResult = await errors.try(inngest.send(migrationEvents))
			if (sendResult.error) {
				logger.error("failed to send migration events", {
					courseId,
					error: sendResult.error
				})
				throw errors.wrap(sendResult.error, "inngest send")
			}
			logger.info("successfully sent migration events", {
				courseId,
				count: migrationEvents.length
			})
			return { sent: migrationEvents.length }
		})

		logger.info("completed all question migration requests", {
			courseId,
			total: questionIds.length
		})

		return {
			status: "completed",
			courseId,
			totalQuestions: questionIds.length,
			requestedCount: questionIds.length
		}
	}
)
