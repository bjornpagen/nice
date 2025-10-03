import { readFile, writeFile } from "node:fs/promises"
import { parseArgs } from "node:util"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"

async function main() {
	const { values } = parseArgs({
		options: {
			input: {
				type: "string",
				short: "i",
				default: "./data/tmp/datasets:mathacademy:skills:outputs:all-skills.yml"
			},
			output: {
				type: "string",
				short: "o",
				default: "./data/tmp/math-skills.json"
			}
		}
	})
	
	const inputPath = values.input
	const outputPath = values.output
	
	if (!inputPath) {
		logger.error("input path required", {})
		throw errors.new("input path required")
	}
	
	logger.info("reading yaml file", { path: inputPath })
	
	const readResult = await errors.try(readFile(inputPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read file", { path: inputPath, error: readResult.error })
		throw errors.wrap(readResult.error, "file read")
	}
	
	const content = readResult.data
	logger.debug("file read", { length: content.length })
	
	// split on lines starting with "- source:" (top-level yaml entries)
	const lines = content.split("\n")
	const entries: string[] = []
	let currentEntry: string[] = []
	
	for (const line of lines) {
		if (line.startsWith("- source:")) {
			// new entry starting, save previous if exists
			if (currentEntry.length > 0) {
				entries.push(currentEntry.join("\n"))
			}
			currentEntry = [line]
		} else if (currentEntry.length > 0) {
			// continuation of current entry
			currentEntry.push(line)
		}
	}
	
	// add last entry
	if (currentEntry.length > 0) {
		entries.push(currentEntry.join("\n"))
	}
	
	logger.info("parsed entries", { count: entries.length })
	
	const jsonOutput = JSON.stringify(entries, null, 2)
	
	logger.info("writing output", { path: outputPath })
	
	const writeResult = await errors.try(writeFile(outputPath, jsonOutput, "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write file", { path: outputPath, error: writeResult.error })
		throw errors.wrap(writeResult.error, "file write")
	}
	
	logger.info("export complete", { entries: entries.length, output: outputPath })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

