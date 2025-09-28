#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as OneRoster from "@/lib/oneroster"
import * as Qti from "@/lib/qti"
import { env } from "@/env.js"
import { z } from "zod"
import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import * as fs from "node:fs/promises"
import * as path from "node:path"

// --- Constants ---
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const ERROR_LOG_FILE = "timeback-spelunker-errors.log"

// --- Utility Types ---
interface Paginator<T> {
	items: T[]
	currentPage: number
	pageSize: number
	totalItems: number
	totalPages: number
}

// --- NEW: Global Cache & View Stack ---
type CacheEntry<T> = {
	data?: T[]
	fetchInfo?: FetchInfo
}

const cache = {
	oneRosterResources: {} as CacheEntry<OneRoster.Resource>,
	qtiTests: {} as CacheEntry<Qti.AssessmentTest>,
	qtiItems: {} as CacheEntry<Qti.AssessmentItem>
}

let viewStack: State[] = []

// --- Error Logging ---
async function logErrorToFile(error: any, context: string) {
	const timestamp = new Date().toISOString()
	const errorEntry = {
		timestamp,
		context,
		error: {
			message: error.message || String(error),
			stack: error.stack,
			...error
		}
	}
	
	const logLine = JSON.stringify(errorEntry) + "\n"
	
	const writeResult = await errors.try(fs.appendFile(ERROR_LOG_FILE, logLine))
	if (writeResult.error) {
		console.error(`\n⚠️  Failed to write error to file: ${writeResult.error.message}`)
		return
	}
	
	console.log(`\n💾 Error details saved to ${ERROR_LOG_FILE}`)
}

// --- Retry with Exponential Backoff ---
interface RetryOptions {
	maxRetries?: number
	initialDelayMs?: number
	maxDelayMs?: number
	jitterMs?: number
}

async function retryWithBackoff<T>(
	operation: () => Promise<T>,
	context: string,
	options: RetryOptions = {}
): Promise<T> {
	const {
		maxRetries = 3,
		initialDelayMs = 1000,
		maxDelayMs = 60000,
		jitterMs = 500
	} = options
	
	let lastError: Error | undefined
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const result = await errors.try(operation())
		if (!result.error) {
			if (attempt > 1) {
				logger.info("operation succeeded after retry", { 
					context, 
					attempt,
					previousFailures: attempt - 1
				})
			}
			return result.data
		}
		
		lastError = result.error
		
		// Calculate exponential backoff with jitter
		const baseDelay = Math.min(
			initialDelayMs * Math.pow(2, attempt - 1),
			maxDelayMs
		)
		const jitter = Math.random() * jitterMs - (jitterMs / 2) // +/- jitterMs/2
		const delay = Math.max(0, baseDelay + jitter)
		
		logger.error("operation failed, will retry", { 
			context, 
			attempt, 
			maxRetries, 
			error: lastError,
			nextDelayMs: delay,
			baseDelayMs: baseDelay,
			jitterMs: jitter
		})
		
		// Log error details
		await logErrorToFile(lastError, `${context} - Attempt ${attempt}/${maxRetries}`)
		
		if (attempt < maxRetries) {
			console.log(`\n⚠️  Attempt ${attempt}/${maxRetries} failed for: ${context}`)
			console.log(`   Error: ${lastError.message}`)
			console.log(`   Retrying in ${Math.round(delay)}ms (base: ${baseDelay}ms, jitter: ${Math.round(jitter)}ms)`)
			
			await new Promise<void>(resolve => setTimeout(resolve, delay))
		}
	}
	
	console.error(`\n❌ All ${maxRetries} attempts failed for: ${context}`)
	console.error(`   Final error: ${lastError?.message || "Unknown error"}`)
	console.error(`\n💾 Full error details saved to ${ERROR_LOG_FILE}`)
	console.error(`   View with: cat ${ERROR_LOG_FILE} | tail -20 | jq .`)
	console.error(`   Or live tail: tail -f ${ERROR_LOG_FILE} | jq .`)
	
	if (!lastError) {
		throw errors.new(`${context}: failed after ${maxRetries} attempts with unknown error`)
	}
	
	throw errors.wrap(lastError, `${context}: failed after ${maxRetries} attempts`)
}

// --- State Machine Types ---
type MainMenuState = { kind: "MainMenu" }
type OneRosterMenuState = { kind: "OneRosterMenu" }
type FetchInfo = {
	type: "all" | "fuzzy" | "filter"
	query?: string
	timestamp: Date
	count: number
}

type OneRosterResourcesListState = {
	kind: "OneRosterResourcesList"
	// View state
	paginator?: Paginator<OneRoster.Resource>
	clientFilter?: string
	sortField?: string
	sortOrder?: "asc" | "desc"
}
type OneRosterResourceInspectState = {
	kind: "OneRosterResourceInspect"
	resource: OneRoster.Resource
	prevState: OneRosterResourcesListState // Keep previous state for 'back'
}
type QtiMenuState = { kind: "QtiMenu" }
type QtiTestsListState = {
	kind: "QtiTestsList"
	// View state
	paginator?: Paginator<Qti.AssessmentTest>
	clientFilter?: string
	sortField?: "title" | "identifier" | "createdAt" | "updatedAt"
	sortOrder?: "asc" | "desc"
}
type QtiTestInspectState = {
	kind: "QtiTestInspect"
	test: Qti.AssessmentTest
	prevState: QtiTestsListState
}
type QtiTestItemsListState = {
	kind: "QtiTestItemsList"
	test: Qti.AssessmentTest
	// View state
	paginator?: Paginator<Qti.AssessmentItem>
	clientFilter?: string
	sortField?: "title" | "identifier" | "type" | "createdAt" | "updatedAt"
	sortOrder?: "asc" | "desc"
	prevState: QtiTestInspectState
}
type QtiItemsListState = {
	kind: "QtiItemsList"
	// View state
	paginator?: Paginator<Qti.AssessmentItem>
	clientFilter?: string
	sortField?: "title" | "identifier" | "type" | "createdAt" | "updatedAt"
	sortOrder?: "asc" | "desc"
}
type QtiItemInspectState = {
	kind: "QtiItemInspect"
	item: Qti.AssessmentItem
	prevState: QtiItemsListState
}
type JsonDisplayState = {
	kind: "JsonDisplay"
	data: any
	title: string
	prevState: State
}
type ExitState = { kind: "Exit" }

type State =
	| MainMenuState
	| OneRosterMenuState
	| OneRosterResourcesListState
	| OneRosterResourceInspectState
	| QtiMenuState
	| QtiTestsListState
	| QtiTestInspectState
	| QtiTestItemsListState
	| QtiItemsListState
	| QtiItemInspectState
	| JsonDisplayState
	| ExitState

// --- Command Schemas ---
const GlobalCommandSchema = z.discriminatedUnion("cmd", [
	z.object({ cmd: z.literal("help") }),
	z.object({ cmd: z.literal("back") }),
	z.object({ cmd: z.literal("exit") })
])

// Fetch commands - for database operations
const FetchCommandSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("all") }),
	z.object({ type: z.literal("fuzzy"), query: z.string().min(1) }),
	z.object({ type: z.literal("filter"), expr: z.string().min(1) }),
	z.object({ type: z.literal("limit"), n: z.coerce.number().int().positive().max(1000) })
])

const ListCommandSchema = z.discriminatedUnion("cmd", [
	// Fetch operations
	z.object({ cmd: z.literal("fetch"), subCmd: FetchCommandSchema.optional() }),
	
	// List/view operations (work on cached data)
	z.object({ cmd: z.literal("list") }),
	z.object({ cmd: z.literal("next") }),
	z.object({ cmd: z.literal("prev") }),
	z.object({ cmd: z.literal("page"), n: z.coerce.number().int().positive() }),
	z.object({ cmd: z.literal("size"), n: z.coerce.number().int().positive().max(MAX_PAGE_SIZE) }),
	z.object({ cmd: z.literal("filter"), expr: z.string().min(1) }),
	z.object({ cmd: z.literal("sort"), field: z.string().min(1) }),
	z.object({ cmd: z.literal("clear") }),
	
	// Inspection operations
	z.object({ cmd: z.literal("open"), index: z.coerce.number().int().nonnegative() }),
	z.object({ cmd: z.literal("json"), index: z.coerce.number().int().nonnegative() }),
	z.object({ cmd: z.literal("fields") }),
	
	// Navigation
	z.object({ cmd: z.literal("help") }),
	z.object({ cmd: z.literal("back") }),
	z.object({ cmd: z.literal("exit") })
])

