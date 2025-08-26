import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { HARDCODED_SCIENCE_COURSE_IDS } from "@/lib/constants/course-mapping"
import { extractIdentifier, extractTitle, replaceRootAttributes } from "@/lib/xml-utils"

const EVENT_BATCH_SIZE = 500

export const backfillItemsAndStimuli = inngest.createFunction(
	{
		id: "backfill-items-and-stimuli",
		name: "Backfill QTI Items and Stimuli for Hardcoded Science Courses",
		retries: 0 // This is a manual, one-off function; retries should be managed by the invoker.
	},
	{ event: "qti/database.backfill-items-and-stimuli" },
	async ({ logger }) => {
		logger.info("starting unconditional backfill of QTI items and stimuli for hardcoded science courses")

		// 1. Fetch all questions with XML and their associated course slugs (science courses only).
		const itemsResult = await errors.try(
			db
				.select({
					xml: schema.niceQuestions.xml,
					khanId: schema.niceQuestions.id,
					khanExerciseId: schema.niceExercises.id,
					khanExerciseSlug: schema.niceExercises.slug,
					khanExerciseTitle: schema.niceExercises.title,
					courseSlug: schema.niceCourses.slug
				})
				.from(schema.niceQuestions)
				.where(and(
					isNotNull(schema.niceQuestions.xml),
					inArray(schema.niceCourses.id, HARDCODED_SCIENCE_COURSE_IDS)
				))
				.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
				.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
				.innerJoin(schema.niceCourses, eq(schema.niceUnits.courseId, schema.niceCourses.id))
		)
		if (itemsResult.error) {
			logger.error("failed to fetch qti items from database", { error: itemsResult.error })
			throw errors.wrap(itemsResult.error, "db fetch for items")
		}
		const allItems = itemsResult.data
		logger.info("fetched all qti items from db", { count: allItems.length })

		// 2. Fetch all articles with XML and their associated course slugs (science courses only).
		const stimuliResult = await errors.try(
			db
				.select({
					xml: schema.niceArticles.xml,
					khanId: schema.niceArticles.id,
					khanSlug: schema.niceArticles.slug,
					khanTitle: schema.niceArticles.title,
					courseSlug: schema.niceCourses.slug
				})
				.from(schema.niceArticles)
				.where(and(
					isNotNull(schema.niceArticles.xml),
					inArray(schema.niceCourses.id, HARDCODED_SCIENCE_COURSE_IDS)
				))
				.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
				.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
				.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
				.innerJoin(schema.niceCourses, eq(schema.niceUnits.courseId, schema.niceCourses.id))
		)
		if (stimuliResult.error) {
			logger.error("failed to fetch qti stimuli from database", { error: stimuliResult.error })
			throw errors.wrap(stimuliResult.error, "db fetch for stimuli")
		}
		const allStimuli = stimuliResult.data
		logger.info("fetched all qti stimuli from db", { count: allStimuli.length })

		// 3. Group all items and stimuli by course slug.
		const contentByCourse = new Map<string, { items: typeof allItems; stimuli: typeof allStimuli }>()

		for (const item of allItems) {
			if (!contentByCourse.has(item.courseSlug)) {
				contentByCourse.set(item.courseSlug, { items: [], stimuli: [] })
			}
			contentByCourse.get(item.courseSlug)?.items.push(item)
		}
		for (const stimulus of allStimuli) {
			if (!contentByCourse.has(stimulus.courseSlug)) {
				contentByCourse.set(stimulus.courseSlug, { items: [], stimuli: [] })
			}
			contentByCourse.get(stimulus.courseSlug)?.stimuli.push(stimulus)
		}
		logger.info("grouped all content by course", { courseCount: contentByCourse.size })

		// 4. For each course, build payloads, write to disk, and prepare fan-out events.
		const allEventsToDispatch = []

		for (const [courseSlug, content] of contentByCourse.entries()) {
			logger.info("processing course for backfill", {
				courseSlug,
				itemCount: content.items.length,
				stimulusCount: content.stimuli.length
			})

			// Build payloads with corrected identifiers in XML
			const itemPayload = content.items.map((i) => {
				if (!i.xml) {
					return {
						xml: i.xml,
						metadata: {
							khanId: i.khanId,
							khanExerciseId: i.khanExerciseId,
							khanExerciseSlug: i.khanExerciseSlug,
							khanExerciseTitle: i.khanExerciseTitle
						}
					}
				}

				// Extract the current title from XML, fallback to exercise title
				const currentTitle = extractTitle(i.xml) || i.khanExerciseTitle
				
				// Update the XML to use the prefixed Khan ID as the identifier
				const identifier = `nice_${i.khanId}`
				const updatedXml = replaceRootAttributes(i.xml, "qti-assessment-item", identifier, currentTitle)
				
				return {
					xml: updatedXml,
					metadata: {
						khanId: i.khanId,
						khanExerciseId: i.khanExerciseId,
						khanExerciseSlug: i.khanExerciseSlug,
						khanExerciseTitle: i.khanExerciseTitle
					}
				}
			})

			const stimulusPayload = content.stimuli.map((s) => {
				if (!s.xml) {
					return {
						xml: s.xml,
						metadata: {
							khanId: s.khanId,
							khanSlug: s.khanSlug,
							khanTitle: s.khanTitle
						}
					}
				}

				// Extract the current title from XML, fallback to article title
				const currentTitle = extractTitle(s.xml) || s.khanTitle
				
				// Update the XML to use the prefixed Khan ID as the identifier
				const identifier = `nice_${s.khanId}`
				const updatedXml = replaceRootAttributes(s.xml, "qti-assessment-stimulus", identifier, currentTitle)
				
				return {
					xml: updatedXml,
					metadata: {
						khanId: s.khanId,
						khanSlug: s.khanSlug,
						khanTitle: s.khanTitle
					}
				}
			})

			// Write payloads to disk so ingestion workers can find them
			const courseDir = path.join(process.cwd(), "data", courseSlug, "qti")
			await fs.mkdir(courseDir, { recursive: true })
			await Promise.all([
				fs.writeFile(path.join(courseDir, "assessmentItems.json"), JSON.stringify(itemPayload, null, 2)),
				fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(stimulusPayload, null, 2))
			])
			logger.debug("wrote payload files to disk", { courseSlug })

			// Prepare fan-out events using the prefixed identifiers (now in the updated XML)
			for (const item of itemPayload) {
				if (item.xml && item.metadata.khanId) {
					const identifier = `nice_${item.metadata.khanId}`
					allEventsToDispatch.push({
						name: "qti/assessment-item.ingest.one" as const,
						data: { courseSlug, identifier }
					})
				}
			}
			for (const stimulus of stimulusPayload) {
				if (stimulus.xml && stimulus.metadata.khanId) {
					const identifier = `nice_${stimulus.metadata.khanId}`
					allEventsToDispatch.push({
						name: "qti/assessment-stimulus.ingest.one" as const,
						data: { courseSlug, identifier }
					})
				}
			}
		}

		// 5. Dispatch all events in batches.
		logger.info("dispatching all backfill events", { totalEvents: allEventsToDispatch.length })
		for (let i = 0; i < allEventsToDispatch.length; i += EVENT_BATCH_SIZE) {
			const batch = allEventsToDispatch.slice(i, i + EVENT_BATCH_SIZE)
			const sendResult = await errors.try(inngest.send(batch))
			if (sendResult.error) {
				logger.error("failed to send batch of backfill events", { error: sendResult.error })
				throw errors.wrap(sendResult.error, "inngest batch send")
			}
			logger.debug("sent event batch", {
				batchNumber: i / EVENT_BATCH_SIZE + 1,
				size: batch.length
			})
		}

		logger.info("backfill dispatch complete")
		return {
			status: "success",
			dispatchedEvents: allEventsToDispatch.length,
			courseCount: contentByCourse.size
		}
	}
)
