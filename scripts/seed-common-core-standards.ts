#!/usr/bin/env bun
/**
 * Seed Common Core Standards and content links from a CSV mapping file.
 *
 * - Matches content by trailing slug + content kind (no path check)
 * - Idempotent: deterministic standard IDs and ON CONFLICT DO NOTHING for links
 * - Efficient: batch content lookups by slug and batch inserts
 * - Explicit selection: all selects and returning clauses specify columns
 *
 * Usage:
 *   bun run scripts/seed-common-core-standards.ts \
 *     [--file <path>] [--dry-run] [--continue-on-error] [--batch-size <n>] \
 *     [--report <path.json>] [--include-path <substring> ...]
 *
 * CSV header (required):
 *   Set ID,Standard ID,Standard Description,Content Kind,Content Title,Content URL
 */

import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { parse as parseSync } from "csv-parse/sync"
import { inArray } from "drizzle-orm"
import { db } from "@/db"
import {
	niceArticles,
	niceCommonCoreStandards,
	niceExercises,
	niceLessonContentsCommonCoreStandards,
	niceVideos
} from "@/db/schemas/nice"

type ContentKind = "Exercise" | "Video" | "Article"

interface CsvRowNormalized {
	setId: string
	standardId: string
	standardDescription: string
	contentKind: ContentKind
	contentTitle: string
	contentUrl: string
}

interface LinkRecordPending {
	standardKey: string
	contentKind: ContentKind
	contentSlug: string
	normalizedPath: string
}

interface ContentRecord {
	id: string
	slug: string
	path: string
}

interface CliOptions {
	filePath: string
	dryRun: boolean
	continueOnError: boolean
	batchSize: number
	reportPath: string | null
	includePathSubstrings: string[]
}

function parseCliArgs(): CliOptions {
	const args = process.argv.slice(2)
	let filePath = path.join(process.cwd(), "common-core-math-standard-mappings.csv")
	let dryRun = false
	let continueOnError = false
	let batchSize = 1000
	let reportPath: string | null = null
	const includePathSubstrings: string[] = []

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		if (arg === "--file") {
			const next = args[i + 1]
			if (typeof next === "string") {
				filePath = path.isAbsolute(next) ? next : path.join(process.cwd(), next)
				i++
			} else {
				logger.error("--file flag missing value")
				throw errors.new("missing --file value")
			}
			continue
		}
		if (arg === "--dry-run") {
			dryRun = true
			continue
		}
		if (arg === "--continue-on-error") {
			continueOnError = true
			continue
		}
		if (arg === "--batch-size") {
			const next = args[i + 1]
			if (typeof next === "string") {
				const parsed = Number(next)
				if (Number.isInteger(parsed) && parsed > 0) batchSize = parsed
				i++
			} else {
				logger.error("--batch-size flag missing value")
				throw errors.new("missing --batch-size value")
			}
			continue
		}
		if (arg === "--report") {
			const next = args[i + 1]
			if (typeof next === "string") {
				reportPath = path.isAbsolute(next) ? next : path.join(process.cwd(), next)
				i++
			} else {
				logger.error("--report flag missing value")
				throw errors.new("missing --report value")
			}
			continue
		}
		if (arg === "--include-path") {
			const next = args[i + 1]
			if (typeof next === "string") {
				includePathSubstrings.push(next)
				i++
			} else {
				logger.error("--include-path flag missing value")
				throw errors.new("missing --include-path value")
			}
		}
	}

	return { filePath, dryRun, continueOnError, batchSize, reportPath, includePathSubstrings }
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim() !== ""
}

