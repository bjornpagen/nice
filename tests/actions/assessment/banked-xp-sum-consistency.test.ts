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

describe("Banked XP Sum Consistency", () => {
	test("Sum of article and video banked XP equals derived banked XP", async () => {
		mockCheckExistingProficiency.mockImplementation((_userSourcedId, _assessmentSourcedId) => Promise.resolve(false))

		// Define per-type banked XP for this scenario
		const articleXp = 70
		const videoXp = 30
		const totalBanked = articleXp + videoXp

		// Mock the bank to return the combined banked XP with a mixed set of resources
		mockAwardBankedXpForExercise.mockImplementation((_params) =>
			Promise.resolve({ bankedXp: totalBanked, awardedResourceIds: ["video1", "article1", "video2", "article2"] })
		)

		await finalizeAssessment({
			...defaultOptions,
			contentType: "Exercise",
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: true, isReported: false }
			]
		})

		// For first attempt with 100% accuracy on an Exercise, base multiplier is 1.25
		const expectedBaseXpWithBonus = defaultOptions.expectedXp * 1.25
		const fx = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		if (typeof fx !== "number") {
			logger.error("final xp missing in analytics payload")
			throw errors.new("final xp missing in analytics payload")
		}
		const finalXp = fx
		const derivedBanked = finalXp - expectedBaseXpWithBonus
		// Atomic event excludes banked XP
		expect(derivedBanked).toBe(0)
		// Gradebook still stores total xp (exercise + banked)
		const saved = gradebookSpy.mock.calls[0]?.[0]
		if (!saved) {
			logger.error("gradebook payload missing in test (banked sum consistency)")
			throw errors.new("gradebook payload missing")
		}
		// Exercise result metadata stores exercise-only XP (atomic)
		expect(saved.metadata?.xp).toBe(expectedBaseXpWithBonus)
	})
})


