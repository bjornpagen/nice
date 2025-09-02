import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { HARDCODED_SCIENCE_COURSE_IDS } from "@/lib/constants/course-mapping"
import { extractTitle, replaceRootAttributes } from "@/lib/xml-utils"

const EVENT_BATCH_SIZE = 500

export const backfillStimuliOnly = inngest.createFunction(
	{
		id: "backfill-stimuli",
		name: "Backfill QTI Stimuli for Hardcoded Science Courses",
		retries: 0
	},
	{ event: "qti/database.backfill-stimuli" },
	async ({ logger }) => {
		logger.info("starting stimuli-only backfill for hardcoded science courses")

		// 1) Fetch all stimuli (articles) with XML for the hardcoded science courses
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
		logger.info("fetched qti stimuli from db", { count: allStimuli.length })

		// 2) Group by course slug
		const stimuliByCourse = new Map<string, typeof allStimuli>()
		for (const s of allStimuli) {
			const existing = stimuliByCourse.get(s.courseSlug)
			if (existing) {
				existing.push(s)
			} else {
				stimuliByCourse.set(s.courseSlug, [s])
			}
		}
		logger.info("grouped stimuli by course", { courseCount: stimuliByCourse.size })

		// 3) Build payloads, write to disk, and prepare events
		const eventsToDispatch: Array<{ name: "qti/assessment-stimulus.ingest.one"; data: { courseSlug: string; identifier: string } }> = []

		for (const [courseSlug, stimuli] of stimuliByCourse.entries()) {
			logger.info("processing course for stimuli backfill", { courseSlug, stimulusCount: stimuli.length })

			const stimulusPayload = stimuli.map((s) => {
				if (s.xml == null) {
					logger.error("stimulus missing xml", { khanId: s.khanId, courseSlug })
					throw errors.new("stimulus xml missing")
				}

				const extractedTitle = extractTitle(s.xml)
				if (extractedTitle == null || extractedTitle === "") {
					logger.error("stimulus xml missing title", { khanId: s.khanId, courseSlug })
					throw errors.new("stimulus title missing")
				}

				const identifier = `nice_${s.khanId}`
				const updatedXml = replaceRootAttributes(s.xml, "qti-assessment-stimulus", identifier, extractedTitle)

				return {
					xml: updatedXml,
					metadata: {
						khanId: s.khanId,
						khanSlug: s.khanSlug,
						khanTitle: s.khanTitle
					}
				}
			})

			// Write payloads to disk
			const courseDir = path.join(process.cwd(), "data", courseSlug, "qti")
			const mkdirResult = await errors.try(fs.mkdir(courseDir, { recursive: true }))
			if (mkdirResult.error) {
				logger.error("file mkdir", { file: courseDir, error: mkdirResult.error })
				throw errors.wrap(mkdirResult.error, "file mkdir")
			}
			const writeResult = await errors.try(
				fs.writeFile(path.join(courseDir, "assessmentStimuli.json"), JSON.stringify(stimulusPayload, null, 2))
			)
			if (writeResult.error) {
				logger.error("file write", { file: path.join(courseDir, "assessmentStimuli.json"), error: writeResult.error })
				throw errors.wrap(writeResult.error, "file write")
			}
			logger.debug("wrote stimulus payload file to disk", { courseSlug })

			// Prepare ingestion events
			for (const stimulus of stimulusPayload) {
				const khanId = stimulus.metadata.khanId as string
				const identifier = `nice_${khanId}`
				eventsToDispatch.push({
					name: "qti/assessment-stimulus.ingest.one",
					data: { courseSlug, identifier }
				})
			}
		}

		// 4) Dispatch all events in batches
		logger.info("dispatching stimulus backfill events", { totalEvents: eventsToDispatch.length })
		for (let i = 0; i < eventsToDispatch.length; i += EVENT_BATCH_SIZE) {
			const batch = eventsToDispatch.slice(i, i + EVENT_BATCH_SIZE)
			const sendResult = await errors.try(inngest.send(batch))
			if (sendResult.error) {
				logger.error("failed to send batch of stimulus backfill events", { error: sendResult.error })
				throw errors.wrap(sendResult.error, "inngest batch send")
			}
			logger.debug("sent stimulus event batch", { batchNumber: i / EVENT_BATCH_SIZE + 1, size: batch.length })
		}

		logger.info("stimulus-only backfill dispatch complete")
		return {
			status: "success",
			dispatchedEvents: eventsToDispatch.length,
			courseCount: stimuliByCourse.size
		}
	}
)


