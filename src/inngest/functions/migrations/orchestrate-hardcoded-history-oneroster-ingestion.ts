import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { orchestrateCourseOnerosterGeneration } from "@/inngest/functions/orchestrate-course-oneroster-generation"
import { orchestrateCourseUploadToOneroster } from "@/inngest/functions/orchestrate-course-upload-to-oneroster"

const HARDCODED_HISTORY_COURSE_IDS = [
	"x71a94f19", // us-history
	"xb87a304a", // ap-us-history
	"x66f79d8a", // world-history
	"xb41992e0ff5e0f09", // ap-world-history
	"x231f0f4241b58f49", // us-government-and-civics
	"x3e2fc37246974751" // ap-college-us-government-and-politics
]

const BATCH_SIZE = 3

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
	const chunks: T[][] = []
	for (let i = 0; i < items.length; i += chunkSize) {
		chunks.push(items.slice(i, i + chunkSize))
	}
	return chunks
}

export const orchestrateHardcodedHistoryOnerosterIngestion = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-history-oneroster-ingestion",
		name: "Orchestrate Hardcoded History Course OneRoster Generation and Upload"
	},
	{ event: "migration/hardcoded.history.oneroster.ingest" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded history oneroster data generation and upload", {
			courseCount: HARDCODED_HISTORY_COURSE_IDS.length
		})

		// Step 1: Generate OneRoster payloads in batches to limit concurrency
		logger.info("fanning out oneroster payload generation jobs", { batchSize: BATCH_SIZE })
		const generationBatches = chunkArray(HARDCODED_HISTORY_COURSE_IDS, BATCH_SIZE)
		for (const [batchIndex, batch] of generationBatches.entries()) {
			logger.info("starting generation batch", { batchIndex, count: batch.length })
			const generationPromises = batch.map((courseId) =>
				step.invoke(`generate-oneroster-payload-for-${courseId}`, {
					function: orchestrateCourseOnerosterGeneration,
					data: { courseId }
				})
			)
			const generationResults = await errors.try(Promise.all(generationPromises))
			if (generationResults.error) {
				logger.error("oneroster payload generation batch failed", { error: generationResults.error, batchIndex })
				throw errors.wrap(generationResults.error, "oneroster payload generation fan-out")
			}
			logger.info("completed generation batch", { batchIndex })
		}
		logger.info("successfully completed all oneroster payload generation jobs")

		// Step 2: Upload OneRoster payloads in batches to limit concurrency
		logger.info("fanning out oneroster upload jobs", { batchSize: BATCH_SIZE })
		const uploadBatches = chunkArray(HARDCODED_HISTORY_COURSE_IDS, BATCH_SIZE)
		for (const [batchIndex, batch] of uploadBatches.entries()) {
			logger.info("starting upload batch", { batchIndex, count: batch.length })
			const uploadPromises = batch.map((courseId) =>
				step.invoke(`upload-oneroster-payload-for-${courseId}`, {
					function: orchestrateCourseUploadToOneroster,
					data: { courseId }
				})
			)
			const uploadResults = await errors.try(Promise.all(uploadPromises))
			if (uploadResults.error) {
				logger.error("oneroster upload batch failed", { error: uploadResults.error, batchIndex })
				throw errors.wrap(uploadResults.error, "oneroster upload fan-out")
			}
			logger.info("completed upload batch", { batchIndex })
		}
		logger.info("successfully completed all oneroster upload jobs")

		logger.info("successfully completed oneroster generation and upload for all hardcoded history courses")
		return {
			status: "complete",
			courseCount: HARDCODED_HISTORY_COURSE_IDS.length
		}
	}
)
