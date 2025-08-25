#!/usr/bin/env bun
import * as readline from "node:readline/promises"
/**
 * Dropdown Identifier Validator (XML-based)
 *
 * Scans FINAL QTI XML (not structuredJson) to find ONLY invalid dropdowns and mapping issues:
 * - inline-choice identifier attributes that do not match SAFE_IDENTIFIER_REGEX
 * - qti-response-declaration correct values that do not match SAFE_IDENTIFIER_REGEX
 * - missing qti-response-declaration for each inline-choice-interaction response-identifier
 * - qti-response-processing qti-match variable/correct identifiers that do not match SAFE_IDENTIFIER_REGEX
 *
 * Usage (flags are mutually exclusive):
 *   bun run scripts/find-delete-dropdowns.ts --invalid         # newline-separated question IDs with issues
 *   bun run scripts/find-delete-dropdowns.ts --invalid-urls    # newline-separated URLs for those IDs
 *   bun run scripts/find-delete-dropdowns.ts --invalid-report  # JSON report of issues per question
 *   bun run scripts/find-delete-dropdowns.ts --invalid-delete  # Delete xml and structuredJson for invalid questions
 */
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { inArray, isNotNull } from "drizzle-orm"
import { XMLParser } from "fast-xml-parser"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas/nice"
import { env } from "@/env"
import { SAFE_IDENTIFIER_REGEX } from "@/lib/qti-generation/qti-constants"

// --- Types ---

type IssueKind =
	| "choiceIdentifier"
	| "correctIdentifier"
	| "missingDeclaration"
	| "duplicateChoiceIdentifier"
	| "correctNotInChoices"
	| "dropdownMatchMissing"
	| "dropdownMatchMismatched"
	| "dropdownBaseType"
	| "singleCardinalityMultipleCorrect"

interface Issue {
	kind: IssueKind
	responseIdentifier: string
	value?: string
	path: string
}

interface QuestionIssues {
	id: string
	issues: Issue[]
}

// --- XML Helpers ---

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

function getText(node: unknown): string {
	if (typeof node === "string") return node
	if (!isRecord(node)) return ""
	const t = (node as any)["#text"]
	return typeof t === "string" ? t : ""
}

// --- Validator (XML) ---

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", allowBooleanAttributes: true })

