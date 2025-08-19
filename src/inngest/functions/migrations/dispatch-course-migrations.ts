import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type Events, inngest } from "@/inngest/client"
import type { WidgetCollectionName } from "@/lib/widget-collections" // NEW: Import WidgetCollectionName

type Logger = {
	debug: (message: string, attributes?: Record<string, unknown>) => void
	info: (message: string, attributes?: Record<string, unknown>) => void
	warn?: (message: string, attributes?: Record<string, unknown>) => void
	error: (message: string, attributes?: Record<string, unknown>) => void
}

type MigrationOptions = {
	// MODIFIED: Updated to a single item event name.
	itemEventName?: "qti/item.migrate"
	// MODIFIED: widgetCollection is now mandatory if itemEventName is present.
	// This ensures that when an item migration is requested, the collection is always specified.
	widgetCollection?: WidgetCollectionName
	// Keep existing stimulus event name
	stimulusEventName?: "qti/stimulus.migrate"
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
	logger.info("dispatching migrations for courses", {
		courseCount: courseIds.length,
		itemEvent: options.itemEventName,
		stimulusEvent: options.stimulusEventName,
		widgetCollection: options.widgetCollection // NEW: Log widgetCollection
	})

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

	// MODIFIED: Conditionally fetch questions and articles based on options
	const [questionsToMigrate, articlesToMigrate] = await Promise.all([
		options.itemEventName
			? db
					.selectDistinct({ id: schema.niceQuestions.id })
					.from(schema.niceQuestions)
					.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
					.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
					.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
					.where(
						and(
							inArray(schema.niceLessons.unitId, unitIds),
							isNull(schema.niceQuestions.xml),
							isNull(schema.niceQuestions.structuredJson)
						)
					)
			: Promise.resolve([]), // Return empty array if not requested
		options.stimulusEventName
			? db
					.selectDistinct({ id: schema.niceArticles.id })
					.from(schema.niceArticles)
					.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
					.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
					.where(inArray(schema.niceLessons.unitId, unitIds))
			: Promise.resolve([]) // Return empty array if not requested
	])

	// MODIFIED: itemEvents now only uses "qti/item.migrate"
	const itemEvents: Events["qti/item.migrate"][] = []
	// MODIFIED: Only push item events if itemEventName is provided
	if (options.itemEventName) {
		// CRITICAL: Ensure widgetCollection is provided when itemEventName is set.
		// If itemEventName is set, widgetCollection must also be set due to the updated event schema.
		if (!options.widgetCollection) {
			logger.error("widgetCollection is required when itemEventName is 'qti/item.migrate'", {
				itemEventName: options.itemEventName
			})
			throw errors.new("widgetCollection is required when itemEventName is 'qti/item.migrate'")
		}
		const eventName = options.itemEventName // Capture to ensure TypeScript knows it's defined
		const widgetCollection = options.widgetCollection // Capture to ensure TypeScript knows it's defined
		itemEvents.push(
			...questionsToMigrate.map((question) => ({
				name: eventName,
				data: {
					questionId: question.id,
					widgetCollection: widgetCollection // MODIFIED: Pass widgetCollection
				}
			}))
		)
	}

	const stimulusEvents: Events["qti/stimulus.migrate"][] = []
	// MODIFIED: Only push stimulus events if stimulusEventName is provided
	if (options.stimulusEventName) {
		const eventName = options.stimulusEventName // Capture to ensure TypeScript knows it's defined
		stimulusEvents.push(
			...articlesToMigrate.map((article) => ({
				name: eventName,
				data: { articleId: article.id }
			}))
		)
	}

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
