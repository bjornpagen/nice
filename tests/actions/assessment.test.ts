import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import { finalizeAssessment } from "@/lib/actions/assessment"
import type { Unit } from "@/lib/types/domain"

// Create typed mock functions
const mockGetAllResults = mock(() => {})
const mockPutResult = mock(() => {})
const mockGetResult = mock(() => {})
const mockSaveResult = mock(() => {})
// Local spies are created below via spyOn; keep placeholders for type
const mockUpdateFromAssessment = mock(() => {})
const mockUpdateStreak = mock(() => {})
const mockCheckExistingProficiency = mock((_userSourcedId: string, _assessmentSourcedId: string) =>
	Promise.resolve(false)
)
const mockAwardBankedXpForExercise = mock(
	(_params: {
		exerciseResourceSourcedId: string
		onerosterUserSourcedId: string
		onerosterCourseSourcedId: string
	}): Promise<{ bankedXp: number; awardedResourceIds: string[] }> =>
		Promise.resolve({ bankedXp: 0, awardedResourceIds: [] })
)

// Mock external dependencies and ports
mock.module("@/lib/clients", () => ({
	oneroster: {
		getAllResults: mockGetAllResults,
		putResult: mockPutResult,
		getResult: mockGetResult
	}
}))

mock.module("@/lib/ports/gradebook", () => ({
	saveResult: mockSaveResult
}))

// NOTE: Do not mock analytics module globally to avoid polluting other test files

mock.module("@/lib/services/proficiency", () => ({
	updateFromAssessment: mockUpdateFromAssessment
}))

mock.module("@/lib/actions/streak", () => ({
	updateStreak: mockUpdateStreak
}))

mock.module("@/lib/actions/assessment", () => ({
	finalizeAssessment,
	checkExistingProficiency: mockCheckExistingProficiency
}))

mock.module("@/lib/xp/bank", () => ({
	awardBankedXpForExercise: mockAwardBankedXpForExercise
}))

const mockAuth = mock(() => Promise.resolve({ userId: "mock_clerk_user_id" }))
mock.module("@clerk/nextjs/server", () => ({
	auth: mockAuth,
	clerkClient: () => ({
		users: {
			getUser: () => Promise.resolve({ publicMetadata: {} }),
			updateUserMetadata: mock(() => Promise.resolve({ publicMetadata: {} }))
		}
	})
}))

// Default auth behavior
mockAuth.mockImplementation(() => Promise.resolve({ userId: "mock_clerk_user_id" }))

// Import modules after mocking
const analytics = await import("@/lib/ports/analytics")
const gradebook = await import("@/lib/ports/gradebook")
const xpBank = await import("@/lib/xp/bank")
const clients = await import("@/lib/clients")

const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent")
const timeSpentSpy = spyOn(analytics, "sendTimeSpentEvent")
const gradebookSpy = spyOn(gradebook, "saveResult")
const bankSpy = spyOn(xpBank, "awardBankedXpForExercise")
// Prevent outbound Caliper HTTP calls from this test file
const caliperSendSpy = spyOn(clients.caliper, "sendCaliperEvents").mockImplementation((_e) => Promise.resolve())

// Create a proper Unit object for testing
const mockUnit: Unit = {
	id: "unit1",
	slug: "test-unit",
	title: "Test Unit",
	description: "A test unit for testing",
	path: "/test/unit",
	ordering: 1,
	children: []
}

// Helper for default assessment options
const defaultOptions = {
	onerosterResourceSourcedId: "exercise1",
	onerosterComponentResourceSourcedId: "component_exercise1",
	onerosterCourseSourcedId: "course1",
	onerosterUserSourcedId: "user1",
	sessionResults: [{ qtiItemId: "q1", isCorrect: true, isReported: false }],
	attemptNumber: 1,
	durationInSeconds: 60,
	expectedXp: 100,
	assessmentTitle: "Test Assessment",
	assessmentPath: "/math/algebra",
	userEmail: "test@example.com",
	contentType: "Exercise" as const,
	unitData: mockUnit
}

