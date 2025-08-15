import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

// Import subject under test after mocks are in place
import { finalizeAssessment } from "@/lib/actions/assessment"
import type { Unit } from "@/lib/types/domain"

// --- Mocks for external ports and services ---
const mockGetAllResults = mock(() => Promise.resolve(undefined))
const mockPutResult = mock(() => Promise.resolve(undefined))
const mockGetResult = mock(() => Promise.resolve(undefined))
const mockSaveResult = mock(() => Promise.resolve("sourcedId"))
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

// OneRoster client used by gradebook port
mock.module("@/lib/clients", () => ({
	oneroster: {
		getAllResults: mockGetAllResults,
		putResult: mockPutResult,
		getResult: mockGetResult,
		getComponentResource: () => Promise.resolve({})
	},
	caliper: {
		sendCaliperEvents: (_envelope: unknown) => Promise.resolve()
	}
}))

mock.module("@/lib/ports/gradebook", () => ({
	saveResult: mockSaveResult
}))

// No proficiency mocking required for these tests

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

// Import after mocks
const analytics = await import("@/lib/ports/analytics")
const gradebook = await import("@/lib/ports/gradebook")
const xpBank = await import("@/lib/xp/bank")
const clients = await import("@/lib/clients")

const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent")
const gradebookSpy = spyOn(gradebook, "saveResult")
const bankSpy = spyOn(xpBank, "awardBankedXpForExercise")
const caliperSendSpy = spyOn(clients.caliper, "sendCaliperEvents").mockImplementation((_e) => Promise.resolve())

const unit: Unit = {
	id: "unit-1",
	slug: "unit-1",
	title: "Unit 1",
	description: "",
	path: "/math/algebra/unit-1",
	ordering: 1,
	children: []
}

const baseOptions = {
	onerosterResourceSourcedId: "res_exercise_1",
	onerosterComponentResourceSourcedId: "comp_exercise_1",
	onerosterCourseSourcedId: "course_1",
	onerosterUserSourcedId: "user_1",
	sessionResults: [
		{ qtiItemId: "q1", isCorrect: true, isReported: false },
		{ qtiItemId: "q2", isCorrect: true, isReported: false },
		{ qtiItemId: "q3", isCorrect: true, isReported: false },
		{ qtiItemId: "q4", isCorrect: true, isReported: false },
		{ qtiItemId: "q5", isCorrect: true, isReported: false }
	],
	attemptNumber: 1,
	durationInSeconds: 120,
	expectedXp: 100,
	assessmentTitle: "Exercise 1",
	assessmentPath: "/math/algebra/unit-1/exercise-1",
	userEmail: "student@example.com",
	contentType: "Exercise" as const,
	unitData: unit
}

afterEach(() => {
	analyticsSpy.mockClear()
	gradebookSpy.mockClear()
	bankSpy.mockClear()
	caliperSendSpy.mockClear()
	mockSaveResult.mockClear()
	mockCheckExistingProficiency.mockClear()
	mockAwardBankedXpForExercise.mockReset()
	mockAwardBankedXpForExercise.mockImplementation((_p) => Promise.resolve({ bankedXp: 0, awardedResourceIds: [] }))
})

