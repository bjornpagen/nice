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
// Ensure caliper client exists
// @ts-ignore
if (!clients.caliper?.sendCaliperEvents) {
  // @ts-ignore
  clients.caliper = { sendCaliperEvents: (_e: unknown) => Promise.resolve() }
}

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
		if (!payload) {
			logger.error("analytics payload missing in test")
			throw errors.new("analytics payload missing")
		}
		// 1/10 correct => 10% accuracy, first attempt => 0 XP (no mastery), no penalty at threshold
		expect(payload.finalXp).toBe(0)
		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.xpReason).toBe("First attempt: below mastery threshold")
		// time spent event should be sent since duration >= 1
		expect(timeSpentSpy).toHaveBeenCalled()
	})

	test("should handle zero non-reported questions gracefully and award bonus XP", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [{ qtiItemId: "q1", isCorrect: true, isReported: true }]
		})

		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.totalQuestions).toBe(0)
		expect(metadata?.correctQuestions).toBe(0)
		// With totalQuestions=0, accuracy defaults to 100%
		expect(metadata?.accuracy).toBe(100)

		const payload = analyticsSpy.mock.calls[0]?.[0]
		// XP is awarded based on 100% accuracy, even with zero questions
		expect(payload?.finalXp).toBe(125)
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
		// With totalQuestions=0, accuracy defaults to 100%
		expect(metadata?.accuracy).toBe(100)

		const payload = analyticsSpy.mock.calls[0]?.[0]
		// XP is awarded based on 100% accuracy, even with zero questions
		expect(payload?.finalXp).toBe(125)
	})

	test("should not apply rush penalty if duration is undefined", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		await finalizeAssessment({
			...defaultOptions,
			durationInSeconds: undefined, // undefined, not 0
			sessionResults: [{ qtiItemId: "q1", isCorrect: false, isReported: false }]
		})

		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.penaltyApplied).toBe(false)
		// with 0% accuracy, XP should be 0
		expect(metadata?.xp).toBe(0)
	})
})


