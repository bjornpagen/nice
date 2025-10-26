import { afterEach, describe, expect, mock, test } from "bun:test"
import type { Lesson } from "@/lib/types/domain"
import type { CourseResourceBundle } from "@/lib/oneroster/redis/api"
import type { ResourceMetadata } from "@/lib/metadata/oneroster"

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

		const bundle: CourseResourceBundle = {
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
				format: "interactive",
				vendorResourceId: "vendor_resource_video",
				vendorId: null,
				applicationId: null,
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
				format: "interactive",
				vendorResourceId: "vendor_resource_article",
				vendorId: null,
				applicationId: null,
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
				format: "interactive",
				vendorResourceId: "vendor_resource_exercise",
				vendorId: null,
				applicationId: null,
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

		const actualFetchers = await import("@/lib/oneroster/redis/api")
		mock.module("@/lib/oneroster/redis/api", () => ({
			...actualFetchers,
			getAllCoursesBySlug: (slug: string) => {
				expect(slug).toBe("algebra-basics")
				return Promise.resolve([courseRecord])
			},
			getCourseResourceBundle: () => Promise.resolve(bundle)
		}))
		mock.module("@/lib/oneroster/react/course-bundle", () => ({
			getCachedCourseResourceBundle: async () => bundle,
			getCachedCourseResourceBundleWithLookups: async () => ({
				bundle,
				lookups: actualFetchers.getCourseResourceBundleLookups(bundle)
			})
		}))

		const { fetchCoursePageDataBase } = await import("@/lib/course-bundle/course-loaders")
		const result = await fetchCoursePageDataBase({ subject: "math", course: "algebra-basics" }, true)

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
		const lessonMetadata: ResourceMetadata = {
			type: "interactive",
			khanId: "res_dup_1",
			khanSlug: "duplicate-slug",
			khanTitle: "Article A",
			khanDescription: "First duplicate",
			xp: 10,
			khanActivityType: "Article",
			launchUrl: "https://example.com/article/a"
		}
		const secondMetadata: ResourceMetadata = {
			type: "interactive",
			khanId: "res_dup_2",
			khanSlug: "duplicate-slug",
			khanTitle: "Article B",
			khanDescription: "Second duplicate",
			xp: 12,
			khanActivityType: "Article",
			launchUrl: "https://example.com/article/b"
		}

		const bundle: CourseResourceBundle = {
			courseId: "course_abc",
			fetchedAt: new Date().toISOString(),
			componentCount: 2,
			resourceCount: 2,
			courseComponents: [
				{
					sourcedId: "unit_1",
					status: "active",
					title: "Unit One",
					course: { sourcedId: "course_abc", type: "course" },
					parent: undefined,
					sortOrder: 0,
					metadata: {
						khanId: "unit_1",
						khanSlug: "unit-one",
						khanTitle: "Unit One",
						khanDescription: ""
					}
				},
				{
					sourcedId: "lesson_dup",
					status: "active",
					title: "Lesson Dup",
					course: { sourcedId: "course_abc", type: "course" },
					parent: { sourcedId: "unit_1", type: "courseComponent" },
					sortOrder: 1,
					metadata: {
						khanId: "lesson_dup",
						khanSlug: "lesson-dup",
						khanTitle: "Lesson Dup",
						khanDescription: ""
					}
				}
			],
			componentResources: [
				{
					sourcedId: "cr_1",
					status: "active",
					title: "duplicate",
					courseComponent: { sourcedId: "lesson_dup", type: "courseComponent" },
					resource: { sourcedId: "res_dup_1", type: "resource" },
					sortOrder: 0
				},
				{
					sourcedId: "cr_2",
					status: "active",
					title: "duplicate",
					courseComponent: { sourcedId: "lesson_dup", type: "courseComponent" },
					resource: { sourcedId: "res_dup_2", type: "resource" },
					sortOrder: 1
				}
			],
			resources: [
				{
					sourcedId: "res_dup_1",
					status: "active",
					title: "Article A",
					format: "interactive",
					vendorResourceId: "vendor-res-dup-1",
					vendorId: null,
					applicationId: null,
					metadata: lessonMetadata
				},
				{
					sourcedId: "res_dup_2",
					status: "active",
					title: "Article B",
					format: "interactive",
					vendorResourceId: "vendor-res-dup-2",
					vendorId: null,
					applicationId: null,
					metadata: secondMetadata
				}
			]
		}

		const { findResourceInLessonBySlugAndTypeBundle } = await import("@/lib/course-bundle/interactive-helpers")

		expect(() =>
			findResourceInLessonBySlugAndTypeBundle({
				bundle,
				lessonSourcedId: "lesson_dup",
				slug: "duplicate-slug",
				activityType: "Article"
			})
		).toThrow("ambiguous bundle lesson lookup")
	})

	test("invalidateCourseResourceBundle clears bundle-related cache keys", async () => {
		invalidatedKeys.length = 0
		const metadataOne: ResourceMetadata = {
			type: "interactive",
			khanId: "resource-1",
			khanSlug: "article-one",
			khanTitle: "Article One",
			khanDescription: "metadata",
			xp: 10,
			khanActivityType: "Article",
			launchUrl: "https://example.com/article-one"
		}
		const metadataTwo: ResourceMetadata = {
			type: "interactive",
			khanId: "resource-2",
			khanSlug: "article-two",
			khanTitle: "Article Two",
			khanDescription: "metadata",
			xp: 12,
			khanActivityType: "Article",
			launchUrl: "https://example.com/article-two"
		}

		const bundle: CourseResourceBundle = {
			courseId: "course_bundle_test",
			fetchedAt: new Date().toISOString(),
			componentCount: 2,
			resourceCount: 2,
			courseComponents: [
				{
					sourcedId: "component-1",
					status: "active",
					title: "Component 1",
					course: { sourcedId: "course_bundle_test", type: "course" },
					parent: undefined,
					sortOrder: 0,
					metadata: {
						khanId: "component-1",
						khanSlug: "component-1",
						khanTitle: "Component 1",
						khanDescription: ""
					}
				},
				{
					sourcedId: "component-2",
					status: "active",
					title: "Component 2",
					course: { sourcedId: "course_bundle_test", type: "course" },
					parent: undefined,
					sortOrder: 1,
					metadata: {
						khanId: "component-2",
						khanSlug: "component-2",
						khanTitle: "Component 2",
						khanDescription: ""
					}
				}
			],
			componentResources: [
				{
					sourcedId: "cr-1",
					status: "active",
					title: "CR 1",
					courseComponent: { sourcedId: "component-1", type: "courseComponent" },
					resource: { sourcedId: "resource-1", type: "resource" },
					sortOrder: 0
				},
				{
					sourcedId: "cr-2",
					status: "active",
					title: "CR 2",
					courseComponent: { sourcedId: "component-2", type: "courseComponent" },
					resource: { sourcedId: "resource-2", type: "resource" },
					sortOrder: 1
				}
			],
			resources: [
				{
					sourcedId: "resource-1",
					status: "active",
					title: "Resource 1",
					format: "interactive",
					vendorResourceId: "vendor-resource-1",
					vendorId: null,
					applicationId: null,
					metadata: metadataOne
				},
				{
					sourcedId: "resource-2",
					status: "active",
					title: "Resource 2",
					format: "interactive",
					vendorResourceId: "vendor-resource-2",
					vendorId: null,
					applicationId: null,
					metadata: metadataTwo
				}
			]
		}

		const { invalidateCourseResourceBundleWithBundle } = await import("@/lib/oneroster/redis/api")
		await invalidateCourseResourceBundleWithBundle(bundle)

		expect(invalidatedKeys).toEqual([
			"oneroster-course-bundle::course_bundle_test",
			"oneroster-getComponentResourcesForCourse::course_bundle_test",
			"oneroster-getResourcesByIds::resource-1::resource-2"
		])
	})
})