const InspectCommandSchema = z.discriminatedUnion("cmd", [
	z.object({ cmd: z.literal("json") }),
	z.object({ cmd: z.literal("fields") }),
	z.object({ cmd: z.literal("items") }), // For QTI tests to list their items
	z.object({ cmd: z.literal("help") }),
	z.object({ cmd: z.literal("back") }),
	z.object({ cmd: z.literal("exit") })
])

const MenuCommandSchema = z.discriminatedUnion("cmd", [
	z.object({ cmd: z.literal("1") }),
	z.object({ cmd: z.literal("2") }),
	z.object({ cmd: z.literal("3") }),
	z.object({ cmd: z.literal("help") }),
	z.object({ cmd: z.literal("back") }),
	z.object({ cmd: z.literal("exit") })
])

// --- NEW: Command Alias Map ---
const commandAliases: Record<string, string> = {
	// Navigation
	n: "next",
	p: "prev",
	b: "back",
	q: "exit",
	"?": "help",
	// Listing
	l: "list",
	f: "filter",
	s: "sort",
	c: "clear",
	// Inspection
	o: "open",
	j: "json",
	i: "items"
}

// --- NEW: Typedefs for Sortable Fields ---
const resourceSortableFields: Readonly<Record<string, "sourcedId" | "title" | "status" | "vendorResourceId">> = {
	id: "sourcedId",
	title: "title",
	status: "status",
	vendorId: "vendorResourceId"
}

const qtiTestSortableFields: Readonly<Record<string, "title" | "identifier" | "createdAt" | "updatedAt">> = {
	id: "identifier",
	title: "title",
	created: "createdAt",
	updated: "updatedAt"
}

const qtiItemSortableFields: Readonly<Record<string, "title" | "identifier" | "type" | "createdAt" | "updatedAt">> = {
	id: "identifier",
	title: "title",
	type: "type",
	created: "createdAt",
	updated: "updatedAt"
}

// --- Global State ---
let oneRosterClient: OneRoster.Client
let qtiClient: Qti.Client
let rl: readline.Interface

// --- Pagination Helpers ---
function createPaginator<T>(items: T[], currentPage: number, pageSize: number): Paginator<T> {
	const totalItems = items.length
	const totalPages = Math.ceil(totalItems / pageSize)
	const startIdx = (currentPage - 1) * pageSize
	const endIdx = startIdx + pageSize
	const pageItems = items.slice(startIdx, endIdx)

	return {
		items: pageItems,
		currentPage,
		pageSize,
		totalItems,
		totalPages
	}
}

function createServerPaginator<T>(
	items: T[],
	currentPage: number,
	pageSize: number,
	totalItems: number
): Paginator<T> {
	return {
		items,
		currentPage,
		pageSize,
		totalItems,
		totalPages: Math.ceil(totalItems / pageSize)
	}
}

// --- Display Helpers ---
function clearScreen() {
	console.clear()
}

function printHeader(title: string) {
	console.log("\n" + "=".repeat(80))
	console.log(`  ${title}`)
	console.log("=".repeat(80) + "\n")
}

function printPaginationInfo(paginator: Paginator<any>) {
	console.log(
		`Page ${paginator.currentPage}/${paginator.totalPages} | ` +
			`Showing ${paginator.items.length} of ${paginator.totalItems} items | ` +
			`Page size: ${paginator.pageSize}\n`
	)
}

function printHelp(commands: string[]) {
	console.log("\nAvailable commands (aliases in parens):")
	for (const cmd of commands) {
		console.log(`  ${cmd}`)
	}
	console.log()
}

function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str
	return str.substring(0, maxLen - 3) + "..."
}

// --- Render Functions ---
function renderMainMenu() {
	clearScreen()
	printHeader("Timeback Spelunker - Production Data Explorer")
	console.log("⚠️  READ-ONLY MODE - No data will be modified\n")
	console.log("Choose a service to explore:\n")
	console.log("  1. OneRoster")
	console.log("  2. QTI")
	console.log("  3. Exit\n")
	printHelp(["1 - OneRoster", "2 - QTI", "3 - Exit", "help (?) - Show commands", "exit (q) - Exit the program"])
}

function renderOneRosterMenu() {
	clearScreen()
	printHeader("OneRoster Explorer")
	console.log("Choose an entity to explore:\n")
	console.log("  1. Resources")
	console.log("  2. Back to main menu\n")
	printHelp(["1 - Resources", "2 - Back to main menu", "back (b) - Go back", "help (?) - Show commands", "exit (q) - Exit the program"])
}

function renderQtiMenu() {
	clearScreen()
	printHeader("QTI Explorer")
	console.log("Choose an entity to explore:\n")
	console.log("  1. Assessment Tests")
	console.log("  2. Assessment Items")
	console.log("  3. Back to main menu\n")
	printHelp(["1 - Assessment Tests", "2 - Assessment Items", "3 - Back to main menu", "back - Go back", "help - Show commands", "exit - Exit the program"])
}

function renderOneRosterResourcesList(state: OneRosterResourcesListState) {
	clearScreen()
	printHeader("OneRoster Resources")

	// Show fetch status from cache
	const { data, fetchInfo } = cache.oneRosterResources
	if (fetchInfo) {
		console.log(`Data: ${fetchInfo.count} resources`)
		console.log(`Fetched: ${fetchInfo.timestamp.toLocaleString()}`)
		console.log(`Method: ${fetchInfo.type}${fetchInfo.query ? ` (${fetchInfo.query})` : ""}\n`)
	} else if (!data) {
		console.log("No data fetched yet. Use 'fetch' to retrieve resources.\n")
		console.log("Examples:")
		console.log("  fetch              - Fetch all resources")
		console.log("  fetch fuzzy math   - Fuzzy search for 'math'")
		console.log("  fetch filter status='active' AND title~'Alpha'")
		console.log()
		printHelp([
			"fetch - Fetch all resources",
			"fetch fuzzy <query> - Fuzzy search by title",
			"fetch filter <expr> - Advanced filter",
			"help (?) - Show all commands",
			"back (b) - Go back",
			"exit (q) - Exit"
		])
		return
	}

	// Show current filters
	if (state.clientFilter) {
		console.log(`Client Filter: "${state.clientFilter}"`)
	}
	if (state.sortField) {
		console.log(`Sort: ${state.sortField} (${state.sortOrder || "asc"})`)
	}
	if (state.clientFilter || state.sortField) {
		console.log()
	}

	// Show pagination info
	if (state.paginator) {
		printPaginationInfo(state.paginator)

		if (state.paginator.items.length === 0) {
			console.log("No resources match current filters.\n")
		} else {
			// Get terminal width for dynamic sizing
			const terminalWidth = process.stdout.columns || 120
			const indexWidth = 8
			const idWidth = 40
			const spacing = 2
			const titleWidth = Math.max(30, terminalWidth - indexWidth - idWidth - (spacing * 2))
			
			// Table header
			console.log(`${"Index".padEnd(indexWidth)} ${"ID".padEnd(idWidth)} ${"Title"}`)
			console.log("-".repeat(terminalWidth))

			// Table rows
			state.paginator.items.forEach((resource, idx) => {
				const globalIdx = (state.paginator!.currentPage - 1) * state.paginator!.pageSize + idx
				console.log(
					`${globalIdx.toString().padEnd(indexWidth)} ${truncate(resource.sourcedId, idWidth).padEnd(idWidth)} ${truncate(
						resource.title,
						titleWidth
					)}`
				)
			})
			console.log()
		}
	}

	printHelp([
		"fetch - Fetch new data",
		"fetch fuzzy <query> - Fuzzy search",
		"fetch filter <expr> - Advanced filter",
		"list (l) - Refresh view",
		"next (n) / prev (p) - Navigate pages",
		"page <n> - Go to page n",
		"size <n> - Set page size",
		"filter (f) <expr> - Client filter (use ^prefix for prefix match)",
		"sort (s) <field> - Sort data",
		"clear (c) - Clear filters",
		"open (o) <idx> - Inspect",
		"json (j) <idx> - Show JSON (shows complete titles)",
		"back (b) - Go back",
		"exit (q) - Exit",
		"Note: Title width adapts to your terminal size"
	])
}

