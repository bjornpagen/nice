import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceArticles } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { paraphraseQtiStimulus } from "@/lib/ai/gemini"

export const paraphraseStimulus = inngest.createFunction(
	{
		id: "paraphrase-qti-stimulus",
		name: "Paraphrase QTI Stimulus using AI",
		concurrency: {
			limit: 5 // Align with the Gemini API concurrency limits
		}
	},
	{ event: "qti/stimulus.paraphrase" },
	async ({ event, step, logger }) => {
		const { articleId } = event.data
		logger.info("starting qti stimulus paraphrasing", { articleId })

		// Step 1: Fetch the source QTI XML and path from the database
		const sourceArticle = await step.run("fetch-source-stimulus", async () => {
			const result = await errors.try(
				db.query.niceArticles.findFirst({
					where: eq(niceArticles.id, articleId),
					columns: {
						xml: true,
						path: true
					}
				})
			)
			if (result.error) {
				logger.error("failed to fetch source stimulus from db", { error: result.error, articleId })
				throw errors.wrap(result.error, "db query for source stimulus")
			}
			return result.data
		})

		if (!sourceArticle?.xml) {
			logger.warn("source stimulus not found or has no XML", { articleId })
			return { status: "aborted", reason: "source_stimulus_not_found_or_empty" }
		}
		if (!sourceArticle.path) {
			logger.error("CRITICAL: Source article is missing its path", { articleId })
			throw errors.new("source article is missing required path for determining output directory")
		}

		logger.info("successfully fetched source stimulus", { articleId })
		const sourceXml = sourceArticle.xml

		// Step 2: Generate paraphrased version using the Gemini AI helper
		const paraphrasedXml = await step.run("generate-qti-paraphrase", async () => {
			return paraphraseQtiStimulus(sourceXml)
		})

		if (!paraphrasedXml) {
			logger.warn("gemini returned no paraphrased content", { articleId })
			return { status: "completed_with_warning", reason: "no_content_generated" }
		}

		logger.info("successfully generated paraphrased qti stimulus", { articleId })

		// Step 3: Save the generated XML to a JSON file in the correct directory
		const outputPath = await step.run("save-generated-stimulus", async () => {
			const pathParts = sourceArticle.path.split("/")
			const courseSlug = pathParts[2] // e.g., /math/[algebra-basics]/...
			if (!courseSlug) {
				logger.error("could not determine course slug from article path", { path: sourceArticle.path })
				throw errors.new("invalid article path format")
			}

			const outputDir = path.join(process.cwd(), `data/${courseSlug}/qti/generated-stimuli`)
			const filePath = path.join(outputDir, `${articleId}.json`)

			const mkdirResult = await errors.try(fs.mkdir(outputDir, { recursive: true }))
			if (mkdirResult.error) {
				logger.error("failed to create output directory", { error: mkdirResult.error, path: outputDir })
				throw errors.wrap(mkdirResult.error, "directory creation")
			}

			const jsonContent = JSON.stringify({ paraphrasedXml }, null, 2)
			const writeFileResult = await errors.try(fs.writeFile(filePath, jsonContent, "utf-8"))
			if (writeFileResult.error) {
				logger.error("failed to write output file", { error: writeFileResult.error, path: filePath })
				throw errors.wrap(writeFileResult.error, "file write")
			}

			return filePath
		})

		logger.info("paraphrasing complete, output saved", { articleId, outputPath })

		return {
			status: "success",
			articleId,
			outputPath
		}
	}
)
