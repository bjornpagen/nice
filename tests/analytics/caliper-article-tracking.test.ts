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
  }),
  // Some modules import currentUser from this path; provide a harmless mock
  currentUser: () => Promise.resolve(undefined)
}))
const mockGetCurrentUserSourcedId = mock(() => Promise.resolve("nice_u1"))
mock.module("@/lib/authorization", () => ({ getCurrentUserSourcedId: mockGetCurrentUserSourcedId }))
// Some modules may re-export other auth helpers; ensure they exist for import-time resolution
mock.module("@/lib/authorization", () => ({
  getCurrentUserSourcedId: mockGetCurrentUserSourcedId,
  isUserAuthorizedForQuestion: () => Promise.resolve(true)
}))

// Caliper send spy
const mockSendCaliper = mock(() => Promise.resolve())
mock.module("@/lib/actions/caliper", () => ({
  sendCaliperTimeSpentEvent: mockSendCaliper,
  sendCaliperActivityCompletedEvent: () => Promise.resolve(),
  sendCaliperBankedXpAwardedEvent: () => Promise.resolve()
}))

// --- IMPORT SUT (AFTER MOCKS) ---
type AccumulateArticleFn = (
  userSourcedId: string,
  articleId: string,
  sessionDeltaSeconds: number
) => Promise<void>
type PartialFinalizeFn = (
  userSourcedId: string,
  articleId: string,
  articleTitle: string,
  courseInfo: { subjectSlug: string; courseSlug: string }
) => Promise<void>
type FinalizeArticleFn = (
  userSourcedId: string,
  articleId: string,
  articleTitle: string,
  courseInfo: { subjectSlug: string; courseSlug: string }
) => Promise<void>
type GetArticleStateFn = (
  userId: string,
  articleId: string
) => Promise<{
  cumulativeReadTimeSeconds: number
  reportedReadTimeSeconds: number
  canonicalDurationSeconds: number | null
  lastServerSyncAt: string | null
  finalizedAt: string | null
} | null>

let accumulateArticleReadTime: AccumulateArticleFn
let finalizeArticlePartialTimeSpent: PartialFinalizeFn
let finalizeArticleTimeSpentEvent: FinalizeArticleFn
let getCaliperArticleReadState: GetArticleStateFn
let setCaliperArticleReadState: (
  userId: string,
  articleId: string,
  state: {
    cumulativeReadTimeSeconds: number
    reportedReadTimeSeconds: number
    canonicalDurationSeconds: number | null
    lastServerSyncAt: string | null
    finalizedAt: string | null
  }
) => Promise<void>

beforeEach(async () => {
  const articleCacheMod = await import("@/lib/article-cache")
  getCaliperArticleReadState = articleCacheMod.getCaliperArticleReadState
  setCaliperArticleReadState = articleCacheMod.setCaliperArticleReadState
  const trackingMod = await import("@/lib/actions/tracking")
  accumulateArticleReadTime = trackingMod.accumulateArticleReadTime
  finalizeArticlePartialTimeSpent = trackingMod.finalizeArticlePartialTimeSpent
  finalizeArticleTimeSpentEvent = trackingMod.finalizeArticleTimeSpentEvent
})

afterEach(() => {
  fakeRedis.clear()
  mockSendCaliper.mockClear()
  mockAuth.mockClear()
  mockGetCurrentUserSourcedId.mockClear()
})

