import * as logger from "@superbuilders/slog"
import { unstable_cache as cache } from "next/cache"
import type { z } from "zod"
import { createCacheKey } from "@/lib/cache"
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
 * Filters events to only include TimeSpent events for specific resource IDs
 */
function filterTimeSpentEventsByResources(
	events: z.infer<typeof CaliperEventSchema>[],
	resourceIds: Set<string>
): z.infer<typeof CaliperEventSchema>[] {
	return events.filter((event) => {
		if (event.action !== "SpentTime") return false
		const activityId = event.object.activity?.id
		return activityId && resourceIds.has(activityId)
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
		const activityId = event.object.activity?.id
		if (!activityId) continue

		const timeMetric = event.generated.items.find((item) => item.type === "active")
		if (!timeMetric) continue

		const currentTime = timeSpentMap.get(activityId) || 0
		timeSpentMap.set(activityId, currentTime + timeMetric.value)
	}

	return timeSpentMap
}

// --- Raw Event Fetchers ---

/**
 * Fetches ALL events for a user - primarily used by progress page
 * ⚠️ CRITICAL: This is expensive and should only be called when you genuinely need all events
 */
export const getAllEventsForUser = cache(
	async (actorId: string) => {
		logger.info("getAllEventsForUser called", { actorId })
		return caliper.getEvents(actorId)
	},
	createCacheKey(["caliper-getAllEventsForUser"]),
	{ revalidate: 60 } // Cache for 1 minute to balance freshness with performance
)

// --- Specialized Filtered Fetchers ---

/**
 * Gets time spent events for specific passive content resources (articles, videos)
 * Used by banked XP calculation - filters client-side to ensure we never miss content
 * regardless of when the student engaged with it
 */
export const getTimeSpentEventsForResources = cache(
	async (actorId: string, resourceIds: string[]) => {
		logger.info("getTimeSpentEventsForResources called", {
			actorId,
			resourceCount: resourceIds.length
		})

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
	},
	createCacheKey(["caliper-getTimeSpentEventsForResources"]),
	{ revalidate: 60 } // Cache for 1 minute
)

/**
 * Gets aggregated time spent (in seconds) per resource for banked XP calculation
 * Returns a Map of resourceId -> totalSecondsSpent
 */
export const getAggregatedTimeSpentByResource = cache(
	async (actorId: string, resourceIds: string[]) => {
		logger.info("getAggregatedTimeSpentByResource called", {
			actorId,
			resourceCount: resourceIds.length
		})

		const timeSpentEvents = await getTimeSpentEventsForResources(actorId, resourceIds)
		const aggregatedTime = aggregateTimeSpentByResource(timeSpentEvents)

		// Convert Map to object for better logging
		const timeSpentSummary = Object.fromEntries(
			Array.from(aggregatedTime.entries()).map(([resourceId, seconds]) => [
				resourceId,
				{ seconds, minutes: Math.ceil(seconds / 60) }
			])
		)

		logger.debug("aggregated time spent by resource", {
			actorId,
			resourceCount: resourceIds.length,
			resourcesWithTime: aggregatedTime.size,
			timeSpentSummary
		})

		return aggregatedTime
	},
	createCacheKey(["caliper-getAggregatedTimeSpentByResource"]),
	{ revalidate: 60 } // Cache for 1 minute
)

/**
 * Gets completed events from Nice Academy for progress page calculations
 * Pre-filtered to only include relevant events
 */
export const getCompletedEventsFromNiceAcademy = cache(
	async (actorId: string) => {
		logger.info("getCompletedEventsFromNiceAcademy called", { actorId })

		const allEvents = await getAllEventsForUser(actorId)
		const completedEvents = filterCompletedEventsFromNiceAcademy(allEvents)

		logger.debug("filtered completed events", {
			actorId,
			totalEvents: allEvents.length,
			completedEvents: completedEvents.length
		})

		return completedEvents
	},
	createCacheKey(["caliper-getCompletedEventsFromNiceAcademy"]),
	{ revalidate: 60 } // Cache for 1 minute
)

/**
 * Specialized function for banked XP calculation
 * Takes passive resource IDs and returns XP calculations based on time spent
 */
export const calculateBankedXpForResources = cache(
	async (actorId: string, passiveResources: Array<{ sourcedId: string; expectedXp: number }>) => {
		logger.info("calculateBankedXpForResources called", {
			actorId,
			resourceCount: passiveResources.length
		})

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

		for (const resource of passiveResources) {
			const secondsSpent = timeSpentMap.get(resource.sourcedId) || 0

			if (secondsSpent === 0) {
				detailedResults.push({
					resourceId: resource.sourcedId,
					expectedXp: resource.expectedXp,
					secondsSpent: 0,
					minutesSpent: 0,
					awardedXp: 0
				})
				continue
			}

			const minutesSpent = Math.ceil(secondsSpent / 60)
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
	},
	createCacheKey(["caliper-calculateBankedXpForResources"]),
	{ revalidate: 60 } // Cache for 1 minute
)
