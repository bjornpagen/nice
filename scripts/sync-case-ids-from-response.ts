#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { eq, inArray, sql } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"

type CliOptions = {
	files: string[]
	apply: boolean
	csvPath: string
}

const CfItemSchema = z.object({
	humanCodingScheme: z.string(),
	sourcedId: z.string()
})

const ResponseSchema = z.object({
	CFPackage: z.object({
		CFItems: z.array(z.unknown())
	})
})

type ValidItem = z.infer<typeof CfItemSchema>

type ExtractResult = {
	valid: ValidItem[]
	invalidCount: number
}

function parseArgs(argv: string[]): CliOptions {
	// Default inputs
	let files = ["docs/ngss-case-standards.json"]
	let apply = false
	let csvPath = "docs/khan-standards-case.csv"

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (!arg) continue
		if (arg === "--apply") {
			apply = true
			continue
		}
		if (arg === "--file" || arg === "-f") {
			const next = argv[i + 1]
			if (next) {
				files = [next]
				i++
			}
			continue
		}
		if (arg.startsWith("--file=")) {
			files = [arg.slice("--file=".length)]
			continue
		}
		if (arg.startsWith("--files=")) {
			const list = arg.slice("--files=".length)
			const parts = list.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
			if (parts.length > 0) files = parts
			continue
		}
		if (arg === "--csv") {
			const next = argv[i + 1]
			if (next) {
				csvPath = next
				i++
			}
			continue
		}
		if (arg.startsWith("--csv=")) {
			csvPath = arg.slice("--csv=".length)
			continue
		}
	}

	return { files, apply, csvPath }
}

async function readJsonFile<T = unknown>(absolutePath: string): Promise<T> {
	logger.info("reading json file", { file: absolutePath })
	const readResult = await errors.try(fs.readFile(absolutePath, "utf8"))
	if (readResult.error) {
		logger.error("file read", { error: readResult.error, file: absolutePath })
		throw errors.wrap(readResult.error, "file read")
	}
	const parseResult = errors.trySync(() => JSON.parse(readResult.data) as T)
	if (parseResult.error) {
		logger.error("json parse", { error: parseResult.error, file: absolutePath })
		throw errors.wrap(parseResult.error, "json parse")
	}
	return parseResult.data
}

function extractValidItems(raw: unknown): ExtractResult {
	const safe = ResponseSchema.safeParse(raw)
	if (!safe.success) {
		throw errors.wrap(safe.error, "response validation")
	}
	const itemsRaw = safe.data.CFPackage.CFItems
	const valid: ValidItem[] = []
	let invalidCount = 0
	for (const it of itemsRaw) {
		const parsed = CfItemSchema.safeParse(it)
		if (parsed.success) {
			valid.push(parsed.data)
		} else {
			invalidCount++
		}
	}
	return { valid, invalidCount }
}

type AnalysisReport = {
	input: {
		files: string[]
		totalRawItems: number
		validItems: number
		invalidItems: number
		uniqueStandards: number
		duplicateStandards: number
	}
	database: {
		fetchedRows: number
		matchedStandards: number
		missingInDb: number
	}
	updates: {
		willInsert: number
		willOverwrite: number
		unchanged: number
	}
	conflicts: Array<{
		standardId: string
		sourcedIds: string[]
	}>
	missingStandards: string[]
	sample: {
		pendingUpdates: Array<{ standardId: string; existingCaseId: string; newCaseId: string }>
		unchanged: Array<{ standardId: string; caseId: string }>
	}
}

