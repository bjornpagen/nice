"use server"

import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { format } from "date-fns"
import type { z } from "zod"
import { redisCache } from "@/lib/cache"
import type { CaliperEventSchema } from "@/lib/caliper"
import { oneroster } from "@/lib/clients"
// CHANGED: Import the new fetcher instead of using caliper client directly
import { getAllEventsForUser } from "@/lib/data/fetchers/caliper"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { Activity } from "@/lib/types/domain"
import { getResourceIdFromLineItem } from "@/lib/utils/assessment-line-items"

// Original types and functions for course/unit progress
export type AssessmentProgress = {
	completed: boolean
	score?: number
	proficiency?: "attempted" | "familiar" | "proficient" | "mastered"
}

// NEW: Interface for unit proficiency (matching profile.ts structure)
export interface UnitProficiency {
	unitId: string
	proficiencyPercentage: number
	proficientExercises: number
	totalExercises: number
}

/**
 * Fetches the user's progress for resources within a specific course unit.
 * This returns a map of resourceId -> progress details including score and proficiency.
 *
 * @param userId - The user's OneRoster sourcedId
 * @param onerosterCourseSourcedId - The course sourcedId
 * @returns A map of resource IDs to their progress details
 */
export async function getUserUnitProgress(
	userId: string,
	onerosterCourseSourcedId: string
): Promise<Map<string, AssessmentProgress>> {
	const cachedArray = await redisCache(
		async () => {
			logger.info("fetching user unit progress from API", { userId, onerosterCourseSourcedId })

			const progressMap = new Map<string, AssessmentProgress>()

			/**
			 * Calculate proficiency level based on score
			 * 0-70% = attempted
			 * 70-99.999% = familiar
			 * 100% = proficient
			 */
			const calculateProficiency = (score: number): "attempted" | "familiar" | "proficient" | "mastered" => {
				if (score >= 1.0) return "proficient"
				if (score >= 0.7) return "familiar"
				return "attempted"
			}

			// Fetch all assessment results for the user
			// We'll filter client-side to only include new '_ali' format line items
			const resultsResponse = await errors.try(
				oneroster.getAllResults({
					filter: `student.sourcedId='${userId}'`
				})
			)

			if (resultsResponse.error) {
				logger.error("failed to fetch user progress", { userId, error: resultsResponse.error })
				throw errors.wrap(resultsResponse.error, "fetch user progress")
			}

			// Process results to build the progress map by selecting the newest result per resource
			// Only consider results with new '_ali' format line items
			const latestByResource = new Map<string, (typeof resultsResponse.data)[number]>()
			for (const result of resultsResponse.data) {
				if (!result.assessmentLineItem.sourcedId.endsWith("_ali")) {
					continue
				}
				const resourceId = getResourceIdFromLineItem(result.assessmentLineItem.sourcedId)
				const prev = latestByResource.get(resourceId)
				const currentTime = new Date(result.scoreDate || 0).getTime()
				const prevTime = prev ? new Date(prev.scoreDate || 0).getTime() : Number.NEGATIVE_INFINITY
				if (!prev || currentTime > prevTime) {
					latestByResource.set(resourceId, result)
				}
			}

			for (const [resourceId, latest] of latestByResource.entries()) {
				if (latest.scoreStatus === "fully graded" && typeof latest.score === "number") {
					progressMap.set(resourceId, {
						completed: true,
						score: latest.score,
						proficiency: calculateProficiency(latest.score)
					})
				} else if (latest.scoreStatus === "partially graded" && typeof latest.score === "number") {
					progressMap.set(resourceId, {
						completed: false,
						score: latest.score
					})
				} else if (latest.scoreStatus === "fully graded") {
					progressMap.set(resourceId, {
						completed: true
					})
				}
			}

			logger.info("fetched user progress", {
				userId,
				onerosterCourseSourcedId,
				completedCount: Array.from(progressMap.values()).filter((p) => p.completed).length,
				partialCount: Array.from(progressMap.values()).filter((p) => !p.completed && p.score !== undefined).length
			})

			// Convert Map to array for caching (Maps don't survive JSON serialization)
			return Array.from(progressMap.entries())
		},
		["user-progress", userId, onerosterCourseSourcedId], // keyParts array
		{
			revalidate: 3600 // 1 hour
		}
	)

	// Convert array back to Map
	return new Map(cachedArray)
}

// New types and functions for progress page
export interface ProgressPageData {
	activities: Activity[]
	exerciseMinutes: number
	totalLearningMinutes: number
	totalXpEarned: number // Add XP to the interface
}

