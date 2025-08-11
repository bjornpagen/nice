#!/usr/bin/env bun

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, asc, eq, isNotNull, isNull, or, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { niceArticles } from "@/db/schemas/nice"

interface MarkerCounters {
	totalScanned: number
	hasWidgetPlaceholder: number
	hasGraphieUrl: number
	hasMarkdownImage: number
	missingContentField: number
	examplesWidget: string[]
	examplesGraphie: string[]
	examplesMarkdownImg: string[]
}

const PerseusArticleSchema = z.object({ content: z.string().min(1) })

function extractArticleContent(perseus: unknown): { ok: true; content: string } | { ok: false } {
	const parsed = PerseusArticleSchema.safeParse(perseus)
	if (!parsed.success) return { ok: false }
	return { ok: true, content: parsed.data.content }
}

function scanMarkersDeep(value: unknown): {
	widget: boolean
	graphie: boolean
	mdImage: boolean
	foundWidgetStr?: string
	foundGraphieStr?: string
	foundMdImageStr?: string
} {
	let widget = false
	let graphie = false
	let mdImage = false
	let foundWidgetStr: string | undefined
	let foundGraphieStr: string | undefined
	let foundMdImageStr: string | undefined

	const mdImageRegex = /!\[[^\]]*\]\([^)]+\)/

	function visit(node: unknown) {
		if (widget && graphie && mdImage) return
		if (typeof node === "string") {
			if (!widget && node.includes("[[☃")) {
				widget = true
				foundWidgetStr = node.slice(0, 200)
			}
			if (!graphie && (node.includes("web+graphie://") || node.includes("ka-perseus-graphie"))) {
				graphie = true
				foundGraphieStr = node.slice(0, 200)
			}
			if (!mdImage && mdImageRegex.test(node)) {
				mdImage = true
				foundMdImageStr = node.slice(0, 200)
			}
			return
		}
		if (Array.isArray(node)) {
			for (let i = 0; i < node.length; i++) visit(node[i])
			return
		}
		if (isRecord(node)) {
			for (const k of Object.keys(node)) {
				if (!Object.prototype.propertyIsEnumerable.call(node, k)) continue
				visit(node[k])
			}
		}
	}

	visit(value)
	return { widget, graphie, mdImage, foundWidgetStr, foundGraphieStr, foundMdImageStr }
}

async function scanArticlesMarkers(limit: number): Promise<MarkerCounters> {
	const counters: MarkerCounters = {
		totalScanned: 0,
		hasWidgetPlaceholder: 0,
		hasGraphieUrl: 0,
		hasMarkdownImage: 0,
		missingContentField: 0,
		examplesWidget: [],
		examplesGraphie: [],
		examplesMarkdownImg: []
	}

	const batchSize = 500
	let offset = 0

	// determine total to scan
	let remaining: number | null = null
	if (limit > 0) remaining = limit

	// loop in batches until limit satisfied or rows exhausted
	// note: we sort by id for stable pagination
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const take = remaining !== null ? Math.min(batchSize, remaining) : batchSize

		const batchResult = await errors.try(
			db
				.select({
					id: niceArticles.id,
					title: niceArticles.title,
					slug: niceArticles.slug,
					path: niceArticles.path,
					xml: niceArticles.xml,
					perseusContent: niceArticles.perseusContent
				})
				.from(niceArticles)
				.orderBy(asc(niceArticles.id))
				.limit(take)
				.offset(offset)
		)
		if (batchResult.error) {
			logger.error("failed to fetch articles batch", { error: batchResult.error, offset, take })
			throw errors.wrap(batchResult.error, "articles batch query")
		}

		const rows = batchResult.data
		if (!Array.isArray(rows) || rows.length === 0) break

		for (const row of rows) {
			counters.totalScanned++

			const content = extractArticleContent(row.perseusContent)
			if (!content.ok) {
				counters.missingContentField++
				// deep scan across entire perseus object for markers
				const deep = scanMarkersDeep(row.perseusContent)
				if (deep.widget) {
					counters.hasWidgetPlaceholder++
					if (counters.examplesWidget.length < 5) counters.examplesWidget.push(row.id)
				}
				if (deep.graphie) {
					counters.hasGraphieUrl++
					if (counters.examplesGraphie.length < 5) counters.examplesGraphie.push(row.id)
				}
				if (deep.mdImage) {
					counters.hasMarkdownImage++
					if (counters.examplesMarkdownImg.length < 5) counters.examplesMarkdownImg.push(row.id)
				}
				continue
			}

			const text = content.content

			if (text.includes("[[☃")) {
				counters.hasWidgetPlaceholder++
				if (counters.examplesWidget.length < 5) counters.examplesWidget.push(row.id)
			}

			// detect graphie-style assets and custom protocols
			if (text.includes("web+graphie://") || text.includes("ka-perseus-graphie")) {
				counters.hasGraphieUrl++
				if (counters.examplesGraphie.length < 5) counters.examplesGraphie.push(row.id)
			}

			// rough markdown image detection
			if (/!\[[^\]]*\]\([^)]+\)/.test(text)) {
				counters.hasMarkdownImage++
				if (counters.examplesMarkdownImg.length < 5) counters.examplesMarkdownImg.push(row.id)
			}
		}

		offset += rows.length
		if (remaining !== null) {
			remaining -= rows.length
			if (remaining <= 0) break
		}
	}

	return counters
}

