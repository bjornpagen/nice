import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceExercises, niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { orchestratePerseusToQtiConversion } from "@/lib/perseus-qti/orchestrator"

// A global key, including quotes, to ensure all OpenAI functions share the same concurrency limit.
const OPENAI_CONCURRENCY_KEY = '"openai-api-global-concurrency"'

export const convertPerseusQuestionToQtiItem = inngest.createFunction(
	{
		id: "convert-perseus-question-to-qti-item",
		name: "Convert Perseus Question to QTI Item",
		concurrency: {
			limit: 800,
			key: OPENAI_CONCURRENCY_KEY
		}
	},
	{ event: "qti/item.migrate" },
	async ({ event, logger }) => {
		const { questionId } = event.data
		logger.info("starting question to qti item conversion", { questionId })

		const questionResult = await errors.try(
			db
				.select({
					id: niceQuestions.id,
					parsedData: niceQuestions.parsedData,
					exerciseTitle: niceExercises.title
				})
				.from(niceQuestions)
				.innerJoin(niceExercises, eq(niceQuestions.exerciseId, niceExercises.id))
				.where(eq(niceQuestions.id, questionId))
				.limit(1)
		)
		if (questionResult.error) {
			logger.error("failed to fetch question", { questionId, error: questionResult.error })
			throw errors.wrap(questionResult.error, "db query for question")
		}
		const question = questionResult.data[0]
		if (!question?.parsedData) {
			logger.warn("question has no parsed data, skipping", { questionId })
			return { success: true, qtiXml: null }
		}

		// ADDED: More aggressive validation and logging
		if (typeof question.parsedData !== "object" || Object.keys(question.parsedData).length === 0) {
			logger.error("CRITICAL: question parsedData is empty or not an object", { questionId })
			throw errors.new(`question ${questionId} has empty or invalid parsedData`)
		}

		logger.debug("processing perseus content for question", {
			questionId,
			contentSnippet: JSON.stringify(question.parsedData).substring(0, 200)
		})

		if (!question.exerciseTitle) {
			logger.error("CRITICAL: exercise title missing for question", {
				questionId,
				exerciseId: question.id
			})
			throw errors.new("exercise title required: data integrity violation")
		}

		const qtiXmlResult = await errors.try(
			orchestratePerseusToQtiConversion({
				id: question.id,
				type: "assessmentItem",
				title: question.exerciseTitle,
				perseusContent: question.parsedData,
				logger
			})
		)
		if (qtiXmlResult.error) {
			logger.error("failed to orchestrate perseus to qti conversion for question", {
				questionId,
				error: qtiXmlResult.error
			})
			throw errors.wrap(qtiXmlResult.error, "perseus to qti conversion")
		}

		const updateResult = await errors.try(
			db.update(niceQuestions).set({ xml: qtiXmlResult.data }).where(eq(niceQuestions.id, questionId))
		)
		if (updateResult.error) {
			logger.error("failed to update question with qti xml", { questionId, error: updateResult.error })
			throw errors.wrap(updateResult.error, "db update")
		}

		logger.info("successfully converted question and stored qti xml", { questionId })
		return { status: "success", questionId: question.id }
	}
)
