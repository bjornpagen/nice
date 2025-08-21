#!/usr/bin/env bun
/**
 * Atom Bomb Wipe
 *
 * Total annihilation of OneRoster and QTI objects by prefix.
 *
 * Usage:
 *   bun run src/scripts/atom-bomb-wipe.ts <type> <prefix>
 *   bun run src/scripts/atom-bomb-wipe.ts <type> <prefix> --delete
 *
 * Types: resources, courses, courseComponents, componentResources,
 *        classes, users, enrollments, assessmentLineItems, assessmentResults,
 *        assessmentItems, assessmentStimuli, assessmentTests, all-oneroster, all-qti
 *
 * Examples:
 *   bun run src/scripts/atom-bomb-wipe.ts courses "test-"
 *   bun run src/scripts/atom-bomb-wipe.ts all-oneroster "demo-" --delete
 *   bun run src/scripts/atom-bomb-wipe.ts all-qti "test-" --delete
 */
//bloo
import * as readline from "node:readline/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { oneroster, qti } from "@/lib/clients"

const CONFIRMATION = "YES, I AM ABSOLUTELY SURE"

const EntityTypeSchema = z.enum([
	"resources",
	"courses",
	"courseComponents",
	"componentResources",
	"classes",
	"users",
	"enrollments",
	"assessmentLineItems",
	"assessmentResults",
	"assessmentItems",
	"assessmentStimuli",
	"assessmentTests",
	"all-oneroster",
	"all-qti"
])
type EntityType = z.infer<typeof EntityTypeSchema>

interface Entity {
	sourcedId: string
	displayName: string
	fullObject: unknown // Store the complete object
}

interface EntityHandler {
	type: EntityType
	name: string
	fetchAll: (prefix: string) => Promise<Entity[]>
	delete: (id: string) => Promise<void>
}

// Helper function to format objects for display
function formatObject(obj: unknown, indent = 0): string {
	const spaces = "  ".repeat(indent)

	if (obj === null || obj === undefined) {
		return `${spaces}${obj}`
	}

	if (typeof obj !== "object") {
		return `${spaces}${JSON.stringify(obj)}`
	}

	if (Array.isArray(obj)) {
		if (obj.length === 0) return `${spaces}[]`
		return `${spaces}[\n${obj.map((item) => formatObject(item, indent + 1)).join(",\n")}\n${spaces}]`
	}

	const entries = Object.entries(obj)
	if (entries.length === 0) return `${spaces}{}`

	const lines = entries.map(([key, value]) => {
		if (typeof value === "object" && value !== null) {
			return `${spaces}  ${key}:\n${formatObject(value, indent + 2)}`
		}
		return `${spaces}  ${key}: ${JSON.stringify(value)}`
	})

	return `${spaces}{\n${lines.join(",\n")}\n${spaces}}`
}

// Helper to filter out soft-deleted OneRoster entities
// OneRoster uses soft deletes where status='tobedeleted' means deleted
// We must filter these client-side to avoid re-deleting already deleted items
function filterActiveOnly<T extends { status?: string }>(items: T[]): T[] {
	const originalCount = items.length
	const filtered = items.filter((item) => item.status === "active")
	const filteredCount = originalCount - filtered.length

	if (filteredCount > 0) {
		logger.info("filtered out soft-deleted entities", {
			activeCount: filtered.length,
			filteredCount,
			totalFetched: originalCount
		})
	}

	return filtered
}

// Helper to filter by exact prefix match
// The API's tilde operator is a wildcard (ILIKE), not a prefix match
// We must ensure sourcedIds actually START WITH the prefix
function filterByExactPrefix<T extends { sourcedId: string }>(items: T[], prefix: string): T[] {
	const originalCount = items.length
	const filtered = items.filter((item) => item.sourcedId.startsWith(prefix))
	const filteredCount = originalCount - filtered.length

	if (filteredCount > 0) {
		logger.info("filtered out non-prefix-matching entities", {
			prefix,
			matchingCount: filtered.length,
			filteredCount,
			totalFetched: originalCount
		})
	}

	return filtered
}

