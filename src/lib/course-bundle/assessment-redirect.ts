import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import {
	getAllCoursesBySlug,
	getComponentResourcesByResourceId,
	getCourseComponentsBySourcedId,
	getResourcesBySlugAndType,
	type CourseResourceBundle
} from "@/lib/oneroster/redis/api"
import { ComponentMetadataSchema, CourseMetadataSchema } from "@/lib/metadata/oneroster"
import type { ComponentMetadata } from "@/lib/metadata/oneroster"
import type { CourseComponentRead } from "@/lib/oneroster"
import { assertNoEncodedColons } from "@/lib/utils"
import { getCachedCourseResourceBundleWithLookups } from "@/lib/oneroster/react/course-bundle"

type CourseBundleLookups = Awaited<ReturnType<typeof getCachedCourseResourceBundleWithLookups>>["lookups"]

export interface AssessmentRedirectParams {
	subject: string
	course: string
	unit: string
	assessment: string
	assessmentType: "quiz" | "unittest"
}

export async function findAssessmentRedirectPathBase(params: AssessmentRedirectParams): Promise<string> {
	assertNoEncodedColons(params.unit, "findAssessmentRedirectPath unit parameter")
	assertNoEncodedColons(params.assessment, "findAssessmentRedirectPath assessment parameter")

	const activityType = params.assessmentType === "quiz" ? "Quiz" : "UnitTest"

	const resourceResult = await errors.try(
		getResourcesBySlugAndType(params.assessment, "interactive", activityType)
	)
	if (resourceResult.error) {
		logger.error("assessment redirect: failed to load resource by slug", {
			slug: params.assessment,
			activityType,
			error: resourceResult.error
		})
		throw errors.wrap(resourceResult.error, "fetch assessment resource")
	}

	const resource = resourceResult.data[0]
	if (!resource) {
		logger.warn("assessment redirect: resource not found", {
			slug: params.assessment,
			activityType
		})
		notFound()
	}

	const courseResult = await errors.try(getAllCoursesBySlug(params.course))
	if (courseResult.error) {
		logger.error("assessment redirect: failed to fetch course", {
			slug: params.course,
			error: courseResult.error
		})
		throw errors.wrap(courseResult.error, "fetch course by slug")
	}

	const courseRecord = courseResult.data[0]
	if (!courseRecord) {
		logger.error("assessment redirect: course not found", { slug: params.course })
		notFound()
	}

	const courseMetadataResult = CourseMetadataSchema.safeParse(courseRecord.metadata)
	if (!courseMetadataResult.success) {
		logger.error("assessment redirect: invalid course metadata", {
			courseId: courseRecord.sourcedId,
			error: courseMetadataResult.error
		})
		throw errors.wrap(courseMetadataResult.error, "invalid course metadata")
	}
	const courseMetadata = courseMetadataResult.data

	const { bundle, lookups } = await getCachedCourseResourceBundleWithLookups(courseRecord.sourcedId)

	const componentResources = await getComponentResourcesByResourceId(resource.sourcedId)
	if (componentResources.length === 0) {
		logger.warn("assessment redirect: no component resources for resource", {
			resourceSourcedId: resource.sourcedId
		})
		notFound()
	}

	const candidatePaths = new Set<string>()

	for (const componentResource of componentResources) {
		const component = lookups.courseComponentsById.get(componentResource.courseComponent.sourcedId)
		if (!component) {
			const componentResult = await errors.try(
				getCourseComponentsBySourcedId(componentResource.courseComponent.sourcedId)
			)
			if (!componentResult.error) {
				for (const other of componentResult.data) {
					if (other.course?.sourcedId && other.course.sourcedId !== bundle.courseId) {
						logger.debug("assessment redirect: resource also linked to different course", {
							resourceSourcedId: resource.sourcedId,
							courseId: other.course.sourcedId
						})
					}
				}
			}
			continue
		}

		if (!component.parent?.sourcedId) {
			logger.error("assessment redirect: component missing parent", {
				componentId: component.sourcedId,
				resourceSourcedId: resource.sourcedId
			})
			throw errors.new("assessment redirect: component missing parent unit")
		}

		const unitComponent = lookups.courseComponentsById.get(component.parent.sourcedId)
		if (!unitComponent) {
			logger.error("assessment redirect: unit component missing from bundle", {
				unitComponentId: component.parent.sourcedId,
				resourceSourcedId: resource.sourcedId
			})
			throw errors.new("assessment redirect: unit component missing")
		}

		const unitMetaResult = ComponentMetadataSchema.safeParse(unitComponent.metadata)
		if (!unitMetaResult.success) {
			logger.error("assessment redirect: invalid unit metadata", {
				unitComponentId: unitComponent.sourcedId,
				error: unitMetaResult.error
			})
			throw errors.wrap(unitMetaResult.error, "invalid unit metadata")
		}

		const lessonSlug = resolveLessonSlugForUnit(bundle, lookups, unitComponent, unitMetaResult.data)
		const pathSegment = params.assessmentType === "quiz" ? "quiz" : "test"
		const candidatePath = `/${params.subject}/${courseMetadata.khanSlug}/${unitMetaResult.data.khanSlug}/${lessonSlug}/${pathSegment}/${params.assessment}`
		candidatePaths.add(candidatePath)
	}

	if (candidatePaths.size === 0) {
		logger.warn("assessment redirect: no candidate paths found within bundle", {
			courseId: bundle.courseId,
			resourceSourcedId: resource.sourcedId
		})
		notFound()
	}

	if (candidatePaths.size > 1) {
		logger.error("assessment redirect: multiple candidate paths for resource", {
			courseId: bundle.courseId,
			resourceSourcedId: resource.sourcedId,
			paths: Array.from(candidatePaths)
		})
		throw errors.new("assessment redirect: ambiguous assessment path")
	}

	return candidatePaths.values().next().value!
}


