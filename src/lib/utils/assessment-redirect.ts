import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import {
	getAllComponentResources,
	getAllCoursesBySlug,
	getAllResources,
	getCourseComponentByCourseAndSlug,
	getCourseComponentsByParentId
} from "@/lib/data/fetchers/oneroster"
import { ComponentMetadataSchema, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import { assertNoEncodedColons } from "@/lib/utils"

export interface AssessmentRedirectParams {
	subject: string
	course: string
	unit: string
	assessment: string // quiz or test slug
	assessmentType: "quiz" | "unittest"
}

/**
 * Finds an assessment resource (quiz or unit test) within a unit's hierarchy and constructs
 * the redirect path to the last lesson containing it.
 *
 * @param params The route parameters including the assessment slug
 * @returns The redirect path to the assessment within the proper lesson structure
 * @throws notFound() if the assessment cannot be found
 */
export async function findAssessmentRedirectPath(params: AssessmentRedirectParams): Promise<string> {
	logger.info("finding assessment redirect path", {
		assessmentType: params.assessmentType,
		params
	})

	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.unit, "findAssessmentRedirectPath unit parameter")
	assertNoEncodedColons(params.assessment, "findAssessmentRedirectPath assessment parameter")

	// First, fetch the course to get its sourcedId
	const coursesResult = await errors.try(getAllCoursesBySlug(params.course))
	if (coursesResult.error) {
		logger.error("failed to fetch course by slug", {
			error: coursesResult.error,
			slug: params.course
		})
		throw errors.wrap(coursesResult.error, "fetch course")
	}
	const course = coursesResult.data[0]
	if (!course) {
		logger.error("course not found for redirect", { courseSlug: params.course })
		throw errors.new("course not found for redirect")
	}
	const courseSourcedId = course.sourcedId

	// Look up the unit by BOTH course AND slug to avoid collisions
	const unitResult = await errors.try(getCourseComponentByCourseAndSlug(courseSourcedId, params.unit))
	if (unitResult.error) {
		logger.error("failed to fetch unit by course and slug", {
			error: unitResult.error,
			courseSourcedId: courseSourcedId,
			slug: params.unit
		})
		throw errors.wrap(unitResult.error, "fetch unit by course and slug")
	}

	// Add debugging for multiple results
	if (unitResult.data.length > 1) {
		logger.warn("multiple units found with same slug", {
			slug: params.unit,
			courseSourcedId,
			foundUnits: unitResult.data.map((u) => ({
				sourcedId: u.sourcedId,
				title: u.title,
				courseSourcedId: u.course?.sourcedId
			}))
		})
	}

	const unit = unitResult.data[0]
	if (!unit) {
		// This will be caught by the page and result in a 404
		logger.error("unit not found for redirect", { unitSlug: params.unit, courseSourcedId })
		throw errors.new("unit not found for redirect")
	}
	const unitSourcedId = unit.sourcedId

	logger.debug("found unit for redirect", {
		unitSourcedId,
		unitTitle: unit.title,
		unitSlug: params.unit
	})

	// Fetch all lessons for this unit
	const lessonsResult = await errors.try(getCourseComponentsByParentId(unitSourcedId))
	if (lessonsResult.error) {
		logger.error("failed to get lessons for unit", {
			unitSourcedId,
			error: lessonsResult.error
		})
		throw errors.wrap(lessonsResult.error, "get lessons for unit")
	}

	const lessons = lessonsResult.data
	if (lessons.length === 0) {
		logger.warn("no lessons found in unit for redirect", { unitSourcedId })
		throw errors.new("no lessons found in unit")
	}

	// Fetch all resources for this unit and its lessons
	const unitAndLessonComponentSourcedIds = [unitSourcedId, ...lessons.map((l) => l.sourcedId)]
	const allComponentResourcesInUnitResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesInUnitResult.error) {
		logger.error("failed to fetch all component resources for unit and lessons", {
			unitSourcedId,
			error: allComponentResourcesInUnitResult.error
		})
		throw errors.wrap(allComponentResourcesInUnitResult.error, "fetch component resources")
	}

	const relevantComponentResources = allComponentResourcesInUnitResult.data.filter((cr) =>
		unitAndLessonComponentSourcedIds.includes(cr.courseComponent.sourcedId)
	)
	const relevantResourceIds = relevantComponentResources.map((cr) => cr.resource.sourcedId)

	const allResourcesResult = await errors.try(getAllResources())
	if (allResourcesResult.error) {
		logger.error("failed to fetch all resources for assessment validation", {
			assessmentType: params.assessmentType,
			unitSourcedId,
			error: allResourcesResult.error
		})
		throw errors.wrap(allResourcesResult.error, "fetch all resources")
	}

	// Find the assessment resource with proper URL decoding
	const assessmentResource = allResourcesResult.data.find((res) => {
		if (!relevantResourceIds.includes(res.sourcedId)) return false
		const metadataResult = ResourceMetadataSchema.safeParse(res.metadata)
		return (
			metadataResult.success &&
			metadataResult.data.khanSlug === params.assessment && // Use decoded value!
			metadataResult.data.khanActivityType === (params.assessmentType === "quiz" ? "Quiz" : "UnitTest")
		)
	})

	if (!assessmentResource) {
		logger.warn("assessment resource not found within the specified unit/lesson hierarchy", {
			unitSourcedId,
			assessmentSlug: params.assessment,
			assessmentType: params.assessmentType
		})
		notFound()
	}

	// Sort by ordering and get the last lesson's slug
	lessons.sort((a, b) => a.sortOrder - b.sortOrder)
	const lastLesson = lessons[lessons.length - 1]
	if (!lastLesson) {
		logger.warn("could not determine last lesson", { unitSourcedId })
		throw errors.new("could not determine last lesson")
	}

	// Validate lesson metadata with Zod
	const lastLessonMetadataResult = ComponentMetadataSchema.safeParse(lastLesson.metadata)
	if (!lastLessonMetadataResult.success) {
		logger.error("invalid last lesson metadata", {
			lessonSourcedId: lastLesson.sourcedId,
			error: lastLessonMetadataResult.error
		})
		throw errors.wrap(lastLessonMetadataResult.error, "invalid last lesson metadata")
	}
	const lastLessonSlug = lastLessonMetadataResult.data.khanSlug
	if (!lastLessonSlug) {
		logger.error("last lesson missing khanSlug", { lessonSourcedId: lastLesson.sourcedId })
		throw errors.new("last lesson missing khanSlug")
	}

	// Construct the redirect path based on assessment type
	const assessmentPath = params.assessmentType === "quiz" ? "quiz" : "test"
	return `/${params.subject}/${params.course}/${params.unit}/${lastLessonSlug}/${assessmentPath}/${params.assessment}`
}
