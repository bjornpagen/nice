import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { Client } from "@/lib/qti"

async function main(): Promise<void> {
	const filePath = process.argv[2]
	const identifierArg = process.argv[3]

	if (!filePath) {
		logger.error("missing file path argument")
		throw errors.new("upload qti: missing file path argument")
	}

	const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)

	const readResult = await errors.try(fs.readFile(absPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read qti xml", { file: absPath, error: readResult.error })
		throw errors.wrap(readResult.error, "file read")
	}
	const xml = readResult.data

	const qti = new Client({
		serverUrl: env.TIMEBACK_QTI_SERVER_URL,
		tokenUrl: env.TIMEBACK_TOKEN_URL,
		clientId: env.TIMEBACK_CLIENT_ID,
		clientSecret: env.TIMEBACK_CLIENT_SECRET
	})

	// if identifier provided, update; else create
	if (identifierArg) {
		const result = await errors.try(qti.updateAssessmentItem({ identifier: identifierArg, xml }))
		if (result.error) {
			logger.error("qti item update failed", { error: result.error })
			throw errors.wrap(result.error, "qti item update")
		}
		logger.info("updated assessment item", { identifier: result.data.identifier, title: result.data.title })
		return
	}

	const createResult = await errors.try(qti.createAssessmentItem({ xml }))
	if (createResult.error) {
		logger.error("qti item create failed", { error: createResult.error })
		throw errors.wrap(createResult.error, "qti item create")
	}
	logger.info("created assessment item", { identifier: createResult.data.identifier, title: createResult.data.title })
	logger.info("embed url", {
		url: `${env.NEXT_PUBLIC_QTI_ASSESSMENT_ITEM_PLAYER_URL}/${createResult.data.identifier}`
	})
}

async function runCli(): Promise<void> {
	const result = await errors.try(main())
	if (result.error) {
		logger.error("operation failed", { error: result.error })
		process.exit(1)
	}
}

void runCli()
