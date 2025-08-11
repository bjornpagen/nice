import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"
import { extractIdentifier } from "@/lib/xml-utils"

export const ingestAssessmentTestOne = inngest.createFunction(
	{
		id: "ingest-assessment-test-one",
		name: "Ingest One QTI Assessment Test",
		concurrency: {
			limit: 200,
			key: "event.data.identifier || null"
		},
		retries: 3
	},
	{ event: "qti/assessment-test.ingest.one" },
	async ({ event, logger }) => {
		const { xml } = event.data
		const identifier = event.data.identifier || extractIdentifier(xml, "qti-assessment-test")
		if (!identifier) {
			logger.error("Could not extract identifier from test XML, skipping.", { xmlStart: xml.substring(0, 100) })
			return { identifier: null, status: "failed_no_id" }
		}

		logger.info("Ingesting assessment test", { identifier })

		const updateResult = await errors.try(qti.updateAssessmentTest(identifier, xml))

		if (updateResult.error) {
			if (errors.is(updateResult.error, ErrQtiNotFound)) {
				logger.info("Test not found, creating new.", { identifier })
				const createResult = await errors.try(qti.createAssessmentTest(xml))
				if (createResult.error) {
					logger.error("Failed to create assessment test.", { identifier, error: createResult.error })
					throw createResult.error
				}
				logger.info("Successfully created assessment test.", { identifier })
				return { identifier, status: "created" }
			}
			logger.error("Failed to update assessment test.", { identifier, error: updateResult.error })
			throw updateResult.error
		}

		logger.info("Successfully updated assessment test.", { identifier })
		return { identifier, status: "updated" }
	}
)