describe("Banked XP - Additional Edge Cases", () => {
	test("Rush penalty: negative exercise XP → ActivityEvent equals penalized exercise-only XP; no banking", async () => {
		const shortDurationOptions = {
			...baseOptions,
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
		}

		await finalizeAssessment(shortDurationOptions)

		const payload = analyticsSpy.mock.calls.at(-1)?.[0]
		if (!payload) {
			logger.error("missing analytics payload (penalty)")
			throw errors.new("missing analytics payload")
		}
		expect(payload.finalXp).toBe(-10)
		expect(bankSpy).not.toHaveBeenCalled()
	})

	test("Attempt 2 mastery: ActivityEvent equals attempt-2 exercise-only XP; daily aggregation adds banked XP once", async () => {
		mockAwardBankedXpForExercise.mockImplementation((_p) =>
			Promise.resolve({ bankedXp: 20, awardedResourceIds: ["video1"] })
		)

		await finalizeAssessment({
			...baseOptions,
			attemptNumber: 2,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: true, isReported: false },
				{ qtiItemId: "q4", isCorrect: true, isReported: false },
				{ qtiItemId: "q5", isCorrect: true, isReported: false }
			]
		})

		const payload = analyticsSpy.mock.calls.at(-1)?.[0]
		if (!payload) {
			logger.error("missing analytics payload (attempt 2)")
			throw errors.new("missing analytics payload")
		}
		const exerciseOnlyAttempt2Xp = 100
		expect(payload.finalXp).toBe(exerciseOnlyAttempt2Xp)
		const aggregated = payload.finalXp + 20
		expect(aggregated).toBe(120)
	})

	test("Below mastery (<80%): no banking; ActivityEvent equals exercise-only XP (often 0)", async () => {
		mockAwardBankedXpForExercise.mockImplementation((_p) =>
			Promise.resolve({ bankedXp: 50, awardedResourceIds: ["video1", "article1"] })
		)

		await finalizeAssessment({
			...baseOptions,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true, isReported: false },
				{ qtiItemId: "q2", isCorrect: true, isReported: false },
				{ qtiItemId: "q3", isCorrect: false, isReported: false },
				{ qtiItemId: "q4", isCorrect: false, isReported: false },
				{ qtiItemId: "q5", isCorrect: false, isReported: false }
			]
		})

		const payload = analyticsSpy.mock.calls.at(-1)?.[0]
		if (!payload) {
			logger.error("missing analytics payload (<80%)")
			throw errors.new("missing analytics payload")
		}
		expect(payload.finalXp).toBe(0)
		expect(bankSpy).not.toHaveBeenCalled()
	})
})

describe("Banked XP - Atomic Caliper Events and Double-Counting", () => {
	test("Exercise ActivityEvent MUST be atomic: xpEarned == exercise-only XP (no banked)", async () => {
		// Arrange: banked XP present (video=5, article=1)
		mockAwardBankedXpForExercise.mockImplementation((_p) =>
			Promise.resolve({ bankedXp: 6, awardedResourceIds: ["video1", "article1"] })
		)

		await finalizeAssessment({ ...baseOptions })

		const payload = analyticsSpy.mock.calls.at(-1)?.[0]
		if (!payload) {
			logger.error("missing analytics payload")
			throw errors.new("missing analytics payload")
		}
		// For attempt 1 with 100% accuracy, base = expectedXp * 1.25
		const expectedExerciseOnlyXp = baseOptions.expectedXp * 1.25
		// EXPECTATION (Atomic rule): xpEarned should equal exercise-only XP
		expect(payload.finalXp).toBe(expectedExerciseOnlyXp)
	})

	test("Daily aggregation MUST equal exercise-only XP + passive ETL facts (no duplication)", async () => {
		// Arrange: banked XP present (5 + 1)
		const passiveFacts = [5, 1]
		mockAwardBankedXpForExercise.mockImplementation((_p) =>
			Promise.resolve({ bankedXp: passiveFacts.reduce((a, b) => a + b, 0), awardedResourceIds: ["video1", "article1"] })
		)

		await finalizeAssessment({ ...baseOptions })
		const payload = analyticsSpy.mock.calls.at(-1)?.[0]
		if (!payload) {
			logger.error("missing analytics payload")
			throw errors.new("missing analytics payload")
		}

		const exerciseOnlyXp = baseOptions.expectedXp * 1.25
		const etlSum = passiveFacts.reduce((a, b) => a + b, 0)

		// Simulated UI/Reporting sum: Caliper event xp + ETL facts
		const aggregated = payload.finalXp + etlSum
		const expectedTotal = exerciseOnlyXp + etlSum
		// EXPECTATION: aggregated must equal exercise-only (atomic) + ETL facts
		expect(aggregated).toBe(expectedTotal)
	})

	test("No banked XP: ActivityEvent xpEarned equals exercise-only XP and aggregation equals base", async () => {
		mockAwardBankedXpForExercise.mockImplementation((_p) => Promise.resolve({ bankedXp: 0, awardedResourceIds: [] }))

		await finalizeAssessment({ ...baseOptions })
		const payload = analyticsSpy.mock.calls.at(-1)?.[0]
		if (!payload) {
			logger.error("missing analytics payload")
			throw errors.new("missing analytics payload")
		}
		const exerciseOnlyXp = baseOptions.expectedXp * 1.25
		expect(payload.finalXp).toBe(exerciseOnlyXp)
		// Simulated aggregation adds 0 from ETL
		expect(payload.finalXp + 0).toBe(exerciseOnlyXp)
	})
})
