import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { generatePayloadForCourse } from "./qti/generate-payload-for-course"
import { ingestAssessmentItems } from "./qti/ingest-assessment-items"
import { ingestAssessmentStimuli } from "./qti/ingest-assessment-stimuli"
import { ingestAssessmentTests } from "./qti/ingest-assessment-tests"

export const orchestrateCourseIngestionToQti = inngest.createFunction(
	{
		id: "orchestrate-course-ingestion-to-qti",
		name: "Orchestrate Course Ingestion to QTI"
	},
	{ event: "qti/course.ingest" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting qti server ingestion workflow", { courseId })

		// Step 1: Generate the full QTI payload for the course.
		const generationResult = await step.invoke("generate-qti-payload", {
			function: generatePayloadForCourse,
			data: { courseId }
		})

		const outputDir = generationResult.outputDir
		if (!generationResult.status || generationResult.status !== "success" || !outputDir) {
			throw errors.new("failed to generate qti payload")
		}
		logger.info("successfully generated qti payload", { courseId, outputDir })

		// Step 2: Read the generated files to get the data.
		const payload = await step.run("read-qti-payload-files", async () => {
			const readFile = async (filename: string): Promise<unknown[]> => {
				const filePath = path.join(outputDir, filename)
				const readResult = await errors.try(fs.readFile(filePath, "utf-8"))
				if (readResult.error) {
					logger.warn("could not read payload file, assuming empty", { file: filename, error: readResult.error })
					return [] // Return empty array if file doesn't exist or is invalid
				}
				const parseResult = await errors.try(JSON.parse(readResult.data))
				if (parseResult.error) {
					logger.warn("could not parse payload file, assuming empty", { file: filename, error: parseResult.error })
					return [] // Return empty array if file is invalid JSON
				}
				// Return the parsed data - the Inngest functions will validate the types
				return Array.isArray(parseResult.data) ? parseResult.data : []
			}

			const [assessmentStimuli, assessmentItems, assessmentTests] = await Promise.all([
				readFile("assessmentStimuli.json"),
				readFile("assessmentItems.json"),
				readFile("assessmentTests.json")
			])

			return { assessmentStimuli, assessmentItems, assessmentTests }
		})

		// Step 3: Ingest stimuli first (as items might depend on them).
		if (payload.assessmentStimuli.length > 0) {
			await step.invoke("invoke-ingest-stimuli", {
				function: ingestAssessmentStimuli,
				data: { stimuli: payload.assessmentStimuli }
			})
			logger.info("completed assessment stimuli ingestion", { courseId, count: payload.assessmentStimuli.length })
		} else {
			logger.info("no assessment stimuli to ingest", { courseId })
		}

		// Step 4: Ingest items next (as tests depend on them).
		if (payload.assessmentItems.length > 0) {
			await step.invoke("invoke-ingest-items", {
				function: ingestAssessmentItems,
				data: { items: payload.assessmentItems }
			})
			logger.info("completed assessment items ingestion", { courseId, count: payload.assessmentItems.length })
		} else {
			logger.info("no assessment items to ingest", { courseId })
		}

		// Step 5: Ingest tests last.
		if (payload.assessmentTests.length > 0) {
			await step.invoke("invoke-ingest-tests", {
				function: ingestAssessmentTests,
				data: { tests: payload.assessmentTests }
			})
			logger.info("completed assessment tests ingestion", { courseId, count: payload.assessmentTests.length })
		} else {
			logger.info("no assessment tests to ingest", { courseId })
		}

		logger.info("all qti ingestion steps have completed successfully", { courseId })
		return {
			message: "QTI Server ingestion workflow completed successfully.",
			courseId,
			stats: generationResult.stats
		}
	}
)
