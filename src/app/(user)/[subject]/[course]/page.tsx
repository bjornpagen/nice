import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { oneroster } from "@/lib/clients"
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
async function fetchCourseData(params: { subject: string; course: string }): Promise<CourseData> {
	const courseSourcedId = `nice:${params.course}`
	logger.debug("course page: fetching course from OneRoster", { courseSourcedId })

	// Fetch course
	const oneRosterCourse = await oneroster.getCourse(courseSourcedId)
	if (!oneRosterCourse) {
		logger.warn("course page: course not found in OneRoster", { courseSourcedId })
		notFound()
	}

	const course: Course = {
		id: oneRosterCourse.sourcedId,
		title: oneRosterCourse.title,
		description: getMetadataValue(oneRosterCourse.metadata, "description"),
		path: getMetadataValue(oneRosterCourse.metadata, "path") || `/${params.subject}/${params.course}`
	}

	// Fetch all course components (units and lessons)
	const allComponents = await oneroster.getCourseComponents(`course.sourcedId='${courseSourcedId}'`)

	// Separate units (no parent) and lessons (have parent)
	const units: Unit[] = []
	const lessonsByUnitId = new Map<string, Lesson[]>()

	for (const component of allComponents) {
		const componentSlug = extractSlugFromSourcedId(component.sourcedId)

		if (!component.parent) {
			// This is a unit
			units.push({
				id: component.sourcedId,
				title: component.title,
				path: getMetadataValue(component.metadata, "path") || `/${params.subject}/${params.course}/${componentSlug}`,
				ordering: component.sortOrder
			})
		} else {
			// This is a lesson or assessment - we'll determine type later when we process resources
			const parentId = component.parent.sourcedId
			if (!lessonsByUnitId.has(parentId)) {
				lessonsByUnitId.set(parentId, [])
			}
			lessonsByUnitId.get(parentId)?.push({
				id: component.sourcedId,
				unitId: parentId,
				slug: componentSlug,
				title: component.title,
				description: getMetadataValue(component.metadata, "description"),
				path:
					getMetadataValue(component.metadata, "path") ||
					`/${params.subject}/${params.course}/${extractSlugFromSourcedId(parentId)}/${componentSlug}`,
				ordering: component.sortOrder
			})
		}
	}

	// Sort units by ordering
	units.sort((a, b) => a.ordering - b.ordering)

	// Fetch ALL resources and filter in memory
	const allResourcesInSystem = await oneroster.getAllResources("sourcedId~'nice:'")

	// Fetch ALL component resources and filter in memory
	const allComponentResources = await oneroster.getAllComponentResources("sourcedId~'nice:'")
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
		const unitLessons = lessonsByUnitId.get(unit.id) || []

		// Get resources linked directly to the unit (assessments)
		const unitResources = resourcesByComponentId.get(unit.id) || []
		const unitAssessments: UnitAssessment[] = []

		// Find assessments from unit resources
		for (const resource of unitResources) {
			const resourceType = getMetadataValue(resource.metadata, "type")
			const subType = getMetadataValue(resource.metadata, "subType")
			const lessonType = getMetadataValue(resource.metadata, "lessonType")

			if (resourceType === "qti" && subType === "qti-test" && lessonType) {
				const assessmentType = lessonType === "unittest" ? "UnitTest" : "Quiz"
				const resourceSlug = extractSlugFromSourcedId(resource.sourcedId)

				// Find the component resource to get sortOrder
				const componentResource = componentResources.find(
					(cr) => cr.courseComponent.sourcedId === unit.id && cr.resource.sourcedId === resource.sourcedId
				)

				unitAssessments.push({
					id: resource.sourcedId,
					type: assessmentType,
					parentId: unit.id,
					title: resource.title,
					slug: resourceSlug,
					path:
						getMetadataValue(resource.metadata, "path") ||
						`/${params.subject}/${params.course}/${extractSlugFromSourcedId(unit.id)}/${assessmentType.toLowerCase()}/${resourceSlug}`,
					ordering: componentResource?.sortOrder || 0,
					description: getMetadataValue(resource.metadata, "description")
				})
			}
		}

		// Process lessons with their content
		const lessonsWithContent: UnitChild[] = unitLessons.map((lesson) => {
			const lessonResources = resourcesByComponentId.get(lesson.id) || []

			const videos: Video[] = []
			const articles: Article[] = []
			const exercises: Exercise[] = []

			// Categorize resources by type (based on metadata)
			for (const resource of lessonResources) {
				const resourceType = getMetadataValue(resource.metadata, "type")
				const subType = getMetadataValue(resource.metadata, "subType")
				const lessonType = getMetadataValue(resource.metadata, "lessonType")
				const resourceSlug = extractSlugFromSourcedId(resource.sourcedId)

				// Find the componentResource to get the sortOrder
				const componentResource = componentResources.find(
					(cr) => cr.courseComponent.sourcedId === lesson.id && cr.resource.sourcedId === resource.sourcedId
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
							`/${params.subject}/${params.course}/${extractSlugFromSourcedId(lesson.unitId)}/${lesson.slug}/v/${resourceSlug}`,
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
							`/${params.subject}/${params.course}/${extractSlugFromSourcedId(lesson.unitId)}/${lesson.slug}/a/${resourceSlug}`,
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
							`/${params.subject}/${params.course}/${extractSlugFromSourcedId(lesson.unitId)}/${lesson.slug}/e/${resourceSlug}`,
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

// Force this page to be dynamic to avoid external API calls during build time
export const dynamic = "force-dynamic"

// The page component is NOT async. It orchestrates promises and renders immediately.
export default function CoursePage({ params }: { params: Promise<{ subject: string; course: string }> }) {
	logger.info("course page: received request, rendering layout immediately")

	const dataPromise = params.then(fetchCourseData)

	return <Content dataPromise={dataPromise} />
}
