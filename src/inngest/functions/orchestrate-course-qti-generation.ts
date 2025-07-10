import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type Events, inngest } from "@/inngest/client"

export const orchestrateCourseXmlGeneration = inngest.createFunction(
	{
		id: "orchestrate-course-qti-generation",
		name: "Orchestrate All QTI XML Generation for a Course"
	},
	{ event: "qti/course.generate-all-xml" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting batch qti xml generation for course", { courseId })

		// Step 1: Find all unit IDs for the given course.
		const unitsResult = await errors.try(
			db.select({ id: schema.niceUnits.id }).from(schema.niceUnits).where(eq(schema.niceUnits.courseId, courseId))
		)
		if (unitsResult.error) {
			logger.error("failed to fetch units for course", { courseId, error: unitsResult.error })
			throw errors.wrap(unitsResult.error, "db query for units")
		}
		const unitIds = unitsResult.data.map((u) => u.id)
		if (unitIds.length === 0) {
			logger.info("no units found for course, ending early", { courseId })
			return { message: "No units found for course." }
		}

		// Step 2: Find all articles and questions within those units that do NOT yet have XML.
		const articlesToGenerate = await db
			.select({ id: schema.niceArticles.id })
			.from(schema.niceArticles)
			.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(and(inArray(schema.niceLessons.unitId, unitIds), isNull(schema.niceArticles.xml)))

		const questionsToGenerate = await db
			.select({ id: schema.niceQuestions.id })
			.from(schema.niceQuestions)
			.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
			.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(and(inArray(schema.niceLessons.unitId, unitIds), isNull(schema.niceQuestions.xml)))

		logger.info("found content to generate", {
			articles: articlesToGenerate.length,
			questions: questionsToGenerate.length
		})

		// Step 3: Create event payloads instead of invocation promises.
		const articleEvents: Events["qti/stimulus.migrate"][] = articlesToGenerate.map((article) => ({
			name: "qti/stimulus.migrate",
			data: { articleId: article.id }
		}))

		const questionEvents: Events["qti/item.migrate"][] = questionsToGenerate.map((question) => ({
			name: "qti/item.migrate",
			data: { questionId: question.id }
		}))

		const allEvents = [...articleEvents, ...questionEvents]

		if (allEvents.length > 0) {
			// Step 4: Send all events in a single, non-blocking step.
			await step.run("send-generation-events", async () => {
				// We chunk the send call to avoid hitting Inngest's payload size limits.
				const BATCH_SIZE = 500
				for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
					const batch = allEvents.slice(i, i + BATCH_SIZE)
					await inngest.send(batch)
					logger.debug("sent event batch", {
						batchNumber: i / BATCH_SIZE + 1,
						size: batch.length
					})
				}
			})
		}

		logger.info("successfully dispatched all qti xml generation events for course", {
			courseId,
			articlesDispatched: articleEvents.length,
			questionsDispatched: questionEvents.length
		})

		return {
			message: `Successfully dispatched ${articleEvents.length} article and ${questionEvents.length} question generation events.`,
			courseId
		}
	}
)
