"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"
import type { AssessmentResult, Resource } from "@/lib/oneroster"

/**
 * Calculates the total "banked" XP from passive content (articles, videos)
 * related to a Quiz, but ONLY for content that has been 100% completed.
 * This function awards XP for passive content in lessons that come AFTER the previous quiz
 * (or start of unit if no previous quiz) and BEFORE the current quiz,
 * but only if the user has a perfect score (1.0) for that content.
 */
export async function awardBankedXpForAssessment(
	quizResourceId: string,
	userSourcedId: string
): Promise<{ bankedXp: number; awardedResourceIds: string[] }> {
	logger.info("calculating banked xp for quiz", { quizResourceId, userSourcedId })

	// Extract just the user ID if it's in URL format
	const userId = userSourcedId.includes("/") ? userSourcedId.split("/").pop() || userSourcedId : userSourcedId

	// 1. Find the quiz's parent unit via ComponentResource
	const quizCrResult = await errors.try(
		oneroster.getAllComponentResources({
			filter: `resource.sourcedId='${quizResourceId}' AND status='active'`
		})
	)
	if (quizCrResult.error) {
		logger.error("failed to fetch quiz component resource", { error: quizCrResult.error })
		throw errors.wrap(quizCrResult.error, "quiz component resource fetch")
	}

	const quizComponentResource = quizCrResult.data[0]
	if (!quizComponentResource) {
		logger.warn("could not find component resource for quiz", { quizResourceId })
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	const parentUnitId = quizComponentResource.courseComponent.sourcedId
	const quizSortOrder = quizComponentResource.sortOrder

	// 2. Get all components in the unit to find both this quiz's position and any previous quiz
	const unitComponentsResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `parent.sourcedId='${parentUnitId}' AND status='active'`,
			orderBy: "asc",
			sort: "metadata.sortOrder"
		})
	)
	if (unitComponentsResult.error) {
		logger.error("failed to fetch unit components", { error: unitComponentsResult.error })
		throw errors.wrap(unitComponentsResult.error, "unit components fetch")
	}

	// 3. Get all ComponentResources for the unit to identify quizzes
	const unitCrResult = await errors.try(
		oneroster.getAllComponentResources({
			filter: `courseComponent.sourcedId='${parentUnitId}' AND status='active'`
		})
	)
	if (unitCrResult.error) {
		logger.error("failed to fetch unit component resources", { error: unitCrResult.error })
		throw errors.wrap(unitCrResult.error, "unit component resources fetch")
	}

	// Find all quizzes in the unit by checking resource types
	const quizResourceIds = new Set<string>()
	for (const cr of unitCrResult.data) {
		// We'll need to check if this is a quiz resource
		// For now, we'll identify them by sortOrder since quizzes are placed at specific positions
		quizResourceIds.add(cr.resource.sourcedId)
	}

	// Fetch resource details to identify which are quizzes
	const resourceIds = Array.from(quizResourceIds)
	const resourcesResult = await errors.try(
		oneroster.getAllResources({
			filter: `sourcedId@'${resourceIds.join(",")}' AND status='active'`
		})
	)
	if (resourcesResult.error) {
		logger.error("failed to fetch resources", { error: resourcesResult.error })
		throw errors.wrap(resourcesResult.error, "resources fetch")
	}

	// Identify quiz resources by their type
	const quizCrMap = new Map<string, number>() // resourceId -> sortOrder
	for (const cr of unitCrResult.data) {
		const resource = resourcesResult.data.find((r) => r.sourcedId === cr.resource.sourcedId)
		if (resource && resource.metadata?.type === "qti") {
			quizCrMap.set(resource.sourcedId, cr.sortOrder)
		}
	}

	// Find the previous quiz (the one with highest sortOrder that's still less than current quiz)
	let previousQuizSortOrder = -1
	for (const [resourceId, sortOrder] of quizCrMap.entries()) {
		if (resourceId !== quizResourceId && sortOrder < quizSortOrder && sortOrder > previousQuizSortOrder) {
			previousQuizSortOrder = sortOrder
		}
	}

	logger.info("found quiz boundaries", {
		currentQuizSortOrder: quizSortOrder,
		previousQuizSortOrder,
		totalQuizzesInUnit: quizCrMap.size
	})

	// 4. Find lessons between the previous quiz (or start) and current quiz
	const lessons = unitComponentsResult.data.filter((component) => {
		// Skip if it's a quiz or unit test (checking metadata)
		if (component.metadata?.khanLessonType === "quiz" || component.metadata?.khanLessonType === "unit-test") {
			return false
		}

		// For lessons, the sortOrder is on the CourseComponent itself
		// A lesson is eligible if its sortOrder falls in our range
		return component.sortOrder > previousQuizSortOrder && component.sortOrder < quizSortOrder
	})

	logger.info("found lessons between quizzes", {
		parentUnitId,
		previousQuizSortOrder,
		currentQuizSortOrder: quizSortOrder,
		eligibleLessonCount: lessons.length,
		eligibleLessonIds: lessons.map((l) => l.sourcedId)
	})

	if (lessons.length === 0) {
		logger.info("no lessons found between previous quiz and current quiz")
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// 5. Get all passive resources (videos, articles) from eligible lessons
	const passiveResources: Resource[] = []

	for (const lesson of lessons) {
		// Get ComponentResources for this lesson
		const lessonCrResult = await errors.try(
			oneroster.getAllComponentResources({
				filter: `courseComponent.sourcedId='${lesson.sourcedId}' AND status='active'`
			})
		)
		if (lessonCrResult.error) {
			logger.error("failed to fetch lesson component resources", {
				lessonId: lesson.sourcedId,
				error: lessonCrResult.error
			})
			continue
		}

		// All resources in eligible lessons should be considered
		const eligibleCrs = lessonCrResult.data

		if (eligibleCrs.length === 0) continue

		// Fetch the actual resources
		const resourceIds = eligibleCrs.map((cr) => cr.resource.sourcedId)
		const resourcesResult = await errors.try(
			oneroster.getAllResources({
				filter: `sourcedId@'${resourceIds.join(",")}' AND status='active'`
			})
		)
		if (resourcesResult.error) {
			logger.error("failed to fetch lesson resources", {
				lessonId: lesson.sourcedId,
				error: resourcesResult.error
			})
			continue
		}

		// Filter for passive content (articles and videos)
		const passiveContent = resourcesResult.data.filter((r) => {
			const resourceType = r.metadata?.type
			return resourceType === "video" || (resourceType === "qti" && r.metadata?.subType === "qti-stimulus")
		})
		passiveResources.push(...passiveContent)
	}

	logger.info("found passive resources between quizzes", {
		totalPassiveContent: passiveResources.length,
		resourceIds: passiveResources.map((r) => r.sourcedId)
	})

	if (passiveResources.length === 0) {
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// 6. Get resource IDs for passive content
	const passiveResourceIds = passiveResources.map((r) => r.sourcedId)

	// 7. Fetch assessment results for these resources
	logger.info("found passive resources between quizzes", {
		totalPassiveContent: passiveResourceIds.length,
		resourceIds: passiveResourceIds
	})

	if (passiveResourceIds.length === 0) {
		logger.info("no passive content found between quizzes")
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// Fetch assessment results for each resource individually
	const assessmentResultPromises = passiveResourceIds.map((resourceId) =>
		errors.try(
			oneroster.getAllResults({
				filter: `student.sourcedId='${userId}' AND assessmentLineItem.sourcedId='${resourceId}'`
			})
		)
	)

	// Wait for all results in parallel
	const assessmentResultResponses = await Promise.all(assessmentResultPromises)

	// Combine all results
	const allResults: AssessmentResult[] = []
	for (let i = 0; i < assessmentResultResponses.length; i++) {
		const response = assessmentResultResponses[i]
		if (!response || response.error) {
			logger.error("failed to fetch assessment results for resource", {
				error: response?.error,
				resourceId: passiveResourceIds[i]
			})
			// Continue with other resources instead of failing entirely
			continue
		}
		if (response.data) {
			allResults.push(...response.data)
		}
	}

	// 7. Calculate banked XP for 100% completed content
	let totalBankedXp = 0
	const awardedResourceIds: string[] = []

	for (const result of allResults) {
		// Only award XP for perfect scores (1.0)
		if (result.score === 1) {
			const resource = passiveResources.find((r) => r.sourcedId === result.assessmentLineItem.sourcedId)
			if (resource?.metadata) {
				const xpValue = resource.metadata.xp
				if (typeof xpValue === "number" && xpValue > 0) {
					totalBankedXp += xpValue
					awardedResourceIds.push(resource.sourcedId)

					logger.debug("awarding banked xp for resource", {
						resourceId: resource.sourcedId,
						resourceType: resource.metadata.type,
						xpValue,
						userScore: result.score
					})
				}
			}
		}
	}

	logger.info("calculated banked xp for completed content between quizzes", {
		bankedXp: totalBankedXp,
		awardedResourceCount: awardedResourceIds.length,
		totalPassiveContentInRange: passiveResources.length,
		previousQuizSortOrder,
		currentQuizSortOrder: quizSortOrder
	})

	return {
		bankedXp: totalBankedXp,
		awardedResourceIds
	}
}
