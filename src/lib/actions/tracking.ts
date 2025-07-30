"use server"

import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { revalidateTag } from "next/cache"
import * as cacheUtils from "@/lib/cache"
import { oneroster } from "@/lib/clients"
import { getAllCoursesBySlug } from "@/lib/data/fetchers/oneroster"

/**
 * Tracks that a user has viewed an article by creating a "completed"
 * AssessmentResult in the OneRoster gradebook.
 * This action is designed to be idempotent; it will not create duplicate results.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterArticleResourceSourcedId - The OneRoster resource sourcedId for the article
 * @param courseInfo - Slugs to identify the course for cache invalidation.
 */
export async function trackArticleView(
	onerosterUserSourcedId: string,
	onerosterArticleResourceSourcedId: string,
	courseInfo: { subjectSlug: string; courseSlug: string }
) {
	logger.info("tracking article view", { onerosterUserSourcedId, onerosterArticleResourceSourcedId })

	// The line item sourcedId is the same as the resource sourcedId
	const onerosterLineItemSourcedId = onerosterArticleResourceSourcedId

	// The result sourcedId follows our pattern
	const onerosterResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`

	const resultPayload = {
		result: {
			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: onerosterUserSourcedId, type: "user" as const },
			scoreStatus: "fully graded" as const,
			scoreDate: new Date().toISOString(),
			score: 1.0 // Use 1.0 to represent "completed"
		}
	}

	// Use putResult for idempotency. If the result already exists, this will
	// simply update it. If not, it will be created.
	const result = await errors.try(oneroster.putResult(onerosterResultSourcedId, resultPayload))
	if (result.error) {
		logger.error("failed to track article view", {
			onerosterUserSourcedId,
			onerosterArticleResourceSourcedId,
			error: result.error
		})
		// This is a non-critical background task. Re-throw the error to allow the
		// client to decide how to handle it, but it shouldn't block the UI.
		throw errors.wrap(result.error, "track article view")
	}

	// Invalidate the user progress cache for this course.
	const courseResult = await errors.try(getAllCoursesBySlug(courseInfo.courseSlug))
	if (courseResult.error || !courseResult.data[0]) {
		logger.error("failed to find course for cache invalidation", {
			courseSlug: courseInfo.courseSlug,
			error: courseResult.error
		})
	} else {
		const onerosterCourseSourcedId = courseResult.data[0].sourcedId
		const { tag } = cacheUtils.userProgressByCourse(onerosterUserSourcedId, onerosterCourseSourcedId)
		revalidateTag(tag)
		logger.info("invalidated user progress cache", { cacheTag: tag })
	}

	logger.info("successfully tracked article view", {
		onerosterUserSourcedId,
		onerosterArticleResourceSourcedId,
		onerosterResultSourcedId
	})
}

/**
 * Updates the video progress for a user by creating or updating an AssessmentResult
 * in the OneRoster gradebook.
 *
 * This is a fire-and-forget action that tracks how much of a video has been watched.
 * It marks the video as "completed" once the user watches 95% or more of the content.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterVideoResourceSourcedId - The OneRoster resource sourcedId for the video
 * @param currentTime - The current playback time in seconds.
 * @param duration - The total duration of the video in seconds.
 * @param courseInfo - Slugs to identify the course for cache invalidation.
 */
export async function updateVideoProgress(
	onerosterUserSourcedId: string,
	onerosterVideoResourceSourcedId: string,
	currentTime: number,
	duration: number,
	courseInfo: { subjectSlug: string; courseSlug: string }
): Promise<void> {
	if (duration <= 0) {
		logger.warn("video progress tracking skipped", {
			onerosterVideoResourceSourcedId,
			reason: "invalid duration",
			duration
		})
		return
	}

	const percentComplete = Math.round((currentTime / duration) * 100)
	const formattedCurrentTime = Math.floor(currentTime)
	const formattedDuration = Math.floor(duration)

	// Log detailed progress information
	logger.info("saving video progress", {
		onerosterUserSourcedId,
		onerosterVideoResourceSourcedId,
		percentComplete,
		currentTime: formattedCurrentTime,
		duration: formattedDuration,
		timeWatched: `${formattedCurrentTime}s of ${formattedDuration}s`,
		timestamp: new Date().toISOString()
	})

	// Define the completion threshold.
	const COMPLETION_THRESHOLD = 95
	const isCompleted = percentComplete >= COMPLETION_THRESHOLD

	// The score is a float from 0.0 to 1.0. Set to 1.0 upon completion.
	const score = isCompleted ? 1.0 : Number.parseFloat((percentComplete / 100).toFixed(2))
	// The status becomes 'fully graded' upon completion, which marks it as complete in the UI.
	const scoreStatus = isCompleted ? ("fully graded" as const) : ("partially graded" as const)

	// Log whether this is marking the video as complete
	if (isCompleted) {
		logger.info("video marked as complete", {
			onerosterVideoResourceSourcedId,
			onerosterUserSourcedId,
			finalPercentage: percentComplete
		})
	}

	// The line item sourcedId is the same as the video resource sourcedId
	const onerosterLineItemSourcedId = onerosterVideoResourceSourcedId
	// The result sourcedId follows our pattern
	const onerosterResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`

	const resultPayload = {
		result: {
			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: onerosterUserSourcedId, type: "user" as const },
			scoreStatus,
			scoreDate: new Date().toISOString(),
			score
		}
	}

	logger.debug("sending video progress to OneRoster", {
		onerosterResultSourcedId,
		score,
		scoreStatus,
		onerosterVideoResourceSourcedId
	})

	const result = await errors.try(oneroster.putResult(onerosterResultSourcedId, resultPayload))
	if (result.error) {
		// This is a non-critical background task. Log the error for observability
		// but do not re-throw, as it should not interrupt the user's experience.
		logger.error("failed to update video progress", {
			onerosterUserSourcedId,
			onerosterVideoResourceSourcedId,
			percentComplete,
			error: result.error
		})
		// This is a non-critical background task. Re-throw the error to allow the
		// client to decide how to handle it, but it shouldn't block the UI.
		throw errors.wrap(result.error, "update video progress")
	}

	// Invalidate the user progress cache for this course.
	const courseResult = await errors.try(getAllCoursesBySlug(courseInfo.courseSlug))
	if (courseResult.error || !courseResult.data[0]) {
		logger.error("failed to find course for cache invalidation", {
			courseSlug: courseInfo.courseSlug,
			error: courseResult.error
		})
	} else {
		const onerosterCourseSourcedId = courseResult.data[0].sourcedId
		const { tag } = cacheUtils.userProgressByCourse(onerosterUserSourcedId, onerosterCourseSourcedId)
		revalidateTag(tag)
		logger.info("invalidated user progress cache", { cacheTag: tag })
	}

	logger.info("video progress saved successfully", {
		onerosterUserSourcedId,
		onerosterVideoResourceSourcedId,
		score,
		percentComplete,
		status: scoreStatus,
		isPartialProgress: !isCompleted
	})
}