function renderOneRosterResourceInspect(state: OneRosterResourceInspectState) {
	clearScreen()
	printHeader(`OneRoster Resource: ${state.resource.title}`)

	console.log("Key Fields:\n")
	console.log(`  Source ID:          ${state.resource.sourcedId}`)
	console.log(`  Title:              ${state.resource.title}`)
	console.log(`  Status:             ${state.resource.status}`)
	console.log(`  Format:             ${state.resource.format ?? "N/A"}`)
	console.log(`  Vendor Resource ID: ${state.resource.vendorResourceId}`)
	console.log(`  Vendor ID:          ${state.resource.vendorId ?? "N/A"}`)
	console.log(`  Application ID:     ${state.resource.applicationId ?? "N/A"}`)
	console.log(`  Importance:         ${state.resource.importance ?? "N/A"}`)
	console.log(`  Roles:              ${state.resource.roles?.join(", ") ?? "N/A"}`)

	if (state.resource.metadata && Object.keys(state.resource.metadata).length > 0) {
		console.log(`\n  Metadata Keys:      ${Object.keys(state.resource.metadata).join(", ")}`)
	}
	console.log()

	printHelp(["json (j) - Show full JSON", "fields - Show key fields", "back (b) - Go back", "exit (q) - Exit the program"])
}

function renderQtiTestsList(state: QtiTestsListState) {
	clearScreen()
	printHeader("QTI Assessment Tests")

	// Show fetch status from cache
	const { data, fetchInfo } = cache.qtiTests
	if (fetchInfo) {
		console.log(`Data: ${fetchInfo.count} tests`)
		console.log(`Fetched: ${fetchInfo.timestamp.toLocaleString()}`)
		console.log(`Method: ${fetchInfo.type}${fetchInfo.query ? ` (${fetchInfo.query})` : ""}\n`)
	} else if (!data) {
		console.log("No data fetched yet. Use 'fetch' to retrieve tests.\n")
		console.log("Examples:")
		console.log("  fetch              - Fetch all tests")
		console.log()
		printHelp([
			"fetch - Fetch all tests",
			"help (?) - Show all commands",
			"back (b) - Go back",
			"exit (q) - Exit"
		])
		return
	}

	// Show current filters
	if (state.clientFilter) {
		console.log(`Client Filter: "${state.clientFilter}"`)
	}
	if (state.sortField) {
		console.log(`Sort: ${state.sortField} (${state.sortOrder || "asc"})`)
	}
	if (state.clientFilter || state.sortField) {
		console.log()
	}

	// Show pagination info
	if (state.paginator) {
		printPaginationInfo(state.paginator)

		if (state.paginator.items.length === 0) {
			console.log("No tests match current filters.\n")
		} else {
			// Get terminal width for dynamic sizing
			const terminalWidth = process.stdout.columns || 120
			const indexWidth = 8
			const idWidth = 40
			const spacing = 2
			const titleWidth = Math.max(30, terminalWidth - indexWidth - idWidth - (spacing * 2))
			
			// Table header
			console.log(`${"Index".padEnd(indexWidth)} ${"ID".padEnd(idWidth)} ${"Title"}`)
			console.log("-".repeat(terminalWidth))

			// Table rows
			state.paginator.items.forEach((test, idx) => {
				const globalIdx = (state.paginator!.currentPage - 1) * state.paginator!.pageSize + idx
				const truncatedTitle = truncate(test.title, titleWidth)
				console.log(
					`${globalIdx.toString().padEnd(indexWidth)} ${truncate(test.identifier, idWidth).padEnd(idWidth)} ${truncatedTitle}`
				)
			})
			console.log()
		}
	}

	printHelp([
		"fetch - Fetch all tests",
		"list (l) - Refresh view",
		"next (n) / prev (p) - Navigate pages",
		"filter (f) <expr> - Client filter (use ^prefix for prefix match)",
		"sort (s) <field> - Sort data",
		"clear (c) - Clear filters",
		"open (o) <idx> - Inspect",
		"json (j) <idx> - View full JSON (shows complete titles)",
		"back (b) - Go back",
		"exit (q) - Exit",
		"Note: Title width adapts to your terminal size"
	])
}

function renderQtiTestInspect(state: QtiTestInspectState) {
	clearScreen()
	printHeader(`QTI Assessment Test: ${state.test.title}`)

	console.log("Key Fields:\n")
	console.log(`  Identifier:    ${state.test.identifier}`)
	console.log(`  Title:         ${state.test.title}`)
	console.log(`  QTI Version:   ${state.test.qtiVersion}`)
	console.log(`  Time Limit:    ${state.test.timeLimit ?? "N/A"}`)
	console.log(`  Max Attempts:  ${state.test.maxAttempts ?? "N/A"}`)
	console.log(`  Valid XML:     ${state.test.isValidXml !== undefined ? state.test.isValidXml : "Unknown"}`)
	console.log(`  Created At:    ${state.test.createdAt}`)
	console.log(`  Updated At:    ${state.test.updatedAt}`)

	if (state.test.toolsEnabled && Object.keys(state.test.toolsEnabled).length > 0) {
		console.log(`\n  Tools Enabled: ${JSON.stringify(state.test.toolsEnabled)}`)
	}
	console.log()

	printHelp(["items (i) - List assessment items in this test", "json (j) - Show full JSON", "fields - Show key fields", "back (b) - Go back", "exit (q) - Exit the program"])
}

function renderQtiTestItemsList(state: QtiTestItemsListState) {
	clearScreen()
	printHeader(`Items in Test: ${state.test.title}`)
	
	// Show test identifier
	console.log(`Test ID: ${state.test.identifier}\n`)
	
	console.log("⚠️  NOTE: The QTI API does not currently support filtering items by test.")
	console.log("This view would show items that belong to this specific test, but the API")
	console.log("doesn't provide this relationship data.\n")
	console.log("Use 'back' to return to the test, or navigate to 'QTI > Assessment Items'")
	console.log("from the main menu to browse all available items.\n")
	
	printHelp([
		"back (b) - Go back to test",
		"exit (q) - Exit"
	])
}

function renderQtiItemsList(state: QtiItemsListState) {
	clearScreen()
	printHeader("QTI Assessment Items")

	// Show fetch status from cache
	const { data, fetchInfo } = cache.qtiItems
	if (fetchInfo) {
		console.log(`Data: ${fetchInfo.count} items`)
		console.log(`Fetched: ${fetchInfo.timestamp.toLocaleString()}`)
		console.log(`Method: ${fetchInfo.type}${fetchInfo.query ? ` (${fetchInfo.query})` : ""}\n`)
	} else if (!data) {
		console.log("No data fetched yet. Use 'fetch' to retrieve items.\n")
		console.log("Examples:")
		console.log("  fetch              - Fetch all items")
		console.log()
		printHelp([
			"fetch - Fetch all items",
			"help (?) - Show all commands",
			"back (b) - Go back",
			"exit (q) - Exit"
		])
		return
	}

	// Show current filters
	if (state.clientFilter) {
		console.log(`Client Filter: "${state.clientFilter}"`)
	}
	if (state.sortField) {
		console.log(`Sort: ${state.sortField} (${state.sortOrder || "asc"})`)
	}
	if (state.clientFilter || state.sortField) {
		console.log()
	}

	// Show pagination info
	if (state.paginator) {
		printPaginationInfo(state.paginator)

		if (state.paginator.items.length === 0) {
			console.log("No items match current filters.\n")
		} else {
			// Get terminal width for dynamic sizing
			const terminalWidth = process.stdout.columns || 120
			const indexWidth = 8
			const idWidth = 36
			const typeWidth = 15
			const spacing = 3
			const titleWidth = Math.max(25, terminalWidth - indexWidth - idWidth - typeWidth - (spacing * 2))
			
			// Table header
			console.log(`${"Index".padEnd(indexWidth)} ${"ID".padEnd(idWidth)} ${"Title".padEnd(titleWidth)} ${"Type"}`)
			console.log("-".repeat(terminalWidth))

			// Table rows
			state.paginator.items.forEach((item, idx) => {
				const globalIdx = (state.paginator!.currentPage - 1) * state.paginator!.pageSize + idx
				console.log(
					`${globalIdx.toString().padEnd(indexWidth)} ${truncate(item.identifier, idWidth).padEnd(idWidth)} ${truncate(
						item.title,
						titleWidth
					).padEnd(titleWidth)} ${item.type}`
				)
			})
			console.log()
		}
	}

	printHelp([
		"fetch - Fetch all items",
		"list (l) - Refresh view",
		"next (n) / prev (p) - Navigate pages",
		"filter (f) <expr> - Client filter (use ^prefix for prefix match)",
		"sort (s) <field> - Sort data",
		"clear (c) - Clear filters",
		"open (o) <idx> - Inspect",
		"json (j) <idx> - View full JSON (shows complete titles)",
		"back (b) - Go back",
		"exit (q) - Exit",
		"Note: Title width adapts to your terminal size"
	])
}

