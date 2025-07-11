import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { oneroster } from "@/lib/clients"
import { createPrefixFilter } from "@/lib/filter"
import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/oneroster-metadata"
import { Content } from "./content"

// --- REMOVED ALL DRIZZLE QUERIES ---

// --- NEW: OneRoster-based types ---
export type Course = {
	id: string
	title: string
	description?: string
	path: string // Made required
}

export type Unit = {
	id: string
	title: string
	path: string // Made required
	ordering: number
	metadata?: Record<string, unknown>
}

export type Lesson = {
	id: string
	unitId: string
	slug?: string
	title: string
	description?: string
	path: string // Made required
	ordering: number
}

export type UnitAssessment = {
	id: string
	type: "Quiz" | "UnitTest"
	parentId: string
	title: string
	slug?: string
	path: string // Made required
	ordering: number
	description?: string
}

export type CourseChallenge = {
	id: string
	path: string // Made required
}

// Exercise-related types
export type Question = { id: string; sha: string; parsedData: unknown }
export type Video = {
	id: string
	title: string
	path: string // Made required
	slug: string
	description: string
	youtubeId: string
	duration: number
	ordering: number
}
export type Article = {
	id: string
	title: string
	path: string // Made required
	slug: string
	description: string
	perseusContent: unknown
	ordering: number
}
export type Exercise = {
	id: string
	title: string
	path: string // Made required
	slug: string
	description?: string
	questions: Question[]
	ordering: number
}

// Combined unit child types with exercises
export type UnitChild =
	| (Lesson & { type: "Lesson"; videos: Video[]; exercises: Exercise[]; articles: Article[] })
	| (UnitAssessment & { type: "Quiz" })
	| (UnitAssessment & { type: "UnitTest" })

export type UnitWithChildren = Unit & {
	children: UnitChild[]
}

export type CourseData = {
	params: { subject: string; course: string }
	course: Course
	units: UnitWithChildren[]
	lessonCount: number
	challenges: CourseChallenge[]
}

