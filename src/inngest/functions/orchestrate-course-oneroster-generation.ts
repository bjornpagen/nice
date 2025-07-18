import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { generatePayloadForCourse } from "./oneroster/generate-payload-for-course"

// ✅ RENAMED: Function is now specific to generation.
export const orchestrateCourseOnerosterGeneration = inngest.createFunction(
	{
		id: "orchestrate-course-oneroster-generation", // ✅ RENAMED: ID updated.
		name: "Orchestrate Course OneRoster Payload Generation" // ✅ RENAMED: Name updated.
	},
	{ event: "oneroster/course.ingest" }, // ✅ BEHAVIOR: Still triggered by the original 'ingest' event.
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting oneroster payload generation workflow", { courseId })

		// ✅ MODIFIED: The function's responsibility now ends after this step.
		// It invokes the generation function and returns its result.
		const generationResult = await step.invoke("generate-oneroster-payload", {
			function: generatePayloadForCourse,
			data: { courseId }
		})

		if (!generationResult.success || !generationResult.outputDirectory) {
			throw errors.new("failed to generate oneroster payload")
		}
		logger.info("successfully generated oneroster payload", { courseId, outputDir: generationResult.outputDirectory })

		// ✅ REMOVED: All subsequent logic for reading files and invoking ingest functions has been moved
		// to the new `orchestrateCourseUploadToOneroster` function.

		return {
			message: "OneRoster payload generation completed successfully.",
			courseId,
			outputDirectory: generationResult.outputDirectory,
			stats: generationResult.stats
		}
	}
)