function renderQtiItemInspect(state: QtiItemInspectState) {
	clearScreen()
	printHeader(`QTI Assessment Item: ${state.item.title}`)

	console.log("Key Fields:\n")
	console.log(`  Identifier:      ${state.item.identifier}`)
	console.log(`  Title:           ${state.item.title}`)
	console.log(`  Type:            ${state.item.type}`)
	console.log(`  QTI Version:     ${state.item.qtiVersion}`)
	console.log(`  Time Dependent:  ${state.item.timeDependent}`)
	console.log(`  Adaptive:        ${state.item.adaptive}`)
	console.log(`  Created At:      ${state.item.createdAt}`)
	console.log(`  Updated At:      ${state.item.updatedAt}`)

	if (state.item.responseDeclarations && state.item.responseDeclarations.length > 0) {
		console.log(`\n  Response Declarations:`)
		state.item.responseDeclarations.forEach((rd) => {
			console.log(`    - ${rd.identifier} (${rd.cardinality}, ${rd.baseType ?? "N/A"})`)
		})
	}

	if (state.item.outcomeDeclarations && state.item.outcomeDeclarations.length > 0) {
		console.log(`\n  Outcome Declarations:`)
		state.item.outcomeDeclarations.forEach((od) => {
			console.log(`    - ${od.identifier} (${od.cardinality}, ${od.baseType ?? "N/A"})`)
		})
	}
	console.log()

	printHelp(["json (j) - Show full JSON", "fields - Show key fields", "back (b) - Go back", "exit (q) - Exit the program"])
}

function renderJsonDisplay(state: JsonDisplayState) {
	clearScreen()
	printHeader(`JSON View: ${state.title}`)
	console.log(JSON.stringify(state.data, null, 2))
	console.log("\n")
	printHelp(["back (b) - Go back", "exit (q) - Exit"])
}

function render(state: State) {
	switch (state.kind) {
		case "MainMenu":
			renderMainMenu()
			break
		case "OneRosterMenu":
			renderOneRosterMenu()
			break
		case "OneRosterResourcesList":
			renderOneRosterResourcesList(state)
			break
		case "OneRosterResourceInspect":
			renderOneRosterResourceInspect(state)
			break
		case "QtiMenu":
			renderQtiMenu()
			break
		case "QtiTestsList":
			renderQtiTestsList(state)
			break
		case "QtiTestInspect":
			renderQtiTestInspect(state)
			break
		case "QtiTestItemsList":
			renderQtiTestItemsList(state)
			break
		case "QtiItemsList":
			renderQtiItemsList(state)
			break
		case "QtiItemInspect":
			renderQtiItemInspect(state)
			break
		case "JsonDisplay":
			renderJsonDisplay(state)
			break
		case "Exit":
			clearScreen()
			console.log("Goodbye!")
			break
	}
}

// --- Command Parsing ---
function parseCommand(input: string, state: State): any {
	const parts = input.trim().split(/\s+/)
	if (parts.length === 0 || parts[0] === "") {
		return null
	}

	let [cmd, ...args] = parts

	// Resolve alias
	if (cmd && cmd in commandAliases) {
		cmd = commandAliases[cmd]!
	}

	// Build command object based on the command and arguments
	let commandObj: any = { cmd }

	// Handle commands with arguments
	if (cmd === "page" && args.length > 0) {
		commandObj.n = args[0]
	} else if (cmd === "size" && args.length > 0) {
		commandObj.n = args[0]
	} else if (cmd === "open" && args.length > 0) {
		commandObj.index = args[0]
	} else if (cmd === "json" && args.length > 0) {
		commandObj.index = args[0]
	} else if (cmd === "filter" && args.length > 0) {
		commandObj.expr = args.join(" ")
	} else if (cmd === "sort" && args.length > 0) {
		commandObj.field = args[0]
	} else if (cmd === "fetch" && args.length > 0) {
		// Parse fetch subcommands
		const fetchType = args[0]
		if (fetchType === "fuzzy" && args.length > 1) {
			commandObj.subCmd = { type: "fuzzy", query: args.slice(1).join(" ") }
		} else if (fetchType === "filter" && args.length > 1) {
			commandObj.subCmd = { type: "filter", expr: args.slice(1).join(" ") }
		} else if (fetchType === "limit" && args.length > 1) {
			commandObj.subCmd = { type: "limit", n: args[1] }
		} else {
			// Unknown fetch subcommand
			commandObj = null
		}
	} else if (cmd === "fetch" && args.length === 0) {
		// fetch with no args = fetch all
		commandObj.subCmd = { type: "all" }
	}

	// Select appropriate schema based on state
	let schema: z.ZodType<any>
	switch (state.kind) {
		case "MainMenu":
		case "OneRosterMenu":
		case "QtiMenu":
			schema = MenuCommandSchema
			break
		case "OneRosterResourcesList":
		case "QtiTestsList":
		case "QtiTestItemsList":
		case "QtiItemsList":
			schema = ListCommandSchema
			break
		case "OneRosterResourceInspect":
		case "QtiTestInspect":
		case "QtiItemInspect":
			schema = InspectCommandSchema
			break
		case "JsonDisplay":
			schema = GlobalCommandSchema // Only allow back/exit/help
			break
		default:
			schema = GlobalCommandSchema
	}

	const parseResult = schema.safeParse(commandObj)
	if (!parseResult.success) {
		console.log(`\nInvalid command. Error: ${parseResult.error.errors[0]?.message || "Unknown error"}`)
		return null
	}

	return parseResult.data
}

// --- State Transitions ---
async function handleMainMenu(state: MainMenuState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "1":
			return { kind: "OneRosterMenu" }
		case "2":
			return { kind: "QtiMenu" }
		case "3":
		case "exit":
			return { kind: "Exit" }
		case "help":
			printHelp(["1 - OneRoster", "2 - QTI", "3 - Exit", "exit - Exit the program"])
			return state
		default:
			return state
	}
}

async function handleOneRosterMenu(state: OneRosterMenuState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "1":
			return { kind: "OneRosterResourcesList" }
		case "2":
		case "back":
			return { kind: "MainMenu" }
		case "exit":
			return { kind: "Exit" }
		case "help":
			printHelp(["1 - Resources", "2 - Back to main menu", "back - Go back", "exit - Exit the program"])
			return state
		default:
			return state
	}
}

async function handleQtiMenu(state: QtiMenuState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "1":
			return { kind: "QtiTestsList" }
		case "2":
			return { kind: "QtiItemsList" }
		case "3":
		case "back":
			return { kind: "MainMenu" }
		case "exit":
			return { kind: "Exit" }
		case "help":
		printHelp([
			"1 - Assessment Tests",
			"2 - Assessment Items",
			"3 - Back to main menu",
			"back (b) - Go back",
			"exit (q) - Exit the program"
		])
			return state
		default:
			return state
	}
}

// Helper to apply client-side filters and sorting
function applyClientFilters(
	resources: OneRoster.Resource[],
	filter?: string,
	sortField?: string,
	sortOrder: "asc" | "desc" = "asc"
): OneRoster.Resource[] {
	let filtered = resources

	// Apply client filter
	if (filter) {
		const filterLower = filter.toLowerCase()
		filtered = resources.filter(
			(r) =>
				r.title.toLowerCase().includes(filterLower) ||
				r.sourcedId.toLowerCase().includes(filterLower) ||
				r.vendorResourceId.toLowerCase().includes(filterLower)
		)
	}

	// Apply sorting
	if (sortField) {
		filtered = [...filtered].sort((a, b) => {
			const aVal = (a as any)[sortField] || ""
			const bVal = (b as any)[sortField] || ""
			const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
			return sortOrder === "asc" ? cmp : -cmp
		})
	}

	return filtered
}

