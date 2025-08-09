import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { NonRetriableError } from "inngest"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas"
import { inngest } from "@/inngest/client"
import { compile } from "@/lib/qti-generation/compiler"
import { ErrUnsupportedInteraction, generateStructuredQtiItem } from "@/lib/qti-generation/structured/client"
import { validateAndSanitizeHtmlFields } from "@/lib/qti-generation/structured/validator"

export const orchestrateFocusedQtiGeneration = inngest.createFunction(
	{
		id: "orchestrate-focused-qti-generation",
		name: "Orchestrate Focused QTI Generation from Perseus"
	},
	{ event: "qti/item.migrate.focused" },
	async ({ event, logger }) => {
		const { questionId } = event.data
		logger.info("starting focused qti generation", { questionId, collection: "simple-visual" })

		const questionResult = await errors.try(
			db.query.niceQuestions.findFirst({
				where: eq(niceQuestions.id, questionId),
				columns: { id: true, parsedData: true }
			})
		)
		if (questionResult.error) {
			logger.error("db query for question failed", { error: questionResult.error })
			throw errors.wrap(questionResult.error, "db query for question")
		}
		const question = questionResult.data

		if (!question?.parsedData) {
			logger.warn("skipping: no perseus data found", { questionId })
			return { status: "skipped", reason: "no_perseus_data" }
		}

		const structuredItemResult = await errors.try(
			generateStructuredQtiItem(logger, question.parsedData, {
				widgetCollectionName: "simple-visual"
			})
		)
		if (structuredItemResult.error) {
			logger.error("focused structured item generation failed", { error: structuredItemResult.error })

			// Mark unsupported interactions as non-reaoeutriable to prevent repeated attempts
			if (errors.is(structuredItemResult.error, ErrUnsupportedInteraction)) {
				throw new NonRetriableError(structuredItemResult.error.message, {
					cause: structuredItemResult.error
				})
			}

			throw errors.wrap(structuredItemResult.error, "focused generation")
		}

		const sanitizedResult = errors.trySync(() => validateAndSanitizeHtmlFields(structuredItemResult.data, logger))
		if (sanitizedResult.error) {
			logger.error("focused item validation failed", { error: sanitizedResult.error })
			throw errors.wrap(sanitizedResult.error, "validation")
		}
		const sanitizedItem = sanitizedResult.data

		const compileResult = errors.trySync(() => compile(sanitizedItem))
		if (compileResult.error) {
			logger.error("focused qti compilation failed", { error: compileResult.error })

			// Treat unsupported interactions as permanent failures
			if (errors.is(compileResult.error, ErrUnsupportedInteraction)) {
				throw new NonRetriableError(compileResult.error.message, {
					cause: compileResult.error
				})
			}

			throw errors.wrap(compileResult.error, "compilation")
		}
		const xml = compileResult.data

		const updateResult = await errors.try(
			db.update(niceQuestions).set({ xml: xml, structuredJson: sanitizedItem }).where(eq(niceQuestions.id, questionId))
		)
		if (updateResult.error) {
			logger.error("db update failed", { error: updateResult.error })
			throw errors.wrap(updateResult.error, "db update")
		}

		logger.info("focused qti generation successful", { questionId })
		return { status: "success", questionId }
	}
)
