import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"
import { ErrOneRosterNotFound } from "@/lib/oneroster"

export const ingestClass = inngest.createFunction(
	{ id: "ingest-class", name: "Ingest OneRoster Class" },
	{ event: "oneroster/class.ingest" },
	async ({ event, step, logger }) => {
		// Immediate log to confirm function is executing
		logger.info("ingest-class function invoked", {
			eventKeys: Object.keys(event),
			dataKeys: event.data ? Object.keys(event.data) : [],
			hasClass: !!event.data?.class
		})

		// Extract class data - check if it's nested under data.class or directly in data
		const classData = event.data?.class || event.data

		if (!classData || !classData.sourcedId) {
			logger.error("invalid event data structure", {
				event,
				classData,
				hasSourcedId: !!classData?.sourcedId
			})
			throw errors.new("invalid event data: missing class data or sourcedId")
		}

		// CRITICAL: Validate status field exists - NO FALLBACKS
		if (!classData.status) {
			logger.error("CRITICAL: Class status missing", {
				sourcedId: classData.sourcedId,
				classData
			})
			throw errors.new("class status: required field missing")
		}

		logger.info("starting class ingestion", {
			sourcedId: classData.sourcedId,
			status: classData.status,
			title: classData.title,
			classType: classData.classType,
			courseSourcedId: classData.course?.sourcedId,
			schoolSourcedId: classData.school?.sourcedId || classData.org?.sourcedId,
			termsCount: classData.terms?.length || 0
		})

		// Replace colon with dash in step ID to make it valid
		const stepId = `ingest-class-${classData.sourcedId.replace(/:/g, "-")}`
		const stepResult = await step.run(stepId, async () => {
			// Clean the class data to remove any Inngest metadata
			// Only pass school OR org, not both - prefer school if it exists
			const cleanClassData = {
				sourcedId: classData.sourcedId,
				status: classData.status,
				title: classData.title,
				classType: classData.classType,
				course: classData.course,
				school: classData.school || classData.org, // Use school if available, otherwise org
				terms: classData.terms
			}

			logger.debug("upserting class", { classData: cleanClassData })

			// Use PUT for upsert behavior
			const result = await errors.try(oneroster.updateClass(classData.sourcedId, cleanClassData))
			if (result.error) {
				// Check if it's a 404 error - if so, create instead
				if (errors.is(result.error, ErrOneRosterNotFound)) {
					logger.info("class not found, creating new", { sourcedId: classData.sourcedId })
					const createResult = await errors.try(oneroster.createClass(cleanClassData))
					if (createResult.error) {
						logger.error("failed to create class", {
							sourcedId: classData.sourcedId,
							error: createResult.error,
							classData: cleanClassData
						})
						throw createResult.error
					}
					logger.info("successfully created class", { sourcedId: classData.sourcedId })
				} else {
					// Other error - re-throw
					logger.error("failed to upsert class via API", {
						sourcedId: classData.sourcedId,
						error: result.error,
						classData: cleanClassData
					})
					throw result.error
				}
			} else {
				logger.info("class API call successful", {
					sourcedId: classData.sourcedId,
					apiResponse: result.data
				})
			}

			// Verify the class was created/updated by fetching it
			logger.debug("verifying class", { sourcedId: classData.sourcedId })
			const verificationResult = await errors.try(oneroster.getClass(classData.sourcedId))
			if (verificationResult.error) {
				logger.error("failed to verify class", {
					sourcedId: classData.sourcedId,
					error: verificationResult.error
				})
				throw verificationResult.error
			}

			const verifiedClass = verificationResult.data
			if (!verifiedClass) {
				logger.error("class verification failed - class not found after creation", {
					sourcedId: classData.sourcedId
				})
				throw errors.new(`class verification failed for sourcedId: ${classData.sourcedId}`)
			}

			logger.info("class successfully created/updated and verified", {
				sourcedId: classData.sourcedId,
				verifiedTitle: verifiedClass.title,
				verifiedStatus: verifiedClass.status,
				verifiedClassType: verifiedClass.classType
			})

			return { success: true, status: "upserted", class: verifiedClass }
		})

		logger.info("class ingestion completed", {
			sourcedId: classData.sourcedId,
			result: stepResult
		})
		return { status: "success", sourcedId: classData.sourcedId, stepResult }
	}
)
