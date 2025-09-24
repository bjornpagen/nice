I'll search the codebase for how XP is banked and released, then open the core XP service and any Inngest functions that award or unlock XP. This should help us identify possible race conditions or idempotency gaps.

[5 tools called]

I'll open the core Caliper fetcher to see how time is aggregated and cached, and the XP service/bank code to check for cache invalidation and potential race conditions.

[5 tools called]

I'll review the eligibility logic to see what conditions could exclude passive resources and why that might happen intermittently.

[2 tools called]

I scanned the XP banking flow, cache keys, and Caliper fetchers. I see several brittle spots that can explain intermittent “banked XP didn’t unlock” in prod even when we can’t reproduce later.

### What’s relevant and where the brittleness lives
- src/lib/xp/service.ts — orchestrates assessment XP, cache invalidation, delay, and banked XP award
```86:124:src/lib/xp/service.ts
	// 3. Process XP Bank for exercises if the user achieved mastery.
	if (options.isExercise && assessmentXpResult.finalXp > 0 && accuracy >= 80) {
		// --- START OF NEW CACHE INVALIDATION LOGIC ---
		const identificationResult = await errors.try(
			findEligiblePassiveResourcesForExercise({
				exerciseResourceSourcedId: options.assessmentResourceId,
				onerosterCourseSourcedId: options.courseSourcedId,
				onerosterUserSourcedId: options.userSourcedId
			})
		)

		if (identificationResult.error) {
			logger.error("failed to identify passive resources for cache invalidation", {
				error: identificationResult.error,
				assessmentId: options.componentResourceId,
				userId: options.userSourcedId
			})
		} else {
			const eligibleResources = identificationResult.data
			if (eligibleResources.length > 0) {
				const actorId = constructActorId(options.userSourcedId)
				const resourceIds = eligibleResources.map((r) => r.sourcedId)

				const keysToInvalidate = [
					caliperEventsByActor(actorId),
					caliperTimeSpentForResources(actorId, resourceIds),
					caliperAggregatedTimeForResources(actorId, resourceIds),
					// IMPORTANT: final compute key matches compute-layer hash of sourcedId:expectedXp
					caliperBankedXpForResources(actorId, eligibleResources)
				]

				await invalidateCache(keysToInvalidate)
				logger.info("invalidated related caliper caches before xp banking", { keyCount: keysToInvalidate.length })

				// Give Caliper a brief moment to ingest freshly-sent events
				// before computing banked XP. This avoids race conditions without altering logic.
				await new Promise((resolve) => setTimeout(resolve, 1500))
			}
		}
```
```126:149:src/lib/xp/service.ts
		// Now, call the banking function to calculate and award with fresh data.
		const xpBankResult = await errors.try(
			awardBankedXpForExercise({
				exerciseResourceSourcedId: options.assessmentResourceId,
				onerosterUserSourcedId: options.userSourcedId,
				onerosterCourseSourcedId: options.courseSourcedId
			})
		)
		// --- END OF NEW CACHE INVALIDATION LOGIC ---

		if (xpBankResult.error) {
			logger.error("failed to process xp bank", {
				error: xpBankResult.error,
				assessmentId: options.componentResourceId,
				userId: options.userSourcedId
			})
		} else {
			bankedXp = xpBankResult.data.bankedXp
			finalXp += bankedXp
			logger.info("awarded banked xp", {
				assessmentId: options.componentResourceId,
				bankedXp,
				awardedCount: xpBankResult.data.awardedResourceIds.length
			})
		}
```

