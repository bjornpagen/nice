import * as errors from "@superbuilders/errors"
import { and, eq, inArray, notInArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { HARDCODED_SCIENCE_COURSE_IDS } from "@/lib/constants/course-mapping"

export const clearAllAssessmentItemData = inngest.createFunction(
	{
		id: "clear-all-assessment-item-data",
		name: "Clear QTI assessment XML/JSON, analysis notes, and QA review table for non-science courses"
	},
	{ event: "qti/database.clear-assessment-item-data" },
	async ({ logger }) => {
		logger.info("starting database-wide clearing of assessment item data for non-science courses")

		const transactionResult = await errors.try(
			db.transaction(async (tx) => {
				// Fail-fast guard: ensure science questions exist (limit 1 for efficiency)
				const existenceCheck = await tx
					.select({ id: schema.niceQuestions.id })
					.from(schema.niceQuestions)
					.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
					.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
					.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
					.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
					.where(
						and(
							inArray(schema.niceUnits.courseId, [...HARDCODED_SCIENCE_COURSE_IDS]),
							eq(schema.niceLessonContents.contentType, "Exercise")
						)
					)
					.limit(1)
				if (existenceCheck.length === 0) {
					logger.error(
						"fail-fast: subquery returned zero science questions, aborting clear operation to prevent data loss"
					)
					throw errors.new("fail-fast: subquery for science questions returned zero results")
				}

				// Step 2: Clear XML and structuredJson from questions for NON-SCIENCE courses using an inclusion subquery on exercises
				logger.info("clearing xml and structuredJson from questions table for non-science courses")
				const questionsCleared = await tx
					.update(schema.niceQuestions)
					.set({ xml: null, structuredJson: null })
					.where(
						inArray(
							schema.niceQuestions.exerciseId,
							tx
								.select({ id: schema.niceExercises.id })
								.from(schema.niceExercises)
								.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
								.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
								.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
								.where(
									and(
										eq(schema.niceLessonContents.contentType, "Exercise"),
										notInArray(schema.niceUnits.courseId, [...HARDCODED_SCIENCE_COURSE_IDS])
									)
								)
						)
					)
					.returning({ id: schema.niceQuestions.id })
				logger.info("cleared non-science questions xml and structuredJson data", { count: questionsCleared.length })

				// Step 3: Wipe the questions_analysis table for NON-SCIENCE questions via subquery
				logger.info("deleting records from questions_analysis table for non-science courses")
				const analysisCleared = await tx
					.delete(schema.niceQuestionsAnalysis)
					.where(
						inArray(
							schema.niceQuestionsAnalysis.questionId,
							tx
								.select({ id: schema.niceQuestions.id })
								.from(schema.niceQuestions)
								.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
								.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
								.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
								.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
								.where(
									and(
										eq(schema.niceLessonContents.contentType, "Exercise"),
										notInArray(schema.niceUnits.courseId, [...HARDCODED_SCIENCE_COURSE_IDS])
									)
								)
						)
					)
					.returning({ id: schema.niceQuestionsAnalysis.id })
				logger.info("successfully deleted non-science records from questions_analysis", {
					count: analysisCleared.length
				})

				// Step 4: Wipe the question_render_reviews table for NON-SCIENCE questions via subquery
				logger.info("deleting records from question_render_reviews table for non-science courses")
				const reviewsCleared = await tx
					.delete(schema.niceQuestionRenderReviews)
					.where(
						inArray(
							schema.niceQuestionRenderReviews.questionId,
							tx
								.select({ id: schema.niceQuestions.id })
								.from(schema.niceQuestions)
								.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
								.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
								.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
								.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
								.where(
									and(
										eq(schema.niceLessonContents.contentType, "Exercise"),
										notInArray(schema.niceUnits.courseId, [...HARDCODED_SCIENCE_COURSE_IDS])
									)
								)
						)
					)
					.returning({ questionId: schema.niceQuestionRenderReviews.questionId })
				logger.info("successfully deleted non-science records from question_render_reviews", {
					count: reviewsCleared.length
				})

				return {
					questions: questionsCleared.length,
					questionsAnalysis: analysisCleared.length,
					questionRenderReviews: reviewsCleared.length
				}
			})
		)

		if (transactionResult.error) {
			logger.error("database transaction failed during clearing operation", { error: transactionResult.error })
			throw errors.wrap(transactionResult.error, "clearing transaction")
		}

		logger.info("completed database-wide clearing of non-science assessment item data")

		return {
			status: "success",
			cleared: transactionResult.data
		}
	}
)
