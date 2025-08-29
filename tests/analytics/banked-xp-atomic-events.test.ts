import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import type { AssessmentState } from "@/lib/assessment-cache"
import type { Question } from "@/lib/types/domain"

// --- MOCKS (BEFORE SUT IMPORT) ---

// Mock assessment cache
const mockGetAssessmentState = mock((): Promise<AssessmentState | null> => Promise.resolve(null))
const mockMarkAssessmentFinalized = mock(() => Promise.resolve())
const mockMarkAssessmentFinalizationFailed = mock(() => Promise.resolve())
mock.module("@/lib/assessment-cache", () => ({
	getAssessmentState: mockGetAssessmentState,
	markAssessmentFinalized: mockMarkAssessmentFinalized,
	markAssessmentFinalizationFailed: mockMarkAssessmentFinalizationFailed
}))

// Mock authorization (partial)
const actualAuthorization = await import("@/lib/authorization")
mock.module("@/lib/authorization", () => ({
	...actualAuthorization,
	getCurrentUserSourcedId: mock(() => Promise.resolve("user_atomic"))
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
mock.module("@clerk/nextjs/server", () => ({
	auth: () => Promise.resolve({ userId: "atomic_test_user" }),
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

// Mock cache first to avoid side effects
mock.module("@/lib/cache", () => ({
	userProgressByCourse: (_u: string, _c: string) => `user-progress:${_u}:${_c}`,
	invalidateCache: mock(() => Promise.resolve()),
	redisCache: async <T>(cb: () => Promise<T>) => cb()
}))

// Mock services
mock.module("@/lib/services/streak", () => ({ update: mock(() => Promise.resolve()) }))
mock.module("@/lib/services/cache", () => ({
	invalidateUserCourseProgress: mock((_u: string, _c: string) => Promise.resolve())
}))
mock.module("@/lib/services/proficiency", () => ({
	updateFromAssessment: mock(() => Promise.resolve())
}))

// Mock clients
mock.module("@/lib/clients", () => ({
	caliper: { sendCaliperEvents: (_e: unknown) => Promise.resolve() },
	oneroster: {
		getAllResults: () => Promise.resolve([]),
		putResult: () => Promise.resolve({}),
		getResult: () => Promise.resolve({})
	}
}))

// Mock ports
mock.module("@/lib/ports/gradebook", () => ({
	saveResult: () => Promise.resolve("result_id")
}))

// Mock XP bank
const mockAwardBankedXp = mock(() => Promise.resolve({ bankedXp: 50, awardedResourceIds: ["video1"] }))
mock.module("@/lib/xp/bank", () => ({
	awardBankedXpForExercise: mockAwardBankedXp,
	awardBankedXpForUnitCompletion: () => Promise.resolve({ bankedXp: 0, awardedResourceIds: [] })
}))

// Mock OneRoster fetchers
const actualOnerosterFetchers = await import("@/lib/data/fetchers/oneroster")
mock.module("@/lib/data/fetchers/oneroster", () => ({
	...actualOnerosterFetchers,
	getClass: (_id: string) => Promise.resolve(null),
	getActiveEnrollmentsForUser: (_u: string) => Promise.resolve([])
}))

// --- IMPORT SUT (AFTER MOCKS) ---
const { finalizeAssessment } = await import("@/lib/actions/assessment")

// --- SETUP SPIES ---
const analytics = await import("@/lib/ports/analytics")
const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent")

// --- Test Data ---
const defaultOptions = {
	onerosterResourceSourcedId: "res_atomic_exercise",
	onerosterComponentResourceSourcedId: "comp_atomic_exercise",
	onerosterCourseSourcedId: "course_atomic",
	expectedXp: 100,
	assessmentTitle: "Atomic XP Test",
	assessmentPath: "/math/algebra/unit/lesson/e/atomic-test",
	contentType: "Exercise" as const,
	unitData: { id: "u1", slug: "u1", title: "U1", path: "/p", description: "", ordering: 1, children: [] }
}

afterEach(() => {
	analyticsSpy.mockClear()
	mockAwardBankedXp.mockClear()
	mockGetAssessmentState.mockClear()
	mockApplyQtiSelection.mockClear()
	mockGetNextAttempt.mockClear()
	mockAwardXp.mockClear()
})

describe("Banked XP - Atomic Caliper Events Contract", () => {
	test("ActivityCompleted event for an Exercise MUST report exercise-only XP, excluding banked XP", async () => {
		// Setup state for 100% accuracy
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

		// XP service returns exercise + banked
		mockAwardXp.mockResolvedValue({
			finalXp: 175, // 125 exercise + 50 banked
			multiplier: 1.25,
			penaltyApplied: false,
			reason: "first attempt 100% accuracy"
		})

		// Act
		await finalizeAssessment(defaultOptions)

		// Assert
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		const eventPayload = analyticsSpy.mock.calls[0]?.[0]
		const exerciseOnlyXp = 125 // 100 base * 1.25 bonus for 1st attempt 100%
		expect(eventPayload?.finalXp).toBe(exerciseOnlyXp) // Exercise-only, not 175
	})

	test("Quiz/Test ActivityEvent MUST report total XP as no banking occurs", async () => {
		// Setup state for Quiz
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

		// XP service returns total XP (no banking for Quiz)
		mockAwardXp.mockResolvedValue({
			finalXp: 125,
			multiplier: 1.25,
			penaltyApplied: false,
			reason: "first attempt 100% accuracy"
		})

		// Act
		await finalizeAssessment({ ...defaultOptions, contentType: "Quiz" })

		// Assert
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		const eventPayload = analyticsSpy.mock.calls[0]?.[0]
		expect(eventPayload?.finalXp).toBe(125) // For Quiz, uses XP service value
		expect(mockAwardBankedXp).not.toHaveBeenCalled() // No banking for Quiz
	})

	test("Daily aggregation (simulated) MUST equal atomic event XP + banked XP to prevent double counting", async () => {
		const bankedXpAmount = 50

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

		// XP service returns total including banked
		mockAwardXp.mockResolvedValue({
			finalXp: 175, // 125 exercise + 50 banked
			multiplier: 1.25,
			penaltyApplied: false,
			reason: "first attempt 100% accuracy"
		})

		// Act
		await finalizeAssessment(defaultOptions)

		// Assert
		const eventPayload = analyticsSpy.mock.calls[0]?.[0]
		const exerciseOnlyXp = 125
		expect(eventPayload?.finalXp).toBe(exerciseOnlyXp)

		// Simulate the analytics pipeline summing the atomic event with ETL'd banked data
		const simulatedTotal = (eventPayload?.finalXp ?? 0) + bankedXpAmount
		expect(simulatedTotal).toBe(175) // 125 (exercise) + 50 (banked)
	})

	test("Test content type uses internal calculation for analytics", async () => {
		// Setup state for Test
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }, { id: "q2" }, { id: "q3" }])
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 3,
			totalQuestions: 3,
			startedAt: new Date(Date.now() - 180000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false },
				1: { isCorrect: false, response: null, isReported: false },
				2: { isCorrect: true, response: null, isReported: false }
			}
		})

		// XP service returns calculated value for Test (not used by analytics)
		mockAwardXp.mockResolvedValue({
			finalXp: 67, // 67% accuracy
			multiplier: 0.67,
			penaltyApplied: false,
			reason: "first attempt 67% accuracy"
		})

		// Act
		await finalizeAssessment({
			...defaultOptions,
			contentType: "Test",
			assessmentTitle: "Unit Test"
		})

		// Assert
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		const eventPayload = analyticsSpy.mock.calls[0]?.[0]
		// Below mastery threshold -> 0 via internal calculation
		expect(eventPayload?.finalXp).toBe(0)
	})
})
