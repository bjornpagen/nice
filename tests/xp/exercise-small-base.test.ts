// tests/xp/exercise-small-base.test.ts

import { afterEach, beforeAll, describe, expect, mock, spyOn, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { calculateAssessmentXp } from "@/lib/xp/core"

// --- Mocks ---
const mockSaveResult = mock(() => Promise.resolve("result_id"))
mock.module("@/lib/ports/gradebook", () => ({ saveResult: mockSaveResult }))
// Do not mock '@/lib/clients' to avoid leaking across other suites
mock.module("@/lib/services/cache", () => ({ invalidateUserCourseProgress: (_u: string, _c: string) => Promise.resolve() }))
mock.module("@/lib/cache", () => ({
	redisCache: async <T>(cb: () => Promise<T>, _k: (string | number)[], _o: { revalidate: number | false }) => cb(),
	userProgressByCourse: (_u: string, _c: string) => `user-progress:${_u}:${_c}`,
	invalidateCache: (_k: string) => Promise.resolve()
}))
mock.module("@/lib/data/fetchers/oneroster", () => ({
	getClass: (_id: string) => Promise.resolve(null),
	getActiveEnrollmentsForUser: (_u: string) => Promise.resolve([])
}))
mock.module("@clerk/nextjs/server", () => ({
	auth: () => Promise.resolve({ userId: "user_small_xp" }),
	clerkClient: () => ({ users: { getUser: () => Promise.resolve({ publicMetadata: {} }) } })
}))
// Keep banking out of this test's behavior explicitly
mock.module("@/lib/xp/bank", () => ({ awardBankedXpForExercise: () => Promise.resolve({ bankedXp: 0, awardedResourceIds: [] }) }))
mock.module("@/lib/actions/streak", () => ({ updateStreak: () => Promise.resolve() }))
mock.module("@/lib/services/streak", () => ({ update: (_u: string, _m: unknown) => Promise.resolve() }))
mock.module("@/lib/services/proficiency", () => ({ updateFromAssessment: () => Promise.resolve({ success: true, exercisesUpdated: 0 }) }))

// Import module under test after mocks are registered
let finalizeAssessment: (options: any) => Promise<any>
beforeAll(async () => {
	const mod = await import("@/lib/actions/assessment")
	finalizeAssessment = mod.finalizeAssessment
})

// --- Spies ---
const analytics = await import("@/lib/ports/analytics")
const gradebook = await import("@/lib/ports/gradebook")
const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent")
const gradebookSpy = spyOn(gradebook, "saveResult")

// --- Test Data ---
const baseOptions = {
	onerosterResourceSourcedId: "res_exercise_small_base",
	onerosterComponentResourceSourcedId: "comp_exercise_small_base",
	onerosterCourseSourcedId: "course_1",
	onerosterUserSourcedId: "user_1",
	sessionResults: [{ qtiItemId: "q1", isCorrect: true }, { qtiItemId: "q2", isCorrect: true }],
	durationInSeconds: 60,
	expectedXp: 2, // Very small base XP
	assessmentTitle: "Small Base Exercise",
	assessmentPath: "/math/course/unit/lesson/e/small-base",
	userEmail: "test@example.com",
	contentType: "Exercise" as const,
	unitData: { id: "u1", slug: "u1", title: "U1", path: "/p", description: "", ordering: 1, children: [] }
}

afterEach(() => {
	analyticsSpy.mockClear()
	gradebookSpy.mockClear()
})

describe("XP Calculation with Small Base XP (expectedXp = 2)", () => {
	test("Attempt 1, 100% -> 1.25x multiplier -> 2 * 1.25 = 2.5, rounds to 3 XP", async () => {
		await finalizeAssessment({ ...baseOptions, attemptNumber: 1 })
		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.xp).toBe(3)
	})

	test("Attempt 2, 100% -> 1.0x multiplier -> 2 * 1.0 = 2 XP", async () => {
		await finalizeAssessment({ ...baseOptions, attemptNumber: 2 })
		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.xp).toBe(2)
	})

	test("Attempt 2, 80% -> 0.5x multiplier -> 2 * 0.5 = 1 XP", async () => {
		await finalizeAssessment({
			...baseOptions,
			attemptNumber: 2,
			sessionResults: [
				{ qtiItemId: "q1", isCorrect: true },
				{ qtiItemId: "q2", isCorrect: true },
				{ qtiItemId: "q3", isCorrect: true },
				{ qtiItemId: "q4", isCorrect: true },
				{ qtiItemId: "q5", isCorrect: false }
			]
		})
		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.xp).toBe(1)
	})

	test("Attempt 1, <80% -> 0x multiplier -> 2 * 0 = 0 XP", async () => {
		await finalizeAssessment({
			...baseOptions,
			attemptNumber: 1,
			sessionResults: [{ qtiItemId: "q1", isCorrect: false }]
		})
		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.xp).toBe(0)
	})

	test("Rush penalty should still apply a negative score, ignoring small base XP", async () => {
		await finalizeAssessment({
			...baseOptions,
			attemptNumber: 1,
			durationInSeconds: 5, // Rush
			sessionResults: [{ qtiItemId: "q1", isCorrect: false }, { qtiItemId: "q2", isCorrect: false }]
		})
		const metadata = gradebookSpy.mock.calls[0]?.[0]?.metadata
		expect(metadata?.xp).toBe(-2) // Penalty is -floor(totalQuestions)
		expect(metadata?.penaltyApplied).toBe(true)
	})
})