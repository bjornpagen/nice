"use server"

import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import {
	getAllComponentResources,
	getAllCoursesBySlug,
	getAllResources,
	getCourseComponentByCourseAndSlug,
	getResourcesBySlugAndType
} from "@/lib/data/fetchers/oneroster"
import { getAssessmentTest } from "@/lib/data/fetchers/qti"
import { prepareInteractiveAssessment } from "@/lib/interactive-assessments"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import { type ResourceMetadata, ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import type { Resource } from "@/lib/oneroster"
import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import { resolveAllQuestionsForTestFromXml } from "@/lib/qti-resolution"
import type { Question } from "@/lib/types/domain"
import { assertNoEncodedColons } from "@/lib/utils"

type InteractiveAssessmentType = "Quiz" | "UnitTest" | "CourseChallenge" | "Exercise"

// Type for ComponentResource as returned by API (uses read schema with optional types)
type ComponentResourceFromAPI = {
	sourcedId: string
	status: string
	title: string
	courseComponent: { sourcedId: string; type?: string }
	resource: { sourcedId: string; type?: string }
	sortOrder: number
}

/**
 * Finds a resource by its slug and type, and validates its metadata.
 * @internal
 */
export async function findAndValidateResource(
	slug: string,
	activityType: InteractiveAssessmentType
): Promise<Resource & { metadata: ResourceMetadata }> {
	const resourceResult = await errors.try(getResourcesBySlugAndType(slug, "interactive", activityType))
	if (resourceResult.error) {
		logger.error("failed to fetch resource by slug", { error: resourceResult.error, slug, activityType })
		throw errors.wrap(resourceResult.error, "fetch resource by slug")
	}
	const resource = resourceResult.data[0]
	if (!resource) {
		notFound()
	}

	const metadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
	if (!metadataResult.success) {
		logger.error("invalid resource metadata", { resourceSourcedId: resource.sourcedId, error: metadataResult.error })
		throw errors.wrap(metadataResult.error, "invalid resource metadata")
	}
	if (metadataResult.data.khanActivityType !== activityType) {
		logger.error("mismatched activityType for resource", {
			resourceSourcedId: resource.sourcedId,
			expected: activityType,
			actual: metadataResult.data.khanActivityType
		})
		throw errors.new("invalid activity type for page")
	}

	// Return resource with validated metadata
	return { ...resource, metadata: metadataResult.data }
}

/**
 * Finds the ComponentResource that links a resource to its parent component.
 * @internal
 */
export async function findComponentResource(resourceSourcedId: string): Promise<ComponentResourceFromAPI> {
	const allComponentResourcesResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch component resources", { error: allComponentResourcesResult.error })
		throw errors.wrap(allComponentResourcesResult.error, "fetch component resources")
	}
	const componentResource = allComponentResourcesResult.data.find((cr) => cr.resource.sourcedId === resourceSourcedId)
	if (!componentResource) {
		logger.error("could not find componentResource link for resource", { resourceSourcedId })
		notFound()
	}
	return componentResource
}

/**
 * Finds the ComponentResource that links a resource to a specific parent component (unit/lesson).
 * Used for Quiz, UnitTest, and Exercise resources that need context-aware lookup.
 * @internal
 */
export async function findComponentResourceWithContext(
	resourceSourcedId: string,
	parentComponentSourcedId: string
): Promise<ComponentResourceFromAPI> {
	const allComponentResourcesResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch component resources", { error: allComponentResourcesResult.error })
		throw errors.wrap(allComponentResourcesResult.error, "fetch component resources")
	}
	const componentResource = allComponentResourcesResult.data.find(
		(cr) => cr.resource.sourcedId === resourceSourcedId && cr.courseComponent.sourcedId === parentComponentSourcedId
	)
	if (!componentResource) {
		logger.error("could not find componentResource link for resource with context", {
			resourceSourcedId,
			parentComponentSourcedId
		})
		notFound()
	}
	return componentResource
}

