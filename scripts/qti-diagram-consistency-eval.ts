#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"
import { env } from "@/env"
import { getAllCoursesBySlug, getComponentResourcesForCourse, getResourcesByIds } from "@/lib/data/fetchers/oneroster"
import { getAssessmentItems, getAssessmentTest } from "@/lib/data/fetchers/qti"
import { parseAssessmentTestXml } from "@/lib/qti-resolution"

// Set debug logging for comprehensive observability
logger.setDefaultLogLevel(logger.DEBUG)

// --- Configuration ---
const OPENAI_MODEL = "gpt-5"
const MAX_CONCURRENT_LLM_CALLS = 100
const MAX_RETRIES = 3

// --- Retry Helper ---

async function retryOperation<T>(
	operation: () => Promise<T>,
	context: string,
	maxRetries: number | "infinite" = "infinite"
): Promise<T> {
	let lastError: Error | null = null
	let attempt = 0

	while (true) {
		attempt++
		const result = await errors.try(operation())
		if (!result.error) {
			if (attempt > 1) {
				logger.info("operation succeeded after retries", {
					context,
					attemptsTaken: attempt
				})
			}
			return result.data
		}

		lastError = result.error

		// Check if we should stop retrying
		if (maxRetries !== "infinite" && attempt >= maxRetries) {
			logger.error("operation failed after all retries", {
				context,
				maxRetries,
				error: lastError
			})
			if (!lastError) {
				logger.error("operation failed without error details", { context })
				throw errors.new(`${context}: operation failed without error details`)
			}
			logger.error("operation failed after retries", { context, maxRetries, error: lastError })
			throw errors.wrap(lastError, `${context}: failed after ${maxRetries} retries`)
		}

		// Calculate backoff with a cap
		const baseBackoffMs = 1000
		const maxBackoffMs = 300000 // 5 minutes max
		const backoffMs = Math.min(baseBackoffMs * 2 ** Math.min(attempt - 1, 10), maxBackoffMs)

		logger.warn("operation failed, will retry indefinitely", {
			context,
			attempt,
			nextRetryInMs: backoffMs,
			error: lastError
		})

		await new Promise((resolve) => setTimeout(resolve, backoffMs))
	}
}

// --- Help Text ---
const HELP_TEXT = `
QTI Diagram vs. Explanation Consistency Evaluation Script

USAGE:
  bun scripts/qti-diagram-consistency-eval.ts <course>
  bun scripts/qti-diagram-consistency-eval.ts --review <course>
  bun scripts/qti-diagram-consistency-eval.ts --help

ARGUMENTS:
  <course>    OneRoster course sourcedId (WITH the 'nice_' prefix) or course slug
              
              Examples:
                - nice_6_science           (OneRoster sourcedId - preferred)
                - 6th-grade-science        (course slug - will be resolved via OneRoster)

  --review    Review mode. Reads the existing outputs for <course> from
              data/qti-feedback-inconsistency-analysis/<course>/ and prints a
              concise list plus the JSON for only the inconsistent (failing)
              items. Does not run any network calls or evaluations.

DESCRIPTION:
  This script evaluates QTI assessment items for consistency between embedded
  SVG diagrams and textual feedback/explanations. It:
  
  1. Fetches all QTI tests for the specified course from Timeback (OneRoster API)
  2. Parses test XML to extract all referenced assessment item IDs
  3. Fetches all unique assessment items (QTI API)
  4. Extracts and caches inline SVG diagrams (both data URIs and inline <svg> blocks)
  5. Uses GPT-5 to evaluate consistency between diagrams and text
  6. Generates a report filtered to inconsistent items only

OUTPUT:
  All outputs are written to: data/qti-feedback-inconsistency-analysis/<courseId>/
  
  - tests.json                    All test manifests with item IDs
  - items/xml/<itemId>.xml        Per-item raw QTI XML
  - items/index.json              Item manifest with SVG hashes
  - evals/<itemId>.json           Per-item evaluation results
  - inconsistency-report.json     Filtered report (consistent === false only)
  - errors.json                   Items that failed evaluation (if any)
  
  SVG cache (deduplicated): data/qti-feedback-inconsistency-analysis/svg-cache/

NOTES:
  - No database access: all data fetched via OneRoster and QTI APIs
  - Report-only: no uploads or modifications to upstream data
  - Fails fast on errors with structured logging
  - Concurrency limit: ${MAX_CONCURRENT_LLM_CALLS} concurrent LLM calls
  - Retry logic: ${MAX_RETRIES} attempts with exponential backoff

EXAMPLES:
  bun scripts/qti-diagram-consistency-eval.ts nice_6_science
  bun scripts/qti-diagram-consistency-eval.ts 6th-grade-science
  bun scripts/qti-diagram-consistency-eval.ts --review nice_6_science
`

