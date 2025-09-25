#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"

logger.setDefaultLogLevel(logger.DEBUG)

// --- HELP TEXT ---
const HELP_TEXT = `
fix-duplicate-anchor-ordering.ts - Fix duplicate ordering values for videos/articles

SYNOPSIS
  bun scripts/fix-duplicate-anchor-ordering.ts [OPTIONS]

DESCRIPTION
  This script identifies and optionally fixes lessons where multiple videos/articles 
  have the same ordering value (duplicate anchor orderings).
  
  The issue: Some lessons have multiple videos or articles with the same ordering
  value, which violates the expected unique ordering within a lesson.
  
  The fix: This script compacts all content (videos, articles, exercises) into a
  contiguous 0..N-1 sequence, preserving their relative order based on:
  1. Current ordering value (ascending)
  2. Content type priority (Video > Article > Exercise)
  3. Content ID as tiebreaker
  
  By default, runs in dry-run mode showing what would change without writing.

OPTIONS
  --dry-run
      Default mode. Shows what would be changed without writing to database.
      
  --commit
      Actually update the database. Mutually exclusive with --dry-run.
      
  --only-lesson-id=<id>
      Process only the specified lesson ID instead of all lessons.
      
  --help
      Show this help message and exit.

EXAMPLES
  # Identify all lessons with duplicate anchor orderings (dry run)
  bun scripts/fix-duplicate-anchor-ordering.ts
  
  # Fix a specific lesson
  bun scripts/fix-duplicate-anchor-ordering.ts --commit --only-lesson-id="x3b58e08114748aed"
  
  # Fix all problematic lessons
  bun scripts/fix-duplicate-anchor-ordering.ts --commit

SAFETY
  - All content is renumbered to maintain contiguous 0..N-1 ordering
  - Relative order is preserved based on current ordering, type, and ID
  - All updates happen in transactions
  - Only the 'ordering' field is updated
`

// --- CLI PARSING ---
const CliArgsSchema = z.object({
	dryRun: z.boolean(),
	commit: z.boolean(),
	lessonId: z.string().min(1).optional(),
	help: z.boolean()
})

type CliArgs = z.infer<typeof CliArgsSchema>

function parseCliArgs(argv: string[]): CliArgs {
	const flags: Record<string, string | boolean> = {}
	
	for (const arg of argv) {
		if (arg.startsWith("--")) {
			const [key, value] = arg.split("=", 2)
			if (!key) {
				throw errors.new("cli parse: invalid argument format")
			}
			if (value === undefined) {
				flags[key] = true
			} else {
				flags[key] = value
			}
		}
	}

	// Check for help first
	if (flags["--help"] === true) {
		console.log(HELP_TEXT)
		process.exit(0)
	}

	// Default behavior: dry-run unless --commit is explicitly provided
	const commit = flags["--commit"] === true
	const dryRun = !commit

	const parsed = {
		dryRun,
		commit,
		lessonId: typeof flags["--only-lesson-id"] === "string" ? flags["--only-lesson-id"] : undefined,
		help: false
	}

	const validationResult = CliArgsSchema.safeParse(parsed)
	if (!validationResult.success) {
		logger.error("cli validation failed", { 
			error: validationResult.error,
			flags,
			parsed
		})
		console.error("\nUse --help for usage information\n")
		throw errors.wrap(validationResult.error, "cli validation")
	}

	return validationResult.data
}

// --- TYPE DEFINITIONS ---
type LessonContentRow = {
	lessonId: string
	contentId: string
	contentType: "Video" | "Article" | "Exercise"
	ordering: number
}

type ContentUpdate = {
	contentId: string
	from: number
	to: number
}

type DuplicateInfo = {
	ordering: number
	contentIds: string[]
	contentTypes: string[]
}

// --- HELPER FUNCTIONS ---
function identifyDuplicateAnchorOrderings(rows: LessonContentRow[]): DuplicateInfo[] {
	// Group anchors (non-exercises) by ordering
	const anchorsByOrdering = new Map<number, LessonContentRow[]>()
	
	for (const row of rows) {
		if (row.contentType !== "Exercise") {
			const existing = anchorsByOrdering.get(row.ordering) || []
			existing.push(row)
			anchorsByOrdering.set(row.ordering, existing)
		}
	}
	
	// Find orderings with duplicates
	const duplicates: DuplicateInfo[] = []
	for (const [ordering, anchors] of anchorsByOrdering) {
		if (anchors.length > 1) {
			duplicates.push({
				ordering,
				contentIds: anchors.map(a => a.contentId),
				contentTypes: anchors.map(a => a.contentType)
			})
		}
	}
	
	return duplicates
}