- src/lib/xp/bank.ts — eligibility window, “already-banked” dedupe, gradebook writes (non-fatal on failure)
```138:197:src/lib/xp/bank.ts
	// 5. Compute previous exercise boundary using tuple ordering: (lessonSortOrder, contentSortOrder)
	...
	// 6. Identify passive resources strictly between previous and current exercise using tuple ordering
	...
		const expectedXp = typeof metadata?.xp === "number" ? metadata.xp : 0
		if (expectedXp <= 0) continue
		const isInteractive = metadata?.type === "interactive"
		const kind = metadata && typeof metadata.khanActivityType === "string" ? metadata.khanActivityType : undefined
		if (isInteractive && (kind === "Article" || kind === "Video")) {
			candidateResourceIds.push(resource.sourcedId)
		}
```
```221:252:src/lib/xp/bank.ts
	// 7b. Dedupe: exclude resources already banked for this user
	...
			const BankedMetaSchema = z.object({ xp: z.number().optional(), xpReason: z.string().optional() }).passthrough()
			const parsed = BankedMetaSchema.safeParse(existingResult.data?.metadata)
			const xpValue = parsed.success && typeof parsed.data.xp === "number" ? parsed.data.xp : 0
			const xpReason = parsed.success && typeof parsed.data.xpReason === "string" ? parsed.data.xpReason : ""
			const alreadyBanked = xpValue > 0 || xpReason === "Banked XP"
```
```316:356:src/lib/xp/bank.ts
	// 9. Save banked XP to individual assessmentResults for each awarded resource
	...
			const saveResult = await errors.try(
				gradebook.saveResult({...})
			)
			if (saveResult.error) {
				logger.error("failed to save banked xp assessment result", { resourceId, error: saveResult.error })
				// Continue with other resources even if one fails
			} else {
				logger.info("saved banked xp assessment result", { resourceId })
				// send Caliper banked XP event (best-effort)
```

- src/lib/data/fetchers/caliper.ts — event filtering, minute rounding, and 60s Redis caches
```56:59:src/lib/data/fetchers/caliper.ts
export function computeBankingMinutes(seconds: number): number {
    if (seconds <= 20) return 0
    return Math.ceil(seconds / 60)
}
```
```140:144:src/lib/data/fetchers/caliper.ts
export async function getAllEventsForUser(actorId: string) {
	logger.info("getAllEventsForUser called", { actorId })
	const operation = () => caliper.getEvents(actorId)
	return redisCache(operation, ["caliper-getAllEventsForUser", actorId], { revalidate: 60 }) // 1 minute cache
}
```
```213:217:src/lib/data/fetchers/caliper.ts
	return redisCache(operation, ["caliper-getAggregatedTimeSpentByResource", actorId, resourceIdsHash], {
		revalidate: 60
	}) // 1 minute cache
```
```308:315:src/lib/data/fetchers/caliper.ts
	const resourcesHash = passiveResources
		.map((r) => `${r.sourcedId}:${r.expectedXp}`)
		.sort()
		.join(",")
	return redisCache(operation, ["caliper-calculateBankedXpForResources", actorId, resourcesHash], { revalidate: 60 }) // 1 minute cache
```

- src/lib/cache.ts — cache keys and invalidation
```193:231:src/lib/cache.ts
export function caliperEventsByActor(actorId: string): string { ... }
export function caliperTimeSpentForResources(actorId: string, resourceIds: string[]): string { ... }
export function caliperAggregatedTimeForResources(actorId: string, resourceIds: string[]): string { ... }
export function caliperBankedXpForResources(actorId: string, passiveResources: Array<{ sourcedId: string; expectedXp: number }>): string {
	const resourcesHash = passiveResources
		.map((r) => `${r.sourcedId}:${r.expectedXp}`)
		.sort()
		.join(",")
	return createCacheKey(["caliper-calculateBankedXpForResources", actorId, resourcesHash])
}
```
```118:155:src/lib/cache.ts
export async function invalidateCache(keys: string[]): Promise<void> {
	// if redis unavailable: warn and return (no invalidation)
	...
	logger.info("cache invalidated", { keys, deleted })
}
```

