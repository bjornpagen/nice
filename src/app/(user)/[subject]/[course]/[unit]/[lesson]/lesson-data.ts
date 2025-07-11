import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { oneroster } from "@/lib/clients"
import { createPrefixFilter } from "@/lib/filter"
import type { LessonChild, LessonInfo } from "@/lib/khan-academy-api"
import type { Resource } from "@/lib/oneroster"

// Shared data fetching function
export async function fetchLessonData(params: { subject: string; course: string; unit: string; lesson: string }) {
	const prefixFilter = createPrefixFilter("nice:")

	// ✅ NEW: Waterfall lookup with namespace filter
	const courseResult = await errors.try(
		oneroster.getAllCourses({ filter: `${prefixFilter} AND metadata.khanSlug='${params.course}' AND status='active'` })
	)
	if (courseResult.error) {
		logger.error("failed to fetch course by slug", { error: courseResult.error, slug: params.course })
		throw errors.wrap(courseResult.error, "failed to fetch course by slug")
	}
	const course = courseResult.data[0]
	if (!course) {
		notFound()
	}

	const unitResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `${prefixFilter} AND course.sourcedId='${course.sourcedId}' AND metadata.khanSlug='${params.unit}' AND status='active'`
		})
	)
	if (unitResult.error) {
		logger.error("failed to fetch unit by slug", { error: unitResult.error, slug: params.unit })
		throw errors.wrap(unitResult.error, "failed to fetch unit by slug")
	}
	const unit = unitResult.data[0]
	if (!unit) {
		notFound()
	}

	const lessonResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `${prefixFilter} AND parent.sourcedId='${unit.sourcedId}' AND metadata.khanSlug='${params.lesson}' AND status='active'`
		})
	)
	if (lessonResult.error) {
		logger.error("failed to fetch lesson by slug", { error: lessonResult.error, slug: params.lesson })
		throw errors.wrap(lessonResult.error, "failed to fetch lesson by slug")
	}
	const currentLesson = lessonResult.data[0]
	if (!currentLesson) {
		notFound()
	}

	// 2. Fetch all lessons for the current unit to build the sidebar
	const unitLessonsResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `${prefixFilter} AND parent.sourcedId='${unit.sourcedId}' AND status='active'`
		})
	)
	if (unitLessonsResult.error) {
		logger.error("failed to fetch unit lessons", { error: unitLessonsResult.error, unitSourcedId: unit.sourcedId })
		throw errors.wrap(unitLessonsResult.error, "failed to fetch unit lessons")
	}

	// 3. Fetch ALL component resources and filter in memory (since specific filters are not supported)
	const allComponentResourcesResult = await errors.try(
		oneroster.getAllComponentResources({ filter: `${prefixFilter} AND status='active'` })
	)
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch component resources", { error: allComponentResourcesResult.error })
		throw errors.wrap(allComponentResourcesResult.error, "failed to fetch component resources")
	}

	// Filter component resources to only those for lessons in this unit
	const lessonIds = new Set(unitLessonsResult.data.map((l) => l.sourcedId))
	const allComponentResources = allComponentResourcesResult.data.filter((cr) =>
		lessonIds.has(cr.courseComponent.sourcedId)
	)

	// 4. Fetch all unique resources linked by those component resources
	const resourceIds = [...new Set(allComponentResources.map((cr) => cr.resource.sourcedId))]

	// Fetch resources individually if we have many, or use a simple filter for fewer resources
	let allResourcesData: Resource[] = []
	if (resourceIds.length === 0) {
		allResourcesData = []
	} else if (resourceIds.length <= 10) {
		// For small numbers, fetch individually to avoid filter syntax issues
		const resourcePromises = resourceIds.map(async (resourceId) => {
			const result = await errors.try(oneroster.getResource(resourceId))
			if (result.error) {
				logger.error("CRITICAL: Failed to fetch resource", { resourceId, error: result.error })
				throw errors.wrap(result.error, "resource fetch failed")
			}

			const resource = result.data
			if (!resource) {
				logger.error("CRITICAL: Resource data is undefined", { resourceId })
				throw errors.new("resource data undefined")
			}

			// Only include active resources - filter out inactive ones
			if (resource.status === "active") {
				return resource
			}
			logger.info("filtering out inactive resource", { resourceId, status: resource.status })
			return undefined
		})
		const resourceResults = await Promise.all(resourcePromises)
		// Filter out undefined values (inactive resources)
		allResourcesData = resourceResults.filter((r): r is Resource => r !== undefined)
	} else {
		// For larger numbers, try a simple filter approach
		const allResourcesResult = await errors.try(
			oneroster.getAllResources({ filter: `${prefixFilter} AND status='active'` })
		)
		if (allResourcesResult.error) {
			logger.error("failed to fetch resources", { error: allResourcesResult.error })
			throw errors.wrap(allResourcesResult.error, "failed to fetch resources")
		}
		// Filter client-side to only get the resources we need
		allResourcesData = allResourcesResult.data.filter((r) => resourceIds.includes(r.sourcedId))
	}

	const resourcesMap = new Map(allResourcesData.map((r) => [r.sourcedId, r]))

	// 5. Build a map of lesson content with temporary sortOrder for sorting
	const lessonContentMap = new Map<string, Array<LessonChild & { sortOrder: number }>>()
	// Map to store lesson slugs for path construction
	const lessonSlugMap = new Map<string, string>()
	for (const lesson of unitLessonsResult.data) {
		if (typeof lesson.metadata?.khanSlug === "string") {
			lessonSlugMap.set(lesson.sourcedId, lesson.metadata.khanSlug)
		}
	}

	for (const cr of allComponentResources) {
		const resource = resourcesMap.get(cr.resource.sourcedId)
		if (resource) {
			// Determine content type from metadata
			let contentType: "Video" | "Article" | "Exercise" | undefined
			if (resource.metadata?.type === "video") {
				contentType = "Video"
			} else if (resource.metadata?.type === "qti" && resource.metadata?.subType === "qti-stimulus") {
				contentType = "Article"
			} else if (resource.metadata?.type === "qti" && resource.metadata?.subType === "qti-test") {
				contentType = "Exercise"
			}

			if (contentType) {
				// ✅ NEW: Use slugs from metadata/params, not from sourcedId
				const resourceSlug = typeof resource.metadata?.khanSlug === "string" ? resource.metadata.khanSlug : null
				if (!resourceSlug) {
					logger.error("CRITICAL: Resource missing khanSlug", { resourceId: resource.sourcedId })
					throw errors.new("resource: khanSlug is required")
				}

				const lessonSlug = lessonSlugMap.get(cr.courseComponent.sourcedId)
				if (!lessonSlug) {
					logger.error("CRITICAL: Lesson missing khanSlug", { lessonId: cr.courseComponent.sourcedId })
					throw errors.new("lesson: khanSlug is required for path construction")
				}

				const unitSlug = params.unit

				// Construct the correct path based on content type and current URL structure
				let contentPath: string
				if (contentType === "Video") {
					contentPath = `/${params.subject}/${params.course}/${unitSlug}/${lessonSlug}/v/${resourceSlug}`
				} else if (contentType === "Article") {
					contentPath = `/${params.subject}/${params.course}/${unitSlug}/${lessonSlug}/a/${resourceSlug}`
				} else {
					// Exercise
					contentPath = `/${params.subject}/${params.course}/${unitSlug}/${lessonSlug}/e/${resourceSlug}`
				}

				// Validate required fields
				if (!resource.title) {
					logger.error("CRITICAL: Resource missing title", { resourceId: resource.sourcedId })
					throw errors.new("resource: title is required")
				}

				const description = typeof resource.metadata?.description === "string" ? resource.metadata.description : ""

				const child: LessonChild & { sortOrder: number } = {
					id: resource.sourcedId,
					slug: resourceSlug,
					title: resource.title,
					description: description,
					path: contentPath,
					type: contentType,
					sortOrder: cr.sortOrder
				}
				if (!lessonContentMap.has(cr.courseComponent.sourcedId)) {
					lessonContentMap.set(cr.courseComponent.sourcedId, [])
				}
				lessonContentMap.get(cr.courseComponent.sourcedId)?.push(child)
			}
		}
	}

	// Sort lesson children by sortOrder and remove sortOrder property
	const finalLessonContentMap = new Map<string, LessonChild[]>()
	for (const [lessonId, children] of lessonContentMap.entries()) {
		const sortedChildren = children.sort((a, b) => a.sortOrder - b.sortOrder).map(({ sortOrder, ...child }) => child) // Remove sortOrder property
		finalLessonContentMap.set(lessonId, sortedChildren)
	}

	// 6. Assemble the final data structure
	const unitLessonsWithContent: LessonInfo[] = unitLessonsResult.data
		.map((lesson) => {
			// Validate required fields
			if (!lesson.title) {
				logger.error("CRITICAL: Lesson missing title", { lessonId: lesson.sourcedId })
				throw errors.new("lesson: title is required")
			}

			const description = typeof lesson.metadata?.description === "string" ? lesson.metadata.description : ""
			const path = typeof lesson.metadata?.path === "string" ? lesson.metadata.path : ""

			// Validate path if it exists
			if (path && !path.startsWith("/")) {
				logger.error("CRITICAL: Invalid lesson path format", { lessonId: lesson.sourcedId, path })
				throw errors.new("lesson: invalid path format")
			}

			const children = finalLessonContentMap.get(lesson.sourcedId)

			// Lessons may have no content - this is a valid state
			let lessonChildren: LessonChild[]
			if (children === undefined) {
				lessonChildren = []
				logger.debug("lesson has no content", { lessonId: lesson.sourcedId })
			} else {
				lessonChildren = children
			}

			const lessonSlug = typeof lesson.metadata?.khanSlug === "string" ? lesson.metadata.khanSlug : null
			if (!lessonSlug) {
				logger.error("CRITICAL: Lesson missing khanSlug", { lessonId: lesson.sourcedId })
				throw errors.new("lesson: khanSlug is required")
			}

			return {
				type: "Lesson" as const,
				id: lesson.sourcedId,
				slug: lessonSlug,
				title: lesson.title,
				description: description,
				path: path,
				children: lessonChildren
			}
		})
		.sort((a, b) => {
			// Sort by OneRoster sortOrder
			const aLesson = unitLessonsResult.data.find((l) => l.sourcedId === a.id)
			const bLesson = unitLessonsResult.data.find((l) => l.sourcedId === b.id)

			if (!aLesson || !bLesson) {
				logger.error("CRITICAL: Lesson not found for sorting", { aId: a.id, bId: b.id })
				throw errors.new("lesson sorting: data inconsistency")
			}

			const aSort = aLesson.sortOrder
			const bSort = bLesson.sortOrder
			return aSort - bSort
		})

	// Validate required course fields
	if (!course.title) {
		logger.error("CRITICAL: Course missing title", { courseId: course.sourcedId })
		throw errors.new("course: title is required")
	}
	const coursePath = typeof course.metadata?.path === "string" ? course.metadata.path : ""

	// Validate required unit fields
	if (!unit.title) {
		logger.error("CRITICAL: Unit missing title", { unitId: unit.sourcedId })
		throw errors.new("unit: title is required")
	}
	const unitPath = typeof unit.metadata?.path === "string" ? unit.metadata.path : ""

	// Validate required lesson fields
	if (!currentLesson.title) {
		logger.error("CRITICAL: Current lesson missing title", { lessonId: currentLesson.sourcedId })
		throw errors.new("current lesson: title is required")
	}
	const currentLessonPath = typeof currentLesson.metadata?.path === "string" ? currentLesson.metadata.path : ""

	const currentLessonChildrenMap = finalLessonContentMap.get(currentLesson.sourcedId)

	// Current lesson may have no content - this is a valid state
	let currentLessonChildren: LessonChild[]
	if (currentLessonChildrenMap === undefined) {
		currentLessonChildren = []
		logger.debug("current lesson has no content", { lessonId: currentLesson.sourcedId })
	} else {
		currentLessonChildren = currentLessonChildrenMap
	}

	return {
		subject: params.subject,
		courseData: { title: course.title, path: coursePath },
		unitData: {
			id: unit.sourcedId,
			title: unit.title,
			path: unitPath,
			sortOrder: unit.sortOrder,
			children: unitLessonsWithContent
		},
		lessonData: {
			id: currentLesson.sourcedId,
			title: currentLesson.title,
			path: currentLessonPath,
			children: currentLessonChildren
		}
	}
}

// Export types for other pages
export type Course = { title: string; path: string }
export type Unit = {
	id: string
	title: string
	path: string
	sortOrder: number
	children: LessonInfo[]
}
export type Lesson = { id: string; title: string; path: string; children: LessonChild[] }
export type LessonData = Awaited<ReturnType<typeof fetchLessonData>>
