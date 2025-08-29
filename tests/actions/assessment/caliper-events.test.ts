import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import type { AssessmentState } from "@/lib/assessment-cache"
import type { Question, Unit } from "@/lib/types/domain"

// --- MOCKS (BEFORE SUT IMPORT) ---

// Mock assessment cache (partial)
const actualAssessmentCache = await import("@/lib/assessment-cache")
const mockGetAssessmentState = mock((): Promise<AssessmentState | null> => Promise.resolve(null))
const mockMarkAssessmentFinalized = mock(() => Promise.resolve())
const mockMarkAssessmentFinalizationFailed = mock(() => Promise.resolve())
mock.module("@/lib/assessment-cache", () => ({
	...actualAssessmentCache,
	getAssessmentState: mockGetAssessmentState,
	markAssessmentFinalized: mockMarkAssessmentFinalized,
	markAssessmentFinalizationFailed: mockMarkAssessmentFinalizationFailed
}))

// Mock authorization (partial)
const actualAuthorization = await import("@/lib/authorization")
mock.module("@/lib/authorization", () => ({
	...actualAuthorization,
	getCurrentUserSourcedId: mock(() => Promise.resolve("user1"))
}))

// Mock attempt service
const mockGetNextAttempt = mock(() => Promise.resolve(1))
mock.module("@/lib/services/attempt", () => ({
	getNext: mockGetNextAttempt
}))

// Mock question fetching and selection
mock.module("@/lib/data/fetchers/interactive-helpers", () => ({
	fetchAndResolveQuestions: mock(async () => ({ assessmentTest: {}, resolvedQuestions: [] }))
}))
const mockApplyQtiSelection = mock((): Question[] => [])
mock.module("@/lib/qti-selection", () => ({
	applyQtiSelectionAndOrdering: mockApplyQtiSelection
}))

// Mock XP service
const mockAwardXp = mock(() => Promise.resolve({ finalXp: 125, multiplier: 1.25, penaltyApplied: false, reason: "ok" }))
mock.module("@/lib/xp/service", () => ({
	awardXpForAssessment: mockAwardXp
}))

// Mock Clerk
const mockAuth = mock(() => Promise.resolve({ userId: "mock_clerk_user_id" }))
mock.module("@clerk/nextjs/server", () => ({
	auth: mockAuth,
	clerkClient: () => ({
		users: {
			getUser: () =>
				Promise.resolve({
					publicMetadata: {},
					emailAddresses: [{ emailAddress: "test@example.com" }]
				})
		}
	})
}))

// Mock OneRoster fetchers
mock.module("@/lib/data/fetchers/oneroster", () => ({
	getAllCoursesBySlug: mock(() => Promise.resolve([])),
	getClass: mock((_id: string) => Promise.resolve(null)),
	getActiveEnrollmentsForUser: mock((_u: string) => Promise.resolve([])),
	getCourseComponentByCourseAndSlug: mock(() => Promise.resolve(null))
}))

// Mock cache first to avoid side effects
mock.module("@/lib/cache", () => ({
	userProgressByCourse: (_u: string, _c: string) => `user-progress:${_u}:${_c}`,
	invalidateCache: mock(() => Promise.resolve()),
	redisCache: async <T>(cb: () => Promise<T>) => cb()
}))

// Mock services
mock.module("@/lib/services/streak", () => ({
	update: mock(() => Promise.resolve())
}))
mock.module("@/lib/services/cache", () => ({
	invalidateUserCourseProgress: mock((_u: string, _c: string) => Promise.resolve())
}))
mock.module("@/lib/services/proficiency", () => ({
	updateFromAssessment: mock(() => Promise.resolve())
}))

// Mock clients
const mockGetAllResults = mock(() => Promise.resolve([]))
const mockPutResult = mock(() => Promise.resolve({}))
const mockGetResult = mock(() => Promise.resolve({}))
const mockSaveResult = mock(() => Promise.resolve("result_id"))
mock.module("@/lib/clients", () => ({
	oneroster: {
		getAllResults: mockGetAllResults,
		putResult: mockPutResult,
		getResult: mockGetResult
	},
	caliper: { sendCaliperEvents: mock(() => Promise.resolve()) }
}))

