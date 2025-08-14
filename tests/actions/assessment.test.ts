import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { finalizeAssessment } from "@/lib/actions/assessment"
import type { Unit } from "@/lib/types/domain"

// Create typed mock functions
const mockGetAllResults = mock(() => {})
const mockPutResult = mock(() => {})
const mockGetResult = mock(() => {})
const mockSaveResult = mock(() => {})
const mockSendActivityCompletedEvent = mock(() => {})
const mockSendTimeSpentEvent = mock(() => {})
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

mock.module("@/lib/ports/analytics", () => ({
	sendActivityCompletedEvent: mockSendActivityCompletedEvent,
	sendTimeSpentEvent: mockSendTimeSpentEvent
}))

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

mock.module("@clerk/nextjs/server", () => ({
	auth: () => Promise.resolve({ userId: "mock_clerk_user_id" }),
	clerkClient: () => ({
		users: {
			getUser: () => Promise.resolve({ publicMetadata: {} }),
			updateUserMetadata: mock(() => Promise.resolve({ publicMetadata: {} }))
		}
	})
}))

// Import modules after mocking
const analytics = await import("@/lib/ports/analytics")
const gradebook = await import("@/lib/ports/gradebook")
const xpBank = await import("@/lib/xp/bank")

const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent")
const gradebookSpy = spyOn(gradebook, "saveResult")
const bankSpy = spyOn(xpBank, "awardBankedXpForExercise")

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

describe("XP Rewarding Logic - Special Cases", () => {
	test("XP Farming: Should award 0 XP if already proficient", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(true))
		await finalizeAssessment({ ...defaultOptions })

		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(0)
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
		expect(finalXp).toBe(150) // 100 (exercise xp * 1.0) + 50 (banked)
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
		expect(finalXp).toBe(175) // 100 (exercise xp * 1.0) + 75 (banked video XP)
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
		expect(finalXp).toBe(130) // 100 (exercise xp * 1.0) + 30 (banked article XP)
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
		expect(finalXp).toBe(200) // 100 (exercise xp * 1.0) + 100 (banked mixed content XP)
	})
})

describe("Input Handling and Edge Cases", () => {
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
		expect(metadata?.accuracy).toBe(100) // Defaults to 100 when total is 0
	})
})
