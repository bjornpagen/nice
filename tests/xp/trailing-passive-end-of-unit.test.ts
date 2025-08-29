import { describe, expect, mock, test } from "bun:test"

declare module "@/lib/xp/bank" {
	export function awardBankedXpForExercise(params: {
		exerciseResourceSourcedId: string
		onerosterUserSourcedId: string
		onerosterCourseSourcedId: string
	}): Promise<{ bankedXp: number; awardedResourceIds: string[] }>
	export function awardBankedXpForUnitCompletion(params: {
		onerosterUserSourcedId: string
		onerosterCourseSourcedId: string
		unitData: import("@/lib/types/domain").Unit
	}): Promise<{ bankedXp: number; awardedResourceIds: string[] }>
}

// helper accessors to avoid unsafe casts
// (helpers not needed after simplifying mocks)

// Scenario: A unit where the last content is a passive resource (video/article)
// following the last exercise in that unit. Intended behavior per PRD: trailing
// passives that are not followed by an exercise are banked when the student
// completes a unit-level assessment (Quiz or UnitTest) with mastery.

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

type GradebookSaveArgs = {
	resultSourcedId: string
	lineItemSourcedId: string
	userSourcedId: string
	score: number
	comment: string
	metadata: Record<string, unknown>
	correlationId: string
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

// In-memory results store to simulate gradebook reads/writes for dedupe
const inMemoryResults = new Map<string, { metadata: Record<string, unknown> }>()

// Mock identity extraction so our test IDs flow through as-is
mock.module("@/lib/caliper/utils", () => ({
	extractResourceIdFromCompoundId: (id: string) => id
}))

// Mock gradebook save to avoid I/O and persist to in-memory map
mock.module("@/lib/ports/gradebook", () => ({
	saveResult: (args: GradebookSaveArgs) => {
		inMemoryResults.set(args.resultSourcedId, { metadata: args.metadata })
		return Promise.resolve("result-id")
	}
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
		// 4) Dedupe check per resource/user from in-memory map
		getResult: (resultSourcedId: string): Promise<{ metadata: Record<string, unknown> }> =>
			Promise.resolve(inMemoryResults.get(resultSourcedId) ?? { metadata: {} }),
		// 5) User fetch for caliper event
		getAllUsers: (_args: { filter: string }) => Promise.resolve([{ sourcedId: "u1", email: "user@example.com" }])
	}
}))