// Type-safe filter/sort helper for any entity type
function applyGenericFilters<T>(
	items: T[],
	clientFilter: string | undefined,
	sort: { field: keyof T; order: "asc" | "desc" } | undefined,
	// Function to get searchable text from an item
	getSearchableText: (item: T) => string
): T[] {
	let filtered = items

	if (clientFilter) {
		// Check if filter starts with ^ for prefix matching
		if (clientFilter.startsWith("^")) {
			const prefix = clientFilter.slice(1).toLowerCase()
			filtered = items.filter((item) => {
				const searchText = getSearchableText(item).toLowerCase()
				// Split by space to check each field separately
				const fields = searchText.split(" ")
				return fields.some(field => field.startsWith(prefix))
			})
		} else {
			// Regular substring search
			const filterLower = clientFilter.toLowerCase()
			filtered = items.filter((item) => getSearchableText(item).toLowerCase().includes(filterLower))
		}
	}

	if (sort) {
		const { field, order } = sort
		filtered = [...filtered].sort((a, b) => {
			const aVal = a[field] ?? ""
			const bVal = b[field] ?? ""
			const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
			return order === "asc" ? cmp : -cmp
		})
	}
	return filtered
}

async function handleOneRosterResourcesList(state: OneRosterResourcesListState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "fetch": {
			const subCmd = cmd.subCmd || { type: "all" }
			logger.info("fetching OneRoster resources", { fetchType: subCmd.type })
			
			let resources: OneRoster.Resource[]
			let fetchInfo: FetchInfo
			
			switch (subCmd.type) {
				case "fuzzy": {
					const result = await errors.try(
						retryWithBackoff(
							() => oneRosterClient.getAllResources({
								filter: `title~'${subCmd.query}' AND status='active'`
							}),
							`OneRoster fuzzy search: ${subCmd.query}`,
							{
								maxRetries: 3,
								initialDelayMs: 2000,
								maxDelayMs: 30000,
								jitterMs: 1000
							}
						)
					)
					if (result.error) {
						logger.error("failed to fetch resources with fuzzy search after retries", { error: result.error })
						console.error(`\n❌ Failed to fetch resources after all retries`)
						return state
					}
					resources = result.data
					fetchInfo = {
						type: "fuzzy",
						query: subCmd.query,
						timestamp: new Date(),
						count: resources.length
					}
					logger.info("fetched resources with fuzzy search", { count: resources.length, query: subCmd.query })
					break
				}
				
				case "filter": {
					const result = await errors.try(
						retryWithBackoff(
							() => oneRosterClient.getAllResources({
								filter: subCmd.expr
							}),
							`OneRoster filter: ${subCmd.expr}`,
							{
								maxRetries: 3,
								initialDelayMs: 2000,
								maxDelayMs: 30000,
								jitterMs: 1000
							}
						)
					)
					if (result.error) {
						logger.error("failed to fetch resources with filter after retries", { error: result.error })
						console.error(`\n❌ Failed to fetch resources after all retries`)
						return state
					}
					resources = result.data
					fetchInfo = {
						type: "filter",
						query: subCmd.expr,
						timestamp: new Date(),
						count: resources.length
					}
					logger.info("fetched resources with filter", { count: resources.length, filter: subCmd.expr })
					break
				}
				
				case "all":
				default: {
					const result = await errors.try(
						retryWithBackoff(
							() => oneRosterClient.getAllResources(),
							"OneRoster fetch all resources",
							{
								maxRetries: 3,
								initialDelayMs: 2000,
								maxDelayMs: 30000,
								jitterMs: 1000
							}
						)
					)
					if (result.error) {
						logger.error("failed to fetch all resources after retries", { error: result.error })
						console.error(`\n❌ Failed to fetch resources after all retries`)
						return state
					}
					resources = result.data
					fetchInfo = {
						type: "all",
						timestamp: new Date(),
						count: resources.length
					}
					logger.info("fetched all resources", { count: resources.length })
					break
				}
			}

			// Store in cache
			cache.oneRosterResources.data = resources
			cache.oneRosterResources.fetchInfo = fetchInfo

			// Apply existing view filters to the newly fetched data
			const filtered = applyClientFilters(resources, state.clientFilter, state.sortField, state.sortOrder)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			
			console.log(`\n✓ Fetched ${resources.length} resources`)
			
			return { ...state, paginator }
		}
		
		case "list": {
			const { data } = cache.oneRosterResources
			if (!data) {
				console.log("\nNo data fetched yet. Use 'fetch' first.")
				return state
			}
			
			// Refresh view with current filters
			const filtered = applyClientFilters(data, state.clientFilter, state.sortField, state.sortOrder)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...state, paginator }
		}

		case "next": {
			const { data } = cache.oneRosterResources
			if (!data || !state.paginator) {
				console.log("\nNo data to navigate. Use 'fetch' first.")
				return state
			}
			if (state.paginator.currentPage >= state.paginator.totalPages) {
				console.log("\nAlready on last page.")
				return state
			}
			const filtered = applyClientFilters(data, state.clientFilter, state.sortField, state.sortOrder)
			const paginator = createPaginator(filtered, state.paginator.currentPage + 1, state.paginator.pageSize)
			return { ...state, paginator }
		}

		case "prev": {
			const { data } = cache.oneRosterResources
			if (!data || !state.paginator) {
				console.log("\nNo data to navigate. Use 'fetch' first.")
				return state
			}
			if (state.paginator.currentPage <= 1) {
				console.log("\nAlready on first page.")
				return state
			}
			const filtered = applyClientFilters(data, state.clientFilter, state.sortField, state.sortOrder)
			const paginator = createPaginator(filtered, state.paginator.currentPage - 1, state.paginator.pageSize)
			return { ...state, paginator }
		}

		case "page": {
			const { data } = cache.oneRosterResources
			if (!data || !state.paginator) {
				console.log("\nNo data to navigate. Use 'fetch' first.")
				return state
			}
			if (cmd.n < 1 || cmd.n > state.paginator.totalPages) {
				console.log(`\nPage must be between 1 and ${state.paginator.totalPages}.`)
				return state
			}
			const filtered = applyClientFilters(data, state.clientFilter, state.sortField, state.sortOrder)
			const paginator = createPaginator(filtered, cmd.n, state.paginator.pageSize)
			return { ...state, paginator }
		}

		case "size": {
			const { data } = cache.oneRosterResources
			if (!data) {
				console.log("\nNo data loaded. Use 'fetch' first.")
				return state
			}
			const filtered = applyClientFilters(data, state.clientFilter, state.sortField, state.sortOrder)
			const paginator = createPaginator(filtered, 1, cmd.n)
			return { ...state, paginator }
		}

		case "open": {
			const { data } = cache.oneRosterResources
			if (!data || !state.paginator) {
				console.log("\nNo data loaded. Use 'fetch' first.")
				return state
			}
			const globalIdx = cmd.index
			const pageStartIdx = (state.paginator.currentPage - 1) * state.paginator.pageSize
			const localIdx = globalIdx - pageStartIdx

			if (localIdx < 0 || localIdx >= state.paginator.items.length) {
				console.log(`\nIndex ${cmd.index} not found on current page.`)
				return state
			}

			const resource = state.paginator.items[localIdx]
			if (!resource) {
				console.log(`\nResource at index ${cmd.index} not found.`)
				return state
			}
			viewStack.push(state) // Push current view state before navigating
			return { kind: "OneRosterResourceInspect", resource, prevState: state }
		}

		case "filter": {
			const { data } = cache.oneRosterResources
			if (!data) {
				console.log("\nNo data to filter. Use 'fetch' first.")
				return state
			}
			const newState = { ...state, clientFilter: cmd.expr }
			const filtered = applyClientFilters(data, cmd.expr, state.sortField, state.sortOrder)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...newState, paginator }
		}

		case "sort": {
			const { data } = cache.oneRosterResources
			if (!data) {
				console.log("\nNo data to sort. Use 'fetch' first.")
				return state
			}
			
			const sortKey = resourceSortableFields[cmd.field]
			if (!sortKey) {
				console.error(`\nInvalid sort field. Available: ${Object.keys(resourceSortableFields).join(", ")}`)
				return state
			}
			
			const newOrder: "asc" | "desc" = state.sortField === sortKey && state.sortOrder === "asc" ? "desc" : "asc"
			const newState = { ...state, sortField: sortKey, sortOrder: newOrder }
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				{ field: sortKey, order: newOrder },
				(item) => `${item.sourcedId} ${item.title} ${item.vendorResourceId}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...newState, paginator }
		}

		case "clear": {
			const { data } = cache.oneRosterResources
			if (!data) {
				console.log("\nNo data loaded.")
				return state
			}
			const newState = { ...state, clientFilter: undefined, sortField: undefined, sortOrder: undefined }
			const filtered = applyGenericFilters(
				data,
				undefined,
				undefined,
				(item) => `${item.sourcedId} ${item.title} ${item.vendorResourceId}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...newState, paginator }
		}

		case "json": {
			const { data } = cache.oneRosterResources
			if (!data || !state.paginator) {
				console.log("\nNo data loaded. Use 'fetch' first.")
				return state
			}
			const globalIdx = cmd.index
			const pageStartIdx = (state.paginator.currentPage - 1) * state.paginator.pageSize
			const localIdx = globalIdx - pageStartIdx

			if (localIdx < 0 || localIdx >= state.paginator.items.length) {
				console.log(`\nIndex ${cmd.index} not found on current page.`)
				return state
			}

			const resource = state.paginator.items[localIdx]
			if (!resource) {
				console.log(`\nResource at index ${cmd.index} not found.`)
				return state
			}
			console.log("\n" + JSON.stringify(resource, null, 2))
			return state
		}

		case "fields": {
			console.log("\nAvailable fields: sourcedId, title, status, format, vendorResourceId, vendorId, applicationId, importance, roles, metadata")
			console.log("Sortable fields: sourcedId, title, status, vendorResourceId")
			return state
		}

		case "back":
			return { kind: "OneRosterMenu" }

		case "exit":
			return { kind: "Exit" }

		case "help":
			printHelp([
				"== Fetch Commands (Database Operations) ==",
				"fetch - Fetch all resources",
				"fetch fuzzy <query> - Fuzzy search by title",
				"fetch filter <expr> - OneRoster filter expression",
				"",
				"== View Commands (Local Operations) ==",
				"list - Refresh current view",
				"next/prev - Navigate pages",
				"page <n> - Go to page n",
				"size <n> - Set page size",
				"filter <expr> - Client-side filter (use ^prefix for prefix match)",
				"sort <field> - Sort by field",
				"clear - Clear all filters",
				"",
				"== Inspection Commands ==",
				"open <index> - Inspect resource",
				"json <index> - Show JSON",
				"fields - Show available fields",
				"",
				"back - Go back",
				"exit - Exit the program"
			])
			return state

		default:
			return state
	}
}

