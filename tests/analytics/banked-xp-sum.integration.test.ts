import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"

// SUT will be imported after mocks
import { CaliperEnvelopeSchema } from "@/lib/caliper"
import type { Unit } from "@/lib/types/domain"

// --- Mocks for external ports and services ---
const mockGetAllResults = mock(() => Promise.resolve([]))
const mockPutResult = mock(() => Promise.resolve(undefined))
const mockGetResult = mock(() => Promise.resolve(undefined))
const mockSaveResult = mock(() => Promise.resolve("sourcedId"))

// Accumulator for xpEarned across all Caliper events sent during the flow
let totalXpFromCaliper = 0

// OneRoster data fixtures to drive bank window and resource metadata
const EXERCISE_ID = "res_exercise_banked_sum"
const PREV_EXERCISE_ID = "res_prev_exercise"
const LESSON_1 = "lesson-1"
const LESSON_2 = "lesson-2"
const UNIT_ID = "unit-1"
const VIDEO_1 = "video1"
const ARTICLE_1 = "article1"

mock.module("@/lib/clients", () => ({
	oneroster: {
		getAllResults: mockGetAllResults,
		putResult: mockPutResult,
		getResult: mockGetResult,
		getComponentResource: () => Promise.resolve({}),
		getAllComponentResources: (args: { filter: string }) => {
			const f = args.filter || ""
			// Exercise component lookup returns an array
			if (f.includes(`resource.sourcedId='${EXERCISE_ID}'`)) {
				return Promise.resolve([
					{
						resource: { sourcedId: EXERCISE_ID },
						courseComponent: { sourcedId: LESSON_2 },
						sortOrder: 20
					}
				])
			}
			// Unit lessons' component resources
			if (f.includes("courseComponent.sourcedId@'")) {
				return Promise.resolve([
					{ resource: { sourcedId: PREV_EXERCISE_ID }, courseComponent: { sourcedId: LESSON_1 }, sortOrder: 5 },
					{ resource: { sourcedId: VIDEO_1 }, courseComponent: { sourcedId: LESSON_1 }, sortOrder: 6 },
					{ resource: { sourcedId: ARTICLE_1 }, courseComponent: { sourcedId: LESSON_2 }, sortOrder: 15 },
					{ resource: { sourcedId: EXERCISE_ID }, courseComponent: { sourcedId: LESSON_2 }, sortOrder: 20 }
				])
			}
			// Fallback empty
			return Promise.resolve([])
		},
		getCourseComponents: (args: { filter: string; orderBy?: string; sort?: string }) => {
			const f = args.filter || ""
			if (f.includes(`sourcedId='${LESSON_2}'`)) {
				return Promise.resolve([{ sourcedId: LESSON_2, sortOrder: 2, parent: { sourcedId: UNIT_ID } }])
			}
			if (f.includes(`parent.sourcedId='${UNIT_ID}'`)) {
				return Promise.resolve([
					{ sourcedId: LESSON_1, sortOrder: 1 },
					{ sourcedId: LESSON_2, sortOrder: 2 }
				])
			}
			return Promise.resolve([])
		},
		getAllResources: (_args: { filter: string }) => {
			// Return metadata for all resources used in the window
			return Promise.resolve([
				{
					sourcedId: PREV_EXERCISE_ID,
					title: "Prev Exercise",
					metadata: { khanActivityType: "Exercise", khanLessonType: "exercise", type: "interactive", xp: 100 }
				},
				{
					sourcedId: EXERCISE_ID,
					title: "Exercise",
					metadata: { khanActivityType: "Exercise", khanLessonType: "exercise", type: "interactive", xp: 100 }
				},
				{
					sourcedId: VIDEO_1,
					title: "Video 1",
					metadata: { khanActivityType: "Video", type: "interactive", xp: 5, khanSubjectSlug: "science" }
				},
				{
					sourcedId: ARTICLE_1,
					title: "Article 1",
					metadata: { khanActivityType: "Article", type: "interactive", xp: 1, khanSubjectSlug: "science" }
				}
			])
		},
		getAllUsers: () => {
			return Promise.resolve([{ email: "student@example.com" }])
		}
	},
	caliper: {
		sendCaliperEvents: (envelope: unknown) => {
			const parsed = CaliperEnvelopeSchema.safeParse(envelope)
			if (parsed.success) {
				for (const ev of parsed.data.data) {
					const items = ev.generated?.items ?? []
					for (const item of items) {
						if (item.type === "xpEarned" && typeof item.value === "number") {
							totalXpFromCaliper += item.value
						}
					}
				}
			}
			return Promise.resolve()
		}
	},
	// Include qti to match the real module export shape
	qti: {}
}))

mock.module("@/lib/ports/gradebook", () => ({
	saveResult: mockSaveResult
}))

// Make banking deterministic without hitting time-spent: return 6 (5 video + 1 article)
mock.module("@/lib/data/fetchers/caliper", () => ({
	calculateBankedXpForResources: (_actorId: string, resources: Array<{ sourcedId: string; expectedXp: number }>) => {
		const awardedIds = resources.map((r) => r.sourcedId).filter((id) => id === VIDEO_1 || id === ARTICLE_1)
		return Promise.resolve({ bankedXp: 6, awardedResourceIds: awardedIds })
	}
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
const clients = await import("@/lib/clients")
const { finalizeAssessment } = await import("@/lib/actions/assessment")

const analyticsSpy = spyOn(analytics, "sendActivityCompletedEvent")
const gradebookSpy = spyOn(gradebook, "saveResult")
const caliperSendSpy = spyOn(clients.caliper, "sendCaliperEvents").mockImplementation((envelope: unknown) => {
	const parsed = CaliperEnvelopeSchema.safeParse(envelope)
	if (parsed.success) {
		for (const ev of parsed.data.data) {
			const items = ev.generated?.items ?? []
			for (const item of items) {
				if (item.type === "xpEarned" && typeof item.value === "number") {
					totalXpFromCaliper += item.value
				}
			}
		}
	}
	return Promise.resolve()
})

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
	onerosterResourceSourcedId: EXERCISE_ID,
	onerosterComponentResourceSourcedId: "comp_exercise_banked_sum",
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
	assessmentTitle: "Exercise with banked XP window",
	assessmentPath: "/math/algebra/unit-1/exercise-banked-sum",
	userEmail: "student@example.com",
	contentType: "Exercise" as const,
	unitData: unit
}

afterEach(() => {
	analyticsSpy.mockClear()
	gradebookSpy.mockClear()
	caliperSendSpy.mockClear()
	totalXpFromCaliper = 0
	mockSaveResult.mockClear()
	mockGetAllResults.mockClear()
	mockGetResult.mockClear()
	mockPutResult.mockClear()
})

describe("Caliper XP sum matches exercise-only + banked XP", () => {
	test("Sum of xpEarned across Caliper events equals exercise-only XP + banked XP", async () => {
		await finalizeAssessment({ ...baseOptions })

		// Exercise-only XP for attempt 1 mastery
		const exerciseOnlyXp = baseOptions.expectedXp * 1.25
		// Banked XP (5 + 1)
		const bankedXp = 6

		const totalFromCaliper = totalXpFromCaliper
		const expectedTotal = exerciseOnlyXp + bankedXp

		expect(totalFromCaliper).toBe(expectedTotal)
	})
})
