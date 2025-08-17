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

describe("Side Effects and Error Propagation", () => {
	test("Streak updates only when XP > 0", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))

		// Positive XP case
		await finalizeAssessment({ ...defaultOptions })
		expect(mockUpdateStreak).toHaveBeenCalled()

		// Zero XP case (below mastery)
		mockUpdateStreak.mockClear()
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: false, isReported: false },
				{ qtiItemId: "q3", isCorrect: false, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})
		expect(mockUpdateStreak).not.toHaveBeenCalled()

		// Negative XP case (rush penalty)
		mockUpdateStreak.mockClear()
		await finalizeAssessment({
			...defaultOptions,
			durationInSeconds: 30,
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
			]
		})
		expect(mockUpdateStreak).not.toHaveBeenCalled()
	})

	test("Reason strings cover all branches", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))

		// Attempt 1, 80%
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
		let meta = gradebookSpy.mock.calls.pop()?.[0]?.metadata
		expect(meta?.xpReason).toBe("First attempt: mastery achieved")

		// Attempt 2, 100%
		gradebookSpy.mockClear()
		await finalizeAssessment({ ...defaultOptions, attemptNumber: 2 })
		meta = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(meta?.xpReason).toBe("Attempt 2: 100% accuracy")

		// Attempt 2, 80–99%
		gradebookSpy.mockClear()
		await finalizeAssessment({
			...defaultOptions,
			attemptNumber: 2,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})
		meta = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(meta?.xpReason).toBe("Attempt 2: mastery achieved (reduced XP)")

		// Attempt 1, <80%
		gradebookSpy.mockClear()
		await finalizeAssessment({
			...defaultOptions,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: false, isReported: false }
			]
		})
		meta = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(meta?.xpReason).toBe("First attempt: below mastery threshold")
	})

	test("Rounding behavior for non-roundable base XP", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		await finalizeAssessment({ ...defaultOptions, expectedXp: 99 })
		const payload = analyticsSpy.mock.calls[0]?.[0]
		if (!payload) {
			logger.error("analytics payload missing in test")
			throw errors.new("analytics payload missing")
		}
		// 99 * 1.25 = 123.75 => rounds to 124
		expect(payload.finalXp).toBe(124)
	})

	test("Invalid assessment path throws and blocks side effects", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		const res = await errors.try(finalizeAssessment({ ...defaultOptions, assessmentPath: "/invalid" }))
		expect(Boolean(res.error)).toBe(true)
		expect(gradebookSpy).not.toHaveBeenCalled()
		expect(analyticsSpy).not.toHaveBeenCalled()
	})

	test("Auth required: no user id causes error", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		// keep typesafe: empty string is falsy and triggers auth error
		mockAuth.mockImplementation(() => Promise.resolve({ userId: "" }))
		const res = await errors.try(finalizeAssessment({ ...defaultOptions }))
		expect(Boolean(res.error)).toBe(true)
		expect(gradebookSpy).not.toHaveBeenCalled()
		// restore
		mockAuth.mockImplementation(() => Promise.resolve({ userId: "mock_clerk_user_id" }))
	})

	test("Gradebook failure propagates and blocks analytics", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		mockSaveResult.mockImplementation(() => Promise.reject(errors.new("db error")))
		const res = await errors.try(finalizeAssessment({ ...defaultOptions }))
		expect(Boolean(res.error)).toBe(true)
		expect(analyticsSpy).not.toHaveBeenCalled()
		// restore
		mockSaveResult.mockImplementation(() => Promise.resolve({}))
	})

	test("Time spent event gating", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		await finalizeAssessment({ ...defaultOptions, durationInSeconds: 10 })
		expect(timeSpentSpy).toHaveBeenCalled()

		timeSpentSpy.mockClear()
		await finalizeAssessment({ ...defaultOptions, durationInSeconds: 0 })
		expect(timeSpentSpy).not.toHaveBeenCalled()
	})

	test("Gradebook metadata fields presence", async () => {
		mockCheckExistingProficiency.mockImplementation((_u, _a) => Promise.resolve(false))
		await finalizeAssessment({ ...defaultOptions })
		const saved = gradebookSpy.mock.calls[0]?.[0]
		if (!saved) {
			logger.error("gradebook payload missing in test")
			throw errors.new("gradebook payload missing")
		}
		expect(saved.metadata?.attempt).toBe(defaultOptions.attemptNumber)
		expect(saved.metadata?.durationInSeconds).toBe(defaultOptions.durationInSeconds)
		expect(saved.metadata?.lessonType).toBe("exercise")
		expect(saved.metadata?.courseSourcedId).toBe(defaultOptions.onerosterCourseSourcedId)
	})

	test("should successfully save result even if streak update fails", async () => {
		mockUpdateStreak.mockImplementation(() => Promise.reject(errors.new("streak service unavailable")))

		const result = await errors.try(finalizeAssessment({ ...defaultOptions }))

		expect(result.error).toBeUndefined() // The action itself should not throw
		expect(gradebookSpy).toHaveBeenCalledTimes(1)
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
	})

	test("should award base XP even if XP banking fails", async () => {
		mockAwardBankedXpForExercise.mockImplementation(() => Promise.reject(errors.new("banking service down")))

		const result = await errors.try(finalizeAssessment({ ...defaultOptions }))

		expect(result.error).toBeUndefined()
		expect(gradebookSpy).toHaveBeenCalledTimes(1)
		expect(analyticsSpy).toHaveBeenCalledTimes(1)

		// Verify that the XP awarded is only the base XP, not including any potential banked XP
		const finalXp = analyticsSpy.mock.calls[0]?.[0]?.finalXp
		expect(finalXp).toBe(125) // 100 * 1.25 bonus
	})

	test("should save result even if proficiency update fails", async () => {
		mockUpdateFromAssessment.mockImplementation(() => Promise.reject(errors.new("proficiency service error")))

		const result = await errors.try(finalizeAssessment({ ...defaultOptions }))

		expect(result.error).toBeUndefined()
		expect(gradebookSpy).toHaveBeenCalledTimes(1)
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
	})
})
