import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import {
	getComponentResourcesByResourceId,
	getCourse,
	getCourseComponentsBySourcedId,
	getResourcesBySlugAndType
} from "@/lib/oneroster/redis/api"
import { ComponentMetadataSchema, CourseMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type { CourseMetadata } from "@/lib/metadata/oneroster"
import type { CourseComponentRead } from "@/lib/oneroster"
import { assertNoEncodedColons } from "@/lib/utils"
import { getCachedCourseResourceBundleWithLookups } from "@/lib/oneroster/react/course-bundle"

type ResourceType = "article" | "exercise" | "video"

export async function findResourcePath(slug: string, type: ResourceType): Promise<string | null> {
	logger.info("resource redirect: locating resource", { slug, type })
	assertNoEncodedColons(slug, "findResourcePath slug parameter")

	const activityType = type === "article" ? "Article" : type === "video" ? "Video" : "Exercise"

	const resourceResult = await errors.try(getResourcesBySlugAndType(slug, "interactive", activityType))
	if (resourceResult.error) {
		logger.error("resource redirect: failed to load resource by slug", {
			slug,
			type,
			error: resourceResult.error
		})
		return null
	}

	const resource = resourceResult.data.find((candidate) => {
		const metadata = ResourceMetadataSchema.safeParse(candidate.metadata)
		return metadata.success && metadata.data.khanActivityType === activityType
	})

	if (!resource) {
		logger.warn("resource redirect: resource not found for slug", { slug, type })
		return null
	}

	const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!resourceMetadataResult.success) {
		logger.error("resource redirect: invalid resource metadata", {
			resourceSourcedId: resource.sourcedId,
			error: resourceMetadataResult.error
		})
		return null
	}
	const resourceMetadata = resourceMetadataResult.data

	const componentResources = await getComponentResourcesByResourceId(resource.sourcedId)
	if (componentResources.length === 0) {
		logger.warn("resource redirect: no component resources for resource", { resourceSourcedId: resource.sourcedId })
		return null
	}

	const componentCache = new Map<string, CourseComponentRead>()
	const courseMetadataCache = new Map<string, CourseMetadata>()

	for (const componentResource of componentResources) {
		const componentId = componentResource.courseComponent.sourcedId
		let component = componentCache.get(componentId)
		if (!component) {
			const componentResult = await errors.try(getCourseComponentsBySourcedId(componentId))
			if (componentResult.error) {
				logger.error("resource redirect: failed to load component", {
					componentId,
					error: componentResult.error
				})
				continue
			}
			component = componentResult.data[0]
			if (!component) {
				logger.warn("resource redirect: component not found for component resource", { componentId })
				continue
			}
			componentCache.set(componentId, component)
		}

		const courseId = component.course?.sourcedId
		if (!courseId) {
			logger.error("resource redirect: component missing course reference", { componentId })
			continue
		}

		const bundleEntry = await getCachedCourseResourceBundleWithLookups(courseId)

		const { bundle, lookups } = bundleEntry
		const bundleComponent = lookups.courseComponentsById.get(componentId)
		if (!bundleComponent) {
			logger.warn("resource redirect: component not present in course bundle", {
				componentId,
				courseId: bundle.courseId
			})
			continue
		}

		if (!bundleComponent.parent?.sourcedId) {
			logger.error("resource redirect: component missing parent", {
				componentId,
				courseId: bundle.courseId
			})
			continue
		}

		const unitComponent = lookups.courseComponentsById.get(bundleComponent.parent.sourcedId)
		if (!unitComponent) {
			logger.error("resource redirect: unit component missing in bundle", {
				unitComponentId: bundleComponent.parent.sourcedId,
				courseId: bundle.courseId
			})
			continue
		}

		const lessonMetaResult = ComponentMetadataSchema.safeParse(bundleComponent.metadata)
		if (!lessonMetaResult.success) {
			logger.error("resource redirect: invalid lesson metadata", {
				componentId,
				error: lessonMetaResult.error
			})
			continue
		}

		const unitMetaResult = ComponentMetadataSchema.safeParse(unitComponent.metadata)
		if (!unitMetaResult.success) {
			logger.error("resource redirect: invalid unit metadata", {
				unitComponentId: unitComponent.sourcedId,
				error: unitMetaResult.error
			})
			continue
		}

		let courseMetadata = courseMetadataCache.get(courseId)
		if (!courseMetadata) {
			const courseResult = await errors.try(getCourse(courseId))
			if (courseResult.error || !courseResult.data) {
				logger.error("resource redirect: failed to load course metadata", {
					courseId,
					error: courseResult.error
				})
				continue
			}
			const parsed = CourseMetadataSchema.safeParse(courseResult.data.metadata)
			if (!parsed.success) {
				logger.error("resource redirect: invalid course metadata", {
					courseId,
					error: parsed.error
				})
				continue
			}
			courseMetadata = parsed.data
			courseMetadataCache.set(courseId, courseMetadata)
		}

		const pathSegment = type === "article" ? "a" : type === "video" ? "v" : "e"
		const path = `/${courseMetadata.khanSubjectSlug}/${courseMetadata.khanSlug}/${unitMetaResult.data.khanSlug}/${lessonMetaResult.data.khanSlug}/${pathSegment}/${resourceMetadata.khanSlug}`

		logger.info("resource redirect: resolved resource path", {
			slug,
			type,
			courseId,
			path
		})
		return path
	}

	logger.warn("resource redirect: no matching course found for resource", {
		resourceSourcedId: resource.sourcedId
	})
	return null
}
