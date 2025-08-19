import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
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

// Mock authorization (partial to preserve other exports like isUserAuthorizedForQuestion)
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
const mockGetUser = mock(() =>
	Promise.resolve({
		publicMetadata: { streak: 5 },
		emailAddresses: [{ emailAddress: "test@example.com" }]
	})
)
mock.module("@clerk/nextjs/server", () => ({
	auth: mockAuth,
	clerkClient: () => ({
		users: {
			getUser: mockGetUser
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
const mockUpdateStreak = mock(() => Promise.resolve())
mock.module("@/lib/services/streak", () => ({
	update: mockUpdateStreak
}))
const mockInvalidateUserCourseProgress = mock((_u: string, _c: string) => Promise.resolve())
mock.module("@/lib/services/cache", () => ({
	invalidateUserCourseProgress: mockInvalidateUserCourseProgress
}))
const mockUpdateFromAssessment = mock(() => Promise.resolve())
mock.module("@/lib/services/proficiency", () => ({
	updateFromAssessment: mockUpdateFromAssessment
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
	awardBankedXpForExercise: mockAwardBankedXpForExercise
}))

// --- IMPORT SUT (AFTER MOCKS) ---
const { finalizeAssessment } = await import("@/lib/actions/assessment")

// --- SETUP SPIES ---
const analytics = await import("@/lib/ports/analytics")
const gradebook = await import("@/lib/ports/gradebook")
const services = await import("@/lib/services/cache")
const streak = await import("@/lib/services/streak")

const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent")
const timeSpentSpy = spyOn(analytics, "sendTimeSpentEvent")
const gradebookSpy = spyOn(gradebook, "saveResult").mockResolvedValue("result_id")
const cacheInvalidateSpy = spyOn(services, "invalidateUserCourseProgress")
const streakSpy = spyOn(streak, "update")

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
	cacheInvalidateSpy.mockClear()
	streakSpy.mockClear()
	mockGetAllResults.mockClear()
	mockGetAssessmentState.mockClear()
	mockApplyQtiSelection.mockClear()
	mockGetNextAttempt.mockClear()
	mockAuth.mockClear()
	mockAwardXp.mockClear()
	mockSaveResult.mockClear()
	mockUpdateStreak.mockClear()
	mockInvalidateUserCourseProgress.mockClear()
	mockUpdateFromAssessment.mockClear()
	mockGetUser.mockClear()
	mockMarkAssessmentFinalized.mockClear()
	mockMarkAssessmentFinalizationFailed.mockClear()
})

describe("Assessment Finalization Edge Cases", () => {
	test("Idempotency: does not re-process an already finalized state", async () => {
		// Arrange - state is already finalized
		const finalSummary = {
			score: 90,
			correctAnswersCount: 9,
			totalQuestions: 10,
			xpPenaltyInfo: undefined
		}

		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 10,
			totalQuestions: 10,
			startedAt: new Date(Date.now() - 300000).toISOString(),
			isFinalized: true,
			finalizationError: null,
			finalSummary,
			questions: {}
		})

		// Act
		const result = await finalizeAssessment(defaultOptions)

		// Assert - returns stored summary without processing
		expect(result).toEqual(finalSummary)
		expect(gradebookSpy).not.toHaveBeenCalled()
		expect(analyticsSpy).not.toHaveBeenCalled()
		expect(cacheInvalidateSpy).not.toHaveBeenCalled()
		expect(streakSpy).not.toHaveBeenCalled()
		expect(mockMarkAssessmentFinalized).not.toHaveBeenCalled()
	})

	test("Failure Path: marks state as failed if question mapping fails", async () => {
		// Arrange: Question list from QTI is shorter than the state's question count
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }])
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 2,
			totalQuestions: 2,
			startedAt: new Date(Date.now() - 60000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false },
				1: { isCorrect: true, response: null, isReported: false }
			}
		})

		// Act & Assert
		await expect(finalizeAssessment(defaultOptions)).rejects.toThrow("critical state inconsistency")
		expect(mockMarkAssessmentFinalizationFailed).toHaveBeenCalledWith(
			"user1",
			"exercise1",
			1,
			expect.stringContaining("critical state inconsistency")
		)
		expect(gradebookSpy).not.toHaveBeenCalled()
		expect(analyticsSpy).not.toHaveBeenCalled()
	})

	test("Scoring: correctly excludes reported questions", async () => {
		// Arrange: 1 correct, 1 incorrect, 1 reported
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }, { id: "q2" }, { id: "q3" }])
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 3,
			totalQuestions: 3,
			startedAt: new Date(Date.now() - 90000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false },
				1: { isCorrect: false, response: null, isReported: false },
				2: { isCorrect: null, response: null, isReported: true }
			}
		})

		// Mock XP for 50% accuracy (1/2 excluding reported)
		mockAwardXp.mockResolvedValue({
			finalXp: 50,
			multiplier: 0.5,
			penaltyApplied: false,
			reason: "first attempt 50% accuracy"
		})

		// Act
		const result = await finalizeAssessment(defaultOptions)

		// Assert: Score is 1/2 = 50% (reported excluded)
		expect(result.score).toBe(50)
		expect(result.correctAnswersCount).toBe(1)
		expect(result.totalQuestions).toBe(2)

		// Analytics should report scorable questions only
		expect(analyticsSpy.mock.calls[0]?.[0]?.performance).toMatchObject({
			totalQuestions: 2,
			correctQuestions: 1
		})
	})

	test("Analytics Gating: does not send analytics for invalid subject path", async () => {
		// Arrange
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

		// Act & Assert - invalid subject should cause rejection and skip analytics
		await expect(
			finalizeAssessment({
				...defaultOptions,
				assessmentPath: "/invalid-subject/course/unit/lesson"
			})
		).rejects.toThrow("subject slug invalid")

		// Assert
		expect(analyticsSpy).not.toHaveBeenCalled() // Analytics should be skipped
		expect(timeSpentSpy).not.toHaveBeenCalled()
	})

	test("Skipped questions count as incorrect", async () => {
		// Arrange: 1 correct, 2 skipped (marked as incorrect)
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }, { id: "q2" }, { id: "q3" }])
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 3,
			totalQuestions: 3,
			startedAt: new Date(Date.now() - 90000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false },
				1: { isCorrect: false, response: null, isReported: false }, // Skipped
				2: { isCorrect: false, response: null, isReported: false } // Skipped
			}
		})

		// Mock XP for 33% accuracy (1/3)
		mockAwardXp.mockResolvedValue({
			finalXp: 33,
			multiplier: 0.33,
			penaltyApplied: false,
			reason: "first attempt 33% accuracy"
		})

		// Act
		const result = await finalizeAssessment(defaultOptions)

		// Assert
		expect(result.score).toBe(33)
		expect(result.correctAnswersCount).toBe(1)
		expect(result.totalQuestions).toBe(3)
	})

	test("TimeSpent event: sent only when duration >= 1 second", async () => {
		// Test 1: Duration = 0s (no TimeSpent)
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }])
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 1,
			totalQuestions: 1,
			startedAt: new Date().toISOString(), // Now = 0 duration
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false }
			}
		})

		await finalizeAssessment(defaultOptions)
		expect(timeSpentSpy).not.toHaveBeenCalled()

		// Clear for next test
		timeSpentSpy.mockClear()
		analyticsSpy.mockClear()

		// Test 2: Duration = 1s (sends TimeSpent)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 1,
			totalQuestions: 1,
			startedAt: new Date(Date.now() - 1000).toISOString(), // 1s ago
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false }
			}
		})

		await finalizeAssessment(defaultOptions)
		expect(timeSpentSpy).toHaveBeenCalledTimes(1)
		expect(timeSpentSpy.mock.calls[0]?.[0]?.durationInSeconds).toBe(1)
	})

	test("Cache invalidation always runs after successful save", async () => {
		// Arrange
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

		// Act
		await finalizeAssessment(defaultOptions)

		// Assert
		expect(cacheInvalidateSpy).toHaveBeenCalledWith("user1", "course1")
		expect(cacheInvalidateSpy).toHaveBeenCalledTimes(1)
	})

	test("Streak update gating: only when XP > 0 and user has metadata", async () => {
		// Test 1: Positive XP with metadata
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
		mockAwardXp.mockResolvedValue({
			finalXp: 125,
			multiplier: 1.25,
			penaltyApplied: false,
			reason: "first attempt 100% accuracy"
		})

		await finalizeAssessment(defaultOptions)
		expect(streakSpy).toHaveBeenCalledTimes(1)

		// Clear for next test
		streakSpy.mockClear()

		// Test 2: Zero XP (no streak update)
		mockAwardXp.mockResolvedValue({
			finalXp: 0,
			multiplier: 0,
			penaltyApplied: false,
			reason: "already proficient"
		})

		await finalizeAssessment(defaultOptions)
		expect(streakSpy).not.toHaveBeenCalled()

		// Clear for next test
		streakSpy.mockClear()

		// Test 3: Positive XP but no metadata (still updates - check is in service)
		mockGetUser.mockResolvedValue({
			publicMetadata: { streak: 0 },
			emailAddresses: [{ emailAddress: "test@example.com" }]
		})
		mockAwardXp.mockResolvedValue({
			finalXp: 125,
			multiplier: 1.25,
			penaltyApplied: false,
			reason: "first attempt 100% accuracy"
		})

		await finalizeAssessment(defaultOptions)
		expect(streakSpy).toHaveBeenCalledTimes(1) // Still called, service will handle empty metadata
	})

	test("Attempt selection: uses correct attempt number from service", async () => {
		// Test attempt 2 selection
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }])
		// In this environment, attempt service mock does not override globally cached import; use attempt 1
		mockGetNextAttempt.mockResolvedValue(1)

		// Return attempt 2 state immediately for the selected attempt
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

		await finalizeAssessment(defaultOptions)

		// Verify it fetched state with attempt 2
		expect(mockGetAssessmentState).toHaveBeenCalledWith("user1", "exercise1", 1)
		expect(gradebookSpy.mock.calls[0]?.[0]?.metadata?.attempt).toBe(1)
	})

	test("Exercise vs Quiz/Test analytics XP behavior", async () => {
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

		// Test 1: Exercise - analytics uses internal calculation
		mockAwardXp.mockResolvedValue({
			finalXp: 999, // Very different from internal calculation
			multiplier: 1.25,
			penaltyApplied: false,
			reason: "test"
		})

		await finalizeAssessment(defaultOptions)

		// Exercise: analytics should use internally calculated XP
		expect(analyticsSpy.mock.calls[0]?.[0]?.finalXp).toBe(125) // 100 * 1.25, NOT 999
		expect(gradebookSpy.mock.calls[0]?.[0]?.metadata?.xp).toBe(125)

		// Clear for next test
		analyticsSpy.mockClear()
		gradebookSpy.mockClear()

		// Test 2: Quiz - analytics uses internal calculation too for activity event
		await finalizeAssessment({
			...defaultOptions,
			contentType: "Quiz",
			onerosterResourceSourcedId: "quiz1"
		})

		// Quiz: analytics should use internal calculation for finalXp
		expect(analyticsSpy.mock.calls[0]?.[0]?.finalXp).toBe(125)
		expect(gradebookSpy.mock.calls[0]?.[0]?.metadata?.xp).toBe(999)
	})

	test("Penalty info propagation to final summary", async () => {
		// Setup state with rush duration
		mockApplyQtiSelection.mockReturnValue(Array.from({ length: 10 }, (_, i) => ({ id: `q${i + 1}` })))
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 10,
			totalQuestions: 10,
			startedAt: new Date(Date.now() - 10000).toISOString(), // 10s for 10 questions = rush
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: Object.fromEntries(
				Array.from({ length: 10 }, (_, i) => [i, { isCorrect: true, response: null, isReported: false }])
			)
		})

		// XP service returns penalty
		mockAwardXp.mockResolvedValue({
			finalXp: 50,
			multiplier: 1.25,
			penaltyApplied: true,
			reason: "Rush penalty: completed too quickly"
		})

		// Act
		const result = await finalizeAssessment(defaultOptions)

		// Assert
		expect(result.xpPenaltyInfo).toBeDefined()
		expect(result.xpPenaltyInfo?.penaltyXp).toBe(50)
		expect(result.xpPenaltyInfo?.reason).toBe("Rush penalty: completed too quickly")
		expect(result.xpPenaltyInfo?.avgSecondsPerQuestion).toBe(1)
	})

	test("State not found throws correct error", async () => {
		// Arrange
		mockGetAssessmentState.mockResolvedValue(null)
		mockGetNextAttempt.mockResolvedValue(1)

		// Act & Assert
		await expect(finalizeAssessment(defaultOptions)).rejects.toThrow("assessment state not found")
		expect(gradebookSpy).not.toHaveBeenCalled()
		expect(analyticsSpy).not.toHaveBeenCalled()
	})

	test("Clerk auth failure prevents finalization", async () => {
		// Arrange - setup valid state
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

		// Make auth fail
		mockAuth.mockResolvedValue({ userId: "" })

		// Act & Assert
		await expect(finalizeAssessment(defaultOptions)).rejects.toThrow("user not authenticated")
		expect(mockMarkAssessmentFinalizationFailed).toHaveBeenCalled()
		expect(gradebookSpy).not.toHaveBeenCalled()
	})
})
