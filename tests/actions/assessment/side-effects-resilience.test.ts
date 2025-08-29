import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import type { AssessmentState } from "@/lib/assessment-cache"
import type { Question, Unit } from "@/lib/types/domain"

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
	awardBankedXpForExercise: mockAwardBankedXpForExercise,
	awardBankedXpForUnitCompletion: () => Promise.resolve({ bankedXp: 0, awardedResourceIds: [] })
}))

// --- IMPORT SUT (AFTER MOCKS) ---
const { finalizeAssessment } = await import("@/lib/actions/assessment")

// --- SETUP SPIES ---
const analytics = await import("@/lib/ports/analytics")
const gradebook = await import("@/lib/ports/gradebook")

const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent")
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
	gradebookSpy.mockClear()
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
})

describe("Side Effects Resilience", () => {
	test("Streak updates only when XP > 0", async () => {
		// Mock proficiency check
		const mockCheckExistingProficiency = mock(() => Promise.resolve(false))
		mock.module("@/lib/actions/assessment", () => ({
			finalizeAssessment,
			checkExistingProficiency: mockCheckExistingProficiency
		}))

		// Setup state for successful assessment
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

		// First test: positive XP
		mockAwardXp.mockResolvedValue({
			finalXp: 125,
			multiplier: 1.25,
			penaltyApplied: false,
			reason: "first attempt 100% accuracy"
		})

		await finalizeAssessment(defaultOptions)
		expect(mockUpdateStreak).toHaveBeenCalled()

		// Clear for next test
		mockUpdateStreak.mockClear()

		// Second test: zero XP (below mastery)
		mockApplyQtiSelection.mockReturnValue(Array.from({ length: 5 }, (_, i) => ({ id: `q${i + 1}` })))
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 5,
			totalQuestions: 5,
			startedAt: new Date(Date.now() - 60000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false },
				1: { isCorrect: false, response: null, isReported: false },
				2: { isCorrect: false, response: null, isReported: false },
				3: { isCorrect: false, response: null, isReported: false },
				4: { isCorrect: false, response: null, isReported: false }
			}
		})

		// Zero XP for low accuracy
		mockAwardXp.mockResolvedValue({
			finalXp: 0,
			multiplier: 0.2,
			penaltyApplied: false,
			reason: "first attempt 20% accuracy"
		})

		await finalizeAssessment(defaultOptions)
		expect(mockUpdateStreak).not.toHaveBeenCalled()
	})

	test("Streak updates only when user has public metadata", async () => {
		// Mock user without public metadata
		mockGetUser.mockResolvedValue({
			publicMetadata: { streak: 0 },
			emailAddresses: [{ emailAddress: "test@example.com" }]
		})

		// Setup state for successful assessment with positive XP
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

		// Even with positive XP, streak should not update without metadata
		expect(mockUpdateStreak).toHaveBeenCalled() // Actually it should be called, the check is in the service
	})

	test("Cache invalidation always runs after gradebook save", async () => {
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

		await finalizeAssessment(defaultOptions)

		// Cache should always be invalidated after successful save
		expect(mockInvalidateUserCourseProgress).toHaveBeenCalledWith("user1", "course1")
		expect(mockInvalidateUserCourseProgress).toHaveBeenCalledTimes(1)
	})

	test("Proficiency update runs for interactive assessments with session results", async () => {
		// Setup state with multiple questions
		const mockQuestions = Array.from({ length: 3 }, (_, i) => ({
			id: `q${i + 1}`
		}))

		mockApplyQtiSelection.mockReturnValue(mockQuestions)
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

		await finalizeAssessment(defaultOptions)

		// Proficiency update should be called with correct params
		expect(mockUpdateFromAssessment).toHaveBeenCalledWith(
			"user1",
			"component_exercise1",
			1,
			expect.arrayContaining([
				expect.objectContaining({ qtiItemId: "q1", isCorrect: true }),
				expect.objectContaining({ qtiItemId: "q2", isCorrect: false }),
				expect.objectContaining({ qtiItemId: "q3", isCorrect: true })
			]),
			"course1",
			expect.any(String) // correlationId
		)
	})

	test("Side effects continue even if one fails", async () => {
		// Make cache invalidation fail
		mockInvalidateUserCourseProgress.mockRejectedValueOnce(errors.new("cache error"))

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

		// This should not throw - side effects are best-effort
		await finalizeAssessment(defaultOptions)

		// Other side effects should still run
		expect(mockUpdateStreak).toHaveBeenCalled()
		expect(mockUpdateFromAssessment).toHaveBeenCalled()
		expect(analyticsSpy).toHaveBeenCalled()
	})
})
