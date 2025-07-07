#!/usr/bin/env bun
import * as readline from "node:readline/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { AssessmentItem } from "@/lib/qti"
import { QtiApiClient } from "@/lib/qti"

const BATCH_SIZE = 100
const CONFIRMATION_PHRASE = "YES, I AM ABSOLUTELY SURE"

/**
 * Fetches all assessment items matching a given prefix query.
 * Handles pagination automatically.
 * @param client The QtiApiClient instance.
 * @param query The prefix to search for.
 * @returns An array of matching assessment items.
 */
async function fetchAllMatchingItems(client: QtiApiClient, query: string): Promise<AssessmentItem[]> {
	const allItems: AssessmentItem[] = []
	let page = 1
	let hasMore = true

	logger.info("fetching all matching items, this may take a while depending on the API speed...", {
		query,
		batchSize: BATCH_SIZE
	})

	while (hasMore) {
		logger.info("fetching page", { page })

		const searchResult = await errors.try(
			client.searchAssessmentItems({
				limit: BATCH_SIZE,
				page,
				query,
				sort: "identifier",
				order: "asc"
			})
		)
		if (searchResult.error) {
			logger.error("failed to fetch assessment items batch", { error: searchResult.error, page })
			throw errors.wrap(searchResult.error, "qti item search")
		}

		const { items, pages, total } = searchResult.data
		logger.info("received batch", { count: items.length, totalItemsInQuery: total, totalPages: pages })

		if (items.length > 0) {
			allItems.push(...items)
			logger.info("items collected so far", { count: allItems.length })
		}

		if (page >= pages || items.length < BATCH_SIZE) {
			hasMore = false
		} else {
			page++
		}
	}

	return allItems
}

/**
 * Main function to search for and optionally delete QTI assessment items.
 */
async function main() {
	logger.info("starting qti assessment item search script")

	// Parse command-line arguments
	const args = process.argv.slice(2)
	const deleteFlag = args.includes("--very-dangerous-list-and-delete")
	const searchPrefix = args.find((arg) => !arg.startsWith("--"))

	if (!searchPrefix) {
		logger.error("search prefix not provided")
		process.stderr.write(
			"Usage: bun src/scripts/search-and-delete-qti-items.ts <search-prefix> [--very-dangerous-list-and-delete]\n"
		)
		process.exit(1)
	}

	const client = new QtiApiClient()

	logger.info("searching for assessment items with prefix", { prefix: searchPrefix })
	const itemsToProcess = await fetchAllMatchingItems(client, searchPrefix)

	if (itemsToProcess.length === 0) {
		logger.info("no assessment items found matching the prefix", { prefix: searchPrefix })
		return
	}

	// Default behavior: List items
	if (!deleteFlag) {
		logger.info("found matching items", { prefix: searchPrefix, count: itemsToProcess.length })
		for (const item of itemsToProcess) {
			process.stdout.write(`- Identifier: ${item.identifier}, Title: ${item.title}\n`)
		}
		return
	}

	// DANGEROUS: List and delete
	logger.warn("!!! DANGEROUS OPERATION: DELETE MODE ENABLED !!!")
	process.stdout.write(`Found ${itemsToProcess.length} items to DELETE with prefix "${searchPrefix}":\n`)
	for (const item of itemsToProcess) {
		process.stdout.write(`  - ${item.identifier} (${item.title})\n`)
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

	const answer = await rl.question(
		`\nThis will permanently delete ${itemsToProcess.length} items. This cannot be undone.\nTo confirm, type exactly: "${CONFIRMATION_PHRASE}"\n> `
	)

	rl.close()

	if (answer !== CONFIRMATION_PHRASE) {
		logger.info("confirmation failed. Aborting deletion.")
		process.exit(0)
	}

	logger.info("confirmation received. proceeding with deletion...")

	let deletedCount = 0
	for (const item of itemsToProcess) {
		const deleteResult = await errors.try(client.deleteAssessmentItem(item.identifier))
		if (deleteResult.error) {
			logger.error("failed to delete item", { identifier: item.identifier, error: deleteResult.error })
		} else {
			logger.debug("successfully deleted item", { identifier: item.identifier })
			deletedCount++
		}
	}

	logger.info("deletion process completed", {
		totalFound: itemsToProcess.length,
		successfullyDeleted: deletedCount
	})
}

// --- Script Execution ---
const result = await errors.try(main())
if (result.error) {
	logger.error("script failed with an unhandled error", { error: result.error })
	process.exit(1)
}

logger.info("script finished successfully")
process.exit(0)
