import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"

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

		const results = []
		for (const stimulus of stimuli) {
			const idMatch = stimulus.xml.match(/identifier="([^"]+)"/)
			const identifier = idMatch?.[1] ?? null
			if (!identifier) {
				logger.error("could not extract identifier from stimulus XML", { xml: stimulus.xml.substring(0, 150) })
				continue
			}

			const titleMatch = stimulus.xml.match(/title="([^"]+)"/)
			const title = titleMatch?.[1]
			if (!title) {
				logger.error("CRITICAL: Could not extract title from stimulus XML", {
					identifier,
					xml: stimulus.xml.substring(0, 300)
				})
				throw errors.new("stimulus parsing: title extraction failed")
			}

			const contentMatch = stimulus.xml.match(/<qti-stimulus-body>([\s\S]*?)<\/qti-stimulus-body>/)
			const content = contentMatch?.[1]?.trim()
			if (!content) {
				logger.error("CRITICAL: Could not extract content from stimulus XML", {
					identifier,
					title,
					xml: stimulus.xml.substring(0, 500)
				})
				throw errors.new("stimulus parsing: content extraction failed")
			}

			const payload = { identifier, title, content, metadata: stimulus.metadata }

			// Use PUT for upsert behavior
			logger.debug("upserting assessment stimulus", { identifier })
			const result = await errors.try(qti.updateStimulus(identifier, payload))
			if (result.error) {
				logger.error("failed to upsert stimulus", { identifier, error: result.error })
				throw result.error
			}
			logger.info("successfully upserted stimulus", { identifier })
			results.push({ identifier, success: true, status: "upserted" })
		}

		const failedCount = results.filter((r) => !r.success).length
		if (failedCount > 0) {
			throw errors.new(`failed to ingest ${failedCount} assessment stimuli`)
		}

		return { status: "success", count: results.length }
	}
)
