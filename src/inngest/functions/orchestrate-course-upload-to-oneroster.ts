import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { ingestAssessmentLineItems } from "./oneroster/ingest-assessment-line-items"
import { ingestClass } from "./oneroster/ingest-class"
import { ingestComponentResources } from "./oneroster/ingest-component-resources"
import { ingestCourse } from "./oneroster/ingest-course"
import { ingestCourseComponents } from "./oneroster/ingest-course-components"
import { ingestResources } from "./oneroster/ingest-resources"

export const orchestrateCourseUploadToOneroster = inngest.createFunction(
	{
		id: "orchestrate-course-upload-to-oneroster",
		name: "Orchestrate Course Upload to OneRoster"
	},
	{ event: "oneroster/course.upload" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting oneroster upload workflow from local files", { courseId })

		// Step 1: Get the course slug to determine the file path, mirroring the QTI upload orchestrator.
		const courseResult = await db.query.niceCourses.findFirst({
			where: eq(schema.niceCourses.id, courseId),
			columns: { slug: true }
		})
		if (!courseResult) {
			throw errors.new(`course not found in database: ${courseId}`)
		}

		const courseDir = path.join(process.cwd(), "data", courseResult.slug, "oneroster")

		// Step 2: Read the generated payload files from the filesystem.
		const payload = await step.run("read-payload-files", async () => {
			const readFile = async (filename: string) => {
				const filePath = path.join(courseDir, filename)
				const content = await fs.readFile(filePath, "utf-8")
				return JSON.parse(content)
			}

			// Parallelize all file reads
			const [course, classData, courseComponents, resources, componentResources, assessmentLineItems] =
				await Promise.all([
					readFile("course.json"),
					readFile("class.json"),
					readFile("courseComponents.json"),
					readFile("resources.json"),
					readFile("componentResources.json"),
					readFile("assessmentLineItems.json")
				])

			return { course, class: classData, courseComponents, resources, componentResources, assessmentLineItems }
		})

		logger.info("read oneroster payloads from disk", {
			courseId,
			courseComponentCount: payload.courseComponents.length,
			resourceCount: payload.resources.length,
			componentResourceCount: payload.componentResources.length,
			assessmentLineItemCount: payload.assessmentLineItems.length
		})

		// Step 3: Sequentially invoke the ingestion functions, preserving the original, correct dependency order.

		// Ingest resources first as they are dependencies for componentResources.
		if (payload.resources.length > 0) {
			await step.invoke("invoke-ingest-resources", {
				function: ingestResources,
				data: { resources: payload.resources }
			})
			logger.info("completed resource ingestion", { courseId, count: payload.resources.length })
		}

		// Ingest course, components, and class in parallel (no dependencies between them)
		const parallelIngestionPromises = []

		parallelIngestionPromises.push(
			step.invoke("invoke-ingest-course", {
				function: ingestCourse,
				data: { course: payload.course }
			})
		)

		if (payload.courseComponents.length > 0) {
			parallelIngestionPromises.push(
				step.invoke("invoke-ingest-components", {
					function: ingestCourseComponents,
					data: { components: payload.courseComponents }
				})
			)
		}

		parallelIngestionPromises.push(
			step.invoke("invoke-ingest-class", {
				function: ingestClass,
				data: { class: payload.class }
			})
		)

		await Promise.all(parallelIngestionPromises)
		logger.info("completed course, components, and class ingestion", {
			courseId,
			components: payload.courseComponents.length
		})
		logger.info("completed class ingestion", { courseId, classSourcedId: payload.class.sourcedId })

		// Ingest component-resource links and assessment line items in parallel
		// Both depend on previously ingested data but not on each other
		const finalIngestionPromises = []

		if (payload.componentResources.length > 0) {
			finalIngestionPromises.push(
				step.invoke("invoke-ingest-component-resources", {
					function: ingestComponentResources,
					data: { componentResources: payload.componentResources }
				})
			)
		}

		if (payload.assessmentLineItems.length > 0) {
			finalIngestionPromises.push(
				step.invoke("invoke-ingest-assessment-line-items", {
					function: ingestAssessmentLineItems,
					data: { assessmentLineItems: payload.assessmentLineItems }
				})
			)
		}

		if (finalIngestionPromises.length > 0) {
			await Promise.all(finalIngestionPromises)
			logger.info("completed component resources and assessment line items ingestion", {
				courseId,
				componentResourceCount: payload.componentResources.length,
				assessmentLineItemCount: payload.assessmentLineItems.length
			})
		}

		logger.info("all oneroster upload steps have completed successfully", { courseId })

		return {
			message: "OneRoster upload workflow completed successfully.",
			courseId,
			uploaded: {
				course: 1,
				class: 1,
				courseComponents: payload.courseComponents.length,
				resources: payload.resources.length,
				componentResources: payload.componentResources.length,
				assessmentLineItems: payload.assessmentLineItems.length
			}
		}
	}
)
