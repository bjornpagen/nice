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
fix-exercise-ordering.ts - Repair exercise ordering in lesson_contents table

SYNOPSIS
  bun scripts/fix-exercise-ordering.ts [OPTIONS]

DESCRIPTION
  This script repairs the ordering of exercises in the lesson_contents table.
  
  The issue: When dump-khan-academy.ts was run with --no-articles-no-videos,
  it filtered out videos/articles from the JSON, causing exercises to be
  renumbered from 0 when seeded, while videos/articles kept their original
  ordering values. This created overlapping ordering values.
  
  The fix: This script restores the correct ordering by:
  1. Reading all lesson_contents for each lesson
  2. Identifying "anchors" (videos/articles) that kept correct ordering
  3. Computing "holes" in the 0..N-1 sequence not used by anchors
  4. Reassigning exercises into those holes, preserving their relative order
  
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
  # Dry run on all lessons (default)
  bun scripts/fix-exercise-ordering.ts
  
  # Dry run on specific lesson
  bun scripts/fix-exercise-ordering.ts --only-lesson-id="khan-lesson-123"
  
  # Actually fix all lessons
  bun scripts/fix-exercise-ordering.ts --commit
  
  # Fix specific lesson
  bun scripts/fix-exercise-ordering.ts --commit --only-lesson-id="khan-lesson-123"

SAFETY
  - The script validates that exercises can fit into available holes
  - It verifies contiguity of ordering after updates (no gaps)
  - All updates happen in transactions
  - Only the 'ordering' field is updated, no other fields are modified
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

type ExerciseUpdate = {
	contentId: string
	from: number
	to: number
}

type AnchorInfo = {
	contentId: string
	ordering: number
	contentType: string
}

type ExerciseInfo = {
	contentId: string
	ordering: number
}

type RepairResult = {
	updates: ExerciseUpdate[]
	anchors: AnchorInfo[]
	exercisesBefore: ExerciseInfo[]
	exercisesAfter: ExerciseInfo[]
}

// --- HELPER FUNCTIONS ---
function generateContiguousRange(count: number): number[] {
	const range: number[] = []
	for (let i = 0; i < count; i++) {
		range.push(i)
	}
	return range
}

