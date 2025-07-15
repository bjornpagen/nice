import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
// --- REMOVED: All local type imports from page files ---
import { oneroster, qti } from "@/lib/clients"
import type { ClassReadSchemaType, CourseReadSchemaType, Resource } from "@/lib/oneroster"
import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/oneroster-metadata"
import { ErrQtiNotFound } from "@/lib/qti"
import type {
	Article,
	ArticlePageData,
	Course,
	CourseChallenge,
	CourseChallengeLayoutData,
	CourseChallengePageData,
	CoursePageData,
	Exercise,
	ExercisePageData,
	Lesson,
	LessonChild,
	LessonLayoutData,
	ProfileCourse,
	ProfileCoursesPageData,
	ProfileSubject,
	Quiz,
	QuizPageData,
	Unit,
	UnitChild,
	UnitPageData,
	UnitTest,
	UnitTestPageData,
	Video,
	VideoPageData
} from "@/lib/types"

// Helper to safely get metadata values
function getMetadataValue(metadata: Record<string, unknown> | undefined, key: string): string {
	if (!metadata) return ""
	const value = metadata[key]
	return typeof value === "string" ? value : ""
}

// --- Data Fetcher for Course Page ---
export async function fetchCoursePageData(params: { subject: string; course: string }): Promise<CoursePageData> {
	// First, find the course by its khanSlug since the URL param is a slug, not a Khan ID
	logger.debug("course page: looking up course by slug", { slug: params.course })

	// Fetch courses filtered by khanSlug for efficiency
	const filter = `metadata.khanSlug='${params.course}'`
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

	const courseForPage: Pick<Course, "id" | "title" | "description" | "path" | "slug"> = {
		id: oneRosterCourse.sourcedId,
		slug: courseMetadata.khanSlug, // Add slug
		title: oneRosterCourse.title,
		description: courseMetadata.description,
		path: courseMetadata.path
	}

	// Fetch all course components (units and lessons)
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
	logger.debug("allComponents", { allComponents })

	// Separate units (no parent) and lessons (have parent)
	const units: Unit[] = [] // Change to full Unit type
	const lessonsByUnitId = new Map<string, Lesson[]>() // Change to full Lesson type

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
				slug: componentMetadata.khanSlug,
				title: component.title,
				description: componentMetadata.description,
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
				description: componentMetadata.description,
				path: componentMetadata.path,
				children: [] // Initialize children
			})
		}
	}

	// Sort units by ordering
	units.sort((a, b) => a.ordering - b.ordering)

	// Fetch ALL resources and filter in memory
	const allResourcesInSystemResult = await errors.try(oneroster.getAllResources({}))
	if (allResourcesInSystemResult.error) {
		logger.error("failed to fetch all resources", { error: allResourcesInSystemResult.error })
		throw errors.wrap(allResourcesInSystemResult.error, "fetch all resources")
	}
	const allResourcesInSystem = allResourcesInSystemResult.data

	// Fetch ALL component resources and filter in memory
	const allComponentResourcesResult = await errors.try(oneroster.getAllComponentResources({}))
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
					description: resourceMetadata.description,
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

				// Find the componentResource to get the sortOrder
				const componentResource = componentResources.find(
					(cr) => cr.courseComponent.sourcedId === lesson.id && cr.resource.sourcedId === resource.sourcedId
				)
				if (!componentResource) {
					logger.error("component resource not found", { lessonId: lesson.id, resourceId: resource.sourcedId })
					throw errors.new(`component resource not found for lesson ${lesson.id} resource ${resource.sourcedId}`)
				}
				const _ordering = componentResource.sortOrder

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
						type: "Video",
						id: resource.sourcedId,
						title: resource.title,
						path: resourceMetadata.path,
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.description,
						youtubeId: youtubeId,
						duration: resourceMetadata.duration ?? 0
					})
				} else if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-stimulus") {
					// This is an article
					articles.push({
						type: "Article",
						id: resource.sourcedId,
						title: resource.title,
						path: resourceMetadata.path,
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.description,
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
						description: resourceMetadata.description,
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

// --- Data Fetcher for Unit Page ---
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

	const courseForPage: Pick<Course, "id" | "title" | "path" | "description"> = {
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
			// ✅ NEW: Validate resource metadata with Zod
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

// --- Data Fetcher for Lesson Layout (Shared) ---
export async function fetchLessonLayoutData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
}): Promise<LessonLayoutData> {
	// ✅ NEW: Waterfall lookup
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

				let child: LessonChild & { sortOrder: number }

				if (contentType === "Video") {
					const youtubeUrl = typeof resource.metadata?.url === "string" ? resource.metadata.url : ""
					const youtubeMatch = youtubeUrl.match(/[?&]v=([^&]+)/)
					const youtubeId = youtubeMatch?.[1] ?? ""

					child = {
						id: resource.sourcedId,
						slug: resourceSlug,
						title: resource.title,
						description: description,
						path: contentPath,
						type: "Video",
						youtubeId: youtubeId,
						duration: typeof resource.metadata?.duration === "number" ? resource.metadata.duration : 0,
						sortOrder: cr.sortOrder
					}
				} else if (contentType === "Article") {
					const khanId = typeof resource.metadata?.khanId === "string" ? resource.metadata.khanId : resource.sourcedId
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
				} else {
					// Exercise
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
	const unitSlug = typeof unit.metadata?.khanSlug === "string" ? unit.metadata.khanSlug : ""
	const unitDescription = typeof unit.metadata?.description === "string" ? unit.metadata.description : ""

	// Validate required lesson fields
	if (!currentLesson.title) {
		logger.error("CRITICAL: Current lesson missing title", { lessonId: currentLesson.sourcedId })
		throw errors.new("current lesson: title is required")
	}
	const currentLessonPath = typeof currentLesson.metadata?.path === "string" ? currentLesson.metadata.path : ""
	const currentLessonSlug = typeof currentLesson.metadata?.khanSlug === "string" ? currentLesson.metadata.khanSlug : ""
	const currentLessonDescription =
		typeof currentLesson.metadata?.description === "string" ? currentLesson.metadata.description : ""

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

// --- Data Fetcher for Article Page ---
export async function fetchArticlePageData(params: { article: string }): Promise<ArticlePageData> {
	// ✅ NEW: Look up resource by slug
	const filter = `metadata.khanSlug='${params.article}' AND metadata.type='qti'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
	if (resourceResult.error) {
		logger.error("failed to fetch article resource by slug", { error: resourceResult.error, slug: params.article })
		throw errors.wrap(resourceResult.error, "failed to fetch article resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource || !resource.metadata?.khanId) {
		notFound()
	}

	// Construct the QTI stimulus identifier using the Khan Academy ID
	const qtiIdentifier = `nice:${resource.metadata.khanId}`

	return {
		id: resource.sourcedId,
		title: resource.title,
		identifier: qtiIdentifier
	}
}

// --- Data Fetcher for Exercise Page ---
export async function fetchExercisePageData(params: { exercise: string }): Promise<ExercisePageData> {
	// ✅ NEW: Look up resource by slug
	const filter = `metadata.khanSlug='${params.exercise}' AND metadata.type='qti'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
	if (resourceResult.error) {
		logger.error("failed to fetch exercise resource by slug", { error: resourceResult.error, slug: params.exercise })
		throw errors.wrap(resourceResult.error, "failed to fetch exercise resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource || !resource.metadata?.khanId) {
		notFound()
	}

	// Use the khanId from metadata to construct the QTI test identifier
	const qtiTestId = `nice:${resource.metadata.khanId}`

	// Fetch questions from QTI server
	const questionsResult = await errors.try(qti.getAllQuestionsForTest(qtiTestId))
	if (questionsResult.error) {
		logger.error("failed to fetch questions for exercise", { testId: qtiTestId, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions for exercise")
	}

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier,
		exerciseId: "",
		qtiIdentifier: q.question.identifier
	}))

	return {
		exercise: {
			id: resource.sourcedId,
			title: resource.title,
			type: "Exercise" as const
		},
		questions
	}
}

// --- Data Fetcher for Video Page ---
function extractYouTubeId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
		/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
	]

	for (const pattern of patterns) {
		const match = url.match(pattern)
		if (match) {
			return match[1] ?? null
		}
	}

	return null
}

export async function fetchVideoPageData(params: { video: string }): Promise<VideoPageData> {
	// ✅ NEW: Look up resource by slug
	const filter = `metadata.khanSlug='${params.video}' AND metadata.type='video'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
	if (resourceResult.error) {
		logger.error("failed to fetch video resource by slug", { error: resourceResult.error, slug: params.video })
		throw errors.wrap(resourceResult.error, "failed to fetch video resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource || !resource.metadata?.url) {
		notFound()
	}

	const url = resource.metadata.url
	if (typeof url !== "string") {
		logger.error("video URL is not a string", { url })
		throw errors.new("video URL must be a string")
	}
	const youtubeId = extractYouTubeId(url)
	if (!youtubeId) {
		logger.error("invalid YouTube URL", { url: resource.metadata.url })
		throw errors.new("invalid YouTube URL")
	}

	return {
		id: resource.sourcedId,
		title: resource.title,
		description: getMetadataValue(resource.metadata, "description"),
		youtubeId
	}
}

// --- Data Fetcher for Quiz Page ---
export async function fetchQuizPageData(params: { quiz: string }): Promise<QuizPageData> {
	// ✅ NEW: Look up resource by slug
	const filter = `metadata.khanSlug='${params.quiz}' AND metadata.type='qti' AND metadata.khanLessonType='quiz'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
	if (resourceResult.error) {
		logger.error("failed to fetch quiz resource by slug", { error: resourceResult.error, slug: params.quiz })
		throw errors.wrap(resourceResult.error, "failed to fetch quiz resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource) {
		notFound()
	}

	// Use the sourcedId as the test identifier for QTI
	const qtiTestId = resource.sourcedId

	// Fetch questions from QTI server using the existing pattern
	const questionsResult = await errors.try(qti.getAllQuestionsForTest(qtiTestId))
	if (questionsResult.error) {
		if (errors.is(questionsResult.error, ErrQtiNotFound)) {
			logger.warn("quiz test not found in QTI server", { testId: qtiTestId })
			// Return empty questions array if the test is not yet in QTI
			return {
				quiz: {
					id: resource.sourcedId,
					title: resource.title,
					description: getMetadataValue(resource.metadata, "description"),
					type: "Quiz" as const
				},
				questions: []
			}
		}
		logger.error("failed to fetch questions for quiz", { testId: qtiTestId, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions for quiz")
	}

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier,
		exerciseId: "",
		qtiIdentifier: q.question.identifier
	}))

	return {
		quiz: {
			id: resource.sourcedId,
			title: resource.title,
			description: getMetadataValue(resource.metadata, "description"),
			type: "Quiz" as const
		},
		questions
	}
}

// --- Data Fetcher for Unit Test Page ---
export async function fetchUnitTestPageData(params: { test: string }): Promise<UnitTestPageData> {
	// ✅ NEW: Look up resource by slug
	const filter = `metadata.khanSlug='${params.test}' AND metadata.type='qti' AND metadata.khanLessonType='unittest'`
	const resourceResult = await errors.try(oneroster.getAllResources({ filter }))
	if (resourceResult.error) {
		logger.error("failed to fetch unit test resource by slug", { error: resourceResult.error, slug: params.test })
		throw errors.wrap(resourceResult.error, "failed to fetch unit test resource by slug")
	}
	const resource = resourceResult.data[0]

	if (!resource) {
		notFound()
	}

	// Use the sourcedId as the test identifier for QTI
	const qtiTestId = resource.sourcedId

	// Fetch questions from QTI server
	const questionsResult = await errors.try(qti.getAllQuestionsForTest(qtiTestId))
	if (questionsResult.error) {
		if (errors.is(questionsResult.error, ErrQtiNotFound)) {
			logger.warn("unit test not found in QTI server", { testId: qtiTestId })
			// Return empty questions array if the test is not yet in QTI
			return {
				test: {
					id: resource.sourcedId,
					title: resource.title,
					description: getMetadataValue(resource.metadata, "description"),
					type: "UnitTest" as const
				},
				questions: []
			}
		}
		logger.error("failed to fetch questions for unit test", { testId: qtiTestId, error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions for unit test")
	}

	const questions = questionsResult.data.questions.map((q) => ({
		id: q.question.identifier,
		exerciseId: "",
		qtiIdentifier: q.question.identifier
	}))

	return {
		test: {
			id: resource.sourcedId,
			title: resource.title,
			description: getMetadataValue(resource.metadata, "description"),
			type: "UnitTest" as const
		},
		questions
	}
}

// --- Data Fetchers for Course Challenge Page ---
export async function fetchCourseChallengePage_TestData(params: {
	test: string
	course: string
	subject: string
}): Promise<CourseChallengePageData> {
	const courseFilter = `metadata.khanSlug='${params.course}'`
	const coursesResult = await errors.try(oneroster.getAllCourses({ filter: courseFilter }))
	if (coursesResult.error) {
		logger.error("failed to fetch course by slug", { error: coursesResult.error, slug: params.course })
		throw errors.wrap(coursesResult.error, "fetch course")
	}
	const course = coursesResult.data[0]
	if (!course) {
		notFound()
	}

	const testFilter = `metadata.khanSlug='${params.test}' AND metadata.type='qti' AND course.sourcedId='${course.sourcedId}'`
	const testResourceResult = await errors.try(oneroster.getAllResources({ filter: testFilter }))
	if (testResourceResult.error) {
		logger.error("failed to fetch test resource", { error: testResourceResult.error, filter: testFilter })
		throw errors.wrap(testResourceResult.error, "fetch test resource")
	}
	const testResource = testResourceResult.data[0]
	if (!testResource) {
		notFound()
	}

	const qtiTestData = await qti.getAllQuestionsForTest(testResource.sourcedId)
	const questions = qtiTestData.questions.map((q) => ({
		id: q.question.identifier,
		exerciseId: "",
		qtiIdentifier: q.question.identifier
	}))
	return {
		test: {
			id: testResource.sourcedId,
			type: "CourseChallenge",
			title: testResource.title,
			slug: params.test,
			description: getMetadataValue(testResource.metadata, "description")
		},
		questions
	}
}

export async function fetchCourseChallengePage_LayoutData(params: {
	course: string
	subject: string
}): Promise<CourseChallengeLayoutData> {
	// Reuse the main course page data fetcher to get all necessary context
	const coursePageData = await fetchCoursePageData({
		subject: params.subject,
		course: params.course
	})

	// The CourseSidebar component needs the full course object with units,
	// the lesson count, and any challenges.
	return {
		course: coursePageData.course,
		lessonCount: coursePageData.lessonCount,
		challenges: coursePageData.course.challenges
	}
}

// --- Data Fetchers for Profile Courses Page ---
export async function getOneRosterCoursesForExplore(): Promise<ProfileSubject[]> {
	// Get all courses from OneRoster
	const coursesResult = await errors.try(oneroster.getAllCourses({}))
	if (coursesResult.error) {
		logger.error("failed to fetch courses", { error: coursesResult.error })
		throw errors.wrap(coursesResult.error, "fetch courses")
	}

	// Group courses by subjectCode (e.g., 'math', 'ela')
	const coursesBySubject = new Map<string, CourseReadSchemaType[]>()

	for (const course of coursesResult.data) {
		if (!course.subjects || course.subjects.length === 0) {
			continue // Skip courses without subject codes
		}

		// Use the first subject code as the primary subject
		const primarySubject = course.subjects[0]
		if (!primarySubject) continue // Added explicit check
		if (!coursesBySubject.has(primarySubject)) {
			coursesBySubject.set(primarySubject, [])
		}
		coursesBySubject.get(primarySubject)?.push(course)
	}

	// Convert to the expected format
	const allSubjects: ProfileSubject[] = []

	for (const [subjectCode, courses] of coursesBySubject) {
		// Try to get a more readable subject name
		// This mapping could be expanded based on your needs
		const subjectNameMap: Record<string, string> = {
			math: "Math",
			ela: "English Language Arts",
			science: "Science",
			"social-studies": "Social Studies",
			history: "History"
			// Add more mappings as needed
		}

		const subjectName = subjectNameMap[subjectCode] || subjectCode

		allSubjects.push({
			slug: subjectCode,
			title: subjectName,
			courses: courses.map((course) => {
				const khanSlug = getMetadataValue(course.metadata, "khanSlug")
				if (!khanSlug) {
					logger.error("CRITICAL: Course missing khanSlug", {
						courseId: course.sourcedId,
						title: course.title
					})
					throw errors.new("course khanSlug: required for navigation")
				}
				const path = getMetadataValue(course.metadata, "path")
				if (!path) {
					logger.error("CRITICAL: Course missing path", {
						courseId: course.sourcedId,
						title: course.title
					})
					throw errors.new("course path: required for navigation")
				}
				return {
					id: course.sourcedId,
					slug: khanSlug,
					title: course.title,
					path: path
				}
			})
		})
	}

	// Sort subjects alphabetically
	allSubjects.sort((a, b) => a.title.localeCompare(b.title))

	return allSubjects
}

export async function fetchUserEnrolledCourses(userId: string): Promise<ProfileCourse[]> {
	// Get enrollments for the user
	const filter = `user.sourcedId='${userId}' AND status='active'`
	const enrollmentsResult = await errors.try(oneroster.getAllEnrollments({ filter }))
	if (enrollmentsResult.error) {
		logger.error("failed to fetch user enrollments", { error: enrollmentsResult.error, userId })
		throw errors.wrap(enrollmentsResult.error, "fetch user enrollments")
	}

	// Get unique class IDs from enrollments
	const classIds = [...new Set(enrollmentsResult.data.map((enrollment) => enrollment.class.sourcedId))]

	// Fetch class details for each enrollment
	const classPromises = classIds.map(async (classId) => {
		const classResult = await errors.try(oneroster.getClass(classId))
		if (classResult.error) {
			logger.error("failed to fetch class details", { error: classResult.error, classId })
			// Skip failed class fetches
			return null
		}
		return classResult.data
	})

	const classes = (await Promise.all(classPromises)).filter((c): c is ClassReadSchemaType => c !== null)

	// Fetch units for all courses associated with the classes
	const courseIds = [...new Set(classes.map((c) => c.course.sourcedId))]
	const unitsByCourseId = new Map<string, Unit[]>()

	if (courseIds.length > 0) {
		const allUnitsResult = await errors.try(
			oneroster.getCourseComponents({ filter: `course.sourcedId IN ('${courseIds.join("','")}')` })
		)
		if (allUnitsResult.error) {
			logger.error("failed to fetch units for enrolled courses", { error: allUnitsResult.error, courseIds })
		} else {
			for (const unit of allUnitsResult.data) {
				if (unit.parent) continue
				const courseId = unit.course.sourcedId
				if (!unitsByCourseId.has(courseId)) {
					unitsByCourseId.set(courseId, [])
				}

				const path = getMetadataValue(unit.metadata, "path")
				if (!path) {
					logger.error("unit is missing path in metadata, skipping", { unitId: unit.sourcedId })
					continue
				}

				const slug = getMetadataValue(unit.metadata, "khanSlug")
				if (!slug) {
					logger.error("unit is missing khanSlug in metadata, skipping", { unitId: unit.sourcedId })
					continue
				}

				unitsByCourseId.get(courseId)?.push({
					id: unit.sourcedId,
					title: unit.title,
					path,
					ordering: unit.sortOrder,
					description: getMetadataValue(unit.metadata, "description") || "",
					slug,
					children: [] // Initialize with empty children
				})
			}
		}
	}

	// Map to ProfileCourse format and attach units
	const courses: ProfileCourse[] = []

	for (const cls of classes) {
		const courseUnits = unitsByCourseId.get(cls.course.sourcedId)
		if (!courseUnits) {
			logger.error("CRITICAL: No units found for course", {
				courseId: cls.course.sourcedId,
				classId: cls.sourcedId
			})
			throw errors.new("course units: required data missing")
		}

		// Fetch course metadata for the ProfileCourse
		const courseResult = await errors.try(oneroster.getCourse(cls.course.sourcedId))
		if (courseResult.error) {
			logger.error("failed to fetch course metadata", {
				courseId: cls.course.sourcedId,
				error: courseResult.error
			})
			continue // Skip this course
		}

		const course = courseResult.data
		if (!course) {
			logger.error("course data is undefined", { courseId: cls.course.sourcedId })
			continue // Skip this course
		}

		const courseMetadata = course.metadata || {}

		courses.push({
			id: course.sourcedId,
			title: course.title,
			description: getMetadataValue(courseMetadata, "description"),
			path: getMetadataValue(courseMetadata, "path"),
			units: courseUnits
		})
	}

	return courses
}

// --- Data Fetcher for Profile Courses Page ---
export async function fetchProfileCoursesData(): Promise<ProfileCoursesPageData> {
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}

	const subjectsPromise = getOneRosterCoursesForExplore()
	const userCoursesPromise = fetchUserEnrolledCourses(user.id)

	const [subjects, userCourses] = await Promise.all([subjectsPromise, userCoursesPromise])

	return { subjects, userCourses }
}