interface ShapeStats {
	scanned: number
	contentStringCount: number
	topKeyCombos: Array<{ keys: string; count: number; exampleIds: string[] }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function summarizeTopLevelKeys(obj: unknown): string {
	if (!isRecord(obj)) return "<non-object>"
	const keys = Object.keys(obj).filter((k) => Object.prototype.propertyIsEnumerable.call(obj, k))
	keys.sort()
	return keys.join(",")
}

// intentionally omitted: detailed per-key type summary (kept minimal to avoid large output)

async function scanPerseusShapes(limit: number): Promise<ShapeStats> {
	const statsMap = new Map<string, { count: number; exampleIds: string[] }>()
	let scanned = 0
	let contentStringCount = 0

	const batchSize = 300
	let offset = 0
	let remaining: number | null = limit > 0 ? limit : null

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const take = remaining !== null ? Math.min(batchSize, remaining) : batchSize
		const res = await errors.try(
			db
				.select({ id: niceArticles.id, perseusContent: niceArticles.perseusContent })
				.from(niceArticles)
				.orderBy(asc(niceArticles.id))
				.limit(take)
				.offset(offset)
		)
		if (res.error) {
			logger.error("failed to fetch articles for shape scan", { error: res.error, offset, take })
			throw errors.wrap(res.error, "articles shape query")
		}
		const rows = res.data
		if (!Array.isArray(rows) || rows.length === 0) break

		for (const r of rows) {
			scanned++
			const val = r.perseusContent
			const combo = summarizeTopLevelKeys(val)
			const entry = statsMap.get(combo)
			if (entry) {
				entry.count++
				if (entry.exampleIds.length < 3) entry.exampleIds.push(r.id)
			} else {
				statsMap.set(combo, { count: 1, exampleIds: [r.id] })
			}

			// direct top-level content field presence
			if (isRecord(val) && Object.prototype.propertyIsEnumerable.call(val, "content")) {
				const c = val.content
				if (typeof c === "string" && c.length > 0) contentStringCount++
			}
		}

		offset += rows.length
		if (remaining !== null) {
			remaining -= rows.length
			if (remaining <= 0) break
		}
	}

	const topKeyCombos = Array.from(statsMap.entries())
		.sort(([, a], [, b]) => b.count - a.count)
		.slice(0, 10)
		.map(([keys, v]) => ({ keys, count: v.count, exampleIds: v.exampleIds }))

	return { scanned, contentStringCount, topKeyCombos }
}

