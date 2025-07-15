import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import {
	getAllComponentResources,
	getAllCoursesBySlug,
	getAllResources,
	getCourseComponentByCourseAndSlug,
	getCourseComponentsByCourseId,
	getCourseComponentsByParentId
} from "@/lib/data/fetchers/oneroster"
import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type { CourseChallenge, Quiz, UnitTest } from "@/lib/types/assessment"
import type { Article, Exercise, Video } from "@/lib/types/content"
import type { UnitPageData } from "@/lib/types/page"
import type { Course, Lesson, Unit, UnitChild } from "@/lib/types/structure"

export async function fetchUnitPageData(params: {
	subject: string
	course: string
	unit: string
}): Promise<UnitPageData> {
	logger.debug("unit page: fetching unit data", { params })

	// First, find the course by its khanSlug
	const coursesResult = await errors.try(getAllCoursesBySlug(params.course))
	if (coursesResult.error) {
		logger.error("failed to fetch courses", { error: coursesResult.error, filter: params.course })
		throw errors.wrap(coursesResult.error, "fetch courses")
	}
	const courses = coursesResult.data
	const oneRosterCourse = courses[0]

	if (!oneRosterCourse) {
		logger.error("unit page: course not found by slug", { slug: params.course })
		notFound()
	}

	const courseSourcedId = oneRosterCourse.sourcedId

	// Fetch the specific unit by slug and course relationship
	const unitResult = await errors.try(getCourseComponentByCourseAndSlug(oneRosterCourse.sourcedId, params.unit))
	if (unitResult.error) {
		logger.error("failed to fetch unit", { error: unitResult.error, courseSourcedId, unitSlug: params.unit })
		throw errors.wrap(unitResult.error, "fetch unit")
	}
	const oneRosterUnit = unitResult.data[0]

	if (!oneRosterUnit) {
		logger.error("unit page: unit not found by slug", { unitSlug: params.unit, courseId: courseSourcedId })
		notFound()
	}

	const unitSourcedId = oneRosterUnit.sourcedId

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

	const courseForPage: Pick<Course, "id" | "title" | "path" | "description"> = {
		id: oneRosterCourse.sourcedId,
		title: oneRosterCourse.title,
		path: courseMetadata.path,
		description: courseMetadata.khanDescription
	}

	// Validate unit metadata with Zod
	const unitMetadataResult = ComponentMetadataSchema.safeParse(oneRosterUnit.metadata)
	if (!unitMetadataResult.success) {
		logger.error("failed to parse unit metadata", {
			unitId: oneRosterUnit.sourcedId,
			error: unitMetadataResult.error
		})
		throw errors.wrap(unitMetadataResult.error, "invalid unit metadata")
	}
	const unitMetadata = unitMetadataResult.data

	// Get all units for navigation - fetch ALL course components
	const allCourseComponentsForNavigationResult = await errors.try(getCourseComponentsByCourseId(courseSourcedId))
	if (allCourseComponentsForNavigationResult.error) {
		logger.error("failed to fetch all course components for navigation", {
			error: allCourseComponentsForNavigationResult.error,
			courseSourcedId
		})
		throw errors.wrap(allCourseComponentsForNavigationResult.error, "fetch all course components for navigation")
	}
	const allCourseComponentsForNavigation = allCourseComponentsForNavigationResult.data

	// Build all units array
	const allUnits: Unit[] = []
	for (const component of allCourseComponentsForNavigation) {
		if (component.parent) continue // Skip non-units (lessons)

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

		allUnits.push({
			id: component.sourcedId,
			title: component.title,
			path: componentMetadata.path,
			ordering: component.sortOrder,
			slug: componentMetadata.khanSlug,
			description: componentMetadata.khanDescription,
			children: [] // Initialize empty children
		})
	}
	allUnits.sort((a, b) => a.ordering - b.ordering)

	// Fetch children of this unit (lessons and assessments)
	const lessonsResult = await errors.try(getCourseComponentsByParentId(unitSourcedId))
	if (lessonsResult.error) {
		logger.error("failed to fetch unit children", { error: lessonsResult.error, unitSourcedId })
		throw errors.wrap(lessonsResult.error, "fetch unit children")
	}
	const unitChildren = lessonsResult.data

	// Fetch all resources in the system
	const allResourcesInSystemResult = await errors.try(getAllResources())
	if (allResourcesInSystemResult.error) {
		logger.error("failed to fetch all resources", { error: allResourcesInSystemResult.error })
		throw errors.wrap(allResourcesInSystemResult.error, "fetch all resources")
	}
	const allResourcesInSystem = allResourcesInSystemResult.data

	// Fetch all component-resource associations
	const allComponentResourcesResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch all component resources", { error: allComponentResourcesResult.error })
		throw errors.wrap(allComponentResourcesResult.error, "fetch all component resources")
	}
	const allComponentResources = allComponentResourcesResult.data

	// Get resources for this unit specifically (assessments)
	const unitComponentResources = allComponentResources.filter((cr) => cr.courseComponent.sourcedId === unitSourcedId)

	// Get resources for unit's children (lessons)
	const childIds = new Set(unitChildren.map((c) => c.sourcedId))
	const childComponentResources = allComponentResources.filter((cr) => childIds.has(cr.courseComponent.sourcedId))

	// Get unique resource IDs from ALL component resources for the course (not just this unit)
	// This is needed because resources might be shared across units
	const allCourseComponentsResult = await errors.try(getCourseComponentsByCourseId(courseSourcedId))
	if (allCourseComponentsResult.error) {
		logger.error("failed to fetch all course components", { error: allCourseComponentsResult.error, courseSourcedId })
		throw errors.wrap(allCourseComponentsResult.error, "fetch all course components")
	}
	const allCourseComponents = allCourseComponentsResult.data
	const courseComponentIdSet = new Set(allCourseComponents.map((c) => c.sourcedId))
	const courseComponentResources = allComponentResources.filter((cr) =>
		courseComponentIdSet.has(cr.courseComponent.sourcedId)
	)

	const resourceIdsInCourse = new Set(courseComponentResources.map((cr) => cr.resource.sourcedId))

	// Filter resources to only those referenced by this course's component resources
	const allResources = allResourcesInSystem.filter((resource) => resourceIdsInCourse.has(resource.sourcedId))

	logger.info("unit page: filtered resources", {
		totalResourcesInSystem: allResourcesInSystem.length,
		totalComponentResources: allComponentResources.length,
		unitComponentResources: unitComponentResources.length,
		childComponentResources: childComponentResources.length,
		relevantResources: allResources.length,
		unitSourcedId
	})

	// First, get assessments that are linked directly to the unit
	const unitAssessments: (Quiz | UnitTest)[] = []
	for (const cr of unitComponentResources) {
		const resource = allResources.find((r) => r.sourcedId === cr.resource.sourcedId)
		if (resource) {
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

				if (assessmentType === "Quiz") {
					unitAssessments.push({
						id: resource.sourcedId,
						title: resource.title,
						path: resourceMetadata.path,
						type: "Quiz",
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.khanDescription,
						questions: []
					})
				} else {
					unitAssessments.push({
						id: resource.sourcedId,
						title: resource.title,
						path: resourceMetadata.path,
						type: "UnitTest",
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.khanDescription,
						questions: []
					})
				}
			}
		}
	}

	// Group resources by component ID for lessons
	const resourcesByComponentId = new Map<string, typeof allResources>()
	for (const cr of childComponentResources) {
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

	// Process unit children (lessons only now, since assessments are handled separately)
	const processedLessons: Lesson[] = []

	for (const child of unitChildren) {
		// Validate child component metadata with Zod
		const childMetadataResult = ComponentMetadataSchema.safeParse(child.metadata)
		if (!childMetadataResult.success) {
			logger.error("failed to parse child component metadata", {
				componentId: child.sourcedId,
				error: childMetadataResult.error
			})
			throw errors.wrap(childMetadataResult.error, "invalid child component metadata")
		}
		const childMetadata = childMetadataResult.data
		const childSlug = childMetadata.khanSlug

		let lessonResources = resourcesByComponentId.get(child.sourcedId)
		if (!lessonResources) {
			lessonResources = []
			resourcesByComponentId.set(child.sourcedId, lessonResources)
		}

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
			const componentResource = childComponentResources.find(
				(cr) => cr.courseComponent.sourcedId === child.sourcedId && cr.resource.sourcedId === resource.sourcedId
			)
			if (!componentResource) {
				logger.error("component resource not found", { lessonId: child.sourcedId, resourceId: resource.sourcedId })
				throw errors.new(`component resource not found for lesson ${child.sourcedId} resource ${resource.sourcedId}`)
			}

			if (resourceMetadata.type === "video") {
				const youtubeUrl = resourceMetadata.url
				if (!youtubeUrl) {
					logger.error("video missing required url", { videoId: resource.sourcedId })
					throw errors.new(`video ${resource.sourcedId} missing required url`)
				}

				const youtubeMatch = youtubeUrl.match(/[?&]v=([^&]+)/)
				if (!youtubeMatch || !youtubeMatch[1]) {
					logger.error("video has invalid youtube url", { videoId: resource.sourcedId, url: youtubeUrl })
					throw errors.new(`video ${resource.sourcedId} has invalid youtube url`)
				}
				const youtubeId = youtubeMatch[1]

				videos.push({
					id: resource.sourcedId,
					title: resource.title,
					path: resourceMetadata.path,
					slug: resourceMetadata.khanSlug,
					description: resourceMetadata.khanDescription,
					youtubeId: youtubeId,
					duration: resourceMetadata.duration,
					type: "Video"
				})
			} else if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-stimulus") {
				// This is an article
				articles.push({
					id: resource.sourcedId,
					title: resource.title,
					path: resourceMetadata.path,
					slug: resourceMetadata.khanSlug,
					description: resourceMetadata.khanDescription,
					qtiIdentifier: `nice:${resourceMetadata.khanId}`,
					type: "Article"
				})
			} else if (
				resourceMetadata.type === "qti" &&
				resourceMetadata.subType === "qti-test" &&
				!resourceMetadata.khanLessonType
			) {
				// This is an exercise
				exercises.push({
					id: resource.sourcedId,
					title: resource.title,
					path: resourceMetadata.path,
					slug: resourceMetadata.khanSlug,
					description: resourceMetadata.khanDescription,
					questions: [], // Will be fetched from QTI server
					type: "Exercise"
				})
			}
		}

		// No sorting needed here, canonical types don't have ordering

		processedLessons.push({
			id: child.sourcedId,
			title: child.title,
			path: childMetadata.path,
			type: "Lesson",
			slug: childSlug,
			description: childMetadata.khanDescription,
			children: [...videos, ...articles, ...exercises]
		})
	}

	// Create a unified list of all unit children with their sort orders
	interface UnitChildWithOrder {
		child: UnitChild
		sortOrder: number
		source: "component" | "resource"
	}
	const childrenWithOrders: UnitChildWithOrder[] = []

	// Add lessons with their sort orders from components
	for (const lesson of processedLessons) {
		const component = unitChildren.find((c) => c.sourcedId === lesson.id)
		if (!component) {
			logger.error("lesson component not found", { lessonId: lesson.id })
			throw errors.new("lesson component missing")
		}
		if (typeof component.sortOrder !== "number") {
			logger.error("lesson component missing sortOrder", {
				lessonId: lesson.id,
				sortOrder: component.sortOrder
			})
			throw errors.new("lesson component missing required sortOrder")
		}
		childrenWithOrders.push({
			child: lesson,
			sortOrder: component.sortOrder,
			source: "component"
		})
	}

	// Add assessments with their sort orders from component resources
	for (const assessment of unitAssessments) {
		// Find the componentResource entry for this assessment
		const componentResource = unitComponentResources.find((cr) => cr.resource.sourcedId === assessment.id)
		if (!componentResource) {
			logger.error("assessment component resource not found", {
				assessmentId: assessment.id,
				unitId: unitSourcedId
			})
			throw errors.new("assessment component resource missing")
		}
		if (typeof componentResource.sortOrder !== "number") {
			logger.error("assessment component resource missing sortOrder", {
				assessmentId: assessment.id,
				sortOrder: componentResource.sortOrder
			})
			throw errors.new("assessment component resource missing required sortOrder")
		}
		childrenWithOrders.push({
			child: assessment,
			sortOrder: componentResource.sortOrder,
			source: "resource"
		})
	}

	// Sort all children by their sort order
	childrenWithOrders.sort((a, b) => a.sortOrder - b.sortOrder)

	// Extract just the children in sorted order
	const processedUnitChildren: UnitChild[] = childrenWithOrders.map((item) => item.child)

	const finalUnit: Unit = {
		id: oneRosterUnit.sourcedId,
		title: oneRosterUnit.title,
		slug: unitMetadata.khanSlug,
		description: unitMetadata.khanDescription,
		path: unitMetadata.path,
		ordering: oneRosterUnit.sortOrder,
		children: processedUnitChildren // Assign children here
	}

	// Count total lessons across all units
	const allComponentsForLessonCountResult = await errors.try(getCourseComponentsByCourseId(courseSourcedId))
	if (allComponentsForLessonCountResult.error) {
		logger.error("failed to fetch all components for lesson count", {
			error: allComponentsForLessonCountResult.error,
			courseSourcedId
		})
		throw errors.wrap(allComponentsForLessonCountResult.error, "fetch all components for lesson count")
	}
	const allComponentsForLessonCount = allComponentsForLessonCountResult.data
	const allLessons = allComponentsForLessonCount.filter((c) => c.parent !== null)

	// To count lessons, we need to check which components are NOT assessments
	// We already have all component resources, so filter for course components
	const allCourseComponentIds = new Set(allLessons.map((c) => c.sourcedId))
	const allCourseComponentResources = allComponentResources.filter((cr) =>
		allCourseComponentIds.has(cr.courseComponent.sourcedId)
	)

	const allAssessmentComponentIds = new Set<string>()

	for (const cr of allCourseComponentResources) {
		const resource = allResources.find((r) => r.sourcedId === cr.resource.sourcedId)
		if (resource) {
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
				allAssessmentComponentIds.add(cr.courseComponent.sourcedId)
			}
		}
	}

	// Count components that are not assessments
	const lessonCount = allLessons.filter((c) => !allAssessmentComponentIds.has(c.sourcedId)).length

	// Get course challenges - for now return empty array
	const challenges: CourseChallenge[] = []

	return {
		params,
		course: courseForPage,
		allUnits,
		lessonCount,
		challenges,
		unit: finalUnit // Assign the composite unit object
	}
}
