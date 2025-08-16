import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
// Subject(s) under test
import { finalizeAssessment, getNextAttemptNumber } from "@/lib/actions/assessment"
import type { AssessmentResult } from "@/lib/oneroster"

// --- Mocks for external ports and services ---
const mockGetAllResults = mock<(...args: unknown[]) => Promise<AssessmentResult[]>>(() => {
	const emptyResults: AssessmentResult[] = []
	return Promise.resolve(emptyResults)
})
const mockPutResult = mock(() => Promise.resolve(undefined))
const mockSaveResult = mock(() => Promise.resolve("sourcedId"))
const mockAwardBankedXpForExercise = mock(
	(_params: {
		exerciseResourceSourcedId: string
		onerosterUserSourcedId: string
		onerosterCourseSourcedId: string
	}): Promise<{ bankedXp: number; awardedResourceIds: string[] }> =>
		Promise.resolve({ bankedXp: 0, awardedResourceIds: [] })
)

// OneRoster client used by gradebook port
mock.module("@/lib/clients", () => ({
	oneroster: {
		getAllResults: mockGetAllResults,
		putResult: mockPutResult,
		getResult: mock(() => Promise.resolve(undefined)),
		getComponentResource: () => Promise.resolve({})
	},
	caliper: {
		sendCaliperEvents: (_envelope: unknown) => Promise.resolve()
	}
}))

mock.module("@/lib/ports/gradebook", () => ({
	saveResult: mockSaveResult
}))

mock.module("@/lib/xp/bank", () => ({
	awardBankedXpForExercise: mockAwardBankedXpForExercise
}))

// Auth mock
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

// Import after mocks
const analytics = await import("@/lib/ports/analytics")
const gradebook = await import("@/lib/ports/gradebook")
const xpBank = await import("@/lib/xp/bank")
const clients = await import("@/lib/clients")

const analyticsEvents: Array<{ finalXp: number; correlationId: string }> = []
const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent").mockImplementation((options) => {
	if (typeof options?.finalXp === "number" && typeof options?.correlationId === "string") {
		analyticsEvents.push({ finalXp: options.finalXp, correlationId: options.correlationId })
	}
	return Promise.resolve()
})
const gradebookSpy = spyOn(gradebook, "saveResult")
const bankSpy = spyOn(xpBank, "awardBankedXpForExercise")
const caliperSendSpy = spyOn(clients.caliper, "sendCaliperEvents").mockImplementation((_e) => Promise.resolve())

// Helper: in the full suite, analytics calls from other tests can be present.
// Use our captured events and match by correlationId from the gradebook save.
function findAnalyticsPayloadByCorrelationId(
	correlationId: string
): { finalXp: number; correlationId: string } | undefined {
	for (const e of analyticsEvents) {
		if (e.correlationId === correlationId) return e
	}
	return undefined
}

const baseOptions = {
	onerosterResourceSourcedId: "res_exercise_small_base",
	onerosterComponentResourceSourcedId: "comp_exercise_small_base",
	onerosterCourseSourcedId: "course_1",
	onerosterUserSourcedId: "user_1",
	// 4/4 correct by default
	sessionResults: [
		{ qtiItemId: "q1", isCorrect: true, isReported: false },
		{ qtiItemId: "q2", isCorrect: true, isReported: false },
		{ qtiItemId: "q3", isCorrect: true, isReported: false },
		{ qtiItemId: "q4", isCorrect: true, isReported: false }
	],
	attemptNumber: 1,
	durationInSeconds: 60,
	expectedXp: 2,
	assessmentTitle: "Small Base Exercise",
	assessmentPath: "/science/some-course/unit-1/lesson-1/e/small-base-exercise",
	unitData: {
		id: "unit-1",
		slug: "unit-1",
		title: "Unit 1",
		description: "",
		path: "/science/some-course/unit-1",
		ordering: 1,
		children: []
	},
	userEmail: "student@example.com",
	contentType: "Exercise" as const
}

afterEach(() => {
	analyticsSpy.mockClear()
	analyticsEvents.length = 0
	gradebookSpy.mockClear()
	bankSpy.mockClear()
	caliperSendSpy.mockClear()
	mockSaveResult.mockClear()
	mockGetAllResults.mockClear()
	mockAwardBankedXpForExercise.mockReset()
	mockAwardBankedXpForExercise.mockImplementation((_p) => Promise.resolve({ bankedXp: 0, awardedResourceIds: [] }))
})