function validateXml(xml: string): Issue[] {
	const issues: Issue[] = []
	if (typeof xml !== "string" || xml.trim() === "") return issues

	const parseResult = errors.trySync(() => xmlParser.parse(xml))
	if (parseResult.error) {
		logger.error("xml parse", { error: parseResult.error })
		// On parse error, we cannot validate further; return no issues for this item
		return issues
	}
	const root = parseResult.data
	if (!isRecord(root)) return issues

	const item = (root as any)["qti-assessment-item"]
	if (!isRecord(item)) return issues

	// First collect declaration identifiers (for missingDeclaration checks)
	const declIdSet = new Set<string>()
	const declarations = asArray((item as any)["qti-response-declaration"]) as Array<Record<string, unknown>>
	for (const decl of declarations) {
		if (!isRecord(decl)) continue
		const rid = getAttr(decl, "identifier")
		if (rid) declIdSet.add(rid)
	}

	// Validate inline choice interactions and choice identifiers; collect used response ids and choice sets
	const itemBody = (item as any)["qti-item-body"]
	const choiceSetByRespId = new Map<string, Set<string>>()
	const choiceTextSetByRespId = new Map<string, Set<string>>()
	const usedRespIdSet = new Set<string>()
	const visitNode = (node: unknown) => {
		if (!isRecord(node)) return
		for (const [key, val] of Object.entries(node)) {
			if (key === "qti-inline-choice-interaction") {
				const interactions = asArray(val as any)
				for (let idx = 0; idx < interactions.length; idx++) {
					const inter = interactions[idx]
					if (!isRecord(inter)) continue
					const respId = getAttr(inter, "response-identifier") || ""
					if (respId) usedRespIdSet.add(respId)
					// Missing declaration check (only for dropdowns)
					if (respId && !declIdSet.has(respId)) {
						issues.push({
							kind: "missingDeclaration",
							responseIdentifier: respId,
							path: `qti-inline-choice-interaction[${idx}][response-identifier=${respId}]`
						})
					}
					// Choice identifiers and texts
					const choices = asArray((inter as any)["qti-inline-choice"]) as Array<Record<string, unknown>>
					const seen = new Set<string>()
					for (let c = 0; c < choices.length; c++) {
						const ch = choices[c]
						const ident = getAttr(ch, "identifier") || ""
						if (!SAFE_IDENTIFIER_REGEX.test(ident)) {
							issues.push({
								kind: "choiceIdentifier",
								responseIdentifier: respId,
								value: ident,
								path: `qti-inline-choice-interaction[${idx}].qti-inline-choice[${c}][identifier=${ident}]`
							})
						}
						if (seen.has(ident)) {
							issues.push({
								kind: "duplicateChoiceIdentifier",
								responseIdentifier: respId,
								value: ident,
								path: `qti-inline-choice-interaction[${idx}].qti-inline-choice[${c}][identifier=${ident}]`
							})
						}
						seen.add(ident)
						if (respId) {
							const idSet = choiceSetByRespId.get(respId) ?? new Set<string>()
							idSet.add(ident)
							choiceSetByRespId.set(respId, idSet)
							const txt = getText(ch).trim()
							if (txt !== "") {
								const textSet = choiceTextSetByRespId.get(respId) ?? new Set<string>()
								textSet.add(txt)
								choiceTextSetByRespId.set(respId, textSet)
							}
						}
					}
				}
			} else if (isRecord(val)) {
				visitNode(val)
			} else if (Array.isArray(val)) {
				for (const child of val) visitNode(child)
			}
		}
	}
	visitNode(itemBody)

	// Now validate declarations ONLY for identifiers used by dropdowns
	const declCorrectById = new Map<string, string[]>()
	for (const decl of declarations) {
		if (!isRecord(decl)) continue
		const rid = getAttr(decl, "identifier")
		if (!rid || !usedRespIdSet.has(rid)) continue
		const baseType = getAttr(decl, "base-type") || ""
		if (baseType !== "identifier") {
			issues.push({
				kind: "dropdownBaseType",
				responseIdentifier: rid,
				value: baseType,
				path: `qti-response-declaration[${rid}][base-type=${baseType}]`
			})
			// Skip further checks for non-identifier base types
			continue
		}
		if (baseType === "identifier") {
			const correctResp = (decl as any)["qti-correct-response"]
			if (!isRecord(correctResp)) continue
			const values = asArray((correctResp as any)["qti-value"]) as Array<string | Record<string, unknown>>
			// Cardinality check: single must not have multiple correct values
			const cardinality = getAttr(decl, "cardinality") || ""
			if (cardinality === "single" && values.length > 1) {
				issues.push({
					kind: "singleCardinalityMultipleCorrect",
					responseIdentifier: rid,
					path: `qti-response-declaration[${rid}].qti-correct-response`
				})
			}
			const corr: string[] = []
			for (let i = 0; i < values.length; i++) {
				const v = values[i]
				const str = typeof v === "string" ? v : undefined
				if (typeof str === "string" && !SAFE_IDENTIFIER_REGEX.test(str)) {
					issues.push({
						kind: "correctIdentifier",
						responseIdentifier: rid,
						value: str,
						path: `qti-response-declaration[${rid}].qti-correct-response.qti-value[${i}]`
					})
				}
				if (typeof str === "string") corr.push(str)
			}
			declCorrectById.set(rid, corr)
		}
	}

	// Ensure each correct value exists among the gathered choices for its responseIdentifier (identifier base-type)
	for (const [rid, corrects] of declCorrectById.entries()) {
		const set = choiceSetByRespId.get(rid)
		if (!set) continue
		for (let i = 0; i < corrects.length; i++) {
			const v = corrects[i]
			if (typeof v !== "string" || !set.has(v)) {
				issues.push({
					kind: "correctNotInChoices",
					responseIdentifier: rid,
					value: v,
					path: `qti-response-declaration[${rid}].qti-correct-response.qti-value[${i}]`
				})
			}
		}
	}

	// Dropdown-only response-processing sanity check: verify qti-match/qti-map-response reference dropdown response ids
	const responseProcessing = (item as any)["qti-response-processing"]
	const matchPairs: Array<{ variableId: string; correctId: string }> = []
	const mapResponseIds = new Set<string>()
	const visitProcessing = (node: unknown) => {
		if (!isRecord(node)) return
		for (const [key, val] of Object.entries(node)) {
			if (key === "qti-match") {
				const matches = asArray(val as any)
				for (const match of matches) {
					if (!isRecord(match)) continue
					const variable = (match as any)["qti-variable"]
					const correct = (match as any)["qti-correct"]
					const varId = isRecord(variable) ? getAttr(variable, "identifier") || "" : ""
					const corId = isRecord(correct) ? getAttr(correct, "identifier") || "" : ""
					matchPairs.push({ variableId: varId, correctId: corId })
				}
			} else if (key === "qti-map-response") {
				const maps = asArray(val as any)
				for (const mr of maps) {
					if (!isRecord(mr)) continue
					const id = getAttr(mr, "identifier") || ""
					if (id) mapResponseIds.add(id)
				}
			} else if (isRecord(val)) {
				visitProcessing(val)
			} else if (Array.isArray(val)) {
				for (const child of val) visitProcessing(child)
			}
		}
	}
	visitProcessing(responseProcessing)

	for (const rid of usedRespIdSet) {
		const okPair = matchPairs.some((p) => p.variableId === rid && p.correctId === rid)
		if (okPair || mapResponseIds.has(rid)) continue
		const varOnly = matchPairs.find((p) => p.variableId === rid && p.correctId !== rid)
		const corOnly = matchPairs.find((p) => p.correctId === rid && p.variableId !== rid)
		if (varOnly || corOnly) {
			const wrong = varOnly ? varOnly.correctId : corOnly ? corOnly.variableId : ""
			issues.push({
				kind: "dropdownMatchMismatched",
				responseIdentifier: rid,
				value: wrong,
				path: "qti-response-processing.qti-match"
			})
			continue
		}
		issues.push({
			kind: "dropdownMatchMissing",
			responseIdentifier: rid,
			path: "qti-response-processing"
		})
	}

	return issues
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
	const outputInvalidReport = args.includes("--invalid-report")
	const outputInvalidDelete = args.includes("--invalid-delete")
	const active = [outputInvalidIds, outputInvalidUrls, outputInvalidReport, outputInvalidDelete].filter(Boolean)

	if (active.length !== 1) {
		process.stderr.write(
			"Error: specify exactly one of --invalid, --invalid-urls, --invalid-report, or --invalid-delete\n"
		)
		process.exit(1)
	}

	// Suppress logs to keep stdout clean in output modes
	logger.setDefaultLogLevel(logger.ERROR + 1)

	const rows = await fetchQuestions()
	const results: QuestionIssues[] = []
	for (const row of rows) {
		if (!row.xml) continue
		const issues = validateXml(row.xml)
		if (issues.length > 0) {
			results.push({ id: row.id, issues })
		}
	}

	if (outputInvalidIds) {
		for (const r of results) process.stdout.write(`${r.id}\n`)
		return
	}

	if (outputInvalidUrls) {
		for (const r of results) {
			const url = `${env.NEXT_PUBLIC_QTI_ASSESSMENT_ITEM_PLAYER_URL}/nice_${r.id}`
			process.stdout.write(`${url}\n`)
		}
		return
	}

	if (outputInvalidReport) {
		const report = results.map((r) => ({ id: r.id, issueCount: r.issues.length, issues: r.issues }))
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
		return
	}

	if (outputInvalidDelete) {
		// Re-enable logging for interactive mode
		logger.setDefaultLogLevel(logger.INFO)

		const invalidIds = results.map((r) => r.id)
		const totalQuestions = rows.length
		const invalidCount = invalidIds.length
		const percentage = ((invalidCount / totalQuestions) * 100).toFixed(2)

		// Show analytics
		logger.info("invalid dropdown questions found", {
			total: totalQuestions,
			invalid: invalidCount,
			percentage: `${percentage}%`
		})

		if (invalidCount === 0) {
			logger.info("no invalid questions to delete")
			return
		}

		// Show confirmation prompt
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		})

		const confirmResult = await errors.try(
			rl.question(
				`\nThis will clear the xml and structuredJson columns for ${invalidCount} questions.\n` +
					"Are you sure you want to proceed? (yes/no): "
			)
		)
		rl.close()

		if (confirmResult.error) {
			logger.error("failed to read user input", { error: confirmResult.error })
			throw errors.wrap(confirmResult.error, "user input")
		}

		const answer = confirmResult.data.toLowerCase().trim()
		if (answer !== "yes" && answer !== "y") {
			logger.info("operation cancelled")
			return
		}

		// Perform the deletion
		logger.info("clearing xml and structuredJson for invalid questions", { count: invalidCount })

		const updateResult = await errors.try(
			db
				.update(niceQuestions)
				.set({
					xml: null,
					structuredJson: null
				})
				.where(inArray(niceQuestions.id, invalidIds))
		)

		if (updateResult.error) {
			logger.error("failed to update questions", { error: updateResult.error })
			throw errors.wrap(updateResult.error, "database update")
		}

		logger.info("successfully cleared data for invalid questions", { count: invalidCount })
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
