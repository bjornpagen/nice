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
		// Atomic event now reports exercise-only XP, independent of award gating
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


