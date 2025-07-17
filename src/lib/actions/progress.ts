"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

export type AssessmentProgress = {
	completed: boolean
	score?: number
	proficiency?: "attempted" | "familiar" | "proficient"
}

/**
 * Fetches the user's progress for resources within a specific course unit.
 * This returns a map of resourceId -> progress details including score and proficiency.
 *
 * @param userId - The user's OneRoster sourcedId
 * @param courseSourcedId - The course sourcedId
 * @returns A map of resource IDs to their progress details
 */
export async function getUserUnitProgress(
	userId: string,
	courseSourcedId: string
): Promise<Map<string, AssessmentProgress>> {
	logger.info("fetching user unit progress", { userId, courseSourcedId })

	const progressMap = new Map<string, AssessmentProgress>()

	/**
	 * Calculate proficiency level based on score
	 * 0-70% = attempted
	 * 70-99.999% = familiar
	 * 100% = proficient
	 */
	const calculateProficiency = (score: number): "attempted" | "familiar" | "proficient" => {
		if (score >= 1.0) return "proficient"
		if (score >= 0.7) return "familiar"
		return "attempted"
	}

	// For now, we'll fetch all assessmentResults for the user
	// In a real implementation, you'd want to filter by course/unit
	const resultsResponse = await errors.try(
		oneroster.getAllResults({
			filter: `student.sourcedId='${userId}'`
		})
	)

	if (resultsResponse.error) {
		logger.error("failed to fetch user progress", { userId, error: resultsResponse.error })
		throw errors.wrap(resultsResponse.error, "fetch user progress")
	}

	// Process results to build the progress map
	for (const result of resultsResponse.data) {
		// For assessments, store score and proficiency
		if (result.scoreStatus === "fully graded" && result.score !== undefined) {
			progressMap.set(result.assessmentLineItem.sourcedId, {
				completed: true,
				score: result.score,
				proficiency: calculateProficiency(result.score)
			})
		} else if (result.scoreStatus === "fully graded") {
			// For non-scored items (like articles), just mark as completed
			progressMap.set(result.assessmentLineItem.sourcedId, {
				completed: true
			})
		}
	}

	logger.info("fetched user progress", {
		userId,
		courseSourcedId,
		completedCount: progressMap.size
	})

	return progressMap
}
