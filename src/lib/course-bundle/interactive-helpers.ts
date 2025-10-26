import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import {
	findLessonResources,
	getCourseResourceBundleLookups,
	type CourseResourceBundle
} from "@/lib/oneroster/redis/api"
import { ComponentMetadataSchema } from "@/lib/metadata/oneroster"

type InteractiveAssessmentType = "Quiz" | "UnitTest" | "CourseChallenge"
type LessonResourceMatch = {
	resource: CourseResourceBundle["resources"][number]
	componentResource: CourseResourceBundle["componentResources"][number]
}

export function findResourceInLessonBySlugAndTypeBundle(options: {
	bundle: CourseResourceBundle
	lessonSourcedId: string
	slug: string
	activityType: "Article" | "Video" | "Exercise"
}): LessonResourceMatch {
	const { bundle, lessonSourcedId, slug, activityType } = options
	const lookups = getCourseResourceBundleLookups(bundle)
	const lessonResources = findLessonResources(bundle, lessonSourcedId)

	const matches = lessonResources
		.map((cr) => {
			const resource = lookups.resourcesById.get(cr.resource.sourcedId)
			if (!resource) {
				logger.error("bundle lesson lookup missing resource", {
					courseId: bundle.courseId,
					lessonSourcedId,
					resourceSourcedId: cr.resource.sourcedId
				})
				return null
			}
			if (resource.metadata.khanSlug !== slug) return null
			if (resource.metadata.khanActivityType !== activityType) return null
			return { resource, componentResource: cr }
		})
		.filter((value): value is LessonResourceMatch => value !== null)

	if (matches.length === 0) {
		logger.error("bundle lesson lookup failed", { courseId: bundle.courseId, lessonSourcedId, slug, activityType })
		notFound()
	}
	if (matches.length > 1) {
		logger.error("bundle lesson lookup ambiguous", {
			courseId: bundle.courseId,
			lessonSourcedId,
			slug,
			activityType,
			matchCount: matches.length
		})
		throw errors.new("ambiguous bundle lesson lookup")
	}

	return matches[0]!
}

export function findAndValidateResourceBundle(options: {
	bundle: CourseResourceBundle
	slug: string
	activityType: InteractiveAssessmentType
}) {
	const { bundle, slug, activityType } = options
	const match = bundle.resources.find(
		(resource) => resource.metadata.khanSlug === slug && resource.metadata.khanActivityType === activityType
	)
	if (!match) {
		logger.error("bundle resource lookup failed", { courseId: bundle.courseId, slug, activityType })
		notFound()
	}
	return match
}

export function findComponentResourceWithContextBundle(options: {
	bundle: CourseResourceBundle
	resourceSourcedId: string
	parentComponentSourcedId: string
}) {
	const { bundle, resourceSourcedId, parentComponentSourcedId } = options
	const lookups = getCourseResourceBundleLookups(bundle)
	const candidates = bundle.componentResources.filter((cr) => cr.resource.sourcedId === resourceSourcedId)

	if (candidates.length === 0) {
		logger.error("bundle component resource missing", {
			courseId: bundle.courseId,
			resourceSourcedId
		})
		notFound()
	}

	const direct = candidates.find((cr) => cr.courseComponent.sourcedId === parentComponentSourcedId)
	if (direct) return direct

	if (candidates.length === 1) {
		logger.warn("bundle component resource fallback", {
			courseId: bundle.courseId,
			resourceSourcedId,
			componentResourceId: candidates[0]!.sourcedId,
			parentComponentSourcedId
		})
		return candidates[0]!
	}

	for (const candidate of candidates) {
		const component = lookups.courseComponentsById.get(candidate.courseComponent.sourcedId)
		if (component?.parent?.sourcedId === parentComponentSourcedId) {
			return candidate
		}
	}

	logger.error("bundle component resource unresolved", {
		courseId: bundle.courseId,
		resourceSourcedId,
		parentComponentSourcedId,
		candidateCount: candidates.length
	})
	notFound()
}

export function findCourseChallengeBundle(options: { bundle: CourseResourceBundle; slug: string }) {
	const { bundle, slug } = options
	const lookups = getCourseResourceBundleLookups(bundle)

	const challengeComponent = bundle.courseComponents.find((component) => {
		const metadataResult = ComponentMetadataSchema.safeParse(component.metadata)
		return metadataResult.success && metadataResult.data.khanSlug === "course-challenge"
	})

	if (!challengeComponent) {
		logger.error("bundle course challenge component missing", { courseId: bundle.courseId })
		notFound()
	}

	const matches = bundle.componentResources
		.filter((cr) => cr.courseComponent.sourcedId === challengeComponent.sourcedId)
		.map((cr) => {
			const resource = lookups.resourcesById.get(cr.resource.sourcedId)
			if (!resource) return null
			if (resource.metadata.khanActivityType !== "CourseChallenge") return null
			if (resource.metadata.khanSlug !== slug) return null
			return { resource, componentResource: cr }
		})
		.filter((value): value is LessonResourceMatch => value !== null)

	if (matches.length === 0) {
		logger.error("bundle course challenge lookup failed", { courseId: bundle.courseId, slug })
		notFound()
	}
	if (matches.length > 1) {
		logger.error("bundle course challenge lookup ambiguous", {
			courseId: bundle.courseId,
			slug,
			matchCount: matches.length
		})
		throw errors.new("ambiguous bundle course challenge lookup")
	}

	return {
		resource: matches[0]!.resource,
		componentResource: matches[0]!.componentResource,
		onerosterCourseSourcedId: bundle.courseId
	}
}
