import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type Events, inngest } from "@/inngest/client"

const BATCH_SIZE = 100

export const generateAllAssessmentItemsForCourse = inngest.createFunction(
	{
		id: "generate-all-assessment-items-for-course",
		name: "Generate All Assessment Items for a Course"
	},
	{ event: "nice/course.assessment-items.generate" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting qti assessment item generation for entire course", { courseId })

		// Step 1: Fetch all question IDs for the given courseId.
		// First, get all exercise IDs from lessons
		const lessonExercisesResult = await errors.try(
			db
				.select({ exerciseId: schema.niceLessonContents.contentId })
				.from(schema.niceLessonContents)
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
				.where(and(eq(schema.niceUnits.courseId, courseId), eq(schema.niceLessonContents.contentType, "Exercise")))
		)

		if (lessonExercisesResult.error) {
			logger.error("failed to fetch lesson exercises for course", { courseId, error: lessonExercisesResult.error })
			throw errors.wrap(lessonExercisesResult.error, "db query for lesson exercises")
		}

		// Get all exercise IDs from assessments
		const assessmentExercisesResult = await errors.try(
			db
				.select({ exerciseId: schema.niceAssessmentExercises.exerciseId })
				.from(schema.niceAssessmentExercises)
				.innerJoin(schema.niceAssessments, eq(schema.niceAssessmentExercises.assessmentId, schema.niceAssessments.id))
				.innerJoin(schema.niceUnits, eq(schema.niceAssessments.parentId, schema.niceUnits.id))
				.where(and(eq(schema.niceUnits.courseId, courseId), eq(schema.niceAssessments.parentType, "Unit")))
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
			logger.warn("no exercises found for course, aborting generation", { courseId })
			return { status: "aborted", reason: "no_exercises_found", count: 0 }
		}

		// Now get all questions for these exercises
		const questionsResult = await errors.try(
			db
				.select({ id: schema.niceQuestions.id })
				.from(schema.niceQuestions)
				.where(inArray(schema.niceQuestions.exerciseId, uniqueExerciseIds))
		)

		if (questionsResult.error) {
			logger.error("failed to fetch questions for exercises", { courseId, error: questionsResult.error })
			throw errors.wrap(questionsResult.error, "db query for questions")
		}

		const questionIds = questionsResult.data.map((q) => q.id)

		if (questionIds.length === 0) {
			logger.warn("no questions found for course, aborting generation", { courseId })
			return { status: "aborted", reason: "no_questions_found", count: 0 }
		}

		logger.info("found questions to generate", { courseId, count: questionIds.length })

		// Step 2: Fan out migration events in batches.
		const migrationEvents: Events["nice/qti.assessment-item.migration.requested"][] = questionIds.map((questionId) => ({
			name: "nice/qti.assessment-item.migration.requested",
			data: { questionId }
		}))

		for (let i = 0; i < migrationEvents.length; i += BATCH_SIZE) {
			const batch = migrationEvents.slice(i, i + BATCH_SIZE)
			await step.run(`send-migration-batch-${i / BATCH_SIZE + 1}`, async () => {
				const sendResult = await errors.try(inngest.send(batch))
				if (sendResult.error) {
					logger.error("failed to send migration event batch", {
						courseId,
						batchNumber: i / BATCH_SIZE + 1,
						error: sendResult.error
					})
					throw errors.wrap(sendResult.error, "inngest send batch")
				}
				logger.info("successfully sent migration event batch", {
					courseId,
					count: batch.length,
					batchNumber: i / BATCH_SIZE + 1
				})
				return { sent: batch.length }
			})
		}

		logger.info("successfully fanned out all qti assessment item generation events for course", {
			courseId,
			count: questionIds.length
		})

		return { status: "success", count: questionIds.length }
	}
)