function computeCompactOrdering(rows: LessonContentRow[]): ContentUpdate[] {
	// Sort by: ordering (asc), then type priority (Video > Article > Exercise), then contentId
	const typePriority = { Video: 0, Article: 1, Exercise: 2 }
	
	const sortedRows = [...rows].sort((a, b) => {
		if (a.ordering !== b.ordering) return a.ordering - b.ordering
		if (a.contentType !== b.contentType) {
			return typePriority[a.contentType] - typePriority[b.contentType]
		}
		return a.contentId.localeCompare(b.contentId)
	})
	
	// Assign new contiguous ordering
	const updates: ContentUpdate[] = []
	for (let i = 0; i < sortedRows.length; i++) {
		const row = sortedRows[i]
		if (!row) {
			throw errors.new("algorithm error: row undefined")
		}
		if (row.ordering !== i) {
			updates.push({
				contentId: row.contentId,
				from: row.ordering,
				to: i
			})
		}
	}
	
	return updates
}

// --- DATABASE OPERATIONS ---
async function fetchLessonIds(args: { onlyLessonId?: string }): Promise<string[]> {
	if (args.onlyLessonId) {
		logger.debug("fetching single lesson", { lessonId: args.onlyLessonId })
		return [args.onlyLessonId]
	}

	logger.debug("fetching all lesson ids")
	const query = db
		.select({ lessonId: schema.niceLessonContents.lessonId })
		.from(schema.niceLessonContents)
		.groupBy(schema.niceLessonContents.lessonId)
		.orderBy(schema.niceLessonContents.lessonId)

	const result = await errors.try(query)
	if (result.error) {
		logger.error("failed to fetch lesson ids", { error: result.error })
		throw errors.wrap(result.error, "fetch lesson ids")
	}

	logger.debug("fetched lesson ids", { count: result.data.length })
	return result.data.map((row) => row.lessonId)
}

async function fetchAllLessonContent(lessonIds: string[]): Promise<Map<string, LessonContentRow[]>> {
	logger.info("batch fetching lesson content", { count: lessonIds.length })
	
	if (lessonIds.length === 0) {
		return new Map()
	}

	const result = await errors.try(
		db
			.select({
				lessonId: schema.niceLessonContents.lessonId,
				contentId: schema.niceLessonContents.contentId,
				contentType: schema.niceLessonContents.contentType,
				ordering: schema.niceLessonContents.ordering
			})
			.from(schema.niceLessonContents)
			.where(inArray(schema.niceLessonContents.lessonId, lessonIds))
			.orderBy(
				schema.niceLessonContents.lessonId,
				schema.niceLessonContents.ordering
			)
	)
	if (result.error) {
		logger.error("failed to batch fetch lesson content", { error: result.error })
		throw errors.wrap(result.error, "batch fetch lesson content")
	}

	// Group by lessonId
	const lessonMap = new Map<string, LessonContentRow[]>()
	for (const row of result.data) {
		const lessonRows = lessonMap.get(row.lessonId) || []
		lessonRows.push(row as LessonContentRow)
		lessonMap.set(row.lessonId, lessonRows)
	}

	logger.info("batch fetch complete", { 
		lessonsWithContent: lessonMap.size,
		totalRows: result.data.length 
	})
	
	return lessonMap
}

async function updateContentOrderings(
	lessonId: string,
	updates: ContentUpdate[]
): Promise<void> {
	if (updates.length === 0) {
		return
	}

	logger.debug("applying content ordering updates", { 
		lessonId, 
		updateCount: updates.length 
	})

	const transactionResult = await errors.try(
		db.transaction(async (tx) => {
			for (const update of updates) {
				const updateResult = await errors.try(
					tx
						.update(schema.niceLessonContents)
						.set({ ordering: update.to })
						.where(
							and(
								eq(schema.niceLessonContents.lessonId, lessonId),
								eq(schema.niceLessonContents.contentId, update.contentId)
							)
						)
				)
				if (updateResult.error) {
					logger.error("failed to update content ordering", {
						lessonId,
						contentId: update.contentId,
						from: update.from,
						to: update.to,
						error: updateResult.error
					})
					throw errors.wrap(updateResult.error, "update content ordering")
				}
			}
		})
	)
	if (transactionResult.error) {
		logger.error("failed to execute ordering update transaction", { 
			lessonId, 
			error: transactionResult.error 
		})
		throw errors.wrap(transactionResult.error, "ordering update transaction")
	}
}

