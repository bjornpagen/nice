import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { extractIdentifier } from "@/lib/xml-utils"

export const orchestrateCourseUploadToQti = inngest.createFunction(
	{
		id: "orchestrate-course-upload-to-qti",
		name: "Orchestrate Course Upload to QTI",
		retries: 0 // The orchestrator itself should not retry; it manages retries of its children.
	},
	{ event: "qti/course.upload" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("Starting QTI upload event dispatch from local files", { courseId })

		// Determine file paths
		const courseResult = await db.query.niceCourses.findFirst({
			where: eq(schema.niceCourses.id, courseId),
			columns: { slug: true }
		})
		if (!courseResult) {
			logger.error("Course not found in database", { courseId })
			throw errors.new(`Course not found in database: ${courseId}`)
		}
		const courseDir = path.join(process.cwd(), "data", courseResult.slug, "qti")

		// Read all necessary files from disk before the step
		const readJsonFile = async (fileName: string) => {
			const filePath = path.join(courseDir, fileName)
			const readResult = await errors.try(fs.readFile(filePath, "utf-8"))
			if (readResult.error) {
				logger.error("Failed to read or parse file", { fileName, file: filePath, error: readResult.error })
				// Return empty array to allow the process to continue if a file is missing
				return []
			}
			const parseResult = errors.trySync(() => JSON.parse(readResult.data))
			if (parseResult.error) {
				logger.error("Failed to parse JSON", { fileName, file: filePath, error: parseResult.error })
				return []
			}
			return parseResult.data
		}

		const [items, stimuli, tests] = await Promise.all([
			readJsonFile("assessmentItems.json"),
			readJsonFile("assessmentStimuli.json"),
			readJsonFile("assessmentTests.json")
		])
		logger.info("Read QTI payloads from disk", {
			courseId,
			stimulusCount: stimuli.length,
			testCount: tests.length,
			itemCount: items.length
		})

		// This is now a dispatch-only operation, wrapped in a single step for atomicity.
		const dispatchResult = await step.run("dispatch-all-ingestion-events", async () => {
			const { slug: courseSlug } = courseResult

			// 1. Prepare Stimulus Events
			const stimulusEvents = stimuli.map((stimulus: { xml: string }) => {
				const identifier = extractIdentifier(stimulus.xml, "qti-assessment-stimulus")
				return identifier ? { name: "qti/assessment-stimulus.ingest.one", data: { courseSlug, identifier } } : null
			})

			// 2. Prepare Test Events
			const testEvents = tests.map((testXml: string) => {
				const identifier = extractIdentifier(testXml, "qti-assessment-test")
				return identifier ? { name: "qti/assessment-test.ingest.one", data: { courseSlug, identifier } } : null
			})

			// 3. Prepare Item Events
			const itemEvents = items.map((item: { xml: string }) => {
				const identifier = extractIdentifier(item.xml, "qti-assessment-item")
				return identifier ? { name: "qti/assessment-item.ingest.one", data: { courseSlug, identifier } } : null
			})

			// Combine and filter out any entities where an identifier couldn't be extracted
			const allEvents = [...stimulusEvents, ...testEvents, ...itemEvents].filter(Boolean)

			if (allEvents.length === 0) {
				logger.info("No valid events to dispatch.", { courseId })
				return {
					dispatched: 0,
					counts: {
						stimuli: 0,
						tests: 0,
						items: 0
					}
				}
			}

			// Send all events in batches to avoid payload size limits
			const BATCH_SIZE = 500
			for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
				const batch = allEvents.slice(i, i + BATCH_SIZE)
				await inngest.send(batch)
			}

			return {
				dispatched: allEvents.length,
				counts: {
					stimuli: stimulusEvents.filter(Boolean).length,
					tests: testEvents.filter(Boolean).length,
					items: itemEvents.filter(Boolean).length
				}
			}
		})

		logger.info("QTI upload event dispatch complete.", {
			courseId,
			totalEventsDispatched: dispatchResult.dispatched,
			...dispatchResult.counts
		})

		return {
			status: "success",
			message: `Dispatched ${dispatchResult.dispatched} QTI ingestion events.`,
			...dispatchResult
		}
	}
)
