import * as errors from "@superbuilders/errors"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { differentiateAndSaveQuestionBatch } from "@/inngest/functions/qti/differentiate-and-save-question-batch"

// ... (Constants remain the same)
const HARDCODED_COURSE_IDS = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
]

const DIFFERENTIATION_COUNT = 3
const QUESTION_BATCH_SIZE = 20 // ✅ ADD: Batch size for grouping questions.

export const orchestrateHardcodedQtiGenerationForItemsAndTests = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-qti-generation-for-items-and-tests",
		name: "Orchestrate Hardcoded QTI Generation for Items and Tests"
	},
	{ event: "migration/hardcoded.qti.generate-items-and-tests" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded qti generation: DISPATCH PHASE", {
			courseCount: HARDCODED_COURSE_IDS.length,
			variationsPerItem: DIFFERENTIATION_COUNT
		})

		// ... (DB query to fetch courses is unchanged) ...
		const coursesResult = await errors.try(
			db.query.niceCourses.findMany({
				where: inArray(schema.niceCourses.id, HARDCODED_COURSE_IDS),
				columns: { id: true, slug: true }
			})
		)
		if (coursesResult.error) {
			logger.error("db query for courses failed", { error: coursesResult.error, courseIds: HARDCODED_COURSE_IDS })
			throw errors.wrap(coursesResult.error, "db query for courses")
		}
		const courses = coursesResult.data

		for (const course of courses) {
			const courseId = course.id
			logger.info("dispatching differentiation jobs for course", { courseId, courseSlug: course.slug })

			// ... (DB query to fetch all question IDs for the course remains the same) ...
			const unitsResult = await errors.try(
				db.query.niceUnits.findMany({
					where: eq(schema.niceUnits.courseId, course.id),
					columns: { id: true }
				})
			)
			if (unitsResult.error) {
				logger.error("db query for units failed", { courseId, error: unitsResult.error })
				throw errors.wrap(unitsResult.error, "db query for units")
			}
			const units = unitsResult.data
			logger.debug("fetched units for course", { courseId, unitCount: units.length })
			if (units.length === 0) {
				logger.info("no units found for course, skipping", { courseId })
				continue
			}
			const unitIds = units.map((u) => u.id)

			const questionsResult = await errors.try(
				db
					.selectDistinct({ id: schema.niceQuestions.id })
					.from(schema.niceQuestions)
					.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
					.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
					.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
					.where(inArray(schema.niceLessons.unitId, unitIds))
			)
			if (questionsResult.error) {
				logger.error("db query for questions failed", {
					courseId,
					unitCount: unitIds.length,
					error: questionsResult.error
				})
				throw errors.wrap(questionsResult.error, "db query for questions")
			}
			const questions = questionsResult.data

			if (questions.length === 0) {
				logger.info("no questions found for course, skipping dispatch", { courseId })
				continue
			}

			const questionIds = questions.map((q) => q.id)

			// 1. ✅ MODIFIED: Chunk all question IDs into batches of the desired size.
			const questionIdBatches: string[][] = []
			for (let i = 0; i < questionIds.length; i += QUESTION_BATCH_SIZE) {
				questionIdBatches.push(questionIds.slice(i, i + QUESTION_BATCH_SIZE))
			}

			// 2. ✅ MODIFIED: Use step.invoke to call differentiation function for each batch
			// Run all batches in parallel for better performance
			const batchPromises = questionIdBatches.map((batchIds, index) =>
				step.invoke(`differentiate-batch-${course.slug}-${index}`, {
					function: differentiateAndSaveQuestionBatch,
					data: {
						questionIds: batchIds,
						n: DIFFERENTIATION_COUNT,
						courseSlug: course.slug
					}
				})
			)

			// Wait for all batches to complete
			const batchResults = await Promise.all(batchPromises)

			logger.info("completed all differentiation batches for course", {
				courseId,
				totalQuestions: questions.length,
				batchCount: questionIdBatches.length,
				results: batchResults
			})
		}

		// 3. ✅ MODIFIED: Trigger the assembly step after all differentiation is complete.
		// Since we used step.invoke, we know all batches have completed at this point.
		await step.run("trigger-assembly-for-all-courses", async () => {
			await inngest.send({
				name: "qti/assembly.items.ready",
				data: {
					courseSlugs: courses.map((c) => c.slug)
				}
			})
		})

		logger.info("all differentiation jobs completed. triggered final assembly function.")

		return { status: "DISPATCH_AND_WAIT_COMPLETE", dispatchedCourseCount: courses.length }
	}
)
