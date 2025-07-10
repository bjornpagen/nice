import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { env } from "@/env"
import { OneRosterApiClient } from "@/lib/oneroster-client"
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

// Helper function to extract slug from sourcedId (e.g., "nice:some-slug:exercise" -> "some-slug")
function extractSlugFromSourcedId(sourcedId: string): string {
	let slug = sourcedId.startsWith("nice:") ? sourcedId.substring(5) : sourcedId
	// Remove colon-based type suffix (e.g., ":exercise", ":video", ":article")
	slug = slug.replace(/:(exercise|video|article)$/, "")
	return slug
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

	const client = new OneRosterApiClient({
		serverUrl: env.TIMEBACK_ONEROSTER_SERVER_URL,
		tokenUrl: env.TIMEBACK_TOKEN_URL,
		clientId: env.TIMEBACK_CLIENT_ID,
		clientSecret: env.TIMEBACK_CLIENT_SECRET
	})

	const courseSourcedId = `nice:${params.course}`
	const decodedUnitSlug = decodeURIComponent(params.unit)
	const unitSourcedId = `nice:${decodedUnitSlug}`

	// Fetch course
	const oneRosterCourse = await client.getCourse(courseSourcedId)
	if (!oneRosterCourse) {
		logger.warn("unit page: course not found in OneRoster", { courseSourcedId })
		notFound()
	}

	const course: Course = {
		id: oneRosterCourse.sourcedId,
		title: oneRosterCourse.title,
		path: getMetadataValue(oneRosterCourse.metadata, "path") || `/${params.subject}/${params.course}`,
		description: getMetadataValue(oneRosterCourse.metadata, "description")
	}

	// Fetch the specific unit
	const oneRosterUnit = await client.getCourseComponent(unitSourcedId)
	if (!oneRosterUnit) {
		logger.warn("unit page: unit not found in OneRoster", { unitSourcedId })
		notFound()
	}

	const unit: Unit = {
		id: oneRosterUnit.sourcedId,
		title: oneRosterUnit.title,
		path: getMetadataValue(oneRosterUnit.metadata, "path") || `/${params.subject}/${params.course}/${decodedUnitSlug}`,
		ordering: oneRosterUnit.sortOrder,
		slug: extractSlugFromSourcedId(oneRosterUnit.sourcedId),
		description: getMetadataValue(oneRosterUnit.metadata, "description")
	}

	// Fetch all units for the course (for navigation)
	const allComponents = await client.getCourseComponents(`course.sourcedId='${courseSourcedId}'`)
	const allUnits: Unit[] = allComponents
		.filter((component) => !component.parent) // Filter for units (no parent) in memory
		.map((component) => ({
			id: component.sourcedId,
			title: component.title,
			path:
				getMetadataValue(component.metadata, "path") ||
				`/${params.subject}/${params.course}/${extractSlugFromSourcedId(component.sourcedId)}`,
			ordering: component.sortOrder,
			slug: extractSlugFromSourcedId(component.sourcedId),
			description: getMetadataValue(component.metadata, "description")
		}))
		.sort((a, b) => a.ordering - b.ordering)

	// Fetch children of this unit (lessons and assessments)
	const unitChildren = await client.getCourseComponents(`parent.sourcedId='${unitSourcedId}'`)

	// Fetch ALL resources and filter in memory
	const allResourcesInSystem = await client.getAllResources("sourcedId~'nice:'")

	// Fetch ALL component resources and filter in memory for this unit and its children
	const allComponentResources = await client.getAllComponentResources("sourcedId~'nice:'")

	// Get resources for this unit specifically (assessments)
	const unitComponentResources = allComponentResources.filter((cr) => cr.courseComponent.sourcedId === unitSourcedId)

	// Get resources for unit's children (lessons)
	const childIds = new Set(unitChildren.map((c) => c.sourcedId))
	const childComponentResources = allComponentResources.filter((cr) => childIds.has(cr.courseComponent.sourcedId))

	// Get unique resource IDs from ALL component resources for the course (not just this unit)
	// This is needed because resources might be shared across units
	const allCourseComponents = await client.getCourseComponents(`course.sourcedId='${courseSourcedId}'`)
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
				const resourceSlug = extractSlugFromSourcedId(resource.sourcedId)

				if (assessmentType === "Quiz") {
					unitAssessments.push({
						id: resource.sourcedId,
						title: resource.title,
						path:
							getMetadataValue(resource.metadata, "path") ||
							`/${params.subject}/${params.course}/${decodedUnitSlug}/quiz/${resourceSlug}`,
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
						path:
							getMetadataValue(resource.metadata, "path") ||
							`/${params.subject}/${params.course}/${decodedUnitSlug}/test/${resourceSlug}`,
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
		const childSlug = extractSlugFromSourcedId(child.sourcedId)
		const lessonResources = resourcesByComponentId.get(child.sourcedId) || []

		const videos: Video[] = []
		const articles: Article[] = []
		const exercises: Exercise[] = []

		// Categorize resources by type
		for (const resource of lessonResources) {
			const resourceType = getMetadataValue(resource.metadata, "type")
			const subType = getMetadataValue(resource.metadata, "subType")
			const lessonType = getMetadataValue(resource.metadata, "lessonType")
			const resourceSlug = extractSlugFromSourcedId(resource.sourcedId)

			// Find the componentResource to get the sortOrder
			const componentResource = childComponentResources.find(
				(cr) => cr.courseComponent.sourcedId === child.sourcedId && cr.resource.sourcedId === resource.sourcedId
			)
			const ordering = componentResource?.sortOrder || 0

			if (resourceType === "video") {
				const youtubeUrl = getMetadataValue(resource.metadata, "url") || ""
				const youtubeMatch = youtubeUrl.match(/[?&]v=([^&]+)/)
				const youtubeId = youtubeMatch ? youtubeMatch[1] : ""

				videos.push({
					id: resource.sourcedId,
					title: resource.title,
					path:
						getMetadataValue(resource.metadata, "path") ||
						`/${params.subject}/${params.course}/${decodedUnitSlug}/${childSlug}/v/${resourceSlug}`,
					slug: resourceSlug,
					description: getMetadataValue(resource.metadata, "description") || "",
					youtubeId: youtubeId || "",
					duration: getMetadataNumber(resource.metadata, "duration"),
					ordering
				})
			} else if (resourceType === "qti" && subType === "qti-stimulus") {
				// This is an article
				articles.push({
					id: resource.sourcedId,
					title: resource.title,
					path:
						getMetadataValue(resource.metadata, "path") ||
						`/${params.subject}/${params.course}/${decodedUnitSlug}/${childSlug}/a/${resourceSlug}`,
					slug: resourceSlug,
					description: getMetadataValue(resource.metadata, "description") || "",
					perseusContent: null, // Will be fetched from QTI server
					ordering
				})
			} else if (resourceType === "qti" && subType === "qti-test" && !lessonType) {
				// This is an exercise (test without lessonType means it's an exercise)
				logger.debug("including exercise with new format", { sourcedId: resource.sourcedId })
				exercises.push({
					id: resource.sourcedId,
					title: resource.title,
					path:
						getMetadataValue(resource.metadata, "path") ||
						`/${params.subject}/${params.course}/${decodedUnitSlug}/${childSlug}/e/${resourceSlug}`,
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

		processedLessons.push({
			id: child.sourcedId,
			title: child.title,
			path:
				getMetadataValue(child.metadata, "path") ||
				`/${params.subject}/${params.course}/${decodedUnitSlug}/${childSlug}`,
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
	const allComponentsForLessonCount = await client.getCourseComponents(`course.sourcedId='${courseSourcedId}'`)
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