function computeExerciseOrdering(rows: LessonContentRow[]): RepairResult {
	if (rows.length === 0) {
		return {
			updates: [],
			anchors: [],
			exercisesBefore: [],
			exercisesAfter: []
		}
	}

	const lessonId = rows[0]?.lessonId
	logger.debug("computing exercise ordering", { 
		lessonId,
		totalRows: rows.length 
	})

	// Sort all rows by current ordering to understand the state
	const sortedRows = [...rows].sort((a, b) => a.ordering - b.ordering)
	
	// Partition into anchors (videos/articles) and exercises
	const anchors = sortedRows.filter((row) => row.contentType !== "Exercise")
	const exercises = sortedRows.filter((row) => row.contentType === "Exercise")
	
	logger.debug("partitioned content", {
		lessonId,
		anchorsCount: anchors.length,
		exercisesCount: exercises.length,
		anchorTypes: anchors.reduce((acc, a) => {
			acc[a.contentType] = (acc[a.contentType] || 0) + 1
			return acc
		}, {} as Record<string, number>)
	})

	// Generate expected domain: 0..N-1 where N is total content count
	const totalContent = sortedRows.length
	const expectedDomain = generateContiguousRange(totalContent)


	// If the lesson has no anchors (only exercises), treat as exercise-only.
	// We'll compact exercises into a contiguous 0..N-1 preserving relative order.
	if (anchors.length === 0) {
		logger.info("no anchors present; treating as exercise-only", { 
			lessonId, 
			totalContent,
			exercisesCount: exercises.length 
		})
	}

	// Invariant: anchors must have unique orderings within 0..N-1
	const anchorOrderingSet = new Set<number>()
	const duplicateAnchors: Array<{ contentId: string; ordering: number }> = []
	for (const a of anchors) {
		if (a.ordering < 0 || a.ordering >= totalContent) {
			logger.error("anchor ordering out of domain", { lessonId, contentId: a.contentId, ordering: a.ordering, totalContent })
			throw errors.new("lesson invariant violation: anchor ordering out of domain")
		}
		if (anchorOrderingSet.has(a.ordering)) {
			duplicateAnchors.push({ contentId: a.contentId, ordering: a.ordering })
		}
		anchorOrderingSet.add(a.ordering)
	}
	if (duplicateAnchors.length > 0) {
		logger.warn("duplicate anchor orderings: skipping lesson", { lessonId, duplicates: duplicateAnchors })
		// Return a no-op plan so callers naturally skip this lesson
		const exercisesSorted = [...exercises].sort((a, b) => a.ordering - b.ordering)
		const exercisesBeforeSkip = exercisesSorted.map((ex) => ({ contentId: ex.contentId, ordering: ex.ordering }))
		const anchorInfoSkip = anchors.map((anchor) => ({ contentId: anchor.contentId, ordering: anchor.ordering, contentType: anchor.contentType }))
		return {
			updates: [],
			anchors: anchorInfoSkip,
			exercisesBefore: exercisesBeforeSkip,
			exercisesAfter: exercisesBeforeSkip
		}
	}
	
	// Find positions occupied by anchors
	const anchorPositions = new Set(anchors.map((anchor) => anchor.ordering))
	
	// Find holes: positions not occupied by anchors
	const holes: number[] = []
	for (const position of expectedDomain) {
		if (!anchorPositions.has(position)) {
			holes.push(position)
		}
	}
	
	logger.debug("computed holes in ordering", {
		lessonId,
		holesCount: holes.length,
		holes: holes.slice(0, 10), // Show first 10 for brevity
		anchorPositions: Array.from(anchorPositions).sort((a, b) => a - b).slice(0, 10) // Show first 10
	})

	// Validate invariant: number of holes must equal number of exercises
	if (holes.length !== exercises.length) {
		logger.error("lesson invariant violation", {
			lessonId: rows[0]?.lessonId,
			holesCount: holes.length,
			exercisesCount: exercises.length,
			anchorsCount: anchors.length,
			totalContent,
			holes,
			anchorPositions: Array.from(anchorPositions).sort((a, b) => a - b),
			exerciseOrderings: exercises.map((ex) => ({ contentId: ex.contentId, ordering: ex.ordering }))
		})
		throw errors.new("lesson invariant violation: holes count does not match exercises count")
	}

	// Sort exercises by their current ordering to preserve relative order
	const exercisesSortedByCurrent = [...exercises].sort((a, b) => a.ordering - b.ordering)
	
	// Compute updates needed to place exercises in holes
	const updates: ExerciseUpdate[] = []
	const exercisesAfter: ExerciseInfo[] = []

	for (let i = 0; i < exercisesSortedByCurrent.length; i++) {
		const exercise = exercisesSortedByCurrent[i]
		const targetPosition = holes[i]
		
		if (!exercise) {
			throw errors.new("algorithm error: exercise undefined")
		}
		
		if (targetPosition === undefined) {
			throw errors.new("algorithm error: hole position undefined")
		}

		if (exercise.ordering !== targetPosition) {
			updates.push({
				contentId: exercise.contentId,
				from: exercise.ordering,
				to: targetPosition
			})
		}

		exercisesAfter.push({
			contentId: exercise.contentId,
			ordering: targetPosition
		})
	}

	const exercisesBefore = exercisesSortedByCurrent.map((exercise) => ({
		contentId: exercise.contentId,
		ordering: exercise.ordering
	}))

	const anchorInfo = anchors.map((anchor) => ({
		contentId: anchor.contentId,
		ordering: anchor.ordering,
		contentType: anchor.contentType
	}))

	// Invariant: after-state must be a perfect 0..N-1 permutation, anchors immutable
	const afterPositions = new Set<number>()
	for (const a of anchors) {
		afterPositions.add(a.ordering)
	}
	for (const ex of exercisesAfter) {
		if (afterPositions.has(ex.ordering)) {
			logger.error("after-state collision at index", { lessonId, index: ex.ordering })
			throw errors.new("lesson invariant violation: after-state collision")
		}
		afterPositions.add(ex.ordering)
	}
	if (afterPositions.size !== totalContent) {
		logger.error("after-state not a full permutation", { lessonId, size: afterPositions.size, totalContent })
		throw errors.new("lesson invariant violation: after-state not a permutation")
	}
	for (let i = 0; i < totalContent; i++) {
		if (!afterPositions.has(i)) {
			logger.error("after-state missing index", { lessonId, index: i, totalContent })
			throw errors.new("lesson invariant violation: missing index in after-state")
		}
	}

	return {
		updates,
		anchors: anchorInfo,
		exercisesBefore,
		exercisesAfter
	}
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
		logger.error("failed to fetch lesson ids", { 
			error: result.error 
		})
		throw errors.wrap(result.error, "fetch lesson ids")
	}

	logger.debug("fetched lesson ids", { count: result.data.length })
	return result.data.map((row) => row.lessonId)
}

async function fetchLessonContent(lessonId: string): Promise<LessonContentRow[]> {
	logger.debug("fetching lesson content", { lessonId })
	const result = await errors.try(
		db
			.select({
				lessonId: schema.niceLessonContents.lessonId,
				contentId: schema.niceLessonContents.contentId,
				contentType: schema.niceLessonContents.contentType,
				ordering: schema.niceLessonContents.ordering
			})
			.from(schema.niceLessonContents)
			.where(eq(schema.niceLessonContents.lessonId, lessonId))
			.orderBy(schema.niceLessonContents.ordering)
	)
	if (result.error) {
		logger.error("failed to fetch lesson content", { lessonId, error: result.error })
		throw errors.wrap(result.error, "fetch lesson content")
	}

	logger.debug("fetched lesson content", { 
		lessonId, 
		rowCount: result.data.length,
		contentTypes: result.data.reduce((acc, row) => {
			acc[row.contentType] = (acc[row.contentType] || 0) + 1
			return acc
		}, {} as Record<string, number>)
	})
	return result.data as LessonContentRow[]
}

