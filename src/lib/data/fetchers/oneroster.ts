import * as logger from "@superbuilders/slog"
import { redisCache } from "@/lib/cache"
import { oneroster } from "@/lib/clients"
import { createPrefixFilter } from "@/lib/filter"

/**
 * ⚠️ CRITICAL: OneRoster API Soft Delete Behavior
 *
 * The OneRoster API implements a soft delete pattern where records are NEVER physically deleted.
 * Instead, when a DELETE request is made, the record's status is changed from "active" to "tobedeleted".
 *
 * This means:
 * 1. Deleted records STILL APPEAR in API responses unless explicitly filtered out
 * 2. Every query MUST include `status='active'` in the filter to exclude soft-deleted records
 * 3. Without this filter, the application will display "deleted" courses, classes, users, etc.
 *
 * FOOTGUNS TO AVOID:
 * - NEVER fetch data without a status filter
 * - NEVER trust that a DELETE operation removes the record from results
 * - NEVER use endpoints that don't support filtering without additional client-side filtering
 * - ALWAYS verify that ALL fetchers in this file include status='active' filtering
 *
 * Example of the problem:
 * - User deletes a class via the API: DELETE /classes/123
 * - API changes the class status from "active" to "tobedeleted"
 * - Calling getClassesForSchool() without proper filtering returns the "deleted" class
 * - Users see deleted classes in the UI, causing confusion
 *
 * Correct pattern:
 * getAllClasses({ filter: "status='active'" })
 *
 * Some endpoints like the original getClassesForSchool don't support filtering directly,
 * so we must use alternative endpoints (getAllClasses) with proper filters.
 */

// Prefix filters for leveraging btree indexes
const NICE_PREFIX_FILTER = createPrefixFilter("nice_")
function hasMetaKeys(x: unknown): x is { type?: unknown; subType?: unknown; khanActivityType?: unknown } {
	return typeof x === "object" && x !== null
}

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

// --- Universal Safety Filtering ---

/**
 * ⚠️ CRITICAL: Universal client-side safety filters
 *
 * These functions provide defensive filtering to ensure that even if API-level
 * filtering fails or is bypassed, we never return soft-deleted records to the application.
 *
 * ALWAYS use these helpers when returning OneRoster entities to ensure data consistency.
 */

function ensureActiveStatus<T extends { status: string }>(entities: T[]): T[] {
	return entities.filter((entity) => entity.status === "active")
}

function ensureActiveCourse<T extends { status: string }>(course: T | null | undefined): T | null {
	if (!course) return null
	return course.status === "active" ? course : null
}

function ensureActiveClass<T extends { status: string }>(classEntity: T | null | undefined): T | null {
	if (!classEntity) return null
	return classEntity.status === "active" ? classEntity : null
}

function ensureActiveResource<T extends { status: string }>(resource: T | null | undefined): T | null {
	if (!resource) return null
	return resource.status === "active" ? resource : null
}

// --- Single Entity Fetchers ---

