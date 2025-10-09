import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { ingestAssessmentLineItems } from "@/inngest/functions/oneroster/ingest-assessment-line-items"
import { HARDCODED_SCIENCE_COURSE_IDS } from "@/lib/constants/course-mapping"

export const orchestrateHardcodedScienceAssessmentLineItemUpload = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-science-assessmentlineitem-upload",
		name: "Orchestrate Hardcoded Science Assessment Line Item Upload"
	},
	{ event: "migration/hardcoded.science.assessmentLineItem.upload" },
	async ({ step, logger }) => {
		logger.info("starting hardcoded science assessment line item upload", {
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length
		})

		// Process each course
		for (const courseId of HARDCODED_SCIENCE_COURSE_IDS) {
			// Get the course slug OUTSIDE step.run
			const courseResult = await db.query.niceCourses.findFirst({
				where: eq(schema.niceCourses.id, courseId),
				columns: { slug: true }
			})
			if (!courseResult) {
				logger.error("course not found in database", { courseId })
				throw errors.new(`course not found in database: ${courseId}`)
			}
			const courseSlug = courseResult.slug
			const courseDir = path.join(process.cwd(), "data", courseSlug, "oneroster")

			// Read assessment line items from filesystem
			const assessmentLineItems = await step.run(`read-assessment-line-items-${courseId}`, async () => {
				logger.info("reading assessment line items for course", { courseId, courseSlug })

				const filePath = path.join(courseDir, "assessmentLineItems.json")
				const fileResult = await errors.try(fs.readFile(filePath, "utf-8"))
				if (fileResult.error) {
					logger.error("failed to read assessment line items file", {
						courseId,
						filePath,
						error: fileResult.error
					})
					throw errors.wrap(fileResult.error, "read assessment line items file")
				}
				const parseResult = errors.trySync(() => JSON.parse(fileResult.data))
				if (parseResult.error) {
					logger.error("failed to parse assessment line items json", {
						courseId,
						error: parseResult.error
					})
					throw errors.wrap(parseResult.error, "parse assessment line items json")
				}

				logger.info("read assessment line items from disk", {
					courseId,
					count: parseResult.data.length
				})

				return parseResult.data
			})

			// Invoke ingest function for this course
			if (assessmentLineItems.length > 0) {
				await step.invoke(`invoke-ingest-assessment-line-items-${courseId}`, {
					function: ingestAssessmentLineItems,
					data: { assessmentLineItems }
				})
			}

			logger.info("completed assessment line item upload for course", { courseId })
		}

		logger.info("successfully completed assessment line item upload for all hardcoded science courses")
		return {
			status: "complete",
			courseCount: HARDCODED_SCIENCE_COURSE_IDS.length
		}
	}
)

