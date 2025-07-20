"use server"

import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { format } from "date-fns"
import type { z } from "zod"
import type { Activity } from "@/app/(user)/profile/me/progress/components/progress-table"
import type { CaliperEventSchema } from "@/lib/caliper"
import { caliper, oneroster } from "@/lib/clients"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

// Original types and functions for course/unit progress
export type AssessmentProgress = {
	completed: boolean
	score?: number
	proficiency?: "attempted" | "familiar" | "proficient" | "mastered"
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
	 * 110% (1.1) = mastered (Khan Academy mastery upgrade)
	 */
	const calculateProficiency = (score: number): "attempted" | "familiar" | "proficient" | "mastered" => {
		if (score >= 1.1) return "mastered"
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
		// MODIFIED: Check if score is a valid number before using it.
		if (result.scoreStatus === "fully graded" && typeof result.score === "number") {
			progressMap.set(result.assessmentLineItem.sourcedId, {
				completed: true,
				score: result.score,
				proficiency: calculateProficiency(result.score)
			})
			// MODIFIED: Handle partially graded items that have a score.
		} else if (result.scoreStatus === "partially graded" && typeof result.score === "number") {
			progressMap.set(result.assessmentLineItem.sourcedId, {
				completed: false,
				score: result.score
			})
			// MODIFIED: Handle completed items that have no score (like article views).
		} else if (result.scoreStatus === "fully graded") {
			progressMap.set(result.assessmentLineItem.sourcedId, {
				completed: true
				// No score or proficiency is set.
			})
		}
	}

	logger.info("fetched user progress", {
		userId,
		courseSourcedId,
		completedCount: Array.from(progressMap.values()).filter((p) => p.completed).length,
		partialCount: Array.from(progressMap.values()).filter((p) => !p.completed && p.score !== undefined).length
	})

	return progressMap
}

// New types and functions for progress page
export interface ProgressPageData {
	activities: Activity[]
	exerciseMinutes: number
	totalLearningMinutes: number
}

function getProficiencyText(score: number): "Proficient" | "Familiar" | "Attempted" {
	if (score >= 0.8) return "Proficient"
	if (score >= 0.5) return "Familiar"
	return "Attempted"
}

function transformEventsToActivities(events: z.infer<typeof CaliperEventSchema>[]): ProgressPageData {
	let exerciseMinutes = 0
	let totalLearningMinutes = 0

	// Create activities with event times for proper sorting
	const eventActivities = events
		.map((event): { activity: Activity; eventTime: string } | null => {
			if (event.action === "Completed") {
				const totalQuestionsItem = event.generated.items.find((item) => item.type === "totalQuestions")
				const correctQuestionsItem = event.generated.items.find((item) => item.type === "correctQuestions")

				const totalQuestions = totalQuestionsItem?.value ?? 0
				const correctQuestions = correctQuestionsItem?.value ?? 0
				const score = totalQuestions > 0 ? correctQuestions / totalQuestions : 0

				// Determine activity type from object ID with better categorization
				const getActivityIcon = (objectId: string): string => {
					if (objectId.includes("/articles/")) return "article"
					if (objectId.includes("/videos/")) return "video"
					if (objectId.includes("/exercises/") || objectId.includes("/assessments/")) return "exercise"
					// Default to exercise for completed activities with scores
					return "exercise"
				}
				const icon = getActivityIcon(event.object.id)

				return {
					activity: {
						icon,
						title: event.object.activity?.name ?? "Unknown Activity",
						subject: event.object.course?.name ?? event.object.subject,
						date: format(new Date(event.eventTime), "MMM dd, yyyy 'at' h:mm a"),
						level: getProficiencyText(score),
						problems: `${correctQuestions}/${totalQuestions}`,
						time: "–"
					},
					eventTime: event.eventTime
				}
			}

			if (event.action === "SpentTime") {
				const timeSpentItem = event.generated.items[0]
				if (!timeSpentItem) return null

				const durationSeconds = timeSpentItem.value
				const durationMinutes = Math.round(durationSeconds / 60)
				totalLearningMinutes += durationMinutes
				if (event.object.id.includes("/assessments/")) {
					exerciseMinutes += durationMinutes
				}

				// Determine activity type from object ID
				const getActivityIcon = (objectId: string): string => {
					if (objectId.includes("/videos/")) return "video"
					if (objectId.includes("/articles/")) return "article"
					if (objectId.includes("/exercises/") || objectId.includes("/assessments/")) return "exercise"
					// Default to article for time-spent activities without clear indicators
					return "article"
				}
				const icon = getActivityIcon(event.object.id)

				return {
					activity: {
						icon,
						title: event.object.activity?.name ?? "Unknown Activity",
						subject: event.object.course?.name ?? event.object.subject,
						date: format(new Date(event.eventTime), "MMM dd, yyyy 'at' h:mm a"),
						level: "–",
						problems: "–",
						time: durationMinutes.toString()
					},
					eventTime: event.eventTime
				}
			}

			return null
		})
		.filter((item): item is { activity: Activity; eventTime: string } => item !== null)
		.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()) // Sort by most recent first

	const activities: Activity[] = eventActivities.map((item) => item.activity)

	return { activities, exerciseMinutes, totalLearningMinutes }
}

export async function fetchProgressPageData(): Promise<ProgressPageData> {
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}

	const metadata = ClerkUserPublicMetadataSchema.parse(user.publicMetadata)
	if (!metadata.sourceId) {
		logger.warn("user has no sourceId, cannot fetch progress", { userId: user.id })
		return { activities: [], exerciseMinutes: 0, totalLearningMinutes: 0 }
	}

	const actorId = `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${metadata.sourceId}`

	const eventsResult = await errors.try(caliper.getEvents(actorId))
	if (eventsResult.error) {
		logger.error("failed to fetch caliper events", { actorId, error: eventsResult.error })
		// Return empty state on failure to avoid crashing the page
		return { activities: [], exerciseMinutes: 0, totalLearningMinutes: 0 }
	}

	return transformEventsToActivities(eventsResult.data)
}
