import * as errors from "@superbuilders/errors"
import { env } from "@/env"
import { inngest } from "@/inngest/client"
import { ErrQtiNotFound, QtiApiClient } from "@/lib/qti"

export const ingestAssessmentStimuli = inngest.createFunction(
	{ id: "ingest-assessment-stimuli", name: "Ingest QTI Assessment Stimuli" },
	{ event: "qti/assessment-stimuli.ingest" },
	async ({ event, logger }) => {
		const { stimuli } = event.data
		if (stimuli.length === 0) {
			logger.info("no assessment stimuli to ingest, skipping")
			return { status: "skipped", reason: "no_stimuli" }
		}

		logger.info("ingesting assessment stimuli", { count: stimuli.length })
		const client = new QtiApiClient({
			serverUrl: env.TIMEBACK_QTI_SERVER_URL,
			tokenUrl: env.TIMEBACK_TOKEN_URL,
			clientId: env.TIMEBACK_CLIENT_ID,
			clientSecret: env.TIMEBACK_CLIENT_SECRET
		})

		const results = []
		for (const stimulus of stimuli) {
			const idMatch = stimulus.xml.match(/identifier="([^"]+)"/)
			const identifier = idMatch?.[1] ?? null
			if (!identifier) {
				logger.error("could not extract identifier from stimulus XML", { xml: stimulus.xml.substring(0, 150) })
				continue
			}

			const titleMatch = stimulus.xml.match(/title="([^"]+)"/)
			const title = titleMatch?.[1] ?? "Untitled Stimulus"

			const contentMatch = stimulus.xml.match(/<qti-stimulus-body>([\s\S]*?)<\/qti-stimulus-body>/)
			const content = contentMatch?.[1]?.trim() ?? ""

			const payload = { identifier, title, content }

			const updateResult = await errors.try(client.updateStimulus(identifier, payload))

			if (updateResult.error) {
				if (errors.is(updateResult.error, ErrQtiNotFound)) {
					logger.info("stimulus not found, creating new one", { identifier })
					const createResult = await errors.try(client.createStimulus(payload))
					if (createResult.error) {
						logger.error("failed to create stimulus after 404 on update", { identifier, error: createResult.error })
						throw createResult.error
					}
					results.push({ identifier, success: true, status: "created" })
				} else {
					logger.error("failed to update stimulus", { identifier, error: updateResult.error })
					throw updateResult.error
				}
			} else {
				logger.info("successfully updated stimulus", { identifier })
				results.push({ identifier, success: true, status: "updated" })
			}
		}

		const failedCount = results.filter((r) => !r.success).length
		if (failedCount > 0) {
			throw errors.new(`failed to ingest ${failedCount} assessment stimuli`)
		}

		return { status: "success", count: results.length }
	}
)
