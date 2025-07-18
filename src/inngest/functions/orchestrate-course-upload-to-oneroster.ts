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

			const course = await readFile("course.json")
			const classData = await readFile("class.json")
			const courseComponents = await readFile("courseComponents.json")
			const resources = await readFile("resources.json")
			const componentResources = await readFile("componentResources.json")
			const assessmentLineItems = await readFile("assessmentLineItems.json")

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

		// Ingest the course and its components in parallel.
		const courseIngestPromise = step.invoke("invoke-ingest-course", {
			function: ingestCourse,
			data: { course: payload.course }
		})
		const componentsIngestPromise =
			payload.courseComponents.length > 0
				? step.invoke("invoke-ingest-components", {
						function: ingestCourseComponents,
						data: { components: payload.courseComponents }
					})
				: Promise.resolve()
		await Promise.all([courseIngestPromise, componentsIngestPromise])
		logger.info("completed course and component ingestion", {
			courseId,
			components: payload.courseComponents.length
		})

		// Ingest component-resource links after their dependencies are created.
		if (payload.componentResources.length > 0) {
			await step.invoke("invoke-ingest-component-resources", {
				function: ingestComponentResources,
				data: { componentResources: payload.componentResources }
			})
			logger.info("completed component-resource link ingestion", {
				courseId,
				count: payload.componentResources.length
			})
		}

		// NEW Step 6: Ingest the hierarchically structured assessment line items.
		if (payload.assessmentLineItems.length > 0) {
			await step.invoke("invoke-ingest-assessment-line-items", {
				function: ingestAssessmentLineItems,
				data: { assessmentLineItems: payload.assessmentLineItems }
			})
			logger.info("completed hierarchical assessment line item ingestion", {
				courseId,
				count: payload.assessmentLineItems.length
			})
		}

		// Finally, ingest the class object for the course.
		await step.invoke("invoke-ingest-class", {
			function: ingestClass,
			data: { class: payload.class }
		})
		logger.info("completed class ingestion", { courseId, classSourcedId: payload.class.sourcedId })

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
