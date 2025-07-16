import * as logger from "@superbuilders/slog"
import { unstable_cache as cache } from "next/cache"
import { oneroster } from "@/lib/clients"
import { createPrefixFilter } from "@/lib/filter"

// Prefix filters for leveraging btree indexes
const NICE_PREFIX_FILTER = createPrefixFilter("nice:")

// ⚠️ IMPORTANT: OneRoster API Filtering Limitation
// The OneRoster API only supports a SINGLE AND operation in filter queries.
// When multiple AND conditions are needed, we must:
// 1. Use the most selective filter condition in the API call
// 2. Apply additional filters client-side (in-memory) after fetching the data
//
// Example: To filter by slug='test' AND type='qti' AND status='active':
// - API filter: `metadata.slug='test' AND status='active'` (only 1 AND allowed)
// - Then filter the results in-memory for type='qti'
//
// This limitation affects functions like getResourcesBySlugAndType() and
// getResourceByCourseAndSlug() which need to filter results after fetching.

// --- Single Entity Fetchers ---

export const getCourse = cache(
	async (sourcedId: string) => {
		logger.info("getCourse called", { sourcedId })
		return oneroster.getCourse(sourcedId)
	},
	["oneroster-getCourse"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getResource = cache(
	async (sourcedId: string) => {
		logger.info("getResource called", { sourcedId })
		return oneroster.getResource(sourcedId)
	},
	["oneroster-getResource"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getClass = cache(
	async (classId: string) => {
		logger.info("getClass called", { classId })
		return oneroster.getClass(classId)
	},
	["oneroster-getClass"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

// --- Collection Fetchers (Encapsulating Filters) ---

export const getAllCourses = cache(
	async () => {
		logger.info("getAllCourses called")
		return oneroster.getAllCourses({ filter: `status='active'` })
	},
	["oneroster-getAllCourses"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getAllCoursesBySlug = cache(
	async (slug: string) => {
		logger.info("getAllCoursesBySlug called", { slug })
		return oneroster.getAllCourses({ filter: `metadata.khanSlug='${slug}' AND status='active'` })
	},
	["oneroster-getAllCoursesBySlug"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getCourseComponentsByCourseId = cache(
	async (courseId: string) => {
		logger.info("getCourseComponentsByCourseId called", { courseId })
		return oneroster.getCourseComponents({ filter: `course.sourcedId='${courseId}' AND status='active'` })
	},
	["oneroster-getCourseComponentsByCourseId"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getCourseComponentsByParentId = cache(
	async (parentId: string) => {
		logger.info("getCourseComponentsByParentId called", { parentId })
		return oneroster.getCourseComponents({ filter: `parent.sourcedId='${parentId}' AND status='active'` })
	},
	["oneroster-getCourseComponentsByParentId"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getCourseComponentBySlug = cache(
	async (slug: string) => {
		logger.info("getCourseComponentBySlug called", { slug })
		return oneroster.getCourseComponents({ filter: `metadata.khanSlug='${slug}' AND status='active'` })
	},
	["oneroster-getCourseComponentBySlug"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getCourseComponentByCourseAndSlug = cache(
	async (courseId: string, slug: string) => {
		logger.info("getCourseComponentByCourseAndSlug called", { courseId, slug })
		// Due to OneRoster API limitation, we can only use one AND operation
		// Filter by slug in API (more selective - slugs are unique), then filter by courseId client-side
		const components = await oneroster.getCourseComponents({
			filter: `metadata.khanSlug='${slug}' AND status='active'`
		})

		// Filter by courseId in-memory
		return components.filter((c) => c.course.sourcedId === courseId)
	},
	["oneroster-getCourseComponentByCourseAndSlug"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getCourseComponentByParentAndSlug = cache(
	async (parentId: string, slug: string) => {
		logger.info("getCourseComponentByParentAndSlug called", { parentId, slug })
		// Due to OneRoster API limitation, we can only use one AND operation
		// Filter by slug in API (more selective - slugs are unique), then filter by parentId client-side
		const components = await oneroster.getCourseComponents({
			filter: `metadata.khanSlug='${slug}' AND status='active'`
		})

		// Filter by parentId in-memory
		return components.filter((c) => c.parent?.sourcedId === parentId)
	},
	["oneroster-getCourseComponentByParentAndSlug"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getUnitsForCourses = cache(
	async (courseIds: string[]) => {
		logger.info("getUnitsForCourses called", { courseIds })
		if (courseIds.length === 0) return []
		// Encapsulates the `@` filter logic for OneRoster IN operator
		const filter = `course.sourcedId@'${courseIds.join(",")}' AND status='active'`
		return oneroster.getCourseComponents({ filter })
	},
	["oneroster-getUnitsForCourses"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getAllResources = cache(
	async () => {
		logger.info("getAllResources called")
		// Use prefix filter for "nice:" to leverage btree indexes for faster queries
		// Filter by status='active' client-side due to OneRoster API AND limitation
		const resources = await oneroster.getAllResources({ filter: NICE_PREFIX_FILTER })

		// Filter by status='active' in-memory
		return resources.filter((r) => r.status === "active")
	},
	["oneroster-getAllResources"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getResourcesBySlugAndType = cache(
	async (slug: string, type: "qti" | "video", lessonType?: "quiz" | "unittest") => {
		logger.info("getResourcesBySlugAndType called", { slug, type, lessonType })
		// Due to OneRoster API limitation, we can only use one AND operation
		// Keep filtering by slug as it's reasonably selective, type filter is quick client-side
		const filter = `metadata.khanSlug='${slug}' AND status='active'`
		const resources = await oneroster.getAllResources({ filter })

		// Filter by type in-memory
		let filtered = resources.filter((r) => r.metadata?.type === type)

		// Filter by lessonType in-memory if specified
		if (lessonType) {
			filtered = filtered.filter((r) => r.metadata?.khanLessonType === lessonType)
		}

		return filtered
	},
	["oneroster-getResourcesBySlugAndType"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getResourceByCourseAndSlug = cache(
	async (courseId: string, slug: string, type: "qti") => {
		logger.info("getResourceByCourseAndSlug called", { courseId, slug, type })
		// Due to OneRoster API limitation, we can only use one AND operation
		// Keep filtering by slug as it's the most selective publicly queryable field
		const filter = `metadata.khanSlug='${slug}' AND status='active'`
		const resources = await oneroster.getAllResources({ filter })

		// Filter by type and courseId in-memory
		return resources.filter((r) => r.metadata?.type === type && r.metadata?.courseSourcedId === courseId)
	},
	["oneroster-getResourceByCourseAndSlug"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getAllComponentResources = cache(
	async () => {
		logger.info("getAllComponentResources called")
		// Use prefix filter for "nice:" to leverage btree indexes for faster queries
		// Filter by status='active' client-side due to OneRoster API AND limitation
		const resources = await oneroster.getAllComponentResources({ filter: NICE_PREFIX_FILTER })

		// Filter by status='active' in-memory
		return resources.filter((r) => r.status === "active")
	},
	["oneroster-getAllComponentResources"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getClassesForSchool = cache(
	async (schoolSourcedId: string) => {
		logger.info("getClassesForSchool called", { schoolSourcedId })
		return oneroster.getClassesForSchool(schoolSourcedId)
	},
	["oneroster-getClassesForSchool"],
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getEnrollmentsForUser = cache(
	async (userSourcedId: string) => {
		logger.info("getEnrollmentsForUser called", { userSourcedId })
		return oneroster.getEnrollmentsForUser(userSourcedId)
	},
	["oneroster-getEnrollmentsForUser"],
	{ revalidate: 60 } // equivalent to cacheLife("minutes")
)

export const getActiveEnrollmentsForUser = cache(
	async (userSourcedId: string) => {
		// User data is more volatile, so we'll use a shorter default profile.
		logger.info("getActiveEnrollmentsForUser called", { userSourcedId })
		return oneroster.getAllEnrollments({ filter: `user.sourcedId='${userSourcedId}' AND status='active'` })
	},
	["oneroster-getActiveEnrollmentsForUser"],
	{ revalidate: 60 } // equivalent to cacheLife("minutes")
)
