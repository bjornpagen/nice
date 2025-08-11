import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
// ✅ ADD: Import the new atomic function for AI generation.
import { differentiateAndSaveQuestion } from "@/inngest/functions/qti/differentiate-and-save-question"

const HARDCODED_COURSE_IDS = [
	"x0267d782", // 6th grade math (Common Core)
	"x6b17ba59", // 7th grade math (Common Core)
	"x7c7044d7" // 8th grade math (Common Core)
]

const DIFFERENTIATION_COUNT = 3
// ❌ REMOVED: The batch size is no longer needed for AI generation.

export const orchestrateHardcodedMathDifferentiatedItemGeneration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-math-differentiated-item-generation",
		name: "Orchestrate Hardcoded Math Course Differentiated QTI Item Generation"
	},
	{ event: "migration/hardcoded.math.differentiated-items.generate" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded qti generation: DISPATCH PHASE", {
			courseCount: HARDCODED_COURSE_IDS.length,
			variationsPerItem: DIFFERENTIATION_COUNT
		})

		// Fetch the courses to process
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

		const allInvocationPromises = []

		for (const course of courses) {
			const courseId = course.id
			logger.info("queuing differentiation jobs for course", { courseId, courseSlug: course.slug })

			// Fetch all units for the course
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

			// ❌ REMOVED: The logic for chunking questions into batches is removed.

			// Check for existing chunks on disk to enable idempotency.
			const chunksDir = path.join(process.cwd(), "data", course.slug, "qti", "items_chunks")
			// Ensure the directory exists before attempting to read from it. This is safe to run even if it exists.
			await fs.mkdir(chunksDir, { recursive: true })

			const existingChunksResult = await errors.try(fs.readdir(chunksDir))
			if (existingChunksResult.error) {
				logger.error("failed to read existing chunks directory", { dir: chunksDir, error: existingChunksResult.error })
				throw errors.wrap(existingChunksResult.error, "read chunks directory")
			}
			const existingChunkFiles = new Set(existingChunksResult.data)

			const missingQuestionIds = questionIds.filter((questionId) => {
				const expectedFilename = `chunk_${questionId}.json`
				return !existingChunkFiles.has(expectedFilename)
			})
			// ... (logging for skipping) ...
			if (missingQuestionIds.length < questionIds.length) {
				logger.info("some questions already completed, skipping them", {
					totalQuestions: questionIds.length,
					completedQuestions: questionIds.length - missingQuestionIds.length,
					questionsToProcess: missingQuestionIds.length
				})
			}

			if (missingQuestionIds.length === 0) {
				logger.info("all questions for course already completed, skipping dispatch", { courseId })
				continue // Proceed to the next course.
			}

			// ✅ MODIFIED: Use the `missingQuestionIds` array to create atomic invocation promises for the AI step.
			const courseInvocationPromises = missingQuestionIds.map((questionId) =>
				step.invoke(`differentiate-${course.slug}-${questionId}`, {
					function: differentiateAndSaveQuestion,
					data: {
						questionId: questionId,
						n: DIFFERENTIATION_COUNT,
						courseSlug: course.slug
					}
				})
			)

			allInvocationPromises.push(...courseInvocationPromises)
		}

		// ✅ MODIFIED: Await all AI generation promises from all courses concurrently after the loop.
		if (allInvocationPromises.length > 0) {
			logger.info("dispatching all AI generation jobs for all courses in parallel", {
				totalJobs: allInvocationPromises.length
			})
			await Promise.all(allInvocationPromises)
		}

		// Trigger the assembly step after all differentiation is complete.
		// Since we used step.invoke, we know all batches have completed at this point.
		await step.run("trigger-assembly-for-all-courses", async () => {
			await inngest.send({
				name: "qti/assembly.items.ready",
				data: {
					courseSlugs: courses.map((c) => c.slug)
				}
			})
		})

		// ... (final trigger-assembly step remains the same) ...

		return { status: "DISPATCH_AND_WAIT_COMPLETE", dispatchedCourseCount: courses.length }
	}
)
