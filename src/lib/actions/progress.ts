"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

/**
 * Fetches the user's progress for resources within a specific course unit.
 * This returns a map of resourceId -> completion status.
 *
 * @param userId - The user's OneRoster sourcedId
 * @param courseSourcedId - The course sourcedId
 * @returns A map of resource IDs to their completion status
 */
export async function getUserUnitProgress(userId: string, courseSourcedId: string): Promise<Map<string, boolean>> {
	logger.info("fetching user unit progress", { userId, courseSourcedId })

	const progressMap = new Map<string, boolean>()

	// For now, we'll fetch all assessmentResults for the user
	// In a real implementation, you'd want to filter by course/unit
	const resultsResponse = await errors.try(
		oneroster.getAllResults({
			filter: `student.sourcedId='${userId}'`
		})
	)

	if (resultsResponse.error) {
		logger.error("failed to fetch user progress", { userId, error: resultsResponse.error })
		// Return empty map on error - don't disrupt the UI
		return progressMap
	}

	// Process results to build the progress map
	for (const result of resultsResponse.data) {
		// Check if the result indicates completion (score >= 1.0 and fully graded)
		if (result.scoreStatus === "fully graded" && result.score >= 1.0) {
			// The lineItem sourcedId matches the resource sourcedId
			progressMap.set(result.assessmentLineItem.sourcedId, true)
		}
	}

	logger.info("fetched user progress", {
		userId,
		courseSourcedId,
		completedCount: progressMap.size
	})

	return progressMap
}