async function updateExerciseOrderings(
	lessonId: string,
	updates: ExerciseUpdate[]
): Promise<void> {
	if (updates.length === 0) {
		return
	}

	logger.debug("applying exercise ordering updates", { 
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
					logger.error("failed to update exercise ordering", {
						lessonId,
						contentId: update.contentId,
						from: update.from,
						to: update.to,
						error: updateResult.error
					})
					throw errors.wrap(updateResult.error, "update exercise ordering")
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

async function verifyLessonOrderingContiguity(lessonId: string): Promise<void> {
	const rows = await fetchLessonContent(lessonId)
	
	if (rows.length === 0) {
		logger.warn("lesson has no content to verify", { lessonId })
		return
	}

	const sortedRows = [...rows].sort((a, b) => a.ordering - b.ordering)
	const expectedRange = generateContiguousRange(sortedRows.length)
	const actualOrderings = sortedRows.map((row) => row.ordering)
	
	const isContiguous = expectedRange.length === actualOrderings.length && 
		expectedRange.every((expected, index) => expected === actualOrderings[index])
	
	if (!isContiguous) {
		logger.error("lesson ordering verification failed", {
			lessonId,
			expectedRange,
			actualOrderings,
			totalRows: rows.length
		})
		throw errors.new("lesson ordering verification failed: not contiguous")
	}

	logger.debug("lesson ordering verification passed", { 
		lessonId, 
		totalRows: rows.length 
	})
}

// --- BATCH OPERATIONS ---
async function fetchAllLessonContent(lessonIds: string[]): Promise<Map<string, LessonContentRow[]>> {
	logger.info("batch fetching lesson content", { count: lessonIds.length })
	
	// Fetch all lesson content in a single query
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

// --- MAIN SCRIPT ---
async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2))
	
	logger.info("starting exercise ordering repair script", {
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

	let lessonsRequiringRepair = 0
	let totalExerciseUpdates = 0

	for (const lessonId of lessonIds) {
		const rows = lessonContentMap.get(lessonId) || []
		
		if (rows.length === 0) {
			logger.warn("skipping lesson with no content", { lessonId })
			continue
		}

		const anchorCount = rows.filter((row) => row.contentType !== "Exercise").length
		const exerciseCount = rows.length - anchorCount

		const repairResult = errors.trySync(() => computeExerciseOrdering(rows))
		if (repairResult.error) {
			logger.error("failed to compute exercise ordering", {
				lessonId,
				anchorCount,
				exerciseCount,
				totalRows: rows.length,
				error: repairResult.error
			})
			throw errors.wrap(repairResult.error, "compute exercise ordering")
		}

		const { updates } = repairResult.data

		if (updates.length === 0) {
			logger.debug("lesson ordering already correct", { 
				lessonId, 
				totalRows: rows.length 
			})
			continue
		}

		lessonsRequiringRepair++
		totalExerciseUpdates += updates.length

		// Log detailed repair information
		logger.info("lesson requires ordering repair", {
			lessonId,
			totalRows: rows.length,
			anchorCount,
			exerciseCount,
			updatesNeeded: updates.length
		})
		
		// Show before/after state for clarity
		const beforeState = [...rows].sort((a, b) => a.ordering - b.ordering).map(row => ({
			ordering: row.ordering,
			type: row.contentType,
			contentId: row.contentId
		}))
		
		// Build after state by applying updates
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
		
		// Log each individual update for visibility
		for (const update of updates) {
			logger.info("exercise will move", {
				lessonId,
				contentId: update.contentId,
				from: update.from,
				to: update.to,
				direction: update.to > update.from ? "forward" : "backward",
				distance: Math.abs(update.to - update.from)
			})
		}

		if (args.commit && !args.dryRun) {
			await updateExerciseOrderings(lessonId, updates)
			await verifyLessonOrderingContiguity(lessonId)
			logger.info("lesson ordering repaired and verified", { 
				lessonId, 
				updatesApplied: updates.length 
			})
		}
	}

	const mode = args.dryRun ? "dry-run" : "commit"
	
	// Summary log
	logger.info("exercise ordering repair summary", {
		mode,
		lessonsProcessed: lessonIds.length,
		lessonsRequiringRepair,
		totalExerciseUpdates,
		status: lessonsRequiringRepair === 0 ? "all lessons already correct" : 
			args.dryRun ? "changes identified but not applied (dry-run)" : 
			"changes applied successfully"
	})
	
	if (args.dryRun && lessonsRequiringRepair > 0) {
		logger.info("dry run complete", {
			message: "To apply these changes, run with --commit flag"
		})
	}
}

// --- SCRIPT EXECUTION ---
const scriptResult = await errors.try(main())
if (scriptResult.error) {
	logger.error("exercise ordering repair script failed", { error: scriptResult.error })
	process.exit(1)
}

logger.info("exercise ordering repair script completed successfully")
process.exit(0)

