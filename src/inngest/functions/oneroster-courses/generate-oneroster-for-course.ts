import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { generateOnerosterPayloadForCourse } from "@/lib/course-oneroster/oneroster"

export const generateOnerosterForCourse = inngest.createFunction(
	{
		id: "generate-oneroster-for-course",
		name: "Generate OneRoster JSON for Course"
	},
	{ event: "nice/course.oneroster.generate" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data

		if (!courseId) {
			logger.error("missing courseId in event data")
			throw errors.new("courseId is required")
		}

		logger.info("starting oneroster generation", { courseId })

		// Step 1: Generate the OneRoster payload
		const payload = await step.run("generate-payload", async () => {
			logger.info("generating oneroster payload", { courseId })

			const result = await errors.try(generateOnerosterPayloadForCourse(courseId))
			if (result.error) {
				logger.error("failed to generate oneroster payload", { courseId, error: result.error })
				throw errors.wrap(result.error, "oneroster generation")
			}

			logger.info("oneroster payload generated successfully", {
				courseId,
				courseTitle: result.data.course.title,
				componentCount: result.data.courseComponents.length,
				resourceCount: result.data.resources.length
			})

			return result.data
		})

		// Step 2: Write the payload to separate files in a course directory
		const outputDir = await step.run("write-to-files", async () => {
			// Create the oneroster directory if it doesn't exist
			const onerosterDir = path.join(process.cwd(), "oneroster")
			const ensureDirResult = await errors.try(fs.mkdir(onerosterDir, { recursive: true }))
			if (ensureDirResult.error) {
				logger.error("failed to create oneroster directory", { error: ensureDirResult.error })
				throw errors.wrap(ensureDirResult.error, "directory creation")
			}

			// Generate safe directory name using course slug or sanitized title
			const safeDirName = payload.course.courseCode || payload.course.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
			const courseDir = path.join(onerosterDir, safeDirName)

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
			const files = [
				{ name: "course.json", data: payload.course },
				{ name: "class.json", data: payload.class },
				{ name: "courseComponents.json", data: payload.courseComponents },
				{ name: "resources.json", data: payload.resources },
				{ name: "componentResources.json", data: payload.componentResources }
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
				componentResources: path.join(outputDir, "componentResources.json")
			},
			stats: {
				courseComponents: payload.courseComponents.length,
				resources: payload.resources.length,
				componentResources: payload.componentResources.length
			}
		}
	}
)