async function handleOneRosterResourceInspect(state: OneRosterResourceInspectState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "json":
			viewStack.push(state)
			return { 
				kind: "JsonDisplay", 
				data: state.resource, 
				title: `OneRoster Resource: ${state.resource.title}`,
				prevState: state 
			}

		case "fields":
			// For fields, just redraw the current state which shows fields by default
			return state

		case "back":
			const prevState = viewStack.pop()
			return prevState || { kind: "OneRosterResourcesList" } // Fallback if stack is empty

		case "exit":
			return { kind: "Exit" }

		case "help":
			printHelp(["json - Show full JSON", "fields - Show key fields", "back - Go back", "exit - Exit the program"])
			return state

		default:
			return state
	}
}

async function handleQtiTestsList(state: QtiTestsListState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "fetch": {
			const subCmd = cmd.subCmd || { type: "all" }
			logger.info("fetching QTI tests", { fetchType: subCmd.type })
			
			let tests: Qti.AssessmentTest[]
			let fetchInfo: FetchInfo
			
			switch (subCmd.type) {
				case "all":
				default: {
					// Fetch ALL tests by paginating through results
					tests = []
					let page = 1
					const limit = 1000
					let hasMore = true
					
					console.log("\nFetching tests...")
					
					while (hasMore) {
						const pageResult = await errors.try(
							retryWithBackoff(
								() => qtiClient.searchAssessmentTests({
									page,
									limit
								}),
								`QTI Tests fetch page ${page}`,
								{
									maxRetries: 3,
									initialDelayMs: 2000,
									maxDelayMs: 30000,
									jitterMs: 1000
								}
							)
						)
						if (pageResult.error) {
							logger.error("failed to fetch tests page after retries", { error: pageResult.error, page })
							console.error(`\n❌ Failed to fetch page ${page} after all retries`)
							console.error(`\nPartial results: ${tests.length} tests fetched so far`)
							
							// Still return partial results rather than nothing
							if (tests.length > 0) {
								console.log(`\n⚠️  Returning partial results (${tests.length} tests)`)
								break
							}
							return state
						}
						
						tests.push(...pageResult.data.items)
						console.log(`  Fetched page ${page} (${pageResult.data.items.length} items, total: ${tests.length})`)
						
						// Check if we have more pages
						const totalPages = Math.ceil(pageResult.data.total / limit)
						hasMore = page < totalPages
						page++
					}
					
					fetchInfo = {
						type: "all",
						timestamp: new Date(),
						count: tests.length
					}
					logger.info("fetched all tests", { count: tests.length })
					break
				}
			}

			// Store in cache
			cache.qtiTests.data = tests
			cache.qtiTests.fetchInfo = fetchInfo

			// Apply existing view filters to the newly fetched data
			const filtered = applyGenericFilters(
				tests,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			
			console.log(`\n✓ Fetched ${tests.length} tests`)
			
			return { ...state, paginator }
		}
		
		case "list": {
			const { data } = cache.qtiTests
			if (!data) {
				console.log("\nNo data fetched yet. Use 'fetch' first.")
				return state
			}
			
			// Refresh view with current filters
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...state, paginator }
		}

		case "next": {
			const { data } = cache.qtiTests
			if (!data || !state.paginator) {
				console.log("\nNo data to navigate. Use 'fetch' first.")
				return state
			}
			if (state.paginator.currentPage >= state.paginator.totalPages) {
				console.log("\nAlready on last page.")
				return state
			}
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, state.paginator.currentPage + 1, state.paginator.pageSize)
			return { ...state, paginator }
		}

		case "prev": {
			const { data } = cache.qtiTests
			if (!data || !state.paginator) {
				console.log("\nNo data to navigate. Use 'fetch' first.")
				return state
			}
			if (state.paginator.currentPage <= 1) {
				console.log("\nAlready on first page.")
				return state
			}
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, state.paginator.currentPage - 1, state.paginator.pageSize)
			return { ...state, paginator }
		}

		case "page": {
			const { data } = cache.qtiTests
			if (!data || !state.paginator) {
				console.log("\nNo data to navigate. Use 'fetch' first.")
				return state
			}
			if (cmd.n < 1 || cmd.n > state.paginator.totalPages) {
				console.log(`\nPage must be between 1 and ${state.paginator.totalPages}.`)
				return state
			}
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, cmd.n, state.paginator.pageSize)
			return { ...state, paginator }
		}

		case "size": {
			const { data } = cache.qtiTests
			if (!data) {
				console.log("\nNo data loaded. Use 'fetch' first.")
				return state
			}
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, cmd.n)
			return { ...state, paginator }
		}

		case "open": {
			const { data } = cache.qtiTests
			if (!data || !state.paginator) {
				console.log("\nNo data loaded. Use 'fetch' first.")
				return state
			}
			const globalIdx = cmd.index
			const pageStartIdx = (state.paginator.currentPage - 1) * state.paginator.pageSize
			const localIdx = globalIdx - pageStartIdx

			if (localIdx < 0 || localIdx >= state.paginator.items.length) {
				console.log(`\nIndex ${cmd.index} not found on current page.`)
				return state
			}

			const test = state.paginator.items[localIdx]
			if (!test) {
				console.log(`\nTest at index ${cmd.index} not found.`)
				return state
			}
			viewStack.push(state) // Push current view state before navigating
			return { kind: "QtiTestInspect", test, prevState: state }
		}

		case "filter": {
			const { data } = cache.qtiTests
			if (!data) {
				console.log("\nNo data to filter. Use 'fetch' first.")
				return state
			}
			const newState = { ...state, clientFilter: cmd.expr }
			const filtered = applyGenericFilters(
				data,
				cmd.expr,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...newState, paginator }
		}

		case "sort": {
			const { data } = cache.qtiTests
			if (!data) {
				console.log("\nNo data to sort. Use 'fetch' first.")
				return state
			}
			const sortKey = qtiTestSortableFields[cmd.field]
			if (!sortKey) {
				console.error(`\nInvalid sort field. Available: ${Object.keys(qtiTestSortableFields).join(", ")}`)
				return state
			}
			
			const newOrder: "asc" | "desc" = state.sortField === sortKey && state.sortOrder === "asc" ? "desc" : "asc"
			const newState = { ...state, sortField: sortKey, sortOrder: newOrder }
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				{ field: sortKey, order: newOrder },
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...newState, paginator }
		}

		case "clear": {
			const { data } = cache.qtiTests
			if (!data) {
				console.log("\nNo data loaded.")
				return state
			}
			const newState = { ...state, clientFilter: undefined, sortField: undefined, sortOrder: undefined }
			const filtered = applyGenericFilters(
				data,
				undefined,
				undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...newState, paginator }
		}

		case "json": {
			const { data } = cache.qtiTests
			if (!data || !state.paginator) {
				console.log("\nNo data loaded. Use 'fetch' first.")
				return state
			}
			const globalIdx = cmd.index
			const pageStartIdx = (state.paginator.currentPage - 1) * state.paginator.pageSize
			const localIdx = globalIdx - pageStartIdx

			if (localIdx < 0 || localIdx >= state.paginator.items.length) {
				console.log(`\nIndex ${cmd.index} not found on current page.`)
				return state
			}

			const test = state.paginator.items[localIdx]
			if (!test) {
				console.log(`\nTest at index ${cmd.index} not found.`)
				return state
			}
			console.log("\n" + JSON.stringify(test, null, 2))
			return state
		}

		case "fields": {
			console.log("\nAvailable fields: identifier, title, qtiVersion, timeLimit, maxAttempts, toolsEnabled, metadata, createdAt, updatedAt")
			console.log("Sortable fields: identifier, title, createdAt, updatedAt")
			return state
		}

		case "back":
			return { kind: "QtiMenu" }

		case "exit":
			return { kind: "Exit" }

		case "help":
			printHelp([
				"== Fetch Commands ==",
				"fetch - Fetch all tests",
				"",
				"== View Commands ==",
				"list - Refresh view",
				"next/prev - Navigate pages",
				"page <n> - Go to page",
				"size <n> - Set page size",
				"filter <expr> - Client filter (use ^prefix for prefix match)",
				"sort <field> - Sort data",
				"clear - Clear filters",
				"",
				"== Inspection ==",
				"open <index> - Inspect test",
				"json <index> - Show JSON",
				"fields - Show fields",
				"",
				"back - Go back",
				"exit - Exit"
			])
			return state

		default:
			return state
	}
}