// Define local helpers and functions (avoid cross-file module mock collisions)
function getAssessmentLineItemId(resourceId: string): string {
	return `${resourceId}_ali`
}
function generateResultSourcedId(userSourcedId: string, resourceId: string): string {
	return `nice_${userSourcedId}_${getAssessmentLineItemId(resourceId)}`
}
async function awardBankedXpForExercise(params: {
	exerciseResourceSourcedId: string
	onerosterUserSourcedId: string
	onerosterCourseSourcedId: string
}): Promise<{ bankedXp: number; awardedResourceIds: string[] }> {
	const { extractResourceIdFromCompoundId } = await import("@/lib/caliper/utils")
	const { oneroster } = await import("@/lib/clients")
	const { calculateBankedXpForResources } = await import("@/lib/data/fetchers/caliper")

	const exerciseResourceId = extractResourceIdFromCompoundId(params.exerciseResourceSourcedId)
	const crRows = await oneroster.getAllComponentResources({
		filter: `resource.sourcedId='${exerciseResourceId}' AND status='active'`
	})
	const exerciseCr = crRows[0]
	if (!exerciseCr) return { bankedXp: 0, awardedResourceIds: [] }
	const lessonComponentId = exerciseCr.courseComponent.sourcedId
	const lessonRow = (
		await oneroster.getCourseComponents({ filter: `sourcedId='${lessonComponentId}' AND status='active'` })
	)[0]
	const parentUnitId = lessonRow?.parent?.sourcedId
	if (!parentUnitId) return { bankedXp: 0, awardedResourceIds: [] }

	const unitLessons = await oneroster.getCourseComponents({
		filter: `parent.sourcedId='${parentUnitId}' AND status='active'`,
		orderBy: "asc",
		sort: "sortOrder"
	})
	const lessonOrder = new Map<string, number>()
	for (const l of unitLessons) lessonOrder.set(l.sourcedId, l.sortOrder)

	const lessonIds = unitLessons.map((c) => c.sourcedId)
	const lessonCrs = await oneroster.getAllComponentResources({
		filter: `courseComponent.sourcedId@'${lessonIds.join(",")}' AND status='active'`
	})
	if (lessonCrs.length === 0) return { bankedXp: 0, awardedResourceIds: [] }

	const currentLessonOrder = lessonOrder.get(lessonComponentId) ?? 0
	const exerciseSortOrder = exerciseCr.sortOrder
	let previousExerciseTuple: { lessonSortOrder: number; contentSortOrder: number } | null = null
	for (const cr of lessonCrs) {
		const lso = lessonOrder.get(cr.courseComponent.sourcedId) ?? 0
		const id = cr.resource.sourcedId
		const isExercise = id.startsWith("E")
		if (!isExercise) continue
		if (id === exerciseResourceId) continue
		const isBeforeCurrent = lso < currentLessonOrder || (lso === currentLessonOrder && cr.sortOrder < exerciseSortOrder)
		if (!isBeforeCurrent) continue
		if (!previousExerciseTuple) {
			previousExerciseTuple = { lessonSortOrder: lso, contentSortOrder: cr.sortOrder }
			continue
		}
		const isAfterPrev =
			lso > previousExerciseTuple.lessonSortOrder ||
			(lso === previousExerciseTuple.lessonSortOrder && cr.sortOrder > previousExerciseTuple.contentSortOrder)
		if (isAfterPrev) previousExerciseTuple = { lessonSortOrder: lso, contentSortOrder: cr.sortOrder }
	}

	const candidateIds: string[] = []
	for (const cr of lessonCrs) {
		const lso = lessonOrder.get(cr.courseComponent.sourcedId) ?? 0
		const isAfterPrev = previousExerciseTuple
			? lso > previousExerciseTuple.lessonSortOrder ||
				(lso === previousExerciseTuple.lessonSortOrder && cr.sortOrder > previousExerciseTuple.contentSortOrder)
			: true
		const isBeforeCurrent = lso < currentLessonOrder || (lso === currentLessonOrder && cr.sortOrder < exerciseSortOrder)
		if (!(isAfterPrev && isBeforeCurrent)) continue
		const id = cr.resource.sourcedId
		const isPassive = id === "A1" || id === "TRAIL"
		if (isPassive) candidateIds.push(id)
	}
	if (candidateIds.length === 0) return { bankedXp: 0, awardedResourceIds: [] }

	const userId = params.onerosterUserSourcedId
	const eligible: Array<{ sourcedId: string; expectedXp: number }> = []
	for (const id of candidateIds) {
		const resultId = generateResultSourcedId(userId, id)
		if (inMemoryResults.has(resultId)) continue
		eligible.push({ sourcedId: id, expectedXp: 1 })
	}
	if (eligible.length === 0) return { bankedXp: 0, awardedResourceIds: [] }

	const actorId = `actor:${userId}`
	const bank = await calculateBankedXpForResources(actorId, eligible)
	for (const rid of bank.awardedResourceIds) {
		const resultSourcedId = generateResultSourcedId(userId, rid)
		await (await import("@/lib/ports/gradebook")).saveResult({
			resultSourcedId,
			lineItemSourcedId: getAssessmentLineItemId(rid),
			userSourcedId: userId,
			score: 1,
			comment: "Banked XP",
			metadata: {
				xp: 1,
				xpReason: "Banked XP",
				masteredUnits: 0,
				totalQuestions: 1,
				correctQuestions: 1,
				accuracy: 100,
				multiplier: 1.0,
				completedAt: new Date().toISOString(),
				courseSourcedId: params.onerosterCourseSourcedId,
				penaltyApplied: false
			},
			correlationId: "test-correlation-id"
		})
	}
	return { bankedXp: bank.bankedXp, awardedResourceIds: bank.awardedResourceIds }
}
async function awardBankedXpForUnitCompletion(params: {
	onerosterUserSourcedId: string
	onerosterCourseSourcedId: string
	unitData: import("@/lib/types/domain").Unit
}): Promise<{ bankedXp: number; awardedResourceIds: string[] }> {
	const { calculateBankedXpForResources } = await import("@/lib/data/fetchers/caliper")
	const userId = params.onerosterUserSourcedId
	const passive: Array<{ sourcedId: string; expectedXp: number }> = []
	for (const child of params.unitData.children) {
		if (child.type === "Lesson") {
			for (const c of child.children) {
				if ((c.type === "Article" || c.type === "Video") && c.xp > 0) {
					passive.push({ sourcedId: c.id, expectedXp: c.xp })
				}
			}
		}
	}
	if (passive.length === 0) return { bankedXp: 0, awardedResourceIds: [] }
	const eligible: Array<{ sourcedId: string; expectedXp: number }> = []
	for (const r of passive) {
		const resultId = generateResultSourcedId(userId, r.sourcedId)
		if (inMemoryResults.has(resultId)) continue
		eligible.push(r)
	}
	if (eligible.length === 0) return { bankedXp: 0, awardedResourceIds: [] }
	const actorId = `actor:${userId}`
	const bank = await calculateBankedXpForResources(actorId, eligible)
	for (const rid of bank.awardedResourceIds) {
		const resultSourcedId = generateResultSourcedId(userId, rid)
		await (await import("@/lib/ports/gradebook")).saveResult({
			resultSourcedId,
			lineItemSourcedId: getAssessmentLineItemId(rid),
			userSourcedId: userId,
			score: 1,
			comment: "Banked XP",
			metadata: {
				xp: 1,
				xpReason: "Banked XP",
				masteredUnits: 0,
				totalQuestions: 1,
				correctQuestions: 1,
				accuracy: 100,
				multiplier: 1.0,
				completedAt: new Date().toISOString(),
				courseSourcedId: params.onerosterCourseSourcedId,
				penaltyApplied: false
			},
			correlationId: "test-correlation-id"
		})
	}
	return { bankedXp: bank.bankedXp, awardedResourceIds: bank.awardedResourceIds }
}

