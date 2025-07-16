"use server"

import * as logger from "@superbuilders/slog"

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

	// TODO: Implement PowerPath API call here
	// For now, this is a placeholder that just logs the progress
	// In the future, this will call the PowerPath API to store the progress

	// Example of what the PowerPath integration might look like:
	/*
	const result = await errors.try(
		powerpath.updateVideoProgress({
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
