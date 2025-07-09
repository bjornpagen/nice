#!/usr/bin/env bun
import * as readline from "node:readline/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import type { Stimulus } from "@/lib/qti"
import { QtiApiClient } from "@/lib/qti"

const BATCH_SIZE = 100
const CONFIRMATION_PHRASE = "YES, I AM ABSOLUTELY SURE"

/**
 * Fetches all stimuli matching a given prefix query.
 * Handles pagination automatically.
 * @param client The QtiApiClient instance.
 * @param query The prefix to search for.
 * @returns An array of matching stimuli.
 */
async function fetchAllMatchingStimuli(client: QtiApiClient, query: string): Promise<Stimulus[]> {
	const allStimuli: Stimulus[] = []
	let page = 1
	let hasMore = true

	logger.info("fetching all matching stimuli, this may take a while depending on the API speed...", {
		query,
		batchSize: BATCH_SIZE
	})

	while (hasMore) {
		logger.info("fetching page", { page })

		const searchResult = await errors.try(
			client.searchStimuli({
				limit: BATCH_SIZE,
				page,
				query,
				sort: "identifier",
				order: "asc"
			})
		)
		if (searchResult.error) {
			logger.error("failed to fetch stimuli batch", { error: searchResult.error, page })
			throw errors.wrap(searchResult.error, "qti stimulus search")
		}

		const { items, pages, total } = searchResult.data
		logger.info("received batch", { count: items.length, totalStimuliInQuery: total, totalPages: pages })

		if (items.length > 0) {
			allStimuli.push(...items)
			logger.info("stimuli collected so far", { count: allStimuli.length })
		}

		if (page >= pages || items.length < BATCH_SIZE) {
			hasMore = false
		} else {
			page++
		}
	}

	return allStimuli
}

/**
 * Main function to search for and optionally delete QTI stimuli.
 */
async function main() {
	logger.info("starting qti stimulus search script")

	// Parse command-line arguments
	const args = process.argv.slice(2)
	const deleteFlag = args.includes("--very-dangerous-list-and-delete")
	const searchPrefix = args.find((arg) => !arg.startsWith("--"))

	if (!searchPrefix) {
		logger.error("search prefix not provided")
		process.stderr.write(
			"Usage: bun src/scripts/search-and-delete-qti-stimuli.ts <search-prefix> [--very-dangerous-list-and-delete]\n"
		)
		process.exit(1)
	}

	const client = new QtiApiClient({
		serverUrl: env.TIMEBACK_QTI_SERVER_URL,
		tokenUrl: env.TIMEBACK_TOKEN_URL,
		clientId: env.TIMEBACK_CLIENT_ID,
		clientSecret: env.TIMEBACK_CLIENT_SECRET
	})

	logger.info("searching for stimuli with prefix", { prefix: searchPrefix })
	const stimuliToProcess = await fetchAllMatchingStimuli(client, searchPrefix)

	if (stimuliToProcess.length === 0) {
		logger.info("no stimuli found matching the prefix", { prefix: searchPrefix })
		return
	}

	// Default behavior: List stimuli
	if (!deleteFlag) {
		logger.info("found matching stimuli", { prefix: searchPrefix, count: stimuliToProcess.length })
		for (const stimulus of stimuliToProcess) {
			process.stdout.write(`- Identifier: ${stimulus.identifier}, Title: ${stimulus.title}\n`)
		}
		return
	}

	// DANGEROUS: List and delete
	logger.warn("!!! DANGEROUS OPERATION: DELETE MODE ENABLED !!!")
	process.stdout.write(`Found ${stimuliToProcess.length} stimuli to DELETE with prefix "${searchPrefix}":\n`)
	for (const stimulus of stimuliToProcess) {
		process.stdout.write(`  - ${stimulus.identifier} (${stimulus.title})\n`)
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

	const answer = await rl.question(
		`\nThis will permanently delete ${stimuliToProcess.length} stimuli. This cannot be undone.\nTo confirm, type exactly: "${CONFIRMATION_PHRASE}"\n> `
	)

	rl.close()

	if (answer !== CONFIRMATION_PHRASE) {
		logger.info("confirmation failed. Aborting deletion.")
		process.exit(0)
	}

	logger.info("confirmation received. proceeding with deletion...")

	let deletedCount = 0
	for (const stimulus of stimuliToProcess) {
		const deleteResult = await errors.try(client.deleteStimulus(stimulus.identifier))
		if (deleteResult.error) {
			logger.error("failed to delete stimulus", { identifier: stimulus.identifier, error: deleteResult.error })
		} else {
			logger.debug("successfully deleted stimulus", { identifier: stimulus.identifier })
			deletedCount++
		}
	}

	logger.info("deletion process completed", {
		totalFound: stimuliToProcess.length,
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
