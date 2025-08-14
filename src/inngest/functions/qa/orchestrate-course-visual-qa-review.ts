import * as errors from "@superbuilders/errors"
import { and, eq, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { niceCourses, niceExercises, niceLessonContents, niceLessons, niceQuestions, niceUnits } from "@/db/schemas"
import { inngest } from "@/inngest/client"

export const orchestrateCourseVisualQAReview = inngest.createFunction(
	{
		id: "orchestrate-course-visual-qa-review",
		name: "Orchestrate Visual QA Review for Specific Courses",
		concurrency: {
			limit: 1
		}
	},
	{
		event: "qa/questions.review-by-courses"
	},
	async ({ event, step, logger }) => {
		const { courseIds } = event.data
		logger.info("starting course-specific visual qa orchestration", {
			courseIds,
			courseCount: courseIds.length
		})

		// Fetch questions from specified courses (outside step.run as per project rules)
		logger.debug("fetching questions for specified courses", { courseIds })

		// Since we need to handle multiple courses, fetch for each course separately and combine
		const allQuestions: Array<{
			questionId: string
			problemType: string
			courseId: string
			courseTitle: string
			exerciseId: string
			exerciseTitle: string
		}> = []

		for (const courseId of courseIds) {
			logger.debug("fetching questions for course", { courseId })

			const courseQuestionsResult = await errors.try(
				db
					.select({
						questionId: niceQuestions.id,
						problemType: niceQuestions.problemType,
						courseId: niceCourses.id,
						courseTitle: niceCourses.title,
						exerciseId: niceExercises.id,
						exerciseTitle: niceExercises.title
					})
					.from(niceQuestions)
					.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
					.innerJoin(niceLessonContents, eq(niceExercises.id, niceLessonContents.contentId))
					.innerJoin(niceLessons, eq(niceLessonContents.lessonId, niceLessons.id))
					.innerJoin(niceUnits, eq(niceLessons.unitId, niceUnits.id))
					.innerJoin(niceCourses, eq(niceUnits.courseId, niceCourses.id))
					.where(and(eq(niceCourses.id, courseId), isNotNull(niceQuestions.xml)))
			)

			if (courseQuestionsResult.error) {
				logger.error("failed to fetch questions for course", {
					error: courseQuestionsResult.error,
					courseId
				})
				throw errors.wrap(courseQuestionsResult.error, `course ${courseId} questions fetch`)
			}

			allQuestions.push(...courseQuestionsResult.data)
		}

		logger.info("questions for courses fetched", {
			totalCount: allQuestions.length,
			courseIds,
			courseBreakdown: courseIds.reduce((acc: Record<string, { count: number; title: string }>, courseId) => {
				const courseQuestions = allQuestions.filter((q) => q.courseId === courseId)
				acc[courseId] = {
					count: courseQuestions.length,
					title: courseQuestions[0]?.courseTitle || "Unknown"
				}
				return acc
			}, {}),
			problemTypes: [...new Set(allQuestions.map((q) => q.problemType))].sort()
		})

		const questionIds = allQuestions.map((q) => q.questionId)

		// Step 1: Prepare question IDs for fan-out
		const preparedData = await step.run("prepare-course-question-ids", async () => {
			return {
				questionIds,
				totalCount: allQuestions.length,
				courseIds,
				courseBreakdown: courseIds.reduce((acc: Record<string, { count: number; title: string }>, courseId) => {
					const courseQuestions = allQuestions.filter((q) => q.courseId === courseId)
					acc[courseId] = {
						count: courseQuestions.length,
						title: courseQuestions[0]?.courseTitle || "Unknown"
					}
					return acc
				}, {})
			}
		})

		// Step 2: Fan out to individual review workers
		const reviewResults = await step.run("fan-out-course-reviews", async () => {
			logger.info("fanning out course visual qa reviews", {
				questionCount: preparedData.questionIds.length,
				courseIds: preparedData.courseIds,
				concurrencyLimit: 100
			})

			// Send events for each question to be reviewed
			const events = preparedData.questionIds.map((questionId) => ({
				name: "qa/question.review-rendering" as const,
				data: { questionId }
			}))

			// Send events in batches to avoid overwhelming the system
			const batchSize = 100
			let sentCount = 0

			for (let i = 0; i < events.length; i += batchSize) {
				const batch = events.slice(i, i + batchSize)

				const sendResult = await errors.try(inngest.send(batch))

				if (sendResult.error) {
					logger.error("failed to send batch of course review events", {
						error: sendResult.error,
						batchStart: i,
						batchSize: batch.length,
						courseIds: preparedData.courseIds
					})
					throw errors.wrap(sendResult.error, "batch event send")
				}

				sentCount += batch.length
				logger.debug("sent batch of course review events", {
					batchStart: i,
					batchSize: batch.length,
					totalSent: sentCount,
					totalQuestions: preparedData.questionIds.length,
					courseIds: preparedData.courseIds
				})

				// Small delay between batches to avoid rate limiting
				if (i + batchSize < events.length) {
					await new Promise((resolve) => setTimeout(resolve, 100))
				}
			}

			logger.info("all course review events sent", {
				totalQuestions: preparedData.questionIds.length,
				totalEvents: sentCount,
				courseIds: preparedData.courseIds,
				courseBreakdown: preparedData.courseBreakdown
			})

			return {
				totalQuestions: preparedData.questionIds.length,
				eventsSent: sentCount,
				courseIds: preparedData.courseIds,
				courseBreakdown: preparedData.courseBreakdown
			}
		})

		logger.info("course-specific visual qa orchestration completed", {
			totalQuestions: reviewResults.totalQuestions,
			eventsSent: reviewResults.eventsSent,
			courseIds: reviewResults.courseIds,
			courseBreakdown: reviewResults.courseBreakdown
		})

		return {
			totalQuestions: reviewResults.totalQuestions,
			eventsSent: reviewResults.eventsSent,
			courseIds: reviewResults.courseIds,
			courseBreakdown: reviewResults.courseBreakdown,
			status: "course_orchestration_complete"
		}
	}
)
