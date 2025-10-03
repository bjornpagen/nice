import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

interface StandardRow {
	standardCode: string
	description: string
	prerequisiteStandardCodes: string
	nonDirectionalStandardCodes: string
	cluster: string
	followsCode: string
	isPlusStandard: string
	isSubStandard: string
	parentCode: string
}

interface OutputStandard {
	standard_code: string
	standard_desc: string
}

function parseCSVLine(line: string): string[] {
	const result: string[] = []
	let current = ""
	let inQuotes = false

	for (let i = 0; i < line.length; i++) {
		const char = line[i]
		if (char === '"') {
			inQuotes = !inQuotes
		} else if (char === "," && !inQuotes) {
			result.push(current)
			current = ""
		} else {
			current += char
		}
	}

	result.push(current)
	return result
}

function parseCSV(content: string): StandardRow[] {
	const lines = content.trim().split("\n")
	if (lines.length === 0) {
		throw errors.new("csv file is empty")
	}

	const headerLine = lines[0]
	if (!headerLine) {
		throw errors.new("csv header line missing")
	}
	const headers = parseCSVLine(headerLine)
	const rows: StandardRow[] = []

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]
		if (!line) continue
		
		const values = parseCSVLine(line)
		if (values.length !== headers.length) {
			logger.warn("skipping malformed row", { line: i + 1, expected: headers.length, got: values.length })
			continue
		}

		const row: Record<string, string> = {}
		for (let j = 0; j < headers.length; j++) {
			const header = headers[j]
			const value = values[j]
			if (header !== undefined && value !== undefined) {
				row[header] = value
			}
		}

		if (
			typeof row.standardCode === "string" &&
			typeof row.description === "string" &&
			typeof row.prerequisiteStandardCodes === "string" &&
			typeof row.nonDirectionalStandardCodes === "string" &&
			typeof row.cluster === "string" &&
			typeof row.followsCode === "string" &&
			typeof row.isPlusStandard === "string" &&
			typeof row.isSubStandard === "string" &&
			typeof row.parentCode === "string"
		) {
			rows.push({
				standardCode: row.standardCode,
				description: row.description,
				prerequisiteStandardCodes: row.prerequisiteStandardCodes,
				nonDirectionalStandardCodes: row.nonDirectionalStandardCodes,
				cluster: row.cluster,
				followsCode: row.followsCode,
				isPlusStandard: row.isPlusStandard,
				isSubStandard: row.isSubStandard,
				parentCode: row.parentCode
			})
		}
	}

	return rows
}

async function main(): Promise<void> {
	const inputPath = join(
		process.cwd(),
		"data/exports/qti/grade4-common-core-standards.csv"
	)
	const outputPath = join(
		process.cwd(),
		"data/exports/qti/grade4-common-core-standards.json"
	)

	logger.info("reading csv file", { path: inputPath })

	const readResult = errors.trySync(() => readFileSync(inputPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read csv file", { error: readResult.error })
		throw errors.wrap(readResult.error, "csv file read")
	}

	logger.debug("parsing csv content")
	const parseResult = errors.trySync(() => parseCSV(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse csv", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "csv parse")
	}

	const standards: OutputStandard[] = parseResult.data.map((row) => ({
		standard_code: row.standardCode,
		standard_desc: row.description,
	}))

	logger.info("converting to json", { count: standards.length })

	const jsonResult = errors.trySync(() => JSON.stringify(standards, null, 2))
	if (jsonResult.error) {
		logger.error("failed to stringify json", { error: jsonResult.error })
		throw errors.wrap(jsonResult.error, "json stringify")
	}

	logger.debug("writing output file", { path: outputPath })
	const writeResult = errors.trySync(() =>
		writeFileSync(outputPath, jsonResult.data, "utf-8")
	)
	if (writeResult.error) {
		logger.error("failed to write output file", { error: writeResult.error })
		throw errors.wrap(writeResult.error, "file write")
	}

	logger.info("conversion complete", { outputPath, count: standards.length })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

