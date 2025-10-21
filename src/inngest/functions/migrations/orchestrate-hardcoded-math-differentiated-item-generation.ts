import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type Events, inngest } from "@/inngest/client"
// ✅ ADD: Import the new atomic function for AI generation.
// import { differentiateAndSaveQuestion } from "@/inngest/functions/qti/differentiate-and-save-question"
import { HARDCODED_MATH_COURSE_IDS } from "@/lib/constants/course-mapping"

const DIFFERENTIATION_COUNT = 1
const DISPATCH_BATCH_SIZE = 500

export const orchestrateHardcodedMathDifferentiatedItemGeneration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-math-differentiated-item-generation",
		name: "Orchestrate Hardcoded Math Course Differentiated QTI Item Generation",
		timeouts: {
			start: "30m"
		}
	},
	{ event: "migration/hardcoded.math.differentiated-items.generate" },
	async ({ logger }) => {
		logger.info("starting hardcoded qti generation: DISPATCH PHASE", {
			courseCount: HARDCODED_MATH_COURSE_IDS.length,
			variationsPerItem: DIFFERENTIATION_COUNT
		})

		// Fetch the courses to process
		const coursesResult = await errors.try(
			db.query.niceCourses.findMany({
				where: inArray(schema.niceCourses.id, [...HARDCODED_MATH_COURSE_IDS]),
				columns: { id: true, slug: true }
			})
		)
		if (coursesResult.error) {
			logger.error("db query for courses failed", { error: coursesResult.error, courseIds: HARDCODED_MATH_COURSE_IDS })
			throw errors.wrap(coursesResult.error, "db query for courses")
		}
		const courses = coursesResult.data

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

			// ✅ MODIFIED: Build events and dispatch in batches (mirrors migration dispatch robustness)
			const events: Events["qti/question.differentiate-and-save"][] = missingQuestionIds.map((questionId) => ({
				name: "qti/question.differentiate-and-save",
				data: { questionId, n: DIFFERENTIATION_COUNT, courseSlug: course.slug, widgetCollection: "math-core" }
			}))

			let dispatched = 0
			for (let i = 0; i < events.length; i += DISPATCH_BATCH_SIZE) {
				const batch = events.slice(i, i + DISPATCH_BATCH_SIZE)
				logger.info("sending differentiation event batch", {
					courseId,
					courseSlug: course.slug,
					batchStart: i,
					batchSize: batch.length
				})
				const sendResult = await errors.try(inngest.send(batch))
				if (sendResult.error) {
					logger.error("failed to send differentiation event batch", { courseId, error: sendResult.error })
					throw errors.wrap(sendResult.error, "inngest batch send")
				}
				dispatched += batch.length
				logger.debug("sent differentiation event batch", { courseId, batchStart: i, batchSize: batch.length })
			}
			logger.info("dispatched differentiation events for course", { courseId, dispatched })
		}

		// Kick off the assembly phase for all processed courses.
		const assemblySendResult = await errors.try(
			inngest.send({
				name: "qti/assembly.items.ready",
				data: { courseSlugs: courses.map((c) => c.slug) }
			})
		)
		if (assemblySendResult.error) {
			logger.error("failed to send assembly trigger event", { error: assemblySendResult.error })
			throw errors.wrap(assemblySendResult.error, "assembly trigger send")
		}
		logger.info("assembly trigger event sent", { courseCount: courses.length })

		return { status: "DISPATCH_COMPLETE", dispatchedCourseCount: courses.length }
	}
)
