import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { ingestAssessmentItems } from "./qti/ingest-assessment-items"
import { ingestAssessmentStimuli } from "./qti/ingest-assessment-stimuli"
import { ingestAssessmentTests } from "./qti/ingest-assessment-tests"

// Reduced batch size to avoid QTI API rate limits
// Smaller batches mean fewer concurrent token requests
const QTI_BATCH_SIZE = 100

export const orchestrateCourseUploadToQti = inngest.createFunction(
	{
		id: "orchestrate-course-upload-to-qti",
		name: "Orchestrate Course Upload to QTI"
	},
	{ event: "qti/course.upload" },
	async ({ event, step, logger }) => {
		const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null
		const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
		const hasSummaryFields = (
			value: unknown
		): value is { created: number; updated: number; skipped: number; failed: number } => {
			if (!isRecord(value)) return false
			const created = value.created
			const updated = value.updated
			const skipped = value.skipped
			const failed = value.failed
			return isNumber(created) && isNumber(updated) && isNumber(skipped) && isNumber(failed)
		}
		const { courseId } = event.data
		logger.info("starting qti upload workflow from local files", { courseId })

		// Get the course slug to determine the file path
		const courseResult = await db.query.niceCourses.findFirst({
			where: eq(schema.niceCourses.id, courseId),
			columns: { slug: true }
		})
		if (!courseResult) {
			throw errors.new(`course not found in database: ${courseId}`)
		}

		const courseDir = path.join(process.cwd(), "data", courseResult.slug, "qti")

		// Read the generated JSON files
		const readJsonFile = async (fileName: string) => {
			const filePath = path.join(courseDir, fileName)
			const result = await errors.try(fs.readFile(filePath, "utf-8"))
			if (result.error) {
				logger.error("failed to read qti json file", { filePath, error: result.error })
				throw errors.wrap(result.error, `read ${fileName}`)
			}
			return JSON.parse(result.data)
		}

		const [items, stimuli, tests] = await Promise.all([
			readJsonFile("assessmentItems.json"),
			readJsonFile("assessmentStimuli.json"),
			readJsonFile("assessmentTests.json")
		])

		logger.info("read qti payloads from disk", {
			courseId,
			itemCount: items.length,
			stimulusCount: stimuli.length,
			testCount: tests.length
		})

		// Ingest items sequentially, with batching
		if (items.length > 0) {
			const itemBatches = []
			for (let i = 0; i < items.length; i += QTI_BATCH_SIZE) {
				itemBatches.push(items.slice(i, i + QTI_BATCH_SIZE))
			}

			logger.info("processing assessment items in batches", {
				courseId,
				totalItems: items.length,
				batchSize: QTI_BATCH_SIZE,
				totalBatches: itemBatches.length
			})

			let itemsCreated = 0
			let itemsUpdated = 0
			let itemsSkipped = 0
			let itemsFailed = 0
			for (let i = 0; i < itemBatches.length; i++) {
				const res = await errors.try(
					step.invoke(`invoke-ingest-assessment-items-batch-${i + 1}`, {
						function: ingestAssessmentItems,
						data: { items: itemBatches[i] }
					})
				)
				if (res.error) {
					logger.error("assessment item ingestion batch failed", { courseId, batchIndex: i + 1, error: res.error })
					throw errors.wrap(res.error, "assessment item ingestion batch")
				}
				const summary = res.data
				if (hasSummaryFields(summary)) {
					itemsCreated += summary.created
					itemsUpdated += summary.updated
					itemsSkipped += summary.skipped
					itemsFailed += summary.failed
				}
				logger.info("completed item batch", {
					courseId,
					batchIndex: i + 1,
					totalBatches: itemBatches.length,
					created: itemsCreated,
					updated: itemsUpdated,
					skipped: itemsSkipped,
					failed: itemsFailed
				})
			}
			logger.info("completed all item batches", {
				courseId,
				created: itemsCreated,
				updated: itemsUpdated,
				skipped: itemsSkipped,
				failed: itemsFailed
			})
		}

		logger.info("completed ingestion of items", { courseId })

		// Ingest stimuli sequentially, with batching
		if (stimuli.length > 0) {
			const stimuliBatches = []
			for (let i = 0; i < stimuli.length; i += QTI_BATCH_SIZE) {
				stimuliBatches.push(stimuli.slice(i, i + QTI_BATCH_SIZE))
			}

			logger.info("processing assessment stimuli in batches", {
				courseId,
				totalStimuli: stimuli.length,
				batchSize: QTI_BATCH_SIZE,
				totalBatches: stimuliBatches.length
			})

			let stimuliCreated = 0
			let stimuliUpdated = 0
			let stimuliSkipped = 0
			let stimuliFailed = 0
			for (let i = 0; i < stimuliBatches.length; i++) {
				const res = await errors.try(
					step.invoke(`invoke-ingest-assessment-stimuli-batch-${i + 1}`, {
						function: ingestAssessmentStimuli,
						data: { stimuli: stimuliBatches[i] }
					})
				)
				if (res.error) {
					logger.error("assessment stimuli ingestion batch failed", { courseId, batchIndex: i + 1, error: res.error })
					throw errors.wrap(res.error, "assessment stimuli ingestion batch")
				}
				const summary = res.data
				if (hasSummaryFields(summary)) {
					stimuliCreated += summary.created
					stimuliUpdated += summary.updated
					stimuliSkipped += summary.skipped
					stimuliFailed += summary.failed
				}
				logger.info("completed stimulus batch", {
					courseId,
					batchIndex: i + 1,
					totalBatches: stimuliBatches.length,
					created: stimuliCreated,
					updated: stimuliUpdated,
					skipped: stimuliSkipped,
					failed: stimuliFailed
				})
			}
			logger.info("completed all stimulus batches", {
				courseId,
				created: stimuliCreated,
				updated: stimuliUpdated,
				skipped: stimuliSkipped,
				failed: stimuliFailed
			})
		}

		logger.info("completed ingestion of stimuli", { courseId })

		// Ingest tests after items and stimuli are complete, with batching
		if (tests.length > 0) {
			const testBatches = []
			for (let i = 0; i < tests.length; i += QTI_BATCH_SIZE) {
				testBatches.push(tests.slice(i, i + QTI_BATCH_SIZE))
			}

			logger.info("processing assessment tests in batches", {
				courseId,
				totalTests: tests.length,
				batchSize: QTI_BATCH_SIZE,
				totalBatches: testBatches.length
			})

			let testsCreated = 0
			let testsUpdated = 0
			let testsSkipped = 0
			let testsFailed = 0
			for (let i = 0; i < testBatches.length; i++) {
				const res = await errors.try(
					step.invoke(`invoke-ingest-assessment-tests-batch-${i + 1}`, {
						function: ingestAssessmentTests,
						data: { tests: testBatches[i] }
					})
				)
				if (res.error) {
					logger.error("assessment test ingestion batch failed", { courseId, batchIndex: i + 1, error: res.error })
					throw errors.wrap(res.error, "assessment test ingestion batch")
				}
				const summary = res.data
				if (hasSummaryFields(summary)) {
					testsCreated += summary.created
					testsUpdated += summary.updated
					testsSkipped += summary.skipped
					testsFailed += summary.failed
				}
				logger.info("completed test batch", {
					courseId,
					batchIndex: i + 1,
					totalBatches: testBatches.length,
					created: testsCreated,
					updated: testsUpdated,
					skipped: testsSkipped,
					failed: testsFailed
				})
			}
			logger.info("completed all test batches", {
				courseId,
				created: testsCreated,
				updated: testsUpdated,
				skipped: testsSkipped,
				failed: testsFailed
			})
		}

		logger.info("completed qti upload workflow", { courseId })

		return {
			status: "success",
			courseId,
			uploaded: {
				items: items.length,
				stimuli: stimuli.length,
				tests: tests.length
			}
		}
	}
)
