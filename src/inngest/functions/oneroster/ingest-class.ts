import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"

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

		logger.info("starting class ingestion", {
			sourcedId: classData.sourcedId,
			title: classData.title,
			classType: classData.classType,
			courseSourcedId: classData.course?.sourcedId,
			schoolSourcedId: classData.school?.sourcedId || classData.org?.sourcedId,
			termsCount: classData.terms?.length || 0
		})

		// Replace colon with dash in step ID to make it valid
		const stepId = `ingest-class-${classData.sourcedId.replace(/:/g, "-")}`
		const stepResult = await step.run(stepId, async () => {
			logger.debug("checking for existing class", { sourcedId: classData.sourcedId })

			// Wrap getClass in errors.try to handle any exceptions
			const existingClassResult = await errors.try(oneroster.getClass(classData.sourcedId))
			if (existingClassResult.error) {
				logger.error("failed to check for existing class", {
					sourcedId: classData.sourcedId,
					error: existingClassResult.error
				})
				throw existingClassResult.error
			}

			const existingClass = existingClassResult.data
			if (existingClass) {
				logger.warn("class already exists, skipping creation", {
					sourcedId: classData.sourcedId,
					existingTitle: existingClass.title,
					existingClassType: existingClass.classType,
					existingStatus: existingClass.status
				})
				return { success: true, status: "skipped", existingClass }
			}

			logger.debug("class not found, proceeding with creation", { sourcedId: classData.sourcedId })

			// Clean the class data to remove any Inngest metadata
			const cleanClassData = {
				sourcedId: classData.sourcedId,
				title: classData.title,
				classType: classData.classType,
				course: classData.course,
				school: classData.school,
				org: classData.org,
				terms: classData.terms
			}

			logger.debug("class creation payload", { classData: cleanClassData })

			const result = await errors.try(oneroster.createClass(cleanClassData))
			if (result.error) {
				logger.error("failed to create class via API", {
					sourcedId: classData.sourcedId,
					error: result.error,
					classData: cleanClassData
				})
				throw result.error
			}

			logger.info("class API call successful", {
				sourcedId: classData.sourcedId,
				apiResponse: result.data
			})

			// Verify the class was actually created by fetching it
			logger.debug("verifying class creation", { sourcedId: classData.sourcedId })
			const verificationResult = await errors.try(oneroster.getClass(classData.sourcedId))
			if (verificationResult.error) {
				logger.error("failed to verify class creation", {
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

			logger.info("class successfully created and verified", {
				sourcedId: classData.sourcedId,
				verifiedTitle: verifiedClass.title,
				verifiedStatus: verifiedClass.status,
				verifiedClassType: verifiedClass.classType
			})

			return { success: true, status: "created", createdClass: verifiedClass }
		})

		logger.info("class ingestion completed", {
			sourcedId: classData.sourcedId,
			result: stepResult
		})
		return { status: "success", sourcedId: classData.sourcedId, stepResult }
	}
)