export async function getCourse(sourcedId: string) {
	logger.info("getCourse called", { sourcedId })
	const operation = async () => {
		const course = await oneroster.getCourse(sourcedId)
		// ⚠️ CRITICAL: Apply client-side safety filtering
		return ensureActiveCourse(course)
	}
	return redisCache(operation, ["oneroster-getCourse", sourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getResource(sourcedId: string) {
	logger.info("getResource called", { sourcedId })
	const operation = async () => {
		const resource = await oneroster.getResource(sourcedId)
		// ⚠️ CRITICAL: Apply client-side safety filtering
		return ensureActiveResource(resource)
	}
	return redisCache(operation, ["oneroster-getResource", sourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getClass(classSourcedId: string) {
	logger.info("getClass called", { classSourcedId })
	const operation = async () => {
		const classEntity = await oneroster.getClass(classSourcedId)
		// ⚠️ CRITICAL: Apply client-side safety filtering
		return ensureActiveClass(classEntity)
	}
	return redisCache(operation, ["oneroster-getClass", classSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
}

// --- Collection Fetchers (Encapsulating Filters) ---

export async function getAllCourses() {
	logger.info("getAllCourses called")
	const operation = async () => {
		// Use prefix filter to leverage btree indexes for faster queries
		// Filter by status='active' client-side due to OneRoster API AND limitation
		const courses = await oneroster.getAllCourses({ filter: NICE_PREFIX_FILTER })

		// ⚠️ CRITICAL: Apply universal client-side safety filtering
		return ensureActiveStatus(courses)
	}
	return redisCache(operation, ["oneroster-getAllCourses"], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getAllCoursesBySlug(slug: string) {
	logger.info("getAllCoursesBySlug called", { slug })
	const operation = async () => {
		const courses = await oneroster.getAllCourses({ filter: `metadata.khanSlug='${slug}' AND status='active'` })
		// ⚠️ CRITICAL: Apply client-side safety filtering as defensive measure
		return ensureActiveStatus(courses)
	}
	return redisCache(operation, ["oneroster-getAllCoursesBySlug", slug], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getCourseComponentsByCourseId(courseSourcedId: string) {
	logger.info("getCourseComponentsByCourseId called", { courseSourcedId })
	const operation = async () => {
		const components = await oneroster.getCourseComponents({
			filter: `course.sourcedId='${courseSourcedId}' AND status='active'`
		})
		// ⚠️ CRITICAL: Apply client-side safety filtering as defensive measure
		return ensureActiveStatus(components)
	}
	return redisCache(operation, ["oneroster-getCourseComponentsByCourseId", courseSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getCourseComponentsByParentId(parentSourcedId: string) {
	logger.info("getCourseComponentsByParentId called", { parentSourcedId })
	const operation = async () => {
		const components = await oneroster.getCourseComponents({
			filter: `parent.sourcedId='${parentSourcedId}' AND status='active'`
		})
		// ⚠️ CRITICAL: Apply client-side safety filtering as defensive measure
		return ensureActiveStatus(components)
	}
	return redisCache(operation, ["oneroster-getCourseComponentsByParentId", parentSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getCourseComponentBySlug(slug: string) {
	logger.info("getCourseComponentBySlug called", { slug })
	const operation = async () => {
		const components = await oneroster.getCourseComponents({
			filter: `metadata.khanSlug='${slug}' AND status='active'`
		})
		// ⚠️ CRITICAL: Apply client-side safety filtering as defensive measure
		return ensureActiveStatus(components)
	}
	return redisCache(operation, ["oneroster-getCourseComponentBySlug", slug], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getCourseComponentByCourseAndSlug(courseSourcedId: string, slug: string) {
	logger.info("getCourseComponentByCourseAndSlug called", { courseSourcedId, slug })
	const operation = async () => {
		// Due to OneRoster API limitation, we can only use one AND operation
		// Filter by slug in API (more selective - slugs are unique), then filter by courseSourcedId client-side
		const components = await oneroster.getCourseComponents({
			filter: `metadata.khanSlug='${slug}' AND status='active'`
		})

		// ⚠️ CRITICAL: Apply client-side safety filtering and course filtering
		const activeComponents = ensureActiveStatus(components)
		return activeComponents.filter((c) => c.course.sourcedId === courseSourcedId)
	}
	return redisCache(operation, ["oneroster-getCourseComponentByCourseAndSlug", courseSourcedId, slug], {
		revalidate: 3600 * 24
	}) // 24-hour cache
}

export async function getCourseComponentByParentAndSlug(parentSourcedId: string, slug: string) {
	logger.info("getCourseComponentByParentAndSlug called", { parentSourcedId, slug })
	const operation = async () => {
		// Due to OneRoster API limitation, we can only use one AND operation
		// Filter by slug in API (more selective - slugs are unique), then filter by parentSourcedId client-side
		const components = await oneroster.getCourseComponents({
			filter: `metadata.khanSlug='${slug}' AND status='active'`
		})

		// ⚠️ CRITICAL: Apply client-side safety filtering and parent filtering
		const activeComponents = ensureActiveStatus(components)
		return activeComponents.filter((c) => c.parent?.sourcedId === parentSourcedId)
	}
	return redisCache(operation, ["oneroster-getCourseComponentByParentAndSlug", parentSourcedId, slug], {
		revalidate: 3600 * 24
	}) // 24-hour cache
}

export async function getUnitsForCourses(courseSourcedIds: string[]) {
	logger.info("getUnitsForCourses called", { courseSourcedIds })
	const operation = async () => {
		if (courseSourcedIds.length === 0) return []
		// Encapsulates the `@` filter logic for OneRoster IN operator
		const filter = `course.sourcedId@'${courseSourcedIds.join(",")}' AND status='active'`
		const components = await oneroster.getCourseComponents({ filter })
		// ⚠️ CRITICAL: Apply client-side safety filtering as defensive measure
		return ensureActiveStatus(components)
	}
	return redisCache(operation, ["oneroster-getUnitsForCourses", ...courseSourcedIds], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getAllResources() {
	logger.info("getAllResources called")
	const operation = async () => {
		// Use prefix filter to leverage btree indexes for faster queries
		// Filter by status='active' client-side due to OneRoster API AND limitation
		const resources = await oneroster.getAllResources({ filter: NICE_PREFIX_FILTER })

		// ⚠️ CRITICAL: Apply universal client-side safety filtering
		return ensureActiveStatus(resources)
	}
	return redisCache(operation, ["oneroster-getAllResources"], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getResourcesBySlugAndType(
	slug: string,
	type: "interactive",
	khanActivityType?: "Article" | "Video" | "Exercise" | "Quiz" | "UnitTest" | "CourseChallenge"
) {
	logger.info("getResourcesBySlugAndType called", { slug, type, khanActivityType })
	const operation = async () => {
		// Due to OneRoster API limitation, we can only use one AND operation
		// Keep filtering by slug as it's reasonably selective, type filter is quick client-side
		const filter = `metadata.khanSlug='${slug}' AND status='active'`
		const resources = await oneroster.getAllResources({ filter })

		// ⚠️ CRITICAL: Apply client-side safety filtering first
		const activeResources = ensureActiveStatus(resources)

		// Filter by type in-memory with backward-compatible support for QTI tests/exercises
		let filtered = activeResources
		if (khanActivityType === "Article" || khanActivityType === "Video") {
			// Articles and Videos remain interactive only
			filtered = filtered.filter(
				(r) => r.metadata?.type === "interactive" && r.metadata?.khanActivityType === khanActivityType
			)
		} else if (
			khanActivityType === "Exercise" ||
			khanActivityType === "Quiz" ||
			khanActivityType === "UnitTest" ||
			khanActivityType === "CourseChallenge"
		) {
			// Accept either interactive (older) or qti (reverted) forms
			filtered = filtered.filter((r) => {
				const meta = r.metadata
				if (!hasMetaKeys(meta)) return false
				const typeVal = typeof meta.type === "string" ? meta.type : undefined
				const subTypeVal = typeof meta.subType === "string" ? meta.subType : undefined
				const activityVal = typeof meta.khanActivityType === "string" ? meta.khanActivityType : undefined

				if (typeVal === "interactive") {
					return activityVal === khanActivityType
				}
				if (typeVal === "qti") {
					// All assessment tests and exercises use qti-test
					const subtypeOk = subTypeVal === "qti-test"
					const activityOk = !activityVal || activityVal === khanActivityType
					return subtypeOk && activityOk
				}
				return false
			})
		} else {
			// No activityType specified: preserve legacy behavior (interactive only)
			filtered = filtered.filter((r) => r.metadata?.type === type)
		}

		return filtered
	}
	const keyParts = khanActivityType
		? ["oneroster-getResourcesBySlugAndType", slug, type, khanActivityType]
		: ["oneroster-getResourcesBySlugAndType", slug, type]
	return redisCache(operation, keyParts, { revalidate: 3600 * 24 }) // 24-hour cache
}

// Removed legacy getResourceByCourseAndSlug (qti-only) – not needed in the interactive-only model

export async function getAllComponentResources() {
	logger.info("getAllComponentResources called")
	const operation = async () => {
		// Use prefix filter to leverage btree indexes for faster queries
		// Filter by status='active' client-side due to OneRoster API AND limitation
		const resources = await oneroster.getAllComponentResources({ filter: NICE_PREFIX_FILTER })

		// ⚠️ CRITICAL: Apply universal client-side safety filtering
		return ensureActiveStatus(resources)
	}
	return redisCache(operation, ["oneroster-getAllComponentResources"], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getClassesForSchool(schoolSourcedId: string) {
	logger.info("getClassesForSchool called", { schoolSourcedId })
	const operation = async () => {
		const classes = await oneroster.getAllClasses({
			filter: `school.sourcedId='${schoolSourcedId}' AND status='active'`
		})
		// ⚠️ CRITICAL: Apply client-side safety filtering as defensive measure
		return ensureActiveStatus(classes)
	}
	return redisCache(operation, ["oneroster-getClassesForSchool", schoolSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getEnrollmentsForUser(userSourcedId: string) {
	logger.info("getEnrollmentsForUser called", { userSourcedId })
	const operation = async () => {
		const enrollments = await oneroster.getEnrollmentsForUser(userSourcedId)
		// ⚠️ CRITICAL: Apply client-side safety filtering as defensive measure
		return ensureActiveStatus(enrollments)
	}
	// User data is more volatile, so use a shorter cache duration
	return redisCache(operation, ["oneroster-getEnrollmentsForUser", userSourcedId], { revalidate: 60 }) // 1 minute cache
}

export async function getActiveEnrollmentsForUser(userSourcedId: string) {
	logger.info("getActiveEnrollmentsForUser called", { userSourcedId })
	const operation = async () => {
		// Due to OneRoster API limitation, we can only use one AND operation for complex filters
		// Fetch all active enrollments for user, then filter for Khan Academy classes client-side
		const allEnrollments = await oneroster.getAllEnrollments({
			filter: `user.sourcedId='${userSourcedId}' AND status='active'`
		})

		// ⚠️ CRITICAL: Apply client-side safety filtering first
		const activeEnrollments = ensureActiveStatus(allEnrollments)

		// Filter for Khan Academy (nice_) classes only - excludes PowerPath and other systems
		return activeEnrollments.filter((enrollment) => enrollment.class.sourcedId.startsWith("nice_"))
	}
	// User data is more volatile, so use a shorter cache duration
	return redisCache(operation, ["oneroster-getActiveEnrollmentsForUser", userSourcedId], { revalidate: 60 }) // 1 minute cache
}