/**
 * Fetches the raw QTI AssessmentTest XML and resolves all question items referenced within it.
 * @internal
 */
export async function fetchAndResolveQuestions(
	resourceSourcedId: string
): Promise<{ assessmentTest: AssessmentTest; resolvedQuestions: TestQuestionsResponse["questions"] }> {
	const assessmentTestResult = await errors.try(getAssessmentTest(resourceSourcedId))
	if (assessmentTestResult.error) {
		logger.error("failed to fetch assessment test XML", {
			testSourcedId: resourceSourcedId,
			error: assessmentTestResult.error
		})
		throw errors.wrap(assessmentTestResult.error, "fetch assessment test")
	}

	const resolvedQuestionsResult = await errors.try(resolveAllQuestionsForTestFromXml(assessmentTestResult.data))
	if (resolvedQuestionsResult.error) {
		logger.error("failed to resolve questions from qti xml", {
			testSourcedId: resourceSourcedId,
			error: resolvedQuestionsResult.error
		})
		throw errors.wrap(resolvedQuestionsResult.error, "resolve questions from qti xml")
	}

	return {
		assessmentTest: assessmentTestResult.data,
		resolvedQuestions: resolvedQuestionsResult.data
	}
}

/**
 * Prepares the final question set for the user by applying selection and ordering rules.
 * @internal
 */
export async function prepareUserQuestionSet(options: {
	resourceSourcedId: string
	componentResourceSourcedId: string
	assessmentTest: AssessmentTest
	resolvedQuestions: TestQuestionsResponse["questions"]
	rotationMode: "deterministic" | "random"
}): Promise<Question[]> {
	const user = await currentUser()
	if (!user) {
		logger.error("user authentication required for interactive assessment", {})
		throw errors.new("user authentication required")
	}
	const userMeta = parseUserPublicMetadata(user.publicMetadata)
	if (!userMeta.sourceId) {
		logger.error("user source id missing for interactive assessment", { userId: user.id })
		throw errors.new("user source id missing")
	}

	const preparedAssessment = await prepareInteractiveAssessment({
		userSourceId: userMeta.sourceId,
		resourceSourcedId: options.resourceSourcedId,
		componentResourceSourcedId: options.componentResourceSourcedId,
		assessmentTest: options.assessmentTest,
		resolvedQuestions: options.resolvedQuestions,
		rotationMode: options.rotationMode
	})

	return preparedAssessment.questions
}

/**
 * Special helper for finding course challenge resources which require complex lookup logic.
 * @internal
 */