/**
 * Saves an assessment result directly to the OneRoster gradebook.
 * This is called when a user completes an assessment (exercise, quiz, or test).
 *
 * @param onerosterResourceSourcedId - The OneRoster resource sourcedId for the assessment
 * @param score - The score as a decimal between 0 and 1 (e.g., 0.8 for 80%)
 * @param correctAnswers - Number of questions answered correctly on first attempt
 * @param totalQuestions - Total number of questions in the assessment
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterCourseSourcedId - The sourcedId of the course this assessment belongs to, for cache invalidation.
 */
export async function saveAssessmentResult(
	onerosterResourceSourcedId: string,
	score: number,
	correctAnswers: number,
	totalQuestions: number,
	onerosterUserSourcedId: string,
	onerosterCourseSourcedId: string
) {
	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) throw errors.new("user not authenticated")

	logger.info("saving assessment result", {
		clerkUserId,
		onerosterUserSourcedId,
		onerosterResourceSourcedId,
		score,
		correctAnswers,
		totalQuestions
	})

	// The line item sourcedId is the same as the resource sourcedId
	const onerosterLineItemSourcedId = onerosterResourceSourcedId

	// The result sourcedId follows our pattern
	const onerosterResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterLineItemSourcedId}`

	const resultPayload = {
		result: {
			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: onerosterUserSourcedId, type: "user" as const },
			scoreStatus: "fully graded" as const,
			scoreDate: new Date().toISOString(),
			score: score, // Score as decimal (0-1)
			comment: `${correctAnswers}/${totalQuestions} correct on first attempt`
		}
	}

	// Use putResult for idempotency
	const result = await errors.try(oneroster.putResult(onerosterResultSourcedId, resultPayload))
	if (result.error) {
		logger.error("failed to save assessment result", {
			clerkUserId,
			onerosterResourceSourcedId,
			error: result.error
		})
		throw errors.wrap(result.error, "assessment result save")
	}

	// Invalidate the user progress cache for this course.
	const { tag } = cacheUtils.userProgressByCourse(onerosterUserSourcedId, onerosterCourseSourcedId)
	revalidateTag(tag)
	logger.info("invalidated user progress cache", { cacheTag: tag })

	logger.info("successfully saved assessment result", {
		clerkUserId,
		onerosterResourceSourcedId,
		onerosterResultSourcedId,
		score
	})

	return result.data
}

/**
 * Retrieves the saved video progress for a user.
 * Returns the last watched position in seconds, or null if no progress is saved.
 *
 * @param onerosterUserSourcedId - The user's OneRoster sourcedId
 * @param onerosterVideoResourceSourcedId - The OneRoster resource sourcedId for the video
 * @returns The last watched position in seconds, or null if no progress found
 */
export async function getVideoProgress(
	onerosterUserSourcedId: string,
	onerosterVideoResourceSourcedId: string
): Promise<{ currentTime: number; percentComplete: number } | null> {
	logger.debug("fetching video progress", {
		onerosterUserSourcedId,
		onerosterVideoResourceSourcedId
	})

	// The result sourcedId follows our pattern
	const onerosterResultSourcedId = `nice_${onerosterUserSourcedId}_${onerosterVideoResourceSourcedId}`

	const result = await errors.try(oneroster.getResult(onerosterResultSourcedId))
	if (result.error) {
		logger.debug("no video progress found", {
			onerosterUserSourcedId,
			onerosterVideoResourceSourcedId,
			error: result.error
		})
		return null
	}

	const assessmentResult = result.data
	if (!assessmentResult || typeof assessmentResult.score !== "number") {
		logger.debug("no valid video progress data", {
			onerosterUserSourcedId,
			onerosterVideoResourceSourcedId
		})
		return null
	}

	// Convert score (0.0-1.0) back to percentage (0-100)
	const percentComplete = Math.round(assessmentResult.score * 100)

	logger.debug("video progress retrieved", {
		onerosterUserSourcedId,
		onerosterVideoResourceSourcedId,
		percentComplete,
		scoreStatus: assessmentResult.scoreStatus
	})

	// We don't store currentTime directly, so we can't return it
	// The client will need to calculate it based on video duration
	return {
		currentTime: 0, // Will be calculated on the client side
		percentComplete
	}
}