// --- Type Definitions and Schemas ---

const EvaluationResultSchema = z.object({
	itemId: z.string(),
	consistent: z.boolean().describe("A binary flag indicating if the diagram and text are consistent."),
	explanation: z
		.string()
		.describe("A comprehensive, free-text rationale explaining the reasoning behind the consistency verdict."),
	affectedInteractionIds: z
		.array(z.string())
		.describe("An array of QTI interaction response-identifiers implicated by the inconsistency.")
})

type EvaluationResult = z.infer<typeof EvaluationResultSchema>

interface EvaluationInput {
	itemId: string
	rawXml: string
	svgContents: string[]
}

interface ItemEvaluationError {
	itemId: string
	error: string
}

// --- OpenAI Client Initialization ---
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

// --- SVG Extraction Helper ---

/**
 * Extracts and decodes inline SVG strings from both data URIs and direct <svg> blocks.
 * @param xml The raw QTI item XML string.
 * @returns An array of SVG content strings.
 */
function extractAllSvgStrings(xml: string): string[] {
	const svgs: string[] = []

	// 1. Extract from <img src="data:image/svg+xml,...">
	const imgRegex = /<img[^>]+(?:src|href)\s*=\s*["'](data:image\/svg\+xml(?:;base64|;charset=[\w-]+)?,([^"']+))["'][^>]*>/gi
	let imgMatch: RegExpExecArray | null
	while ((imgMatch = imgRegex.exec(xml)) !== null) {
		const fullUri = imgMatch[1] ?? ""
		const payload = imgMatch[2] ?? ""
		if (!payload) continue
		const isBase64 = fullUri.includes(";base64")

		const decodedResult = errors.trySync(() =>
			isBase64 ? Buffer.from(payload, "base64").toString("utf-8") : decodeURIComponent(payload)
		)
		if (decodedResult.error) {
			logger.error("failed to decode svg data uri", { error: decodedResult.error })
			throw errors.wrap(decodedResult.error, "svg data uri decode")
		}
		svgs.push(decodedResult.data)
	}

	// 2. Extract from inline <svg>...</svg> blocks
	const inlineSvgRegex = /<svg[^>]*>[\s\S]*?<\/svg>/gi
	const inlineMatches = xml.match(inlineSvgRegex)
	if (inlineMatches) {
		svgs.push(...inlineMatches)
	}

	return svgs
}

// --- LLM Evaluation Helper with Concurrency and Retries ---

const SYSTEM_PROMPT = `
You are an expert QTI (Question and Test Interoperability) content analyst. Your task is to determine if visual information in SVG diagrams is consistent with the textual and mathematical information in a QTI assessment item. You will be given the entire raw XML for the item.

- **Your first task is to parse the raw XML in your context.** Identify the question being asked (typically within \`<qti-item-body>\`), and locate all feedback and explanations (typically within \`<qti-feedback-block>\` or similar). This includes all text, numbers, and MathML.
- Analyze the provided SVG diagram(s) to understand the visual data, labels, and dimensions.
- Compare the information from the diagrams against the information you parsed from the XML. Look for contradictions.
- Your output must be a binary decision: 'consistent' is either true or false.
- You must provide a comprehensive explanation for your decision.
- If inconsistent, you must identify which QTI interaction identifiers (\`response-identifier\` attributes) are affected.
- Your response must be in the exact JSON format requested.
`