### Why the banked XP can fail intermittently (and why we can’t reproduce later)
- Best-effort invalidation is skipped on transient errors. If eligibility fetch throws, we log and continue with no invalidation, then immediately compute with cached 0s for up to 60s. Later, when we test, caches expired or the fetch succeeded, so we can’t reproduce.
- Ingestion lag vs. fixed 1.5s delay. If Caliper “SpentTime” arrives after 1.5s, we compute, cache the 0-minute totals for 60s, and the moment is gone. Your later attempt happens after the lag has resolved.
- Invalidation key mismatch. The banked-XP compute key includes expectedXp in the hash. If expectedXp or the eligible resource set differs between the precompute-identification and the later award call (content metadata changes, or a subtle eligibility difference), we don’t actually delete the key that gets used, so we return stale 0s for 60s.
- Minute floor. We drop anything ≤ 20 seconds to 0 minutes. If students skimmed or switched tabs, the events might record under ~20 seconds per passive; that yields zero banked XP even if they “went through” the items.
- Eligibility classifier is too strict. We currently require metadata.type === "interactive" and khanActivityType in ["Article","Video"]. Any metadata drift (e.g., type not “interactive”, missing xp, different strings) silently removes candidates, so nothing to bank.
- Dedupe can exclude legit awards. We dedupe if an existing result has xp > 0 OR xpReason === "Banked XP". If a prior write left xpReason = "Banked XP" with xp = 0 (or a legacy artifact), we will permanently skip that resource.
- Gradebook writes are non-fatal. If saving a banked result fails, we just log and move on. A transient gradebook error means users see only exercise XP. Our later tests succeed if the gradebook endpoint is healthy by then.
- UI/progress cache not invalidated by bank award. We invalidate progress after the primary assessment, but the bank award path doesn’t invalidate course progress. Students may not see unlocks immediately even if results were saved.

### Is this a race condition?
- Yes, at least two: cache invalidation vs. computation, and Caliper ingestion vs. a fixed 1.5s wait. Both can lead to a cached zero for 60 seconds and a missed bank payout window.

### Why wouldn’t it affect us when we test?
- We likely hit a different timing window: caches expired, the identification step didn’t error, Caliper events had already landed, or our interactions exceeded the 20s floor. Once the transient condition passes, the path looks fine and is hard to reproduce.

### Concrete scenarios that match your report
- Student does passives, immediately retries exercise and gets mastery. Caliper events land after >1.5s; we compute with stale cache, store a “0” bank result for 60s. Only exercise XP (e.g., +1) appears. You re-run later and it works because caches/ingestion have caught up.
- A single resource’s metadata doesn’t meet the interactive/article/video predicate or has expectedXp = 0; eligibility set is empty that day. You test a different lesson where metadata is clean.

### What to check next (fast verification in prod logs)
- For the affected student and exercise time window:
  - Did “failed to identify passive resources for cache invalidation” log around the attempt? If yes, no invalidation happened.
  - Do you see calculateBankedXpForResources logs with detailedResults showing 0 minutes? If yes, either ingestion lag or ≤20s floor.
  - Any “failed to save banked xp assessment result” logs per resourceId?
  - Compare the keys you invalidated with the keys later computed (resourcesHash includes expectedXp). If hashes differ, invalidation missed.

### Hardening ideas to eliminate the brittleness
- Make invalidation mandatory for bank compute. If invalidation can’t run (eligibility fetch fails or Redis down), either:
  - compute once bypassing cache for that call; or
  - abort banking and surface a clear error (fail loud).
- Replace fixed 1.5s sleep with short polling for new SpentTime deltas (e.g., up to N seconds; still without fallbacks).
- Align invalidation and compute inputs. Use the exact same eligibleResources array for both steps, or remove expectedXp from the compute cache key so IDs-only invalidation suffices.
- Loosen or explicitly validate the passive classifier. If type isn’t “interactive” but khanActivityType is Article/Video with positive xp, include it, or log+throw so it’s visible.
- After each successful banked result, also invalidate user progress for that course.
- Treat gradebook write failures as blocking for banking (log+throw); or retry with a bounded, explicit backoff.

If you want, I can add temporary diagnostic logging around:
- the invalidation/compute keys and resourcesHash,
- the eligibility resource list and its metadata snapshot,
- measured ingestion lag (time between last SpentTime and assessment completion).

Summary
- Relevant files: `src/lib/xp/service.ts`, `src/lib/xp/bank.ts`, `src/lib/data/fetchers/caliper.ts`, `src/lib/cache.ts`.
- Likely causes: skipped/ineffective cache invalidation, Caliper ingestion lag vs. 60s caches, strict metadata filters, ≤20s minute floor, non-fatal gradebook failures, and missing progress cache invalidation in the bank path.
- It’s timing-sensitive; once caches expire or events land, we can’t reproduce.