// --- MAIN SCRIPT ---
async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2))
	
	logger.info("starting duplicate anchor ordering repair script", {
		mode: args.dryRun ? "dry-run" : "commit",
		dryRun: args.dryRun,
		commit: args.commit,
		onlyLessonId: args.lessonId,
		timestamp: new Date().toISOString()
	})

	if (args.dryRun) {
		logger.info("running in dry-run mode", { message: "no database writes will be performed" })
	}

	const lessonIds = await fetchLessonIds({ 
		onlyLessonId: args.lessonId
	})
	
	logger.info("discovered lessons to process", { count: lessonIds.length })

	// Batch fetch all lesson content into memory
	const lessonContentMap = await fetchAllLessonContent(lessonIds)

	let lessonsWithDuplicates = 0
	let totalUpdates = 0
	const problematicLessonIds: string[] = []

	for (const lessonId of lessonIds) {
		const rows = lessonContentMap.get(lessonId) || []
		
		if (rows.length === 0) {
			continue
		}

		// Check for duplicate anchor orderings
		const duplicates = identifyDuplicateAnchorOrderings(rows)
		
		if (duplicates.length === 0) {
			continue
		}

		lessonsWithDuplicates++
		problematicLessonIds.push(lessonId)

		logger.info("lesson has duplicate anchor orderings", {
			lessonId,
			totalRows: rows.length,
			duplicateCount: duplicates.length,
			duplicates: duplicates.map(d => ({
				ordering: d.ordering,
				count: d.contentIds.length,
				types: d.contentTypes.join(", ")
			}))
		})

		// Compute the compacted ordering
		const updates = computeCompactOrdering(rows)
		totalUpdates += updates.length

		if (updates.length > 0) {
			// Show before/after state
			const beforeState = [...rows].sort((a, b) => a.ordering - b.ordering).map(row => ({
				ordering: row.ordering,
				type: row.contentType,
				contentId: row.contentId
			}))
			
			const afterState = beforeState.map(item => {
				const update = updates.find(u => u.contentId === item.contentId)
				if (update) {
					return {
						ordering: update.to,
						type: item.type,
						contentId: item.contentId
					}
				}
				return item
			}).sort((a, b) => a.ordering - b.ordering)
			
			logger.info("lesson ordering before repair", {
				lessonId,
				ordering: beforeState.map(item => `[${item.ordering}] ${item.type} (${item.contentId.slice(-8)})`).join(", ")
			})
			
			logger.info("lesson ordering after repair", {
				lessonId,
				ordering: afterState.map(item => `[${item.ordering}] ${item.type} (${item.contentId.slice(-8)})`).join(", ")
			})

			if (args.commit && !args.dryRun) {
				await updateContentOrderings(lessonId, updates)
				logger.info("lesson ordering repaired", { 
					lessonId, 
					updatesApplied: updates.length 
				})
			}
		}
	}

	// Summary
	logger.info("duplicate anchor ordering repair summary", {
		mode: args.dryRun ? "dry-run" : "commit",
		lessonsProcessed: lessonIds.length,
		lessonsWithDuplicates,
		totalUpdates,
		status: lessonsWithDuplicates === 0 ? "no duplicate anchor orderings found" : 
			args.dryRun ? "changes identified but not applied (dry-run)" : 
			"changes applied successfully"
	})
	
	if (lessonsWithDuplicates > 0) {
		logger.info("lessons with duplicate anchor orderings", {
			count: problematicLessonIds.length,
			lessonIds: problematicLessonIds
		})
		
		if (args.dryRun) {
			logger.info("dry run complete", {
				message: "To apply these changes, run with --commit flag"
			})
		}
	}
}

// --- SCRIPT EXECUTION ---
const scriptResult = await errors.try(main())
if (scriptResult.error) {
	logger.error("duplicate anchor ordering repair script failed", { error: scriptResult.error })
	process.exit(1)
}

logger.info("duplicate anchor ordering repair script completed successfully")
process.exit(0)
