import { describe, expect, mock, test } from "bun:test"

// Scenario: A unit where the last content is a passive resource (video/article)
// following the last exercise in that unit. We expect that when the user
// masters the last exercise, the trailing passive is ALSO banked (intended
// behavior). Current implementation only considers resources strictly before
// the current exercise, so this test is expected to FAIL until behavior is
// updated to include the end-of-unit trailing passive window.

// --- MOCKS (BEFORE SUT IMPORT) ---

type ComponentResource = {
	resource: { sourcedId: string }
	courseComponent: { sourcedId: string }
	sortOrder: number
}

type CourseComponent = {
	sourcedId: string
	parent?: { sourcedId: string }
	sortOrder: number
}

type Resource = {
	sourcedId: string
	title: string
	metadata: Record<string, unknown>
}

// Resource IDs
const E1 = "E1"
const E2 = "E2" // current (last) exercise in unit
const A1 = "A1" // passive between previous and current
const TRAIL = "TRAIL" // trailing passive after last exercise in unit

// Lesson and Unit IDs
const LESSON1 = "lesson1"
const LESSON2 = "lesson2"
const UNIT1 = "unit1"

// Helper: parse filter includes
function includes(haystack: string | undefined, needle: string) {
	return typeof haystack === "string" && haystack.includes(needle)
}

// Mock identity extraction so our test IDs flow through as-is
mock.module("@/lib/caliper/utils", () => ({
	extractResourceIdFromCompoundId: (id: string) => id
}))

// Mock gradebook save to avoid I/O
mock.module("@/lib/ports/gradebook", () => ({
	saveResult: (_args: unknown) => Promise.resolve("result-id")
}))

// Mock banked XP calculator to award 1 XP per eligible passive and echo IDs
mock.module("@/lib/data/fetchers/caliper", () => ({
	calculateBankedXpForResources: (
		_actorId: string,
		passiveResources: Array<{ sourcedId: string; expectedXp: number }>
	) => {
		const detailedResults = passiveResources.map((r) => ({ resourceId: r.sourcedId, awardedXp: 1 }))
		return Promise.resolve({
			bankedXp: passiveResources.length,
			awardedResourceIds: passiveResources.map((r) => r.sourcedId),
			detailedResults
		})
	}
}))

// Avoid real analytics side-effects
mock.module("@/lib/actions/caliper", () => ({
	sendCaliperBankedXpAwardedEvent: () => Promise.resolve()
}))

// Mock OneRoster client queries used by banking logic
mock.module("@/lib/clients", () => ({
	oneroster: {
		// 1) Locate current exercise's component resource
		getAllComponentResources: (args: { filter: string }) => {
			const f = args.filter
			// Current exercise lookup
			if (includes(f, `resource.sourcedId='${E2}'`)) {
				const rows: ComponentResource[] = [
					{ resource: { sourcedId: E2 }, courseComponent: { sourcedId: LESSON2 }, sortOrder: 1 }
				]
				return Promise.resolve(rows)
			}
			// Unit lessons CRs
			if (includes(f, `courseComponent.sourcedId@'${LESSON1},${LESSON2}'`)) {
				const rows: ComponentResource[] = [
					// Lesson 1: E1 (exercise), A1 (article)
					{ resource: { sourcedId: E1 }, courseComponent: { sourcedId: LESSON1 }, sortOrder: 1 },
					{ resource: { sourcedId: A1 }, courseComponent: { sourcedId: LESSON1 }, sortOrder: 2 },
					// Lesson 2: E2 (exercise), TRAIL (trailing passive)
					{ resource: { sourcedId: E2 }, courseComponent: { sourcedId: LESSON2 }, sortOrder: 1 },
					{ resource: { sourcedId: TRAIL }, courseComponent: { sourcedId: LESSON2 }, sortOrder: 2 }
				]
				return Promise.resolve(rows)
			}
			// Unit-level CRs fallback (not used here)
			if (includes(f, `courseComponent.sourcedId='${UNIT1}'`)) {
				const rows: ComponentResource[] = []
				return Promise.resolve(rows)
			}
			const rows: ComponentResource[] = []
			return Promise.resolve(rows)
		},
		// 2) Get lesson or unit components
		getCourseComponents: (args: { filter: string; orderBy?: string; sort?: string }) => {
			const f = args.filter
			// Resolve unit from lesson2
			if (includes(f, `sourcedId='${LESSON2}'`)) {
				const rows: CourseComponent[] = [{ sourcedId: LESSON2, parent: { sourcedId: UNIT1 }, sortOrder: 2 }]
				return Promise.resolve(rows)
			}
			// List unit lessons in order
			if (includes(f, `parent.sourcedId='${UNIT1}'`)) {
				const rows: CourseComponent[] = [
					{ sourcedId: LESSON1, sortOrder: 1 },
					{ sourcedId: LESSON2, sortOrder: 2 }
				]
				return Promise.resolve(rows)
			}
			const rows: CourseComponent[] = []
			return Promise.resolve(rows)
		},
		// 3) Fetch resources metadata and later per-eligible lookups
		getAllResources: (args: { filter: string }) => {
			const f = args.filter
			const idsMatch = /sourcedId@'([^']+)'/.exec(f)
			const singleMatch = /sourcedId='([^']+)'/.exec(f)
			const ids: string[] = []
			if (idsMatch?.[1]) {
				ids.push(...idsMatch[1].split(","))
			} else if (singleMatch?.[1]) {
				ids.push(singleMatch[1])
			}
			const db: Record<string, Resource> = {
				[E1]: { sourcedId: E1, title: "Exercise 1", metadata: { khanActivityType: "Exercise", xp: 0 } },
				[E2]: { sourcedId: E2, title: "Exercise 2", metadata: { khanActivityType: "Exercise", xp: 0 } },
				[A1]: {
					sourcedId: A1,
					title: "Article 1",
					metadata: { type: "interactive", khanActivityType: "Article", xp: 1 }
				},
				[TRAIL]: {
					sourcedId: TRAIL,
					title: "Video (Trailing)",
					metadata: { type: "interactive", khanActivityType: "Video", xp: 1 }
				}
			}
			const rows = ids.map((id) => db[id]).filter((v): v is Resource => Boolean(v))
			return Promise.resolve(rows)
		},
		// 4) Dedupe check per resource/user
		getResult: (_resultSourcedId: string) => Promise.resolve({ metadata: {} }),
		// 5) User fetch for caliper event
		getAllUsers: (_args: { filter: string }) => Promise.resolve([{ sourcedId: "u1", email: "user@example.com" }])
	}
}))

describe("Banked XP - trailing passive at end-of-unit", () => {
	test("Trailing passive after last exercise SHOULD be awarded (expected behavior)", async () => {
		const { awardBankedXpForExercise } = await import("@/lib/xp/bank")

		const res = await awardBankedXpForExercise({
			exerciseResourceSourcedId: E2,
			onerosterUserSourcedId: "user:u1",
			onerosterCourseSourcedId: "course1"
		})

		// Intended behavior: both A1 and TRAIL are awarded.
		expect(new Set(res.awardedResourceIds)).toEqual(new Set([A1, TRAIL]))
		expect(res.bankedXp).toBe(2)
	})
})
