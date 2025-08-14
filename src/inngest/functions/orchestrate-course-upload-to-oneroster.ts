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

// Universal batch size for OneRoster uploads
const ONEROSTER_BATCH_SIZE = 200

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
			logger.error("course not found in database", { courseId })
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

		// Step 3: Sequentially invoke the ingestion functions in strict dependency order with batching

		// 1. Ingest resources first (they are dependencies for componentResources) - BATCHED
		if (payload.resources.length > 0) {
			const resourceBatches = []
			for (let i = 0; i < payload.resources.length; i += ONEROSTER_BATCH_SIZE) {
				resourceBatches.push(payload.resources.slice(i, i + ONEROSTER_BATCH_SIZE))
			}

			logger.info("processing resources in parallel batches", {
				courseId,
				totalResources: payload.resources.length,
				batchSize: ONEROSTER_BATCH_SIZE,
				totalBatches: resourceBatches.length
			})

			const resourcePromises = resourceBatches.map((batch, i) =>
				step.invoke(`invoke-ingest-resources-batch-${i + 1}`, {
					function: ingestResources,
					data: { resources: batch }
				})
			)

			const resourceResults = await errors.try(Promise.all(resourcePromises))
			if (resourceResults.error) {
				logger.error("one or more resource ingestion steps failed", { courseId, error: resourceResults.error })
				throw errors.wrap(resourceResults.error, "resource ingestion fan-out")
			}

			logger.info("completed all resource batches", { courseId, totalResources: payload.resources.length })
		}

		// 2. Ingest course (must exist before courseComponents) - SINGLE ENTITY
		await step.invoke("invoke-ingest-course", {
			function: ingestCourse,
			data: { course: payload.course }
		})
		logger.info("completed course ingestion", { courseId })

		// 3. Ingest courseComponents (depend on course existing) - SINGLE BATCH
		if (payload.courseComponents.length > 0) {
			logger.info("processing all course components in single operation", {
				courseId,
				totalComponents: payload.courseComponents.length
			})

			await step.invoke("invoke-ingest-course-components", {
				function: ingestCourseComponents,
				data: { components: payload.courseComponents }
			})

			logger.info("completed course component ingestion", {
				courseId,
				totalComponents: payload.courseComponents.length
			})
		}

		// 4. Ingest componentResources (depend on both courseComponents and resources) - BATCHED
		if (payload.componentResources.length > 0) {
			const componentResourceBatches = []
			for (let i = 0; i < payload.componentResources.length; i += ONEROSTER_BATCH_SIZE) {
				componentResourceBatches.push(payload.componentResources.slice(i, i + ONEROSTER_BATCH_SIZE))
			}

			logger.info("processing component resources in parallel batches", {
				courseId,
				totalComponentResources: payload.componentResources.length,
				batchSize: ONEROSTER_BATCH_SIZE,
				totalBatches: componentResourceBatches.length
			})

			const componentResourcePromises = componentResourceBatches.map((batch, i) =>
				step.invoke(`invoke-ingest-component-resources-batch-${i + 1}`, {
					function: ingestComponentResources,
					data: { componentResources: batch }
				})
			)

			const componentResourceResults = await errors.try(Promise.all(componentResourcePromises))
			if (componentResourceResults.error) {
				logger.error("one or more component resource ingestion steps failed", {
					courseId,
					error: componentResourceResults.error
				})
				throw errors.wrap(componentResourceResults.error, "component resource ingestion fan-out")
			}

			logger.info("completed all component resource batches", {
				courseId,
				totalComponentResources: payload.componentResources.length
			})
		}

		// 5. Ingest class (depends on course) - SINGLE ENTITY
		await step.invoke("invoke-ingest-class", {
			function: ingestClass,
			data: { class: payload.class }
		})
		logger.info("completed class ingestion", { courseId, classSourcedId: payload.class.sourcedId })

		// 6. Ingest assessmentLineItems (depend on class and other entities) - HIERARCHICALLY
		if (payload.assessmentLineItems.length > 0) {
			await step.invoke("invoke-ingest-assessment-line-items", {
				function: ingestAssessmentLineItems,
				data: { assessmentLineItems: payload.assessmentLineItems }
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
