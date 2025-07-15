import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import type { CourseChallenge, Quiz, UnitTest } from "@/lib/types/assessment"
import type { Article, Exercise, Video } from "@/lib/types/content"
import type { UnitPageData } from "@/lib/types/page"
import type { Course, Lesson, Unit, UnitChild } from "@/lib/types/structure"
import { oneroster } from "../clients"
import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "../oneroster-metadata"

export async function fetchUnitPageData(params: {
	subject: string
	course: string
	unit: string
}): Promise<UnitPageData> {
	logger.debug("unit page: fetching unit data", { params })

	// First, find the course by its khanSlug
	const courseFilter = `metadata.khanSlug='${params.course}'`
	const coursesResult = await errors.try(oneroster.getAllCourses({ filter: courseFilter }))
	if (coursesResult.error) {
		logger.error("failed to fetch courses", { error: coursesResult.error, filter: courseFilter })
		throw errors.wrap(coursesResult.error, "fetch courses")
	}
	const courses = coursesResult.data
	const oneRosterCourse = courses[0]

	if (!oneRosterCourse) {
		logger.error("unit page: course not found by slug", { slug: params.course })
		notFound()
	}

	const courseSourcedId = oneRosterCourse.sourcedId
	const decodedUnitSlug = decodeURIComponent(params.unit)

	// Fetch all components for this course to find the unit by its khanSlug
	const allComponentsResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `course.sourcedId='${courseSourcedId}'`
		})
	)
	if (allComponentsResult.error) {
		logger.error("failed to fetch course components", { error: allComponentsResult.error, courseSourcedId })
		throw errors.wrap(allComponentsResult.error, "fetch course components")
	}
	const allComponents = allComponentsResult.data
	let oneRosterUnit = null
	for (const c of allComponents) {
		if (c.parent) continue // Skip non-units

		const componentMetadataResult = ComponentMetadataSchema.safeParse(c.metadata)
		if (!componentMetadataResult.success) {
			logger.warn("skipping component with invalid metadata", {
				componentId: c.sourcedId,
				error: componentMetadataResult.error
			})
			continue
		}
		if (componentMetadataResult.data.khanSlug === decodedUnitSlug) {
			oneRosterUnit = c
			break
		}
	}

	if (!oneRosterUnit) {
		logger.error("unit page: unit not found by slug", { unitSlug: decodedUnitSlug, courseId: courseSourcedId })
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
		description: courseMetadata.description
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

	// Get all units for navigation
	const allUnits: Unit[] = []
	for (const component of allComponents) {
		if (component.parent) continue // Skip non-units

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
			description: componentMetadata.description,
			children: [] // Initialize empty children
		})
	}
	allUnits.sort((a, b) => a.ordering - b.ordering)

	// Fetch children of this unit (lessons and assessments)
	const unitChildrenResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `parent.sourcedId='${unitSourcedId}'`
		})
	)
	if (unitChildrenResult.error) {
		logger.error("failed to fetch unit children", { error: unitChildrenResult.error, unitSourcedId })
		throw errors.wrap(unitChildrenResult.error, "fetch unit children")
	}
	const unitChildren = unitChildrenResult.data

	// Fetch ALL resources and filter in memory
	const allResourcesInSystemResult = await errors.try(oneroster.getAllResources({}))
	if (allResourcesInSystemResult.error) {
		logger.error("failed to fetch all resources", { error: allResourcesInSystemResult.error })
		throw errors.wrap(allResourcesInSystemResult.error, "fetch all resources")
	}
	const allResourcesInSystem = allResourcesInSystemResult.data

	// Fetch ALL component resources and filter in memory for this unit and its children
	const allComponentResourcesResult = await errors.try(oneroster.getAllComponentResources({}))
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
	const allCourseComponentsResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `course.sourcedId='${courseSourcedId}'`
		})
	)
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
				logger.warn("skipping resource with invalid metadata", {
					resourceId: resource.sourcedId,
					error: resourceMetadataResult.error
				})
				continue
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
						description: resourceMetadata.description,
						questions: []
					})
				} else {
					unitAssessments.push({
						id: resource.sourcedId,
						title: resource.title,
						path: resourceMetadata.path,
						type: "UnitTest",
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.description,
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
				logger.warn("skipping resource with invalid metadata", {
					resourceId: resource.sourcedId,
					error: resourceMetadataResult.error
				})
				continue
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
					description: resourceMetadata.description,
					youtubeId: youtubeId,
					duration: resourceMetadata.duration || 0,
					type: "Video"
				})
			} else if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-stimulus") {
				// This is an article
				articles.push({
					id: resource.sourcedId,
					title: resource.title,
					path: resourceMetadata.path,
					slug: resourceMetadata.khanSlug,
					description: resourceMetadata.description,
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
					description: resourceMetadata.description,
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
			description: childMetadata.description,
			children: [...videos, ...articles, ...exercises]
		})
	}

	// Combine lessons and assessments, then sort by ordering
	const processedUnitChildren: UnitChild[] = [...processedLessons, ...unitAssessments].sort((a, b) => {
		// Find their original sortOrder from the components
		const aComponent = unitChildren.find((c) => c.sourcedId === a.id)
		const bComponent = unitChildren.find((c) => c.sourcedId === b.id)
		const aOrder = aComponent?.sortOrder ?? 0
		const bOrder = bComponent?.sortOrder ?? 0
		return aOrder - bOrder
	})

	const finalUnit: Unit = {
		id: oneRosterUnit.sourcedId,
		title: oneRosterUnit.title,
		slug: unitMetadata.khanSlug,
		description: unitMetadata.description,
		path: unitMetadata.path,
		ordering: oneRosterUnit.sortOrder,
		children: processedUnitChildren // Assign children here
	}

	// Count total lessons across all units
	const allComponentsForLessonCountResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `course.sourcedId='${courseSourcedId}'`
		})
	)
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
				continue // Skip invalid resources silently in counting
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
