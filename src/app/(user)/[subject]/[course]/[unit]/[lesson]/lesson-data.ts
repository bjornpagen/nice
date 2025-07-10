import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { oneroster } from "@/lib/clients"
import type { LessonChild, LessonInfo } from "@/lib/khan-academy-api"
import type { OneRosterResource } from "@/lib/oneroster"

// Helper function to extract slug from sourcedId
function extractSlug(sourcedId: string): string {
	return sourcedId.split(":")[1] || sourcedId
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

				const child: LessonChild & { sortOrder: number } = {
					id: resource.sourcedId,
					slug: resourceSlug,
					title: resource.title,
					description: typeof resource.metadata?.description === "string" ? resource.metadata.description : "",
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
		.map((lesson) => ({
			type: "Lesson" as const,
			id: lesson.sourcedId,
			slug: extractSlug(lesson.sourcedId),
			title: lesson.title,
			description: typeof lesson.metadata?.description === "string" ? lesson.metadata.description : "",
			path: typeof lesson.metadata?.path === "string" ? lesson.metadata.path : "",
			children: finalLessonContentMap.get(lesson.sourcedId) || []
		}))
		.sort((a, b) => {
			// Sort by OneRoster sortOrder
			const aSort = unitLessonsResult.data.find((l) => l.sourcedId === a.id)?.sortOrder ?? 0
			const bSort = unitLessonsResult.data.find((l) => l.sourcedId === b.id)?.sortOrder ?? 0
			return aSort - bSort
		})

	return {
		subject: params.subject,
		courseData: { title: course.title, path: typeof course.metadata?.path === "string" ? course.metadata.path : "" },
		unitData: {
			id: unit.sourcedId,
			title: unit.title,
			path: typeof unit.metadata?.path === "string" ? unit.metadata.path : "",
			sortOrder: unit.sortOrder,
			children: unitLessonsWithContent
		},
		lessonData: {
			id: currentLesson.sourcedId,
			title: currentLesson.title,
			path: typeof currentLesson.metadata?.path === "string" ? currentLesson.metadata.path : "",
			children: finalLessonContentMap.get(currentLesson.sourcedId) || []
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
