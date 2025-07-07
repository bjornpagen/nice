#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { QtiApiClient } from "@/lib/qti"

/**
 * Script to fetch and dump a single QTI item by its identifier.
 * Usage: bun run src/scripts/dump-single-qti-item.ts <identifier>
 */
async function main() {
	// Parse command line arguments
	const args = process.argv.slice(2)

	if (args.length === 0) {
		process.stderr.write("Error: No identifier provided\n")
		process.stderr.write("Usage: bun run src/scripts/dump-single-qti-item.ts <identifier>\n")
		process.exit(1)
	}

	const identifier = args[0]
	if (!identifier) {
		process.stderr.write("Error: Invalid identifier provided\n")
		process.exit(1)
	}

	logger.info("starting script to dump single qti item", { identifier })

	const client = new QtiApiClient()

	// Fetch the item
	logger.info("fetching assessment item", { identifier })
	const itemResult = await errors.try(client.getAssessmentItem(identifier))
	if (itemResult.error) {
		logger.error("failed to fetch assessment item", { error: itemResult.error, identifier })
		throw errors.wrap(itemResult.error, "qti item fetch")
	}

	const item = itemResult.data

	// Dump the item data to stdout
	process.stdout.write("======================================================================\n")
	process.stdout.write(`Identifier: ${item.identifier}\n`)
	process.stdout.write(`Title: ${item.title}\n`)
	process.stdout.write(`Type: ${item.type}\n`)
	process.stdout.write(`Created At: ${item.createdAt}\n`)
	process.stdout.write(`Updated At: ${item.updatedAt}\n`)
	process.stdout.write(`QTI Version: ${item.qtiVersion}\n`)
	process.stdout.write(`Time Dependent: ${item.timeDependent}\n`)
	process.stdout.write(`Adaptive: ${item.adaptive}\n`)

	// Response declarations
	if (item.responseDeclarations && item.responseDeclarations.length > 0) {
		process.stdout.write("\n----------------------- RESPONSE DECLARATIONS -----------------------\n")
		for (const response of item.responseDeclarations) {
			process.stdout.write(`Response ID: ${response.identifier}\n`)
			process.stdout.write(`  Cardinality: ${response.cardinality}\n`)
			if (response.baseType) {
				process.stdout.write(`  Base Type: ${response.baseType}\n`)
			}
			if (response.correctResponse) {
				process.stdout.write(`  Correct Response: ${JSON.stringify(response.correctResponse.value)}\n`)
			}
		}
	}

	// Outcome declarations
	if (item.outcomeDeclarations && item.outcomeDeclarations.length > 0) {
		process.stdout.write("\n----------------------- OUTCOME DECLARATIONS -----------------------\n")
		for (const outcome of item.outcomeDeclarations) {
			process.stdout.write(`Outcome ID: ${outcome.identifier}\n`)
			process.stdout.write(`  Cardinality: ${outcome.cardinality}\n`)
			if (outcome.baseType) {
				process.stdout.write(`  Base Type: ${outcome.baseType}\n`)
			}
		}
	}

	// Metadata
	if (item.metadata && Object.keys(item.metadata).length > 0) {
		process.stdout.write("\n---------------------------- METADATA -------------------------------\n")
		process.stdout.write(JSON.stringify(item.metadata, null, 2))
		process.stdout.write("\n")
	}

	// Content
	process.stdout.write("\n---------------------------- CONTENT --------------------------------\n")
	process.stdout.write(JSON.stringify(item.content, null, 2))
	process.stdout.write("\n")

	// Raw XML
	process.stdout.write("\n------------------------- RAW QTI XML --------------------------\n")
	process.stdout.write(`${item.rawXml}\n`)
	process.stdout.write("======================================================================\n")

	logger.info("item dump completed successfully", { identifier })
}

// --- Script Execution ---
const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

logger.info("script completed successfully")
process.exit(0)
