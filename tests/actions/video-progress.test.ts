import { afterEach, describe, expect, mock, test } from "bun:test"
import * as errors from "@superbuilders/errors"

// Mocks
const mockGetResult = mock((_id: string) => Promise.resolve({}))
const mockPutResult = mock((_id: string, _payload: unknown) => Promise.resolve({}))
const mockGetAllCoursesBySlug = mock((_slug: string) => Promise.resolve([{ sourcedId: "course_1" }]))
const mockInvalidateCache = mock((_key: string) => Promise.resolve())

// Provide stable cache key generation used by tracking.ts
function userProgressByCourse(userId: string, courseId: string): string {
	return `user-progress:${userId}:${courseId}`
}

mock.module("@/lib/clients", () => ({
	oneroster: {
		getResult: mockGetResult,
		putResult: mockPutResult
	}
}))

mock.module("@/lib/data/fetchers/oneroster", () => ({
	getAllCoursesBySlug: (slug: string) => mockGetAllCoursesBySlug(slug)
}))

mock.module("@/lib/cache", () => ({
	userProgressByCourse,
	invalidateCache: (key: string) => mockInvalidateCache(key)
}))

// Import after mocks
const tracking = await import("@/lib/actions/tracking")
const { VIDEO_COMPLETION_THRESHOLD_PERCENT } = await import("@/lib/constants/progress")

afterEach(() => {
	mockGetResult.mockClear()
	mockPutResult.mockClear()
	mockGetAllCoursesBySlug.mockClear()
	mockInvalidateCache.mockClear()
})

describe("updateVideoProgress - scoring and status", () => {
	test("saves partial progress with integer 0..100 score", async () => {
		// Existing lower progress allows update
		mockGetResult.mockImplementationOnce((_id: string) =>
			Promise.resolve({ score: 10, scoreStatus: "partially graded" })
		)

		await tracking.updateVideoProgress("u1", "video_1", 30, 120, { subjectSlug: "math", courseSlug: "alg" })

		expect(mockPutResult).toHaveBeenCalled()
		const payload = JSON.parse(JSON.stringify(mockPutResult.mock.calls[0]?.[1]))
		expect(typeof payload?.result?.score).toBe("number")
		expect(payload?.result?.score).toBe(25)
		expect(payload?.result?.scoreStatus).toBe("partially graded")

		// cache invalidation
		expect(mockGetAllCoursesBySlug).toHaveBeenCalledWith("alg")
		expect(mockInvalidateCache).toHaveBeenCalledWith(userProgressByCourse("u1", "course_1"))
	})

	test("marks complete at threshold with score 100 and fully graded", async () => {
		mockGetResult.mockImplementationOnce((_id: string) =>
			Promise.resolve({ score: 80, scoreStatus: "partially graded" })
		)
		const duration = 100
		const currentTime = Math.ceil((VIDEO_COMPLETION_THRESHOLD_PERCENT / 100) * duration)

		await tracking.updateVideoProgress("u2", "video_2", currentTime, duration, {
			subjectSlug: "science",
			courseSlug: "bio"
		})

		const payload = JSON.parse(JSON.stringify(mockPutResult.mock.calls[0]?.[1]))
		expect(payload?.result?.score).toBe(100)
		expect(payload?.result?.scoreStatus).toBe("fully graded")
	})

	test("proceeds with completion even if existing result fetch fails", async () => {
		mockGetResult.mockImplementationOnce((_id: string) => Promise.reject(errors.new("network")))

		await tracking.updateVideoProgress("u3", "video_3", 100, 100, { subjectSlug: "math", courseSlug: "geo" })

		expect(mockPutResult).toHaveBeenCalled()
		const payload = JSON.parse(JSON.stringify(mockPutResult.mock.calls[0]?.[1]))
		expect(payload?.result?.score).toBe(100)
		expect(payload?.result?.scoreStatus).toBe("fully graded")
	})

	test("skips update if existing progress is higher (monotonic)", async () => {
		mockGetResult.mockImplementationOnce((_id: string) =>
			Promise.resolve({ score: 90, scoreStatus: "partially graded" })
		)

		await tracking.updateVideoProgress("u4", "video_4", 10, 100, { subjectSlug: "math", courseSlug: "pre" })

		const payload = JSON.parse(JSON.stringify(mockPutResult.mock.calls[0]?.[1]))
		expect(payload?.result?.score).toBe(90)
		// existing is not completed; status should remain partial
		expect(payload?.result?.scoreStatus).toBe("partially graded")
	})

	test("preserves fully graded status once completed", async () => {
		mockGetResult.mockImplementationOnce((_id: string) => Promise.resolve({ score: 98, scoreStatus: "fully graded" }))

		await tracking.updateVideoProgress("u5", "video_5", 80, 100, { subjectSlug: "math", courseSlug: "calc" })

		const payload = JSON.parse(JSON.stringify(mockPutResult.mock.calls[0]?.[1]))
		expect(payload?.result?.score).toBe(98)
		expect(payload?.result?.scoreStatus).toBe("fully graded")
	})

	test("skips update when duration <= 0", async () => {
		await tracking.updateVideoProgress("u6", "video_6", 10, 0, { subjectSlug: "math", courseSlug: "alg" })
		expect(mockPutResult).not.toHaveBeenCalled()
	})

	test("skips update when existing score unknown and not completion", async () => {
		mockGetResult.mockImplementationOnce((_id: string) => Promise.reject(errors.new("network")))
		await tracking.updateVideoProgress("u7", "video_7", 10, 100, { subjectSlug: "math", courseSlug: "alg" })
		expect(mockPutResult).not.toHaveBeenCalled()
	})
})

describe("getVideoProgress - reading", () => {
	test("returns rounded percent from integer score", async () => {
		mockGetResult.mockImplementationOnce((_id: string) =>
			Promise.resolve({ score: 63, scoreStatus: "partially graded" })
		)
		const res = await tracking.getVideoProgress("u8", "video_8")
		expect(res).not.toBeNull()
		expect(res?.percentComplete).toBe(63)
		expect(res?.currentTime).toBe(0)
	})

	test("returns null when no result found", async () => {
		mockGetResult.mockImplementationOnce((_id: string) => Promise.reject(errors.new("not found")))
		const res = await tracking.getVideoProgress("u9", "video_9")
		expect(res).toBeNull()
	})
})