// Handler implementations
const handlers: Record<Exclude<EntityType, "all-oneroster" | "all-qti">, EntityHandler> = {
	resources: {
		type: "resources",
		name: "Resources",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getAllResources({
				filter: `sourcedId~'${prefix}'`,
				sort: "sourcedId",
				orderBy: "asc"
			})
			// Filter out soft-deleted items
			const activeItems = filterActiveOnly(items)
			// Filter by exact prefix match
			const prefixMatchedItems = filterByExactPrefix(activeItems, prefix)
			return prefixMatchedItems.map((r) => {
				// Validate required fields
				if (!r.format) {
					logger.warn("resource missing format field", { sourcedId: r.sourcedId })
				}
				const formatDisplay = r.format ? r.format : "NO_FORMAT"
				return {
					sourcedId: r.sourcedId,
					displayName: `${r.sourcedId}: ${r.title} (${formatDisplay})`,
					fullObject: r
				}
			})
		},
		delete: (id: string) => oneroster.deleteResource(id)
	},
	courses: {
		type: "courses",
		name: "Courses",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getAllCourses({
				filter: `sourcedId~'${prefix}'`,
				sort: "sourcedId",
				orderBy: "asc"
			})
			// Filter out soft-deleted items
			const activeItems = filterActiveOnly(items)
			// Filter by exact prefix match
			const prefixMatchedItems = filterByExactPrefix(activeItems, prefix)
			return prefixMatchedItems.map((c) => ({
				sourcedId: c.sourcedId,
				displayName: `${c.sourcedId}: ${c.title} (${c.org.sourcedId})`,
				fullObject: c
			}))
		},
		delete: (id: string) => oneroster.deleteCourse(id)
	},
	courseComponents: {
		type: "courseComponents",
		name: "Course Components",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getCourseComponents({
				filter: `sourcedId~'${prefix}'`,
				sort: "sourcedId",
				orderBy: "asc"
			})
			// Filter out soft-deleted items
			const activeItems = filterActiveOnly(items)
			// Filter by exact prefix match
			const prefixMatchedItems = filterByExactPrefix(activeItems, prefix)
			return prefixMatchedItems.map((cc) => ({
				sourcedId: cc.sourcedId,
				displayName: `${cc.sourcedId}: ${cc.title} (course: ${cc.course.sourcedId})`,
				fullObject: cc
			}))
		},
		delete: (id: string) => oneroster.deleteCourseComponent(id)
	},
	componentResources: {
		type: "componentResources",
		name: "Component Resources",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getAllComponentResources({
				filter: `sourcedId~'${prefix}'`,
				sort: "sourcedId",
				orderBy: "asc"
			})
			// Filter out soft-deleted items
			const activeItems = filterActiveOnly(items)
			// Filter by exact prefix match
			const prefixMatchedItems = filterByExactPrefix(activeItems, prefix)
			return prefixMatchedItems.map((cr) => ({
				sourcedId: cr.sourcedId,
				displayName: `${cr.sourcedId}: ${cr.title}`,
				fullObject: cr
			}))
		},
		delete: (id: string) => oneroster.deleteComponentResource(id)
	},
	classes: {
		type: "classes",
		name: "Classes",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getAllClasses({
				filter: `sourcedId~'${prefix}'`,
				sort: "sourcedId",
				orderBy: "asc"
			})
			// Filter out soft-deleted items
			const activeItems = filterActiveOnly(items)
			// Filter by exact prefix match
			const prefixMatchedItems = filterByExactPrefix(activeItems, prefix)
			return prefixMatchedItems.map((c) => ({
				sourcedId: c.sourcedId,
				displayName: `${c.sourcedId}: ${c.title} (type: ${c.classType})`,
				fullObject: c
			}))
		},
		delete: (id: string) => oneroster.deleteClass(id)
	},
	users: {
		type: "users",
		name: "Users",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getAllUsers({
				filter: `sourcedId~'${prefix}'`,
				sort: "sourcedId",
				orderBy: "asc"
			})
			// Filter out soft-deleted items
			const activeItems = filterActiveOnly(items)
			// Filter by exact prefix match
			const prefixMatchedItems = filterByExactPrefix(activeItems, prefix)
			return prefixMatchedItems.map((u) => {
				// Validate required fields
				if (!u.email) {
					logger.warn("user missing email field", { sourcedId: u.sourcedId })
				}
				const emailDisplay = u.email ? u.email : "NO_EMAIL"
				return {
					sourcedId: u.sourcedId,
					displayName: `${u.sourcedId}: ${u.givenName} ${u.familyName} (${emailDisplay})`,
					fullObject: u
				}
			})
		},
		delete: (id: string) => oneroster.deleteUser(id)
	},
	enrollments: {
		type: "enrollments",
		name: "Enrollments",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getAllEnrollments({
				filter: `sourcedId~'${prefix}'`,
				sort: "sourcedId",
				orderBy: "asc"
			})
			// Filter out soft-deleted items
			const activeItems = filterActiveOnly(items)
			// Filter by exact prefix match
			const prefixMatchedItems = filterByExactPrefix(activeItems, prefix)
			return prefixMatchedItems.map((e) => ({
				sourcedId: e.sourcedId,
				displayName: `${e.sourcedId}: ${e.role} (${e.user.sourcedId} → ${e.class.sourcedId})`,
				fullObject: e
			}))
		},
		delete: (id: string) => oneroster.deleteEnrollment(id)
	},
	assessmentLineItems: {
		type: "assessmentLineItems",
		name: "Assessment Line Items",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getAllAssessmentLineItems({
				filter: `sourcedId~'${prefix}'`,
				sort: "sourcedId",
				orderBy: "asc"
			})
			// Filter out soft-deleted items
			const activeItems = filterActiveOnly(items)
			// Filter by exact prefix match
			const prefixMatchedItems = filterByExactPrefix(activeItems, prefix)
			return prefixMatchedItems.map((ali) => ({
				sourcedId: ali.sourcedId,
				displayName: `${ali.sourcedId}: ${ali.title}`,
				fullObject: ali
			}))
		},
		delete: (id: string) => oneroster.deleteAssessmentLineItem(id)
	},
	assessmentResults: {
		type: "assessmentResults",
		name: "Assessment Results (User Progress)",
		fetchAll: async (prefix: string) => {
			// For AssessmentResults, we need to filter by the sourcedId
			const items = await oneroster.getAllResults({
				filter: `sourcedId~'${prefix}'`,
				sort: "sourcedId",
				orderBy: "asc"
			})
			// Filter out soft-deleted items
			const activeItems = filterActiveOnly(items)
			// Filter by exact prefix match
			const prefixMatchedItems = filterByExactPrefix(activeItems, prefix)
			return prefixMatchedItems.map((r) => {
				// Validate required fields
				if (!r.student || !r.student.sourcedId) {
					logger.warn("assessment result missing student reference", { sourcedId: r.sourcedId })
				}
				if (!r.assessmentLineItem || !r.assessmentLineItem.sourcedId) {
					logger.warn("assessment result missing line item reference", { sourcedId: r.sourcedId })
				}
				if (r.score === null || r.score === undefined) {
					logger.warn("assessment result missing score", { sourcedId: r.sourcedId })
				}

				const studentDisplay = r.student?.sourcedId ? r.student.sourcedId : "NO_STUDENT"
				const lineItemDisplay = r.assessmentLineItem?.sourcedId ? r.assessmentLineItem.sourcedId : "NO_LINE_ITEM"
				const scoreDisplay = r.score !== null && r.score !== undefined ? r.score.toString() : "NO_SCORE"

				return {
					sourcedId: r.sourcedId,
					displayName: `${r.sourcedId}: ${studentDisplay} -> ${lineItemDisplay} (score: ${scoreDisplay})`,
					fullObject: r
				}
			})
		},
		delete: (id: string) => oneroster.deleteAssessmentResult(id)
	},
	assessmentItems: {
		type: "assessmentItems",
		name: "QTI Assessment Items",
		fetchAll: async (prefix: string) => {
			const allItems: Array<{ identifier: string; title: string; [key: string]: unknown }> = []
			let page = 1
			const limit = 1000
			let hasMore = true

			// Fetch all pages
			while (hasMore) {
				const result = await qti.searchAssessmentItems({ query: prefix, page, limit })
				allItems.push(...result.items)

				// Check if there are more pages
				// Assuming the API returns fewer items than the limit when we've reached the end
				hasMore = result.items.length === limit
				page++

				if (page > 100) {
					// Safety limit to prevent infinite loops
					logger.warn("reached safety limit while fetching QTI items", { page, totalFetched: allItems.length })
					break
				}
			}

			logger.debug("fetched all QTI assessment items", { totalPages: page - 1, totalItems: allItems.length })

			// Filter by exact prefix match on identifier
			const prefixMatchedItems = allItems.filter((item) => item.identifier.startsWith(prefix))
			if (allItems.length !== prefixMatchedItems.length) {
				logger.info("filtered out non-prefix-matching QTI items", {
					prefix,
					matchingCount: prefixMatchedItems.length,
					filteredCount: allItems.length - prefixMatchedItems.length,
					totalFetched: allItems.length
				})
			}
			return prefixMatchedItems.map((i) => ({
				sourcedId: i.identifier,
				displayName: `${i.identifier}: ${i.title}`,
				fullObject: i
			}))
		},
		delete: (id: string) => qti.deleteAssessmentItem(id)
	},
	assessmentStimuli: {
		type: "assessmentStimuli",
		name: "QTI Assessment Stimuli",
		fetchAll: async (prefix: string) => {
			const allItems: Array<{ identifier: string; title: string; [key: string]: unknown }> = []
			let page = 1
			const limit = 1000
			let hasMore = true

			// Fetch all pages
			while (hasMore) {
				const result = await qti.searchStimuli({ query: prefix, page, limit })
				allItems.push(...result.items)

				// Check if there are more pages
				hasMore = result.items.length === limit
				page++

				if (page > 100) {
					// Safety limit to prevent infinite loops
					logger.warn("reached safety limit while fetching QTI stimuli", { page, totalFetched: allItems.length })
					break
				}
			}

			logger.debug("fetched all QTI stimuli", { totalPages: page - 1, totalItems: allItems.length })

			// Filter by exact prefix match on identifier
			const prefixMatchedItems = allItems.filter((item) => item.identifier.startsWith(prefix))
			if (allItems.length !== prefixMatchedItems.length) {
				logger.info("filtered out non-prefix-matching QTI stimuli", {
					prefix,
					matchingCount: prefixMatchedItems.length,
					filteredCount: allItems.length - prefixMatchedItems.length,
					totalFetched: allItems.length
				})
			}
			return prefixMatchedItems.map((s) => ({
				sourcedId: s.identifier,
				displayName: `${s.identifier}: ${s.title}`,
				fullObject: s
			}))
		},
		delete: (id: string) => qti.deleteStimulus(id)
	},
	assessmentTests: {
		type: "assessmentTests",
		name: "QTI Assessment Tests",
		fetchAll: async (prefix: string) => {
			const allItems: Array<{ identifier: string; title: string; [key: string]: unknown }> = []
			let page = 1
			const limit = 1000
			let hasMore = true

			// Fetch all pages
			while (hasMore) {
				const result = await qti.searchAssessmentTests({ query: prefix, page, limit })
				allItems.push(...result.items)

				// Check if there are more pages
				hasMore = result.items.length === limit
				page++

				if (page > 100) {
					// Safety limit to prevent infinite loops
					logger.warn("reached safety limit while fetching QTI tests", { page, totalFetched: allItems.length })
					break
				}
			}

			logger.debug("fetched all QTI assessment tests", { totalPages: page - 1, totalItems: allItems.length })

			// Filter by exact prefix match on identifier
			const prefixMatchedItems = allItems.filter((item) => item.identifier.startsWith(prefix))
			if (allItems.length !== prefixMatchedItems.length) {
				logger.info("filtered out non-prefix-matching QTI tests", {
					prefix,
					matchingCount: prefixMatchedItems.length,
					filteredCount: allItems.length - prefixMatchedItems.length,
					totalFetched: allItems.length
				})
			}
			return prefixMatchedItems.map((t) => ({
				sourcedId: t.identifier,
				displayName: `${t.identifier}: ${t.title}`,
				fullObject: t
			}))
		},
		delete: (id: string) => qti.deleteAssessmentTest(id)
	}
}