describe("Attempt multipliers with small base XP (expectedXp = 2)", () => {
	test("Attempt 1, 100% → 1.25x => 3 XP (exercise-only)", async () => {
		await finalizeAssessment({ ...baseOptions, attemptNumber: 1 })

		const saved = gradebookSpy.mock.calls[0]?.[0]
		if (!saved) {
			logger.error("missing gradebook payload")
			throw errors.new("missing gradebook payload")
		}
		const payload = findAnalyticsPayloadByCorrelationId(saved.correlationId)
		if (!payload) {
			logger.error("missing analytics payload")
			throw errors.new("missing analytics payload")
		}
		expect(payload.finalXp).toBe(3)

		expect(saved.metadata?.xp).toBe(3)
		expect(saved.metadata?.multiplier).toBe(1.25)
	})

	test("Attempt 2, 100% → 1.0x => 2 XP (exercise-only), even if banked XP exists", async () => {
		mockAwardBankedXpForExercise.mockImplementation((_p) =>
			Promise.resolve({ bankedXp: 1, awardedResourceIds: ["v1"] })
		)
		// Ensure proficiency check doesn't throw by returning empty results array
		mockGetAllResults.mockImplementation(() => Promise.resolve([]))

		await finalizeAssessment({ ...baseOptions, attemptNumber: 2 })

		const saved0 = gradebookSpy.mock.calls[0]?.[0]
		if (!saved0) {
			logger.error("missing gradebook payload")
			throw errors.new("missing gradebook payload")
		}
		const payload = findAnalyticsPayloadByCorrelationId(saved0.correlationId)
		if (!payload) {
			logger.error("missing analytics payload")
			throw errors.new("missing analytics payload")
		}
		// Atomic rule: exercise-only XP
		expect(payload.finalXp).toBe(2)

		expect(saved0.metadata?.xp).toBe(2)
		expect(saved0.metadata?.multiplier).toBe(1.0)
		// Bank invoked once, but excluded from analytics/metadata for Exercise
		expect(bankSpy).toHaveBeenCalledTimes(1)
	})

	test("Attempt 2, 75% (below 80) → 0 XP", async () => {
		// Ensure proficiency check doesn't throw by returning empty results array
		mockGetAllResults.mockImplementation(() => Promise.resolve([]))
		await finalizeAssessment({
			...baseOptions,
			attemptNumber: 2,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: false, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false }
			]
		})

		const saved = gradebookSpy.mock.calls[0]?.[0]
		if (!saved) {
			logger.error("missing gradebook payload")
			throw errors.new("missing gradebook payload")
		}
		const payload = findAnalyticsPayloadByCorrelationId(saved.correlationId)
		if (!payload) {
			logger.error("missing analytics payload")
			throw errors.new("missing analytics payload")
		}
		expect(payload.finalXp).toBe(0)
	})

	test("<80% accuracy → 0 XP on both attempt 1 and attempt 2", async () => {
		// Attempt 1, 75%
		mockGetAllResults.mockImplementation(() => Promise.resolve([]))
		await finalizeAssessment({
			...baseOptions,
			attemptNumber: 1,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: false, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false }
			]
		})
		let payload = analyticsSpy.mock.calls[0]?.[0]
		if (!payload) {
			logger.error("missing analytics payload")
			throw errors.new("missing analytics payload")
		}
		expect(payload.finalXp).toBe(0)

		analyticsSpy.mockClear()
		gradebookSpy.mockClear()

		// Attempt 2, 75%
		mockGetAllResults.mockImplementation(() => Promise.resolve([]))
		await finalizeAssessment({
			...baseOptions,
			attemptNumber: 2,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: false, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false }
			]
		})
		const saved2 = gradebookSpy.mock.calls[0]?.[0]
		if (!saved2) {
			logger.error("missing gradebook payload")
			throw errors.new("missing gradebook payload")
		}
		const payload2 = findAnalyticsPayloadByCorrelationId(saved2.correlationId)
		if (!payload2) {
			logger.error("missing analytics payload")
			throw errors.new("missing analytics payload")
		}
		expect(payload2.finalXp).toBe(0)
	})
})

describe("Attempt derivation (server)", () => {
	test("Counts only interactive attempt IDs and returns next attempt = existing + 1", async () => {
		// Arrange: provide only one valid interactive attempt to avoid cross-file interference
		mockGetAllResults.mockReset()
		const lineItemId = "res_exercise_small_base_ali"
		const userId = "xp_isolated_user"
		mockGetAllResults.mockImplementation(() =>
			Promise.resolve([
				{
					sourcedId: `nice_${userId}_${lineItemId}_attempt_1`,
					status: "active",
					dateLastModified: new Date().toISOString(),
					score: 100,
					scoreStatus: "fully graded",
					scoreDate: new Date().toISOString(),
					assessmentLineItem: { sourcedId: lineItemId },
					student: { sourcedId: userId, type: "user" }
				}
			])
		)

		// Act
		const nextAttempt = await getNextAttemptNumber(userId, "res_exercise_small_base")

		// Assert
		expect(nextAttempt).toBe(2)
	})
})
