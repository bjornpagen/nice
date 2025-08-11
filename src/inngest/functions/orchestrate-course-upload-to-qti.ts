import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { ingestAssessmentItemOne } from "@/inngest/functions/qti/ingest-assessment-item-one"
import { ingestAssessmentStimulusOne } from "@/inngest/functions/qti/ingest-assessment-stimulus-one"
import { ingestAssessmentTestOne } from "@/inngest/functions/qti/ingest-assessment-test-one"
import { extractIdentifier, extractItemRefs } from "@/lib/xml-utils"

export const orchestrateCourseUploadToQti = inngest.createFunction(
	{
		id: "orchestrate-course-upload-to-qti",
		name: "Orchestrate Course Upload to QTI",
		retries: 0 // The orchestrator itself should not retry; it manages retries of its children.
	},
	{ event: "qti/course.upload" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("Starting QTI upload orchestration from local files", { courseId })

		// Determine file paths
		const courseResult = await db.query.niceCourses.findFirst({
			where: eq(schema.niceCourses.id, courseId),
			columns: { slug: true }
		})
		if (!courseResult) {
			throw errors.new(`Course not found in database: ${courseId}`)
		}
		const courseDir = path.join(process.cwd(), "data", courseResult.slug, "qti")

		// Read all necessary files (no step.run)
		const readJsonFile = async (fileName: string) => {
			const filePath = path.join(courseDir, fileName)
			const readResult = await errors.try(fs.readFile(filePath, "utf-8"))
			if (readResult.error) {
				logger.error("file read", { file: filePath, error: readResult.error })
				throw errors.wrap(readResult.error, "file read")
			}
			const parseResult = errors.trySync(() => JSON.parse(readResult.data))
			if (parseResult.error) {
				logger.error("json parse", { file: filePath, error: parseResult.error })
				throw errors.wrap(parseResult.error, "json parse")
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
			itemCount: items.length,
			stimulusCount: stimuli.length,
			testCount: tests.length
		})

		const summary = {
			items: { created: 0, updated: 0, failed: 0, skipped: 0, total: items.length },
			stimuli: { created: 0, updated: 0, failed: 0, skipped: 0, total: stimuli.length },
			tests: { created: 0, updated: 0, failed: 0, skipped: 0, total: tests.length }
		}
		const successfullyIngestedItemIds = new Set<string>()

		// STAGE 1: Ingest all Assessment Items
		if (items.length > 0) {
			const itemPromises = items.map((item: { xml: string; metadata: Record<string, unknown> }) => {
				const identifier = extractIdentifier(item.xml, "qti-assessment-item") ?? ""
				return step.invoke(`ingest-item-${identifier || "unknown"}`, {
					function: ingestAssessmentItemOne,
					data: { identifier, xml: item.xml, metadata: item.metadata }
				})
			})
			const itemResults = await Promise.allSettled(itemPromises)
			for (const res of itemResults) {
				if (res.status === "fulfilled" && res.value) {
					if (res.value.status === "created") summary.items.created++
					if (res.value.status === "updated") summary.items.updated++
					if (res.value.identifier) successfullyIngestedItemIds.add(res.value.identifier)
				} else {
					summary.items.failed++
				}
			}
		}
		logger.info("Stage 1 (Items) complete.", { summary: summary.items })

		// STAGE 2: Ingest all Assessment Stimuli
		if (stimuli.length > 0) {
			const stimuliPromises = stimuli.map((stimulus: { xml: string; metadata: Record<string, unknown> }) => {
				const identifier = extractIdentifier(stimulus.xml, "qti-assessment-stimulus") ?? ""
				return step.invoke(`ingest-stimulus-${identifier || "unknown"}`, {
					function: ingestAssessmentStimulusOne,
					data: { identifier, xml: stimulus.xml, metadata: stimulus.metadata }
				})
			})
			const stimuliResults = await Promise.allSettled(stimuliPromises)
			for (const res of stimuliResults) {
				if (res.status === "fulfilled" && res.value) {
					if (res.value.status === "created") summary.stimuli.created++
					if (res.value.status === "updated") summary.stimuli.updated++
				} else {
					summary.stimuli.failed++
				}
			}
		}
		logger.info("Stage 2 (Stimuli) complete.", { summary: summary.stimuli })

		// STAGE 3: Ingest all Assessment Tests with Pre-flight Validation
		if (tests.length > 0) {
			for (const testXml of tests) {
				const testIdentifier = extractIdentifier(testXml, "qti-assessment-test") ?? `unknown-test-${Date.now()}`

				// Preflight: ensure all referenced items exist (no step.run)
				const referencedItemIds = extractItemRefs(testXml)
				const missingItemIds = referencedItemIds.filter((id) => !successfullyIngestedItemIds.has(id))
				if (missingItemIds.length === 0) {
					const testResult = await errors.try(
						step.invoke(`ingest-test-${testIdentifier}`, {
							function: ingestAssessmentTestOne,
							data: { identifier: testIdentifier, xml: testXml }
						})
					)
					if (testResult.error || !testResult.data) {
						summary.tests.failed++
					} else {
						if (testResult.data.status === "created") summary.tests.created++
						if (testResult.data.status === "updated") summary.tests.updated++
					}
				} else {
					logger.warn("Test references items that failed ingestion. Skipping test.", {
						testIdentifier,
						missingItemIds
					})
					summary.tests.skipped++
				}
			}
		}
		logger.info("Stage 3 (Tests) complete.", { summary: summary.tests })

		logger.info("QTI upload orchestration complete.", { finalSummary: summary })
		return { status: "success", summary }
	}
)
