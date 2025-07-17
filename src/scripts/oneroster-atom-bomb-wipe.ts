#!/usr/bin/env bun
/**
 * OneRoster Atom Bomb Wipe
 *
 * Total annihilation of OneRoster objects by prefix.
 *
 * Usage:
 *   bun run src/scripts/oneroster-atom-bomb-wipe.ts <type> <prefix>
 *   bun run src/scripts/oneroster-atom-bomb-wipe.ts <type> <prefix> --delete
 *
 * Types: resources, courses, courseComponents, componentResources,
 *        classes, users, enrollments, assessmentLineItems, all
 *
 * Examples:
 *   bun run src/scripts/oneroster-atom-bomb-wipe.ts courses "test-"
 *   bun run src/scripts/oneroster-atom-bomb-wipe.ts all "demo-" --delete
 */

import * as readline from "node:readline/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { oneroster } from "@/lib/clients"
import { createPrefixFilter } from "@/lib/filter"

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
	"all"
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

// Handler implementations
const handlers: Record<Exclude<EntityType, "all">, EntityHandler> = {
	resources: {
		type: "resources",
		name: "Resources",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getAllResources({
				filter: createPrefixFilter(prefix),
				sort: "sourcedId",
				orderBy: "asc"
			})
			return items.map((r) => ({
				sourcedId: r.sourcedId,
				displayName: `${r.sourcedId}: ${r.title} (${r.format || "unknown"})`,
				fullObject: r
			}))
		},
		delete: (id: string) => oneroster.deleteResource(id)
	},
	courses: {
		type: "courses",
		name: "Courses",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getAllCourses({
				filter: createPrefixFilter(prefix),
				sort: "sourcedId",
				orderBy: "asc"
			})
			return items.map((c) => ({
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
				filter: createPrefixFilter(prefix),
				sort: "sourcedId",
				orderBy: "asc"
			})
			return items.map((cc) => ({
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
				filter: createPrefixFilter(prefix),
				sort: "sourcedId",
				orderBy: "asc"
			})
			return items.map((cr) => ({
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
				filter: createPrefixFilter(prefix),
				sort: "sourcedId",
				orderBy: "asc"
			})
			return items.map((c) => ({
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
				filter: createPrefixFilter(prefix),
				sort: "sourcedId",
				orderBy: "asc"
			})
			return items.map((u) => ({
				sourcedId: u.sourcedId,
				displayName: `${u.sourcedId}: ${u.givenName} ${u.familyName} (${u.email || "no-email"})`,
				fullObject: u
			}))
		},
		delete: (id: string) => oneroster.deleteUser(id)
	},
	enrollments: {
		type: "enrollments",
		name: "Enrollments",
		fetchAll: async (prefix: string) => {
			const items = await oneroster.getAllEnrollments({
				filter: createPrefixFilter(prefix),
				sort: "sourcedId",
				orderBy: "asc"
			})
			return items.map((e) => ({
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
				filter: createPrefixFilter(prefix),
				sort: "sourcedId",
				orderBy: "asc"
			})
			return items.map((ali) => ({
				sourcedId: ali.sourcedId,
				displayName: `${ali.sourcedId}: ${ali.title}`,
				fullObject: ali
			}))
		},
		delete: (id: string) => oneroster.deleteAssessmentLineItem(id)
	}
}

async function fetchEntities(entityType: Exclude<EntityType, "all">, prefix: string): Promise<Entity[]> {
	const handler = handlers[entityType]
	logger.info("fetching entities", { type: handler.name, prefix })

	const result = await errors.try(handler.fetchAll(prefix))
	if (result.error) {
		logger.error("fetch failed", { type: handler.name, error: result.error })
		throw errors.wrap(result.error, `${entityType} fetch`)
	}

	logger.info("fetched entities", { type: handler.name, count: result.data.length })
	return result.data
}

async function deleteEntity(handler: EntityHandler, entity: Entity): Promise<boolean> {
	const result = await errors.try(handler.delete(entity.sourcedId))
	if (result.error) {
		logger.error("delete failed", {
			type: handler.name,
			sourcedId: entity.sourcedId,
			error: result.error
		})
		return false
	}

	logger.debug("deleted", { type: handler.name, sourcedId: entity.sourcedId })
	return true
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

async function executeWipe(entityType: EntityType, prefix: string, shouldDelete: boolean) {
	// Handle "all" type by recursing through each type
	if (entityType === "all") {
		logger.info("executing full wipe", { prefix })

		const allTypes: Exclude<EntityType, "all">[] = [
			"componentResources", // Delete these first (leaf nodes)
			"courseComponents",
			"enrollments",
			"assessmentLineItems", // Delete before classes
			"classes",
			"resources",
			"courses",
			"users"
		]

		for (const type of allTypes) {
			process.stdout.write(`\n=== ${handlers[type].name} ===\n`)
			await executeWipe(type, prefix, shouldDelete)
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

	const confirmed = await confirmDeletion(entities.length, handler.name)
	if (!confirmed) {
		process.stdout.write("Aborted.\n")
		return
	}

	process.stdout.write("\n💣 DETONATING...\n")

	let success = 0
	let failed = 0

	for (const entity of entities) {
		const deleted = await deleteEntity(handler, entity)
		if (deleted) {
			process.stdout.write(`  ✅ ${entity.sourcedId}\n`)
			success++
		} else {
			process.stdout.write(`  ❌ ${entity.sourcedId}\n`)
			failed++
		}
	}

	process.stdout.write(`\n${handler.name} Wipe Complete:\n` + `  Deleted: ${success}\n` + `  Failed: ${failed}\n`)
}

async function main() {
	const args = process.argv.slice(2)
	const shouldDelete = args.includes("--delete")
	const positionalArgs = args.filter((a) => !a.startsWith("--"))

	if (positionalArgs.length !== 2) {
		process.stderr.write(
			"Usage: oneroster-atom-bomb-wipe <type> <prefix> [--delete]\n\n" +
				"Types:\n" +
				"  resources, courses, courseComponents, componentResources,\n" +
				"  classes, users, enrollments, assessmentLineItems, all\n"
		)
		process.exit(1)
	}

	const rawType = positionalArgs[0]
	const prefix = positionalArgs[1]

	if (!rawType || !prefix) {
		process.stderr.write("Error: Missing required arguments\n")
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

	logger.info("starting atom bomb wipe", {
		type: entityType,
		prefix,
		mode: shouldDelete ? "DELETE" : "LIST"
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
