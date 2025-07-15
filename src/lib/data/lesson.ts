import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type { LessonLayoutData } from "@/lib/types/page"
import type { Lesson, LessonChild, Unit } from "@/lib/types/structure"
import { oneroster } from "../clients"
import type { Resource } from "../oneroster"

export async function fetchLessonLayoutData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
}): Promise<LessonLayoutData> {
	// Waterfall lookup
	const courseResult = await errors.try(oneroster.getAllCourses({ filter: `metadata.khanSlug='${params.course}'` }))
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
			filter: `course.sourcedId='${course.sourcedId}' AND metadata.khanSlug='${params.unit}'`
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
			filter: `parent.sourcedId='${unit.sourcedId}' AND metadata.khanSlug='${params.lesson}'`
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
			filter: `parent.sourcedId='${unit.sourcedId}'`
		})
	)
	if (unitLessonsResult.error) {
		logger.error("failed to fetch unit lessons", { error: unitLessonsResult.error, unitSourcedId: unit.sourcedId })
		throw errors.wrap(unitLessonsResult.error, "failed to fetch unit lessons")
	}

	// 3. Fetch ALL component resources and filter in memory (since specific filters are not supported)
	const allComponentResourcesResult = await errors.try(oneroster.getAllComponentResources({}))
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
		const allResourcesResult = await errors.try(oneroster.getAllResources({}))
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
		// Validate lesson metadata
		const lessonMetadataResult = ComponentMetadataSchema.safeParse(lesson.metadata)
		if (!lessonMetadataResult.success) {
			logger.error("fatal: invalid lesson metadata", {
				lessonId: lesson.sourcedId,
				error: lessonMetadataResult.error
			})
			throw errors.wrap(lessonMetadataResult.error, "invalid lesson metadata")
		}
		lessonSlugMap.set(lesson.sourcedId, lessonMetadataResult.data.khanSlug)
	}

	for (const cr of allComponentResources) {
		const resource = resourcesMap.get(cr.resource.sourcedId)
		if (resource) {
			// Validate resource metadata
			const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
			if (!resourceMetadataResult.success) {
				logger.error("fatal: invalid resource metadata", {
					resourceId: resource.sourcedId,
					error: resourceMetadataResult.error
				})
				throw errors.wrap(resourceMetadataResult.error, "invalid resource metadata")
			}
			const resourceMetadata = resourceMetadataResult.data

			// Determine content type from metadata
			let contentType: "Video" | "Article" | "Exercise" | undefined
			if (resourceMetadata.type === "video") {
				contentType = "Video"
			} else if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-stimulus") {
				contentType = "Article"
			} else if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-test") {
				contentType = "Exercise"
			}

			if (contentType) {
				// Use slugs from metadata/params, not from sourcedId
				const resourceSlug = resourceMetadata.khanSlug
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

				const description = resourceMetadata.description

				let child: LessonChild & { sortOrder: number }

				if (contentType === "Video" && resourceMetadata.type === "video") {
					const youtubeUrl = resourceMetadata.url
					const youtubeMatch = youtubeUrl.match(/[?&]v=([^&]+)/)
					const youtubeId = youtubeMatch?.[1] ?? ""

					// Validate required video fields
					if (typeof resourceMetadata.duration !== "number") {
						logger.error("CRITICAL: video missing duration", {
							resourceId: resource.sourcedId,
							khanId: resourceMetadata.khanId
						})
						throw errors.new("video resource missing required duration field")
					}

					child = {
						id: resource.sourcedId,
						slug: resourceSlug,
						title: resource.title,
						description: description,
						path: contentPath,
						type: "Video",
						youtubeId: youtubeId,
						duration: resourceMetadata.duration,
						sortOrder: cr.sortOrder
					}
				} else if (contentType === "Article" && resourceMetadata.type === "qti") {
					const khanId = resourceMetadata.khanId
					child = {
						id: resource.sourcedId,
						slug: resourceSlug,
						title: resource.title,
						description: description,
						path: contentPath,
						type: "Article",
						qtiIdentifier: `nice:${khanId}`,
						sortOrder: cr.sortOrder
					}
				} else if (contentType === "Exercise" && resourceMetadata.type === "qti") {
					child = {
						id: resource.sourcedId,
						slug: resourceSlug,
						title: resource.title,
						description: description,
						path: contentPath,
						type: "Exercise",
						questions: [], // Empty array, will be fetched if needed
						sortOrder: cr.sortOrder
					}
				} else {
					logger.error("CRITICAL: Unexpected content type combination", {
						resourceId: resource.sourcedId,
						contentType,
						metadataType: resourceMetadata.type
					})
					throw errors.new("resource: unexpected content type")
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
	const unitLessonsWithContent: Lesson[] = unitLessonsResult.data
		.map((lesson) => {
			// Validate lesson metadata
			const lessonMetadataResult = ComponentMetadataSchema.safeParse(lesson.metadata)
			if (!lessonMetadataResult.success) {
				logger.error("fatal: invalid lesson metadata in assembly", {
					lessonId: lesson.sourcedId,
					error: lessonMetadataResult.error
				})
				throw errors.wrap(lessonMetadataResult.error, "invalid lesson metadata")
			}
			const lessonMetadata = lessonMetadataResult.data

			// Validate required fields
			if (!lesson.title) {
				logger.error("CRITICAL: Lesson missing title", { lessonId: lesson.sourcedId })
				throw errors.new("lesson: title is required")
			}

			const description = lessonMetadata.description
			const path = lessonMetadata.path

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

			const lessonSlug = lessonMetadata.khanSlug

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

	// Validate course metadata
	const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
	if (!courseMetadataResult.success) {
		logger.error("fatal: invalid course metadata", {
			courseId: course.sourcedId,
			error: courseMetadataResult.error
		})
		throw errors.wrap(courseMetadataResult.error, "invalid course metadata")
	}
	const courseMetadata = courseMetadataResult.data

	// Validate required course fields
	if (!course.title) {
		logger.error("CRITICAL: Course missing title", { courseId: course.sourcedId })
		throw errors.new("course: title is required")
	}
	const coursePath = courseMetadata.path

	// Validate unit metadata
	const unitMetadataResult = ComponentMetadataSchema.safeParse(unit.metadata)
	if (!unitMetadataResult.success) {
		logger.error("fatal: invalid unit metadata", {
			unitId: unit.sourcedId,
			error: unitMetadataResult.error
		})
		throw errors.wrap(unitMetadataResult.error, "invalid unit metadata")
	}
	const unitMetadata = unitMetadataResult.data

	// Validate required unit fields
	if (!unit.title) {
		logger.error("CRITICAL: Unit missing title", { unitId: unit.sourcedId })
		throw errors.new("unit: title is required")
	}
	const unitPath = unitMetadata.path
	const unitSlug = unitMetadata.khanSlug
	const unitDescription = unitMetadata.description

	// Validate current lesson metadata
	const currentLessonMetadataResult = ComponentMetadataSchema.safeParse(currentLesson.metadata)
	if (!currentLessonMetadataResult.success) {
		logger.error("fatal: invalid current lesson metadata", {
			lessonId: currentLesson.sourcedId,
			error: currentLessonMetadataResult.error
		})
		throw errors.wrap(currentLessonMetadataResult.error, "invalid current lesson metadata")
	}
	const currentLessonMetadata = currentLessonMetadataResult.data

	// Validate required lesson fields
	if (!currentLesson.title) {
		logger.error("CRITICAL: Current lesson missing title", { lessonId: currentLesson.sourcedId })
		throw errors.new("current lesson: title is required")
	}
	const currentLessonPath = currentLessonMetadata.path
	const currentLessonSlug = currentLessonMetadata.khanSlug
	const currentLessonDescription = currentLessonMetadata.description

	const currentLessonChildrenMap = finalLessonContentMap.get(currentLesson.sourcedId)

	// Current lesson may have no content - this is a valid state
	let currentLessonChildren: LessonChild[]
	if (currentLessonChildrenMap === undefined) {
		currentLessonChildren = []
		logger.debug("current lesson has no content", { lessonId: currentLesson.sourcedId })
	} else {
		currentLessonChildren = currentLessonChildrenMap
	}

	const finalUnitData: Unit = {
		id: unit.sourcedId,
		slug: unitSlug,
		title: unit.title,
		description: unitDescription,
		path: unitPath,
		ordering: unit.sortOrder,
		children: unitLessonsWithContent
	}

	const finalLessonData: Lesson = {
		id: currentLesson.sourcedId,
		slug: currentLessonSlug,
		title: currentLesson.title,
		description: currentLessonDescription,
		path: currentLessonPath,
		type: "Lesson",
		children: currentLessonChildren
	}

	return {
		subject: params.subject,
		courseData: { title: course.title, path: coursePath },
		unitData: finalUnitData,
		lessonData: finalLessonData
	}
}
