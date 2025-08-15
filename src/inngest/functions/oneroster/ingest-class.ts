import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest/client"
import { oneroster } from "@/lib/clients"
import { ErrOneRosterNotFound, ErrOneRosterNotFoundAs422 } from "@/lib/oneroster"

export const ingestClass = inngest.createFunction(
	{
		id: "ingest-class",
		name: "Ingest OneRoster Class"
	},
	{ event: "oneroster/class.ingest.one" },
	async ({ event, step, logger }) => {
		const { courseSlug } = event.data
		logger.info("starting single class ingestion", { courseSlug })

		const classData = await step.run("read-class-file", async () => {
			const filePath = path.join(process.cwd(), "data", courseSlug, "oneroster", "class.json")
			const contentResult = await errors.try(fs.readFile(filePath, "utf-8"))
			if (contentResult.error) {
				logger.error("failed to read class file", { file: filePath, error: contentResult.error })
				throw errors.wrap(contentResult.error, "file read")
			}
			const parseResult = errors.trySync(() => JSON.parse(contentResult.data))
			if (parseResult.error) {
				logger.error("failed to parse class file", { file: filePath, error: parseResult.error })
				throw errors.wrap(parseResult.error, "json parse")
			}
			return parseResult.data
		})

		const { sourcedId } = classData
		if (!sourcedId) {
			logger.error("invalid class data structure: missing sourcedId", { courseSlug })
			throw errors.new("invalid class data: missing sourcedId")
		}

		logger.info("starting class ingestion", {
			sourcedId,
			status: classData.status,
			title: classData.title
		})

		const stepResult = await step.run(`ingest-class-${sourcedId}`, async () => {
			// Clean the data just in case, ensuring only valid fields are sent.
			const cleanClassData = {
				sourcedId: classData.sourcedId,
				status: classData.status,
				title: classData.title,
				classType: classData.classType,
				course: classData.course,
				school: classData.school || classData.org,
				terms: classData.terms
			}

			const result = await errors.try(oneroster.updateClass(sourcedId, cleanClassData))
			if (result.error) {
				if (errors.is(result.error, ErrOneRosterNotFound) || errors.is(result.error, ErrOneRosterNotFoundAs422)) {
					const createResult = await errors.try(oneroster.createClass(cleanClassData))
					if (createResult.error) {
						logger.error("failed to create class", { sourcedId, error: createResult.error })
						throw createResult.error
					}
				} else {
					logger.error("failed to upsert class via API", { sourcedId, error: result.error })
					throw result.error
				}
			}

			const verificationResult = await errors.try(oneroster.getClass(sourcedId))
			if (verificationResult.error) {
				logger.error("failed to verify class after upsert", { sourcedId, error: verificationResult.error })
				throw verificationResult.error
			}

			return { success: true, status: "upserted", class: verificationResult.data }
		})

		return { status: "success", sourcedId, stepResult }
	}
)
