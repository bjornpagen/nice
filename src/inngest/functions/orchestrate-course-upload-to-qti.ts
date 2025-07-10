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

		// Ingest items and stimuli in parallel
		const promises = []
		if (items.length > 0) {
			promises.push(
				step.invoke("ingest-assessment-items", {
					function: ingestAssessmentItems,
					data: { items }
				})
			)
		}
		if (stimuli.length > 0) {
			promises.push(
				step.invoke("ingest-assessment-stimuli", {
					function: ingestAssessmentStimuli,
					data: { stimuli }
				})
			)
		}
		await Promise.all(promises)

		logger.info("completed ingestion of items and stimuli", { courseId })

		// Ingest tests after items and stimuli are complete
		if (tests.length > 0) {
			await step.invoke("ingest-assessment-tests", {
				function: ingestAssessmentTests,
				data: { tests }
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