afterEach(() => {
	// Clear all mock history between tests
	analyticsSpy.mockClear()
	gradebookSpy.mockClear()
	bankSpy.mockClear()
	mockGetAllResults.mockClear()
	mockCheckExistingProficiency.mockClear()
	timeSpentSpy.mockClear()
	mockUpdateStreak.mockClear()
	mockAuth.mockClear()
	// Reset bank implementation to default to avoid spillover between tests
	mockAwardBankedXpForExercise.mockReset()
	mockAwardBankedXpForExercise.mockImplementation((_params) => Promise.resolve({ bankedXp: 0, awardedResourceIds: [] }))
	caliperSendSpy.mockClear()
})

describe("XP Rewarding Logic - Mastery and Retries", () => {
	test("First attempt: 100% accuracy should award 1.25x bonus XP", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		await finalizeAssessment({ ...defaultOptions })

		expect(analyticsSpy).toHaveBeenCalled()
		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(125) // 100 * 1.25

		expect(gradebookSpy).toHaveBeenCalled()
		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.multiplier).toBe(1.25)
		expect(metadata?.xpReason).toContain("100% accuracy bonus")
	})

	test("First attempt: 80% accuracy should award 1.0x XP", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})

		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(100) // 100 * 1.0
		expect(gradebookSpy.mock.calls[0]?.[0]?.metadata?.multiplier).toBe(1.0)
	})

	test("First attempt: 79% accuracy should award 0 XP", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})

		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(0)
		expect(gradebookSpy.mock.calls[0]?.[0]?.metadata?.multiplier).toBe(0)
	})

	test("Retry: 100% accuracy should award 1.0x XP (no bonus)", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		await finalizeAssessment({
			...defaultOptions,
			attemptNumber: 2
		})

		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(100) // 100 * 1.0
		expect(gradebookSpy.mock.calls[0]?.[0]?.metadata?.multiplier).toBe(1.0)
	})

	test("Retry: 80-99% accuracy should award 0.5x XP", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		await finalizeAssessment({
			...defaultOptions,
			attemptNumber: 2,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: true, isReported: false },
				{ qtiItemId: "q6", isCorrect: true, isReported: false },
				{ qtiItemId: "q7", isCorrect: true, isReported: false },
				{ qtiItemId: "q8", isCorrect: true, isReported: false },
				{ qtiItemId: "q9", isCorrect: true, isReported: false },
				{ qtiItemId: "q10", isCorrect: false, isReported: false }
			]
		})

		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(50) // 100 * 0.5
		expect(gradebookSpy.mock.calls[0]?.[0]?.metadata?.multiplier).toBe(0.5)
	})
})

