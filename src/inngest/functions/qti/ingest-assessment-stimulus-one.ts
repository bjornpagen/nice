import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"
import { extractIdentifier, extractQtiStimulusBodyContent, extractTitle } from "@/lib/xml-utils"

export const ingestAssessmentStimulusOne = inngest.createFunction(
	{
		id: "ingest-assessment-stimulus-one",
		name: "Ingest One QTI Assessment Stimulus",
		concurrency: {
			limit: 200,
			key: "event.data.identifier || null"
		},
		retries: 3
	},
	{ event: "qti/assessment-stimulus.ingest.one" },
	async ({ event, logger }) => {
		const { xml, metadata } = event.data
		const identifier = event.data.identifier || extractIdentifier(xml, "qti-assessment-stimulus")
		if (!identifier) {
			logger.error("Could not extract identifier from stimulus XML, skipping.", { xmlStart: xml.substring(0, 100) })
			return { identifier: null, status: "failed_no_id" }
		}

		const title = extractTitle(xml)
		const content = extractQtiStimulusBodyContent(xml)

		if (!title || !content) {
			logger.error("Could not extract title or content from stimulus XML.", { identifier })
			return { identifier, status: "failed_parsing" }
		}

		logger.info("Ingesting assessment stimulus", { identifier })
		const payload = { identifier, title, content, metadata }

		const updateResult = await errors.try(qti.updateStimulus(identifier, payload))

		if (updateResult.error) {
			if (errors.is(updateResult.error, ErrQtiNotFound)) {
				logger.info("Stimulus not found, creating new.", { identifier })
				const createResult = await errors.try(qti.createStimulus(payload))
				if (createResult.error) {
					logger.error("Failed to create stimulus.", { identifier, error: createResult.error })
					throw createResult.error
				}
				logger.info("Successfully created stimulus.", { identifier })
				return { identifier, status: "created" }
			}
			logger.error("Failed to update stimulus.", { identifier, error: updateResult.error })
			throw updateResult.error
		}

		logger.info("Successfully updated stimulus.", { identifier })
		return { identifier, status: "updated" }
	}
)
