import * as errors from "@superbuilders/errors"
import { and, eq, inArray, isNull } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { convertPerseusArticleToQtiStimulus } from "./qti/convert-perseus-article-to-qti-stimulus"
import { convertPerseusQuestionToQtiItem } from "./qti/convert-perseus-question-to-qti-item"

export const orchestrateCourseXmlGeneration = inngest.createFunction(
	{
		id: "orchestrate-course-qti-generation",
		name: "Orchestrate All QTI XML Generation for a Course"
	},
	{ event: "qti/course.generate-all-xml" },
	async ({ event, step, logger }) => {
		const { courseId } = event.data
		logger.info("starting batch qti xml generation for course", { courseId })

		// Step 1: Find all unit IDs for the given course.
		const unitsResult = await errors.try(
			db.select({ id: schema.niceUnits.id }).from(schema.niceUnits).where(eq(schema.niceUnits.courseId, courseId))
		)
		if (unitsResult.error) {
			logger.error("failed to fetch units for course", { courseId, error: unitsResult.error })
			throw errors.wrap(unitsResult.error, "db query for units")
		}
		const unitIds = unitsResult.data.map((u) => u.id)
		if (unitIds.length === 0) {
			logger.info("no units found for course, ending early", { courseId })
			return { message: "No units found for course." }
		}

		// Step 2: Find all articles and questions within those units that do NOT yet have XML.
		const articlesToGenerate = await db
			.select({ id: schema.niceArticles.id })
			.from(schema.niceArticles)
			.innerJoin(schema.niceLessonContents, eq(schema.niceArticles.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(and(inArray(schema.niceLessons.unitId, unitIds), isNull(schema.niceArticles.xml)))

		const questionsToGenerate = await db
			.select({ id: schema.niceQuestions.id })
			.from(schema.niceQuestions)
			.innerJoin(schema.niceExercises, eq(schema.niceQuestions.exerciseId, schema.niceExercises.id))
			.innerJoin(schema.niceLessonContents, eq(schema.niceExercises.id, schema.niceLessonContents.contentId))
			.innerJoin(schema.niceLessons, eq(schema.niceLessonContents.lessonId, schema.niceLessons.id))
			.where(and(inArray(schema.niceLessons.unitId, unitIds), isNull(schema.niceQuestions.xml)))

		logger.info("found content to generate", {
			articles: articlesToGenerate.length,
			questions: questionsToGenerate.length
		})

		// Step 3: Create invocation promises for each piece of content.
		const articleInvocations = articlesToGenerate.map((article) =>
			step.invoke(`generate-article-xml-${article.id}`, {
				function: convertPerseusArticleToQtiStimulus,
				data: { articleId: article.id }
			})
		)

		const questionInvocations = questionsToGenerate.map((question) =>
			step.invoke(`generate-question-xml-${question.id}`, {
				function: convertPerseusQuestionToQtiItem,
				data: { questionId: question.id }
			})
		)

		// Step 4: Await all generation tasks to complete.
		await step.run("await-all-xml-generation", async () => {
			const allInvocations = [...articleInvocations, ...questionInvocations]
			if (allInvocations.length > 0) {
				await Promise.all(allInvocations)
			}
			return { generatedCount: allInvocations.length }
		})

		logger.info("completed qti xml generation for course", {
			courseId,
			articlesGenerated: articleInvocations.length,
			questionsGenerated: questionInvocations.length
		})

		return {
			message: `Successfully generated QTI XML for ${articleInvocations.length} articles and ${questionInvocations.length} questions.`,
			courseId
		}
	}
)
