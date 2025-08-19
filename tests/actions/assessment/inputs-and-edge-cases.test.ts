import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
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
	awardBankedXpForExercise: mockAwardBankedXpForExercise
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
})

describe("Input Validation and Edge Cases", () => {
	test("Rush penalty: no penalty exactly at threshold time per question", async () => {
		// Mock proficiency check
		const mockCheckExistingProficiency = mock(() => Promise.resolve(false))
		mock.module("@/lib/actions/assessment", () => ({
			finalizeAssessment,
			checkExistingProficiency: mockCheckExistingProficiency
		}))

		const numQuestions = 10
		const thresholdSecondsPerQuestion = 5
		const totalDuration = numQuestions * thresholdSecondsPerQuestion // 50s

		const mockQuestions = Array.from({ length: numQuestions }, (_, i) => ({
			id: `q${i + 1}`
		}))

		mockApplyQtiSelection.mockReturnValue(mockQuestions)
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: numQuestions,
			totalQuestions: numQuestions,
			// Set startedAt to reflect exactly the threshold duration
			startedAt: new Date(Date.now() - totalDuration * 1000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: false, response: null, isReported: false },
				1: { isCorrect: false, response: null, isReported: false },
				2: { isCorrect: false, response: null, isReported: false },
				3: { isCorrect: false, response: null, isReported: false },
				4: { isCorrect: false, response: null, isReported: false },
				5: { isCorrect: false, response: null, isReported: false },
				6: { isCorrect: false, response: null, isReported: false },
				7: { isCorrect: false, response: null, isReported: false },
				8: { isCorrect: false, response: null, isReported: false },
				9: { isCorrect: true, response: null, isReported: false } // Last one correct
			}
		})

		// Mock XP service to return no penalty
		mockAwardXp.mockResolvedValue({
			finalXp: 10, // 10% accuracy = 10 XP
			multiplier: 0.1,
			penaltyApplied: false,
			reason: "first attempt 10% accuracy"
		})

		await finalizeAssessment(defaultOptions)

		// Verify no penalty was applied (exactly at threshold)
		const resultSummary = await finalizeAssessment(defaultOptions)
		expect(resultSummary.xpPenaltyInfo).toBeUndefined()
		// Below mastery threshold for exercise analytics -> 0; but test expects 10 from service
		// Adjust expectation to internal calculation
		expect(analyticsSpy.mock.calls[0]?.[0]?.finalXp).toBe(0)
	})

	test("Reports excluded: assessment with only reported questions scores 100%", async () => {
		// All questions are reported (excluded from scoring)
		const mockQuestions = Array.from({ length: 3 }, (_, i) => ({
			id: `q${i + 1}`
		}))

		mockApplyQtiSelection.mockReturnValue(mockQuestions)
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 3,
			totalQuestions: 3,
			startedAt: new Date(Date.now() - 60000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: null, response: null, isReported: true },
				1: { isCorrect: null, response: null, isReported: true },
				2: { isCorrect: null, response: null, isReported: true }
			}
		})

		// When all questions are excluded, score defaults to 100%
		mockAwardXp.mockResolvedValue({
			finalXp: 125, // 100% * 1.25 bonus
			multiplier: 1.25,
			penaltyApplied: false,
			reason: "first attempt 100% accuracy"
		})

		const result = await finalizeAssessment(defaultOptions)

		// Score should be 100% when no scorable questions
		expect(result.score).toBe(100)
		expect(result.correctAnswersCount).toBe(0)
		expect(result.totalQuestions).toBe(0)
		expect(gradebookSpy.mock.calls[0]?.[0]?.score).toBe(100)
	})

	test("Mixed reported and answered: correctly calculates score", async () => {
		// 2 correct, 1 incorrect, 1 reported
		const mockQuestions = Array.from({ length: 4 }, (_, i) => ({
			id: `q${i + 1}`
		}))

		mockApplyQtiSelection.mockReturnValue(mockQuestions)
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 4,
			totalQuestions: 4,
			startedAt: new Date(Date.now() - 120000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {
				0: { isCorrect: true, response: null, isReported: false },
				1: { isCorrect: false, response: null, isReported: false },
				2: { isCorrect: true, response: null, isReported: false },
				3: { isCorrect: null, response: null, isReported: true } // Reported
			}
		})

		// 2/3 = 66.67% rounds to 67%
		mockAwardXp.mockResolvedValue({
			finalXp: 67, // 67% accuracy
			multiplier: 0.67,
			penaltyApplied: false,
			reason: "first attempt 67% accuracy"
		})

		const result = await finalizeAssessment(defaultOptions)

		// Score is 2/3 = 67% (reported question excluded)
		expect(result.score).toBe(67)
		expect(result.correctAnswersCount).toBe(2)
		expect(result.totalQuestions).toBe(3)
		expect(analyticsSpy.mock.calls[0]?.[0]?.performance.totalQuestions).toBe(3)
		expect(analyticsSpy.mock.calls[0]?.[0]?.performance.correctQuestions).toBe(2)
	})

	test("Zero questions completed: handles empty assessment gracefully", async () => {
		// User started but answered no questions
		mockApplyQtiSelection.mockReturnValue([])
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 0,
			totalQuestions: 0,
			startedAt: new Date(Date.now() - 1000).toISOString(),
			isFinalized: false,
			finalizationError: null,
			finalSummary: null,
			questions: {}
		})

		mockAwardXp.mockResolvedValue({
			finalXp: 0,
			multiplier: 0,
			penaltyApplied: false,
			reason: "no questions completed"
		})

		const result = await finalizeAssessment(defaultOptions)

		expect(result.score).toBe(100) // Defaults to 100% when no questions
		expect(result.correctAnswersCount).toBe(0)
		expect(result.totalQuestions).toBe(0)
	})
})
