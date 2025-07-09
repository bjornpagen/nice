import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles, niceLessonContents, niceLessons, niceUnits } from "@/db/schemas"
import { inngest } from "@/inngest/client"

export const requestAllStimulusMigrationsForCourse = inngest.createFunction(
	{
		id: "request-all-stimulus-migrations-for-course",
		name: "Request All Stimulus Migrations for Course"
	},
	{ event: "qti/course.migrate-all-stimuli" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting all assessment stimulus migrations for course", { courseId })

		// Step 1: Get all article IDs from lessons in the course
		const articlesResult = await errors.try(
			db
				.select({ id: niceArticles.id })
				.from(niceArticles)
				.innerJoin(niceLessonContents, eq(niceArticles.id, niceLessonContents.contentId))
				.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
				.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
				.where(eq(niceUnits.courseId, courseId))
		)

		if (articlesResult.error) {
			logger.error("failed to fetch articles for course", { courseId, error: articlesResult.error })
			throw errors.wrap(articlesResult.error, "db query")
		}

		const articleIds = articlesResult.data.map((a) => a.id)
		logger.info("found articles to migrate", { courseId, count: articleIds.length })

		if (articleIds.length === 0) {
			logger.info("no articles found for course", { courseId })
			return { status: "completed", courseId, migratedCount: 0 }
		}

		// Step 2: Send migration events for each article
		const migrationEvents = articleIds.map((articleId) => ({
			name: "qti/stimulus.migrate" as const,
			data: { articleId }
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

		logger.info("completed all article migration requests", {
			courseId,
			total: articleIds.length
		})

		return {
			status: "completed",
			courseId,
			totalArticles: articleIds.length,
			requestedCount: articleIds.length
		}
	}
)