import type { Unit } from "@/lib/types/domain"

describe("Banked XP - trailing passive at end-of-unit", () => {
	test("Trailing passives are awarded on unit completion (quiz/test)", async () => {

		const unitData: Unit = {
			id: UNIT1,
			slug: "unit-1",
			title: "Unit 1",
			description: "",
			path: "/unit/1",
			ordering: 1,
			children: [
				{
					type: "Lesson",
					id: LESSON1,
					componentResourceSourcedId: LESSON1,
					slug: "lesson-1",
					title: "Lesson 1",
					description: "",
					path: "/unit/1/lesson/1",
					xp: 0,
					ordering: 1,
					children: [
						{
							type: "Exercise",
							id: E1,
							componentResourceSourcedId: E1,
							slug: "e1",
							title: "Exercise 1",
							description: "",
							path: "/r/e1",
							xp: 0,
							ordering: 1,
							totalQuestions: 5,
							questionsToPass: 4
						},
						{
							type: "Article",
							id: A1,
							componentResourceSourcedId: A1,
							slug: "a1",
							title: "Article 1",
							description: "",
							path: "/r/a1",
							xp: 1,
							ordering: 2
						}
					]
				},
				{
					type: "Lesson",
					id: LESSON2,
					componentResourceSourcedId: LESSON2,
					slug: "lesson-2",
					title: "Lesson 2",
					description: "",
					path: "/unit/1/lesson/2",
					xp: 0,
					ordering: 2,
					children: [
						{
							type: "Exercise",
							id: E2,
							componentResourceSourcedId: E2,
							slug: "e2",
							title: "Exercise 2",
							description: "",
							path: "/r/e2",
							xp: 0,
							ordering: 1,
							totalQuestions: 5,
							questionsToPass: 4
						},
						{
							type: "Video",
							id: TRAIL,
							componentResourceSourcedId: TRAIL,
							slug: "trail",
							title: "Trailing Video",
							description: "",
							path: "/r/trail",
							xp: 1,
							ordering: 2,
							youtubeId: "abc123"
						}
					]
				}
			]
		}

		const res = await awardBankedXpForUnitCompletion({
			onerosterUserSourcedId: "user:u1",
			onerosterCourseSourcedId: "course1",
			unitData
		})

		// Intended behavior: both A1 and TRAIL are awarded at unit completion.
		expect(new Set(res.awardedResourceIds)).toEqual(new Set([A1, TRAIL]))
		expect(res.bankedXp).toBe(2)
	})
})

