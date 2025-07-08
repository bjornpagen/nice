import * as errors from "@superbuilders/errors"
import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type Events, inngest } from "@/inngest/client"

const BATCH_SIZE = 100

export const generateAllAssessmentStimuliForCourse = inngest.createFunction(
	{
		id: "generate-all-assessment-stimuli-for-course",
		name: "Generate All Assessment Stimuli for a Course"
	},
	{ event: "nice/course.assessment-stimuli.generate" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting qti assessment stimulus generation for entire course", { courseId })

		// Step 1: Fetch all article IDs for the given courseId.
		const articleIdsResult = await errors.try(
			db
				.select({ articleId: schema.niceLessonContents.contentId })
				.from(schema.niceLessonContents)
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
				.where(and(eq(schema.niceUnits.courseId, courseId), eq(schema.niceLessonContents.contentType, "Article")))
		)

		if (articleIdsResult.error) {
			logger.error("failed to fetch article ids for course", { courseId, error: articleIdsResult.error })
			throw errors.wrap(articleIdsResult.error, "db query for course articles")
		}

		const articleIds = articleIdsResult.data.map((a) => a.articleId)

		if (articleIds.length === 0) {
			logger.warn("no articles found for course, aborting generation", { courseId })
			return { status: "aborted", reason: "no_articles_found", count: 0 }
		}

		logger.info("found articles to generate", { courseId, count: articleIds.length })

		// Step 2: Fan out migration events in batches.
		const migrationEvents: Events["nice/qti.assessment-stimulus.migration.requested"][] = articleIds.map(
			(articleId) => ({
				name: "nice/qti.assessment-stimulus.migration.requested",
				data: { articleId }
			})
		)

		for (let i = 0; i < migrationEvents.length; i += BATCH_SIZE) {
			const batch = migrationEvents.slice(i, i + BATCH_SIZE)
			await step.run(`send-stimulus-migration-batch-${i / BATCH_SIZE + 1}`, async () => {
				const sendResult = await errors.try(inngest.send(batch))
				if (sendResult.error) {
					logger.error("failed to send stimulus migration event batch", {
						courseId,
						batchNumber: i / BATCH_SIZE + 1,
						error: sendResult.error
					})
					throw errors.wrap(sendResult.error, "inngest send batch for stimuli")
				}
				logger.info("successfully sent stimulus migration event batch", {
					courseId,
					count: batch.length,
					batchNumber: i / BATCH_SIZE + 1
				})
				return { sent: batch.length }
			})
		}

		logger.info("successfully fanned out all qti assessment stimulus generation events for course", {
			courseId,
			count: articleIds.length
		})

		return { status: "success", count: articleIds.length }
	}
)
