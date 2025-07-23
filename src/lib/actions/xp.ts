"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

/**
 * Calculates the total "banked" XP from passive content (articles, videos)
 * related to a Quiz, but ONLY for content that has been 100% completed.
 * This function awards XP for passive content in ALL lessons within the same unit as the quiz,
 * but only if the user has a perfect score (1.0) for that content.
 */
export async function awardBankedXpForAssessment(
	quizResourceId: string,
	userSourcedId: string
): Promise<{ bankedXp: number; awardedResourceIds: string[] }> {
	logger.info("calculating banked xp for quiz", { quizResourceId, userSourcedId })

	// 1. Find the parent unit of the quiz
	const allCrsResult = await errors.try(oneroster.getAllComponentResources())
	if (allCrsResult.error) {
		logger.error("failed to fetch component resources", { error: allCrsResult.error })
		throw errors.wrap(allCrsResult.error, "fetch component resources")
	}

	const quizCr = allCrsResult.data.find((cr) => cr.resource.sourcedId === quizResourceId)
	if (!quizCr) {
		logger.warn("could not find componentResource for quiz, cannot award banked xp", { quizResourceId })
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	const parentUnitId = quizCr.courseComponent.sourcedId

	// 2. Find all lessons that are siblings to the quiz under the same parent unit
	const allUnitComponentsResult = await errors.try(
		oneroster.getCourseComponents({
			filter: `parent.sourcedId='${parentUnitId}' AND status='active'`
		})
	)
	if (allUnitComponentsResult.error) {
		logger.error("failed to fetch unit components", {
			parentUnitId,
			error: allUnitComponentsResult.error
		})
		throw errors.wrap(allUnitComponentsResult.error, "fetch unit components")
	}

	const lessonIds = allUnitComponentsResult.data
		.filter((c) => c.metadata?.khanLessonType !== "quiz" && c.metadata?.khanLessonType !== "unittest")
		.map((c) => c.sourcedId)

	if (lessonIds.length === 0) {
		logger.info("no sibling lessons found for quiz, no banked xp to award", { parentUnitId })
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// 3. Find all passive content resources within those lessons
	const lessonCrs = allCrsResult.data.filter((cr) => lessonIds.includes(cr.courseComponent.sourcedId))
	const passiveResourceIds = lessonCrs.map((cr) => cr.resource.sourcedId)
	if (passiveResourceIds.length === 0) {
		return { bankedXp: 0, awardedResourceIds: [] }
	}

	// 4. Get ALL assessment results for this user and these resources
	const existingResultsResult = await errors.try(
		oneroster.getAllResults({
			filter: `student.sourcedId='${userSourcedId}' AND assessmentLineItem.sourcedId@'${passiveResourceIds.join(",")}'`
		})
	)
	if (existingResultsResult.error) {
		logger.error("failed to fetch assessment results", {
			userSourcedId,
			error: existingResultsResult.error
		})
		throw errors.wrap(existingResultsResult.error, "fetch assessment results")
	}

	// Create a map of resourceId -> score for quick lookup
	const resourceScoreMap = new Map<string, number>()
	for (const result of existingResultsResult.data) {
		if (result.scoreStatus === "fully graded" && typeof result.score === "number") {
			resourceScoreMap.set(result.assessmentLineItem.sourcedId, result.score)
		}
	}

	// 5. Fetch full resource details to get expectedXp
	const allResourcesResult = await errors.try(
		oneroster.getAllResources({
			filter: `sourcedId@'${passiveResourceIds.join(",")}'`
		})
	)
	if (allResourcesResult.error) {
		logger.error("failed to fetch resources", {
			error: allResourcesResult.error
		})
		throw errors.wrap(allResourcesResult.error, "fetch resources")
	}

	let bankedXp = 0
	const awardedResourceIds: string[] = []

	for (const resource of allResourcesResult.data) {
		const metadata = resource.metadata
		if (!metadata) continue

		const isPassiveContent =
			metadata.type === "video" || (metadata.type === "qti" && metadata.subType === "qti-stimulus")
		const score = resourceScoreMap.get(resource.sourcedId)

		// Only award XP if content is passive AND has been 100% completed (score = 1.0)
		if (isPassiveContent && score === 1.0) {
			const xp = metadata.xp
			if (typeof xp === "number" && xp > 0) {
				bankedXp += xp
				awardedResourceIds.push(resource.sourcedId)
				logger.debug("awarding xp for completed content", {
					resourceId: resource.sourcedId,
					xp,
					type: metadata.type
				})
			}
		} else if (isPassiveContent && score !== undefined && score < 1.0) {
			logger.debug("skipping incomplete content", {
				resourceId: resource.sourcedId,
				score,
				type: metadata.type
			})
		}
	}

	logger.info("calculated banked xp for completed content", {
		bankedXp,
		awardedResourceCount: awardedResourceIds.length,
		totalPassiveContent: passiveResourceIds.length
	})

	return { bankedXp, awardedResourceIds }
}
