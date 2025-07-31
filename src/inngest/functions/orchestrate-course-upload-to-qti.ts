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

// Universal batch size for QTI uploads
const QTI_BATCH_SIZE = 200

export const orchestrateCourseUploadToQti = inngest.createFunction(
	{
		id: "orchestrate-course-upload-to-qti",
		name: "Orchestrate Course Upload to QTI"
	},
	{ event: "qti/course.upload" },
	async ({ event, step, logger }) => {
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

			for (let i = 0; i < itemBatches.length; i++) {
				const batch = itemBatches[i]
				await step.invoke(`invoke-ingest-assessment-items-batch-${i + 1}`, {
					function: ingestAssessmentItems,
					data: { items: batch }
				})
				logger.info("completed assessment item batch", {
					courseId,
					batchNumber: i + 1,
					totalBatches: itemBatches.length,
					batchSize: batch.length,
					totalProcessed: (i + 1) * QTI_BATCH_SIZE,
					remaining: Math.max(0, items.length - (i + 1) * QTI_BATCH_SIZE)
				})
			}
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

			for (let i = 0; i < stimuliBatches.length; i++) {
				const batch = stimuliBatches[i]
				await step.invoke(`invoke-ingest-assessment-stimuli-batch-${i + 1}`, {
					function: ingestAssessmentStimuli,
					data: { stimuli: batch }
				})
				logger.info("completed assessment stimuli batch", {
					courseId,
					batchNumber: i + 1,
					totalBatches: stimuliBatches.length,
					batchSize: batch.length,
					totalProcessed: (i + 1) * QTI_BATCH_SIZE,
					remaining: Math.max(0, stimuli.length - (i + 1) * QTI_BATCH_SIZE)
				})
			}
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

			for (let i = 0; i < testBatches.length; i++) {
				const batch = testBatches[i]
				await step.invoke(`invoke-ingest-assessment-tests-batch-${i + 1}`, {
					function: ingestAssessmentTests,
					data: { tests: batch }
				})
				logger.info("completed assessment test batch", {
					courseId,
					batchNumber: i + 1,
					totalBatches: testBatches.length,
					batchSize: batch.length,
					totalProcessed: (i + 1) * QTI_BATCH_SIZE,
					remaining: Math.max(0, tests.length - (i + 1) * QTI_BATCH_SIZE)
				})
			}
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