export async function findCourseChallenge(params: { test: string; course: string; subject: string }): Promise<{
	resource: Resource & { metadata: ResourceMetadata }
	componentResource: ComponentResourceFromAPI
	onerosterCourseSourcedId: string
}> {
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.test, "findCourseChallenge test parameter")

	// Step 1: Find the course by its slug to get its sourcedId
	const courseResult = await errors.try(getAllCoursesBySlug(params.course))
	if (courseResult.error) {
		logger.error("failed to fetch course by slug", { error: courseResult.error, slug: params.course })
		throw errors.wrap(courseResult.error, "fetch course")
	}
	const course = courseResult.data[0]
	if (!course) {
		notFound()
	}
	const onerosterCourseSourcedId = course.sourcedId

	// Step 2: Find the "dummy" course component that holds course challenges
	const challengeComponentResult = await errors.try(
		getCourseComponentByCourseAndSlug(onerosterCourseSourcedId, "course-challenge")
	)
	if (challengeComponentResult.error) {
		logger.error("failed to fetch course challenge component", {
			error: challengeComponentResult.error,
			onerosterCourseSourcedId
		})
		throw errors.wrap(challengeComponentResult.error, "fetch course challenge component")
	}

	const candidateComponents = challengeComponentResult.data
	if (candidateComponents.length === 0) {
		logger.warn("course challenge component not found for course", { onerosterCourseSourcedId })
		notFound()
	}

	logger.info("found course challenge component candidates", {
		count: candidateComponents.length,
		candidates: candidateComponents.map((c) => ({ sourcedId: c.sourcedId, title: c.title })),
		onerosterCourseSourcedId
	})

	// Step 3: Find all component-resource links to determine which component to use
	const allComponentResourcesResult = await errors.try(getAllComponentResources())
	if (allComponentResourcesResult.error) {
		logger.error("failed to fetch all component resources", { error: allComponentResourcesResult.error })
		throw errors.wrap(allComponentResourcesResult.error, "fetch all component resources")
	}

	// Find which candidate component actually has resources
	let challengeComponent = null
	let relevantComponentResources: typeof allComponentResourcesResult.data = []

	for (const candidate of candidateComponents) {
		const candidateResources = allComponentResourcesResult.data.filter(
			(cr) => cr.courseComponent.sourcedId === candidate.sourcedId
		)

		if (candidateResources.length > 0) {
			challengeComponent = candidate
			relevantComponentResources = candidateResources
			logger.info("selected course challenge component with resources", {
				componentSourcedId: candidate.sourcedId,
				resourceCount: candidateResources.length
			})
			break
		}
	}

	if (!challengeComponent || relevantComponentResources.length === 0) {
		logger.warn("no course challenge component with resources found", {
			candidateCount: candidateComponents.length,
			onerosterCourseSourcedId
		})
		notFound()
	}

	// Step 4: Find the specific resource that matches the test slug
	const allRelevantResourceIds = new Set(relevantComponentResources.map((cr) => cr.resource.sourcedId))
	const allResourcesResult = await errors.try(getAllResources())
	if (allResourcesResult.error) {
		logger.error("failed to fetch all resources", { error: allResourcesResult.error })
		throw errors.wrap(allResourcesResult.error, "fetch all resources")
	}

	logger.info("searching for resource with slug", { slug: params.test })

	const testResource = allResourcesResult.data.find((res) => {
		if (!allRelevantResourceIds.has(res.sourcedId)) {
			return false
		}
		const metadataResult = ResourceMetadataSchema.safeParse(res.metadata)
		return metadataResult.success && metadataResult.data.khanSlug === params.test
	})

	if (!testResource) {
		logger.error("could not find a matching course challenge resource for slug", {
			slug: params.test,
			onerosterCourseSourcedId
		})
		notFound()
	}

	// Find the ComponentResource that links this course challenge resource to the dummy component
	const componentResource = relevantComponentResources.find(
		(cr) =>
			cr.resource.sourcedId === testResource.sourcedId && cr.courseComponent.sourcedId === challengeComponent.sourcedId
	)

	if (!componentResource) {
		logger.error("could not find componentResource linking course challenge to its component", {
			resourceSourcedId: testResource.sourcedId,
			componentSourcedId: challengeComponent.sourcedId
		})
		notFound()
	}

	// Validate the test resource metadata
	const testResourceMetadataResult = ResourceMetadataSchema.safeParse(testResource.metadata)
	if (!testResourceMetadataResult.success) {
		logger.error("invalid test resource metadata", {
			resourceSourcedId: testResource.sourcedId,
			error: testResourceMetadataResult.error
		})
		throw errors.wrap(testResourceMetadataResult.error, "invalid test resource metadata")
	}

	if (testResourceMetadataResult.data.khanActivityType !== "CourseChallenge") {
		logger.error("invalid activityType for course challenge page", {
			resourceSourcedId: testResource.sourcedId,
			expected: "CourseChallenge",
			actualActivityType: testResourceMetadataResult.data.khanActivityType
		})
		throw errors.new("invalid activity type")
	}

	return {
		resource: { ...testResource, metadata: testResourceMetadataResult.data },
		componentResource,
		onerosterCourseSourcedId
	}
}