async function handleQtiTestInspect(state: QtiTestInspectState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "json":
			viewStack.push(state)
			return { 
				kind: "JsonDisplay", 
				data: state.test, 
				title: `Assessment Test: ${state.test.title}`,
				prevState: state 
			}

		case "fields":
			// For fields, just redraw the current state which shows fields by default
			return state
			
		case "items":
			viewStack.push(state)
			return {
				kind: "QtiTestItemsList",
				test: state.test,
				prevState: state
			}

		case "back":
			const prevState = viewStack.pop()
			return prevState || { kind: "QtiTestsList" } // Fallback if stack is empty

		case "exit":
			return { kind: "Exit" }

		case "help":
			printHelp(["items (i) - List assessment items in this test", "json (j) - Show full JSON", "fields - Show key fields", "back - Go back", "exit - Exit the program"])
			return state

		default:
			return state
	}
}

async function handleQtiTestItemsList(state: QtiTestItemsListState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "back":
			const prevState = viewStack.pop()
			return prevState || state.prevState

		case "exit":
			return { kind: "Exit" }

		case "help":
			printHelp([
				"back (b) - Go back to test",
				"exit (q) - Exit"
			])
			return state

		default:
			console.log("\n⚠️  This feature is not yet available. Use 'back' to return.")
			return state
	}
}

