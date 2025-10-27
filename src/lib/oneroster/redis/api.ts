import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createCacheKey, invalidateCache, redisCache } from "@/lib/cache"
import { oneroster } from "@/lib/clients"
import { createPrefixFilter } from "@/lib/filter"
import { ResourceMetadataSchema, type ResourceMetadata } from "@/lib/metadata/oneroster"
import type { ClassReadSchemaType, ComponentResourceRead, CourseComponentRead, Resource } from "@/lib/oneroster"

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
function hasMetaKeys(x: unknown): x is { type?: unknown; subType?: unknown; khanActivityType?: unknown; xp?: unknown } {
	return typeof x === "object" && x !== null
}

export interface CourseResourceBundle {
	courseId: string
	fetchedAt: string
	componentCount: number
	resourceCount: number
	courseComponents: CourseComponentRead[]
	componentResources: ComponentResourceRead[]
	resources: Array<Resource & { metadata: ResourceMetadata }>
}

type BundleLookups = {
	courseComponentsById: Map<string, CourseComponentRead>
	componentResourcesByComponentId: Map<string, ComponentResourceRead[]>
	resourcesById: Map<string, Resource & { metadata: ResourceMetadata }>
}

const bundleLookups = new WeakMap<CourseResourceBundle, BundleLookups>()

function buildBundleLookups(bundle: CourseResourceBundle): BundleLookups {
	const courseComponentsById = new Map<string, CourseComponentRead>()
	for (const component of bundle.courseComponents) {
		courseComponentsById.set(component.sourcedId, component)
	}

	const componentResourcesByComponentId = new Map<string, ComponentResourceRead[]>()
	for (const componentResource of bundle.componentResources) {
		const componentId = componentResource.courseComponent.sourcedId
		const list = componentResourcesByComponentId.get(componentId)
		if (list) list.push(componentResource)
		else componentResourcesByComponentId.set(componentId, [componentResource])
	}

	const resourcesById = new Map<string, Resource & { metadata: ResourceMetadata }>()
	for (const resource of bundle.resources) {
		resourcesById.set(resource.sourcedId, resource)
	}

	return { courseComponentsById, componentResourcesByComponentId, resourcesById }
}

export function getCourseResourceBundleLookups(bundle: CourseResourceBundle): BundleLookups {
	let lookups = bundleLookups.get(bundle)
	if (!lookups) {
		lookups = buildBundleLookups(bundle)
		bundleLookups.set(bundle, lookups)
	}
	return lookups
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
		
		// Batch requests to avoid 414 Request-URI Too Large errors
		// Max 50 IDs per request to keep URLs under typical limits
		const BATCH_SIZE = 50
		const batches: string[][] = []
		
		for (let i = 0; i < courseSourcedIds.length; i += BATCH_SIZE) {
			batches.push(courseSourcedIds.slice(i, i + BATCH_SIZE))
		}

		logger.debug("batching units for courses requests", { 
			totalIds: courseSourcedIds.length, 
			batchCount: batches.length,
			batchSize: BATCH_SIZE
		})

		// Fetch all batches in parallel
		const batchResults = await Promise.all(
			batches.map(async (batch) => {
				const filter = `course.sourcedId@'${batch.join(",")}' AND status='active'`
				const components = await oneroster.getCourseComponents({ filter })
				return ensureActiveStatus(components)
			})
		)

		// Combine all results
		const allComponents = batchResults.flat()
		logger.debug("completed batched units for courses fetch", { resultCount: allComponents.length })
		
		return allComponents
	}
	return redisCache(operation, ["oneroster-getUnitsForCourses", ...courseSourcedIds], { revalidate: 3600 * 24 }) // 24-hour cache
}