function resolveLessonSlugForUnit(
	bundle: CourseResourceBundle,
	lookups: CourseBundleLookups,
	unitComponent: CourseComponentRead,
	unitMetadata: ComponentMetadata
): string {
	const childComponents = bundle.courseComponents.filter((component) => component.parent?.sourcedId === unitComponent.sourcedId)
	const lessonComponents = childComponents.filter((component) => {
		const resources = lookups.componentResourcesByComponentId.get(component.sourcedId)
		if (!resources) {
			logger.warn("assessment redirect: child component missing resources in bundle", {
				unitId: unitComponent.sourcedId,
				childComponentId: component.sourcedId
			})
			return true
		}
		return !resources.some((cr) => {
			const resource = lookups.resourcesById.get(cr.resource.sourcedId)
			if (!resource) return false
			return resource.metadata.khanActivityType === "Quiz" || resource.metadata.khanActivityType === "UnitTest"
		})
	})

	if (lessonComponents.length === 0) {
		logger.error("assessment redirect: no lessons found for unit", {
			unitId: unitComponent.sourcedId,
			unitSlug: unitMetadata.khanSlug
		})
		throw errors.new("assessment redirect: no lessons for unit")
	}

	const sorted = [...lessonComponents].sort((a, b) => {
		if (typeof a.sortOrder !== "number") {
			logger.error("assessment redirect: component missing sortOrder", {
				componentId: a.sourcedId,
				context: "resolveLessonSlugForUnit"
			})
			throw errors.new("assessment redirect: missing sortOrder on component")
		}
		if (typeof b.sortOrder !== "number") {
			logger.error("assessment redirect: component missing sortOrder", {
				componentId: b.sourcedId,
				context: "resolveLessonSlugForUnit"
			})
			throw errors.new("assessment redirect: missing sortOrder on component")
		}
		return a.sortOrder - b.sortOrder
	})
	const lastComponent = sorted[sorted.length - 1]
	if (!lastComponent) {
		logger.error("assessment redirect: unable to resolve lesson slug", {
			unitId: unitComponent.sourcedId,
			unitSlug: unitMetadata.khanSlug
		})
		throw errors.new("assessment redirect: lesson ordering missing")
	}
	const lastMetadataResult = ComponentMetadataSchema.safeParse(lastComponent.metadata)
	if (!lastMetadataResult.success) {
		logger.error("assessment redirect: invalid lesson metadata", {
			lessonComponentId: lastComponent.sourcedId,
			error: lastMetadataResult.error
		})
		throw errors.wrap(lastMetadataResult.error, "invalid lesson metadata")
	}

	return lastMetadataResult.data.khanSlug
}
