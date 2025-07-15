import { oneroster } from "@/lib/clients"

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

export async function getCourse(sourcedId: string) {
	"use cache"
	return oneroster.getCourse(sourcedId)
}

export async function getResource(sourcedId: string) {
	"use cache"
	return oneroster.getResource(sourcedId)
}

export async function getClass(classId: string) {
	"use cache"
	return oneroster.getClass(classId)
}

// --- Collection Fetchers (Encapsulating Filters) ---

export async function getAllCourses() {
	"use cache"
	return oneroster.getAllCourses({ filter: `status='active'` })
}

export async function getAllCoursesBySlug(slug: string) {
	"use cache"
	return oneroster.getAllCourses({ filter: `metadata.khanSlug='${slug}' AND status='active'` })
}

export async function getCourseComponentsByCourseId(courseId: string) {
	"use cache"
	return oneroster.getCourseComponents({ filter: `course.sourcedId='${courseId}' AND status='active'` })
}

export async function getCourseComponentsByParentId(parentId: string) {
	"use cache"
	return oneroster.getCourseComponents({ filter: `parent.sourcedId='${parentId}' AND status='active'` })
}

export async function getCourseComponentBySlug(slug: string) {
	"use cache"
	return oneroster.getCourseComponents({ filter: `metadata.khanSlug='${slug}' AND status='active'` })
}

export async function getCourseComponentByCourseAndSlug(courseId: string, slug: string) {
	"use cache"
	// Due to OneRoster API limitation, we can only use one AND operation
	// Filter by slug in API (more selective - slugs are unique), then filter by courseId client-side
	const components = await oneroster.getCourseComponents({ filter: `metadata.khanSlug='${slug}' AND status='active'` })

	// Filter by courseId in-memory
	return components.filter((c) => c.course.sourcedId === courseId)
}

export async function getCourseComponentByParentAndSlug(parentId: string, slug: string) {
	"use cache"
	// Due to OneRoster API limitation, we can only use one AND operation
	// Filter by slug in API (more selective - slugs are unique), then filter by parentId client-side
	const components = await oneroster.getCourseComponents({ filter: `metadata.khanSlug='${slug}' AND status='active'` })

	// Filter by parentId in-memory
	return components.filter((c) => c.parent?.sourcedId === parentId)
}

export async function getUnitsForCourses(courseIds: string[]) {
	"use cache"
	if (courseIds.length === 0) return []
	// Encapsulates the `@` filter logic for OneRoster IN operator
	const filter = `course.sourcedId@'${courseIds.join(",")}' AND status='active'`
	return oneroster.getCourseComponents({ filter })
}

export async function getAllResources() {
	"use cache"
	return oneroster.getAllResources({ filter: `status='active'` })
}

export async function getResourcesBySlugAndType(slug: string, type: "qti" | "video", lessonType?: "quiz" | "unittest") {
	"use cache"
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
}

export async function getResourceByCourseAndSlug(courseId: string, slug: string, type: "qti") {
	"use cache"
	// Due to OneRoster API limitation, we can only use one AND operation
	// Keep filtering by slug as it's the most selective publicly queryable field
	const filter = `metadata.khanSlug='${slug}' AND status='active'`
	const resources = await oneroster.getAllResources({ filter })

	// Filter by type and courseId in-memory
	return resources.filter((r) => r.metadata?.type === type && r.metadata?.courseSourcedId === courseId)
}

export async function getAllComponentResources() {
	"use cache"
	return oneroster.getAllComponentResources({ filter: `status='active'` })
}

export async function getClassesForSchool(schoolSourcedId: string) {
	"use cache"
	return oneroster.getClassesForSchool(schoolSourcedId)
}

export async function getEnrollmentsForUser(userSourcedId: string) {
	"use cache"
	return oneroster.getEnrollmentsForUser(userSourcedId)
}

export async function getActiveEnrollmentsForUser(userSourcedId: string) {
	"use cache"
	// User data is more volatile, so we'll use a shorter default profile.
	return oneroster.getAllEnrollments({ filter: `user.sourcedId='${userSourcedId}' AND status='active'` })
}