describe("Caliper article time tracking (heartbeat + finalize)", () => {
  test("accumulates deltas and persists cumulative without sending caliper on accumulate", async () => {
    const userId = "nice_u1"
    const articleId = "nice_article_1"

    await accumulateArticleReadTime(userId, articleId, 10)
    // simulate passage of time beyond heartbeat cadence to avoid clamping
    {
      const state = await getCaliperArticleReadState(userId, articleId)
      if (state) {
        await setCaliperArticleReadState(userId, articleId, {
          ...state,
          lastServerSyncAt: new Date(Date.now() - 6000).toISOString()
        })
      }
    }
    await accumulateArticleReadTime(userId, articleId, 5)

    const state = await getCaliperArticleReadState(userId, articleId)
    expect(state?.cumulativeReadTimeSeconds).toBe(15)
    expect(state?.reportedReadTimeSeconds).toBe(0)
    expect(state?.finalizedAt).toBeNull()
    expect(mockSendCaliper).toHaveBeenCalledTimes(0)
  })

  test("partial finalize sends only unreported delta and updates reportedReadTimeSeconds", async () => {
    const userId = "nice_u1"
    const articleId = "nice_article_2"
    await accumulateArticleReadTime(userId, articleId, 12)

    await finalizeArticlePartialTimeSpent(userId, articleId, "Title", { subjectSlug: "math", courseSlug: "algebra" })
    expect(mockSendCaliper).toHaveBeenCalledTimes(1)

    const stateAfter = await getCaliperArticleReadState(userId, articleId)
    expect(stateAfter?.reportedReadTimeSeconds).toBe(12)
    expect(stateAfter?.finalizedAt).toBeNull()

    // accumulate more and partial finalize again
    // simulate time so the second delta is not clamped
    if (stateAfter) {
      await setCaliperArticleReadState(userId, articleId, {
        ...stateAfter,
        lastServerSyncAt: new Date(Date.now() - 6000).toISOString()
      })
    }
    await accumulateArticleReadTime(userId, articleId, 5)
    await finalizeArticlePartialTimeSpent(userId, articleId, "Title", { subjectSlug: "math", courseSlug: "algebra" })
    expect(mockSendCaliper).toHaveBeenCalledTimes(2)
    const stateAfter2 = await getCaliperArticleReadState(userId, articleId)
    expect(stateAfter2?.reportedReadTimeSeconds).toBe(17)
    expect(stateAfter2?.finalizedAt).toBeNull()
  })

  test("finalize sets finalizedAt, reports unreported time, and is idempotent via lock", async () => {
    const userId = "nice_u1"
    const articleId = "nice_article_3"
    await accumulateArticleReadTime(userId, articleId, 20)

    await finalizeArticleTimeSpentEvent(userId, articleId, "Title", { subjectSlug: "math", courseSlug: "algebra" })
    expect(mockSendCaliper).toHaveBeenCalledTimes(1)
    const state = await getCaliperArticleReadState(userId, articleId)
    if (!state) throw new Error("article state should not be null after finalize")
    expect(state.finalizedAt).not.toBeNull()
    expect(state.reportedReadTimeSeconds).toBe(state.cumulativeReadTimeSeconds)

    // Second finalize should be a no-op (lock + already finalized)
    await finalizeArticleTimeSpentEvent(userId, articleId, "Title", { subjectSlug: "math", courseSlug: "algebra" })
    expect(mockSendCaliper).toHaveBeenCalledTimes(1)

    // Accumulate after finalize should be ignored
    await accumulateArticleReadTime(userId, articleId, 10)
    const state2 = await getCaliperArticleReadState(userId, articleId)
    if (!state2 || !state) throw new Error("article state missing for post-finalize assertion")
    expect(state2.cumulativeReadTimeSeconds).toBe(state.cumulativeReadTimeSeconds)
  })

  test("identity verification: mismatched client sourcedId is rejected for accumulate", async () => {
    await expect(accumulateArticleReadTime("nice_other", "nice_article_4", 10)).rejects.toBeDefined()
  })

  test("multi-tab guard clamps excessive delta vs wall-time", async () => {
    const userId = "nice_u1"
    const articleId = "nice_article_5"
    // initial heartbeat to set lastServerSyncAt
    await accumulateArticleReadTime(userId, articleId, 2)
    // immediately attempt a huge delta that should be clamped
    await accumulateArticleReadTime(userId, articleId, 300)
    const state = await getCaliperArticleReadState(userId, articleId)
    expect((state?.cumulativeReadTimeSeconds ?? 0)).toBeLessThanOrEqual(10)
  })
})


