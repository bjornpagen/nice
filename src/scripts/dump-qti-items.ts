#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { QtiApiClient } from "@/lib/qti"

const TOTAL_ITEMS_TO_FETCH = 500
const BATCH_SIZE = 100 // Number of items to fetch per API call

/**
 * Main function to fetch QTI items from the remote service and dump their content.
 * This script does NOT interact with the local database.
 */
async function main() {
	logger.info("starting script to dump raw qti items from the remote service")
	const client = new QtiApiClient()

	let itemsDumped = 0
	let currentPage = 1
	let hasMore = true

	while (itemsDumped < TOTAL_ITEMS_TO_FETCH && hasMore) {
		logger.info("fetching batch of assessment items", { page: currentPage, size: BATCH_SIZE })
		const searchResult = await errors.try(
			client.searchAssessmentItems({ limit: BATCH_SIZE, page: currentPage, sort: "createdAt", order: "desc" })
		)
		if (searchResult.error) {
			logger.error("failed to fetch assessment items batch", { error: searchResult.error, page: currentPage })
			throw errors.wrap(searchResult.error, "qti item search")
		}

		const { items, pages } = searchResult.data
		if (items.length === 0 || currentPage >= pages) {
			hasMore = false
		}

		for (const item of items) {
			if (itemsDumped >= TOTAL_ITEMS_TO_FETCH) {
				hasMore = false
				break
			}

			// Dump the relevant item data to stdout for analysis.
			process.stdout.write("======================================================================\n")
			process.stdout.write(`Identifier: ${item.identifier}\n`)
			process.stdout.write(`Title: ${item.title}\n`)
			process.stdout.write(`Type: ${item.type}\n`)
			process.stdout.write("------------------------- RAW QTI XML --------------------------\n")
			process.stdout.write(`${item.rawXml}\n`)
			process.stdout.write("======================================================================\n\n")

			itemsDumped++
		}

		currentPage++
	}

	logger.info("analysis dump completed", { totalItemsDumped: itemsDumped })
}

// --- Script Execution ---
const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

logger.info("script completed successfully")
process.exit(0)
