#!/usr/bin/env bun
/**
 * Script to search for and optionally delete OneRoster course components
 * with sourcedId matching a given prefix.
 *
 * Usage:
 *   bun src/scripts/search-and-delete-oneroster-components.ts <prefix>
 *     Lists all components with sourcedId starting with the given prefix
 *
 *   bun src/scripts/search-and-delete-oneroster-components.ts <prefix> --very-dangerous-list-and-delete
 *     Lists and deletes all matching components (requires confirmation)
 */
import * as readline from "node:readline/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"
import { createPrefixFilter } from "@/lib/filter"

const CONFIRMATION_PHRASE = "YES, I AM ABSOLUTELY SURE"

/**
 * Fetches all course components matching a given prefix.
 * Handles pagination automatically.
 * @param prefix The prefix to search for
 * @returns An array of matching course components.
 */
async function fetchAllMatchingComponents(prefix: string) {
	logger.info("fetching all matching course components...", { prefix })

	// Create filter using the btree-optimized prefix filter
	const filter = createPrefixFilter(prefix)
	logger.debug("using filter", { filter })

	const componentsResult = await errors.try(
		oneroster.getCourseComponents({
			filter,
			sort: "sourcedId",
			orderBy: "asc"
		})
	)
	if (componentsResult.error) {
		logger.error("failed to fetch course components", { error: componentsResult.error })
		throw errors.wrap(componentsResult.error, "oneroster component search")
	}

	const components = componentsResult.data
	logger.info("received all matching components", { count: components.length })

	return components
}

/**
 * Main function to search for and optionally delete OneRoster course components.
 */
async function main() {
	logger.info("starting oneroster course component search script")

	// Parse command-line arguments
	const args = process.argv.slice(2)
	const deleteFlag = args.includes("--very-dangerous-list-and-delete")
	const searchPrefix = args.find((arg) => !arg.startsWith("--"))

	if (!searchPrefix) {
		logger.error("search prefix not provided")
		process.stderr.write(
			"Usage: bun src/scripts/search-and-delete-oneroster-components.ts <prefix> [--very-dangerous-list-and-delete]\n"
		)
		process.exit(1)
	}

	logger.info("searching for course components with prefix", { prefix: searchPrefix })
	const componentsToProcess = await fetchAllMatchingComponents(searchPrefix)

	if (componentsToProcess.length === 0) {
		logger.info("no course components found with sourcedId starting with prefix", { prefix: searchPrefix })
		return
	}

	// Default behavior: List components
	if (!deleteFlag) {
		logger.info("found matching components", { prefix: searchPrefix, count: componentsToProcess.length })
		for (const component of componentsToProcess) {
			const parentInfo = component.parent ? ` (parent: ${component.parent.sourcedId})` : " (top-level)"
			process.stdout.write(
				`- SourcedId: ${component.sourcedId}, Title: ${component.title}, Course: ${component.course.sourcedId}${parentInfo}\n`
			)
		}
		return
	}

	// DANGEROUS: List and delete
	logger.warn("!!! DANGEROUS OPERATION: DELETE MODE ENABLED !!!")
	process.stdout.write(
		`Found ${componentsToProcess.length} components to DELETE with sourcedId starting with '${searchPrefix}':\n`
	)
	for (const component of componentsToProcess) {
		const parentInfo = component.parent ? ` (parent: ${component.parent.sourcedId})` : " (top-level)"
		process.stdout.write(
			`  - ${component.sourcedId}: ${component.title} (course: ${component.course.sourcedId})${parentInfo}\n`
		)
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

	const answer = await rl.question(
		`\nThis will permanently delete ${componentsToProcess.length} course components. This cannot be undone.\nTo confirm, type exactly: "${CONFIRMATION_PHRASE}"\n> `
	)

	rl.close()

	if (answer !== CONFIRMATION_PHRASE) {
		logger.info("confirmation failed. Aborting deletion.")
		process.exit(0)
	}

	logger.info("confirmation received. proceeding with deletion...")

	let deletedCount = 0
	for (const component of componentsToProcess) {
		const deleteResult = await errors.try(oneroster.deleteCourseComponent(component.sourcedId))
		if (deleteResult.error) {
			logger.error("failed to delete component", { sourcedId: component.sourcedId, error: deleteResult.error })
		} else {
			logger.debug("successfully deleted component", { sourcedId: component.sourcedId, title: component.title })
			deletedCount++
		}
	}

	logger.info("deletion process completed", {
		totalFound: componentsToProcess.length,
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