// Mock ports
mock.module("@/lib/ports/gradebook", () => ({
	saveResult: mockSaveResult
}))

// Mock XP bank
const mockAwardBankedXpForExercise = mock(() => Promise.resolve({ bankedXp: 0, awardedResourceIds: [] }))
mock.module("@/lib/xp/bank", () => ({
	awardBankedXpForExercise: mockAwardBankedXpForExercise,
	awardBankedXpForUnitCompletion: () => Promise.resolve({ bankedXp: 0, awardedResourceIds: [] })
}))

// --- IMPORT SUT (AFTER MOCKS) ---
const { finalizeAssessment } = await import("@/lib/actions/assessment")

// --- SETUP SPIES ---
const analytics = await import("@/lib/ports/analytics")
const gradebook = await import("@/lib/ports/gradebook")

const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent")
const timeSpentSpy = spyOn(analytics, "sendTimeSpentEvent")
const gradebookSpy = spyOn(gradebook, "saveResult").mockResolvedValue("result_id")

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
	expectedXp: 100,
	assessmentTitle: "Test Assessment",
	assessmentPath: "/math/algebra/unit/lesson",
	contentType: "Exercise" as const,
	unitData: mockUnit
}

afterEach(() => {
	// Clear all mock history between tests
	analyticsSpy.mockClear()
	timeSpentSpy.mockClear()
	gradebookSpy.mockClear()
	mockGetAllResults.mockClear()
	mockGetAssessmentState.mockClear()
	mockApplyQtiSelection.mockClear()
	mockGetNextAttempt.mockClear()
	mockAuth.mockClear()
	mockAwardXp.mockClear()
	mockSaveResult.mockClear()
})

describe("Caliper Event Dispatch", () => {
	test("should send exactly one ActivityCompleted and one TimeSpent event on success", async () => {
		// Mock server state with a duration of 60s
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }])
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 1,
			totalQuestions: 1,
			startedAt: new Date(Date.now() - 60000).toISOString(), // 60s ago
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false }
			}
		})

		await finalizeAssessment(defaultOptions)

		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		expect(timeSpentSpy).toHaveBeenCalledTimes(1)

		// Verify time spent event has correct duration
		const timeSpentCall = timeSpentSpy.mock.calls[0]?.[0]
		expect(timeSpentCall?.durationInSeconds).toBe(60)
	})

	test("should send exactly one ActivityCompleted event when duration is zero", async () => {
		// Mock server state with zero duration (startedAt = now)
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }])
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 1,
			totalQuestions: 1,
			startedAt: new Date().toISOString(), // now = 0 duration
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false }
			}
		})

		await finalizeAssessment(defaultOptions)

		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		expect(timeSpentSpy).not.toHaveBeenCalled()
	})

	test("should NOT send any analytics events if gradebook save fails", async () => {
		// Setup state
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }])
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 1,
			totalQuestions: 1,
			startedAt: new Date(Date.now() - 60000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false }
			}
		})

		// Make gradebook save fail
		gradebookSpy.mockRejectedValue(errors.new("database unavailable"))

		const result = await errors.try(finalizeAssessment(defaultOptions))

		expect(result.error).toBeDefined()
		expect(analyticsSpy).not.toHaveBeenCalled()
		expect(timeSpentSpy).not.toHaveBeenCalled()
		// Verify that the failure was marked
		expect(mockMarkAssessmentFinalizationFailed).toHaveBeenCalled()
	})

	test("should send TimeSpent event only when duration >= 1 second", async () => {
		// Mock server state with 0.5s duration (should not send TimeSpent)
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }])
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 1,
			totalQuestions: 1,
			startedAt: new Date(Date.now() - 100).toISOString(), // ~0.1s ago to avoid rounding up to 1s
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false }
			}
		})

		// Ensure gradebook spy is resolved in this test (avoid pollution from previous test)
		gradebookSpy.mockResolvedValue("result_id")
		await finalizeAssessment(defaultOptions)

		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		expect(timeSpentSpy).not.toHaveBeenCalled() // Duration < 1s
	})
})