async function evaluateConsistency(input: EvaluationInput): Promise<EvaluationResult> {
	const { itemId, rawXml, svgContents } = input
	logger.debug("evaluating item consistency with LLM", { itemId, model: OPENAI_MODEL })

	const userContent = `
Analyze the following QTI assessment item for consistency.

**Item ID:**
${itemId}

**Full Raw QTI Item XML:**
\`\`\`xml
${rawXml}
\`\`\`

**Decoded SVG Diagram(s) found in the XML:**
${svgContents.map((svg, i) => `--- SVG ${i + 1} ---\n${svg}`).join("\n\n")}

**Evaluation Task:**
Review the full raw XML and the decoded SVG content. Determine if the diagrams are consistent with the text, numbers, and MathML found in the XML. For example, do the dimensions in an SVG match the numbers used in the feedback calculations within the XML? Your response MUST be a JSON object matching the requested schema.
`

	const response = await errors.try(
		openai.responses.parse({
			model: OPENAI_MODEL,
			input: [
				{ role: "system", content: SYSTEM_PROMPT },
				{ role: "user", content: userContent }
			],
			text: {
				format: zodTextFormat(EvaluationResultSchema, "qti_consistency_evaluation")
			}
		})
	)

	if (response.error) {
		logger.error("LLM evaluation request failed", { itemId, error: response.error })
		throw errors.wrap(response.error, "LLM evaluation")
	}

	const evaluation = response.data.output_parsed
	if (!evaluation) {
		logger.error("LLM response was empty or malformed", { itemId })
		throw errors.new("LLM response malformed")
	}

	if (evaluation.itemId !== itemId) {
		logger.warn("LLM returned a mismatched item ID", { expected: itemId, actual: evaluation.itemId })
		evaluation.itemId = itemId
	}

	return evaluation
}

async function evaluateConsistencyWithRetry(input: EvaluationInput): Promise<EvaluationResult> {
	let lastError: Error = errors.new("no attempts made")
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		const result = await errors.try(evaluateConsistency(input))
		if (!result.error) {
			return result.data
		}
		lastError = result.error
		logger.warn("LLM evaluation attempt failed, retrying...", {
			itemId: input.itemId,
			attempt,
			maxRetries: MAX_RETRIES,
			error: lastError
		})
		const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000
		await new Promise(res => setTimeout(res, delay))
	}
	throw errors.wrap(lastError, `LLM evaluation failed after ${MAX_RETRIES} attempts`)
}

// --- Utility Functions ---

function isSourcedId(x: string): boolean {
	return x.startsWith("nice_")
}

async function ensureDir(dir: string) {
	const result = await errors.try(fs.mkdir(dir, { recursive: true }))
	if (result.error) {
		logger.error("failed to create directory", { dir, error: result.error })
		throw errors.wrap(result.error, "directory creation")
	}
}

function sha256(s: string): string {
	return createHash("sha256").update(s).digest("hex")
}

// --- Review Mode (no network calls) ---