/** ⚠️ Course Builder only. Do not call from user flows. */
export async function getAllResourcesForCourseBuilder() {
	logger.info("getAllResourcesForCourseBuilder called")
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
			// Legacy: accept either interactive (older) or qti (reverted) forms
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

/** ⚠️ Course Builder only. Do not call from user flows. */
export async function getAllComponentResourcesForCourseBuilder() {
	logger.info("getAllComponentResourcesForCourseBuilder called")
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
	return redisCache(operation, ["oneroster-getEnrollmentsForUser", userSourcedId], { revalidate: 10 }) // 10 seconds cache
}

export async function getActiveEnrollmentsForUser(userSourcedId: string) {
	logger.info("getActiveEnrollmentsForUser called", { userSourcedId })
	const operation = async () => {
		// Due to OneRoster API limitation, we can only use one AND operation for complex filters
		// Fetch all enrollments for this user filtered by status at API level; apply role & course checks client-side
		const allEnrollments = await oneroster.getAllEnrollments({
			filter: `user.sourcedId='${userSourcedId}' AND status='active'`
		})

		// ⚠️ CRITICAL: Apply client-side safety filtering first
		const activeEnrollments = ensureActiveStatus(allEnrollments)

		// Restrict to student-role enrollments only (teacher/other roles should not count as "enrolled")
		const studentEnrollments = activeEnrollments.filter((e) => e.role === "student")

		// Resolve each unique class to its course and keep only those whose course.sourcedId starts with "nice_"
		const uniqueClassIds = [...new Set(studentEnrollments.map((e) => e.class.sourcedId))]
		const classResults = await Promise.all(
			uniqueClassIds.map(async (classId) => {
				const clsResult = await errors.try(getClass(classId))
				if (clsResult.error) {
					logger.error("failed to resolve class for enrollment filtering", { classId, error: clsResult.error })
					return { classId, cls: null }
				}
				return { classId, cls: clsResult.data }
			})
		)
		const classById = new Map<string, ClassReadSchemaType>()
		for (const { classId, cls } of classResults) {
			if (cls) classById.set(classId, cls)
		}

		return studentEnrollments.filter((enrollment) => {
			const cls = classById.get(enrollment.class.sourcedId)
			return Boolean(cls && typeof cls.course?.sourcedId === "string" && cls.course.sourcedId.startsWith("nice_"))
		})
	}
	// User data is more volatile, so use a shorter cache duration
	return redisCache(operation, ["oneroster-getActiveEnrollmentsForUser", userSourcedId], { revalidate: 10 }) // 10 seconds cache
}

// --- New Fetchers for XP Banking ---

/**
 * Fetches all ComponentResources for a specific course.
 * This ensures all component resources are scoped to the given course.
 */
export async function getComponentResourcesForCourse(courseSourcedId: string) {
	logger.info("getComponentResourcesForCourse called", { courseSourcedId })
	const operation = async () => {
		const courseComponents = await getCourseComponentsByCourseId(courseSourcedId)
		return getComponentResourcesForCourseWithComponents(courseSourcedId, courseComponents)
	}
	return redisCache(operation, ["oneroster-getComponentResourcesForCourse", courseSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getComponentResourcesForCourseWithComponents(
	courseSourcedId: string,
	components: CourseComponentRead[]
) {
	logger.debug("getComponentResourcesForCourseWithComponents invoked", {
		courseSourcedId,
		componentCount: components.length
	})

	if (components.length === 0) {
		logger.info("getComponentResourcesForCourseWithComponents: no course components present", { courseSourcedId })
		return []
	}

	const componentIds = components.map((component) => component.sourcedId)
	
	// Batch requests to avoid 414 Request-URI Too Large errors
	// Max 50 IDs per request to keep URLs under typical limits
	const BATCH_SIZE = 50
	const batches: string[][] = []
	
	for (let i = 0; i < componentIds.length; i += BATCH_SIZE) {
		batches.push(componentIds.slice(i, i + BATCH_SIZE))
	}

	logger.debug("batching component resources for course requests", { 
		courseSourcedId,
		totalIds: componentIds.length, 
		batchCount: batches.length,
		batchSize: BATCH_SIZE
	})

	// Fetch all batches in parallel
	const batchResults = await Promise.all(
		batches.map(async (batch) => {
			const componentResources = await oneroster.getAllComponentResources({
				filter: `courseComponent.sourcedId@'${batch.join(",")}' AND status='active'`
			})
			return ensureActiveStatus(componentResources)
		})
	)

	// Combine all results
	const allComponentResources = batchResults.flat()
	logger.debug("completed batched component resources for course fetch", { resultCount: allComponentResources.length })
	
	return allComponentResources
}

/**
 * Fetches the ComponentResource for a specific resource within a specific course.
 * Throws if no match found or if multiple matches exist (ambiguous).
 */
export async function getComponentResourceForResourceInCourse(courseSourcedId: string, resourceSourcedId: string) {
	logger.info("getComponentResourceForResourceInCourse called", { courseSourcedId, resourceSourcedId })
	const operation = async () => {
		// Get all component resources for the course
		const allComponentResources = await getComponentResourcesForCourse(courseSourcedId)

		// Filter to find matches for this resource
		const matches = allComponentResources.filter(cr => cr.resource.sourcedId === resourceSourcedId)

		if (matches.length === 0) {
			logger.error("no component resource found for resource in course", {
				courseSourcedId,
				resourceSourcedId,
				totalComponentResources: allComponentResources.length
			})
			throw errors.new("component resource not found for resource in course")
		}

		if (matches.length > 1) {
			logger.error("multiple component resources found for resource in course", {
				courseSourcedId,
				resourceSourcedId,
				matchCount: matches.length,
				candidates: matches.map(cr => ({
					componentResourceId: cr.sourcedId,
					courseComponentId: cr.courseComponent.sourcedId,
					sortOrder: cr.sortOrder
				}))
			})
			throw errors.new("ambiguous component resource for resource in course")
		}

		return matches[0]
	}
	return redisCache(operation, ["oneroster-getComponentResourceForResourceInCourse", courseSourcedId, resourceSourcedId], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getComponentResourcesByResourceId(resourceSourcedId: string) {
	if (!resourceSourcedId) {
		logger.error("getComponentResourcesByResourceId: resourceSourcedId required")
		throw errors.new("getComponentResourcesByResourceId: resourceSourcedId required")
	}
	return redisCache(
		async () =>
			ensureActiveStatus(
				await oneroster.getAllComponentResources({
					filter: `resource.sourcedId='${resourceSourcedId}' AND status='active'`
				})
			),
		["oneroster-getComponentResourcesByResourceId", resourceSourcedId],
		{ revalidate: 3600 }
	)
}

export async function getCourseResourceBundle(courseSourcedId: string): Promise<CourseResourceBundle> {
	if (!courseSourcedId) {
		logger.error("getCourseResourceBundle: courseSourcedId required")
		throw errors.new("getCourseResourceBundle: courseSourcedId required")
	}

	return redisCache(
		async () => {
			const components = await getCourseComponentsByCourseId(courseSourcedId)
			if (components.length === 0) {
				logger.error("getCourseResourceBundle: course has no components", { courseSourcedId })
				throw errors.new("getCourseResourceBundle: course has no components")
			}

			const componentResources = await getComponentResourcesForCourseWithComponents(courseSourcedId, components)
			if (componentResources.length === 0) {
				logger.error("getCourseResourceBundle: component resources missing", { courseSourcedId })
				throw errors.new("getCourseResourceBundle: component resources missing")
			}

			const resourceIds = Array.from(
				new Set(componentResources.map((componentResource) => componentResource.resource.sourcedId))
			)
			if (resourceIds.length === 0) {
				logger.error("getCourseResourceBundle: no resource ids derived from component resources", {
					courseSourcedId
				})
				throw errors.new("getCourseResourceBundle: resources missing")
			}

			const resources = await getResourcesByIds(resourceIds)
			const resourcesById = new Map(resources.map((resource) => [resource.sourcedId, resource]))
			const missingResourceIds = resourceIds.filter((id) => !resourcesById.has(id))
			if (missingResourceIds.length > 0) {
				logger.error("getCourseResourceBundle: some resources missing from lookup", {
					courseSourcedId,
					missingResourceIds
				})
				throw errors.new("getCourseResourceBundle: resources missing")
			}

			const validated = resourceIds.map((resourceId) => {
				const resource = resourcesById.get(resourceId)!
				const parsed = ResourceMetadataSchema.safeParse(resource.metadata)
				if (!parsed.success) {
					logger.error("getCourseResourceBundle: invalid resource metadata", {
						courseSourcedId,
						resourceSourcedId: resource.sourcedId,
						error: parsed.error
					})
					throw errors.wrap(parsed.error, "invalid resource metadata")
				}
				return { ...resource, metadata: parsed.data }
			})

			const bundle: CourseResourceBundle = {
				courseId: courseSourcedId,
				fetchedAt: new Date().toISOString(),
				componentCount: componentResources.length,
				resourceCount: validated.length,
				courseComponents: components,
				componentResources,
				resources: validated
			}

			bundleLookups.set(bundle, buildBundleLookups(bundle))
			return bundle
		},
		["oneroster-course-bundle", courseSourcedId],
		{ revalidate: 3600 }
	)
}

export function findLessonResources(bundle: CourseResourceBundle, lessonId: string) {
	const matches = bundle.componentResources.filter((cr) => cr.courseComponent.sourcedId === lessonId)
	if (matches.length === 0) {
		logger.error("findLessonResources: no matches", { courseId: bundle.courseId, lessonId })
		throw errors.new("findLessonResources: no matches")
	}
	return matches
}

export function findResourceById(bundle: CourseResourceBundle, resourceId: string) {
	const resource = getCourseResourceBundleLookups(bundle).resourcesById.get(resourceId)
	if (!resource) {
		logger.error("findResourceById: resource not found", { courseId: bundle.courseId, resourceId })
		throw errors.new("findResourceById: resource not found")
	}
	return resource
}

async function invalidateCourseBundleKeys(courseSourcedId: string) {
	await invalidateCache([
		createCacheKey(["oneroster-course-bundle", courseSourcedId]),
		createCacheKey(["oneroster-getComponentResourcesForCourse", courseSourcedId])
	])
}

function combineResourceIds(
	explicitIds: readonly string[],
	enumeratedIds: Iterable<string>
): Set<string> {
	const ids = new Set(explicitIds)
	for (const id of enumeratedIds) {
		ids.add(id)
	}
	return ids
}

async function enumerateCourseResourceIds(courseSourcedId: string): Promise<Set<string>> {
	logger.debug("enumerating course resource ids for invalidation", { courseSourcedId })
	const components = await getCourseComponentsByCourseId(courseSourcedId)
	if (components.length === 0) {
		logger.info("course has no components during invalidation", { courseSourcedId })
		return new Set()
	}

	const componentResources = await getComponentResourcesForCourseWithComponents(courseSourcedId, components)
	if (componentResources.length === 0) {
		logger.info("course has no component resources during invalidation", {
			courseSourcedId,
			componentCount: components.length
		})
		return new Set()
	}

	const ids = new Set<string>()
	for (const componentResource of componentResources) {
		ids.add(componentResource.resource.sourcedId)
	}
	return ids
}

async function invalidateCourseBundleCaches(courseSourcedId: string, resourceIds: Set<string>) {
	await invalidateCourseBundleKeys(courseSourcedId)

	if (resourceIds.size === 0) {
		logger.debug("course invalidation: no resource caches to drop", { courseSourcedId })
		return
	}

	const sorted = [...resourceIds].sort()
	await invalidateCache([createCacheKey(["oneroster-getResourcesByIds", ...sorted])])
}

export async function invalidateCourseResourceBundle(courseSourcedId: string, resourceIds: readonly string[]) {
	if (!courseSourcedId) {
		logger.error("invalidateCourseResourceBundle: courseSourcedId required", { resourceIdsCount: resourceIds.length })
		throw errors.new("invalidateCourseResourceBundle: courseSourcedId required")
	}

	logger.info("invalidate course bundle requested", {
		courseSourcedId,
		explicitResourceIds: resourceIds.length
	})

	const enumeratedIds = await enumerateCourseResourceIds(courseSourcedId)
	const combinedIds = combineResourceIds(resourceIds, enumeratedIds)

	await invalidateCourseBundleCaches(courseSourcedId, combinedIds)
}

export async function invalidateCourseResourceBundleWithBundle(bundle: CourseResourceBundle) {
	const collectedIds = new Set<string>()
	for (const componentResource of bundle.componentResources) {
		collectedIds.add(componentResource.resource.sourcedId)
	}

	await invalidateCourseBundleCaches(bundle.courseId, collectedIds)
}

/**
 * Fetches resources by their IDs.
 * Uses the @ operator for efficient batch fetching.
 * Automatically batches requests to avoid 414 Request-URI Too Large errors.
 */
export async function getResourcesByIds(resourceIds: string[]) {
	logger.info("getResourcesByIds called", { count: resourceIds.length })
	if (resourceIds.length === 0) {
		return []
	}

	const operation = async () => {
		// Batch requests to avoid 414 Request-URI Too Large errors
		// Max 50 IDs per request to keep URLs under typical limits
		const BATCH_SIZE = 50
		const batches: string[][] = []
		
		for (let i = 0; i < resourceIds.length; i += BATCH_SIZE) {
			batches.push(resourceIds.slice(i, i + BATCH_SIZE))
		}

		logger.debug("batching resource requests", { 
			totalIds: resourceIds.length, 
			batchCount: batches.length,
			batchSize: BATCH_SIZE
		})

		// Fetch all batches in parallel
		const batchResults = await Promise.all(
			batches.map(async (batch) => {
				const resources = await oneroster.getAllResources({
					filter: `sourcedId@'${batch.join(",")}' AND status='active'`
				})
				return ensureActiveStatus(resources)
			})
		)

		// Combine all results
		const allResources = batchResults.flat()
		logger.debug("completed batched resource fetch", { resultCount: allResources.length })
		
		return allResources
	}

	// Create a stable cache key by sorting IDs
	const sortedIds = [...resourceIds].sort()
	return redisCache(operation, ["oneroster-getResourcesByIds", ...sortedIds], { revalidate: 3600 * 24 }) // 24-hour cache
}

/**
 * Fetches ComponentResources for specific lesson IDs.
 * Used to get all content within a set of lessons.
 * Automatically batches requests to avoid 414 Request-URI Too Large errors.
 */
export async function getComponentResourcesByLessonIds(lessonIds: string[]) {
	logger.info("getComponentResourcesByLessonIds called", { count: lessonIds.length })
	if (lessonIds.length === 0) {
		return []
	}

	const operation = async () => {
		// Batch requests to avoid 414 Request-URI Too Large errors
		// Max 50 IDs per request to keep URLs under typical limits
		const BATCH_SIZE = 50
		const batches: string[][] = []
		
		for (let i = 0; i < lessonIds.length; i += BATCH_SIZE) {
			batches.push(lessonIds.slice(i, i + BATCH_SIZE))
		}

		logger.debug("batching component resource requests", { 
			totalIds: lessonIds.length, 
			batchCount: batches.length,
			batchSize: BATCH_SIZE
		})

		// Fetch all batches in parallel
		const batchResults = await Promise.all(
			batches.map(async (batch) => {
				const componentResources = await oneroster.getAllComponentResources({
					filter: `courseComponent.sourcedId@'${batch.join(",")}' AND status='active'`
				})
				return ensureActiveStatus(componentResources)
			})
		)

		// Combine all results
		const allComponentResources = batchResults.flat()
		logger.debug("completed batched component resource fetch", { resultCount: allComponentResources.length })
		
		return allComponentResources
	}

	// Create a stable cache key by sorting IDs
	const sortedIds = [...lessonIds].sort()
	return redisCache(operation, ["oneroster-getComponentResourcesByLessonIds", ...sortedIds], { revalidate: 3600 * 24 }) // 24-hour cache
}

/**
 * Fetches course components by their sourcedId.
 * This wraps the low-level call and applies active-status filtering consistently.
 */
export async function getCourseComponentsBySourcedId(sourcedId: string) {
    logger.info("getCourseComponentsBySourcedId called", { sourcedId })
    const operation = async () => {
        const components = await oneroster.getCourseComponents({
            filter: `sourcedId='${sourcedId}' AND status='active'`
        })
        return ensureActiveStatus(components)
    }
    return redisCache(operation, ["oneroster-getCourseComponentsBySourcedId", sourcedId], { revalidate: 3600 * 24 })
}

/**
 * Fetches a result by its sourcedId.
 * Intentionally not cached (results are hot on write paths); wrap for consistency/logging.
 */
export async function getResult(sourcedId: string) {
    logger.info("getResult called", { sourcedId })
    // Do not cache writes/read-after-write; return raw client result
    return oneroster.getResult(sourcedId)
}

export type CourseResourceBundleWireFormat = {
	courseId: string
	fetchedAt: string
	componentCount: number
	resourceCount: number
	courseComponents: CourseComponentRead[]
	componentResources: ComponentResourceRead[]
	resources: Array<Resource & { metadata: ResourceMetadata }>
}
