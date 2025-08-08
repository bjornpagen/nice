import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { generateDifferentiatedItems } from "@/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items"

export const differentiateAndSaveQuestionBatch = inngest.createFunction(
	{
		id: "differentiate-and-save-question-batch",
		name: "Differentiate a Batch of Questions and Save to Disk"
	},
	{ event: "qti/questions.differentiate-and-save" }, // ✅ MODIFIED: Triggered by the new plural event.
	async ({ event, logger }) => {
		const { questionIds, n, courseSlug } = event.data

		// 1. Differentiate all questions in the batch in parallel.
		const differentiationPromises = questionIds.map((questionId) =>
			generateDifferentiatedItems(questionId, n, logger).catch((e) => {
				logger.error("differentiation failed for a single question in batch", { questionId, error: e })
				return [] // Return an empty array for failures to avoid failing the whole batch.
			})
		)
		const results = await Promise.all(differentiationPromises)

		// 2. Aggregate all successful results into a single array for the chunk.
		const batchItems = results.flat()

		if (batchItems.length === 0) {
			logger.warn("differentiation batch returned no items, skipping file write", { questionIds })
			return { status: "skipped", reason: "no_items_generated", questionIds }
		}

		// 3. Define a persistent, unique storage location for the batch chunk.
		// The filename is based on the first question ID in the batch to ensure uniqueness.
		const chunksDir = path.join(process.cwd(), "data", courseSlug, "qti", "items_chunks")
		await fs.mkdir(chunksDir, { recursive: true })
		const chunkFile = path.join(chunksDir, `chunk_${questionIds[0]}.json`)

		// 4. Write the aggregated result to a single disk file.
		const writeResult = await errors.try(fs.writeFile(chunkFile, JSON.stringify(batchItems, null, 2)))

		if (writeResult.error) {
			logger.error("failed to write differentiated batch chunk to disk", {
				file: chunkFile,
				error: writeResult.error
			})
			throw errors.wrap(writeResult.error, "failed to write chunk file")
		}

		logger.info("successfully saved differentiated batch chunk to disk", {
			file: chunkFile,
			itemCount: batchItems.length
		})

		return { success: true, chunkFile, itemCount: batchItems.length }
	}
)