async function reviewMode(courseSourcedId: string) {
	logger.info("starting review mode", { courseSourcedId })
	const baseDir = path.join(process.cwd(), "data", "qti-feedback-inconsistency-analysis", courseSourcedId)
	const evalsDir = path.join(baseDir, "evals")

	const dirReadResult = await errors.try(fs.readdir(evalsDir))
	if (dirReadResult.error) {
		logger.error("review mode: evals directory not found or unreadable", { evalsDir, error: dirReadResult.error })
		throw errors.wrap(dirReadResult.error, "review evals directory read")
	}

	const files = dirReadResult.data.filter((f) => f.endsWith(".json"))
	logger.debug("review mode: discovered eval files", { count: files.length, evalsDir })

	const failing: EvaluationResult[] = []
	for (const file of files) {
		const filePath = path.join(evalsDir, file)
		const readResult = await errors.try(fs.readFile(filePath, "utf-8"))
		if (readResult.error) {
			logger.warn("review mode: skipping unreadable eval file", { filePath, error: readResult.error })
			continue
		}
		const parsedJsonResult = errors.trySync(() => JSON.parse(readResult.data))
		if (parsedJsonResult.error) {
			logger.warn("review mode: skipping malformed json eval file", { filePath, error: parsedJsonResult.error })
			continue
		}
		const validation = EvaluationResultSchema.safeParse(parsedJsonResult.data)
		if (!validation.success) {
			logger.warn("review mode: eval json failed schema validation", { filePath })
			continue
		}
		const evalObj = validation.data
		if (!evalObj.consistent) {
			failing.push(evalObj)
		}
	}

	logger.info("review mode: failing items", { courseSourcedId, count: failing.length })
	if (failing.length === 0) {
		process.stdout.write(`No inconsistent items found for ${courseSourcedId}.\n`)
		return
	}

	// Print a concise list for quick scanning
	process.stdout.write(`\nFailing items for ${courseSourcedId} (count=${failing.length}):\n`)
	for (const f of failing) {
		const explanationOneLine = (f.explanation || "").replace(/\s+/g, " ").trim()
		process.stdout.write(`- ${f.itemId} -> ${explanationOneLine}\n`)
	}

	// Dump full JSON reviews for failing items
	process.stdout.write(`\nJSON reviews (inconsistent only):\n`)
	process.stdout.write(JSON.stringify(failing, null, 2) + "\n")

	logger.info("review mode complete", { courseSourcedId, failing: failing.length })
}

// --- Main Execution Logic ---

