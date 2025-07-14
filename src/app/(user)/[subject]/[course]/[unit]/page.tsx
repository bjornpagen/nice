import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { oneroster } from "@/lib/clients"
import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/oneroster-metadata"
import { Content } from "./content"

// --- REMOVED ALL DRIZZLE QUERIES ---

// --- NEW: OneRoster-based types ---
export type Course = {
	id: string
	title: string
	path: string
	description?: string
}

export type Unit = {
	id: string
	title: string
	path: string
	ordering: number
	slug?: string
	description?: string
}

export type CourseChallenge = {
	id: string
	path: string
}

export type Question = { id: string; sha: string; parsedData: unknown }

// Video type must match what Drizzle was providing
export type Video = {
	id: string
	title: string
	path: string
	slug: string
	description: string
	youtubeId: string
	duration: number
	ordering: number
}

// Article type must match what Drizzle was providing
export type Article = {
	id: string
	title: string
	path: string
	slug: string
	description: string
	perseusContent: unknown
	ordering: number
}

// Exercise type must match what Drizzle was providing
export type Exercise = {
	id: string
	title: string
	path: string
	slug: string
	description?: string
	questions: Question[]
	ordering: number
}

export type Lesson = {
	id: string
	title: string
	path: string
	ordering: number
	type: "Lesson"
	videos: Video[]
	exercises: Exercise[]
	articles: Article[]
	unitId: string
	slug?: string
	description?: string
}

export type Quiz = {
	id: string
	title: string
	path: string
	ordering: number
	type: "Quiz"
	parentId: string
	slug?: string
	description?: string
}

export type UnitTest = {
	id: string
	title: string
	path: string
	ordering: number
	type: "UnitTest"
	parentId: string
	slug?: string
	description?: string
}

export type UnitChild = Lesson | Quiz | UnitTest

export type HydratedUnitData = {
	params: { subject: string; course: string; unit: string }
	course: Course
	allUnits: Unit[]
	lessonCount: number
	challenges: CourseChallenge[]
	unit: Unit
	unitChildren: UnitChild[]
}

// Shared data fetching function using OneRoster API
async function fetchUnitData(params: { subject: string; course: string; unit: string }): Promise<HydratedUnitData> {
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

	// ✅ NEW: Validate course metadata with Zod
	const courseMetadataResult = CourseMetadataSchema.safeParse(oneRosterCourse.metadata)
	if (!courseMetadataResult.success) {
		logger.error("failed to parse course metadata", {
			courseId: oneRosterCourse.sourcedId,
			error: courseMetadataResult.error
		})
		throw errors.wrap(courseMetadataResult.error, "invalid course metadata")
	}
	const courseMetadata = courseMetadataResult.data

	const course: Course = {
		id: oneRosterCourse.sourcedId,
		title: oneRosterCourse.title,
		path: courseMetadata.path,
		description: courseMetadata.description
	}

	// ✅ NEW: Validate unit metadata with Zod
	const unitMetadataResult = ComponentMetadataSchema.safeParse(oneRosterUnit.metadata)
	if (!unitMetadataResult.success) {
		logger.error("failed to parse unit metadata", {
			unitId: oneRosterUnit.sourcedId,
			error: unitMetadataResult.error
		})
		throw errors.wrap(unitMetadataResult.error, "invalid unit metadata")
	}
	const unitMetadata = unitMetadataResult.data

	const unit: Unit = {
		id: oneRosterUnit.sourcedId,
		title: oneRosterUnit.title,
		path: unitMetadata.path,
		ordering: oneRosterUnit.sortOrder,
		slug: unitMetadata.khanSlug,
		description: unitMetadata.description
	}

	// Get all units for navigation
	const allUnits: Unit[] = []
	for (const component of allComponents) {
		if (component.parent) continue // Skip non-units

		// ✅ NEW: Validate component metadata with Zod
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
			description: componentMetadata.description
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
			// ✅ NEW: Validate resource metadata with Zod
			const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
			if (!resourceMetadataResult.success) {
				logger.warn("skipping resource with invalid metadata", {
					resourceId: resource.sourcedId,
					error: resourceMetadataResult.error
				})
				continue
			}
			const resourceMetadata = resourceMetadataResult.data

			if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-test" && resourceMetadata.lessonType) {
				const assessmentType = resourceMetadata.lessonType === "unittest" ? "UnitTest" : "Quiz"

				if (assessmentType === "Quiz") {
					unitAssessments.push({
						id: resource.sourcedId,
						title: resource.title,
						path: resourceMetadata.path,
						ordering: cr.sortOrder,
						type: "Quiz",
						parentId: unitSourcedId,
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.description
					})
				} else {
					unitAssessments.push({
						id: resource.sourcedId,
						title: resource.title,
						path: resourceMetadata.path,
						ordering: cr.sortOrder,
						type: "UnitTest",
						parentId: unitSourcedId,
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.description
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
		// ✅ NEW: Validate child component metadata with Zod
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
			// ✅ NEW: Validate resource metadata with Zod
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
			const ordering = componentResource.sortOrder

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
					ordering
				})
			} else if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-stimulus") {
				// This is an article
				articles.push({
					id: resource.sourcedId,
					title: resource.title,
					path: resourceMetadata.path,
					slug: resourceMetadata.khanSlug,
					description: resourceMetadata.description,
					perseusContent: null, // Will be fetched from QTI server
					ordering
				})
			} else if (
				resourceMetadata.type === "qti" &&
				resourceMetadata.subType === "qti-test" &&
				!resourceMetadata.lessonType
			) {
				// This is an exercise (test without lessonType means it's an exercise)
				logger.debug("including exercise with new format", { sourcedId: resource.sourcedId })

				exercises.push({
					id: resource.sourcedId,
					title: resource.title,
					path: resourceMetadata.path,
					slug: resourceMetadata.khanSlug,
					description: resourceMetadata.description,
					questions: [], // Will be fetched from QTI server
					ordering
				})
			}
		}

		// Sort content by ordering
		videos.sort((a, b) => a.ordering - b.ordering)
		articles.sort((a, b) => a.ordering - b.ordering)
		exercises.sort((a, b) => a.ordering - b.ordering)

		processedLessons.push({
			id: child.sourcedId,
			title: child.title,
			path: childMetadata.path,
			ordering: child.sortOrder,
			type: "Lesson",
			videos,
			articles,
			exercises,
			unitId: unitSourcedId,
			slug: childSlug,
			description: childMetadata.description
		})
	}

	// Combine lessons and assessments, then sort by ordering
	const processedUnitChildren: UnitChild[] = [...processedLessons, ...unitAssessments].sort(
		(a, b) => a.ordering - b.ordering
	)

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
			// ✅ NEW: Validate resource metadata with Zod
			const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
			if (!resourceMetadataResult.success) {
				continue // Skip invalid resources silently in counting
			}
			const resourceMetadata = resourceMetadataResult.data

			if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-test" && resourceMetadata.lessonType) {
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
		course,
		allUnits,
		lessonCount,
		challenges,
		unit,
		unitChildren: processedUnitChildren
	}
}

// Main unit page - renders layout immediately with streaming content
export default function UnitPage({ params }: { params: Promise<{ subject: string; course: string; unit: string }> }) {
	logger.info("unit page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchUnitData)

	return <Content dataPromise={dataPromise} />
}
