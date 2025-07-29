import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import {
	getAllComponentResources,
	getAllCourses,
	getCourseComponentsByCourseId,
	getResourcesBySlugAndType
} from "@/lib/data/fetchers/oneroster"
import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import { assertNoEncodedColons } from "@/lib/utils"

type ResourceType = "article" | "exercise" | "video"

/**
 * Finds the full path for a resource given its slug and type
 * This implementation uses OneRoster data instead of database queries
 */
export async function findResourcePath(slug: string, type: ResourceType): Promise<string | null> {
	logger.info("finding resource path", { slug, type })

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(slug, "findResourcePath slug parameter")

	// Step 1: Find the resource by slug and type
	const onerosterType = type === "article" || type === "exercise" ? "qti" : "video"

	const resourcesResult = await errors.try(getResourcesBySlugAndType(slug, onerosterType))
	if (resourcesResult.error) {
		logger.error("failed to find resource by slug", { slug, type, error: resourcesResult.error })
		return null
	}

	// For exercises and articles (both QTI), we need to filter further
	let resource = null
	if (type === "exercise") {
		// Filter to only exercises (QTI resources without khanLessonType)
		for (const r of resourcesResult.data) {
			const metadataResult = ResourceMetadataSchema.safeParse(r.metadata)
			if (
				metadataResult.success &&
				metadataResult.data.type === "qti" &&
				metadataResult.data.subType === "qti-test" &&
				!metadataResult.data.khanLessonType
			) {
				resource = r
				break
			}
		}
	} else if (type === "article") {
		// Filter to only articles (QTI stimulus resources)
		for (const r of resourcesResult.data) {
			const metadataResult = ResourceMetadataSchema.safeParse(r.metadata)
			if (
				metadataResult.success &&
				metadataResult.data.type === "qti" &&
				metadataResult.data.subType === "qti-stimulus"
			) {
				resource = r
				break
			}
		}
	} else {
		// For videos, just take the first one
		resource = resourcesResult.data[0] || null
	}

	if (!resource) {
		logger.warn("resource not found", { slug, type })
		return null
	}

	// Validate resource metadata
	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("invalid resource metadata", {
			resourceSourcedId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		return null
	}

	// Step 2: Find the ComponentResource link to get the component (lesson) that contains this resource
	const componentResourcesResult = await errors.try(getAllComponentResources())
	if (componentResourcesResult.error) {
		logger.error("failed to fetch component resources", { error: componentResourcesResult.error })
		return null
	}

	const componentResource = componentResourcesResult.data.find((cr) => cr.resource.sourcedId === resource.sourcedId)

	if (!componentResource) {
		logger.error("component resource link not found", { resourceSourcedId: resource.sourcedId })
		return null
	}

	const componentSourcedId = componentResource.courseComponent.sourcedId

	// Step 3: Get all courses to search through them
	const coursesResult = await errors.try(getAllCourses())
	if (coursesResult.error) {
		logger.error("failed to fetch courses", { error: coursesResult.error })
		return null
	}

	// Step 4: For each course, get its components and check if our component is in there
	for (const course of coursesResult.data) {
		const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
		if (!courseMetadataResult.success) {
			logger.debug("skipping course with invalid metadata", { courseSourcedId: course.sourcedId })
			continue
		}

		// Get all components for this course
		const componentsResult = await errors.try(getCourseComponentsByCourseId(course.sourcedId))
		if (componentsResult.error) {
			logger.debug("failed to get components for course", { courseSourcedId: course.sourcedId })
			continue
		}

		// Check if our component is in this course
		const lessonComponent = componentsResult.data.find((c) => c.sourcedId === componentSourcedId)
		if (!lessonComponent) {
			continue
		}

		// Found the lesson! Now validate its metadata
		const lessonMetadataResult = ComponentMetadataSchema.safeParse(lessonComponent.metadata)
		if (!lessonMetadataResult.success) {
			logger.error("invalid lesson metadata", {
				lessonSourcedId: lessonComponent.sourcedId,
				error: lessonMetadataResult.error
			})
			return null
		}

		// Find the parent unit
		const unitSourcedId = lessonComponent.parent?.sourcedId
		if (!unitSourcedId) {
			logger.error("lesson has no parent unit", { lessonSourcedId: lessonComponent.sourcedId })
			return null
		}

		const unitComponent = componentsResult.data.find((c) => c.sourcedId === unitSourcedId)
		if (!unitComponent) {
			logger.error("unit component not found", { unitSourcedId })
			return null
		}

		// Validate unit metadata
		const unitMetadataResult = ComponentMetadataSchema.safeParse(unitComponent.metadata)
		if (!unitMetadataResult.success) {
			logger.error("invalid unit metadata", {
				unitSourcedId,
				error: unitMetadataResult.error
			})
			return null
		}

		// Build the path
		let pathSegment: string
		switch (type) {
			case "article":
				pathSegment = "a"
				break
			case "exercise":
				pathSegment = "e"
				break
			case "video":
				pathSegment = "v"
				break
		}

		const path = `/${courseMetadataResult.data.khanSubjectSlug}/${courseMetadataResult.data.khanSlug}/${unitMetadataResult.data.khanSlug}/${lessonMetadataResult.data.khanSlug}/${pathSegment}/${resourceMetadataResult.data.khanSlug}`

		logger.info("found resource path", { slug, type, path })
		return path
	}

	// If we've gone through all courses and didn't find the component, something is wrong
	logger.error("could not find course containing component", { componentSourcedId })
	return null
}
