import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"
import { extractQtiStimulusBodyContent } from "@/lib/xml-utils"

export const ingestAssessmentStimuli = inngest.createFunction(
	{
		id: "ingest-assessment-stimuli",
		name: "Ingest QTI Assessment Stimuli"
		// No concurrency limit - unlimited parallel processing!
	},
	{ event: "qti/assessment-stimuli.ingest" },
	async ({ event, logger }) => {
		const { stimuli } = event.data
		if (stimuli.length === 0) {
			logger.info("no assessment stimuli to ingest, skipping")
			return { status: "skipped", reason: "no_stimuli" }
		}

		logger.info("ingesting assessment stimuli", { count: stimuli.length })

		const stimuliPromises = stimuli.map(async (stimulus) => {
			// Extract identifier from the root qti-assessment-stimulus element using a robust regex.
			// This regex specifically targets the root tag to avoid matching identifiers from nested elements.
			// - `<qti-assessment-stimulus` : Matches the opening of the root tag
			// - `(?:\s+[^>]*)` : Non-capturing group for attributes before identifier (optional)
			// - `\s+identifier=` : Matches whitespace and the identifier attribute
			// - `"([^"]+)"` : Captures the identifier value in group 1
			// - `[^>]*>` : Matches remaining attributes and closing >
			const idMatch = stimulus.xml.match(/<qti-assessment-stimulus(?:\s+[^>]*)?\s+identifier="([^"]+)"[^>]*>/)
			const identifier = idMatch?.[1] ?? null
			if (!identifier) {
				logger.error("could not extract identifier from stimulus XML", {
					xml: stimulus.xml.substring(0, 150),
					hasQtiAssessmentStimulus: stimulus.xml.includes("<qti-assessment-stimulus")
				})
				return { success: false, status: "skipped_no_id" }
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

			const contentResult = errors.trySync(() => extractQtiStimulusBodyContent(stimulus.xml))
			if (contentResult.error) {
				logger.error("CRITICAL: Could not extract content from stimulus XML", {
					identifier,
					title,
					xml: stimulus.xml.substring(0, 500),
					error: contentResult.error
				})
				throw errors.wrap(contentResult.error, "stimulus parsing: content extraction failed")
			}
			const content = contentResult.data

			const payload = { identifier, title, content, metadata: stimulus.metadata }

			// Try to update first (most common case)
			logger.debug("attempting to update stimulus", { identifier })
			const updateResult = await errors.try(qti.updateStimulus(identifier, payload))

			if (updateResult.error) {
				// Check if it's a 404 error - if so, create instead
				if (errors.is(updateResult.error, ErrQtiNotFound)) {
					logger.info("stimulus not found, creating new", { identifier })
					const createResult = await errors.try(qti.createStimulus(payload))
					if (createResult.error) {
						logger.error("failed to create stimulus", { identifier, error: createResult.error })
						return { identifier, success: false, status: "failed", error: createResult.error }
					}
					logger.info("successfully created stimulus", { identifier })
					return { identifier, success: true, status: "created" }
				}
				// Other error - log and continue
				logger.error("failed to update stimulus", { identifier, error: updateResult.error })
				return { identifier, success: false, status: "failed", error: updateResult.error }
			}
			logger.info("successfully updated stimulus", { identifier })
			return { identifier, success: true, status: "updated" }
		})

		// Process all stimuli in parallel
		const results = await Promise.all(stimuliPromises)

		const failedResults = results.filter((r) => !r.success)
		const failedCount = failedResults.length

		if (failedCount > 0) {
			// Log detailed information about each failed stimulus
			logger.error("assessment stimuli ingestion failed", {
				failedCount,
				failedStimuli: failedResults.map((r) => ({
					identifier: r.identifier,
					status: r.status,
					error: r.error?.message || "unknown error"
				}))
			})

			// Include identifiers in the error message for easy debugging
			const failedIdentifiers = failedResults.map((r) => r.identifier).filter(Boolean)
			throw errors.new(`failed to ingest ${failedCount} assessment stimuli: ${failedIdentifiers.join(", ")}`)
		}

		return { status: "success", count: results.length, results }
	}
)
