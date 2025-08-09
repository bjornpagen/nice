import * as errors from "@superbuilders/errors"
import { eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type Events, inngest } from "@/inngest/client"

type Logger = {
	info: (message: string, attributes?: Record<string, unknown>) => void
	debug: (message: string, attributes?: Record<string, unknown>) => void
	error: (message: string, attributes?: Record<string, unknown>) => void
}

type MigrationOptions = {
	itemEventName: "qti/item.migrate" | "qti/item.migrate.focused"
	stimulusEventName: "qti/stimulus.migrate"
}

/**
 * Fetches all question and article IDs for a given set of course IDs and dispatches
 * the appropriate migration events to Inngest in batches.
 *
 * @param logger An Inngest-compatible logger.
 * @param courseIds An array of course IDs to process.
 * @param options Specifies which Inngest events to dispatch for items and stimuli.
 * @returns An object summarizing the number of events dispatched.
 */
export async function dispatchMigrationsForCourses(
	logger: Logger,
	courseIds: string[],
	options: MigrationOptions
): Promise<{ itemsDispatched: number; stimuliDispatched: number }> {
	logger.info("dispatching migrations for courses", { courseCount: courseIds.length, itemEvent: options.itemEventName })

	const unitsResult = await errors.try(
		db.select({ id: schema.niceUnits.id }).from(schema.niceUnits).where(inArray(schema.niceUnits.courseId, courseIds))
	)
	if (unitsResult.error) {
		logger.error("failed to fetch units for courses", { courseIds, error: unitsResult.error })
		throw errors.wrap(unitsResult.error, "db query for units")
	}
	const unitIds = unitsResult.data.map((u) => u.id)
	if (unitIds.length === 0) {
		logger.info("no units found for courses, skipping migration dispatch", { courseIds })
		return { itemsDispatched: 0, stimuliDispatched: 0 }
	}

	const [questionsToMigrate, articlesToMigrate] = await Promise.all([
		db
			.selectDistinct({ id: schema.niceQuestions.id })
			.from(schema.niceQuestions)
			.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
			.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(inArray(schema.niceLessons.unitId, unitIds)),
		db
			.selectDistinct({ id: schema.niceArticles.id })
			.from(schema.niceArticles)
			.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(inArray(schema.niceLessons.unitId, unitIds))
	])

	const itemEvents: Events["qti/item.migrate" | "qti/item.migrate.focused"][] = questionsToMigrate.map((question) => ({
		name: options.itemEventName,
		data: { questionId: question.id }
	}))

	const stimulusEvents: Events["qti/stimulus.migrate"][] = articlesToMigrate.map((article) => ({
		name: options.stimulusEventName,
		data: { articleId: article.id }
	}))

	const allEvents = [...itemEvents, ...stimulusEvents]
	if (allEvents.length > 0) {
		const BATCH_SIZE = 500
		for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
			const batch = allEvents.slice(i, i + BATCH_SIZE)
			const sendResult = await errors.try(inngest.send(batch))
			if (sendResult.error) {
				logger.error("failed to send migration event batch", { error: sendResult.error })
				throw errors.wrap(sendResult.error, "inngest batch send")
			}
			logger.debug("sent migration event batch", { batchNumber: i / BATCH_SIZE + 1, size: batch.length })
		}
	}

	logger.info("successfully dispatched all migration events", {
		itemsDispatched: itemEvents.length,
		stimuliDispatched: stimulusEvents.length
	})

	return {
		itemsDispatched: itemEvents.length,
		stimuliDispatched: stimulusEvents.length
	}
}