async function fetchEntities(
	entityType: Exclude<EntityType, "all-oneroster" | "all-qti">,
	prefix: string
): Promise<Entity[]> {
	const handler = handlers[entityType]
	logger.debug("fetching entities", { type: handler.name, prefix })

	const result = await errors.try(handler.fetchAll(prefix))
	if (result.error) {
		logger.error("fetch failed", { type: handler.name, error: result.error })
		throw errors.wrap(result.error, `${entityType} fetch`)
	}

	logger.debug("fetched entities", { type: handler.name, count: result.data.length })

	// Ensure stable sorting by sourcedId
	// This is important when results come from parallel operations
	return result.data.sort((a, b) => a.sourcedId.localeCompare(b.sourcedId))
}

async function confirmDeletion(count: number, typeName: string): Promise<boolean> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

	process.stdout.write(
		"\n🚨 ATOM BOMB WIPE 🚨\n" +
			`This will DELETE ${count} ${typeName} PERMANENTLY.\n` +
			"There is NO UNDO.\n\n" +
			`Type "${CONFIRMATION}" to proceed:\n> `
	)

	const answer = await rl.question("")
	rl.close()

	return answer === CONFIRMATION
}

async function executeWipe(entityType: EntityType, prefix: string, shouldDelete: boolean, skipConfirmation = false) {
	// Handle "all-oneroster" and "all-qti" types by recursing through each type
	if (entityType === "all-oneroster" || entityType === "all-qti") {
		logger.info("executing batch wipe", { entityType, prefix })

		// For delete mode with "all", ask for confirmation once upfront
		if (shouldDelete && !skipConfirmation) {
			// Count total entities across all types
			let totalCount = 0
			const entityCounts: Record<string, number> = {}

			process.stdout.write("\n🔍 Scanning for entities to delete...\n")

			// Define types based on which command was used
			const onerosterTypes: Exclude<EntityType, "all-oneroster" | "all-qti">[] = [
				// OneRoster Objects (delete dependencies first)
				"enrollments",
				"assessmentResults",
				"assessmentLineItems",
				"componentResources",
				"courseComponents",
				"classes",
				"resources",
				"courses",
				"users"
			]

			const qtiTypes: Exclude<EntityType, "all-oneroster" | "all-qti">[] = [
				// QTI Objects (delete tests first as they reference items/stimuli)
				"assessmentTests",
				"assessmentItems",
				"assessmentStimuli"
			]

			// CRITICAL: This array defines the canonical order for entity types
			// Entities are always grouped by type and displayed in this exact order
			const allTypes = entityType === "all-oneroster" ? onerosterTypes : qtiTypes

			// Fetch all entity counts in parallel
			const countPromises = allTypes.map(async (type) => ({
				type,
				entities: await fetchEntities(type, prefix)
			}))

			const countResults = await Promise.all(countPromises)

			// Create a map for O(1) lookup
			const countResultsByType = new Map(countResults.map((r) => [r.type, r]))

			// Process results in the exact order defined by allTypes
			// This ensures counts are always displayed in the same order
			for (const type of allTypes) {
				const result = countResultsByType.get(type)
				if (!result) continue // Shouldn't happen, but be safe
				entityCounts[type] = result.entities.length
				totalCount += result.entities.length
			}

			// Show summary
			process.stdout.write(`\n${"=".repeat(80)}\n`)
			process.stdout.write("🚨 ATOM BOMB WIPE - SUMMARY 🚨\n")
			process.stdout.write(`${"=".repeat(80)}\n\n`)

			for (const type of allTypes) {
				const handler = handlers[type]
				const count = entityCounts[type]
				if (count === undefined) {
					logger.error("entity count missing for type", { type })
					throw errors.new(`entity count missing for type: ${type}`)
				}
				if (count > 0) {
					process.stdout.write(`  ${handler.name}: ${count} entities\n`)
				}
			}

			process.stdout.write(`\n${"=".repeat(80)}\n`)
			process.stdout.write(`TOTAL: ${totalCount} entities will be PERMANENTLY DELETED\n`)
			process.stdout.write(`${"=".repeat(80)}\n`)

			if (totalCount === 0) {
				process.stdout.write("\nNo entities found with the specified prefix.\n")
				return
			}

			// Single confirmation for all
			const confirmed = await confirmDeletion(totalCount, "entities across all types")
			if (!confirmed) {
				process.stdout.write("Aborted.\n")
				return
			}

			// Now execute all deletions with confirmation skipped
			for (const type of allTypes) {
				process.stdout.write(`\n=== ${handlers[type].name} ===\n`)
				await executeWipe(type, prefix, shouldDelete, true)
			}
			return
		}

		// For list mode or if confirmation was already done
		// Define types based on which command was used
		const onerosterTypes: Exclude<EntityType, "all-oneroster" | "all-qti">[] = [
			// OneRoster Objects (delete dependencies first)
			"enrollments",
			"assessmentResults",
			"assessmentLineItems",
			"componentResources",
			"courseComponents",
			"classes",
			"resources",
			"courses",
			"users"
		]

		const qtiTypes: Exclude<EntityType, "all-oneroster" | "all-qti">[] = [
			// QTI Objects (delete tests first as they reference items/stimuli)
			"assessmentTests",
			"assessmentItems",
			"assessmentStimuli"
		]

		// CRITICAL: This array defines the canonical order for displaying entity types
		// - For listing: ensures stable grouping and output order
		// - For deletion: respects dependency order (dependents before dependencies)
		const allTypes = entityType === "all-oneroster" ? onerosterTypes : qtiTypes

		// In list mode, fetch all types in parallel first
		if (!shouldDelete) {
			process.stdout.write("\n🔍 Fetching all entities in parallel...\n")

			const fetchPromises = allTypes.map(async (type) => ({
				type,
				handler: handlers[type],
				entities: await fetchEntities(type, prefix)
			}))

			const allResults = await Promise.all(fetchPromises)

			// Create a map for O(1) lookup while preserving type order
			const resultsByType = new Map(allResults.map((r) => [r.type, r]))

			// Display results in the exact order defined by allTypes
			// This ensures stable grouping of entity types regardless of fetch completion order
			for (const type of allTypes) {
				const result = resultsByType.get(type)
				if (!result) continue // Shouldn't happen, but be safe
				if (result.entities.length > 0) {
					process.stdout.write(`\n=== ${result.handler.name} ===\n`)
					process.stdout.write(`Found ${result.entities.length} ${result.handler.name}:\n`)
					process.stdout.write(`${"=".repeat(80)}\n`)

					for (const entity of result.entities) {
						process.stdout.write(`\n📄 ${entity.displayName}\n`)
						process.stdout.write(`${"-".repeat(80)}\n`)
						process.stdout.write(`${formatObject(entity.fullObject)}\n`)
						process.stdout.write(`${"-".repeat(80)}\n`)
					}

					process.stdout.write(`\n${"=".repeat(80)}\n`)
					process.stdout.write(`Total: ${result.entities.length} ${result.handler.name}\n`)
				} else {
					process.stdout.write(`\n=== ${result.handler.name} ===\n`)
					process.stdout.write(`No ${result.handler.name} found with prefix "${prefix}"\n`)
				}
			}
			return
		}

		// For delete mode with confirmation already done, execute sequentially
		// (to respect deletion order dependencies)
		for (const type of allTypes) {
			process.stdout.write(`\n=== ${handlers[type].name} ===\n`)
			await executeWipe(type, prefix, shouldDelete, true)
		}
		return
	}

	// Single type execution
	const handler = handlers[entityType]
	const entities = await fetchEntities(entityType, prefix)

	if (entities.length === 0) {
		process.stdout.write(`No ${handler.name} found with prefix "${prefix}"\n`)
		return
	}

	// List mode - now with full field dump
	if (!shouldDelete) {
		process.stdout.write(`\nFound ${entities.length} ${handler.name}:\n`)
		process.stdout.write(`${"=".repeat(80)}\n`)

		for (const entity of entities) {
			process.stdout.write(`\n📄 ${entity.displayName}\n`)
			process.stdout.write(`${"-".repeat(80)}\n`)
			process.stdout.write(`${formatObject(entity.fullObject)}\n`)
			process.stdout.write(`${"-".repeat(80)}\n`)
		}

		process.stdout.write(`\n${"=".repeat(80)}\n`)
		process.stdout.write(`Total: ${entities.length} ${handler.name}\n`)
		return
	}

	// Delete mode - also show full dump before deletion
	process.stdout.write(`\nTargeting ${entities.length} ${handler.name} for deletion:\n`)
	process.stdout.write(`${"=".repeat(80)}\n`)

	for (const entity of entities) {
		process.stdout.write(`\n💀 ${entity.displayName}\n`)
		process.stdout.write(`${"-".repeat(80)}\n`)
		process.stdout.write(`${formatObject(entity.fullObject)}\n`)
		process.stdout.write(`${"-".repeat(80)}\n`)
	}

	// Skip confirmation if flag is set (used when running "all")
	if (!skipConfirmation) {
		const confirmed = await confirmDeletion(entities.length, handler.name)
		if (!confirmed) {
			process.stdout.write("Aborted.\n")
			return
		}
	}

	process.stdout.write("\n💣 DETONATING...\n")
	process.stdout.write(`  🚀 Launching ${entities.length} parallel deletions...\n`)

	// Execute all deletions in parallel
	const deletePromises = entities.map(async (entity) => {
		const result = await errors.try(handler.delete(entity.sourcedId))
		return {
			entity,
			success: !result.error,
			error: result.error
		}
	})

	const results = await Promise.allSettled(deletePromises)

	// Process results
	let success = 0
	let failed = 0
	const failures: Array<{ sourcedId: string; error: unknown }> = []

	for (const result of results) {
		if (result.status === "fulfilled") {
			const deleteResult = result.value
			if (deleteResult.success) {
				success++
			} else {
				failed++
				failures.push({
					sourcedId: deleteResult.entity.sourcedId,
					error: deleteResult.error
				})
			}
		} else {
			// Promise itself rejected (shouldn't happen with our errors.try wrapper)
			failed++
			logger.error("unexpected promise rejection", { error: result.reason })
		}
	}

	// Display results summary
	process.stdout.write(`\n${handler.name} Wipe Complete:\n`)
	process.stdout.write(`  ✅ Deleted: ${success}\n`)
	process.stdout.write(`  ❌ Failed: ${failed}\n`)

	// Log failures for debugging
	if (failures.length > 0) {
		process.stdout.write("\nFailed deletions:\n")
		for (const failure of failures) {
			process.stdout.write(`  ❌ ${failure.sourcedId}\n`)
			logger.error("delete failed", {
				type: handler.name,
				sourcedId: failure.sourcedId,
				error: failure.error
			})
		}
	}
}

