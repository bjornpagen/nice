import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { extractIdentifier } from "@/lib/xml-utils"

export const orchestrateCourseUploadToQtiBySlug = inngest.createFunction(
	{
		id: "orchestrate-course-upload-to-qti-by-slug",
		name: "Orchestrate Course Upload to QTI by Slug",
		retries: 0
	},
	{ event: "qti/course.upload.by-slug" },
	async ({ event, step, logger }) => {
		const { slug } = event.data
		logger.info("starting qti upload event dispatch from local files", { slug })

		const qtiDir = path.join(process.cwd(), "data", slug, "qti")

		// Read all QTI files from disk before the step
		const readJsonFile = async (fileName: string) => {
			const filePath = path.join(qtiDir, fileName)
			const readResult = await errors.try(fs.readFile(filePath, "utf-8"))
			if (readResult.error) {
				logger.error("failed to read qti file", { fileName, file: filePath, error: readResult.error })
				return []
			}
			const parseResult = errors.trySync(() => JSON.parse(readResult.data))
			if (parseResult.error) {
				logger.error("failed to parse qti json", { fileName, file: filePath, error: parseResult.error })
				return []
			}
			return parseResult.data
		}

		const [items, stimuli, tests] = await Promise.all([
			readJsonFile("assessmentItems.json"),
			readJsonFile("assessmentStimuli.json"),
			readJsonFile("assessmentTests.json")
		])
		logger.info("read qti payloads from disk", {
			slug,
			stimulusCount: stimuli.length,
			testCount: tests.length,
			itemCount: items.length
		})

		// Dispatch all ingestion events in a single step
		const dispatchResult = await step.run("dispatch-all-ingestion-events", async () => {
			const courseSlug = slug

			// Prepare Stimulus Events
			const stimulusEvents = stimuli.map((stimulus: { xml: string }) => {
				const identifier = extractIdentifier(stimulus.xml, "qti-assessment-stimulus")
				return identifier ? { name: "qti/assessment-stimulus.ingest.one", data: { courseSlug, identifier } } : null
			})

			// Prepare Test Events
			const testEvents = tests.map((testXml: string) => {
				const identifier = extractIdentifier(testXml, "qti-assessment-test")
				return identifier ? { name: "qti/assessment-test.ingest.one", data: { courseSlug, identifier } } : null
			})

			// Prepare Item Events
			const itemEvents = items.map((item: { xml: string }) => {
				const identifier = extractIdentifier(item.xml, "qti-assessment-item")
				return identifier ? { name: "qti/assessment-item.ingest.one", data: { courseSlug, identifier } } : null
			})

			// Combine and filter out any entities where an identifier couldn't be extracted
			const allEvents = [...stimulusEvents, ...testEvents, ...itemEvents].filter(Boolean)

			if (allEvents.length === 0) {
				logger.info("no valid qti events to dispatch", { slug })
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

		logger.info("qti upload event dispatch complete", {
			slug,
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