describe("XP Rewarding Logic - Special Cases", () => {
	test("XP Farming: Should award 0 XP if already proficient", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(true))
		await finalizeAssessment({ ...defaultOptions })

		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(0)
		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.xpReason).toBe("XP farming prevention: user already proficient")
		expect(bankSpy).not.toHaveBeenCalled()
	})

	test("Rush Penalty: Should apply negative XP for insincere effort", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: false, isReported: false },
				{ qtiItemId: "q3", isCorrect: false, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false },
				{ qtiItemId: "q6", isCorrect: false, isReported: false },
				{ qtiItemId: "q7", isCorrect: false, isReported: false },
				{ qtiItemId: "q8", isCorrect: false, isReported: false },
				{ qtiItemId: "q9", isCorrect: false, isReported: false },
				{ qtiItemId: "q10", isCorrect: false, isReported: false }
			],
			durationInSeconds: 30 // 3s/question < 5s threshold
		})

		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(-10) // -floor(10)
		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.penaltyApplied).toBe(true)
		expect(metadata?.xpReason).toBe("Rush penalty: insincere effort detected")
	})

	test("Banked XP: Should be awarded for mastering an Exercise", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		mockAwardBankedXpForExercise.mockImplementation((_params) =>
			Promise.resolve({ bankedXp: 50, awardedResourceIds: ["video1"] })
		)

		await finalizeAssessment({
			...defaultOptions,
			contentType: "Exercise",
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})

		expect(bankSpy).toHaveBeenCalled()
		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(150) // 100 (exercise xp * 1.0) + 50 (banked)
	})

	test("Banked XP: Should NOT be awarded for mastering a Quiz", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))

		await finalizeAssessment({
			...defaultOptions,
			contentType: "Quiz",
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})

		expect(bankSpy).not.toHaveBeenCalled()
		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(100)
	})

	test("Banked XP: Should include video XP when mastering an Exercise", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		mockAwardBankedXpForExercise.mockImplementation((_params) =>
			Promise.resolve({
				bankedXp: 75,
				awardedResourceIds: ["video1", "video2"]
			})
		)

		await finalizeAssessment({
			...defaultOptions,
			contentType: "Exercise",
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})

		expect(bankSpy).toHaveBeenCalled()
		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(175) // 100 (exercise xp * 1.0) + 75 (banked video XP)
	})

	test("Banked XP: Should include article XP when mastering an Exercise", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		mockAwardBankedXpForExercise.mockImplementation((_params) =>
			Promise.resolve({
				bankedXp: 30,
				awardedResourceIds: ["article1", "article2", "article3"]
			})
		)

		await finalizeAssessment({
			...defaultOptions,
			contentType: "Exercise",
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})

		expect(bankSpy).toHaveBeenCalled()
		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(130) // 100 (exercise xp * 1.0) + 30 (banked article XP)
	})

	test("Banked XP: Should include mixed content XP when mastering an Exercise", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		mockAwardBankedXpForExercise.mockImplementation((_params) =>
			Promise.resolve({
				bankedXp: 100,
				awardedResourceIds: ["video1", "article1", "video2", "article2"]
			})
		)

		await finalizeAssessment({
			...defaultOptions,
			contentType: "Exercise",
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})

		expect(bankSpy).toHaveBeenCalled()
		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(200) // 100 (exercise xp * 1.0) + 100 (banked mixed content XP)
	})

	test("Bank not invoked below mastery for Exercise", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))

		await finalizeAssessment({
			...defaultOptions,
			contentType: "Exercise",
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})

		// 3/5 correct => 60% < 80% mastery; no bank call
		expect(bankSpy).not.toHaveBeenCalled()
	})

	test("Bank invoked on retry when mastering Exercise", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		mockAwardBankedXpForExercise.mockImplementation((_p) =>
			Promise.resolve({ bankedXp: 20, awardedResourceIds: ["video1"] })
		)

		await finalizeAssessment({
			...defaultOptions,
			contentType: "Exercise",
			attemptNumber: 2,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: true, isReported: false }
			]
		})

		expect(bankSpy).toHaveBeenCalled()
		const payload = analyticsSpy.mock.calls[0]?.[0]
		if (!payload) throw errors.new("analytics payload missing")
		// Attempt 2, 100% => base = expectedXp * 1.0, plus banked 20
		expect(payload.finalXp).toBe(defaultOptions.expectedXp * 1.0 + 20)
	})
})

