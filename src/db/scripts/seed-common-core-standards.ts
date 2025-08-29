#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { sql } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"

logger.setDefaultLogLevel(logger.INFO)

type CsvRow = {
	id: string
	setId: string
	standardId: string
	standardDescription: string
}

function parseCsv(content: string): CsvRow[] {
	const lines = content.split(/\r?\n/) // keep simple, file is trusted input
	if (lines.length === 0) {
		logger.error("csv file empty")
		throw errors.new("csv file empty")
	}

	const headerLine = lines[0]
	if (headerLine === undefined) {
		logger.error("csv header line missing")
		throw errors.new("csv header line missing")
	}
	const header = headerLine.trim()
	const expected = "Set ID,Standard ID,Standard Description"
	if (!header.startsWith(expected)) {
		logger.error("csv header mismatch", { header })
		throw errors.new("csv header mismatch")
	}

	const rows: CsvRow[] = []
	// We will synthesize `id` as `${setId}:${standardId}` to keep it stable and unique
	for (let i = 1; i < lines.length; i++) {
		const raw = lines[i]
		if (!raw || raw.trim() === "") continue

		// Basic CSV splitting that supports commas inside quoted description
		// Approach: state machine to split three columns
		const cols: string[] = []
		let current = ""
		let inQuotes = false
		for (let j = 0; j < raw.length; j++) {
			const ch = raw[j]
			if (ch === '"') {
				// toggle if next is not a quote escape
				if (inQuotes && raw[j + 1] === '"') {
					current += '"'
					j++
				} else {
					inQuotes = !inQuotes
				}
			} else if (ch === "," && !inQuotes) {
				cols.push(current)
				current = ""
			} else {
				current += ch
			}
		}
		cols.push(current)

		if (cols.length < 3) {
			logger.error("csv row missing columns", { raw })
			throw errors.new("csv row missing columns")
		}

		const setIdRaw = cols[0]
		const standardIdRaw = cols[1]
		const standardDescriptionRaw = cols[2]
		if (setIdRaw === undefined || standardIdRaw === undefined || standardDescriptionRaw === undefined) {
			logger.error("csv required columns missing", { raw })
			throw errors.new("csv required columns missing")
		}
		const setId = setIdRaw.trim()
		const standardId = standardIdRaw.trim()
		const standardDescription = standardDescriptionRaw.trim()

		if (setId === "" || standardId === "") {
			logger.error("csv required fields empty", { line: i + 1, setId, standardId })
			throw errors.new("csv required fields empty")
		}

		const id = `${setId}:${standardId}`
		rows.push({ id, setId, standardId, standardDescription })
	}
	return rows
}

async function main() {
	logger.info("starting common core standards seeding")

	const csvPath = path.join(process.cwd(), "common-core-math-standard-mappings.csv")
	const readResult = await errors.try(fs.readFile(csvPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read csv file", { file: csvPath, error: readResult.error })
		throw errors.wrap(readResult.error, "file read")
	}

	const parseResult = errors.trySync(() => parseCsv(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse csv", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "csv parse")
	}

	const records = parseResult.data
	logger.info("parsed csv rows", { count: records.length })

	// Deduplicate by id to avoid ON CONFLICT updating same row twice in one statement
	const uniqueMap = new Map<string, CsvRow>()
	for (const r of records) uniqueMap.set(r.id, r)
	const deduped = Array.from(uniqueMap.values())
	if (deduped.length !== records.length) {
		logger.info("deduplicated csv rows", { count: deduped.length })
	}

	// Upsert in batches to avoid huge single insert
	const BATCH_SIZE = 2000
	for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
		const batch = deduped.slice(i, i + BATCH_SIZE)
		logger.info("upserting standards batch", { count: batch.length })
		const insertResult = await errors.try(
			db
				.insert(schema.niceCommonCoreStandards)
				.values(
					batch.map((r) => ({
						id: r.id,
						setId: r.setId,
						standardId: r.standardId,
						standardDescription: r.standardDescription
					}))
				)
				.onConflictDoUpdate({
					target: schema.niceCommonCoreStandards.id,
					set: {
						setId: sql.raw("excluded.set_id"),
						standardId: sql.raw("excluded.standard_id"),
						standardDescription: sql.raw("excluded.standard_description")
					}
				})
		)
		if (insertResult.error) {
			logger.error("failed to upsert standards batch", { error: insertResult.error })
			throw errors.wrap(insertResult.error, "db upsert")
		}
	}

	logger.info("completed common core standards seeding")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("seed-common-core-standards failed", { error: result.error })
	process.exit(1)
}
process.exit(0)
