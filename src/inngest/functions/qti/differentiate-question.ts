import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { generateQtiVariations } from "@/lib/ai/gemini"

export const differentiateQuestion = inngest.createFunction(
	{
		id: "differentiate-qti-question",
		name: "Differentiate QTI Question using AI",
		concurrency: {
			// Limit concurrency to avoid overwhelming the Gemini API
			limit: 5
		}
	},
	{ event: "qti/question.differentiate" },
	async ({ event, step, logger }) => {
		const { questionId, numberOfVariations } = event.data
		logger.info("starting qti question differentiation", { questionId, numberOfVariations })

		// Step 1: Fetch the source QTI XML from the database
		const sourceQuestion = await step.run("fetch-source-question", async () => {
			const result = await errors.try(
				db.query.niceQuestions.findFirst({
					where: eq(niceQuestions.id, questionId),
					columns: {
						xml: true
					}
				})
			)
			if (result.error) {
				logger.error("failed to fetch source question from db", { error: result.error, questionId })
				throw errors.wrap(result.error, "db query for source question")
			}
			return result.data
		})

		if (!sourceQuestion?.xml) {
			logger.warn("source question not found or has no XML", { questionId })
			return { status: "aborted", reason: "source_question_not_found_or_empty" }
		}

		logger.info("successfully fetched source question", { questionId })

		// Extract xml to a const after the null check - TypeScript will understand it's non-null
		const sourceXml = sourceQuestion.xml

		// Step 2: Generate variations using the Gemini AI helper
		const generatedXmls = await step.run("generate-qti-variations", async () => {
			return generateQtiVariations(sourceXml, numberOfVariations)
		})

		if (generatedXmls.length === 0) {
			logger.warn("gemini returned no variations", { questionId })
			return { status: "completed_with_warning", reason: "no_variations_generated" }
		}

		logger.info("successfully generated qti variations", { questionId, count: generatedXmls.length })

		// Step 3: Save the generated XMLs to a JSON file
		const outputPath = await step.run("save-generated-content", async () => {
			const outputDir = path.join(process.cwd(), "data/qti/generatedcontent")
			const filePath = path.join(outputDir, `${questionId}.json`)

			const mkdirResult = await errors.try(fs.mkdir(outputDir, { recursive: true }))
			if (mkdirResult.error) {
				logger.error("failed to create output directory", { error: mkdirResult.error, path: outputDir })
				throw errors.wrap(mkdirResult.error, "directory creation")
			}

			const jsonContent = JSON.stringify({ differentiatedQuestions: generatedXmls }, null, 2)
			const writeFileResult = await errors.try(fs.writeFile(filePath, jsonContent, "utf-8"))
			if (writeFileResult.error) {
				logger.error("failed to write output file", { error: writeFileResult.error, path: filePath })
				throw errors.wrap(writeFileResult.error, "file write")
			}

			return filePath
		})

		logger.info("differentiation complete, output saved", { questionId, outputPath })

		return {
			status: "success",
			questionId,
			generatedCount: generatedXmls.length,
			outputPath
		}
	}
)
