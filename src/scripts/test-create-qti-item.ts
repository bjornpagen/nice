#!/usr/bin/env bun
import * as readline from "node:readline/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { QtiApiClient } from "@/lib/qti"

logger.setDefaultLogLevel(logger.DEBUG)

/**
 * A quick-and-dirty script to test creating a QTI assessment item by sending raw XML.
 * It reads XML from stdin and sends it to the QTI API.
 *
 * Usage:
 * 1. Run the script: `bun src/scripts/test-create-qti-item.ts`
 * 2. Paste your QTI XML into the terminal.
 * 3. Press Ctrl+D (EOF) to send the XML to the API.
 */
async function main() {
	logger.info("Paste your QTI XML below. Press Ctrl+D when done to send.")

	const xmlLines: string[] = []
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false
	})

	for await (const line of rl) {
		xmlLines.push(line)
	}

	// rl closes automatically when EOF is received

	const xmlContent = xmlLines.join("\n")

	if (!xmlContent) {
		logger.error("no xml content provided, exiting")
		return
	}

	logger.info("sending the following qti xml to the api:")
	process.stdout.write("-------------------- XML START --------------------\n")
	process.stdout.write(`${xmlContent}\n`)
	process.stdout.write("--------------------- XML END ---------------------\n\n")

	const client = new QtiApiClient()

	const createResult = await errors.try(
		client.createAssessmentItem({
			xml: xmlContent
		})
	)

	if (createResult.error) {
		logger.error("failed to create assessment item", { error: createResult.error })
		// We re-throw here to make sure the script exits with a non-zero code.
		throw createResult.error
	}

	logger.info("successfully created assessment item!")
	logger.info("server response:", { response: createResult.data })
}

// --- Script Execution ---
const result = await errors.try(main())

if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

logger.info("script finished successfully.")
process.exit(0)
