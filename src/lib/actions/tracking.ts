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
		// This is a non-critical background task. Re-throw the error to allow the
		// client to decide how to handle it, but it shouldn't block the UI.
		throw errors.wrap(result.error, "track article view")
	}

	logger.info("successfully tracked article view", { userId, articleSourcedId, resultSourcedId })
}

/**
 * Updates the video progress for a user by creating or updating an AssessmentResult
 * in the OneRoster gradebook.
 *
 * This is a fire-and-forget action that tracks how much of a video has been watched.
 * It marks the video as "completed" once the user watches 95% or more of the content.
 *
 * @param userSourceId - The OneRoster sourcedId of the user.
 * @param videoId - The sourcedId of the video resource.
 * @param currentTime - The current playback time in seconds.
 * @param duration - The total duration of the video in seconds.
 */
export async function updateVideoProgress(
	userSourceId: string,
	videoId: string,
	currentTime: number,
	duration: number
): Promise<void> {
	if (duration <= 0) {
		logger.warn("video progress tracking skipped", { videoId, reason: "invalid duration" })
		return
	}

	const percentComplete = Math.round((currentTime / duration) * 100)
	logger.debug("tracking video progress", { userSourceId, videoId, percentComplete })

	// Define the completion threshold.
	const COMPLETION_THRESHOLD = 95
	const isCompleted = percentComplete >= COMPLETION_THRESHOLD

	// The score is a float from 0.0 to 1.0. Set to 1.0 upon completion.
	const score = isCompleted ? 1.0 : Number.parseFloat((percentComplete / 100).toFixed(2))
	// The status becomes 'fully graded' upon completion, which marks it as complete in the UI.
	const scoreStatus = isCompleted ? ("fully graded" as const) : ("partially graded" as const)

	// The sourcedId for the line item is the same as the video resource's sourcedId.
	const lineItemSourcedId = videoId
	// The result's sourcedId is deterministic to ensure idempotency.
	const resultSourcedId = `result:${userSourceId}:${lineItemSourcedId}`

	const resultPayload = {
		result: {
			assessmentLineItem: { sourcedId: lineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: userSourceId, type: "user" as const },
			scoreStatus,
			scoreDate: new Date().toISOString(),
			score
		}
	}

	const result = await errors.try(oneroster.putResult(resultSourcedId, resultPayload))
	if (result.error) {
		// This is a non-critical background task. Log the error for observability
		// but do not re-throw, as it should not interrupt the user's experience.
		logger.error("failed to update video progress", {
			userSourceId,
			videoId,
			error: result.error
		})
		// This is a non-critical background task. Re-throw the error to allow the
		// client to decide how to handle it, but it shouldn't block the UI.
		throw errors.wrap(result.error, "update video progress")
	}

	logger.info("successfully updated video progress", {
		userSourceId,
		videoId,
		score,
		status: scoreStatus
	})
}
