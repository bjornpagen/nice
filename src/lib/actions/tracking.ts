"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

/**
 * Tracks that a user has viewed an article by creating a "completed"
 * AssessmentResult in the OneRoster gradebook.
 * This action is designed to be idempotent; it will not create duplicate results.
 *
 * @param userId - The user's sourcedId.
 * @param articleSourcedId - The sourcedId of the article resource.
 */
export async function trackArticleView(userId: string, articleSourcedId: string) {
	logger.info("tracking article view", { userId, articleSourcedId })

	// The line item ID is deterministically linked to the article ID.
	const lineItemSourcedId = articleSourcedId

	// The result ID is a combination of user and line item to ensure uniqueness.
	const resultSourcedId = `result:${userId}:${lineItemSourcedId}`

	const resultPayload = {
		result: {
			assessmentLineItem: { sourcedId: lineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: userId, type: "user" as const },
			scoreStatus: "fully graded" as const,
			scoreDate: new Date().toISOString(),
			score: 1.0 // Use 1.0 to represent "completed"
		}
	}

	// Use putResult for idempotency. If the result already exists, this will
	// simply update it. If not, it will be created.
	const result = await errors.try(oneroster.putResult(resultSourcedId, resultPayload))
	if (result.error) {
		logger.error("failed to track article view", { userId, articleSourcedId, error: result.error })
		// We do not re-throw the error, as this is a non-critical background task.
		// The user's viewing experience should not be interrupted if tracking fails.
		return
	}

	logger.info("successfully tracked article view", { userId, articleSourcedId, resultSourcedId })
}

/**
 * Updates the video progress for a user.
 * This is a fire-and-forget action that tracks how much of a video has been watched.
 *
 * @param userSourceId - The OneRoster sourceId of the user
 * @param videoId - The ID of the video being tracked
 * @param currentTime - The current playback time in seconds
 * @param duration - The total duration of the video in seconds
 */
export async function updateVideoProgress(
	userSourceId: string,
	videoId: string,
	currentTime: number,
	duration: number
): Promise<void> {
	logger.debug("tracking video progress", {
		userSourceId,
		videoId,
		currentTime,
		duration,
		percentComplete: Math.round((currentTime / duration) * 100)
	})

	// TODO: Implement OneRoster API call here
	// For now, this is a placeholder that just logs the progress
	// In the future, this will call the OneRoster API to store the progress

	// Example of what the OneRoster integration might look like:
	/*
	const result = await errors.try(
		oneroster.putResult({
			student: userSourceId,
			video: videoId,
			currentTime,
			duration,
			percentComplete: Math.round((currentTime / duration) * 100)
		})
	)
	if (result.error) {
		logger.error("failed to update video progress", { error: result.error })
		// We don't throw here because this is a fire-and-forget action
		// We don't want to disrupt the user's video watching experience
		return
	}
	*/
}
