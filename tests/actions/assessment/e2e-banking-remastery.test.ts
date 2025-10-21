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

// Mock authorization
mock.module("@/lib/authorization", () => ({
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
					publicMetadata: { streak: 0 },
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
const mockUpdateStreak = mock(() => Promise.resolve())
mock.module("@/lib/services/streak", () => ({
	update: mockUpdateStreak
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
	mockAwardBankedXpForExercise.mockClear()
	mockSaveResult.mockClear()
	mockUpdateStreak.mockClear()
})

describe("E2E Banking and Remastery", () => {
	test("Deduped behavior: banked XP is not awarded again on remastery after quiz downgrade", async () => {
		// Mock proficiency check
		const mockCheckExistingProficiency = mock(() => Promise.resolve(false))
		mock.module("@/lib/actions/assessment", () => ({
			finalizeAssessment,
			checkExistingProficiency: mockCheckExistingProficiency
		}))

		// Setup banked XP mock to return some banked XP on first exercise
		const bankedAmount = 50
		mockAwardXp
			.mockResolvedValueOnce({
				finalXp: 125 + bankedAmount, // First exercise: 125 exercise + 50 banked
				multiplier: 1.25,
				penaltyApplied: false,
				reason: "first attempt 100% accuracy"
			})
			.mockResolvedValueOnce({
				finalXp: 40, // Quiz: 100 * 0.4 (33% correct) = 40
				multiplier: 0.4,
				penaltyApplied: false,
				reason: "first attempt 33% accuracy"
			})
			.mockResolvedValueOnce({
				finalXp: 100, // Second exercise: 100 XP (no bonus on retry), NO banked
				multiplier: 1.0,
				penaltyApplied: false,
				reason: "retry 100% accuracy"
			})

		// 1) First attempt on the Exercise - 100% accuracy
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

		// Verify first exercise
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		expect(analyticsSpy.mock.calls[0]?.[0]?.finalXp).toBe(125) // Exercise-only XP
		expect(gradebookSpy.mock.calls[0]?.[0]?.metadata?.xp).toBe(125)
		expect(mockUpdateStreak).toHaveBeenCalledTimes(1)

		// Clear spies for next assessment
		analyticsSpy.mockClear()
		gradebookSpy.mockClear()
		mockUpdateStreak.mockClear()

		// 2) Take a Quiz - 33% accuracy (1/3 correct)
		mockApplyQtiSelection.mockReturnValue([{ id: "q1" }, { id: "q2" }, { id: "q3" }])
		mockGetNextAttempt.mockResolvedValue(1) // Reset for the quiz
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 3,
			totalQuestions: 3,
			startedAt: new Date(Date.now() - 90000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: false, response: null, isReported: false },
				1: { isCorrect: false, response: null, isReported: false },
				2: { isCorrect: true, response: null, isReported: false }
			}
		})

		await finalizeAssessment({
			...defaultOptions,
			contentType: "Quiz",
			assessmentTitle: "Unit Quiz",
			onerosterResourceSourcedId: "quiz1"
		})

		// Verify quiz (no banking for Quiz/Test) - internal calculation below mastery -> 0
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		expect(analyticsSpy.mock.calls[0]?.[0]?.finalXp).toBe(0)
		expect(gradebookSpy.mock.calls[0]?.[0]?.metadata?.xp).toBe(40)
		expect(mockUpdateStreak).toHaveBeenCalledTimes(1)

		// Clear spies for next assessment
		analyticsSpy.mockClear()
		gradebookSpy.mockClear()
		mockUpdateStreak.mockClear()

		// 3) Retake the Exercise - 100% accuracy (remastery)
		mockApplyQtiSelection.mockReturnValue(Array.from({ length: 5 }, (_, i) => ({ id: `q${i + 1}` })))
		mockGetNextAttempt.mockResolvedValue(2) // This is the second attempt for the exercise
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 2,
			currentQuestionIndex: 5,
			totalQuestions: 5,
			startedAt: new Date(Date.now() - 120000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false },
				1: { isCorrect: true, response: null, isReported: false },
				2: { isCorrect: true, response: null, isReported: false },
				3: { isCorrect: true, response: null, isReported: false },
				4: { isCorrect: true, response: null, isReported: false }
			}
		})

		await finalizeAssessment(defaultOptions)

		// Verify second exercise (remastery) - ensure retry behavior (attempt 2)
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		// Attempt decay on remastery: 100 base XP * 1.25 bonus * 0.5 retry factor -> 63 after rounding
		expect(analyticsSpy.mock.calls[0]?.[0]?.finalXp).toBe(63)
		expect(gradebookSpy.mock.calls[0]?.[0]?.metadata?.xp).toBe(63)
		expect(mockUpdateStreak).toHaveBeenCalledTimes(1)

		// Verify XP award was called for each assessment
		expect(mockAwardXp).toHaveBeenCalledTimes(3)
	})
})
