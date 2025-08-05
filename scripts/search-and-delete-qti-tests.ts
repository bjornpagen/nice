#!/usr/bin/env bun
import * as readline from "node:readline/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"
import type { AssessmentTest } from "@/lib/qti"

const BATCH_SIZE = 100
const CONFIRMATION_PHRASE = "YES, I AM ABSOLUTELY SURE"

/**
 * Fetches all assessment tests matching a given prefix query.
 * Handles pagination automatically.
 * @param query The prefix to search for.
 * @returns An array of matching assessment tests.
 */
async function fetchAllMatchingTests(query: string): Promise<AssessmentTest[]> {
	const allTests: AssessmentTest[] = []
	let page = 1
	let hasMore = true

	logger.info("fetching all matching assessment tests, this may take a while depending on the API speed...", {
		query,
		batchSize: BATCH_SIZE
	})

	while (hasMore) {
		logger.info("fetching page", { page })

		const searchResult = await errors.try(
			qti.searchAssessmentTests({
				limit: BATCH_SIZE,
				page,
				query,
				sort: "identifier",
				order: "asc"
			})
		)
		if (searchResult.error) {
			logger.error("failed to fetch assessment tests batch", { error: searchResult.error, page })
			throw errors.wrap(searchResult.error, "qti test search")
		}

		const { items, pages, total } = searchResult.data
		logger.info("received batch", { count: items.length, totalItemsInQuery: total, totalPages: pages })

		if (items.length > 0) {
			allTests.push(...items)
			logger.info("tests collected so far", { count: allTests.length })
		}

		if (page >= pages || items.length < BATCH_SIZE) {
			hasMore = false
		} else {
			page++
		}
	}

	return allTests
}

/**
 * Main function to search for and optionally delete QTI assessment tests.
 */
async function main() {
	logger.info("starting qti assessment test search script")

	// Parse command-line arguments
	const args = process.argv.slice(2)
	const deleteFlag = args.includes("--very-dangerous-list-and-delete")
	const searchPrefix = args.find((arg) => !arg.startsWith("--"))

	if (!searchPrefix) {
		logger.error("search prefix not provided")
		process.stderr.write(
			"Usage: bun src/scripts/search-and-delete-qti-tests.ts <search-prefix> [--very-dangerous-list-and-delete]\n"
		)
		process.exit(1)
	}

	logger.info("searching for assessment tests with prefix", { prefix: searchPrefix })
	const testsToProcess = await fetchAllMatchingTests(searchPrefix)

	if (testsToProcess.length === 0) {
		logger.info("no assessment tests found matching the prefix", { prefix: searchPrefix })
		return
	}

	// Default behavior: List tests
	if (!deleteFlag) {
		logger.info("found matching assessment tests", { prefix: searchPrefix, count: testsToProcess.length })
		for (const test of testsToProcess) {
			process.stdout.write(`- Identifier: ${test.identifier}, Title: ${test.title}\n`)
		}
		return
	}

	// DANGEROUS: List and delete
	logger.warn("!!! DANGEROUS OPERATION: DELETE MODE ENABLED !!!")
	process.stdout.write(`Found ${testsToProcess.length} assessment tests to DELETE with prefix "${searchPrefix}":\n`)
	for (const test of testsToProcess) {
		process.stdout.write(`  - ${test.identifier} (${test.title})\n`)
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

	const answer = await rl.question(
		`\nThis will permanently delete ${testsToProcess.length} assessment tests. This cannot be undone.\nTo confirm, type exactly: "${CONFIRMATION_PHRASE}"\n> `
	)

	rl.close()

	if (answer !== CONFIRMATION_PHRASE) {
		logger.info("confirmation failed. Aborting deletion.")
		process.exit(0)
	}

	logger.info("confirmation received. proceeding with deletion...")

	let deletedCount = 0
	for (const test of testsToProcess) {
		const deleteResult = await errors.try(qti.deleteAssessmentTest(test.identifier))
		if (deleteResult.error) {
			logger.error("failed to delete assessment test", { identifier: test.identifier, error: deleteResult.error })
		} else {
			logger.debug("successfully deleted assessment test", { identifier: test.identifier })
			deletedCount++
		}
	}

	logger.info("deletion process completed", {
		totalFound: testsToProcess.length,
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
