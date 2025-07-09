import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { generateOnerosterForCourse } from "./oneroster-courses/generate-oneroster-for-course"
import { ingestClass } from "./oneroster-courses/ingest-class"
import { ingestComponentResources } from "./oneroster-courses/ingest-component-resources"
import { ingestCourse } from "./oneroster-courses/ingest-course"
import { ingestCourseComponents } from "./oneroster-courses/ingest-course-components"
import { ingestResources } from "./oneroster-courses/ingest-resources"

export const ingestCourseToOneroster = inngest.createFunction(
	{
		id: "ingest-course-to-oneroster",
		name: "Ingest Course to OneRoster"
	},
	{ event: "oneroster/course.ingest.requested" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting oneroster ingestion workflow", { courseId })

		// Step 1: Generate the full OneRoster payload for the course. This remains the same.
		const generationResult = await step.invoke("generate-oneroster-payload", {
			function: generateOnerosterForCourse,
			data: { courseId }
		})

		if (!generationResult.success || !generationResult.outputDirectory) {
			throw errors.new("failed to generate oneroster payload")
		}
		logger.info("successfully generated oneroster payload", { courseId, outputDir: generationResult.outputDirectory })

		// Step 2: Read the generated files to get the actual data. This remains the same.
		const payload = await step.run("read-payload-files", async () => {
			const readFile = async (filename: string) => {
				const filePath = path.join(generationResult.outputDirectory, filename)
				const content = await fs.readFile(filePath, "utf-8")
				return JSON.parse(content)
			}

			const course = await readFile("course.json")
			const classData = await readFile("class.json")
			const courseComponents = await readFile("courseComponents.json")
			const resources = await readFile("resources.json")
			const componentResources = await readFile("componentResources.json")

			return { course, class: classData, courseComponents, resources, componentResources }
		})

		// --- NEW SEQUENTIAL INGESTION LOGIC ---
		// The following steps replace the old parallel `step.sendEvent` fan-out.

		// Step 3: Ingest all resources first and WAIT for completion.
		// This is a critical dependency for componentResources.
		if (payload.resources.length > 0) {
			await step.invoke("invoke-ingest-resources", {
				function: ingestResources,
				data: { resources: payload.resources }
			})
			logger.info("completed resource ingestion", { courseId, count: payload.resources.length })
		}

		// Step 4: Ingest the course and its components. These can run in parallel.
		// This is a dependency for componentResources.
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

		// Step 5: FINAL step. Ingest the component-resource links.
		// This runs only after all its dependencies (resources and components) have been created.
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

		// ADDED: Step 6: FINAL step. Ingest the class object for the course.
		// This runs only after the course itself has been ingested.
		await step.invoke("invoke-ingest-class", {
			function: ingestClass,
			data: { class: payload.class }
		})
		logger.info("completed class ingestion", { courseId, classSourcedId: payload.class.sourcedId })

		logger.info("all oneroster ingestion steps have completed successfully", { courseId })

		return {
			message: "OneRoster ingestion workflow completed successfully.",
			courseId,
			stats: generationResult.stats
		}
	}
)
