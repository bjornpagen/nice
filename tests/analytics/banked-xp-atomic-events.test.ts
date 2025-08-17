// tests/analytics/banked-xp-atomic-events.test.ts

import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { finalizeAssessment } from "@/lib/actions/assessment"

// --- Mocks ---
mock.module("@/lib/ports/gradebook", () => ({ saveResult: () => Promise.resolve("result_id") }))
// Provide minimal clients and cache mocks to avoid cross-test import issues
mock.module("@/lib/clients", () => ({
	caliper: { sendCaliperEvents: (_e: unknown) => Promise.resolve() },
	qti: {
		/* used in separate suites; provide noop shape to prevent import errors */
	}
}))
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
	auth: () => Promise.resolve({ userId: "atomic_test_user" }),
	clerkClient: () => ({ users: { getUser: () => Promise.resolve({ publicMetadata: {} }) } })
}))
mock.module("@/lib/actions/assessment", () => ({ checkExistingProficiency: () => Promise.resolve(false) }))
mock.module("@/lib/actions/streak", () => ({ updateStreak: () => Promise.resolve() }))
const mockAwardBankedXp = mock(() => Promise.resolve({ bankedXp: 50, awardedResourceIds: ["video1"] }))
mock.module("@/lib/xp/bank", () => ({ awardBankedXpForExercise: mockAwardBankedXp }))

// --- Spies ---
const analytics = await import("@/lib/ports/analytics")
const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent")

// --- Test Data ---
const defaultOptions = {
	onerosterResourceSourcedId: "res_atomic_exercise",
	onerosterComponentResourceSourcedId: "comp_atomic_exercise",
	onerosterCourseSourcedId: "course_atomic",
	onerosterUserSourcedId: "user_atomic",
	sessionResults: [{ qtiItemId: "q1", isCorrect: true }],
	attemptNumber: 1,
	durationInSeconds: 60,
	expectedXp: 100,
	assessmentTitle: "Atomic XP Test",
	assessmentPath: "/math/course/unit/lesson/e/atomic-test",
	userEmail: "test@example.com",
	contentType: "Exercise" as const,
	unitData: { id: "u1", slug: "u1", title: "U1", path: "/p", description: "", ordering: 1, children: [] }
}

afterEach(() => {
	analyticsSpy.mockClear()
	mockAwardBankedXp.mockClear()
})

describe("Banked XP - Atomic Caliper Events Contract", () => {
	test("ActivityCompleted event for an Exercise MUST report exercise-only XP, excluding banked XP", async () => {
		// Act
		await finalizeAssessment({ ...defaultOptions })

		// Assert
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		const eventPayload = analyticsSpy.mock.calls[0]?.[0]
		const exerciseOnlyXp = 125 // 100 base * 1.25 bonus for 1st attempt 100%
		expect(eventPayload?.finalXp).toBe(exerciseOnlyXp)
	})

	test("Quiz/Test ActivityEvent MUST report total XP as no banking occurs", async () => {
		// Act
		await finalizeAssessment({ ...defaultOptions, contentType: "Quiz" })

		// Assert
		expect(analyticsSpy).toHaveBeenCalledTimes(1)
		const eventPayload = analyticsSpy.mock.calls[0]?.[0]
		const totalXp = 125 // 100 base * 1.25 bonus
		expect(eventPayload?.finalXp).toBe(totalXp)
		expect(mockAwardBankedXp).not.toHaveBeenCalled()
	})

	test("Daily aggregation (simulated) MUST equal atomic event XP + banked XP to prevent double counting", async () => {
		const bankedXpAmount = 50
		mockAwardBankedXp.mockResolvedValue({ bankedXp: bankedXpAmount, awardedResourceIds: ["video1"] })

		// Act
		await finalizeAssessment({ ...defaultOptions })

		// Assert
		const eventPayload = analyticsSpy.mock.calls[0]?.[0]
		const exerciseOnlyXp = 125
		expect(eventPayload?.finalXp).toBe(exerciseOnlyXp)

		// Simulate the analytics pipeline summing the atomic event with ETL'd banked data
		const simulatedTotal = (eventPayload?.finalXp ?? 0) + bankedXpAmount
		expect(simulatedTotal).toBe(175) // 125 (exercise) + 50 (banked)
	})
})
