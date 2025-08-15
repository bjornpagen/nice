import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { ingestAssessmentLineItems } from "@/inngest/functions/oneroster/ingest-assessment-line-items"
import { ingestClass } from "@/inngest/functions/oneroster/ingest-class"
import { ingestComponentResourceOne } from "@/inngest/functions/oneroster/ingest-component-resource-one"
import { ingestCourse } from "@/inngest/functions/oneroster/ingest-course"
import { ingestCourseComponents } from "@/inngest/functions/oneroster/ingest-course-components"
import { ingestResourceOne } from "@/inngest/functions/oneroster/ingest-resource-one"

export const orchestrateCourseUploadToOneroster = inngest.createFunction(
	{
		id: "orchestrate-course-upload-to-oneroster",
		name: "Orchestrate Course Upload to OneRoster"
	},
	{ event: "oneroster/course.upload" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting oneroster upload workflow from local files", { courseId })

		// Step 1: Get the course slug to determine the file path.
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

		// Step 2: Read all generated payload files from the filesystem.
		const payload = await step.run("read-payload-files", async () => {
			const readFile = async (filename: string) => {
				const filePath = path.join(courseDir, filename)
				const content = await fs.readFile(filePath, "utf-8")
				return JSON.parse(content)
			}

			// Parallelize all file reads
			const [courseComponents, resources, componentResources, assessmentLineItems] = await Promise.all([
				readFile("courseComponents.json"),
				readFile("resources.json"),
				readFile("componentResources.json"),
				readFile("assessmentLineItems.json")
			])

			return { courseComponents, resources, componentResources, assessmentLineItems }
		})

		logger.info("read oneroster payloads from disk", {
			courseId,
			resourceCount: payload.resources.length,
			courseComponentCount: payload.courseComponents.length,
			componentResourceCount: payload.componentResources.length,
			assessmentLineItemCount: payload.assessmentLineItems.length
		})

		// Step 3: Sequentially invoke ingestion functions in strict dependency order.

		// STAGE 1: Course and Resources (no dependencies on other uploaded items)
		const coursePromise = step.invoke("invoke-ingest-course", {
			function: ingestCourse,
			data: { courseSlug }
		})

		const resourcePromises = payload.resources.map((resource: { sourcedId: string }) =>
			step.invoke(`invoke-ingest-resource-${resource.sourcedId}`, {
				function: ingestResourceOne,
				data: { courseSlug, sourcedId: resource.sourcedId }
			})
		)
		logger.info("fanning out course and resource ingestion", { resourceCount: resourcePromises.length })

		// STAGE 2: Course Components and Class (depend on Course)
		await coursePromise
		logger.info("course ingestion complete, proceeding to dependents", { courseId })

		const classPromise = step.invoke("invoke-ingest-class", {
			function: ingestClass,
			data: { courseSlug }
		})
		const componentsPromise = step.invoke("invoke-ingest-course-components", {
			function: ingestCourseComponents,
			data: { components: payload.courseComponents }
		})

		// STAGE 3: Component Resources (depend on Course Components and Resources)
		await Promise.all([componentsPromise, ...resourcePromises])
		logger.info("resource and course component ingestion complete, proceeding to component-resources", {
			resourceCount: resourcePromises.length,
			componentCount: payload.courseComponents.length
		})

		const componentResourcePromises = payload.componentResources.map((cr: { sourcedId: string }) =>
			step.invoke(`invoke-ingest-cr-${cr.sourcedId}`, {
				function: ingestComponentResourceOne,
				data: { courseSlug, sourcedId: cr.sourcedId }
			})
		)
		logger.info("fanning out component-resource ingestion", { count: componentResourcePromises.length })

		// STAGE 4: Assessment Line Items (depend on pretty much everything)
		// Wait for all prior stages to complete.
		await Promise.all([classPromise, ...componentResourcePromises])
		logger.info("class and component-resource ingestion complete, proceeding to line items", {
			classSourcedId: (await classPromise)?.sourcedId,
			componentResourceCount: componentResourcePromises.length
		})

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
			dispatched: {
				course: 1,
				class: 1,
				resources: payload.resources.length,
				componentResources: payload.componentResources.length
			},
			processedInBulk: {
				courseComponents: payload.courseComponents.length,
				assessmentLineItems: payload.assessmentLineItems.length
			}
		}
	}
)