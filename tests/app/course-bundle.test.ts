import { afterEach, describe, expect, mock, test } from "bun:test"
import type { Lesson } from "@/lib/types/domain"

// Prevent real Redis connections during bundle tests
const invalidatedKeys: string[] = []

function applyBaseMocks() {
	const fakeRedis = {
		isReady: false,
		get: async () => null as string | null,
		set: async () => ({}) as Record<string, unknown>,
		del: async () => 0
	}

	mock.module("@/lib/redis", () => ({
		redis: fakeRedis
	}))

	const mockCreateCacheKey = (parts: (string | number)[]) => parts.join("::")

	mock.module("@/lib/cache", () => ({
		createCacheKey: mockCreateCacheKey,
		invalidateCache: async (keys: string[]) => {
			invalidatedKeys.push(...keys)
		},
		userProgressByCourse: (userId: string, courseId: string) =>
			mockCreateCacheKey(["user-progress", userId, courseId]),
		redisCache: async <T>(
			cb: () => Promise<T>,
			_keyParts: (string | number)[],
			_options: { revalidate: number | false }
		) => cb()
	}))
}

applyBaseMocks()

afterEach(() => {
	mock.restore()
	invalidatedKeys.length = 0
	applyBaseMocks()
})

describe("course bundle helpers", () => {

	test("fetchCoursePageData builds course structure from bundle", async () => {
		const courseRecord = {
			sourcedId: "course_123",
			status: "active",
			title: "Nice Academy - Linear Foundations",
			metadata: {
				khanId: "course_123",
				khanSlug: "algebra-basics",
				khanSubjectSlug: "math",
				khanTitle: "Linear Foundations",
				khanDescription: "Course overview"
			}
		}

		const unitComponent = {
			sourcedId: "unit_1",
			status: "active",
			title: "Unit 1",
			course: { sourcedId: "course_123", type: "course" as const },
			sortOrder: 0,
			metadata: {
				khanId: "unit_1",
				khanSlug: "unit-1",
				khanTitle: "Unit 1",
				khanDescription: "Unit intro"
			}
		}

		const lessonComponent = {
			sourcedId: "lesson_1",
			status: "active",
			title: "Lesson 1",
			course: { sourcedId: "course_123", type: "course" as const },
			parent: { sourcedId: "unit_1", type: "courseComponent" as const },
			sortOrder: 0,
			metadata: {
				khanId: "lesson_1",
				khanSlug: "lesson-1",
				khanTitle: "Lesson 1",
				khanDescription: "Lesson intro"
			}
		}

		const bundle = {
			courseId: "course_123",
			fetchedAt: new Date().toISOString(),
			componentCount: 1,
			resourceCount: 3,
			courseComponents: [unitComponent, lessonComponent],
			componentResources: [
				{
					sourcedId: "cr_video",
					status: "active",
					title: "Video CR",
					courseComponent: { sourcedId: "lesson_1", type: "courseComponent" as const },
					resource: { sourcedId: "resource_video", type: "resource" as const },
					sortOrder: 0
				},
				{
					sourcedId: "cr_article",
					status: "active",
					title: "Article CR",
					courseComponent: { sourcedId: "lesson_1", type: "courseComponent" as const },
					resource: { sourcedId: "resource_article", type: "resource" as const },
					sortOrder: 1
				},
				{
					sourcedId: "cr_exercise",
					status: "active",
					title: "Exercise CR",
					courseComponent: { sourcedId: "lesson_1", type: "courseComponent" as const },
					resource: { sourcedId: "resource_exercise", type: "resource" as const },
					sortOrder: 2
				}
			],
			resources: [
				{
					sourcedId: "resource_video",
					status: "active",
					title: "Intro Video",
					metadata: {
						type: "interactive",
						khanId: "resource_video",
						khanSlug: "intro-video",
						khanTitle: "Intro Video",
						khanDescription: "Watch this first",
						khanActivityType: "Video",
						launchUrl: "https://example.com/video/intro",
						url: "https://example.com/video/intro",
						toolProvider: "example",
						xp: 50,
						khanYoutubeId: "abcd1234"
					}
				},
				{
					sourcedId: "resource_article",
					status: "active",
					title: "Concept Notes",
					metadata: {
						type: "interactive",
						khanId: "resource_article",
						khanSlug: "concept-notes",
						khanTitle: "Concept Notes",
						khanDescription: "Read before exercises",
						khanActivityType: "Article",
						launchUrl: "https://example.com/article/notes",
						url: "https://example.com/article/notes",
						toolProvider: "example",
						xp: 30
					}
				},
				{
					sourcedId: "resource_exercise",
					status: "active",
					title: "Practice Problems",
					metadata: {
						type: "qti",
						subType: "qti-test",
						khanId: "resource_exercise",
						khanSlug: "practice-problems",
						khanTitle: "Practice Problems",
						khanDescription: "Check your understanding",
						khanActivityType: "Exercise",
						url: "https://example.com/qti/practice-problems",
						version: "3.0",
						language: "en-US",
						xp: 40
					}
				}
			]
		}

		const actualFetchers = await import("@/lib/data/fetchers/oneroster")
		mock.module("@/lib/data/fetchers/oneroster", () => ({
			...actualFetchers,
			getAllCoursesBySlug: (slug: string) => {
				expect(slug).toBe("algebra-basics")
				return Promise.resolve([courseRecord])
			},
			getCourseResourceBundle: () => Promise.resolve(bundle)
		}))

		const { fetchCoursePageData } = await import("@/lib/course-bundle/course-loaders")
		const result = await fetchCoursePageData({ subject: "math", course: "algebra-basics" }, { skipQuestions: true })

		expect(result.course.title).toBe("Linear Foundations")
		expect(result.course.units).toHaveLength(1)

		const unit = result.course.units[0]!
		expect(unit.slug).toBe("unit-1")
		expect(unit.path).toBe("/math/algebra-basics/unit-1")
		expect(unit.children).toHaveLength(1)

		const lesson = unit.children.find((child): child is Lesson => child.type === "Lesson")
		expect(lesson).toBeDefined()
		if (!lesson) throw new Error("lesson child not materialized")

		expect(lesson.children.map((child) => child.type)).toEqual(["Video", "Article", "Exercise"])
		expect(lesson.children[0]!.path).toBe("/math/algebra-basics/unit-1/lesson-1/v/intro-video")
		expect(lesson.children[1]!.path).toBe("/math/algebra-basics/unit-1/lesson-1/a/concept-notes")
		expect(lesson.children[2]!.path).toBe("/math/algebra-basics/unit-1/lesson-1/e/practice-problems")

		expect(result.lessonCount).toBe(1)
		expect(result.totalXP).toBe(120)
	})

	test("findResourceInLessonBySlugAndTypeBundle throws on ambiguous matches", async () => {
		const bundle = {
			courseId: "course_abc",
			fetchedAt: new Date().toISOString(),
			componentCount: 1,
			resourceCount: 2,
			courseComponents: [],
			componentResources: [
				{
					sourcedId: "cr_1",
					status: "active",
					title: "duplicate",
					courseComponent: { sourcedId: "lesson_dup", type: "courseComponent" as const },
					resource: { sourcedId: "res_dup_1", type: "resource" as const },
					sortOrder: 0
				},
				{
					sourcedId: "cr_2",
					status: "active",
					title: "duplicate",
					courseComponent: { sourcedId: "lesson_dup", type: "courseComponent" as const },
					resource: { sourcedId: "res_dup_2", type: "resource" as const },
					sortOrder: 1
				}
			],
			resources: [
				{
					sourcedId: "res_dup_1",
					status: "active",
					title: "Article A",
					metadata: {
						type: "interactive",
						khanId: "res_dup_1",
						khanSlug: "duplicate-slug",
						khanTitle: "Article A",
						khanDescription: "First duplicate",
						khanActivityType: "Article",
						launchUrl: "https://example.com/article/a",
						url: "https://example.com/article/a",
						toolProvider: "example",
						xp: 10
					}
				},
				{
					sourcedId: "res_dup_2",
					status: "active",
					title: "Article B",
					metadata: {
						type: "interactive",
						khanId: "res_dup_2",
						khanSlug: "duplicate-slug",
						khanTitle: "Article B",
						khanDescription: "Second duplicate",
						khanActivityType: "Article",
						launchUrl: "https://example.com/article/b",
						url: "https://example.com/article/b",
						toolProvider: "example",
						xp: 12
					}
				}
			]
		}

		const { findResourceInLessonBySlugAndTypeBundle } = await import("@/lib/course-bundle/interactive-helpers")

		expect(() =>
			findResourceInLessonBySlugAndTypeBundle({
				bundle: bundle as any,
				lessonSourcedId: "lesson_dup",
				slug: "duplicate-slug",
				activityType: "Article"
			})
		).toThrow("ambiguous bundle lesson lookup")
	})

	test("invalidateCourseResourceBundle clears bundle-related cache keys", async () => {
		invalidatedKeys.length = 0
		const { invalidateCourseResourceBundle } = await import("@/lib/data/fetchers/oneroster")
		await invalidateCourseResourceBundle("course_bundle_test")

		expect(invalidatedKeys).toEqual([
			"oneroster-course-bundle::course_bundle_test",
			"oneroster-getComponentResourcesForCourse::course_bundle_test"
		])
	})
})