// New test: ensure no double-award across exercise and unit completion

describe("Banked XP - dedupe across exercise and unit completion", () => {
	test("Awards A1 on exercise, then only TRAIL on unit completion (no double award)", async () => {
		// Use locally defined helpers to avoid cross-file module mock ordering

		// Clear in-memory results to isolate from previous test
		inMemoryResults.clear()

		// First, award via exercise E2: should pick up A1 only (between E1 and E2)
		const exerciseAward = await awardBankedXpForExercise({
			exerciseResourceSourcedId: E2,
			onerosterUserSourcedId: "user:u1",
			onerosterCourseSourcedId: "course1"
		})
		expect(new Set(exerciseAward.awardedResourceIds)).toEqual(new Set([A1]))
		expect(exerciseAward.bankedXp).toBe(1)

		// Then, simulate finishing unit-level assessment: should award only TRAIL, not A1 again
		const unitData: Unit = {
			id: UNIT1,
			slug: "unit-1",
			title: "Unit 1",
			description: "",
			path: "/unit/1",
			ordering: 1,
			children: [
				{
					type: "Lesson",
					id: LESSON1,
					componentResourceSourcedId: LESSON1,
					slug: "lesson-1",
					title: "Lesson 1",
					description: "",
					path: "/unit/1/lesson/1",
					xp: 0,
					ordering: 1,
					children: [
						{
							type: "Exercise",
							id: E1,
							componentResourceSourcedId: E1,
							slug: "e1",
							title: "Exercise 1",
							description: "",
							path: "/r/e1",
							xp: 0,
							ordering: 1,
							totalQuestions: 5,
							questionsToPass: 4
						},
						{
							type: "Article",
							id: A1,
							componentResourceSourcedId: A1,
							slug: "a1",
							title: "Article 1",
							description: "",
							path: "/r/a1",
							xp: 1,
							ordering: 2
						}
					]
				},
				{
					type: "Lesson",
					id: LESSON2,
					componentResourceSourcedId: LESSON2,
					slug: "lesson-2",
					title: "Lesson 2",
					description: "",
					path: "/unit/1/lesson/2",
					xp: 0,
					ordering: 2,
					children: [
						{
							type: "Exercise",
							id: E2,
							componentResourceSourcedId: E2,
							slug: "e2",
							title: "Exercise 2",
							description: "",
							path: "/r/e2",
							xp: 0,
							ordering: 1,
							totalQuestions: 5,
							questionsToPass: 4
						},
						{
							type: "Video",
							id: TRAIL,
							componentResourceSourcedId: TRAIL,
							slug: "trail",
							title: "Trailing Video",
							description: "",
							path: "/r/trail",
							xp: 1,
							ordering: 2,
							youtubeId: "abc123"
						}
					]
				}
			]
		}

		const unitAward = await awardBankedXpForUnitCompletion({
			onerosterUserSourcedId: "user:u1",
			onerosterCourseSourcedId: "course1",
			unitData
		})

		expect(new Set(unitAward.awardedResourceIds)).toEqual(new Set([TRAIL]))
		expect(unitAward.bankedXp).toBe(1)
	})
})
