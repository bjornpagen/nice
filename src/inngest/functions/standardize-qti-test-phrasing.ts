import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"

export const standardizeQtiTestPhrasing = inngest.createFunction(
	{
		id: "standardize-qti-test-phrasing",
		name: "Standardize QTI Test Phrasing",
		retries: 0
	},
	{ event: "qti/test.standardize-phrasing" },
	async ({ event, step, logger }) => {
		const { testUrl } = event.data
		logger.info("starting qti test phrasing standardization", { testUrl })

		// Fetch questions OUTSIDE step.run to avoid serializing massive payload
		const fetchResult = await errors.try(fetch(testUrl))
		if (fetchResult.error) {
			logger.error("failed to fetch qti test", { error: fetchResult.error, testUrl })
			throw errors.wrap(fetchResult.error, "qti test fetch")
		}

		if (!fetchResult.data.ok) {
			logger.error("qti test fetch returned non-ok status", { status: fetchResult.data.status, testUrl })
			throw errors.new(`qti test fetch failed with status ${fetchResult.data.status}`)
		}

		const jsonResult = await errors.try(fetchResult.data.json())
		if (jsonResult.error) {
			logger.error("failed to parse qti test response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "qti test response parsing")
		}

		const questionsData = jsonResult.data

		logger.info("fetched test questions", {
			testUrl,
			totalQuestions: questionsData.totalQuestions,
			questionCount: questionsData.questions.length
		})

		const fanOutResult = await step.run("fan-out-question-standardization", async () => {
			const events = questionsData.questions.map((q: { question: { identifier: string; rawXml: string; title: string } }) => ({
				name: "qti/question.standardize-phrasing" as const,
				data: {
					identifier: q.question.identifier,
					rawXml: q.question.rawXml,
					title: q.question.title
				}
			}))

			const BATCH_SIZE = 500
			for (let i = 0; i < events.length; i += BATCH_SIZE) {
				const batch = events.slice(i, i + BATCH_SIZE)
				await inngest.send(batch)
			}

			return {
				dispatched: events.length
			}
		})

		logger.info("standardization complete", {
			testUrl,
			eventsDispatched: fanOutResult.dispatched
		})

		return {
			status: "success",
			message: `dispatched ${fanOutResult.dispatched} standardization events`,
			eventsDispatched: fanOutResult.dispatched
		}
	}
)

