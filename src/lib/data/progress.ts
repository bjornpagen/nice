import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { format } from "date-fns"
import type { z } from "zod"
import type { CaliperEventSchema } from "@/lib/caliper"
// CHANGED: Import the new fetcher instead of using caliper client directly
import { getAllEventsForUser } from "@/lib/data/fetchers/caliper"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { Activity } from "@/lib/types/domain"
import { constructActorId } from "@/lib/utils/actor-id"
import { requireUser } from "@/lib/auth/require-user"
import { type AssessmentProgress, type UnitProficiency, getUserUnitProgressRaw } from "@/lib/progress/raw/user-progress"

export type { AssessmentProgress, UnitProficiency } from "@/lib/progress/raw/user-progress"

export { getUserUnitProgressRaw as getUserUnitProgress }

// New types and functions for progress page
export interface ProgressPageData {
	activities: Activity[]
	exerciseMinutes: number
	totalLearningMinutes: number
	totalXpEarned: number // Add XP to the interface
}

function getProficiencyText(score: number): "Proficient" | "Familiar" | "Attempted" {
	if (score >= 80) return "Proficient"
	if (score >= 50) return "Familiar"
	return "Attempted"
}

// Helper function to extract relative URL from Caliper event object ID
function extractRelativeUrl(objectId: string): string {
	const result = errors.trySync(() => new URL(objectId))
	if (result.error) {
		// If objectId is not a valid URL, return it as-is (fallback)
		return objectId
	}
	return result.data.pathname // Returns just the path part (e.g., "/subject/course/unit/lesson/v/video")
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
				const score = totalQuestions > 0 ? (correctQuestions / totalQuestions) * 100 : 0

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
	const user = await requireUser()

	const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!metadataValidation.success) {
		logger.error("input validation", { error: metadataValidation.error, userId: user.id })
		return { activities: [], exerciseMinutes: 0, totalLearningMinutes: 0, totalXpEarned: 0 }
	}
	const metadata = metadataValidation.data
	if (!metadata.sourceId) {
		logger.warn("user has no sourceId, cannot fetch progress", { userId: user.id })
		return { activities: [], exerciseMinutes: 0, totalLearningMinutes: 0, totalXpEarned: 0 }
	}

	const actorId = constructActorId(metadata.sourceId)
	const eventsResult = await errors.try(getAllEventsForUser(actorId))
	if (eventsResult.error) {
		logger.error("failed to fetch caliper events", { actorId, error: eventsResult.error })
		return { activities: [], exerciseMinutes: 0, totalLearningMinutes: 0, totalXpEarned: 0 }
	}

	return transformEventsToActivities(eventsResult.data)
}
