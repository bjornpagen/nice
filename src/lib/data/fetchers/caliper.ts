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
 * Banking minute bucketing (ceil semantics):
 * - <= 0s => 0 minutes
 * - > 0s  => ceil(seconds / 60)
 *
 * Rationale: Aligns awarded minutes with expected XP calculation, which
 * uses ceil(duration / 60). This removes systematic under-awards near
 * completion (e.g., ~6.3 minutes rounding down to 6).
 */
export function computeBankingMinutes(seconds: number): number {
    if (seconds <= 20) return 0
    return Math.ceil(seconds / 60)
}

/**
 * Filters events to only include TimeSpent events for specific resource IDs
 */
function filterTimeSpentEventsByResources(
	events: z.infer<typeof CaliperEventSchema>[],
	resourceIds: Set<string>
): z.infer<typeof CaliperEventSchema>[] {
	return events.filter((event) => {
		if (event.action !== "SpentTime") return false

		// Debug logging for ALL TimeSpent events to understand the structure
		logger.debug("examining timespent event", {
			eventAction: event.action,
			activityId: event.object.activity?.id,
			contextId: event.object.id,
			eventId: event.id
		})

		// Match by normalized activity.id (handles fully-qualified URIs and plain ids)
		const normalized = normalizeResourceIdFromActivityId(event.object.activity?.id)
		if (normalized && resourceIds.has(normalized)) {
			logger.debug("matched timespent event by normalized activity id", {
				eventAction: event.action,
				activityId: event.object.activity?.id,
				normalizedActivityId: normalized,
				matchType: "activity_id_normalized"
			})
			return true
		}

		// No match
		logger.debug("timespent event did not match any resource", {
			eventAction: event.action,
			activityId: event.object.activity?.id,
			contextId: event.object.id,
			targetResourceIds: Array.from(resourceIds)
		})

		return false
	})
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

/**
 * Aggregates total time spent (in seconds) per resource from TimeSpent events
 */
function aggregateTimeSpentByResource(timeSpentEvents: z.infer<typeof CaliperEventSchema>[]): Map<string, number> {
	const timeSpentMap = new Map<string, number>()

	for (const event of timeSpentEvents) {
		const normalizedId = normalizeResourceIdFromActivityId(event.object.activity?.id)
		if (!normalizedId) continue

		const timeMetric = event.generated.items.find((item) => item.type === "active")
		if (!timeMetric) continue

		const currentTime = timeSpentMap.get(normalizedId) || 0
		timeSpentMap.set(normalizedId, currentTime + timeMetric.value)
	}

	return timeSpentMap
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
 * Gets time spent events for specific passive content resources (articles, videos)
 * Used by banked XP calculation - filters client-side to ensure we never miss content
 * regardless of when the student engaged with it
 */
export async function getTimeSpentEventsForResources(actorId: string, resourceIds: string[]) {
	logger.info("getTimeSpentEventsForResources called", {
		actorId,
		resourceCount: resourceIds.length
	})

	const operation = async () => {
		// Get all events and filter client-side to ensure we don't miss any content
		const allEvents = await getAllEventsForUser(actorId)
		const resourceIdSet = new Set(resourceIds)

		const filteredEvents = filterTimeSpentEventsByResources(allEvents, resourceIdSet)

		logger.debug("filtered time spent events", {
			actorId,
			totalEvents: allEvents.length,
			timeSpentEvents: filteredEvents.length,
			targetResources: resourceIds.length
		})

		return filteredEvents
	}

	// Include a hash of resourceIds in the cache key for uniqueness
	const resourceIdsHash = resourceIds.sort().join(",")
	return redisCache(operation, ["caliper-getTimeSpentEventsForResources", actorId, resourceIdsHash], { revalidate: 60 }) // 1 minute cache
}

/**
 * Gets aggregated time spent (in seconds) per resource for banked XP calculation
 * Returns a Map of resourceId -> totalSecondsSpent
 */
export async function getAggregatedTimeSpentByResource(actorId: string, resourceIds: string[]) {
	logger.info("getAggregatedTimeSpentByResource called", {
		actorId,
		resourceCount: resourceIds.length
	})

	const operation = async () => {
		const timeSpentEvents = await getTimeSpentEventsForResources(actorId, resourceIds)
		const aggregatedTime = aggregateTimeSpentByResource(timeSpentEvents)

		// Convert Map to object for better logging (use same rounding as award logic)
		const timeSpentSummary = Object.fromEntries(
			Array.from(aggregatedTime.entries()).map(([resourceId, seconds]) => [
				resourceId,
				{ seconds, minutes: computeBankingMinutes(seconds) }
			])
		)

		logger.debug("aggregated time spent by resource", {
			actorId,
			resourceCount: resourceIds.length,
			resourcesWithTime: aggregatedTime.size,
			timeSpentSummary
		})

		return aggregatedTime
	}

	// Include a hash of resourceIds in the cache key for uniqueness
	const resourceIdsHash = resourceIds.sort().join(",")
	return redisCache(operation, ["caliper-getAggregatedTimeSpentByResource", actorId, resourceIdsHash], {
		revalidate: 60
	}) // 1 minute cache
}

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

/**
 * Specialized function for banked XP calculation
 * Takes passive resource IDs and returns XP calculations based on time spent
 */
export async function calculateBankedXpForResources(
	actorId: string,
	passiveResources: Array<{ sourcedId: string; expectedXp: number }>
) {
	logger.info("calculateBankedXpForResources called", {
		actorId,
		resourceCount: passiveResources.length
	})

	const operation = async () => {
		const resourceIds = passiveResources.map((r) => r.sourcedId)
		const timeSpentMap = await getAggregatedTimeSpentByResource(actorId, resourceIds)

		let totalBankedXp = 0
		const awardedResourceIds: string[] = []
		const detailedResults: Array<{
			resourceId: string
			expectedXp: number
			secondsSpent: number
			minutesSpent: number
			awardedXp: number
		}> = []

		// Policy: compute partial award using rounded minutes and cap by expected XP.

		for (const resource of passiveResources) {
			const secondsSpent = timeSpentMap.get(resource.sourcedId) || 0

			const minutesSpent = computeBankingMinutes(secondsSpent)

			// Defensive cap: never award more than the resource's expected XP
			const awardedXp = Math.min(minutesSpent, resource.expectedXp)

			if (awardedXp > 0) {
				totalBankedXp += awardedXp
				awardedResourceIds.push(resource.sourcedId)
			}

			detailedResults.push({
				resourceId: resource.sourcedId,
				expectedXp: resource.expectedXp,
				secondsSpent,
				minutesSpent,
				awardedXp
			})
		}

		logger.info("calculated banked xp", {
			actorId,
			totalBankedXp,
			awardedResourceCount: awardedResourceIds.length,
			detailedResults
		})

		return {
			bankedXp: totalBankedXp,
			awardedResourceIds,
			detailedResults
		}
	}

	// Create a hash of the passive resources for cache key uniqueness
	const resourcesHash = passiveResources
		.map((r) => `${r.sourcedId}:${r.expectedXp}`)
		.sort()
		.join(",")

	return redisCache(operation, ["caliper-calculateBankedXpForResources", actorId, resourcesHash], { revalidate: 60 }) // 1 minute cache
}