function getProficiencyText(score: number): "Proficient" | "Familiar" | "Attempted" {
	if (score >= 0.8) return "Proficient"
	if (score >= 0.5) return "Familiar"
	return "Attempted"
}

// Helper function to extract relative URL from Caliper event object ID
function extractRelativeUrl(objectId: string): string {
	try {
		const url = new URL(objectId)
		return url.pathname // Returns just the path part (e.g., "/subject/course/unit/lesson/v/video")
	} catch {
		// If objectId is not a valid URL, return it as-is (fallback)
		return objectId
	}
}

function transformEventsToActivities(events: z.infer<typeof CaliperEventSchema>[]): ProgressPageData {
	let exerciseMinutes = 0
	let totalLearningMinutes = 0
	let totalXpEarned = 0 // Track total XP

	// Filter events to only include those from Nice Academy
	const niceAcademyEvents = events.filter((event) => event.object.app.name === "Nice Academy")

	logger.debug("filtered events by app name", {
		totalEvents: events.length,
		niceAcademyEvents: niceAcademyEvents.length,
		filteredOut: events.length - niceAcademyEvents.length
	})

	// Create activities with event times for proper sorting
	const eventActivities = niceAcademyEvents
		.map((event): { activity: Activity; eventTime: string } | null => {
			if (event.action === "Completed") {
				const totalQuestionsItem = event.generated.items.find((item) => item.type === "totalQuestions")
				const correctQuestionsItem = event.generated.items.find((item) => item.type === "correctQuestions")
				const xpEarnedItem = event.generated.items.find((item) => item.type === "xpEarned") // Extract XP

				const totalQuestions = totalQuestionsItem?.value ?? 0
				const correctQuestions = correctQuestionsItem?.value ?? 0
				const xpEarned = xpEarnedItem?.value ?? 0 // Get XP value
				const score = totalQuestions > 0 ? correctQuestions / totalQuestions : 0

				// Add to total XP (only count positive XP, not penalties)
				if (xpEarned > 0) {
					totalXpEarned += xpEarned
				}

				// Determine activity type from object ID with better categorization
				const getActivityIcon = (objectId: string): string => {
					if (objectId.includes("/a/")) return "article"
					if (objectId.includes("/v/")) return "video"
					if (objectId.includes("/e/") || objectId.includes("/quiz/") || objectId.includes("/test/")) {
						return "exercise"
					}
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
						time: "–",
						xp: xpEarned, // Add XP to activity
						url: extractRelativeUrl(event.object.id) // Add clickable URL
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
				if (
					event.object.id.includes("/e/") ||
					event.object.id.includes("/quiz/") ||
					event.object.id.includes("/test/")
				) {
					exerciseMinutes += durationMinutes
				}

				// Determine activity type from object ID
				const getActivityIcon = (objectId: string): string => {
					if (objectId.includes("/v/")) return "video"
					if (objectId.includes("/a/")) return "article"
					if (objectId.includes("/e/") || objectId.includes("/quiz/") || objectId.includes("/test/")) {
						return "exercise"
					}
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
						time: durationMinutes.toString(),
						url: extractRelativeUrl(event.object.id) // Add clickable URL
					},
					eventTime: event.eventTime
				}
			}

			return null
		})
		.filter((item): item is { activity: Activity; eventTime: string } => item !== null)
		.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()) // Sort by most recent first

	const activities: Activity[] = eventActivities.map((item) => item.activity)

	return { activities, exerciseMinutes, totalLearningMinutes, totalXpEarned }
}

export async function fetchProgressPageData(): Promise<ProgressPageData> {
	// dynamic opt-in is handled at the page level
	const user = await currentUser()
	if (!user) {
		throw errors.new("user not authenticated")
	}

	const metadata = ClerkUserPublicMetadataSchema.parse(user.publicMetadata)
	if (!metadata.sourceId) {
		logger.warn("user has no sourceId, cannot fetch progress", { userId: user.id })
		return { activities: [], exerciseMinutes: 0, totalLearningMinutes: 0, totalXpEarned: 0 }
	}

	const actorId = `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${metadata.sourceId}`

	// CHANGED: Use the new fetcher instead of direct caliper client call
	const eventsResult = await errors.try(getAllEventsForUser(actorId))
	if (eventsResult.error) {
		logger.error("failed to fetch caliper events", { actorId, error: eventsResult.error })
		return { activities: [], exerciseMinutes: 0, totalLearningMinutes: 0, totalXpEarned: 0 }
	}

	return transformEventsToActivities(eventsResult.data)
}
