import * as errors from "@superbuilders/errors"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"

export const clearCourseXmlData = inngest.createFunction(
	{
		id: "clear-course-xml-data",
		name: "Clear Course XML Data"
	},
	{ event: "qti/course.clear-xml" },
	async ({ event, logger }) => {
		const { courseId } = event.data
		logger.info("starting xml data clearing for course", { courseId })

		// Verify course exists
		const courseResult = await errors.try(
			db.query.niceCourses.findFirst({
				where: eq(schema.niceCourses.id, courseId),
				columns: { id: true, title: true }
			})
		)
		if (courseResult.error) {
			logger.error("failed to query course", { courseId, error: courseResult.error })
			throw errors.wrap(courseResult.error, "course query")
		}
		if (!courseResult.data) {
			throw errors.new(`course not found: ${courseId}`)
		}

		logger.info("found course", { courseId, title: courseResult.data.title })

		// Get all units for this course
		const unitsResult = await errors.try(
			db.query.niceUnits.findMany({
				where: eq(schema.niceUnits.courseId, courseId),
				columns: { id: true }
			})
		)
		if (unitsResult.error) {
			logger.error("failed to query units", { courseId, error: unitsResult.error })
			throw errors.wrap(unitsResult.error, "units query")
		}
		const unitIds = unitsResult.data.map((u) => u.id)
		logger.debug("found units", { courseId, unitCount: unitIds.length })

		if (unitIds.length === 0) {
			logger.info("no units found for course", { courseId })
			return {
				status: "success",
				courseId,
				cleared: {
					articles: 0,
					questions: 0
				}
			}
		}

		// Get all lessons for these units
		const lessonsResult = await errors.try(
			db.query.niceLessons.findMany({
				where: inArray(schema.niceLessons.unitId, unitIds),
				columns: { id: true }
			})
		)
		if (lessonsResult.error) {
			logger.error("failed to query lessons", { error: lessonsResult.error })
			throw errors.wrap(lessonsResult.error, "lessons query")
		}
		const lessonIds = lessonsResult.data.map((l) => l.id)
		logger.debug("found lessons", { lessonCount: lessonIds.length })

		if (lessonIds.length === 0) {
			logger.info("no lessons found for course", { courseId })
			return {
				status: "success",
				courseId,
				cleared: {
					articles: 0,
					questions: 0
				}
			}
		}

		// Get all article and exercise content IDs from lesson_contents
		const lessonContentsResult = await errors.try(
			db.query.niceLessonContents.findMany({
				where: and(
					inArray(schema.niceLessonContents.lessonId, lessonIds),
					inArray(schema.niceLessonContents.contentType, ["Article", "Exercise"])
				),
				columns: { contentId: true, contentType: true }
			})
		)
		if (lessonContentsResult.error) {
			logger.error("failed to query lesson contents", { error: lessonContentsResult.error })
			throw errors.wrap(lessonContentsResult.error, "lesson contents query")
		}

		const articleIds = lessonContentsResult.data.filter((lc) => lc.contentType === "Article").map((lc) => lc.contentId)
		const exerciseIds = lessonContentsResult.data
			.filter((lc) => lc.contentType === "Exercise")
			.map((lc) => lc.contentId)

		logger.debug("found content", {
			articleCount: articleIds.length,
			exerciseCount: exerciseIds.length
		})

		// Clear XML data for articles
		let clearedArticles = 0
		if (articleIds.length > 0) {
			const updateResult = await errors.try(
				db.update(schema.niceArticles).set({ xml: null }).where(inArray(schema.niceArticles.id, articleIds))
			)
			if (updateResult.error) {
				logger.error("failed to clear article xml", { error: updateResult.error })
				throw errors.wrap(updateResult.error, "clear article xml")
			}
			clearedArticles = articleIds.length
			logger.info("cleared article xml data", { count: clearedArticles })
		}

		// Clear XML data for questions (via exercises)
		let clearedQuestions = 0
		if (exerciseIds.length > 0) {
			// First get count of questions that will be updated
			const questionsResult = await errors.try(
				db.query.niceQuestions.findMany({
					where: inArray(schema.niceQuestions.exerciseId, exerciseIds),
					columns: { id: true }
				})
			)
			if (questionsResult.error) {
				logger.error("failed to query questions", { error: questionsResult.error })
				throw errors.wrap(questionsResult.error, "questions query")
			}
			clearedQuestions = questionsResult.data.length

			// Update questions XML to null
			const updateResult = await errors.try(
				db.update(schema.niceQuestions).set({ xml: null }).where(inArray(schema.niceQuestions.exerciseId, exerciseIds))
			)
			if (updateResult.error) {
				logger.error("failed to clear question xml", { error: updateResult.error })
				throw errors.wrap(updateResult.error, "clear question xml")
			}
			logger.info("cleared question xml data", { count: clearedQuestions })
		}

		logger.info("completed xml data clearing", {
			courseId,
			clearedArticles,
			clearedQuestions
		})

		return {
			status: "success",
			courseId,
			cleared: {
				articles: clearedArticles,
				questions: clearedQuestions
			}
		}
	}
)
