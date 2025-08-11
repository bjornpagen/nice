import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { generateDifferentiatedItems } from "@/inngest/functions/qti/convert-perseus-question-to-differentiated-qti-items"

export const differentiateAndSaveQuestion = inngest.createFunction(
	{
		id: "differentiate-and-save-question",
		name: "Differentiate a Single Question and Save to Disk"
	},
	{ event: "qti/question.differentiate-and-save" },
	async ({ event, logger }) => {
		const { questionId, n, courseSlug } = event.data

		// 1. Differentiate the single question.
		const generatedItems = await generateDifferentiatedItems(questionId, n, logger).catch((e) => {
			logger.error("AI differentiation failed for question", { questionId, error: e })
			// Throw the error to let Inngest handle the retry for this specific job.
			throw errors.wrap(e, `AI differentiation failed for question ${questionId}`)
		})

		if (generatedItems.length === 0) {
			logger.warn("differentiation returned no items, skipping file write", { questionId })
			return { status: "skipped", reason: "no_items_generated", questionId }
		}

		// 2. Define a persistent, unique storage location for the item's chunk.
		const chunksDir = path.join(process.cwd(), "data", courseSlug, "qti", "items_chunks")
		await fs.mkdir(chunksDir, { recursive: true })
		const chunkFile = path.join(chunksDir, `chunk_${questionId}.json`)

		// 3. Write the result to its own disk file.
		const writeResult = await errors.try(fs.writeFile(chunkFile, JSON.stringify(generatedItems, null, 2)))

		if (writeResult.error) {
			logger.error("failed to write differentiated chunk to disk", { file: chunkFile, error: writeResult.error })
			throw errors.wrap(writeResult.error, "failed to write chunk file")
		}

		logger.info("successfully saved differentiated chunk to disk", {
			file: chunkFile,
			itemCount: generatedItems.length
		})
		return { success: true, chunkFile, itemCount: generatedItems.length }
	}
)