describe("Side Effects and Error Propagation", () => {
	test("Streak updates only when XP > 0", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))

		// Positive XP case
		await finalizeAssessment({ ...defaultOptions })
		expect(mockUpdateStreak).toHaveBeenCalled()

		// Zero XP case (below mastery)
		mockUpdateStreak.mockClear()
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: false, isReported: false },
				{ qtiItemId: "q3", isCorrect: false, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})
		expect(mockUpdateStreak).not.toHaveBeenCalled()

		// Negative XP case (rush penalty)
		mockUpdateStreak.mockClear()
		await finalizeAssessment({
			...defaultOptions,
			durationInSeconds: 30,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: false, isReported: false },
				{ qtiItemId: "q3", isCorrect: false, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false },
				{ qtiItemId: "q6", isCorrect: false, isReported: false },
				{ qtiItemId: "q7", isCorrect: false, isReported: false },
				{ qtiItemId: "q8", isCorrect: false, isReported: false },
				{ qtiItemId: "q9", isCorrect: false, isReported: false },
				{ qtiItemId: "q10", isCorrect: false, isReported: false }
			]
		})
		expect(mockUpdateStreak).not.toHaveBeenCalled()
	})

	test("Reason strings cover all branches", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))

		// Attempt 1, 80%
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})
		let meta = gradebookSpy.mock.calls.pop()?.[0]?.metadata
		expect(meta?.xpReason).toBe("First attempt: mastery achieved")

		// Attempt 2, 100%
		gradebookSpy.mockClear()
		await finalizeAssessment({ ...defaultOptions, attemptNumber: 2 })
		meta = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(meta?.xpReason).toBe("Attempt 2: 100% accuracy")

		// Attempt 2, 80–99%
		gradebookSpy.mockClear()
		await finalizeAssessment({
			...defaultOptions,
			attemptNumber: 2,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})
		meta = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(meta?.xpReason).toBe("Attempt 2: mastery achieved (reduced XP)")

		// Attempt 1, <80%
		gradebookSpy.mockClear()
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: false, isReported: false }
			]
		})
		meta = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(meta?.xpReason).toBe("First attempt: below mastery threshold")
	})

	test("Rounding behavior for non-roundable base XP", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		await finalizeAssessment({ ...defaultOptions, expectedXp: 99 })
		const payload = analyticsSpy.mock.calls[0]?.[0]
		if (!payload) throw errors.new("analytics payload missing")
		// 99 * 1.25 = 123.75 => rounds to 124
		expect(payload.finalXp).toBe(124)
	})

	test("Invalid assessment path throws and blocks side effects", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		const res = await errors.try(finalizeAssessment({ ...defaultOptions, assessmentPath: "/invalid" }))
		expect(Boolean(res.error)).toBe(true)
		expect(gradebookSpy).not.toHaveBeenCalled()
		expect(analyticsSpy).not.toHaveBeenCalled()
	})

	test("Auth required: no user id causes error", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		// keep typesafe: empty string is falsy and triggers auth error
		mockAuth.mockImplementation(() => Promise.resolve({ userId: "" }))
		const res = await errors.try(finalizeAssessment({ ...defaultOptions }))
		expect(Boolean(res.error)).toBe(true)
		expect(gradebookSpy).not.toHaveBeenCalled()
		// restore
		mockAuth.mockImplementation(() => Promise.resolve({ userId: "mock_clerk_user_id" }))
	})

	test("Gradebook failure propagates and blocks analytics", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		mockSaveResult.mockImplementation(() => Promise.reject(errors.new("db error")))
		const res = await errors.try(finalizeAssessment({ ...defaultOptions }))
		expect(Boolean(res.error)).toBe(true)
		expect(analyticsSpy).not.toHaveBeenCalled()
		// restore
		mockSaveResult.mockImplementation(() => Promise.resolve({}))
	})

	test("Time spent event gating", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		await finalizeAssessment({ ...defaultOptions, durationInSeconds: 10 })
		expect(timeSpentSpy).toHaveBeenCalled()

		timeSpentSpy.mockClear()
		await finalizeAssessment({ ...defaultOptions, durationInSeconds: 0 })
		expect(timeSpentSpy).not.toHaveBeenCalled()
	})

	test("Gradebook metadata fields presence", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		await finalizeAssessment({ ...defaultOptions })
		const saved = gradebookSpy.mock.calls[0]?.[0]
		if (!saved) throw errors.new("gradebook payload missing")
		expect(saved.metadata?.attempt).toBe(defaultOptions.attemptNumber)
		expect(saved.metadata?.durationInSeconds).toBe(defaultOptions.durationInSeconds)
		expect(saved.metadata?.lessonType).toBe("exercise")
		expect(saved.metadata?.courseSourcedId).toBe(defaultOptions.onerosterCourseSourcedId)
	})
})

