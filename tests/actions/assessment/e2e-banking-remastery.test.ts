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

describe("End-to-end banking across lesson → exercise → quiz → exercise remastery", () => {
	test("Deduped behavior: banked XP is not awarded again on remastery after quiz downgrade", async () => {
		// Ensure user is treated as NOT already proficient throughout (so XP can be awarded both exercise attempts)
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))

		// Simulate a lesson with a video and an article completed prior to the exercise
		// We return a fixed banked XP bundle representing those two resources
		const videoXp = 30
		const articleXp = 20
		const totalBanked = videoXp + articleXp
		mockAwardBankedXpForExercise.mockReset()
		const firstCall = { bankedXp: totalBanked, awardedResourceIds: ["video1", "article1"] }
		const secondCall = { bankedXp: 0, awardedResourceIds: [] }
		let callIndex = 0
		mockAwardBankedXpForExercise.mockImplementation((_params) => {
			const ret = callIndex === 0 ? firstCall : secondCall
			callIndex++
			return Promise.resolve(ret)
		})

		// 1) First attempt on the Exercise: 100% accuracy → multiplier 1.25, plus banked XP from video+article
		await finalizeAssessment({ ...defaultOptions })
		const firstPayload = analyticsSpy.mock.calls[analyticsSpy.mock.calls.length - 1]?.[0]
		if (!firstPayload) {
			logger.error("analytics payload missing after first exercise in e2e test")
			throw errors.new("analytics payload missing")
		}
		// Atomic: event includes only base 100 * 1.25 (no banked)
		expect(firstPayload.finalXp).toBe(defaultOptions.expectedXp * 1.25)
		// Gradebook metadata still includes total (base + banked)
		const firstSaved = gradebookSpy.mock.calls[0]?.[0]
		if (!firstSaved) {
			logger.error("gradebook payload missing after first exercise in e2e test")
			throw errors.new("gradebook payload missing")
		}
		// Exercise result metadata stores exercise-only XP (atomic)
		expect(firstSaved.metadata?.xp).toBe(defaultOptions.expectedXp * 1.25)
		// Bank was invoked once so far
		expect(bankSpy).toHaveBeenCalledTimes(1)

		// 2) Take a Quiz which (via proficiency analysis) could reduce exercise proficiency below 80%
		// We don't rely on real proficiency analysis here; we keep the proficiency check mocked to false later.
		await finalizeAssessment({
			...defaultOptions,
			contentType: "Quiz",
			assessmentTitle: "Unit Quiz",
			// Mixed correctness; XP rules for quiz don't bank, and proficiency update is mocked
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: false, isReported: false },
				{ qtiItemId: "q2", isCorrect: false, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false }
			],
			attemptNumber: 1
		})
		// Bank must still be called only once so far (quiz does not bank)
		expect(bankSpy).toHaveBeenCalledTimes(1)

		// 3) Retake the Exercise after quiz; user remasters with >80 on attempt 2
		await finalizeAssessment({
			...defaultOptions,
			attemptNumber: 2,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: true, isReported: false }
			]
		})

		const secondPayload = analyticsSpy.mock.calls[analyticsSpy.mock.calls.length - 1]?.[0]
		if (!secondPayload) {
			logger.error("analytics payload missing after second exercise in e2e test")
			throw errors.new("analytics payload missing")
		}

		// Attempt 2: base = 100 * 1.0, and with dedupe banked XP should NOT be added again
		expect(secondPayload.finalXp).toBe(defaultOptions.expectedXp * 1.0)
		// Bank should have been invoked twice total (remastery calls bank, but it returns 0)
		expect(bankSpy).toHaveBeenCalledTimes(2)
	})
})