async function main() {
	logger.info("starting articles diagnostics")

	// optional CLI flags: --limit N, --sample N
	const args = process.argv.slice(2)
	let scanLimit = 0
	let sampleSize = 20

	for (let i = 0; i < args.length; i++) {
		const a = args[i]
		if (a === "--limit") {
			const n = Number(args[i + 1])
			if (Number.isFinite(n) && n >= 0) scanLimit = n
			i++
			continue
		}
		if (a === "--sample") {
			const n = Number(args[i + 1])
			if (Number.isFinite(n) && n > 0) sampleSize = n
			i++
		}
	}

	// totals
	const totalRes = await errors.try(db.select({ count: sql<number>`cast(count(*) as int)` }).from(niceArticles))
	if (totalRes.error) {
		logger.error("failed to count articles", { error: totalRes.error })
		throw errors.wrap(totalRes.error, "articles count")
	}
	const total = totalRes.data[0]?.count ?? 0

	const withXmlRes = await errors.try(
		db.select({ count: sql<number>`cast(count(*) as int)` }).from(niceArticles).where(isNotNull(niceArticles.xml))
	)
	if (withXmlRes.error) {
		logger.error("failed to count articles with xml", { error: withXmlRes.error })
		throw errors.wrap(withXmlRes.error, "articles with xml count")
	}
	const withXml = withXmlRes.data[0]?.count ?? 0

	const emptyXmlRes = await errors.try(
		db.select({ count: sql<number>`cast(count(*) as int)` }).from(niceArticles).where(eq(niceArticles.xml, ""))
	)
	if (emptyXmlRes.error) {
		logger.error("failed to count articles with empty xml", { error: emptyXmlRes.error })
		throw errors.wrap(emptyXmlRes.error, "articles empty xml count")
	}
	const emptyXml = emptyXmlRes.data[0]?.count ?? 0

	const nullXmlRes = await errors.try(
		db.select({ count: sql<number>`cast(count(*) as int)` }).from(niceArticles).where(isNull(niceArticles.xml))
	)
	if (nullXmlRes.error) {
		logger.error("failed to count articles with null xml", { error: nullXmlRes.error })
		throw errors.wrap(nullXmlRes.error, "articles null xml count")
	}
	const nullXml = nullXmlRes.data[0]?.count ?? 0

	logger.info("article counts", {
		total,
		withXml,
		nullXml,
		emptyXml,
		withoutXml: nullXml + emptyXml
	})

	// sample listings
	if (sampleSize > 0) {
		const missingSampleRes = await errors.try(
			db
				.select({ id: niceArticles.id, slug: niceArticles.slug, title: niceArticles.title, path: niceArticles.path })
				.from(niceArticles)
				.where(or(isNull(niceArticles.xml), eq(niceArticles.xml, "")))
				.orderBy(asc(niceArticles.id))
				.limit(sampleSize)
		)
		if (missingSampleRes.error) {
			logger.error("failed to query missing-xml sample", { error: missingSampleRes.error })
			throw errors.wrap(missingSampleRes.error, "missing xml sample query")
		}
		logger.info("sample: articles missing xml", { count: missingSampleRes.data.length, rows: missingSampleRes.data })

		const withSampleRes = await errors.try(
			db
				.select({ id: niceArticles.id, slug: niceArticles.slug, title: niceArticles.title, path: niceArticles.path })
				.from(niceArticles)
				.where(isNotNull(niceArticles.xml))
				.orderBy(asc(niceArticles.id))
				.limit(sampleSize)
		)
		if (withSampleRes.error) {
			logger.error("failed to query with-xml sample", { error: withSampleRes.error })
			throw errors.wrap(withSampleRes.error, "with xml sample query")
		}
		logger.info("sample: articles with xml", { count: withSampleRes.data.length, rows: withSampleRes.data })
	}

	// marker scan across perseus content
	logger.info("scanning perseus content markers", { limit: scanLimit })
	const counters = await scanArticlesMarkers(scanLimit)

	logger.info("marker scan summary", {
		scanned: counters.totalScanned,
		missingContentField: counters.missingContentField,
		hasWidgetPlaceholder: counters.hasWidgetPlaceholder,
		hasGraphieUrl: counters.hasGraphieUrl,
		hasMarkdownImage: counters.hasMarkdownImage,
		examplesWidget: counters.examplesWidget,
		examplesGraphie: counters.examplesGraphie,
		examplesMarkdownImg: counters.examplesMarkdownImg
	})

	// shape scan for perseus content to validate detection strategy
	logger.info("scanning perseus content shapes", { limit: Math.max(500, scanLimit || 0) })
	const shapes = await scanPerseusShapes(scanLimit || 2000)
	logger.info("perseus shapes summary", {
		scanned: shapes.scanned,
		contentStringAtTopLevel: shapes.contentStringCount,
		topKeyCombos: shapes.topKeyCombos
	})

	// quick xml length stats on stored xmls
	const xmlRowsRes = await errors.try(
		db
			.select({ id: niceArticles.id, xml: niceArticles.xml })
			.from(niceArticles)
			.where(and(isNotNull(niceArticles.xml), or(eq(niceArticles.xml, niceArticles.xml))))
	)
	if (xmlRowsRes.error) {
		logger.error("failed to fetch xml rows for length stats", { error: xmlRowsRes.error })
		throw errors.wrap(xmlRowsRes.error, "xml rows fetch")
	}

	let minLen = Number.POSITIVE_INFINITY
	let maxLen = 0
	let sumLen = 0
	let count = 0
	for (const r of xmlRowsRes.data) {
		if (typeof r.xml !== "string") continue
		const len = r.xml.length
		if (len < minLen) minLen = len
		if (len > maxLen) maxLen = len
		sumLen += len
		count++
	}
	const avgLen = count > 0 ? Math.round(sumLen / count) : 0
	logger.info("stored xml length stats", { count, minLen: Number.isFinite(minLen) ? minLen : 0, maxLen, avgLen })

	logger.info("articles diagnostics complete")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("articles diagnostics failed", { error: result.error })
	process.exit(1)
}

process.exit(0)
