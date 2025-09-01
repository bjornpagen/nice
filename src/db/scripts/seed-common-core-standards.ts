#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
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

// --- NGSS CASE backfill helpers ---
const CfItemSchema = z.object({
    humanCodingScheme: z.string(),
    sourcedId: z.string()
})

const ResponseSchema = z.object({
    CFPackage: z.object({
        CFItems: z.array(z.unknown())
    })
})

async function readCaseJson(absolutePath: string): Promise<{ items: Array<{ humanCodingScheme: string; sourcedId: string }>; invalidCount: number }> {
    const readResult = await errors.try(fs.readFile(absolutePath, "utf-8"))
    if (readResult.error) {
        logger.error("file read", { error: readResult.error, file: absolutePath })
        throw errors.wrap(readResult.error, "file read")
    }

    const parseResult = errors.trySync(() => JSON.parse(readResult.data))
    if (parseResult.error) {
        logger.error("json parse", { error: parseResult.error, file: absolutePath })
        throw errors.wrap(parseResult.error, "json parse")
    }

    const safe = ResponseSchema.safeParse(parseResult.data)
    if (!safe.success) {
        logger.error("response validation", { error: safe.error })
        throw errors.wrap(safe.error, "response validation")
    }
    const rawItems = safe.data.CFPackage.CFItems
    const items: Array<{ humanCodingScheme: string; sourcedId: string }> = []
    let invalidCount = 0
    for (const it of rawItems) {
        const parsed = CfItemSchema.safeParse(it)
        if (parsed.success) items.push(parsed.data)
        else invalidCount++
    }
    return { items, invalidCount }
}

function deriveBaseStandardId(standardId: string): string {
    const dotIndex = standardId.indexOf(".")
    if (dotIndex === -1) return standardId
    return standardId.slice(0, dotIndex)
}

async function backfillNgssCaseIds(opts: { dryRun: boolean }): Promise<void> {
    const repoRoot = process.cwd()
    const inputPath = path.join(repoRoot, "docs/ngss-case-standards.json")

    logger.info("reading case json for ngss backfill", { file: inputPath })
    const caseData = await readCaseJson(inputPath)
    logger.info("parsed case json", { validItems: caseData.items.length, invalidItems: caseData.invalidCount })

    const baseToCaseId = new Map<string, string>()
    for (const it of caseData.items) {
        const id = it.humanCodingScheme
        if (!id) continue
        if ((id.startsWith("MS-") || id.startsWith("HS-")) && !id.includes(".")) {
            if (!baseToCaseId.has(id)) baseToCaseId.set(id, it.sourcedId)
        }
    }

    const emptyRowsResult = await errors.try(
        db
            .select({ id: schema.niceCommonCoreStandards.id, setId: schema.niceCommonCoreStandards.setId, standardId: schema.niceCommonCoreStandards.standardId, caseId: schema.niceCommonCoreStandards.caseId })
            .from(schema.niceCommonCoreStandards)
            .where(sql`${schema.niceCommonCoreStandards.caseId} = '' AND (${schema.niceCommonCoreStandards.setId} = 'NGSS.MS' OR ${schema.niceCommonCoreStandards.setId} = 'NGSS.HS')`)
    )
    if (emptyRowsResult.error) {
        logger.error("db query", { error: emptyRowsResult.error })
        throw errors.wrap(emptyRowsResult.error, "db query")
    }
    const candidates = emptyRowsResult.data

    const updates: Array<{ standardId: string; newCaseId: string }> = []
    for (const row of candidates) {
        const base = deriveBaseStandardId(row.standardId)
        const caseId = baseToCaseId.get(base)
        if (caseId !== undefined) {
            updates.push({ standardId: row.standardId, newCaseId: caseId })
        }
    }

    logger.info("ngss backfill analysis", { candidates: candidates.length, updates: updates.length })

    if (opts.dryRun || updates.length === 0) {
        return
    }

    const BATCH_SIZE = 200
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE)
        logger.info("applying ngss backfill batch", { index: i, size: batch.length })
        const tuples = batch.map((u) => sql`(${u.standardId}, ${u.newCaseId})`)
        const execResult = await errors.try(
            db.execute(sql`
                update ${schema.niceCommonCoreStandards} as ccs
                set case_id = v.case_id
                from (
                    values ${sql.join(tuples, sql`, `)}
                ) as v(standard_id, case_id)
                where ccs.standard_id = v.standard_id
                  and ccs.case_id = ''
                  and (ccs.set_id = 'NGSS.MS' or ccs.set_id = 'NGSS.HS')
            `)
        )
        if (execResult.error) {
            logger.error("db batch update", { error: execResult.error })
            throw errors.wrap(execResult.error, "db batch update")
        }
    }
    logger.info("ngss backfill applied", { count: updates.length })
}

async function main() {
	logger.info("starting common core standards seeding")

	const args = process.argv.slice(2)
	const dryRun = args.includes("--dry-run") || args.includes("-n")
	if (dryRun) {
		logger.info("running in dry-run mode")
	}

	const csvPath = path.join(process.cwd(), "docs/ngss-standard-mappings.csv")
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

	if (dryRun) {
		const sample = deduped.slice(0, 3)
		logger.info("dry run summary", { parsedCount: records.length, dedupedCount: deduped.length, sample })
		// Analyze NGSS backfill without applying changes
		await backfillNgssCaseIds({ dryRun: true })
		logger.info("skipping database writes due to dry run")
		return
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

	// After upsert, apply NGSS backfill for sub-standards
	await backfillNgssCaseIds({ dryRun: false })

	logger.info("completed common core standards seeding")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("seed-common-core-standards failed", { error: result.error })
	process.exit(1)
}
process.exit(0)
