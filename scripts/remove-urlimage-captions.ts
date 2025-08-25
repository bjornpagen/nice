#!/usr/bin/env bun
/**
 * Remove urlImage Captions from Questions XML
 *
 * Quick script to:
 * 1) find questions whose `structured_json.widgets` contains a `urlImage` widget
 * 2) precisely remove the generated caption <div> for those urlImage widgets from the question XML
 * 3) if --dangerously-upsert is provided, write the updated XML back to Postgres; otherwise dry run
 *
 * Usage:
 *   bun run scripts/remove-urlimage-captions.ts [--dangerously-upsert]
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { and, eq, isNotNull } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas/nice"
import { stripMarkdownToPlaintext } from "@/lib/widgets/utils/text"
import { escapeXmlAttribute, sanitizeXmlAttributeValue } from "@/lib/xml-utils"

type UrlImageWidget = {
	type: "urlImage"
	url: string
	alt: string
	width: number | null
	height: number | null
	caption: string | null | undefined
	attribution?: string | null
}

type StructuredJson = {
	widgets?: Record<string, UrlImageWidget | { type?: string } | undefined> | null
}

function hasProp<K extends PropertyKey>(obj: unknown, prop: K): obj is Record<K, unknown> {
	return typeof obj === "object" && obj !== null && prop in obj
}

function isStructuredJson(value: unknown): value is StructuredJson {
	if (!value || typeof value !== "object") return false
	// widgets may be missing or null; that's acceptable
	return !hasProp(value, "widgets") || value.widgets === null || typeof value.widgets === "object"
}

function isUrlImageWidget(value: unknown): value is UrlImageWidget {
	return typeof value === "object" && value !== null && hasProp(value, "type") && value.type === "urlImage"
}

function hasUrlImage(structured: unknown): boolean {
	if (!isStructuredJson(structured)) return false
	const widgets = structured.widgets
	if (!widgets || typeof widgets !== "object") return false
	for (const value of Object.values(widgets)) {
		if (isUrlImageWidget(value)) {
			return true
		}
	}
	return false
}

// Replicate urlImage generator normalization helpers
function stripWrappingDelimiters(input: string): string {
	let text = input.trim()
	for (;;) {
		let changed = false
		if (text.startsWith("*") && text.endsWith("*") && text.length >= 2) {
			text = text.slice(1, -1).trim()
			changed = true
		}
		if (text.startsWith("[") && text.endsWith("]") && text.length >= 2) {
			text = text.slice(1, -1).trim()
			changed = true
		}
		if (!changed) break
	}
	return text
}

function escapeXmlText(text: string): string {
	return sanitizeXmlAttributeValue(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

const _CONTAINER_STYLE = "display: inline-block; text-align: center;"
const IMG_BASE_STYLE = "display: block;"
const CAPTION_STYLE = "font-size: 0.9em; color: #333; margin-top: 8px;"

function normalizeAlt(alt: string): string {
	const sanitized = stripMarkdownToPlaintext(alt)
	return stripWrappingDelimiters(sanitized)
}

function normalizeCaption(raw: string | null | undefined): string | null {
	if (raw === null || raw === undefined) return null
	if (raw === "null" || raw === "NULL" || raw === "") return null
	const stripped = stripMarkdownToPlaintext(raw)
	if (!stripped) return null
	const normalized = stripWrappingDelimiters(stripped)
	return normalized === "" ? null : normalized
}

function buildImgStyle(width: number | null, height: number | null): string {
	const parts = [IMG_BASE_STYLE]
	if (typeof width === "number" && width > 0) parts.push(`width: ${width}px;`)
	if (typeof height === "number" && height > 0) parts.push(`height: ${height}px;`)
	return parts.join(" ")
}

function buildImgTag(url: string, alt: string, width: number | null, height: number | null): string {
	const style = buildImgStyle(width, height)
	return `<img src="${escapeXmlAttribute(url)}" alt="${escapeXmlAttribute(alt)}" style="${escapeXmlAttribute(style)}" />`
}

function buildCaptionDiv(normalizedCaption: string): string {
	return `<div style="${CAPTION_STYLE}">${escapeXmlText(normalizedCaption)}</div>`
}

function findContainerBounds(xml: string, containerStart: number): { start: number; end: number } | null {
	// containerStart points at the beginning of the opening <div ...>
	let depth = 0
	let i = containerStart
	if (!xml.startsWith("<div", i)) return null
	depth = 1
	i += 4
	while (i < xml.length) {
		const nextOpen = xml.indexOf("<div", i)
		const nextClose = xml.indexOf("</div>", i)
		if (nextClose === -1 && nextOpen === -1) break
		if (nextOpen !== -1 && (nextOpen < nextClose || nextClose === -1)) {
			depth++
			i = nextOpen + 4
			continue
		}
		if (nextClose !== -1) {
			depth--
			i = nextClose + 6
			if (depth === 0) return { start: containerStart, end: i }
		}
	}
	return null
}

function findNearestUrlImageContainerStart(xml: string, beforePos: number): number {
	// Scan backward for '<div' and check style attribute contains both required tokens
	let cursor = beforePos
	while (true) {
		const idx = xml.lastIndexOf("<div", cursor)
		if (idx === -1) return -1
		// Extract the tag slice
		const tagEndGt = xml.indexOf(">", idx)
		if (tagEndGt === -1) return -1
		const tagSlice = xml.slice(idx, tagEndGt + 1)
		// Ignore closing tags (shouldn't match) and ensure it's a start tag
		if (!tagSlice.startsWith("<div")) {
			cursor = idx - 1
			continue
		}
		const styleMatch = tagSlice.match(/style\s*=\s*"([^"]*)"/i)
		if (styleMatch && typeof styleMatch[1] === "string") {
			const styleText = styleMatch[1].replace(/\s+/g, " ").trim()
			const hasDisplay = styleText.includes("display: inline-block")
			const hasCenter = styleText.includes("text-align: center")
			if (hasDisplay && hasCenter) return idx
		}
		cursor = idx - 1
	}
}

function removeCaptionsByStructuredJson(
	xml: string,
	widgets: Record<string, UrlImageWidget | { type?: string } | undefined>
): {
	updatedXml: string
	removedCount: number
	expectedRemovals: number
	failure?: {
		widgetIndex: number
		expectedSnippet: string
		widget: { url: string; alt: string; caption: string; width: number | null; height: number | null }
		presence: {
			hasContainer: boolean
			hasImgExact: boolean
			hasCaptionExact: boolean
			hasCaptionExactNormalized: boolean
			hasCaptionExactRaw: boolean
			idxContainer: number
			containerEnd: number
			idxImg: number
			idxCaption: number
			hasImgWithSrc: boolean
		}
	}
} {
	let working = xml
	let removedCount = 0
	let expectedRemovals = 0

	let widgetIndex = -1
	for (const widget of Object.values(widgets)) {
		widgetIndex++
		if (!isUrlImageWidget(widget)) continue
		const w = widget

		// Compute both normalized and raw caption candidates
		const normalizedCaption = normalizeCaption(w.caption)
		let rawCaptionCandidate: string | null = null
		if (typeof w.caption === "string") {
			const rawTrimmed = w.caption.trim()
			if (rawTrimmed !== "" && rawTrimmed.toLowerCase() !== "null") rawCaptionCandidate = rawTrimmed
		}

		if (!normalizedCaption && !rawCaptionCandidate) continue
		expectedRemovals++

		const normalizedCaptionDiv = normalizedCaption ? buildCaptionDiv(normalizedCaption) : null
		const rawCaptionDiv = rawCaptionCandidate ? buildCaptionDiv(rawCaptionCandidate) : null
		const alt = normalizeAlt(w.alt)
		let combinedCaptionPart = ""
		if (normalizedCaption !== null) {
			combinedCaptionPart = normalizedCaption
		} else if (rawCaptionCandidate !== null) {
			combinedCaptionPart = rawCaptionCandidate
		}
		const combinedSnippet = `${buildImgTag(w.url, alt, w.width, w.height)}${combinedCaptionPart}`

		// Search forward for the caption div that belongs to this widget by verifying preceding img src
		const escapedSrc = `src="${escapeXmlAttribute(w.url)}"`
		let searchFrom = 0
		let found = false
		let idxCaption = -1
		let imgStart = -1
		let usedCaptionDiv = ""
		let containerStart = -1
		let _containerEnd = -1
		while (!found) {
			const idxNorm = normalizedCaptionDiv ? working.indexOf(normalizedCaptionDiv, searchFrom) : -1
			const idxRaw = rawCaptionDiv ? working.indexOf(rawCaptionDiv, searchFrom) : -1
			if (idxNorm === -1 && idxRaw === -1) break
			if (idxNorm !== -1 && (idxRaw === -1 || idxNorm <= idxRaw)) {
				idxCaption = idxNorm
				if (normalizedCaptionDiv === null) {
					logger.error("normalized caption div missing", { idxNorm })
					throw errors.new("invalid caption div state")
				}
				usedCaptionDiv = normalizedCaptionDiv
			} else {
				idxCaption = idxRaw
				if (rawCaptionDiv === null) {
					logger.error("raw caption div missing", { idxRaw })
					throw errors.new("invalid caption div state")
				}
				usedCaptionDiv = rawCaptionDiv
			}
			imgStart = working.lastIndexOf("<img", idxCaption)
			if (imgStart === -1) {
				searchFrom = idxCaption + 1
				continue
			}
			const imgEndSlash = working.indexOf("/>", imgStart)
			const imgEndGt = working.indexOf(">", imgStart)
			const imgEnd = imgEndSlash !== -1 && (imgEndGt === -1 || imgEndSlash < imgEndGt) ? imgEndSlash : imgEndGt
			if (imgEnd === -1 || imgEnd > idxCaption) {
				searchFrom = idxCaption + 1
				continue
			}
			const imgTagSlice = working.slice(imgStart, imgEnd === imgEndSlash ? imgEnd + 2 : imgEnd + 1)
			if (imgTagSlice.indexOf(escapedSrc) === -1) {
				searchFrom = idxCaption + 1
				continue
			}
			// Robust same-container binding: find nearest qualifying container before the <img>
			containerStart = findNearestUrlImageContainerStart(working, imgStart)
			if (containerStart === -1) {
				searchFrom = idxCaption + 1
				continue
			}
			const bounds = findContainerBounds(working, containerStart)
			if (!bounds) {
				searchFrom = idxCaption + 1
				continue
			}
			_containerEnd = bounds.end
			const imgTagEndPos = imgEnd === imgEndSlash ? imgEnd + 2 : imgEnd + 1
			if (
				imgStart < bounds.start ||
				imgTagEndPos > bounds.end ||
				idxCaption < bounds.start ||
				idxCaption + usedCaptionDiv.length > bounds.end
			) {
				searchFrom = idxCaption + 1
				continue
			}
			found = true
		}

		if (!found) {
			const presence = {
				hasContainer: findNearestUrlImageContainerStart(working, working.length) !== -1,
				hasImgExact: working.indexOf(buildImgTag(w.url, alt, w.width, w.height)) !== -1,
				hasCaptionExact:
					(normalizedCaptionDiv ? working.indexOf(normalizedCaptionDiv) !== -1 : false) ||
					(rawCaptionDiv ? working.indexOf(rawCaptionDiv) !== -1 : false),
				hasCaptionExactNormalized: normalizedCaptionDiv ? working.indexOf(normalizedCaptionDiv) !== -1 : false,
				hasCaptionExactRaw: rawCaptionDiv ? working.indexOf(rawCaptionDiv) !== -1 : false,
				idxContainer: findNearestUrlImageContainerStart(working, working.length),
				containerEnd: -1,
				idxImg: -1,
				idxCaption: -1,
				hasImgWithSrc: working.indexOf(escapedSrc) !== -1
			}
			return {
				updatedXml: working,
				removedCount,
				expectedRemovals,
				failure: {
					widgetIndex,
					expectedSnippet: combinedSnippet,
					widget: {
						url: w.url,
						alt,
						caption: combinedCaptionPart,
						width: w.width,
						height: w.height
					},
					presence
				}
			}
		}

		// Remove the found caption div
		working = working.slice(0, idxCaption) + working.slice(idxCaption + usedCaptionDiv.length)
		removedCount++
	}

	return { updatedXml: working, removedCount, expectedRemovals }
}

async function main() {
	const args = process.argv.slice(2)
	const dangerouslyUpsert = args.includes("--dangerously-upsert")
	// Optional: dump a specific target index (1-based) with before/after XML
	let debugDumpIndex: number | null = null
	for (const a of args) {
		if (a.startsWith("-n=")) {
			const n = Number(a.slice(3))
			if (Number.isFinite(n) && n > 0) debugDumpIndex = Math.floor(n)
		}
	}

	logger.info("starting urlImage caption removal", { mode: dangerouslyUpsert ? "upsert" : "dryrun" })

	// Fetch minimal columns; filter to rows with both structured_json and xml present to minimize scanning.
	const queryResult = await errors.try(
		db
			.select({ id: niceQuestions.id, xml: niceQuestions.xml, structuredJson: niceQuestions.structuredJson })
			.from(niceQuestions)
			.where(and(isNotNull(niceQuestions.structuredJson), isNotNull(niceQuestions.xml)))
	)
	if (queryResult.error) {
		logger.error("database query", { error: queryResult.error })
		throw errors.wrap(queryResult.error, "questions select")
	}

	const rows = queryResult.data
	logger.info("fetched candidate questions", { count: rows.length })

	const targets = rows.filter((r) => hasUrlImage(r.structuredJson))
	logger.info("questions with urlImage in structured_json", { count: targets.length })

	let totalRemovedTags = 0
	let updatedRows = 0
	let totalExpectedRemovals = 0
	let processed = 0
	let questionsWithCaption = 0

	for (let i = 0; i < targets.length; i++) {
		const row = targets[i]
		if (!row) continue
		if (!row.xml) continue
		processed++

		let widgets: Record<string, UrlImageWidget | { type?: string } | undefined> = {}
		if (
			isStructuredJson(row.structuredJson) &&
			row.structuredJson.widgets &&
			typeof row.structuredJson.widgets === "object"
		) {
			widgets = row.structuredJson.widgets
		}
		const { updatedXml, removedCount, expectedRemovals, failure } = removeCaptionsByStructuredJson(row.xml, widgets)
		if (expectedRemovals > 0) questionsWithCaption++
		totalExpectedRemovals += expectedRemovals

		if (failure) {
			if (debugDumpIndex && i + 1 === debugDumpIndex) {
				logger.info("debug dump (failure)", { index: i + 1, beforeXml: row.xml, afterXml: row.xml })
			}
			logger.error("caption removal failed for question", {
				index: i + 1,
				total: targets.length,
				questionId: row.id,
				widgetIndex: failure.widgetIndex,
				expectedRemovals,
				removedCount,
				widget: failure.widget,
				presence: failure.presence,
				structuredJson: row.structuredJson,
				fullXml: row.xml
			})
			throw errors.new("urlimage caption removal mismatch")
		}

		if (removedCount > 0) {
			updatedRows++
			totalRemovedTags += removedCount
			logger.debug("caption(s) removed", {
				index: i + 1,
				total: targets.length,
				questionId: row.id,
				removedTags: removedCount,
				expectedRemovals,
				beforeLen: row.xml.length,
				afterLen: updatedXml.length
			})

			if (debugDumpIndex && i + 1 === debugDumpIndex) {
				logger.info("debug dump (success)", { index: i + 1, beforeXml: row.xml, afterXml: updatedXml })
			}

			if (dangerouslyUpsert) {
				const updateResult = await errors.try(
					db
						.update(niceQuestions)
						.set({ xml: updatedXml })
						.where(eq(niceQuestions.id, row.id))
						.returning({ id: niceQuestions.id })
				)
				if (updateResult.error) {
					logger.error("failed to update question xml", { questionId: row.id, error: updateResult.error })
					throw errors.wrap(updateResult.error, "question xml update")
				}
			}
		} else if (debugDumpIndex && i + 1 === debugDumpIndex) {
			logger.info("debug dump (no-change)", {
				index: i + 1,
				total: targets.length,
				questionId: row.id,
				expectedRemovals,
				removedCount,
				beforeXml: row.xml,
				afterXml: row.xml
			})
		}
	}

	logger.info("processing complete", {
		candidates: rows.length,
		withUrlImage: targets.length,
		processed,
		updatedRows,
		questionsWithCaption,
		expectedRemovals: totalExpectedRemovals,
		actualRemovedTags: totalRemovedTags,
		mode: dangerouslyUpsert ? "upsert" : "dryrun"
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
process.exit(0)
