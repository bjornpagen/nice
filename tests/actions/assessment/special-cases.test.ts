import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
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

// Provide minimal clients and cache to avoid unrelated module errors in suite
mock.module("@/lib/clients", () => ({
	oneroster: {
		getAllResults: mockGetAllResults,
		putResult: mockPutResult,
		getResult: mockGetResult
	},
	caliper: { sendCaliperEvents: (_e: unknown) => Promise.resolve() }
}))
mock.module("@/lib/cache", () => ({
	redisCache: async <T>(cb: () => Promise<T>, _k: (string | number)[], _o: { revalidate: number | false }) => cb(),
	userProgressByCourse: (_u: string, _c: string) => `user-progress:${_u}:${_c}`,
	invalidateCache: (_k: string) => Promise.resolve()
}))
mock.module("@/lib/data/fetchers/oneroster", () => ({
	getClass: (_id: string) => Promise.resolve(null),
	getActiveEnrollmentsForUser: (_u: string) => Promise.resolve([])
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
	// Reset gradebook mock to default implementation
	mockSaveResult.mockReset()
	mockSaveResult.mockImplementation(() => Promise.resolve("result_id"))
})

describe("XP Rewarding Logic - Special Cases", () => {
	test("XP Farming: Should award 0 XP if already proficient", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(true))
		await finalizeAssessment({ ...defaultOptions })

		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		// Atomic event reports exercise-only XP independent of award gating
		expect(finalXp).toBe(125)
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
		// Atomic event excludes banked XP; gradebook still stores total
		expect(finalXp).toBe(100)
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
		expect(finalXp).toBe(100)
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
		expect(finalXp).toBe(100)
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
		expect(finalXp).toBe(100)
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
		if (!payload) {
			logger.error("analytics payload missing in test")
			throw errors.new("analytics payload missing")
		}
		// Attempt 2, 100% => base = expectedXp * 1.0, plus banked 20
		expect(payload.finalXp).toBe(defaultOptions.expectedXp * 1.0)
	})
})