async function main() {
	const argv = process.argv.slice(2)
	if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
		process.stdout.write(HELP_TEXT + "\n")
		process.exit(0)
	}

	// Review mode: print only failing evaluations from existing artifacts; no network calls
	if (argv[0] === "--review") {
		const reviewArg = argv[1]
		if (!reviewArg) {
			process.stdout.write("usage: bun scripts/qti-diagram-consistency-eval.ts --review <courseSourcedId>\n")
			process.exit(1)
		}
		await reviewMode(reviewArg)
		return
	}

	const arg0 = argv[0]
	if (typeof arg0 !== "string" || arg0.length === 0) {
		process.stdout.write("usage: bun scripts/qti-diagram-consistency-eval.ts <course>|--review <course>\n")
		process.exit(1)
	}
	const arg: string = arg0

	// 1. Resolve Course sourcedId
	let courseSourcedId: string = arg
	if (!isSourcedId(arg)) {
		const courses = await retryOperation(
			() => getAllCoursesBySlug(arg),
			`oneroster:getAllCoursesBySlug:${arg}`
		)
		const course = courses[0]
		if (!course) {
			logger.error("course not found by slug", { slug: arg })
			throw errors.new("course not found")
		}
		courseSourcedId = course.sourcedId
	}
	logger.info("resolved course", { courseSourcedId })

	// 2. Discover QTI tests in the course
	const compResources = await retryOperation(
		() => getComponentResourcesForCourse(courseSourcedId),
		`oneroster:getComponentResourcesForCourse:${courseSourcedId}`
	)
	logger.debug("fetched component resources", { count: compResources.length, courseSourcedId })
	
	const resourceIds = Array.from(
		new Set(
			compResources
				.map((cr) => cr?.resource?.sourcedId)
				.filter((id): id is string => typeof id === "string" && id.length > 0)
		)
	)
	logger.debug("extracted unique resource ids from component resources", { count: resourceIds.length, courseSourcedId })
	
	const resources = await retryOperation(
		() => getResourcesByIds(resourceIds),
		`oneroster:getResourcesByIds:${courseSourcedId}`
	)
	logger.debug("fetched resources", { count: resources.length, courseSourcedId })
	
	// Debug: log all resource metadata types
	const resourcesByType = new Map<string, number>()
	for (const r of resources) {
		const type = r.metadata?.type
		const subType = r.metadata?.subType
		const key = `${type}/${subType}`
		resourcesByType.set(key, (resourcesByType.get(key) ?? 0) + 1)
	}
	logger.debug("resource breakdown by type/subtype", { breakdown: Object.fromEntries(resourcesByType), courseSourcedId })

	// Extra: dump ALL resource metadata for deep diagnostics (no slicing)
	logger.debug("resource metadata dump (full)", {
		courseSourcedId,
		count: resources.length,
		resources: resources.map((r) => ({
			id: typeof r.sourcedId === "string" ? r.sourcedId : "",
			title: typeof r.title === "string" ? r.title : "",
			metadata: r.metadata
		}))
	})
	
	const qtiTests = resources.filter((r) => {
		const type = r.metadata?.type
		const subType = r.metadata?.subType
		return (
			(type === "qti" && subType === "qti-test") ||
			(type === "interactive" && subType === "qti-test")
		)
	})
	logger.info("discovered QTI tests", { count: qtiTests.length, courseSourcedId })
	logger.debug("qti test resource ids", {
		testIds: qtiTests.map((t) => (typeof t.sourcedId === "string" ? t.sourcedId : "(missing)")),
		courseSourcedId
	})
	if (qtiTests.length === 0) {
		logger.debug("no tests discovered with current filter; see resource breakdown and metadata sample above for clues", { courseSourcedId })
	}

	// 3. Fetch tests and parse all referenced item identifiers
	const tests = [] as Array<{ resourceId: string; xml: string; itemIds: string[] }>
	for (const r of qtiTests) {
		const testId = typeof r.sourcedId === "string" ? r.sourcedId : null
		if (!testId) {
			logger.warn("skipping qti test: missing sourcedId", { resource: { title: r?.title, metadata: r?.metadata } })
			continue
		}
		logger.debug("fetching qti test", { resourceId: testId, testTitle: r.title })
		const test = await retryOperation(
			() => getAssessmentTest(testId),
			`qti:getAssessmentTest:${testId}`
		)
		const rawXml = test?.rawXml
		if (typeof rawXml !== "string") {
			logger.warn("skipping qti test: missing rawXml", { resourceId: testId })
			continue
		}
		logger.debug("fetched qti test xml", { resourceId: testId, xmlLength: rawXml.length })
		
		const parsedResult = errors.trySync(() => parseAssessmentTestXml(rawXml))
		if (parsedResult.error) {
			logger.warn("skipping qti test: no sections/items parsed", {
				resourceId: testId,
				error: parsedResult.error,
				xmlSample: rawXml.slice(0, 1000)
			})
			continue
		}
		const parsed = parsedResult.data
		logger.debug("parsed qti test xml", {
			resourceId: testId,
			sectionCount: parsed.sections.length,
			testPartId: parsed.testPartId
		})
		if (parsed.sections.length === 0) {
			logger.warn("skipping qti test: zero sections", { resourceId: testId })
			continue
		}
		const itemIds = Array.from(new Set(parsed.sections.flatMap(s => s.itemIds)))
		logger.debug("extracted item ids from test", { resourceId: testId, itemCount: itemIds.length, itemIds })
		if (itemIds.length === 0) {
			logger.warn("skipping qti test: zero itemIds extracted", { resourceId: testId })
			continue
		}
		tests.push({ resourceId: testId, xml: rawXml, itemIds })
	}
	logger.debug("completed fetching all tests", { testCount: tests.length, courseSourcedId })

	// 4. Fetch all unique QTI items for the course
	const allItemIds = Array.from(new Set(tests.flatMap(t => t.itemIds)))
	logger.debug("deduplicated item ids across all tests", { uniqueItemCount: allItemIds.length, totalReferences: tests.flatMap(t => t.itemIds).length })
	
	let items: Array<{ identifier: string; rawXml: string }>
	if (allItemIds.length === 0) {
		logger.warn("no assessment item ids found across all tests; continuing with empty item set", {
			courseSourcedId
		})
		items = []
	} else {
		items = await retryOperation(
			() => getAssessmentItems(allItemIds),
			`qti:getAssessmentItems:${courseSourcedId}`
		)
		logger.info("fetched unique QTI items", { count: items.length, courseSourcedId })
		logger.debug("fetched item identifiers", { itemIds: items.map(i => i.identifier) })
	}

	// 5. Setup output directories
	const baseDir = path.join(process.cwd(), "data", "qti-feedback-inconsistency-analysis", courseSourcedId)
	const itemsDir = path.join(baseDir, "items", "xml")
	const svgCacheDir = path.join(process.cwd(), "data", "qti-feedback-inconsistency-analysis", "svg-cache")
	const evalsDir = path.join(baseDir, "evals")
	logger.debug("creating output directories", { baseDir, itemsDir, svgCacheDir, evalsDir })
	await Promise.all([ensureDir(baseDir), ensureDir(itemsDir), ensureDir(svgCacheDir), ensureDir(evalsDir)])
	logger.debug("output directories created", { courseSourcedId })

	// 6. Write artifacts to disk
	logger.debug("writing tests manifest", { testCount: tests.length, path: path.join(baseDir, "tests.json") })
	const writeTestsResult = await errors.try(fs.writeFile(path.join(baseDir, "tests.json"), JSON.stringify(tests, null, 2)))
	if (writeTestsResult.error) {
		logger.error("failed to write tests manifest", { error: writeTestsResult.error })
		throw errors.wrap(writeTestsResult.error, "file write")
	}
	logger.debug("wrote tests manifest", { courseSourcedId })

	const itemIndex: Array<{ itemId: string; sha256: string; svgHashes: string[] }> = []
	for (const it of items) {
		const itemId = String(it.identifier)
		const xml = it.rawXml
		const filePath = path.join(itemsDir, `${itemId}.xml`)
		logger.debug("writing item xml", { itemId, filePath, xmlLength: xml.length })
		const writeItemResult = await errors.try(fs.writeFile(filePath, xml))
		if (writeItemResult.error) {
			logger.error("failed to write item xml", { itemId, error: writeItemResult.error })
			throw errors.wrap(writeItemResult.error, "file write")
		}

		const svgs = extractAllSvgStrings(xml)
		logger.debug("extracted svgs from item", { itemId, svgCount: svgs.length })
		const svgHashes: string[] = []
		for (const svg of svgs) {
			const hash = sha256(svg)
			svgHashes.push(hash)
			const outPath = path.join(svgCacheDir, `${hash}.svg`)
			const existsResult = await errors.try(fs.access(outPath))
			if (existsResult.error) {
				logger.debug("writing new svg to cache", { hash, svgLength: svg.length })
				const writeSvgResult = await errors.try(fs.writeFile(outPath, svg))
				if (writeSvgResult.error) {
					logger.error("failed to write svg cache file", { hash, error: writeSvgResult.error })
					throw errors.wrap(writeSvgResult.error, "svg cache write")
				}
			} else {
				logger.debug("svg already cached", { hash })
			}
		}
		itemIndex.push({ itemId, sha256: sha256(xml), svgHashes })
	}
	logger.debug("completed writing all item xmls", { itemCount: items.length, courseSourcedId })

	logger.debug("writing item index", { itemCount: itemIndex.length, path: path.join(baseDir, "items", "index.json") })
	const writeIndexResult = await errors.try(
		fs.writeFile(path.join(baseDir, "items", "index.json"), JSON.stringify(itemIndex, null, 2))
	)
	if (writeIndexResult.error) {
		logger.error("failed to write item index", { error: writeIndexResult.error })
		throw errors.wrap(writeIndexResult.error, "file write")
	}
	logger.info("completed writing all local artifacts", { courseSourcedId })
	logger.debug("artifact summary", { 
		testsWritten: tests.length, 
		itemsWritten: items.length,
		uniqueSvgsWritten: new Set(itemIndex.flatMap(i => i.svgHashes)).size
	})

	// 7. --- Evaluation Step ---
	const evaluationErrors: ItemEvaluationError[] = []
	const allEvaluations: EvaluationResult[] = []
	const itemsToEvaluate = items.filter(item => extractAllSvgStrings(item.rawXml).length > 0)
	logger.info("starting evaluation", { totalItems: items.length, itemsToEvaluate: itemsToEvaluate.length })
	logger.debug("items to evaluate", { itemIds: itemsToEvaluate.map(i => i.identifier) })

	const processItem = async (item: (typeof items)[number]): Promise<void> => {
		const itemId = String(item.identifier)
		try {
			const evalInput: EvaluationInput = {
				itemId,
				rawXml: item.rawXml,
				svgContents: extractAllSvgStrings(item.rawXml)
			}
			logger.debug("processing item for evaluation", { itemId, svgCount: evalInput.svgContents.length, xmlLength: item.rawXml.length })

			const evaluation = await evaluateConsistencyWithRetry(evalInput)
			logger.debug("evaluation completed for item", { itemId, consistent: evaluation.consistent })
			allEvaluations.push(evaluation)

			const evalOutputPath = path.join(evalsDir, `${itemId}.json`)
			logger.debug("writing evaluation result", { itemId, evalOutputPath })
			const writeEvalResult = await errors.try(fs.writeFile(evalOutputPath, JSON.stringify(evaluation, null, 2)))
			if (writeEvalResult.error) {
				throw errors.wrap(writeEvalResult.error, "file write for per-item eval")
			}
			logger.debug("wrote evaluation result", { itemId })
		} catch (err) {
			const wrappedErr = errors.wrap(err instanceof Error ? err : new Error(String(err)), `evaluation for item ${itemId}`)
			logger.error("item evaluation failed permanently", { itemId, error: wrappedErr })
			evaluationErrors.push({ itemId, error: wrappedErr.message })
		}
	}

	// Concurrency Limiter
	const running = new Set<Promise<void>>()
	for (const item of itemsToEvaluate) {
		while (running.size >= MAX_CONCURRENT_LLM_CALLS) {
			const result = await errors.try(Promise.race(running))
			if (result.error) {
				logger.error("unhandled error in promise race", { error: result.error })
			}
		}
		const promise = processItem(item).finally(() => running.delete(promise))
		running.add(promise)
	}
	await Promise.all(running)

	// 8. --- Final Report Generation ---
	logger.debug("filtering evaluations to inconsistent items", { totalEvaluations: allEvaluations.length })
	const inconsistentItems = allEvaluations.filter(e => !e.consistent)
	logger.debug("filtered inconsistent items", { inconsistentCount: inconsistentItems.length, consistentCount: allEvaluations.length - inconsistentItems.length })
	
	const finalReportPath = path.join(baseDir, "inconsistency-report.json")
	logger.debug("writing inconsistency report", { path: finalReportPath, itemCount: inconsistentItems.length })
	const writeReportResult = await errors.try(fs.writeFile(finalReportPath, JSON.stringify(inconsistentItems, null, 2)))
	if (writeReportResult.error) {
		logger.error("failed to write final inconsistency report", { error: writeReportResult.error })
		throw errors.wrap(writeReportResult.error, "file write")
	}
	logger.debug("wrote inconsistency report", { path: finalReportPath })

	// 9. --- Error Report Generation ---
	if (evaluationErrors.length > 0) {
		const errorReportPath = path.join(baseDir, "errors.json")
		logger.debug("writing error report", { path: errorReportPath, errorCount: evaluationErrors.length })
		const writeErrorResult = await errors.try(fs.writeFile(errorReportPath, JSON.stringify(evaluationErrors, null, 2)))
		if (writeErrorResult.error) {
			logger.error("failed to write evaluation error report", { error: writeErrorResult.error })
			throw errors.wrap(writeErrorResult.error, "file write")
		}
		logger.error("evaluation finished with errors", {
			errorCount: evaluationErrors.length,
			errorReportPath
		})
		throw errors.new(`evaluation completed with ${evaluationErrors.length} failed items`)
	}

	logger.info("evaluation complete", {
		totalItems: items.length,
		itemsWithSvgs: itemsToEvaluate.length,
		inconsistentItems: inconsistentItems.length,
		reportPath: finalReportPath
	})
	logger.debug("final summary", {
		courseSourcedId,
		testsAnalyzed: tests.length,
		uniqueItemsFetched: items.length,
		itemsWithSvgs: itemsToEvaluate.length,
		evaluationsCompleted: allEvaluations.length,
		inconsistentItems: inconsistentItems.length,
		consistentItems: allEvaluations.length - inconsistentItems.length,
		evaluationErrors: evaluationErrors.length
	})
}

// --- Script Entrypoint ---

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
