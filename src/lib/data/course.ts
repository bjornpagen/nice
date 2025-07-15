import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import {
	getAllComponentResources,
	getAllCoursesBySlug,
	getAllResources,
	getCourseComponentsByCourseId
} from "@/lib/data/fetchers/oneroster"
import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type { CourseChallenge, Quiz, UnitTest } from "@/lib/types/assessment"
import type { Article, Exercise, Video } from "@/lib/types/content"
import type { CoursePageData } from "@/lib/types/page"
import type { Course, Lesson, Unit, UnitChild } from "@/lib/types/structure"

export async function fetchCoursePageData(params: { subject: string; course: string }): Promise<CoursePageData> {
	// First, find the course by its khanSlug since the URL param is a slug, not a Khan ID
	logger.debug("course page: looking up course by slug", { slug: params.course })

	// Fetch courses filtered by khanSlug for efficiency
	const allCoursesResult = await errors.try(getAllCoursesBySlug(params.course))
	if (allCoursesResult.error) {
		logger.error("failed to fetch courses", { error: allCoursesResult.error, filter: params.course })
		throw errors.wrap(allCoursesResult.error, "fetch courses")
	}
	const allCourses = allCoursesResult.data
	logger.debug("allCourses", { allCourses })
	const oneRosterCourse = allCourses[0] // Should only be one match

	if (!oneRosterCourse) {
		logger.error("course page: course not found by slug", { slug: params.course })
		notFound()
	}

	const courseSourcedId = oneRosterCourse.sourcedId
	logger.debug("course page: found course", { courseSourcedId, slug: params.course })

	// Validate course metadata with Zod
	const courseMetadataResult = CourseMetadataSchema.safeParse(oneRosterCourse.metadata)
	if (!courseMetadataResult.success) {
		logger.error("failed to parse course metadata", {
			courseId: oneRosterCourse.sourcedId,
			error: courseMetadataResult.error
		})
		throw errors.wrap(courseMetadataResult.error, "invalid course metadata")
	}
	const courseMetadata = courseMetadataResult.data

	const courseForPage: Pick<Course, "id" | "title" | "description" | "path" | "slug"> = {
		id: oneRosterCourse.sourcedId,
		slug: courseMetadata.khanSlug, // Add slug
		title: oneRosterCourse.title,
		description: courseMetadata.khanDescription,
		path: courseMetadata.path
	}

	// Fetch all Components that are direct children of this Course (these are Units)
	const allComponentsResult = await errors.try(getCourseComponentsByCourseId(courseSourcedId))
	if (allComponentsResult.error) {
		logger.error("failed to fetch course components", { error: allComponentsResult.error, courseSourcedId })
		throw errors.wrap(allComponentsResult.error, "fetch course components")
	}
	const allComponents = allComponentsResult.data
	logger.debug("allComponents", { allComponents })

	// Separate units (no parent) and lessons (have parent)
	const units: Unit[] = [] // Change to full Unit type
	const lessonsByUnitId = new Map<string, Lesson[]>() // Change to full Lesson type

	for (const component of allComponents) {
		// Validate component metadata with Zod
		const componentMetadataResult = ComponentMetadataSchema.safeParse(component.metadata)
		if (!componentMetadataResult.success) {
			logger.error("failed to parse component metadata", {
				componentId: component.sourcedId,
				error: componentMetadataResult.error
			})
			throw errors.wrap(componentMetadataResult.error, "invalid component metadata")
		}
		const componentMetadata = componentMetadataResult.data

		if (!component.parent) {
			// This is a unit
			units.push({
				id: component.sourcedId,
				slug: componentMetadata.khanSlug,
				title: component.title,
				description: componentMetadata.khanDescription,
				path: componentMetadata.path,
				ordering: component.sortOrder,
				children: [] // Initialize children array
			})
		} else {
			// This is a lesson or assessment - we'll determine type later when we process resources
			const parentId = component.parent.sourcedId
			if (!lessonsByUnitId.has(parentId)) {
				lessonsByUnitId.set(parentId, [])
			}

			// For path generation, we need the parent's slug too
			const parentComponent = allComponents.find((c) => c.sourcedId === parentId)
			if (!parentComponent) {
				logger.error("parent component not found", { parentId, childId: component.sourcedId })
				throw errors.new(`parent component ${parentId} not found for child ${component.sourcedId}`)
			}

			const parentMetadataResult = ComponentMetadataSchema.safeParse(parentComponent.metadata)
			if (!parentMetadataResult.success) {
				logger.error("failed to parse parent component metadata", {
					parentId,
					childId: component.sourcedId,
					error: parentMetadataResult.error
				})
				throw errors.wrap(parentMetadataResult.error, "invalid parent component metadata")
			}

			lessonsByUnitId.get(parentId)?.push({
				type: "Lesson", // Add missing type property
				id: component.sourcedId,
				slug: componentMetadata.khanSlug,
				title: component.title,
				description: componentMetadata.khanDescription,
				path: componentMetadata.path,
				children: [] // Initialize children
			})
		}
	}

	// Sort units by ordering
	units.sort((a, b) => a.ordering - b.ordering)

	// Fetch all Resources in the entire system
	const allResourcesInSystemResult = await errors.try(getAllResources())
	if (allResourcesInSystemResult.error) {
		logger.error("failed to fetch all resources", { error: allResourcesInSystemResult.error })
		throw errors.wrap(allResourcesInSystemResult.error, "fetch all resources")
	}
	const allResourcesInSystem = allResourcesInSystemResult.data

	// Fetch all ComponentResource associations
	const allComponentResourcesResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch all component resources", { error: allComponentResourcesResult.error })
		throw errors.wrap(allComponentResourcesResult.error, "fetch all component resources")
	}
	const allComponentResources = allComponentResourcesResult.data
	const courseComponentIds = new Set(allComponents.map((c) => c.sourcedId))

	const componentResources = allComponentResources.filter((cr) => courseComponentIds.has(cr.courseComponent.sourcedId))

	// Get unique resource IDs from component resources relevant to this course
	const resourceIdsInCourse = new Set(componentResources.map((cr) => cr.resource.sourcedId))

	// Filter resources to only those referenced by this course's component resources
	const allResources = allResourcesInSystem.filter((resource) => resourceIdsInCourse.has(resource.sourcedId))

	logger.info("filtered resources for course", {
		totalResourcesInSystem: allResourcesInSystem.length,
		totalComponentResources: allComponentResources.length,
		relevantComponentResources: componentResources.length,
		relevantResources: allResources.length,
		courseSourcedId
	})

	// Group resources by component (lesson) ID
	const resourcesByComponentId = new Map<string, typeof allResources>()

	for (const cr of componentResources) {
		const componentId = cr.courseComponent.sourcedId
		const resourceId = cr.resource.sourcedId
		const resource = allResources.find((r) => r.sourcedId === resourceId)

		if (resource) {
			if (!resourcesByComponentId.has(componentId)) {
				resourcesByComponentId.set(componentId, [])
			}
			resourcesByComponentId.get(componentId)?.push(resource)
		}
	}

	// Build units with children
	const unitsWithChildren: Unit[] = units.map((unit) => {
		const unitLessons = lessonsByUnitId.get(unit.id) || []
		const unitResources = resourcesByComponentId.get(unit.id) || []

		const unitAssessments: (Quiz | UnitTest)[] = []

		// Find assessments from unit resources
		for (const resource of unitResources) {
			// Validate resource metadata with Zod
			const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
			if (!resourceMetadataResult.success) {
				logger.error("invalid resource metadata", {
					resourceId: resource.sourcedId,
					error: resourceMetadataResult.error
				})
				throw errors.new("invalid resource metadata")
			}
			const resourceMetadata = resourceMetadataResult.data

			if (
				resourceMetadata.type === "qti" &&
				resourceMetadata.subType === "qti-test" &&
				resourceMetadata.khanLessonType
			) {
				const assessmentType = resourceMetadata.khanLessonType === "unittest" ? "UnitTest" : "Quiz"

				// Find the component resource to get sortOrder
				const componentResource = componentResources.find(
					(cr) => cr.courseComponent.sourcedId === unit.id && cr.resource.sourcedId === resource.sourcedId
				)

				if (!componentResource) {
					logger.error("component resource not found for assessment", {
						resourceId: resource.sourcedId,
						unitId: unit.id
					})
					throw errors.new(`component resource not found for assessment ${resource.sourcedId}`)
				}

				const assessment: Quiz | UnitTest = {
					id: resource.sourcedId,
					type: assessmentType,
					slug: resourceMetadata.khanSlug,
					title: resource.title,
					description: resourceMetadata.khanDescription,
					path: resourceMetadata.path,
					questions: [] // Questions are not needed on the course page
				}
				unitAssessments.push(assessment)
			}
		}

		// Process lessons with their content
		const lessonsWithContent: Lesson[] = unitLessons.map((lesson) => {
			const lessonResources = resourcesByComponentId.get(lesson.id) || []

			const videos: Video[] = []
			const articles: Article[] = []
			const exercises: Exercise[] = []

			// Categorize resources by type
			for (const resource of lessonResources) {
				// Validate resource metadata with Zod
				const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
				if (!resourceMetadataResult.success) {
					logger.error("invalid resource metadata", {
						resourceId: resource.sourcedId,
						error: resourceMetadataResult.error
					})
					throw errors.new("invalid resource metadata")
				}
				const resourceMetadata = resourceMetadataResult.data

				// Find the componentResource to get the sortOrder
				const componentResource = componentResources.find(
					(cr) => cr.courseComponent.sourcedId === lesson.id && cr.resource.sourcedId === resource.sourcedId
				)
				if (!componentResource) {
					logger.error("component resource not found", { lessonId: lesson.id, resourceId: resource.sourcedId })
					throw errors.new(`component resource not found for lesson ${lesson.id} resource ${resource.sourcedId}`)
				}

				if (resourceMetadata.type === "video") {
					const youtubeUrl = resourceMetadata.url
					if (!youtubeUrl) {
						logger.error("video missing YouTube URL", { videoId: resource.sourcedId })
						throw errors.new("video missing YouTube URL")
					}

					const youtubeMatch = youtubeUrl.match(/[?&]v=([^&]+)/)
					if (!youtubeMatch || !youtubeMatch[1]) {
						logger.error("video has invalid youtube url", { videoId: resource.sourcedId, url: youtubeUrl })
						throw errors.new(`video ${resource.sourcedId} has invalid youtube url`)
					}
					const youtubeId = youtubeMatch[1]

					// Validate required video fields
					if (typeof resourceMetadata.duration !== "number") {
						logger.error("CRITICAL: video missing duration", {
							resourceId: resource.sourcedId,
							khanId: resourceMetadata.khanId
						})
						throw errors.new("video resource missing required duration field")
					}

					videos.push({
						id: resource.sourcedId,
						title: resource.title,
						path: resourceMetadata.path,
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.khanDescription,
						youtubeId: youtubeId,
						duration: resourceMetadata.duration,
						type: "Video" as const
					})
				} else if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-stimulus") {
					// This is an article
					articles.push({
						type: "Article",
						id: resource.sourcedId,
						title: resource.title,
						path: resourceMetadata.path,
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.khanDescription,
						qtiIdentifier: `nice:${resourceMetadata.khanId}` // Add qtiIdentifier
					})
				} else if (
					resourceMetadata.type === "qti" &&
					resourceMetadata.subType === "qti-test" &&
					!resourceMetadata.khanLessonType
				) {
					// This is an exercise
					exercises.push({
						type: "Exercise",
						id: resource.sourcedId,
						title: resource.title,
						path: resourceMetadata.path,
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.khanDescription,
						questions: [] // Questions are not needed on course page
					})
				}
			}

			// No need to sort here, done later

			return {
				...lesson,
				children: [...videos, ...articles, ...exercises]
			}
		})

		const children: UnitChild[] = [...lessonsWithContent, ...unitAssessments]

		return {
			...unit,
			children
		}
	})

	// Count total lessons
	let lessonCount = 0
	for (const unit of unitsWithChildren) {
		lessonCount += unit.children.filter((child) => child.type === "Lesson").length
	}

	// Get course challenges
	const challenges: CourseChallenge[] = [] // Fetch if necessary

	// Construct the final Course object
	const finalCourse: Course = {
		...courseForPage,
		units: unitsWithChildren,
		challenges
	}

	return {
		params,
		course: finalCourse,
		lessonCount
	}
}