function normalizeUrlPath(urlString: string): { normalizedPath: string; slug: string } {
	const urlResult = errors.trySync(() => new URL(urlString))
	if (urlResult.error) {
		logger.error("invalid content url", { url: urlString, error: urlResult.error })
		throw errors.wrap(urlResult.error, "url parse")
	}
	// Safe to construct again to satisfy type checker without assertions
	const url = new URL(urlString)

	// Decode percent-encodings and remove any trailing slash
	const decodedPath = decodeURI(url.pathname)
	const normalizedPath = decodedPath.endsWith("/") && decodedPath !== "/" ? decodedPath.slice(0, -1) : decodedPath
	const segments = normalizedPath.split("/").filter((s) => s !== "")
	if (segments.length === 0) {
		logger.error("content url has no path segments", { url: urlString })
		throw errors.new("content url has no path segments")
	}
	const slugIndex = segments.length - 1
	const slugCandidate = segments[slugIndex]
	if (!isNonEmptyString(slugCandidate)) {
		logger.error("invalid slug from url path", { url: urlString, path: normalizedPath })
		throw errors.new("invalid url slug")
	}
	const slug = slugCandidate
	return { normalizedPath, slug }
}

function toStandardKey(setId: string, standardId: string): string {
	return `${setId}:${standardId}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function parseCsvFile(filePath: string): CsvRowNormalized[] {
	const readResult = errors.trySync(() => fs.readFileSync(filePath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read csv file", { file: filePath, error: readResult.error })
		throw errors.wrap(readResult.error, "file read")
	}

	const parsedUnknown = parseSync(readResult.data, {
		columns: (header: string[]) => header.map((h) => (typeof h === "string" ? h.trim() : h)),
		trim: true,
		skip_empty_lines: true
	})
	if (!Array.isArray(parsedUnknown)) {
		logger.error("csv parse did not return array")
		throw errors.new("invalid csv parse result")
	}
	const out: CsvRowNormalized[] = []
	for (const rec of parsedUnknown) {
		if (!isRecord(rec)) {
			logger.error("invalid csv row object")
			throw errors.new("invalid csv row")
		}
		const setIdRaw = rec["Set ID"]
		const standardIdRaw = rec["Standard ID"]
		const standardDescriptionRaw = rec["Standard Description"]
		const contentKindRaw = rec["Content Kind"]
		const contentTitleRaw = rec["Content Title"]
		const contentUrlRaw = rec["Content URL"]

		if (!isNonEmptyString(setIdRaw) || !isNonEmptyString(standardIdRaw) || !isNonEmptyString(standardDescriptionRaw)) {
			logger.error("csv row missing standard fields", {
				setId: setIdRaw,
				standardId: standardIdRaw,
				standardDescription: standardDescriptionRaw
			})
			throw errors.new("csv row missing standard fields")
		}
		if (!isNonEmptyString(contentKindRaw) || !isNonEmptyString(contentTitleRaw) || !isNonEmptyString(contentUrlRaw)) {
			logger.error("csv row missing content fields", {
				contentKind: contentKindRaw,
				contentTitle: contentTitleRaw,
				contentUrl: contentUrlRaw
			})
			throw errors.new("csv row missing content fields")
		}

		let contentKind: ContentKind
		const kind = contentKindRaw.trim()
		if (kind === "Exercise") contentKind = "Exercise"
		else if (kind === "Video") contentKind = "Video"
		else if (kind === "Article") contentKind = "Article"
		else {
			logger.error("unsupported content kind", { contentKind: kind })
			throw errors.new("unsupported content kind")
		}

		out.push({
			setId: setIdRaw.trim(),
			standardId: standardIdRaw.trim(),
			standardDescription: standardDescriptionRaw.trim(),
			contentKind,
			contentTitle: contentTitleRaw.trim(),
			contentUrl: contentUrlRaw.trim()
		})
	}
	return out
}

function chunkArray<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = []
	for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
	return chunks
}

async function collectFromCsv(
	filePath: string,
	continueOnError: boolean,
	includePathSubstrings: string[]
): Promise<{
	standardsByKey: Map<string, { setId: string; standardId: string; description: string }>
	links: LinkRecordPending[]
	slugsByKind: Record<ContentKind, Set<string>>
}> {
	const standardsByKey = new Map<string, { setId: string; standardId: string; description: string }>()
	const links: LinkRecordPending[] = []
	const seenLinkKey = new Set<string>()
	const slugsByKind: Record<ContentKind, Set<string>> = {
		Exercise: new Set<string>(),
		Video: new Set<string>(),
		Article: new Set<string>()
	}

	const rows = parseCsvFile(filePath)
	for (const row of rows) {
		const { normalizedPath, slug } = normalizeUrlPath(row.contentUrl)
		if (includePathSubstrings.length > 0) {
			const matches = includePathSubstrings.some((substr) => normalizedPath.includes(substr))
			if (!matches) continue
		}

		const standardKey = toStandardKey(row.setId, row.standardId)
		const existing = standardsByKey.get(standardKey)
		if (existing) {
			if (existing.description !== row.standardDescription) {
				const msg = `conflicting standard description for ${standardKey}`
				if (!continueOnError) {
					logger.error("conflicting standard description", {
						standardKey,
						existing: existing.description,
						incoming: row.standardDescription
					})
					throw errors.new(msg)
				}
				logger.error("conflicting standard description", {
					standardKey,
					existing: existing.description,
					incoming: row.standardDescription
				})
			}
		} else {
			standardsByKey.set(standardKey, {
				setId: row.setId,
				standardId: row.standardId,
				description: row.standardDescription
			})
		}

		slugsByKind[row.contentKind].add(slug)

		const linkKey = `${standardKey}|${row.contentKind}|${slug}`
		if (!seenLinkKey.has(linkKey)) {
			links.push({ standardKey, contentKind: row.contentKind, contentSlug: slug, normalizedPath })
			seenLinkKey.add(linkKey)
		}
	}

	return { standardsByKey, links, slugsByKind }
}

async function fetchContentMaps(
	slugsByKind: Record<ContentKind, Set<string>>,
	batchSize: number
): Promise<Record<ContentKind, Map<string, ContentRecord[]>>> {
	const result: Record<ContentKind, Map<string, ContentRecord[]>> = {
		Exercise: new Map<string, ContentRecord[]>(),
		Video: new Map<string, ContentRecord[]>(),
		Article: new Map<string, ContentRecord[]>()
	}

	// Exercises
	const exerciseSlugs = Array.from(slugsByKind.Exercise)
	for (const chunk of chunkArray(exerciseSlugs, batchSize)) {
		if (chunk.length === 0) continue
		const rows = await db
			.select({ id: niceExercises.id, slug: niceExercises.slug, path: niceExercises.path })
			.from(niceExercises)
			.where(inArray(niceExercises.slug, chunk))
		for (const row of rows) {
			const list = result.Exercise.get(row.slug)
			if (list) list.push(row)
			else result.Exercise.set(row.slug, [row])
		}
	}

	// Videos
	const videoSlugs = Array.from(slugsByKind.Video)
	for (const chunk of chunkArray(videoSlugs, batchSize)) {
		if (chunk.length === 0) continue
		const rows = await db
			.select({ id: niceVideos.id, slug: niceVideos.slug, path: niceVideos.path })
			.from(niceVideos)
			.where(inArray(niceVideos.slug, chunk))
		for (const row of rows) {
			const list = result.Video.get(row.slug)
			if (list) list.push(row)
			else result.Video.set(row.slug, [row])
		}
	}

	// Articles
	const articleSlugs = Array.from(slugsByKind.Article)
	for (const chunk of chunkArray(articleSlugs, batchSize)) {
		if (chunk.length === 0) continue
		const rows = await db
			.select({ id: niceArticles.id, slug: niceArticles.slug, path: niceArticles.path })
			.from(niceArticles)
			.where(inArray(niceArticles.slug, chunk))
		for (const row of rows) {
			const list = result.Article.get(row.slug)
			if (list) list.push(row)
			else result.Article.set(row.slug, [row])
		}
	}

	return result
}

async function insertStandards(
	standardsByKey: Map<string, { setId: string; standardId: string; description: string }>,
	dryRun: boolean,
	batchSize: number
): Promise<{ inserted: number; attempted: number }> {
	const standards = Array.from(standardsByKey.entries())
	let inserted = 0
	let attempted = 0

	for (const chunk of chunkArray(standards, batchSize)) {
		const values = chunk.map(([key, s]) => ({
			id: key,
			setId: s.setId,
			standardId: s.standardId,
			standardDescription: s.description
		}))
		attempted += values.length

		if (dryRun) continue

		const result = await db
			.insert(niceCommonCoreStandards)
			.values(values)
			.onConflictDoNothing()
			.returning({ id: niceCommonCoreStandards.id })
		inserted += result.length
	}

	return { inserted, attempted }
}

type MissingIssue = { kind: ContentKind; slug: string; standardKey: string; sampleUrlPath: string }
type DuplicateIssue = {
	kind: ContentKind
	slug: string
	standardKey: string
	candidates: Array<{ id: string; path: string }>
}

async function insertLinks(
	links: LinkRecordPending[],
	contentMaps: Record<ContentKind, Map<string, ContentRecord[]>>,
	continueOnError: boolean,
	dryRun: boolean,
	batchSize: number
): Promise<{
	inserted: number
	attempted: number
	errors: Array<{ link: LinkRecordPending; message: string }>
	missingIssues: MissingIssue[]
	duplicateIssues: DuplicateIssue[]
}> {
	let inserted = 0
	let attempted = 0
	const errorsList: Array<{ link: LinkRecordPending; message: string }> = []
	const missingIssues: MissingIssue[] = []
	const duplicateIssues: DuplicateIssue[] = []

	const pendingValues: Array<{ commonCoreStandardId: string; contentId: string; contentType: ContentKind }> = []

	for (const link of links) {
		const map = contentMaps[link.contentKind]
		const candidates = map.get(link.contentSlug)
		if (!candidates || candidates.length === 0) {
			const message = `content not found by slug for ${link.contentKind}: ${link.contentSlug}`
			missingIssues.push({
				kind: link.contentKind,
				slug: link.contentSlug,
				standardKey: link.standardKey,
				sampleUrlPath: link.normalizedPath
			})
			if (!continueOnError) {
				logger.error("content missing", { kind: link.contentKind, slug: link.contentSlug })
				throw errors.new(message)
			}
			logger.error("content missing", { kind: link.contentKind, slug: link.contentSlug })
			errorsList.push({ link, message })
			continue
		}
		if (candidates.length > 1) {
			const message = `multiple content candidates for ${link.contentKind} slug '${link.contentSlug}'`
			duplicateIssues.push({
				kind: link.contentKind,
				slug: link.contentSlug,
				standardKey: link.standardKey,
				candidates: candidates.map((c) => ({ id: c.id, path: c.path }))
			})
			if (!continueOnError) {
				logger.error("multiple content candidates", {
					kind: link.contentKind,
					slug: link.contentSlug,
					candidates: candidates.map((c) => ({ id: c.id, path: c.path }))
				})
				throw errors.new(message)
			}
			logger.error("multiple content candidates", {
				kind: link.contentKind,
				slug: link.contentSlug,
				candidates: candidates.map((c) => ({ id: c.id, path: c.path }))
			})
			errorsList.push({ link, message })
			continue
		}

		const content = candidates[0]
		if (!content) {
			const message = `no content candidate after pre-check for ${link.contentKind} slug '${link.contentSlug}'`
			if (!continueOnError) {
				logger.error("no candidate after check", { kind: link.contentKind, slug: link.contentSlug })
				throw errors.new(message)
			}
			logger.error("no candidate after check", { kind: link.contentKind, slug: link.contentSlug })
			errorsList.push({ link, message })
			continue
		}

		pendingValues.push({
			commonCoreStandardId: link.standardKey,
			contentId: content.id,
			contentType: link.contentKind
		})
	}

	for (const chunk of chunkArray(pendingValues, batchSize)) {
		attempted += chunk.length
		if (dryRun) continue
		const result = await db
			.insert(niceLessonContentsCommonCoreStandards)
			.values(chunk)
			.onConflictDoNothing()
			.returning({ commonCoreStandardId: niceLessonContentsCommonCoreStandards.commonCoreStandardId })
		inserted += result.length
	}

	return { inserted, attempted, errors: errorsList, missingIssues, duplicateIssues }
}

async function writeReport(
	reportPath: string,
	data: {
		standardsTotal: number
		linksTotal: number
		inserted: number
		attempted: number
		missing: MissingIssue[]
		duplicates: DuplicateIssue[]
	}
) {
	const payload = JSON.stringify(data, null, 2)
	const writeResult = await errors.try(fs.promises.writeFile(reportPath, payload, "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write report", { file: reportPath, error: writeResult.error })
		throw errors.wrap(writeResult.error, "report write")
	}
	logger.info("wrote report", { file: reportPath, missing: data.missing.length, duplicates: data.duplicates.length })
}

async function main() {
	const opts = parseCliArgs()
	logger.info("starting ccss seed", {
		file: opts.filePath,
		dryRun: opts.dryRun,
		continueOnError: opts.continueOnError,
		batchSize: opts.batchSize,
		includePathFilters: opts.includePathSubstrings
	})

	const statResult = await errors.try(fs.promises.stat(opts.filePath))
	if (statResult.error) {
		logger.error("csv file not found", { file: opts.filePath, error: statResult.error })
		throw errors.wrap(statResult.error, "read csv file")
	}

	logger.debug("parsing csv")
	const collectResult = await errors.try(
		collectFromCsv(opts.filePath, opts.continueOnError, opts.includePathSubstrings)
	)
	if (collectResult.error) {
		logger.error("csv parse failed", { error: collectResult.error })
		throw errors.wrap(collectResult.error, "csv parse")
	}
	const { standardsByKey, links, slugsByKind } = collectResult.data

	logger.info("csv parsed", { standards: standardsByKey.size, linkRows: links.length })

	logger.debug("fetching content maps")
	const contentMaps = await fetchContentMaps(slugsByKind, opts.batchSize)

	logger.debug("inserting standards")
	const stdInsert = await insertStandards(standardsByKey, opts.dryRun, opts.batchSize)
	logger.info("standards upserted", { attempted: stdInsert.attempted, inserted: stdInsert.inserted })

	logger.debug("inserting links")
	const linkInsert = await insertLinks(links, contentMaps, opts.continueOnError, opts.dryRun, opts.batchSize)
	logger.info("links upserted", {
		attempted: linkInsert.attempted,
		inserted: linkInsert.inserted,
		errors: linkInsert.errors.length
	})

	if (opts.reportPath) {
		await writeReport(opts.reportPath, {
			standardsTotal: standardsByKey.size,
			linksTotal: links.length,
			inserted: linkInsert.inserted,
			attempted: linkInsert.attempted,
			missing: linkInsert.missingIssues,
			duplicates: linkInsert.duplicateIssues
		})
	}

	if (linkInsert.errors.length > 0) {
		for (const e of linkInsert.errors.slice(0, 10)) {
			logger.error("link error sample", {
				standardKey: e.link.standardKey,
				kind: e.link.contentKind,
				slug: e.link.contentSlug,
				message: e.message
			})
		}
		logger.warn("there were link errors", { total: linkInsert.errors.length })
	}

	logger.info("ccss seed completed", { dryRun: opts.dryRun })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("ccss seed failed", { error: result.error })
	process.exit(1)
}
process.exit(0)