async function handleQtiItemsList(state: QtiItemsListState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "fetch": {
			const subCmd = cmd.subCmd || { type: "all" }
			logger.info("fetching QTI items", { fetchType: subCmd.type })
			
			let items: Qti.AssessmentItem[]
			let fetchInfo: FetchInfo
			
			switch (subCmd.type) {
				case "all":
				default: {
					// Fetch ALL items by paginating through results
					items = []
					let page = 1
					const limit = 1000
					let hasMore = true
					
					console.log("\nFetching items...")
					
					while (hasMore) {
						const pageResult = await errors.try(
							retryWithBackoff(
								() => qtiClient.searchAssessmentItems({
									page,
									limit
								}),
								`QTI Items fetch page ${page}`,
								{
									maxRetries: 3,
									initialDelayMs: 2000,
									maxDelayMs: 30000,
									jitterMs: 1000
								}
							)
						)
						if (pageResult.error) {
							logger.error("failed to fetch items page after retries", { error: pageResult.error, page })
							console.error(`\n❌ Failed to fetch page ${page} after all retries`)
							console.error(`\nPartial results: ${items.length} items fetched so far`)
							
							// Still return partial results rather than nothing
							if (items.length > 0) {
								console.log(`\n⚠️  Returning partial results (${items.length} items)`)
								break
							}
							return state
						}
						
						items.push(...pageResult.data.items)
						console.log(`  Fetched page ${page} (${pageResult.data.items.length} items, total: ${items.length})`)
						
						// Check if we have more pages
						const totalPages = Math.ceil(pageResult.data.total / limit)
						hasMore = page < totalPages
						page++
					}
					
					fetchInfo = {
						type: "all",
						timestamp: new Date(),
						count: items.length
					}
					logger.info("fetched all items", { count: items.length })
					break
				}
			}

			// Store in cache
			cache.qtiItems.data = items
			cache.qtiItems.fetchInfo = fetchInfo

			// Apply existing view filters to the newly fetched data
			const filtered = applyGenericFilters(
				items,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			
			console.log(`\n✓ Fetched ${items.length} items`)
			
			return { ...state, paginator }
		}
		
		case "list": {
			const { data } = cache.qtiItems
			if (!data) {
				console.log("\nNo data fetched yet. Use 'fetch' first.")
				return state
			}
			
			// Refresh view with current filters
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...state, paginator }
		}

		case "next": {
			const { data } = cache.qtiItems
			if (!data || !state.paginator) {
				console.log("\nNo data to navigate. Use 'fetch' first.")
				return state
			}
			if (state.paginator.currentPage >= state.paginator.totalPages) {
				console.log("\nAlready on last page.")
				return state
			}
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, state.paginator.currentPage + 1, state.paginator.pageSize)
			return { ...state, paginator }
		}

		case "prev": {
			const { data } = cache.qtiItems
			if (!data || !state.paginator) {
				console.log("\nNo data to navigate. Use 'fetch' first.")
				return state
			}
			if (state.paginator.currentPage <= 1) {
				console.log("\nAlready on first page.")
				return state
			}
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, state.paginator.currentPage - 1, state.paginator.pageSize)
			return { ...state, paginator }
		}

		case "page": {
			const { data } = cache.qtiItems
			if (!data || !state.paginator) {
				console.log("\nNo data to navigate. Use 'fetch' first.")
				return state
			}
			if (cmd.n < 1 || cmd.n > state.paginator.totalPages) {
				console.log(`\nPage must be between 1 and ${state.paginator.totalPages}.`)
				return state
			}
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, cmd.n, state.paginator.pageSize)
			return { ...state, paginator }
		}

		case "size": {
			const { data } = cache.qtiItems
			if (!data) {
				console.log("\nNo data loaded. Use 'fetch' first.")
				return state
			}
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, cmd.n)
			return { ...state, paginator }
		}

		case "open": {
			const { data } = cache.qtiItems
			if (!data || !state.paginator) {
				console.log("\nNo data loaded. Use 'fetch' first.")
				return state
			}
			const globalIdx = cmd.index
			const pageStartIdx = (state.paginator.currentPage - 1) * state.paginator.pageSize
			const localIdx = globalIdx - pageStartIdx

			if (localIdx < 0 || localIdx >= state.paginator.items.length) {
				console.log(`\nIndex ${cmd.index} not found on current page.`)
				return state
			}

			const item = state.paginator.items[localIdx]
			if (!item) {
				console.log(`\nItem at index ${cmd.index} not found.`)
				return state
			}
			viewStack.push(state) // Push current view state before navigating
			return { kind: "QtiItemInspect", item, prevState: state }
		}

		case "filter": {
			const { data } = cache.qtiItems
			if (!data) {
				console.log("\nNo data to filter. Use 'fetch' first.")
				return state
			}
			const newState = { ...state, clientFilter: cmd.expr }
			const filtered = applyGenericFilters(
				data,
				cmd.expr,
				state.sortField ? { field: state.sortField, order: state.sortOrder || "asc" } : undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...newState, paginator }
		}

		case "sort": {
			const { data } = cache.qtiItems
			if (!data) {
				console.log("\nNo data to sort. Use 'fetch' first.")
				return state
			}
			
			const sortKey = qtiItemSortableFields[cmd.field]
			if (!sortKey) {
				console.error(`\nInvalid sort field. Available: ${Object.keys(qtiItemSortableFields).join(", ")}`)
				return state
			}
			
			const newOrder: "asc" | "desc" = state.sortField === sortKey && state.sortOrder === "asc" ? "desc" : "asc"
			const newState = { ...state, sortField: sortKey, sortOrder: newOrder }
			const filtered = applyGenericFilters(
				data,
				state.clientFilter,
				{ field: sortKey, order: newOrder },
				(item) => `${item.identifier} ${item.title} ${item.type}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...newState, paginator }
		}

		case "clear": {
			const { data } = cache.qtiItems
			if (!data) {
				console.log("\nNo data loaded.")
				return state
			}
			const newState = { ...state, clientFilter: undefined, sortField: undefined, sortOrder: undefined }
			const filtered = applyGenericFilters(
				data,
				undefined,
				undefined,
				(item) => `${item.identifier} ${item.title}`
			)
			const paginator = createPaginator(filtered, 1, state.paginator?.pageSize || DEFAULT_PAGE_SIZE)
			return { ...newState, paginator }
		}

		case "json": {
			const { data } = cache.qtiItems
			if (!data || !state.paginator) {
				console.log("\nNo data loaded. Use 'fetch' first.")
				return state
			}
			const globalIdx = cmd.index
			const pageStartIdx = (state.paginator.currentPage - 1) * state.paginator.pageSize
			const localIdx = globalIdx - pageStartIdx

			if (localIdx < 0 || localIdx >= state.paginator.items.length) {
				console.log(`\nIndex ${cmd.index} not found on current page.`)
				return state
			}

			const item = state.paginator.items[localIdx]
			if (!item) {
				console.log(`\nItem at index ${cmd.index} not found.`)
				return state
			}
			console.log("\n" + JSON.stringify(item, null, 2))
			return state
		}

		case "fields": {
			console.log("\nAvailable fields: identifier, title, type, qtiVersion, timeDependent, adaptive, responseDeclarations, outcomeDeclarations, metadata, createdAt, updatedAt")
			console.log("Sortable fields: identifier, title, type, createdAt, updatedAt")
			return state
		}

		case "back":
			return { kind: "QtiMenu" }

		case "exit":
			return { kind: "Exit" }

		case "help":
			printHelp([
				"== Fetch Commands ==",
				"fetch - Fetch all items",
				"",
				"== View Commands ==",
				"list - Refresh view",
				"next/prev - Navigate pages",
				"page <n> - Go to page",
				"size <n> - Set page size",
				"filter <expr> - Client filter (use ^prefix for prefix match)",
				"sort <field> - Sort data",
				"clear - Clear filters",
				"",
				"== Inspection ==",
				"open <index> - Inspect item",
				"json <index> - Show JSON",
				"fields - Show fields",
				"",
				"back - Go back",
				"exit - Exit"
			])
			return state

		default:
			return state
	}
}

async function handleQtiItemInspect(state: QtiItemInspectState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "json":
			viewStack.push(state)
			return { 
				kind: "JsonDisplay", 
				data: state.item, 
				title: `Assessment Item: ${state.item.title}`,
				prevState: state 
			}

		case "fields":
			// For fields, just redraw the current state which shows fields by default
			return state

		case "back":
			const prevState = viewStack.pop()
			return prevState || { kind: "QtiItemsList" } // Fallback if stack is empty

		case "exit":
			return { kind: "Exit" }

		case "help":
			printHelp(["json - Show full JSON", "fields - Show key fields", "back - Go back", "exit - Exit the program"])
			return state

		default:
			return state
	}
}

async function handleJsonDisplay(state: JsonDisplayState, cmd: any): Promise<State> {
	switch (cmd.cmd) {
		case "back":
			const prevState = viewStack.pop()
			return prevState || state.prevState
		case "exit":
			return { kind: "Exit" }
		case "help":
			printHelp(["back (b) - Go back", "exit (q) - Exit"])
			return state
		default:
			return state
	}
}

async function transition(state: State, cmd: any): Promise<State> {
	switch (state.kind) {
		case "MainMenu":
			return handleMainMenu(state, cmd)
		case "OneRosterMenu":
			return handleOneRosterMenu(state, cmd)
		case "OneRosterResourcesList":
			return handleOneRosterResourcesList(state, cmd)
		case "OneRosterResourceInspect":
			return handleOneRosterResourceInspect(state, cmd)
		case "QtiMenu":
			return handleQtiMenu(state, cmd)
		case "QtiTestsList":
			return handleQtiTestsList(state, cmd)
		case "QtiTestInspect":
			return handleQtiTestInspect(state, cmd)
		case "QtiTestItemsList":
			return handleQtiTestItemsList(state, cmd)
		case "QtiItemsList":
			return handleQtiItemsList(state, cmd)
		case "QtiItemInspect":
			return handleQtiItemInspect(state, cmd)
		case "JsonDisplay":
			return handleJsonDisplay(state, cmd)
		case "Exit":
			return state
		default:
			return state
	}
}

// --- Main Loop ---
async function main() {
	// Initialize clients using env from @/env.js
	oneRosterClient = new OneRoster.Client({
		serverUrl: env.TIMEBACK_ONEROSTER_SERVER_URL,
		tokenUrl: env.TIMEBACK_TOKEN_URL,
		clientId: env.TIMEBACK_CLIENT_ID,
		clientSecret: env.TIMEBACK_CLIENT_SECRET
	})

	qtiClient = new Qti.Client({
		serverUrl: env.TIMEBACK_QTI_SERVER_URL,
		tokenUrl: env.TIMEBACK_TOKEN_URL,
		clientId: env.TIMEBACK_CLIENT_ID,
		clientSecret: env.TIMEBACK_CLIENT_SECRET
	})
	
	// Clear error log from previous runs
	const unlinkResult = await errors.try(fs.unlink(ERROR_LOG_FILE))
	if (unlinkResult.error) {
		// File doesn't exist, that's fine
		logger.debug("error log file doesn't exist yet", { file: ERROR_LOG_FILE })
	}
	
	console.log(`\n📝 Errors will be logged to: ${ERROR_LOG_FILE}`)
	console.log(`   You can tail it in another terminal: tail -f ${ERROR_LOG_FILE} | jq .`)
	console.log(`   Or use tee to save all output: bun run ${process.argv[1]} | tee spelunker.log\n`)

	// Initialize readline
	rl = readline.createInterface({ input, output })

	// Initialize state
	let state: State = { kind: "MainMenu" }

	// Main loop
	while (state.kind !== "Exit") {
		render(state)

		const answer = await rl.question("\n> ")
		const cmd = parseCommand(answer, state)

		if (cmd) {
			state = await transition(state, cmd)
		}
	}

	rl.close()
	process.exit(0)
}

// Error handling wrapper
const result = await errors.try(main())
if (result.error) {
	logger.error("unhandled error in main", { error: result.error })
	process.exit(1)
}
