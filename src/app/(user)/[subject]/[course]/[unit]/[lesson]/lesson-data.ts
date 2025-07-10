import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { oneroster } from "@/lib/clients"
import type { LessonChild, LessonInfo } from "@/lib/khan-academy-api"
import type { OneRosterResource } from "@/lib/oneroster"

// Helper function to extract slug from sourcedId
function extractSlug(sourcedId: string): string {
	const parts = sourcedId.split(":")
	if (parts.length < 2 || !parts[1]) {
		logger.error("CRITICAL: Invalid sourcedId format", { sourcedId })
		throw errors.new("sourcedId: invalid format")
	}
	return parts[1]
}

// Shared data fetching function
export async function fetchLessonData(params: { subject: string; course: string; unit: string; lesson: string }) {
	const courseSourcedId = `nice:${params.course}`
	const unitSourcedId = `nice:${params.unit}`
	const lessonSourcedId = `nice:${params.lesson}`

	// 1. Fetch course, unit, and lesson components in parallel
	const [courseResult, unitResult, lessonResult] = await Promise.all([
		errors.try(oneroster.getCourse(courseSourcedId)),
		errors.try(oneroster.getCourseComponent(unitSourcedId)),
		errors.try(oneroster.getCourseComponent(lessonSourcedId))
	])

	if (courseResult.error || unitResult.error || lessonResult.error) {
		throw errors.new("Failed to fetch core components from OneRoster.")
	}
	if (!courseResult.data || !unitResult.data || !lessonResult.data) {
		notFound()
	}

	const course = courseResult.data
	const unit = unitResult.data
	const currentLesson = lessonResult.data

	// 2. Fetch all lessons for the current unit to build the sidebar
	const unitLessonsResult = await errors.try(oneroster.getCourseComponents(`parent.sourcedId='${unit.sourcedId}'`))
	if (unitLessonsResult.error) {
		throw errors.wrap(unitLessonsResult.error, "failed to fetch unit lessons")
	}

	// 3. Fetch ALL component resources and filter in memory (since specific filters are not supported)
	const allComponentResourcesResult = await errors.try(oneroster.getAllComponentResources("sourcedId~'nice:'"))
	if (allComponentResourcesResult.error) {
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
	let allResourcesData: OneRosterResource[] = []
	if (resourceIds.length === 0) {
		allResourcesData = []
	} else if (resourceIds.length <= 10) {
		// For small numbers, fetch individually to avoid filter syntax issues
		const resourcePromises = resourceIds.map(async (resourceId) => {
			const result = await errors.try(oneroster.getResource(resourceId))
			if (result.error) {
				logger.warn("failed to fetch resource", { resourceId, error: result.error })
				return null
			}
			return result.data
		})
		const resourceResults = await Promise.all(resourcePromises)
		allResourcesData = resourceResults.filter((r): r is OneRosterResource => r !== null)
	} else {
		// For larger numbers, try a simple filter approach
		const allResourcesResult = await errors.try(oneroster.getAllResources(`sourcedId~'nice:'`))
		if (allResourcesResult.error) {
			throw errors.wrap(allResourcesResult.error, "failed to fetch resources")
		}
		// Filter client-side to only get the resources we need
		allResourcesData = allResourcesResult.data.filter((r) => resourceIds.includes(r.sourcedId))
	}

	const resourcesMap = new Map(allResourcesData.map((r) => [r.sourcedId, r]))

	// 5. Build a map of lesson content with temporary sortOrder for sorting
	const lessonContentMap = new Map<string, Array<LessonChild & { sortOrder: number }>>()
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
				const resourceSlug = extractSlug(resource.sourcedId)
				const lessonSlug = extractSlug(cr.courseComponent.sourcedId)
				const unitSlug = extractSlug(unit.sourcedId)

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

			return {
				type: "Lesson" as const,
				id: lesson.sourcedId,
				slug: extractSlug(lesson.sourcedId),
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