describe("Input Handling and Edge Cases", () => {
	test("Rush penalty: no penalty exactly at threshold time per question", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))

		await finalizeAssessment({
			...defaultOptions,
			durationInSeconds: 50, // 10 questions * 5s threshold (we'll pass 10 Qs below)
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: false, isReported: false },
				{ qtiItemId: "q2", isCorrect: false, isReported: false },
				{ qtiItemId: "q3", isCorrect: false, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false },
				{ qtiItemId: "q6", isCorrect: false, isReported: false },
				{ qtiItemId: "q7", isCorrect: false, isReported: false },
				{ qtiItemId: "q8", isCorrect: false, isReported: false },
				{ qtiItemId: "q9", isCorrect: false, isReported: false },
				{ qtiItemId: "q10", isCorrect: true, isReported: false }
			]
		})

		// 1/10 correct => 10% accuracy, first attempt => 0 XP, no penalty
		const payload = analyticsSpy.mock.calls[0]?.[0]
		if (!payload) throw errors.new("analytics payload missing")
		expect(payload.finalXp).toBe(0)
		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.xpReason).toBe("First attempt: below mastery threshold")
		// time spent event should be sent since duration >= 1
		expect(timeSpentSpy).toHaveBeenCalled()
	})
	test("Should exclude reported questions from score calculation", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: true } // This one should be ignored
			]
			// The score calculation logic inside finalizeAssessment will recalculate this
			// based on the filtered sessionResults.
		})

		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.totalQuestions).toBe(1)
		expect(metadata?.correctQuestions).toBe(1)
		expect(metadata?.accuracy).toBe(100)
	})

	test("Should handle zero non-reported questions gracefully", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [{ qtiItemId: "q1", isCorrect: true, isReported: true }]
		})

		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.totalQuestions).toBe(0)
		expect(metadata?.correctQuestions).toBe(0)
		expect(metadata?.accuracy).toBe(100) // Defaults to 100 when total is 0

		// No questions => base accuracy used for XP core in service is 0 (no mastery)
		const payload = analyticsSpy.mock.calls[0]?.[0]
		if (!payload) throw errors.new("analytics payload missing")
		expect(payload.finalXp).toBe(0)
	})
	test("Retrials of the same question MUST NOT increase totalQuestions", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))

		await finalizeAssessment({
			...defaultOptions,
			// Multiple entries for same qtiItemId; only the last non-reported attempt should count
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: false, isReported: false },
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: false, isReported: false },
				{ qtiItemId: "q3", isCorrect: false, isReported: true },
				{ qtiItemId: "q4", isCorrect: true, isReported: false }
			]
		})

		const saved = gradebookSpy.mock.calls[0]?.[0]
		if (!saved) throw errors.new("gradebook payload missing")

		// q1 (last=true), q2 (true), q3 (reported -> exclude), q4 (true) => 3/3, 100%
		expect(saved.metadata?.totalQuestions).toBe(3)
		expect(saved.metadata?.correctQuestions).toBe(3)
		expect(saved.metadata?.accuracy).toBe(100)
	})
})

describe("Banked XP Sum Consistency", () => {
	test("Sum of article and video banked XP equals derived banked XP", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))

		// Define per-type banked XP for this scenario
		const articleXp = 70
		const videoXp = 30
		const totalBanked = articleXp + videoXp

		// Mock the bank to return the combined banked XP with a mixed set of resources
		mockAwardBankedXpForExercise.mockImplementation((_params) =>
			Promise.resolve({ bankedXp: totalBanked, awardedResourceIds: ["video1", "article1", "video2", "article2"] })
		)

		await finalizeAssessment({
			...defaultOptions,
			contentType: "Exercise",
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: true, isReported: false }
			]
		})

		// For first attempt with 100% accuracy on an Exercise, base multiplier is 1.25
		const expectedBaseXpWithBonus = defaultOptions.expectedXp * 1.25
		const fx = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		if (typeof fx !== "number") {
			throw errors.new("final xp missing in analytics payload")
		}
		const finalXp = fx
		const derivedBanked = finalXp - expectedBaseXpWithBonus

		expect(derivedBanked).toBe(articleXp + videoXp)
	})
})