async function main() {
	const args = process.argv.slice(2)
	const shouldDelete = args.includes("--delete")
	const positionalArgs = args.filter((a) => !a.startsWith("--"))

	if (positionalArgs.length !== 2) {
		process.stderr.write(
			"Usage: atom-bomb-wipe <type> <prefix> [--delete]\n\n" +
				"Types:\n" +
				"  OneRoster: resources, courses, courseComponents, componentResources,\n" +
				"             classes, users, enrollments, assessmentLineItems, assessmentResults\n" +
				"  QTI: assessmentItems, assessmentStimuli, assessmentTests\n" +
				"  Batch: all-oneroster (all OneRoster types), all-qti (all QTI types)\n"
		)
		process.exit(1)
	}

	const rawType = positionalArgs[0]
	const prefix = positionalArgs[1]

	if (rawType === undefined) {
		process.stderr.write("Error: Missing type argument\n")
		process.exit(1)
	}

	if (prefix === undefined) {
		process.stderr.write("Error: Missing prefix argument\n")
		process.exit(1)
	}

	const typeResult = EntityTypeSchema.safeParse(rawType)
	if (!typeResult.success) {
		logger.error("invalid type", { type: rawType, error: typeResult.error })
		process.stderr.write(`Invalid type: ${rawType}\n`)
		process.stderr.write(`Valid types: ${EntityTypeSchema.options.join(", ")}\n`)
		process.exit(1)
	}

	const entityType = typeResult.data

	const mode = shouldDelete ? "DELETE" : "LIST"

	logger.info("starting atom bomb wipe", {
		type: entityType,
		prefix,
		mode
	})

	await executeWipe(entityType, prefix, shouldDelete)
}

// Execute
const result = await errors.try(main())
if (result.error) {
	logger.error("fatal", { error: result.error })
	process.exit(1)
}

process.exit(0)
