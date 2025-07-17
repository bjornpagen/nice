import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import {
	getAllComponentResources,
	getAllCoursesBySlug,
	getAllResources,
	getCourseComponentsByCourseId
} from "@/lib/data/fetchers/oneroster"
import { getAllQuestionsForTest } from "@/lib/data/fetchers/qti"
import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type {
	Article,
	Course,
	CourseChallenge,
	ExerciseInfo,
	Lesson,
	Quiz,
	Unit,
	UnitChild,
	UnitTest,
	Video
} from "@/lib/types/domain"
import type { CoursePageData } from "@/lib/types/page"

export async function fetchCoursePageData(params: { subject: string; course: string }): Promise<CoursePageData> {
	logger.info("fetchCoursePageData called", { params })
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
		path: `/${params.subject}/${courseMetadata.khanSlug}` // Construct path from slugs
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
	const lessonsByUnitSourcedId = new Map<string, Lesson[]>() // Change to full Lesson type

	for (const component of allComponents) {
		// Validate component metadata with Zod
		const componentMetadataResult = ComponentMetadataSchema.safeParse(component.metadata)
		if (!componentMetadataResult.success) {
			logger.error("failed to parse component metadata", {
				componentSourcedId: component.sourcedId,
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
				path: `/${params.subject}/${params.course}/${componentMetadata.khanSlug}`, // Construct path from slugs
				ordering: component.sortOrder,
				children: [] // Initialize children array
			})
		} else {
			// This is a lesson or assessment - we'll determine type later when we process resources
			const parentSourcedId = component.parent.sourcedId
			if (!lessonsByUnitSourcedId.has(parentSourcedId)) {
				lessonsByUnitSourcedId.set(parentSourcedId, [])
			}

			// For path generation, we need the parent's slug too
			const parentComponent = allComponents.find((c) => c.sourcedId === parentSourcedId)
			if (!parentComponent) {
				logger.error("parent component not found", { parentSourcedId, childSourcedId: component.sourcedId })
				throw errors.new(`parent component ${parentSourcedId} not found for child ${component.sourcedId}`)
			}

			const parentMetadataResult = ComponentMetadataSchema.safeParse(parentComponent.metadata)
			if (!parentMetadataResult.success) {
				logger.error("failed to parse parent component metadata", {
					parentSourcedId,
					childSourcedId: component.sourcedId,
					error: parentMetadataResult.error
				})
				throw errors.wrap(parentMetadataResult.error, "invalid parent component metadata")
			}

			lessonsByUnitSourcedId.get(parentSourcedId)?.push({
				type: "Lesson", // Add missing type property
				id: component.sourcedId,
				slug: componentMetadata.khanSlug,
				title: component.title,
				description: componentMetadata.khanDescription,
				path: `/${params.subject}/${params.course}/${parentMetadataResult.data.khanSlug}/${componentMetadata.khanSlug}`, // Construct path from slugs
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
	const courseComponentSourcedIds = new Set(allComponents.map((c) => c.sourcedId))

	// Get only ComponentResources that belong to Components in this Course
	const componentResources = allComponentResources.filter((cr) =>
		courseComponentSourcedIds.has(cr.courseComponent.sourcedId)
	)

	// Get only Resources that are referenced by ComponentResources in this course
	const resourceSourcedIdsInCourse = new Set(componentResources.map((cr) => cr.resource.sourcedId))

	// Filter only resources that belong to this course
	const allResources = allResourcesInSystem.filter((resource) => resourceSourcedIdsInCourse.has(resource.sourcedId))

	logger.info("filtered resources for course", {
		totalResourcesInSystem: allResourcesInSystem.length,
		totalComponentResources: allComponentResources.length,
		relevantComponentResources: componentResources.length,
		relevantResources: allResources.length,
		courseSourcedId
	})

	// Map Resources to Components
	const resourcesByComponentSourcedId = new Map<string, typeof allResources>()
	for (const cr of componentResources) {
		const componentSourcedId = cr.courseComponent.sourcedId
		const resourceSourcedId = cr.resource.sourcedId
		const resource = allResources.find((r) => r.sourcedId === resourceSourcedId)

		if (resource) {
			if (!resourcesByComponentSourcedId.has(componentSourcedId)) {
				resourcesByComponentSourcedId.set(componentSourcedId, [])
			}
			resourcesByComponentSourcedId.get(componentSourcedId)?.push(resource)
		}
	}

	// Determine exercise IDs early
	const exerciseResourceSourcedIds = new Set<string>()
	for (const resource of allResources) {
		const metadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
		if (
			metadataResult.success &&
			metadataResult.data.type === "qti" &&
			metadataResult.data.subType === "qti-test" &&
			!metadataResult.data.khanLessonType
		) {
			exerciseResourceSourcedIds.add(resource.sourcedId)
		}
	}

	// Fetch questions for all exercises in parallel
	const exerciseQuestionsPromises = await Promise.all(
		Array.from(exerciseResourceSourcedIds).map(async (exerciseSourcedId) => {
			const result = await errors.try(getAllQuestionsForTest(exerciseSourcedId))
			if (result.error) {
				logger.error("failed to fetch questions for exercise", { exerciseSourcedId, error: result.error })
				return { exerciseSourcedId, questions: [] }
			}
			return {
				exerciseSourcedId,
				questions: result.data.questions.map((q) => ({ id: q.question.identifier }))
			}
		})
	)

	// Create questions map
	const questionsMap = new Map<string, number>()
	for (const result of exerciseQuestionsPromises) {
		questionsMap.set(result.exerciseSourcedId, result.questions.length)
	}

	// Build units with children
	const unitsWithChildren: Unit[] = units.map((unit) => {
		const unitLessons = lessonsByUnitSourcedId.get(unit.id) || []
		const unitResources = resourcesByComponentSourcedId.get(unit.id) || []

		const unitAssessments: (Quiz | UnitTest)[] = []

		// Find assessments from unit resources
		for (const resource of unitResources) {
			// Validate resource metadata with Zod
			const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
			if (!resourceMetadataResult.success) {
				logger.error("invalid resource metadata", {
					resourceSourcedId: resource.sourcedId,
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
						resourceSourcedId: resource.sourcedId,
						unitSourcedId: unit.id
					})
					throw errors.new(`component resource not found for assessment ${resource.sourcedId}`)
				}

				// Determine the URL path segment for the assessment type
				let pathSegment: string
				switch (assessmentType) {
					case "Quiz":
						pathSegment = "quiz"
						break
					case "UnitTest":
						pathSegment = "test"
						break
					default:
						throw errors.new(`unknown assessment type: ${assessmentType}`)
				}

				const assessment: Quiz | UnitTest = {
					id: resource.sourcedId,
					type: assessmentType,
					slug: resourceMetadata.khanSlug,
					title: resource.title,
					description: resourceMetadata.khanDescription,
					path: `/${params.subject}/${params.course}/${unit.slug}/${pathSegment}/${resourceMetadata.khanSlug}`,
					questions: [] // Questions are not needed on the course page
				}
				unitAssessments.push(assessment)
			}
		}

		// Process lessons with their content
		const lessonsWithContent: Lesson[] = unitLessons.map((lesson) => {
			const lessonResources = resourcesByComponentSourcedId.get(lesson.id) || []

			// Temporary types with sortOrder for sorting
			interface VideoWithOrder extends Video {
				sortOrder: number
			}
			interface ArticleWithOrder extends Article {
				sortOrder: number
			}
			interface ExerciseWithOrder extends ExerciseInfo {
				sortOrder: number
			}

			const videos: VideoWithOrder[] = []
			const articles: ArticleWithOrder[] = []
			const exercises: ExerciseWithOrder[] = []

			// Categorize resources by type
			for (const resource of lessonResources) {
				// Validate resource metadata with Zod
				const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
				if (!resourceMetadataResult.success) {
					logger.error("invalid resource metadata", {
						resourceSourcedId: resource.sourcedId,
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
					logger.error("component resource not found", {
						lessonSourcedId: lesson.id,
						resourceSourcedId: resource.sourcedId
					})
					throw errors.new(`component resource not found for lesson ${lesson.id} resource ${resource.sourcedId}`)
				}

				if (resourceMetadata.type === "video") {
					const youtubeUrl = resourceMetadata.url
					if (!youtubeUrl) {
						logger.error("video missing YouTube URL", { videoSourcedId: resource.sourcedId })
						throw errors.new("video missing YouTube URL")
					}

					const youtubeMatch = youtubeUrl.match(/[?&]v=([^&]+)/)
					if (!youtubeMatch || !youtubeMatch[1]) {
						logger.error("video has invalid youtube url", { videoSourcedId: resource.sourcedId, url: youtubeUrl })
						throw errors.new(`video ${resource.sourcedId} has invalid youtube url`)
					}
					const youtubeId = youtubeMatch[1]

					// Get lesson slug for path construction
					const lessonComponentMeta = ComponentMetadataSchema.safeParse(
						allComponents.find((c) => c.sourcedId === lesson.id)?.metadata
					)
					if (!lessonComponentMeta.success) {
						logger.error("invalid lesson component metadata for video path", { lessonSourcedId: lesson.id })
						throw errors.new("invalid lesson component metadata")
					}

					videos.push({
						id: resource.sourcedId,
						title: resource.title,
						path: `/${params.subject}/${params.course}/${unit.slug}/${lessonComponentMeta.data.khanSlug}/v/${resourceMetadata.khanSlug}`, // Construct path from slugs
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.khanDescription,
						youtubeId: youtubeId,
						duration: resourceMetadata.duration,
						type: "Video" as const,
						sortOrder: componentResource.sortOrder
					})
				} else if (resourceMetadata.type === "qti" && resourceMetadata.subType === "qti-stimulus") {
					// This is an article
					// Get lesson slug for path construction
					const lessonComponentMeta = ComponentMetadataSchema.safeParse(
						allComponents.find((c) => c.sourcedId === lesson.id)?.metadata
					)
					if (!lessonComponentMeta.success) {
						logger.error("invalid lesson component metadata for article path", { lessonSourcedId: lesson.id })
						throw errors.new("invalid lesson component metadata")
					}

					articles.push({
						type: "Article",
						id: resource.sourcedId,
						title: resource.title,
						path: `/${params.subject}/${params.course}/${unit.slug}/${lessonComponentMeta.data.khanSlug}/a/${resourceMetadata.khanSlug}`, // Construct path from slugs
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.khanDescription,
						sortOrder: componentResource.sortOrder
					})
				} else if (
					resourceMetadata.type === "qti" &&
					resourceMetadata.subType === "qti-test" &&
					!resourceMetadata.khanLessonType
				) {
					// This is an exercise
					// Get lesson slug for path construction
					const lessonComponentMeta = ComponentMetadataSchema.safeParse(
						allComponents.find((c) => c.sourcedId === lesson.id)?.metadata
					)
					if (!lessonComponentMeta.success) {
						logger.error("invalid lesson component metadata for exercise path", { lessonSourcedId: lesson.id })
						throw errors.new("invalid lesson component metadata")
					}

					const questionCount = questionsMap.get(resource.sourcedId)
					if (questionCount === undefined) {
						logger.error("CRITICAL: exercise questions not found in map", {
							exerciseSourcedId: resource.sourcedId,
							availableIds: Array.from(questionsMap.keys())
						})
						throw errors.new("exercise questions missing from fetch results")
					}
					const totalQuestions = questionCount
					const questionsToPass = totalQuestions > 0 ? totalQuestions - 1 : 0

					exercises.push({
						type: "Exercise",
						id: resource.sourcedId,
						title: resource.title,
						path: `/${params.subject}/${params.course}/${unit.slug}/${lessonComponentMeta.data.khanSlug}/e/${resourceMetadata.khanSlug}`, // Construct path from slugs
						slug: resourceMetadata.khanSlug,
						description: resourceMetadata.khanDescription,
						totalQuestions,
						questionsToPass,
						sortOrder: componentResource.sortOrder
					})
				}
			}

			// Combine all lesson children and sort by sortOrder
			const allLessonChildren = [...videos, ...articles, ...exercises]
				.sort((a, b) => a.sortOrder - b.sortOrder)
				.map(({ sortOrder, ...child }) => child) // Remove sortOrder property after sorting

			return {
				...lesson,
				children: allLessonChildren
			}
		})

		// Create a unified list of all unit children with their sort orders
		interface UnitChildWithOrder {
			child: UnitChild
			sortOrder: number
			source: "component" | "resource"
		}
		const childrenWithOrders: UnitChildWithOrder[] = []

		// Add lessons with their sort orders from components
		for (const lesson of lessonsWithContent) {
			const component = allComponents.find((c) => c.sourcedId === lesson.id)
			if (!component) {
				logger.error("lesson component not found", { lessonSourcedId: lesson.id })
				throw errors.new("lesson component missing")
			}
			if (typeof component.sortOrder !== "number") {
				logger.error("lesson component missing sortOrder", {
					lessonSourcedId: lesson.id,
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
			const componentResource = componentResources.find(
				(cr) => cr.courseComponent.sourcedId === unit.id && cr.resource.sourcedId === assessment.id
			)
			if (!componentResource) {
				logger.error("assessment component resource not found", {
					assessmentSourcedId: assessment.id,
					unitSourcedId: unit.id
				})
				throw errors.new("assessment component resource missing")
			}
			if (typeof componentResource.sortOrder !== "number") {
				logger.error("assessment component resource missing sortOrder", {
					assessmentSourcedId: assessment.id,
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
		const children: UnitChild[] = childrenWithOrders.map((item) => item.child)

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
