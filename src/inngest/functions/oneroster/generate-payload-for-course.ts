import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { generateCoursePayload } from "@/lib/payloads/oneroster/course"

export const generatePayloadForCourse = inngest.createFunction(
	{
		id: "generate-oneroster-payload-for-course",
		name: "Generate OneRoster Payload for Course"
	},
	{ event: "oneroster/course.payload.generate" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data

		if (!courseId) {
			logger.error("missing courseId in event data")
			throw errors.new("courseId is required")
		}

		logger.info("starting oneroster generation", { courseId })

		// Step 1: Generate the OneRoster payload (DB-heavy operation) BEFORE the step.
		const payloadResult = await errors.try(generateCoursePayload(courseId))
		if (payloadResult.error) {
			logger.error("failed to generate oneroster payload", { courseId, error: payloadResult.error })
			throw errors.wrap(payloadResult.error, "oneroster generation")
		}
		const payload = payloadResult.data

		logger.info("oneroster payload generated successfully", {
			courseId,
			courseTitle: payload.course.title,
			componentCount: payload.courseComponents.length,
			resourceCount: payload.resources.length
		})

		// Step 2: Use step.run ONLY for the fallible I/O operation.
		const outputDir = await step.run("write-to-files", async () => {
			// MODIFIED: Use the top-level data/ directory
			const dataDir = path.join(process.cwd(), "data")

			if (!payload.course.courseCode) {
				logger.error("CRITICAL: Course code is missing", {
					courseId,
					courseTitle: payload.course.title,
					courseData: payload.course
				})
				throw errors.new("course code required for directory creation")
			}
			const safeDirName = payload.course.courseCode
			// MODIFIED: Create a nested directory structure `data/[course-slug]/oneroster/`
			const courseDir = path.join(dataDir, safeDirName, "oneroster")

			// Create the course directory
			const createCourseDirResult = await errors.try(fs.mkdir(courseDir, { recursive: true }))
			if (createCourseDirResult.error) {
				logger.error("failed to create course directory", {
					courseDir,
					error: createCourseDirResult.error
				})
				throw errors.wrap(createCourseDirResult.error, "course directory creation")
			}

			// Write each section to its own file
			// MODIFIED: Update the list of files to include the new assessment line items
			const files = [
				{ name: "course.json", data: payload.course },
				{ name: "class.json", data: payload.class },
				{ name: "courseComponents.json", data: payload.courseComponents },
				{ name: "resources.json", data: payload.resources },
				{ name: "componentResources.json", data: payload.componentResources },
				{ name: "assessmentLineItems.json", data: payload.assessmentLineItems }
			]

			for (const file of files) {
				const filePath = path.join(courseDir, file.name)
				const writeResult = await errors.try(fs.writeFile(filePath, JSON.stringify(file.data, null, 2), "utf-8"))
				if (writeResult.error) {
					logger.error("failed to write file", {
						filePath,
						error: writeResult.error
					})
					throw errors.wrap(writeResult.error, `file write: ${file.name}`)
				}
				logger.debug("file written successfully", { filePath })
			}

			logger.info("all oneroster files written successfully", {
				courseDir,
				courseId,
				courseTitle: payload.course.title
			})

			return courseDir
		})

		return {
			success: true,
			courseId,
			courseTitle: payload.course.title,
			outputDirectory: outputDir,
			files: {
				course: path.join(outputDir, "course.json"),
				class: path.join(outputDir, "class.json"),
				courseComponents: path.join(outputDir, "courseComponents.json"),
				resources: path.join(outputDir, "resources.json"),
				componentResources: path.join(outputDir, "componentResources.json"),
				assessmentLineItems: path.join(outputDir, "assessmentLineItems.json")
			},
			stats: {
				courseComponents: payload.courseComponents.length,
				resources: payload.resources.length,
				componentResources: payload.componentResources.length,
				assessmentLineItems: payload.assessmentLineItems.length
			}
		}
	}
)
