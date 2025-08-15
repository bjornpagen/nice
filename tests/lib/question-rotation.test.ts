import { describe, expect, test } from "bun:test"
import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import { applyQtiSelectionAndOrdering } from "@/lib/qti-selection"

function buildQtiXml(options: { sectionId: string; itemIds: string[]; shuffle: boolean; selectCount: number }): string {
	const { sectionId, itemIds, shuffle, selectCount } = options
	const itemsXml = itemIds.map((id) => `<qti-assessment-item-ref identifier="${id}"/>`).join("")
	return (
		`<qti-assessment-test identifier="test">` +
		"<qti-test-part>" +
		`<qti-assessment-section identifier="${sectionId}">` +
		`<qti-ordering shuffle="${shuffle ? "true" : "false"}"/>` +
		`<qti-selection select="${selectCount}"/>` +
		itemsXml +
		"</qti-assessment-section>" +
		"</qti-test-part>" +
		"</qti-assessment-test>"
	)
}

function buildAssessmentTest(xml: string, identifier = "test_id"): AssessmentTest {
	return {
		identifier,
		title: "Test",
		qtiVersion: "3.0",
		"qti-test-part": [],
		"qti-outcome-declaration": [],
		timeLimit: undefined,
		maxAttempts: undefined,
		toolsEnabled: {},
		metadata: {},
		rawXml: xml,
		content: {},
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		isValidXml: true
	}
}

function buildResolvedQuestions(ids: string[]): TestQuestionsResponse["questions"] {
	return ids.map((id) => ({
		reference: { identifier: id, href: `${id}.xml`, testPart: "p1", section: "s1" },
		question: {
			identifier: id,
			title: id,
			type: "choice",
			qtiVersion: "3.0",
			timeDependent: false,
			adaptive: false,
			responseDeclarations: [],
			outcomeDeclarations: [],
			metadata: {},
			rawXml: "<qti-assessment-item/>",
			content: {},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}
	}))
}

function rotationWindowCount(total: number, perAttempt: number): number {
	return Math.ceil(total / perAttempt)
}

async function assertRotationCoverage(params: {
	label: string
	resourceSourcedId: string
	userSourceId: string
	shuffle: boolean
	allIds: string[]
	selectCount: number
}): Promise<void> {
	const { label, resourceSourcedId, userSourceId, shuffle, allIds, selectCount } = params
	const xml = buildQtiXml({ sectionId: "s1", itemIds: allIds, shuffle, selectCount })
	const testObj = buildAssessmentTest(xml, `${label}_test`)
	const resolved = buildResolvedQuestions(allIds)
	const attemptsNeeded = rotationWindowCount(allIds.length, selectCount)

	const seen = new Set<string>()
	for (let attempt = 1; attempt <= attemptsNeeded; attempt++) {
		const qs = applyQtiSelectionAndOrdering(testObj, resolved, {
			baseSeed: `${userSourceId}:${resourceSourcedId}`,
			attemptNumber: attempt,
			userSourceId,
			resourceSourcedId
		})
		// size check
		expect(qs.length).toBe(selectCount)
		// unique within attempt
		expect(new Set(qs.map((q) => q.id)).size).toBe(selectCount)
		// no repeats across attempts until full coverage
		for (const q of qs) {
			expect(seen.has(q.id)).toBe(false)
			seen.add(q.id)
		}
	}
	// After required attempts, we must have covered every question exactly once
	expect(seen.size).toBe(allIds.length)

	// One more attempt should start reusing from the bank deterministically
	const next = applyQtiSelectionAndOrdering(testObj, resolved, {
		baseSeed: `${userSourceId}:${resourceSourcedId}`,
		attemptNumber: attemptsNeeded + 1,
		userSourceId,
		resourceSourcedId
	})
	// Must still be valid size and a subset of the bank
	expect(next.length).toBe(selectCount)
	for (const q of next) {
		expect(allIds.includes(q.id)).toBe(true)
	}
}

