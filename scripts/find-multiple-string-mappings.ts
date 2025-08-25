#!/usr/bin/env bun
/**
 * Multiple String Mapping Detector (XML-based)
 *
 * Scans FINAL QTI XML to find questions where any qti-response-declaration with
 * base-type="string" contains a qti-mapping with MORE THAN ONE <qti-map-entry>.
 *
 * Usage (flags are mutually exclusive):
 *   bun run scripts/find-multiple-string-mappings.ts --invalid         # newline-separated question IDs with issues
 *   bun run scripts/find-multiple-string-mappings.ts --invalid-urls    # newline-separated URLs for those IDs
 */
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { isNotNull } from "drizzle-orm"
import { XMLParser } from "fast-xml-parser"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas/nice"
import { env } from "@/env"

// --- XML helpers ---

function asArray<T>(val: T | T[] | undefined | null): T[] {
	if (val === undefined || val === null) return []
	return Array.isArray(val) ? val : [val]
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}

function getAttr(node: unknown, name: string): string | undefined {
	if (!isRecord(node)) return undefined
	const key = `@_${name}`
	const v = (node as any)[key]
	return typeof v === "string" ? v : undefined
}

// --- Detection ---

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", allowBooleanAttributes: true })

function hasMultipleStringMappings(xml: string): boolean {
	if (typeof xml !== "string" || xml.trim() === "") return false

	const parseResult = errors.trySync(() => xmlParser.parse(xml))
	if (parseResult.error) {
		logger.error("xml parse", { error: parseResult.error })
		// On parse error, skip flagging this item (avoid false positives)
		return false
	}

	const root = parseResult.data
	if (!isRecord(root)) return false
	const item = (root as any)["qti-assessment-item"]
	if (!isRecord(item)) return false

	const declarations = asArray((item as any)["qti-response-declaration"]) as Array<Record<string, unknown>>
	for (const decl of declarations) {
		if (!isRecord(decl)) continue
		const baseType = getAttr(decl, "base-type") || ""
		if (baseType !== "string") continue

		const mapping = (decl as any)["qti-mapping"]
		if (!mapping || !isRecord(mapping)) continue
		const entries = asArray((mapping as any)["qti-map-entry"]) as Array<Record<string, unknown>>
		if (entries.length > 1) return true
	}

	return false
}

// --- Data access ---

async function fetchQuestions(): Promise<Array<{ id: string; xml: string | null }>> {
	const selResult = await errors.try(
		db
			.select({
				id: niceQuestions.id,
				xml: niceQuestions.xml
			})
			.from(niceQuestions)
			.where(isNotNull(niceQuestions.xml))
	)
	if (selResult.error) {
		logger.error("query execution", { error: selResult.error })
		throw errors.wrap(selResult.error, "query execution")
	}
	return selResult.data as Array<{ id: string; xml: string | null }>
}

// --- CLI ---

async function main() {
	const args = process.argv.slice(2)
	const outputInvalidIds = args.includes("--invalid")
	const outputInvalidUrls = args.includes("--invalid-urls")
	const active = [outputInvalidIds, outputInvalidUrls].filter(Boolean)

	if (active.length !== 1) {
		process.stderr.write("Error: specify exactly one of --invalid or --invalid-urls\n")
		process.exit(1)
	}

	// Suppress logs to keep stdout clean in output modes
	logger.setDefaultLogLevel(logger.ERROR + 1)

	const rows = await fetchQuestions()
	const invalidIds: string[] = []
	for (const row of rows) {
		if (!row.xml) continue
		if (hasMultipleStringMappings(row.xml)) invalidIds.push(row.id)
	}

	if (outputInvalidIds) {
		for (const id of invalidIds) process.stdout.write(`${id}\n`)
		return
	}

	if (outputInvalidUrls) {
		for (const id of invalidIds) {
			const url = `${env.NEXT_PUBLIC_QTI_ASSESSMENT_ITEM_PLAYER_URL}/nice_${id}`
			process.stdout.write(`${url}\n`)
		}
		return
	}
}

// Execute
const result = await errors.try(main())
if (result.error) {
	logger.error("fatal script error", { error: result.error })
	process.exit(1)
}

process.exit(0)
