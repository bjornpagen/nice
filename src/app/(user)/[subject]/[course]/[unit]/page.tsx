import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { oneroster } from "@/lib/clients"
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

// Helper function to extract metadata value
function getMetadataValue(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
	if (!metadata) return undefined
	const value = metadata[key]
	return typeof value === "string" ? value : undefined
}

// Helper function to parse number from metadata
function getMetadataNumber(metadata: Record<string, unknown> | undefined, key: string): number {
	if (!metadata) return 0
	const value = metadata[key]
	return typeof value === "number" ? value : 0
}

// Shared data fetching function using OneRoster API
async function fetchUnitData(params: { subject: string; course: string; unit: string }): Promise<HydratedUnitData> {
	logger.debug("unit page: fetching unit data", { params })

	// First, find the course by its khanSlug
	const courseFilter = `metadata.khanSlug='${params.course}'`
	const courses = await oneroster.getAllCourses(courseFilter)
	const oneRosterCourse = courses[0]

	if (!oneRosterCourse) {
		logger.error("unit page: course not found by slug", { slug: params.course })
		notFound()
	}

	const courseSourcedId = oneRosterCourse.sourcedId
	const decodedUnitSlug = decodeURIComponent(params.unit)

	// Fetch all components for this course to find the unit by its khanSlug
	const allComponents = await oneroster.getCourseComponents(`course.sourcedId='${courseSourcedId}'`)
	const oneRosterUnit = allComponents.find(
		(c) => !c.parent && getMetadataValue(c.metadata, "khanSlug") === decodedUnitSlug
	)

	if (!oneRosterUnit) {
		logger.error("unit page: unit not found by slug", { unitSlug: decodedUnitSlug, courseId: courseSourcedId })
		notFound()
	}

	const unitSourcedId = oneRosterUnit.sourcedId

	const coursePath = getMetadataValue(oneRosterCourse.metadata, "path")
	if (!coursePath) {
		logger.error("course missing required path", { courseId: oneRosterCourse.sourcedId })
		throw errors.new(`course ${oneRosterCourse.sourcedId} missing required path`)
	}

	const course: Course = {
		id: oneRosterCourse.sourcedId,
		title: oneRosterCourse.title,
		path: coursePath,
		description: getMetadataValue(oneRosterCourse.metadata, "description")
	}

	const unitPath = getMetadataValue(oneRosterUnit.metadata, "path")
	if (!unitPath) {
		logger.error("unit missing required path", { unitId: oneRosterUnit.sourcedId })
		throw errors.new(`unit ${oneRosterUnit.sourcedId} missing required path`)
	}

	const unitSlug = getMetadataValue(oneRosterUnit.metadata, "khanSlug")
	if (!unitSlug) {
		logger.error("unit missing required khanSlug", { unitId: oneRosterUnit.sourcedId })
		throw errors.new(`unit ${oneRosterUnit.sourcedId} missing required khanSlug`)
	}

	const unit: Unit = {
		id: oneRosterUnit.sourcedId,
		title: oneRosterUnit.title,
		path: unitPath,
		ordering: oneRosterUnit.sortOrder,
		slug: unitSlug,
		description: getMetadataValue(oneRosterUnit.metadata, "description")
	}

	// Get all units for navigation
	const allUnits: Unit[] = []
	for (const component of allComponents) {
		if (component.parent) continue // Skip non-units

		const unitSlug = getMetadataValue(component.metadata, "khanSlug")
		if (!unitSlug) {
			logger.error("unit missing required khanSlug", { unitId: component.sourcedId })
			throw errors.new(`unit ${component.sourcedId} missing required khanSlug`)
		}

		const unitNavPath = getMetadataValue(component.metadata, "path")
		if (!unitNavPath) {
			logger.error("unit missing required path", { unitId: component.sourcedId })
			throw errors.new(`unit ${component.sourcedId} missing required path`)
		}

		allUnits.push({
			id: component.sourcedId,
			title: component.title,
			path: unitNavPath,
			ordering: component.sortOrder,
			slug: unitSlug,
			description: getMetadataValue(component.metadata, "description")
		})
	}
	allUnits.sort((a, b) => a.ordering - b.ordering)

	// Fetch children of this unit (lessons and assessments)
	const unitChildren = await oneroster.getCourseComponents(`parent.sourcedId='${unitSourcedId}'`)

	// Fetch ALL resources and filter in memory
	const allResourcesInSystem = await oneroster.getAllResources("sourcedId~'nice:'")

	// Fetch ALL component resources and filter in memory for this unit and its children
	const allComponentResources = await oneroster.getAllComponentResources("sourcedId~'nice:'")

	// Get resources for this unit specifically (assessments)
	const unitComponentResources = allComponentResources.filter((cr) => cr.courseComponent.sourcedId === unitSourcedId)

	// Get resources for unit's children (lessons)
	const childIds = new Set(unitChildren.map((c) => c.sourcedId))
	const childComponentResources = allComponentResources.filter((cr) => childIds.has(cr.courseComponent.sourcedId))

	// Get unique resource IDs from ALL component resources for the course (not just this unit)
	// This is needed because resources might be shared across units
	const allCourseComponents = await oneroster.getCourseComponents(`course.sourcedId='${courseSourcedId}'`)
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
			const resourceType = getMetadataValue(resource.metadata, "type")
			const subType = getMetadataValue(resource.metadata, "subType")
			const lessonType = getMetadataValue(resource.metadata, "lessonType")

			if (resourceType === "qti" && subType === "qti-test" && lessonType) {
				const assessmentType = lessonType === "unittest" ? "UnitTest" : "Quiz"
				const resourceSlug = getMetadataValue(resource.metadata, "khanSlug")

				if (!resourceSlug) {
					logger.error("assessment resource missing required khanSlug", { resourceId: resource.sourcedId })
					throw errors.new(`assessment resource ${resource.sourcedId} missing required khanSlug`)
				}

				const assessmentPath = getMetadataValue(resource.metadata, "path")
				if (!assessmentPath) {
					logger.error("assessment missing required path", { assessmentId: resource.sourcedId })
					throw errors.new(`assessment ${resource.sourcedId} missing required path`)
				}

				if (assessmentType === "Quiz") {
					unitAssessments.push({
						id: resource.sourcedId,
						title: resource.title,
						path: assessmentPath,
						ordering: cr.sortOrder,
						type: "Quiz",
						parentId: unitSourcedId,
						slug: resourceSlug,
						description: getMetadataValue(resource.metadata, "description")
					})
				} else {
					unitAssessments.push({
						id: resource.sourcedId,
						title: resource.title,
						path: assessmentPath,
						ordering: cr.sortOrder,
						type: "UnitTest",
						parentId: unitSourcedId,
						slug: resourceSlug,
						description: getMetadataValue(resource.metadata, "description")
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
		const childSlug = getMetadataValue(child.metadata, "khanSlug")
		if (!childSlug) {
			logger.error("lesson missing required khanSlug", { lessonId: child.sourcedId })
			throw errors.new(`lesson ${child.sourcedId} missing required khanSlug`)
		}

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
			const resourceType = getMetadataValue(resource.metadata, "type")
			const subType = getMetadataValue(resource.metadata, "subType")
			const lessonType = getMetadataValue(resource.metadata, "lessonType")
			const resourceSlug = getMetadataValue(resource.metadata, "khanSlug")

			if (!resourceSlug) {
				logger.error("resource missing required khanSlug", { resourceId: resource.sourcedId })
				throw errors.new(`resource ${resource.sourcedId} missing required khanSlug`)
			}

			// Find the componentResource to get the sortOrder
			const componentResource = childComponentResources.find(
				(cr) => cr.courseComponent.sourcedId === child.sourcedId && cr.resource.sourcedId === resource.sourcedId
			)
			if (!componentResource) {
				logger.error("component resource not found", { lessonId: child.sourcedId, resourceId: resource.sourcedId })
				throw errors.new(`component resource not found for lesson ${child.sourcedId} resource ${resource.sourcedId}`)
			}
			const ordering = componentResource.sortOrder

			if (resourceType === "video") {
				const youtubeUrl = getMetadataValue(resource.metadata, "url")
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

				const videoPath = getMetadataValue(resource.metadata, "path")
				if (!videoPath) {
					logger.error("video missing required path", { videoId: resource.sourcedId })
					throw errors.new(`video ${resource.sourcedId} missing required path`)
				}

				const videoDescription = getMetadataValue(resource.metadata, "description")
				if (!videoDescription) {
					logger.error("video missing required description", { videoId: resource.sourcedId })
					throw errors.new(`video ${resource.sourcedId} missing required description`)
				}

				videos.push({
					id: resource.sourcedId,
					title: resource.title,
					path: videoPath,
					slug: resourceSlug,
					description: videoDescription,
					youtubeId: youtubeId,
					duration: getMetadataNumber(resource.metadata, "duration"),
					ordering
				})
			} else if (resourceType === "qti" && subType === "qti-stimulus") {
				// This is an article
				const articlePath = getMetadataValue(resource.metadata, "path")
				if (!articlePath) {
					logger.error("article missing required path", { articleId: resource.sourcedId })
					throw errors.new(`article ${resource.sourcedId} missing required path`)
				}

				const articleDescription = getMetadataValue(resource.metadata, "description")
				if (!articleDescription) {
					logger.error("article missing required description", { articleId: resource.sourcedId })
					throw errors.new(`article ${resource.sourcedId} missing required description`)
				}

				articles.push({
					id: resource.sourcedId,
					title: resource.title,
					path: articlePath,
					slug: resourceSlug,
					description: articleDescription,
					perseusContent: null, // Will be fetched from QTI server
					ordering
				})
			} else if (resourceType === "qti" && subType === "qti-test" && !lessonType) {
				// This is an exercise (test without lessonType means it's an exercise)
				logger.debug("including exercise with new format", { sourcedId: resource.sourcedId })

				const exercisePath = getMetadataValue(resource.metadata, "path")
				if (!exercisePath) {
					logger.error("exercise missing required path", { exerciseId: resource.sourcedId })
					throw errors.new(`exercise ${resource.sourcedId} missing required path`)
				}

				exercises.push({
					id: resource.sourcedId,
					title: resource.title,
					path: exercisePath,
					slug: resourceSlug,
					description: getMetadataValue(resource.metadata, "description"),
					questions: [], // Will be fetched from QTI server
					ordering
				})
			}
		}

		// Sort content by ordering
		videos.sort((a, b) => a.ordering - b.ordering)
		articles.sort((a, b) => a.ordering - b.ordering)
		exercises.sort((a, b) => a.ordering - b.ordering)

		const lessonPath = getMetadataValue(child.metadata, "path")
		if (!lessonPath) {
			logger.error("lesson missing required path", { lessonId: child.sourcedId })
			throw errors.new(`lesson ${child.sourcedId} missing required path`)
		}

		processedLessons.push({
			id: child.sourcedId,
			title: child.title,
			path: lessonPath,
			ordering: child.sortOrder,
			type: "Lesson",
			videos,
			articles,
			exercises,
			unitId: unitSourcedId,
			slug: childSlug,
			description: getMetadataValue(child.metadata, "description")
		})
	}

	// Combine lessons and assessments, then sort by ordering
	const processedUnitChildren: UnitChild[] = [...processedLessons, ...unitAssessments].sort(
		(a, b) => a.ordering - b.ordering
	)

	// Count total lessons across all units
	const allComponentsForLessonCount = await oneroster.getCourseComponents(`course.sourcedId='${courseSourcedId}'`)
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
			const resourceType = getMetadataValue(resource.metadata, "type")
			const subType = getMetadataValue(resource.metadata, "subType")
			const lessonType = getMetadataValue(resource.metadata, "lessonType")

			if (resourceType === "qti" && subType === "qti-test" && lessonType) {
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