describe("Question rotation across assessment types", () => {
	const allIds = Array.from({ length: 12 }, (_, i) => `q${i + 1}`)
	const selectCount = 4 // windows of 4 should cover 12 in exactly 3 attempts
	const userSourceId = "user_sourced_1"

	test("Exercise rotation (shuffle=false)", async () => {
		await assertRotationCoverage({
			label: "exercise_seq",
			resourceSourcedId: "exercise_res_1",
			userSourceId,
			shuffle: false,
			allIds,
			selectCount
		})
	})

	test("Quiz rotation (shuffle=true)", async () => {
		await assertRotationCoverage({
			label: "quiz_stride",
			resourceSourcedId: "quiz_res_1",
			userSourceId,
			shuffle: true,
			allIds,
			selectCount
		})
	})

	test("Unit Test rotation (shuffle=true)", async () => {
		await assertRotationCoverage({
			label: "unit_test",
			resourceSourcedId: "unit_test_res_1",
			userSourceId,
			shuffle: true,
			allIds,
			selectCount
		})
	})

	test("Course Challenge rotation (shuffle=true)", async () => {
		await assertRotationCoverage({
			label: "course_challenge",
			resourceSourcedId: "course_challenge_res_1",
			userSourceId,
			shuffle: true,
			allIds,
			selectCount
		})
	})

	test("Non-divisible bank size: last window may include repeats but covers all unique", () => {
		const ids = Array.from({ length: 10 }, (_, i) => `q${i + 1}`)
		const k = 3
		const xml = buildQtiXml({ sectionId: "s1", itemIds: ids, shuffle: false, selectCount: k })
		const testObj = buildAssessmentTest(xml, "non_divisible_seq")
		const resolved = buildResolvedQuestions(ids)
		const attemptsNeeded = rotationWindowCount(ids.length, k) // 4
		const seen = new Set<string>()
		for (let attempt = 1; attempt <= attemptsNeeded; attempt++) {
			const qs = applyQtiSelectionAndOrdering(testObj, resolved, {
				baseSeed: "u1:r1",
				attemptNumber: attempt,
				resourceSourcedId: "r1"
			})
			if (attempt < attemptsNeeded) {
				// No repeats before the last window
				for (const q of qs) {
					expect(seen.has(q.id)).toBe(false)
					seen.add(q.id)
				}
			} else {
				// Last window: should add exactly remainder new questions
				const remainder = ids.length % k // 1
				let newCount = 0
				for (const q of qs) {
					if (!seen.has(q.id)) newCount++
					seen.add(q.id)
				}
				expect(newCount).toBe(remainder)
			}
		}
		expect(seen.size).toBe(ids.length)
	})

	test("Determinism: same inputs and attempt yield identical selection and order", () => {
		const ids = Array.from({ length: 9 }, (_, i) => `q${i + 1}`)
		const xml = buildQtiXml({ sectionId: "s1", itemIds: ids, shuffle: true, selectCount: 4 })
		const testObj = buildAssessmentTest(xml, "determinism_stride")
		const resolved = buildResolvedQuestions(ids)
		const a1 = applyQtiSelectionAndOrdering(testObj, resolved, {
			baseSeed: "uX:rX",
			attemptNumber: 2,
			userSourceId: "uX",
			resourceSourcedId: "rX"
		})
		const a2 = applyQtiSelectionAndOrdering(testObj, resolved, {
			baseSeed: "uX:rX",
			attemptNumber: 2,
			userSourceId: "uX",
			resourceSourcedId: "rX"
		})
		expect(a1.map((q) => q.id)).toEqual(a2.map((q) => q.id))
	})

	test("Different users/resources produce different first windows", () => {
		const ids = Array.from({ length: 12 }, (_, i) => `q${i + 1}`)
		const xml = buildQtiXml({ sectionId: "s1", itemIds: ids, shuffle: true, selectCount: 4 })
		const testObj = buildAssessmentTest(xml, "diff_users")
		const resolved = buildResolvedQuestions(ids)
		const forUserA = applyQtiSelectionAndOrdering(testObj, resolved, {
			baseSeed: "userA:res1",
			attemptNumber: 1,
			userSourceId: "userA",
			resourceSourcedId: "res1"
		})
		const forUserB = applyQtiSelectionAndOrdering(testObj, resolved, {
			baseSeed: "userB:res1",
			attemptNumber: 1,
			userSourceId: "userB",
			resourceSourcedId: "res1"
		})
		const forResource2 = applyQtiSelectionAndOrdering(testObj, resolved, {
			baseSeed: "userA:res2",
			attemptNumber: 1,
			userSourceId: "userA",
			resourceSourcedId: "res2"
		})
		expect(forUserA.map((q) => q.id)).not.toEqual(forUserB.map((q) => q.id))
		expect(forUserA.map((q) => q.id)).not.toEqual(forResource2.map((q) => q.id))
	})

	test("Multi-section mixed shuffle/select rotates without duplicates until coverage (no partition)", () => {
		const a = Array.from({ length: 6 }, (_, i) => `a${i + 1}`)
		const b = Array.from({ length: 6 }, (_, i) => `b${i + 1}`)
		const xml =
			`<qti-assessment-test identifier="multi">` +
			"<qti-test-part>" +
			`<qti-assessment-section identifier="A">` +
			`<qti-ordering shuffle="false"/>` +
			`<qti-selection select="2"/>` +
			a.map((id) => `<qti-assessment-item-ref identifier="${id}"/>`).join("") +
			"</qti-assessment-section>" +
			`<qti-assessment-section identifier="B">` +
			`<qti-ordering shuffle="true"/>` +
			`<qti-selection select="2"/>` +
			b.map((id) => `<qti-assessment-item-ref identifier="${id}"/>`).join("") +
			"</qti-assessment-section>" +
			"</qti-test-part>" +
			"</qti-assessment-test>"
		const testObj = buildAssessmentTest(xml, "multi_sections")
		const resolved = buildResolvedQuestions([...a, ...b])
		const attemptsNeeded = rotationWindowCount(12, 4)
		const seen = new Set<string>()
		for (let attempt = 1; attempt <= attemptsNeeded; attempt++) {
			const qs = applyQtiSelectionAndOrdering(testObj, resolved, {
				baseSeed: "seed",
				attemptNumber: attempt,
				resourceSourcedId: "seed"
			})
			expect(qs.length).toBe(4)
			for (const q of qs) {
				expect(seen.has(q.id)).toBe(false)
				seen.add(q.id)
			}
		}
		expect(seen.size).toBe(12)
	})

	test("No selection limit: returns all items; attempts do not change selection", () => {
		const ids = Array.from({ length: 7 }, (_, i) => `q${i + 1}`)
		const xml =
			`<qti-assessment-test identifier="noselect">` +
			"<qti-test-part>" +
			`<qti-assessment-section identifier="S">` +
			`<qti-ordering shuffle="true"/>` +
			ids.map((id) => `<qti-assessment-item-ref identifier="${id}"/>`).join("") +
			"</qti-assessment-section>" +
			"</qti-test-part>" +
			"</qti-assessment-test>"
		const testObj = buildAssessmentTest(xml, "noselect_test")
		const resolved = buildResolvedQuestions(ids)
		const a1 = applyQtiSelectionAndOrdering(testObj, resolved, { baseSeed: "u:r", attemptNumber: 1 })
		const a2 = applyQtiSelectionAndOrdering(testObj, resolved, { baseSeed: "u:r", attemptNumber: 3 })
		expect(a1.map((q) => q.id)).toEqual(a2.map((q) => q.id))
		expect(a1.length).toBe(ids.length)
	})

	test("k >= n: returns full bank; wrap-around equals attempt 1", () => {
		const ids = Array.from({ length: 5 }, (_, i) => `q${i + 1}`)
		const xml = buildQtiXml({ sectionId: "S", itemIds: ids, shuffle: false, selectCount: 10 })
		const testObj = buildAssessmentTest(xml, "k_ge_n")
		const resolved = buildResolvedQuestions(ids)
		const first = applyQtiSelectionAndOrdering(testObj, resolved, { baseSeed: "seed", attemptNumber: 1 })
		const attemptsNeeded = rotationWindowCount(ids.length, Math.min(10, ids.length))
		const wrapped = applyQtiSelectionAndOrdering(testObj, resolved, {
			baseSeed: "seed",
			attemptNumber: attemptsNeeded + 1
		})
		expect(first.map((q) => q.id).sort()).toEqual(ids.slice().sort())
		expect(wrapped.map((q) => q.id)).toEqual(first.map((q) => q.id))
	})

	test("Attempt wrap-around equals attempt 1 for divisible windows (shuffle=false and true)", () => {
		const ids = Array.from({ length: 12 }, (_, i) => `q${i + 1}`)
		for (const shuffle of [false, true]) {
			const xml = buildQtiXml({ sectionId: "S", itemIds: ids, shuffle, selectCount: 4 })
			const testObj = buildAssessmentTest(xml, `wrap_${shuffle ? "t" : "f"}`)
			const resolved = buildResolvedQuestions(ids)
			const first = applyQtiSelectionAndOrdering(testObj, resolved, { baseSeed: "u:r", attemptNumber: 1 })
			const wrapped = applyQtiSelectionAndOrdering(testObj, resolved, { baseSeed: "u:r", attemptNumber: 3 + 1 })
			expect(wrapped.map((q) => q.id)).toEqual(first.map((q) => q.id))
		}
	})

	test("Missing referenced item in XML throws error", () => {
		const ids = ["q1", "q2", "q3"]
		const xml =
			`<qti-assessment-test identifier="bad_ref">` +
			"<qti-test-part>" +
			`<qti-assessment-section identifier="S">` +
			`<qti-selection select="2"/>` +
			`<qti-assessment-item-ref identifier="q1"/>` +
			`<qti-assessment-item-ref identifier="qX"/>` +
			"</qti-assessment-section>" +
			"</qti-test-part>" +
			"</qti-assessment-test>"
		const testObj = buildAssessmentTest(xml, "bad_ref")
		const resolved = buildResolvedQuestions(ids)
		expect(() => applyQtiSelectionAndOrdering(testObj, resolved, { baseSeed: "seed", attemptNumber: 1 })).toThrow()
	})

	test("Zero sections: returns all items in provided order", () => {
		const ids = ["a", "b", "c", "d"]
		const xml = `<qti-assessment-test identifier="no_sections"></qti-assessment-test>`
		const testObj = buildAssessmentTest(xml, "no_sections")
		const resolved = buildResolvedQuestions(ids)
		const a1 = applyQtiSelectionAndOrdering(testObj, resolved, { baseSeed: "seed", attemptNumber: 1 })
		const a2 = applyQtiSelectionAndOrdering(testObj, resolved, { baseSeed: "seed", attemptNumber: 2 })
		expect(a1.map((q) => q.id)).toEqual(ids)
		expect(a2.map((q) => q.id)).toEqual(ids)
	})
})
