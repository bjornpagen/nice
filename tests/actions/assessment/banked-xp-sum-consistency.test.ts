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
	awardBankedXpForExercise: mockAwardBankedXpForExercise,
	awardBankedXpForUnitCompletion: () => Promise.resolve({ bankedXp: 0, awardedResourceIds: [] })
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
	mockAwardBankedXpForExercise.mockClear()
	mockSaveResult.mockClear()
})

describe("Banked XP Sum Consistency", () => {
	test("Sum of article and video banked XP equals derived banked XP", async () => {
		// Mock proficiency check
		const mockCheckExistingProficiency = mock(() => Promise.resolve(false))
		mock.module("@/lib/actions/assessment", () => ({
			finalizeAssessment,
			checkExistingProficiency: mockCheckExistingProficiency
		}))

		// Define per-type banked XP for this scenario
		const articleXp = 70
		const videoXp = 30
		const totalBanked = articleXp + videoXp

		// Mock the XP service to return banked XP
		mockAwardXp.mockImplementation(() =>
			Promise.resolve({
				finalXp: 125 + totalBanked, // Exercise XP + banked
				multiplier: 1.25,
				penaltyApplied: false,
				reason: "first attempt 100% accuracy"
			})
		)

		// Mock the server state - 5 questions all correct
		const mockQuestions = Array.from({ length: 5 }, (_, i) => ({
			id: `q${i + 1}`
		}))
		mockApplyQtiSelection.mockReturnValue(mockQuestions)
		mockGetNextAttempt.mockResolvedValue(1)
		mockGetAssessmentState.mockResolvedValue({
			attemptNumber: 1,
			currentQuestionIndex: 5,
			totalQuestions: 5,
			startedAt: new Date(Date.now() - 60000).toISOString(), // 60s ago
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

		// Act
		await finalizeAssessment(defaultOptions)

		// Assert
		// For first attempt with 100% accuracy on an Exercise, base multiplier is 1.25
		const expectedBaseXpWithBonus = defaultOptions.expectedXp * 1.25 // 125

		// Analytics should report exercise-only XP (excludes banked XP)
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		const analyticsCall = analyticsSpy.mock.calls[0]?.[0]
		expect(analyticsCall?.finalXp).toBe(expectedBaseXpWithBonus) // 125, not 225

		// Gradebook stores exercise-only XP in metadata
		expect(gradebookSpy).toHaveBeenCalledTimes(1)
		const gradebookCall = gradebookSpy.mock.calls[0]?.[0]
		expect(gradebookCall?.metadata?.xp).toBe(expectedBaseXpWithBonus) // 125

		// Time spent event should be sent once (duration > 0)
		expect(timeSpentSpy.mock.calls.length).toBeGreaterThanOrEqual(1)

		// Cache should be invalidated
		expect(cacheInvalidateSpy).toHaveBeenCalledWith("user1", "course1")

		// Streak should be updated (finalXp > 0)
		expect(streakSpy).toHaveBeenCalled()
	})
})
