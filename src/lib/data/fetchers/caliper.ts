import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { redisCache } from "@/lib/cache"
import type { CaliperEventSchema } from "@/lib/caliper"
import { caliper } from "@/lib/clients"

/**
 * ⚠️ CRITICAL: Caliper Event Filtering Behavior
 *
 * Caliper events represent immutable historical data and should never be "deleted" in the traditional sense.
 * However, we need specialized filtering for different use cases:
 *
 * 1. **Progress Page**: Needs ALL events to calculate total XP and show complete activity history
 * 2. **Banked XP**: Needs events filtered by specific resource IDs, regardless of when they occurred
 * 3. **Analytics**: May need events filtered by time windows, content types, or other criteria
 *
 * IMPORTANT PATTERNS:
 * - NEVER filter events by arbitrary time windows when calculating banked XP (students may engage with content days before taking quizzes)
 * - ALWAYS filter by resource IDs when looking for specific content engagement
 * - ALWAYS preserve complete event history for progress calculations
 * - ALWAYS use caching for expensive event processing operations
 *
 * Performance Considerations:
 * - Caliper events can be large datasets (thousands of events per user)
 * - Raw event fetching should be cached to avoid repeated API calls
 * - Filtered/processed results should be cached separately with different cache keys
 * - Use client-side filtering for complex logic that the Caliper API doesn't support
 */

// --- Universal Event Processing Helpers ---

/**
 * Normalize activity.id to a plain OneRoster resource id (e.g., "nice_x...")
 * Accepts either a plain id or a fully-qualified OneRoster URI.
 */
function normalizeResourceIdFromActivityId(activityId: string | undefined): string | null {
	if (!activityId) return null
	if (activityId.startsWith("http")) {
		const marker = "/resources/"
		const idx = activityId.lastIndexOf(marker)
		if (idx === -1) return null
		return activityId.slice(idx + marker.length)
	}
	return activityId
}

/**
 * Filters events to only include Completed events from Nice Academy
 */
function filterCompletedEventsFromNiceAcademy(
	events: z.infer<typeof CaliperEventSchema>[]
): z.infer<typeof CaliperEventSchema>[] {
	return events.filter((event) => {
		return event.action === "Completed" && event.object.app.name === "Nice Academy"
	})
}

// --- Raw Event Fetchers ---

/**
 * Fetches ALL events for a user - primarily used by progress page
 * ⚠️ CRITICAL: This is expensive and should only be called when you genuinely need all events
 */
export async function getAllEventsForUser(actorId: string) {
	logger.info("getAllEventsForUser called", { actorId })
	const operation = () => caliper.getEvents(actorId)
	return redisCache(operation, ["caliper-getAllEventsForUser", actorId], { revalidate: 60 }) // 1 minute cache
}

// --- Specialized Filtered Fetchers ---

/**
 * Gets completed events from Nice Academy for progress page calculations
 * Pre-filtered to only include relevant events
 */
export async function getCompletedEventsFromNiceAcademy(actorId: string) {
	logger.info("getCompletedEventsFromNiceAcademy called", { actorId })

	const operation = async () => {
		const allEvents = await getAllEventsForUser(actorId)
		const completedEvents = filterCompletedEventsFromNiceAcademy(allEvents)

		logger.debug("filtered completed events", {
			actorId,
			totalEvents: allEvents.length,
			completedEvents: completedEvents.length
		})

		return completedEvents
	}

	return redisCache(operation, ["caliper-getCompletedEventsFromNiceAcademy", actorId], { revalidate: 60 }) // 1 minute cache
}