async function main(): Promise<void> {
	const argv = process.argv.slice(2)
	const opts = parseArgs(argv)

	logger.info(opts.apply ? "starting apply run" : "starting dry run", { files: opts.files, csv: opts.csvPath })

	const repoRoot = process.cwd()
	const absoluteFiles = opts.files.map((f) => (path.isAbsolute(f) ? f : path.join(repoRoot, f)))
	const absoluteCsv = path.isAbsolute(opts.csvPath) ? opts.csvPath : path.join(repoRoot, opts.csvPath)

	// Read and merge items from all files
	let allItems: ValidItem[] = []
	let totalInvalid = 0
	let totalRaw = 0
	for (const file of absoluteFiles) {
		const raw = await readJsonFile(file)
		const { valid, invalidCount } = extractValidItems(raw)
		totalRaw += valid.length + invalidCount
		totalInvalid += invalidCount
		if (invalidCount > 0) {
			logger.warn("skipping invalid items", { file, count: invalidCount })
		}
		allItems = allItems.concat(valid)
	}
	logger.info("validated items", { count: allItems.length })

	// Build map: standardId -> list of sourcedIds (to detect conflicts/duplicates)
	const standardToSourcedIds = new Map<string, Set<string>>()
	for (const it of allItems) {
		const existing = standardToSourcedIds.get(it.humanCodingScheme)
		let set: Set<string>
		if (existing === undefined) {
			set = new Set<string>()
			standardToSourcedIds.set(it.humanCodingScheme, set)
		} else {
			set = existing
		}
		set.add(it.sourcedId)
	}

	const uniqueStandards = Array.from(standardToSourcedIds.keys())
	const conflicts = uniqueStandards
		.map((s) => {
			const got = standardToSourcedIds.get(s)
			if (got === undefined) {
				return { standardId: s, sourcedIds: [] as string[] }
			}
			return { standardId: s, sourcedIds: Array.from(got) }
		})
		.filter((x) => x.sourcedIds.length > 1)

	if (conflicts.length > 0) {
		logger.warn("found conflicting sourced ids for the same standard", { count: conflicts.length })
	}

	// Fetch corresponding standards from DB
	logger.info("fetching standards from database", { count: uniqueStandards.length })
	const fetchResult = await errors.try(
		db
			.select({
				id: schema.niceCommonCoreStandards.id,
				standardId: schema.niceCommonCoreStandards.standardId,
				caseId: schema.niceCommonCoreStandards.caseId
			})
			.from(schema.niceCommonCoreStandards)
			.where(inArray(schema.niceCommonCoreStandards.standardId, uniqueStandards))
	)
	if (fetchResult.error) {
		logger.error("db query", { error: fetchResult.error })
		throw errors.wrap(fetchResult.error, "db query")
	}

	const rows = fetchResult.data
	const byStandard = new Map<string, { id: string; standardId: string; caseId: string }>()
	for (const r of rows) byStandard.set(r.standardId, r)

	// Fetch DB rows with empty case_id to compute which will remain unset after this run
	const emptyRowsResult = await errors.try(
		db
			.select({
				id: schema.niceCommonCoreStandards.id,
				standardId: schema.niceCommonCoreStandards.standardId,
				caseId: schema.niceCommonCoreStandards.caseId,
				setId: schema.niceCommonCoreStandards.setId
			})
			.from(schema.niceCommonCoreStandards)
			.where(eq(schema.niceCommonCoreStandards.caseId, ""))
	)
	if (emptyRowsResult.error) {
		logger.error("db query", { error: emptyRowsResult.error })
		throw errors.wrap(emptyRowsResult.error, "db query")
	}

	const emptyRows = emptyRowsResult.data

	const missingStandards: string[] = []
	const pendingUpdates: Array<{ standardId: string; existingCaseId: string; newCaseId: string }> = []
	const unchanged: Array<{ standardId: string; caseId: string }> = []
	let willInsert = 0
	let willOverwrite = 0

	for (const standardId of uniqueStandards) {
		const row = byStandard.get(standardId)
		if (!row) {
			missingStandards.push(standardId)
			continue
		}
		const got = standardToSourcedIds.get(standardId)
		if (got === undefined) continue
		const choices = Array.from(got)
		if (choices.length === 0) continue
		const [newCaseId] = choices
		if (newCaseId === undefined) continue
		if (row.caseId === newCaseId) {
			unchanged.push({ standardId, caseId: row.caseId })
			continue
		}
		if (row.caseId === "") willInsert++
		else willOverwrite++
		pendingUpdates.push({ standardId, existingCaseId: row.caseId, newCaseId })
	}

	// CSV fallback for NGSS.MS / NGSS.HS standards missing sourcedId in CASE JSON
	const csvReadResult = await errors.try(fs.readFile(absoluteCsv, "utf8"))
	if (csvReadResult.error) {
		logger.error("file read", { error: csvReadResult.error, file: absoluteCsv })
		throw errors.wrap(csvReadResult.error, "file read")
	}
	// Parse simple CSV (header: khan standard id,case id)
	const csvLines = csvReadResult.data.split(/\r?\n/).filter((l) => l.trim().length > 0)
	const csvHeader = csvLines[0]
	if (csvHeader === undefined) {
		logger.error("csv header line missing", { file: absoluteCsv })
		throw errors.new("csv header line missing")
	}
	const headerNormalized = csvHeader.replace(/^\uFEFF/, "").trim().toLowerCase()
	const expectedHeader = "khan standard id,case id"
	if (headerNormalized !== expectedHeader) {
		logger.warn("csv header unexpected; continuing", { header: csvHeader })
	}
	const khanToCase = new Map<string, string>()
	for (let i = 1; i < csvLines.length; i++) {
		const line = csvLines[i]
		if (!line || line.trim() === "") continue
		const idx = line.indexOf(",")
		if (idx < 0) continue
		const std = line.slice(0, idx).trim()
		const caseId = line.slice(idx + 1).trim()
		if (std !== "" && caseId !== "" && !khanToCase.has(std)) {
			khanToCase.set(std, caseId)
		}
	}

	const alreadyUpdating = new Set(pendingUpdates.map((u) => u.standardId))
	let csvFallbackAdded = 0
	for (const r of emptyRows) {
		if (r.setId !== "NGSS.MS" && r.setId !== "NGSS.HS") continue
		if (alreadyUpdating.has(r.standardId)) continue
		const mappedHumanId = khanToCase.get(r.standardId)
		if (mappedHumanId === undefined) continue
		const sourcedIds = standardToSourcedIds.get(mappedHumanId)
		if (sourcedIds === undefined || sourcedIds.size === 0) {
			logger.warn("csv fallback target not found in CASE json", { standardId: r.standardId, mappedHumanId })
			continue
		}
		const [sourcedId] = Array.from(sourcedIds)
		if (!sourcedId) continue
		pendingUpdates.push({ standardId: r.standardId, existingCaseId: r.caseId, newCaseId: sourcedId })
		csvFallbackAdded++
	}

	// Compute DB rows that will remain without a case_id after this run (still empty and not matched by input or CSV)
	const pendingSet = new Set(pendingUpdates.map((p) => p.standardId))
	const notUpdatedDbRows = emptyRows.filter((r) => !pendingSet.has(r.standardId))

	const report: AnalysisReport & {
		summary: {
			matched: number
			missingInDb: number
			pendingInsert: number
			pendingOverwrite: number
			unchanged: number
			dbEmptyCaseIdTotal: number
			dbWillRemainUnset: number
			csvFallbackAdded: number
		}
		notUpdatedDbRows: Array<{ id: string; standardId: string }>
	} = {
		input: {
			files: absoluteFiles,
			totalRawItems: totalRaw,
			validItems: allItems.length,
			invalidItems: totalInvalid,
			uniqueStandards: uniqueStandards.length,
			duplicateStandards: conflicts.length
		},
		database: {
			fetchedRows: rows.length,
			matchedStandards: rows.length,
			missingInDb: missingStandards.length
		},
		updates: {
			willInsert,
			willOverwrite,
			unchanged: unchanged.length
		},
		conflicts,
		missingStandards,
		sample: {
			pendingUpdates: pendingUpdates.slice(0, 20),
			unchanged: unchanged.slice(0, 20)
		},
		summary: {
			matched: rows.length,
			missingInDb: missingStandards.length,
			pendingInsert: willInsert + csvFallbackAdded,
			pendingOverwrite: willOverwrite,
			unchanged: unchanged.length,
			dbEmptyCaseIdTotal: emptyRows.length,
			dbWillRemainUnset: notUpdatedDbRows.length,
			csvFallbackAdded
		},
		notUpdatedDbRows: notUpdatedDbRows.map((r) => ({ id: r.id, standardId: r.standardId }))
	}

	// Print comprehensive analysis + summary
	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)

	if (!opts.apply) {
		logger.info("dry run complete; no changes applied", { pendingUpdates: pendingUpdates.length })
		process.exit(0)
		return
	}

	if (pendingUpdates.length === 0) {
		logger.info("no updates required")
		process.exit(0)
		return
	}

	logger.info("applying updates in batches", { count: pendingUpdates.length })
	const BATCH_SIZE = 200
	const txResult = await errors.try(
		db.transaction(async (tx) => {
			for (let i = 0; i < pendingUpdates.length; i += BATCH_SIZE) {
				const batch = pendingUpdates.slice(i, i + BATCH_SIZE)
				logger.info("updating batch", { index: i, size: batch.length })
				// Build VALUES tuples with parameterization
				const tuples = batch.map((u) => sql`(${u.standardId}, ${u.newCaseId})`)
				const execResult = await errors.try(
					tx.execute(sql`
						update ${schema.niceCommonCoreStandards} as ccs
						set case_id = v.case_id
						from (
							values ${sql.join(tuples, sql`, `)}
						) as v(standard_id, case_id)
						where ccs.standard_id = v.standard_id
					`)
				)
				if (execResult.error) {
					logger.error("batch update failed", { error: execResult.error })
					throw errors.wrap(execResult.error, "db batch update")
				}
			}
		})
	)
	if (txResult.error) {
		logger.error("transaction failed", { error: txResult.error })
		throw txResult.error
	}

	logger.info("updates applied successfully", { count: pendingUpdates.length })
	process.exit(0)
}

const run = await errors.try(main())
if (run.error) {
	logger.error("operation failed", { error: run.error })
	process.exit(1)
}