// Shared data fetching function using OneRoster API
async function fetchCourseData(params: { subject: string; course: string }): Promise<CourseData> {
	// First, find the course by its khanSlug since the URL param is a slug, not a Khan ID
	logger.debug("course page: looking up course by slug", { slug: params.course })
	const prefixFilter = createPrefixFilter("nice:")

	// Fetch courses filtered by khanSlug for efficiency
	const filter = `${prefixFilter} AND metadata.khanSlug='${params.course}' AND status='active'`
	const allCoursesResult = await errors.try(oneroster.getAllCourses({ filter }))
	if (allCoursesResult.error) {
		logger.error("failed to fetch courses", { error: allCoursesResult.error, filter })
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
		description: courseMetadata.description,
		path: courseMetadata.path
	}

	// Fetch all course components (units and lessons)
	const allComponentsResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `${prefixFilter} AND course.sourcedId='${courseSourcedId}' AND status='active'`
		})
	)
	if (allComponentsResult.error) {
		logger.error("failed to fetch course components", { error: allComponentsResult.error, courseSourcedId })
		throw errors.wrap(allComponentsResult.error, "fetch course components")
	}
	const allComponents = allComponentsResult.data
	logger.debug("allComponents", { allComponents })

	// Separate units (no parent) and lessons (have parent)
	const units: Unit[] = []
	const lessonsByUnitId = new Map<string, Lesson[]>()

	for (const component of allComponents) {
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

		if (!component.parent) {
			// This is a unit
			units.push({
				id: component.sourcedId,
				title: component.title,
				path: componentMetadata.path,
				ordering: component.sortOrder,
				metadata: component.metadata
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
				id: component.sourcedId,
				unitId: parentId,
				slug: componentMetadata.khanSlug,
				title: component.title,
				description: componentMetadata.description,
				path: componentMetadata.path,
				ordering: component.sortOrder
			})
		}
	}

	// Sort units by ordering
	units.sort((a, b) => a.ordering - b.ordering)

	// Fetch ALL resources and filter in memory
	const allResourcesInSystemResult = await errors.try(
		oneroster.getAllResources({ filter: `${prefixFilter} AND status='active'` })
	)
	if (allResourcesInSystemResult.error) {
		logger.error("failed to fetch all resources", { error: allResourcesInSystemResult.error })
		throw errors.wrap(allResourcesInSystemResult.error, "fetch all resources")
	}
	const allResourcesInSystem = allResourcesInSystemResult.data

	// Fetch ALL component resources and filter in memory
	const allComponentResourcesResult = await errors.try(
		oneroster.getAllComponentResources({ filter: `${prefixFilter} AND status='active'` })
	)
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
	const unitsWithChildren: UnitWithChildren[] = units.map((unit) => {
		let unitLessons = lessonsByUnitId.get(unit.id)
		if (!unitLessons) {
			// Unit has no lessons, which is valid
			unitLessons = []
			lessonsByUnitId.set(unit.id, unitLessons)
		}

		// Get resources linked directly to the unit (assessments)
		let unitResources = resourcesByComponentId.get(unit.id)
		if (!unitResources) {
			// Unit has no direct resources, which is valid
			unitResources = []
			resourcesByComponentId.set(unit.id, unitResources)
		}
		const unitAssessments: UnitAssessment[] = []

		// Find assessments from unit resources
		for (const resource of unitResources) {
			// ✅ NEW: Validate resource metadata with Zod
			const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
			if (!resourceMetadataResult.success) {
				logger.warn("skipping resource with invalid metadata", {
					resourceId: resource.sourcedId,
					error: resourceMetadataResult.error
				})
				continue // Skip this resource
			}
			const resourceMetadata = resourceMetadataResult.data

			if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-test" && resourceMetadata.lessonType) {
				const assessmentType = resourceMetadata.lessonType === "unittest" ? "UnitTest" : "Quiz"

				// Find the component resource to get sortOrder
				const componentResource = componentResources.find(
					(cr) => cr.courseComponent.sourcedId === unit.id && cr.resource.sourcedId === resource.sourcedId
				)

				// ✅ NEW: Validate unit metadata with Zod
				const unitMetadataResult = ComponentMetadataSchema.safeParse(unit.metadata)
				if (!unitMetadataResult.success) {
					logger.error("failed to parse unit metadata", {
						unitId: unit.id,
						error: unitMetadataResult.error
					})
					throw errors.wrap(unitMetadataResult.error, "invalid unit metadata")
				}

				if (!componentResource) {
					logger.error("component resource not found for assessment", {
						resourceId: resource.sourcedId,
						unitId: unit.id
					})
					throw errors.new(`component resource not found for assessment ${resource.sourcedId}`)
				}

				unitAssessments.push({
					id: resource.sourcedId,
					type: assessmentType,
					parentId: unit.id,
					title: resource.title,
					slug: resourceMetadata.khanSlug,
					path: resourceMetadata.path,
					ordering: componentResource.sortOrder,
					description: resourceMetadata.description
				})
			}
		}

		// Process lessons with their content
		const lessonsWithContent: UnitChild[] = unitLessons.map((lesson) => {
			let lessonResources = resourcesByComponentId.get(lesson.id)
			if (!lessonResources) {
				// Lesson has no resources, which is valid
				lessonResources = []
				resourcesByComponentId.set(lesson.id, lessonResources)
			}

			const videos: Video[] = []
			const articles: Article[] = []
			const exercises: Exercise[] = []

			// Categorize resources by type (based on metadata)
			for (const resource of lessonResources) {
				// ✅ NEW: Validate resource metadata with Zod
				const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
				if (!resourceMetadataResult.success) {
					logger.warn("skipping resource with invalid metadata", {
						resourceId: resource.sourcedId,
						error: resourceMetadataResult.error
					})
					continue // Skip this resource
				}
				const resourceMetadata = resourceMetadataResult.data

				// ✅ NEW: Validate unit metadata with Zod
				const unitMetadataResult = ComponentMetadataSchema.safeParse(unit.metadata)
				if (!unitMetadataResult.success) {
					logger.error("failed to parse unit metadata", {
						unitId: unit.id,
						error: unitMetadataResult.error
					})
					throw errors.wrap(unitMetadataResult.error, "invalid unit metadata")
				}

				// Find the componentResource to get the sortOrder
				const componentResource = componentResources.find(
					(cr) => cr.courseComponent.sourcedId === lesson.id && cr.resource.sourcedId === resource.sourcedId
				)
				if (!componentResource) {
					logger.error("component resource not found", { lessonId: lesson.id, resourceId: resource.sourcedId })
					throw errors.new(`component resource not found for lesson ${lesson.id} resource ${resource.sourcedId}`)
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

					// Note: description is guaranteed to be a string (possibly empty) by the Zod schema
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
					// Note: description is guaranteed to be a string (possibly empty) by the Zod schema
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

			return {
				...lesson,
				type: "Lesson" as const,
				videos,
				articles,
				exercises
			}
		})

		// Process assessments
		const assessmentsWithType: UnitChild[] = unitAssessments.map((assessment) => ({
			...assessment,
			type: assessment.type
		}))

		// Combine and sort all children by ordering
		const children = [...lessonsWithContent, ...assessmentsWithType].sort((a, b) => a.ordering - b.ordering)

		return {
			...unit,
			children
		}
	})

	// Count total lessons
	let lessonCount = 0
	for (const [, lessons] of lessonsByUnitId) {
		lessonCount += lessons.length
	}

	// Get course challenges (resources directly associated with the course, not components)
	const challenges: CourseChallenge[] = []
	// In the OneRoster model, course challenges would be resources without component associations
	// or with specific metadata. For now, we'll return empty array.

	return {
		params,
		course,
		units: unitsWithChildren,
		lessonCount,
		challenges
	}
}

// The page component is NOT async. It orchestrates promises and renders immediately.
export default function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	logger.info("course page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchCourseData)

	return <Content dataPromise={dataPromise} />
}
