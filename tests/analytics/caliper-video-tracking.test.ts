import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

// --- In-memory fake Redis ---
type FakeRedisValue = string
class FakeRedis {
	#store = new Map<string, FakeRedisValue>()
	#ttl = new Map<string, number>()
	async get(key: string): Promise<FakeRedisValue | null> {
		const got = this.#store.get(key)
		return typeof got === "string" ? got : null
	}
	async set(key: string, value: string, opts?: { EX?: number; NX?: boolean }): Promise<"OK" | null> {
		if (opts?.NX && this.#store.has(key)) return null
		this.#store.set(key, value)
		if (opts?.EX) this.#ttl.set(key, Date.now() + opts.EX * 1000)
		return "OK"
	}
	async del(key: string): Promise<number> {
		const existed = this.#store.delete(key)
		this.#ttl.delete(key)
		return existed ? 1 : 0
	}
	async expire(key: string, seconds: number): Promise<number> {
		if (!this.#store.has(key)) return 0
		this.#ttl.set(key, Date.now() + seconds * 1000)
		return 1
	}
	clear() {
		this.#store.clear()
		this.#ttl.clear()
	}
}

// --- MOCKS (BEFORE SUT IMPORT) ---

const fakeRedis = new FakeRedis()
mock.module("@/lib/redis", () => ({ redis: fakeRedis }))

// Auth + identity
const mockAuth = mock(() => Promise.resolve({ userId: "clerk_user_1" }))
mock.module("@clerk/nextjs/server", () => ({
	auth: mockAuth,
	clerkClient: () => ({
		users: { getUser: () => Promise.resolve({ emailAddresses: [{ emailAddress: "u@example.com" }] }) }
	})
}))
const mockGetCurrentUserSourcedId = mock(() => Promise.resolve("nice_u1"))
mock.module("@/lib/authorization", () => ({ getCurrentUserSourcedId: mockGetCurrentUserSourcedId }))

// Caliper send spy
const mockSendCaliper = mock(() => Promise.resolve())
mock.module("@/lib/actions/caliper", () => ({ sendCaliperTimeSpentEvent: mockSendCaliper }))

// Utils (use actual); Subjects (use actual mapping)

// --- IMPORT SUT (AFTER MOCKS) ---
type AccumulateFn = (
	clientUserSourcedId: string,
	videoId: string,
	sessionDeltaSeconds: number,
	currentPositionSeconds: number,
	durationSeconds: number,
	videoTitle: string,
	courseInfo: { subjectSlug: string; courseSlug: string }
) => Promise<void>
type FinalizeFn = (
	userSourcedId: string,
	videoId: string,
	videoTitle: string,
  courseInfo: { subjectSlug: string; courseSlug: string },
  userEmail: string
) => Promise<void>
type GetStateFn = (
	userId: string,
	videoId: string
) => Promise<{
	cumulativeWatchTimeSeconds: number
	lastKnownPositionSeconds: number
	canonicalDurationSeconds: number | null
	finalizedAt: string | null
	lastServerSyncAt: string | null
} | null>

let accumulateCaliperWatchTime: AccumulateFn
let finalizeCaliperTimeSpentEvent: FinalizeFn
let getCaliperVideoWatchState: GetStateFn

beforeEach(async () => {
	// Re-import per test to reset module state
	const cacheMod = await import("@/lib/video-cache")
	getCaliperVideoWatchState = cacheMod.getCaliperVideoWatchState
	const trackingMod = await import("@/lib/actions/tracking")
	accumulateCaliperWatchTime = trackingMod.accumulateCaliperWatchTime
	finalizeCaliperTimeSpentEvent = trackingMod.finalizeCaliperTimeSpentEvent
})

afterEach(() => {
	fakeRedis.clear()
	mockSendCaliper.mockClear()
	mockAuth.mockClear()
	mockGetCurrentUserSourcedId.mockClear()
})

describe("Caliper video time tracking (additive, parallel to OneRoster)", () => {
	test("accumulates deltas and persists position without triggering finalize below threshold", async () => {
		// Arrange
		const userId = "nice_u1"
		const videoId = "nice_video_1"
		const duration = 600 // 10 min
		// Act: two small deltas (total 15s)
		await accumulateCaliperWatchTime(userId, videoId, 10, 42, duration, "Title", {
			subjectSlug: "math",
			courseSlug: "algebra"
		})
		await accumulateCaliperWatchTime(userId, videoId, 5, 50, duration, "Title", {
			subjectSlug: "math",
			courseSlug: "algebra"
		})
		const state = await getCaliperVideoWatchState(userId, videoId)
		// Assert
		expect(state?.cumulativeWatchTimeSeconds).toBe(15)
		expect(state?.lastKnownPositionSeconds).toBe(50)
		expect(state?.finalizedAt).toBeNull()
		expect(mockSendCaliper).toHaveBeenCalledTimes(0)
	})

	test("crossing threshold triggers one finalize send and sets finalizedAt", async () => {
		const userId = "nice_u1"
		const videoId = "nice_video_2"
		const duration = 100
		// Bring to 94s (94%) then add 5s (cross 95%)
		await accumulateCaliperWatchTime(userId, videoId, 94, 94, duration, "Title", {
			subjectSlug: "math",
			courseSlug: "algebra"
		})
		await accumulateCaliperWatchTime(userId, videoId, 5, 99, duration, "Title", {
			subjectSlug: "math",
			courseSlug: "algebra"
		})
		const state = await getCaliperVideoWatchState(userId, videoId)
		expect(state?.cumulativeWatchTimeSeconds).toBe(99)
		expect(state?.finalizedAt).not.toBeNull()
		expect(mockSendCaliper).toHaveBeenCalledTimes(1)
	})

	test("finalization is idempotent via lock: repeated finalize does not send twice", async () => {
		const userId = "nice_u1"
		const videoId = "nice_video_3"
		const duration = 120
		// Reach threshold quickly
		await accumulateCaliperWatchTime(userId, videoId, 120, 120, duration, "Title", {
			subjectSlug: "math",
			courseSlug: "algebra"
		})
		// Explicit second finalize call should be a no-op
    await finalizeCaliperTimeSpentEvent(userId, videoId, "Title", { subjectSlug: "math", courseSlug: "algebra" }, "user@example.com")
		expect(mockSendCaliper).toHaveBeenCalledTimes(1)
		const state = await getCaliperVideoWatchState(userId, videoId)
		expect(state?.finalizedAt).not.toBeNull()
	})

	test("identity verification: mismatched client sourcedId is rejected", async () => {
		const videoId = "nice_video_4"
		const duration = 60
		await expect(
			accumulateCaliperWatchTime("nice_other", videoId, 10, 10, duration, "Title", {
				subjectSlug: "math",
				courseSlug: "algebra"
			})
		).rejects.toBeDefined()
	})

	test("multi-tab guard clamps excessive delta vs wall-time", async () => {
		const userId = "nice_u1"
		const videoId = "nice_video_5"
		const duration = 600
		// First small write to set lastServerSyncAt
		await accumulateCaliperWatchTime(userId, videoId, 2, 2, duration, "Title", {
			subjectSlug: "math",
			courseSlug: "algebra"
		})
		// Immediately attempt a huge delta that should be clamped near zero
		await accumulateCaliperWatchTime(userId, videoId, 300, 10, duration, "Title", {
			subjectSlug: "math",
			courseSlug: "algebra"
		})
		const state = await getCaliperVideoWatchState(userId, videoId)
		// Expect cumulative to be only slightly larger than 2 (not 302)
		expect(state?.cumulativeWatchTimeSeconds ?? 0).toBeLessThanOrEqual(10)
	})
})
