"use server"

import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { finalizeAssessment } from "@/lib/actions/assessment"
import { sendCaliperActivityCompletedEvent, sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import { updateProficiencyFromAssessment } from "@/lib/actions/proficiency"
import * as cacheUtils from "@/lib/cache"
import { invalidateCache } from "@/lib/cache"
import { oneroster } from "@/lib/clients"
import { VIDEO_COMPLETION_THRESHOLD_PERCENT } from "@/lib/constants/progress"
import { getAllCoursesBySlug } from "@/lib/data/fetchers/oneroster"
import { getAssessmentLineItemId } from "@/lib/utils/assessment-line-items"

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

	// The line item sourcedId is the resource sourcedId + '_ali'
	const onerosterLineItemSourcedId = getAssessmentLineItemId(onerosterArticleResourceSourcedId)

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
		const cacheKey = cacheUtils.userProgressByCourse(onerosterUserSourcedId, onerosterCourseSourcedId)
		await invalidateCache(cacheKey)
		logger.info("invalidated user progress cache", { cacheKey })
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

	// Define the completion threshold (shared constant)
	const isCompleted = percentComplete >= VIDEO_COMPLETION_THRESHOLD_PERCENT

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

	// The line item sourcedId is the video resource sourcedId + '_ali'
	const onerosterLineItemSourcedId = getAssessmentLineItemId(onerosterVideoResourceSourcedId)
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
		const cacheKey = cacheUtils.userProgressByCourse(onerosterUserSourcedId, onerosterCourseSourcedId)
		await invalidateCache(cacheKey)
		logger.info("invalidated user progress cache", { cacheKey })
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

// Add new interface above the function
interface AssessmentCompletionOptions {
	// Core assessment data (existing)
	onerosterResourceSourcedId: string
	score: number
	correctAnswers: number
	totalQuestions: number
	onerosterUserSourcedId: string
	onerosterCourseSourcedId: string
	metadata?: {
		masteredUnits: number
		totalQuestions: number
		correctQuestions: number
		accuracy: number
		xp: number
		multiplier: number
	}

	// Assessment type and context (new)
	contentType?: "Exercise" | "Quiz" | "Test"
	isInteractiveAssessment?: boolean
	onerosterComponentResourceSourcedId?: string

	// Proficiency analysis data (new)
	sessionResults?: Array<{ qtiItemId: string; isCorrect: boolean | null; isReported?: boolean }>
	attemptNumber?: number

	// Caliper event data (new)
	assessmentTitle?: string
	assessmentPath?: string
	unitData?: {
		path: string
		title: string
	}
	expectedXp?: number
	durationInSeconds?: number
	userEmail?: string
	shouldAwardXp?: boolean
}

/**
 * Saves an assessment result directly to the OneRoster gradebook.
 * This is called when a user completes an assessment (exercise, quiz, or test).
 * Now includes server-side orchestration of Caliper events and proficiency updates.
 */
export async function saveAssessmentResult(options: AssessmentCompletionOptions): Promise<unknown>
export async function saveAssessmentResult(
	onerosterResourceSourcedId: string,
	score: number,
	correctAnswers: number,
	totalQuestions: number,
	onerosterUserSourcedId: string,
	onerosterCourseSourcedId: string,
	metadata?: {
		masteredUnits: number
		totalQuestions: number
		correctQuestions: number
		accuracy: number
		xp: number
		multiplier: number
	}
): Promise<unknown>
export async function saveAssessmentResult(
	optionsOrResourceId: AssessmentCompletionOptions | string,
	score?: number,
	correctAnswers?: number,
	totalQuestions?: number,
	onerosterUserSourcedId?: string,
	onerosterCourseSourcedId?: string,
	metadata?: {
		masteredUnits: number
		totalQuestions: number
		correctQuestions: number
		accuracy: number
		xp: number
		multiplier: number
	}
) {
	const { userId: clerkUserId } = await auth()
	if (!clerkUserId) throw errors.new("user not authenticated")

	// Handle both function overloads
	let finalOptions: AssessmentCompletionOptions
	if (typeof optionsOrResourceId === "string") {
		// Legacy API - convert to new options object
		if (!score || !correctAnswers || !totalQuestions || !onerosterUserSourcedId || !onerosterCourseSourcedId) {
			throw errors.new("missing required parameters for legacy API")
		}
		finalOptions = {
			onerosterResourceSourcedId: optionsOrResourceId,
			score,
			correctAnswers,
			totalQuestions,
			onerosterUserSourcedId,
			onerosterCourseSourcedId,
			metadata
		}
	} else {
		// New API - use options object directly
		finalOptions = optionsOrResourceId
	}

	const {
		onerosterResourceSourcedId: resourceId,
		score: assessmentScore,
		correctAnswers: assessmentCorrectAnswers,
		totalQuestions: assessmentTotalQuestions,
		onerosterUserSourcedId: userId,
		onerosterCourseSourcedId: courseId,
		metadata: assessmentMetadata,
		contentType,
		isInteractiveAssessment,
		onerosterComponentResourceSourcedId,
		sessionResults,
		attemptNumber,
		assessmentTitle,
		assessmentPath,
		unitData,
		expectedXp,
		durationInSeconds,
		userEmail,
		shouldAwardXp
	} = finalOptions

	logger.info("saving assessment result", {
		clerkUserId,
		onerosterUserSourcedId: userId,
		onerosterResourceSourcedId: resourceId,
		score: assessmentScore,
		correctAnswers: assessmentCorrectAnswers,
		totalQuestions: assessmentTotalQuestions,
		metadata: assessmentMetadata,
		contentType,
		isInteractiveAssessment
	})

	// The line item sourcedId is the resource sourcedId + '_ali'
	const onerosterLineItemSourcedId = getAssessmentLineItemId(resourceId)

	// The result sourcedId follows our pattern
	const onerosterResultSourcedId = `nice_${userId}_${onerosterLineItemSourcedId}`

	// Mastery preservation logic for individual exercises
	let finalScore = assessmentScore // Start with the raw score

	if (assessmentScore === 1.0 && contentType === "Exercise") {
		// Check current score for this exercise to preserve mastery
		const currentResultResult = await errors.try(oneroster.getResult(onerosterResultSourcedId))

		if (!currentResultResult.error && currentResultResult.data?.score === 1.1) {
			finalScore = 1.1 // Preserve mastery
			logger.info("preserving mastery score", {
				exerciseId: resourceId,
				previousScore: 1.1,
				newAttemptScore: assessmentScore,
				preservedScore: finalScore
			})
		}
	}

	const resultPayload = {
		result: {
			assessmentLineItem: { sourcedId: onerosterLineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: userId, type: "user" as const },
			scoreStatus: "fully graded" as const,
			scoreDate: new Date().toISOString(),
			score: finalScore, // Use finalScore instead of assessmentScore
			comment: `${assessmentCorrectAnswers}/${assessmentTotalQuestions} correct on first attempt`,
			...(assessmentMetadata && { metadata: assessmentMetadata })
		}
	}

	if (assessmentMetadata) {
		logger.debug("assessment result payload includes metadata", {
			onerosterResourceSourcedId: resourceId,
			metadata: assessmentMetadata,
			payloadHasMetadata: !!resultPayload.result.metadata
		})
	}

	// Use putResult for idempotency
	const result = await errors.try(oneroster.putResult(onerosterResultSourcedId, resultPayload))
	if (result.error) {
		logger.error("failed to save assessment result", {
			clerkUserId,
			onerosterResourceSourcedId: resourceId,
			error: result.error
		})
		throw errors.wrap(result.error, "assessment result save")
	}

	// Invalidate the user progress cache for this course.
	const cacheKey = cacheUtils.userProgressByCourse(userId, courseId)
	await invalidateCache(cacheKey)
	logger.info("invalidated user progress cache", { cacheKey })

	logger.info("successfully saved assessment result", {
		clerkUserId,
		onerosterResourceSourcedId: resourceId,
		onerosterResultSourcedId,
		score: assessmentScore
	})

	// Step 2: Send Caliper events if data is provided
	if (unitData && assessmentPath && assessmentTitle && userEmail && expectedXp !== undefined) {
		logger.info("sending caliper events from server", {
			onerosterResourceSourcedId: resourceId,
			assessmentTitle,
			hasUnitData: !!unitData
		})

		// Extract subject and course from unit path: "/{subject}/{course}/{unit}"
		const pathParts = unitData.path.split("/")
		if (pathParts.length >= 3) {
			const subject = pathParts[1]
			const course = pathParts[2]

			// Map subject to valid enum values
			const subjectMapping: Record<string, "Science" | "Math" | "Reading" | "Language" | "Social Studies" | "None"> = {
				science: "Science",
				math: "Math",
				reading: "Reading",
				language: "Language",
				"social-studies": "Social Studies"
			}

			const mappedSubject = subject ? subjectMapping[subject] : undefined
			if (mappedSubject && course) {
				const actor = {
					id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${userId}`,
					type: "TimebackUser" as const,
					email: userEmail
				}

				const context = {
					id: `${process.env.NEXT_PUBLIC_APP_DOMAIN}${assessmentPath}`,
					type: "TimebackActivityContext" as const,
					subject: mappedSubject,
					app: { name: "Nice Academy" },
					course: {
						name: course,
						id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/courses/${courseId}`
					},
					activity: {
						name: assessmentTitle,
						id: resourceId
					},
					process: false
				}

				const performance = {
					xpEarned: assessmentMetadata?.xp ?? expectedXp ?? 0,
					totalQuestions: assessmentTotalQuestions,
					correctQuestions: assessmentCorrectAnswers,
					durationInSeconds,
					masteredUnits: assessmentMetadata?.masteredUnits
				}

				// Send activity completed event
				const caliperResult = await errors.try(
					sendCaliperActivityCompletedEvent(actor, context, performance, shouldAwardXp)
				)
				if (caliperResult.error) {
					logger.error("failed to send caliper activity event", {
						error: caliperResult.error,
						onerosterResourceSourcedId: resourceId
					})
					// Continue execution - Caliper failure should not block assessment save
				}

				// Send time spent event if duration is available
				if (durationInSeconds && durationInSeconds >= 1) {
					const timeSpentResult = await errors.try(sendCaliperTimeSpentEvent(actor, context, durationInSeconds))
					if (timeSpentResult.error) {
						logger.error("failed to send caliper time spent event", {
							error: timeSpentResult.error,
							onerosterResourceSourcedId: resourceId
						})
						// Continue execution - time spent failure should not block assessment save
					}
				}
			}
		}
	}

	// Step 3: Update proficiency for interactive assessments (quizzes and unit tests)
	if (isInteractiveAssessment && onerosterComponentResourceSourcedId && sessionResults) {
		logger.info("starting proficiency analysis from server", {
			onerosterComponentResourceSourcedId,
			sessionResultCount: sessionResults.length,
			attemptNumber
		})

		// First finalize the assessment to ensure all responses are graded
		const finalizeResult = await errors.try(finalizeAssessment(userId, onerosterComponentResourceSourcedId))
		if (finalizeResult.error) {
			logger.error("failed to finalize assessment for proficiency analysis", {
				error: finalizeResult.error,
				onerosterComponentResourceSourcedId
			})
		} else {
			// Add delay to ensure PowerPath has processed everything
			await new Promise((resolve) => setTimeout(resolve, 1000))

			// Update proficiency based on session results
			const proficiencyResult = await errors.try(
				updateProficiencyFromAssessment(
					userId,
					onerosterComponentResourceSourcedId,
					attemptNumber || 1,
					sessionResults,
					courseId
				)
			)
			if (proficiencyResult.error) {
				logger.error("failed to update proficiency from assessment", {
					error: proficiencyResult.error,
					onerosterComponentResourceSourcedId
				})
				// Continue execution - proficiency failure should not block assessment save
			} else {
				logger.info("successfully updated proficiency from server", {
					exercisesUpdated: proficiencyResult.data.exercisesUpdated,
					onerosterComponentResourceSourcedId
				})
			}
		}
	}

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
