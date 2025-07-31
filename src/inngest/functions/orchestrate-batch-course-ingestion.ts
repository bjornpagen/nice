import { inngest } from "@/inngest/client"
import { orchestrateCourseIngestionToQti } from "./orchestrate-course-ingestion-to-qti"

// Hardcoded course IDs for batch differentiated processing
const COURSE_IDS = [
	"xb5feb28c", // Early Math
	"x3184e0ec", // 2nd grade math
	"x3c950fa744f5f34c", // Get ready for 3rd grade math
	"x41fbdd6301d5fded", // 3rd grade math
	"xfb4fc0bf01437792", // 2nd grade reading & vocabulary
	"xaf0c1b5d7010608e", // 3rd grade reading & vocabulary
	"x3931b57772b927b3", // 6th grade math (TX TEKS)
	"xa876d090ec748f45", // 7th grade math (TX TEKS)
	"x42e41b058fcf4059" // 8th grade math (TX TEKS)
]

interface BatchProgress {
	totalCourses: number
	coursesCompleted: string[]
	currentCourseIndex: number
	startedAt: string
	completedAt?: string
	errors: Array<{ courseId: string; error: string }>
}

export const orchestrateBatchCourseIngestion = inngest.createFunction(
	{
		id: "orchestrate-batch-course-ingestion",
		name: "Orchestrate Batch Course Ingestion to QTI (Differentiated)"
	},
	{ event: "qti/batch.ingest" },
	async ({ step, logger }) => {
		logger.info("starting batch differentiated qti generation workflow", {
			totalCourses: COURSE_IDS.length,
			courseIds: COURSE_IDS
		})

		// Initialize batch progress tracking
		const batchProgress: BatchProgress = {
			totalCourses: COURSE_IDS.length,
			coursesCompleted: [],
			currentCourseIndex: 0,
			startedAt: new Date().toISOString(),
			errors: []
		}

		logger.info("initialized batch progress", {
			totalCourses: batchProgress.totalCourses,
			startedAt: batchProgress.startedAt
		})

		// Process each course sequentially
		for (let index = 0; index < COURSE_IDS.length; index++) {
			const courseId = COURSE_IDS[index]
			if (!courseId) {
				logger.error("invalid course id at index", { index })
				continue
			}

			batchProgress.currentCourseIndex = index

			logger.info("starting course processing", {
				courseId,
				courseIndex: index + 1,
				totalCourses: COURSE_IDS.length,
				progress: `${index + 1}/${COURSE_IDS.length}`
			})

			// Invoke the existing orchestration function with differentiated=true
			const courseResult = await step.invoke(`process-course-${courseId}`, {
				function: orchestrateCourseIngestionToQti,
				data: {
					courseId,
					differentiated: true
				}
			})

			// Check if the course processing was successful
			if (courseResult && typeof courseResult === "object" && "message" in courseResult) {
				batchProgress.coursesCompleted.push(courseId)
				logger.info("completed course processing successfully", {
					courseId,
					courseIndex: index + 1,
					totalCourses: COURSE_IDS.length,
					coursesCompleted: batchProgress.coursesCompleted.length,
					result: courseResult
				})
			} else {
				// Log the issue but continue with next course
				const errorMessage = "course processing returned unexpected result"
				batchProgress.errors.push({
					courseId,
					error: errorMessage
				})
				logger.error("course processing failed", {
					courseId,
					courseIndex: index + 1,
					error: errorMessage,
					result: courseResult
				})
			}
		}

		// Finalize batch processing
		const finalResults = await step.run("finalize-batch-processing", async () => {
			batchProgress.completedAt = new Date().toISOString()

			const successfulCourses = batchProgress.coursesCompleted.length
			const failedCourses = batchProgress.errors.length
			const totalProcessed = successfulCourses + failedCourses

			logger.info("batch differentiated qti generation completed", {
				totalCourses: COURSE_IDS.length,
				successfulCourses,
				failedCourses,
				totalProcessed,
				startedAt: batchProgress.startedAt,
				completedAt: batchProgress.completedAt,
				coursesCompleted: batchProgress.coursesCompleted,
				errors: batchProgress.errors
			})

			return {
				totalCourses: COURSE_IDS.length,
				successfulCourses,
				failedCourses,
				coursesCompleted: batchProgress.coursesCompleted,
				errors: batchProgress.errors,
				startedAt: batchProgress.startedAt,
				completedAt: batchProgress.completedAt
			}
		})

		return {
			message: "Batch differentiated QTI generation workflow completed",
			...finalResults
		}
	}
)
