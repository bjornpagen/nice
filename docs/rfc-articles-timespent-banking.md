## RFC: Reliable Article TimeSpent Emission for XP Banking (Mirror Video Flow)

### Summary
- Problem: Banked XP intermittently fails for articles because TimeSpent events are emitted via client unmount (fire-and-forget). On fast navigation/tab close, these events often never reach the Caliper server before banking runs.
- Evidence: In the incident logs for attempt 2, caches were invalidated and fresh misses occurred, but zero validated SpentTime matched the five eligible passive resources. For the last article, we see a gradebook write (OneRoster) but no corresponding TimeSpent event before the calculation. Result: aggregated minutes = 0 → banked XP = 0.
- Proposal: Adopt the same server-driven accumulation/finalization model used for videos for articles (Redis-backed state, partial and final TimeSpent sends, NX lock). This eliminates reliance on client unmount timing and guarantees resource-bound TimeSpent reaches the calculator.

### Background: How XP Banking Works Today
1) Trigger: After an exercise finalizes, if accuracy ≥ 80% and finalXp > 0, the banking process runs for passive resources between the previous and current exercise.
2) Eligibility window: `findEligiblePassiveResourcesForExercise` filters to Article/Video with `metadata.type === "interactive"`, expectedXp > 0, and not already banked (OneRoster result metadata check).
3) Cache invalidation: We invalidate Caliper-related caches for the actor and eligible resources, then wait 1.5s to avoid ingestion races.
4) Calculation: `calculateBankedXpForResources` fetches all Caliper events, validates, filters to `action === "SpentTime"` and `object.activity.id` normalized to any eligible resource id, aggregates seconds (only `generated.items[].type === "active"`), rounds to minutes with thresholds (`<= 20s → 0`), caps by expectedXp, sums and persists.

Key facts the calculator requires:
- Events must be for the correct actor (full OneRoster user URL) and must have `object.activity.id` set to the passive resource id (e.g., `nice_x...`).
- Banking only considers TimeSpent events; ActivityCompleted or OneRoster writes do not contribute.

### Current Event Emission Paths
- Articles
  - Gradebook completion: `trackArticleView(...)` called on page mount writes a OneRoster result (idempotent). It does not send Caliper TimeSpent.
  - TimeSpent: Sent in `content.tsx` unmount cleanup via a fire-and-forget server action call `sendCaliperTimeSpentEvent(...)`. It is not awaited and can be canceled by navigation/reload/tab close. No server-side finalize.
- Videos
  - Server-driven: `accumulateCaliperWatchTime` updates Redis state. `finalizeCaliperPartialTimeSpent` sends deltas; `finalizeCaliperTimeSpentEvent` (with NX Redis lock) sends final unreported delta. These set `activity.id = <video resource id>` and are resilient to page lifecycle.

### Incident Evidence (Production)
- Attempt 2 flow showed:
  - "invalidated related caliper caches before xp banking" → fresh cache misses
  - Then a flood of Caliper validation warnings (skipping invalid events), and crucially no "calculated banked xp" nor "awarded banked xp" logs
  - For the last article just before the exercise: multiple gradebook writes (progress tracked) but no "sending caliper time spent event" for that article in the window
- Conclusion: At compute time, zero validated, resource-bound SpentTime events existed for the eligible article resources.

### Root Cause
- Articles rely on a client unmount fire-and-forget call to send TimeSpent. Under realistic behavior (fast navigation, tab closes, reloads, network flaps), those requests are frequently canceled and never reach Timeback. With no server-driven finalize or retry, the calculator often sees zero minutes for articles.
- Secondary contributors that amplify intermittency:
  - 1.5s ingestion wait may be insufficient under load
  - Validation rejects heterogenous/non-Timeback events in the actor’s stream
  - Minutes rounding (`<= 20s → 0`)
  - Actor/session mismatches can misattribute events (less common for the same session, but possible)

### Goals
- Guarantee that article TimeSpent events are emitted reliably and attributed to the correct resource id and actor, independent of client unmount timing.
- Preserve idempotency and prevent over-reporting via server-side state and locks, mirroring the video pipeline.

### Non-Goals
- Changing XP policies (eligibility filters, rounding, caps)
- Changing banked XP calculation logic or cache semantics (beyond standard invalidation already present)
- Backfilling historic events

### Proposed Design (Mirror Video Flow for Articles)

#### 1) Server State (Redis)
- Keyed by `(userSourcedId, articleResourceId)`
- Fields:
  - `cumulativeReadTimeSeconds: number` — total read time accumulated server-side
  - `reportedReadTimeSeconds: number` — time already sent to Caliper
  - `canonicalDurationSeconds: number | null` — optional if we estimate content length; can be null
  - `lastServerSyncAt: ISO string | null`
  - `finalizedAt: ISO string | null`

#### 2) Accumulation (Server Action)
- `accumulateArticleReadTime(onerosterArticleResourceSourcedId, sessionDeltaSeconds, currentPositionSeconds | null, durationSeconds | null, courseInfo)`
  - Validations and guards identical to video flow:
    - Clamp deltas via wall-time guard with a small leeway
    - Tolerate small duration variance if provided
  - Update Redis state: cumulative, position (optional), canonical duration (optional), lastServerSyncAt
  - Heuristic: If near completion (e.g., ≥ 95% of available content or a dwell threshold), invoke finalize (below)

#### 3) Partial Finalize (Server Action)
- `finalizeArticlePartialTimeSpent(onerosterArticleResourceSourcedId, articleTitle, courseInfo)`
  - Compute `delta = cumulativeReadTimeSeconds - reportedReadTimeSeconds`
  - If `delta > 0`: build Caliper payload with `activity.id = <article resource id>` and send a TimeSpentEvent with a single `generated.items` entry `{ type: "active", value: delta, ... }`
  - On success, increment `reportedReadTimeSeconds`

#### 4) Finalize with Redis NX Lock (Server Action)
- `finalizeArticleTimeSpentEvent(onerosterUserSourcedId, onerosterArticleResourceSourcedId, articleTitle, courseInfo)`
  - Acquire NX lock (e.g., 30s) to avoid concurrent finalization
  - Recompute unreported delta; if `> 0`, send TimeSpentEvent and update state; set `finalizedAt`
  - Release lock

#### 5) Caliper Payload (Reuse Video Builder)
- Actor: `constructActorId(userSourcedId)`; requires user email (consistent with Timeback schemas)
- Context: `context.id` is the page URL (course/lesson/article route)
- Activity: `{ name: <article title>, id: <article resource id> }`
- Generated metrics: `[{ type: "active", value: seconds, startDate?, endDate? }]`
- This ensures `object.activity.id` normalizes to `nice_x...` resource ids for banking matching.

#### 6) Client Integration (Articles)
- Replace unmount fire-and-forget with reliable triggers:
  - Heartbeat: call `accumulateArticleReadTime` every ~10s while the article is visible/active (same cadence as video; reuse constants)
  - Route change / beforeunload: call `finalizeArticlePartialTimeSpent` (endpoint designed to complete quickly; consider navigator.sendBeacon equivalent if needed)
  - Completion heuristic: when user meets completion criteria (e.g., scroll/dwell threshold), call `finalizeArticleTimeSpentEvent`
- Keep `trackArticleView` (OneRoster write) for progress semantics, but do not rely on it for banking

#### 7) Idempotency and Safety
- Use `reportedReadTimeSeconds` to avoid double reporting
- Use NX lock on finalization to guarantee single-writer semantics
- Fail fast on missing required fields (actor id, resource id); do not silently fallback

#### 8) Error Handling and Retries
- Follow `@superbuilders/errors` patterns (log + throw/wrap appropriately)
- Partial finalize can be retried safely; finalization guarded by lock
- No silent fallbacks; if event cannot be constructed (missing actor/email/activity.id), log and stop

#### 9) Observability and Logging
- Add info/debug logs analogous to video flow:
  - `article accumulate: delta/clamp` with inputs and guards applied
  - `article partial finalize: sending delta` with `resourceId`
  - `article finalize: sending timespent` with `delta`, `resourceId`, `lock=acquired`
  - Success logs for event send and state persistence

### Banking Integration Considerations
- No changes required to `src/lib/xp/service.ts` or calculator logic; they already invalidate caches and refetch
- Optional later: increase wait from 1.5s to 3–5s or implement a short retry/poll if all minutes are zero. This is not required to fix the core flake.

### Rollout Plan
1) Implement server actions/state for articles mirroring videos (accumulate, partial finalize, finalize with lock)
2) Update article client to emit heartbeats and finalize triggers; remove unmount TimeSpent send
3) Add the proposed logs and verify in Preview/Prod for:
   - Fast navigation: partial finalize succeeds
   - Page close/reload: partial finalize recorded
   - Normal dwell: finalize with lock sends final delta
4) Validate banking after mastery: should see `calculated banked xp` with `awardedResourceCount > 0` for eligible articles

### Risks and Mitigations
- Redis availability: If Redis is unavailable, accumulation/finalization fails. Log and stop (no defaults). Banking will then see 0; operators can investigate via logs. (Same risk profile as video flow.)
- Actor/session mismatch: Server actions enforce current actor via `getCurrentUserSourcedId`; this reduces, but cannot fully eliminate, multi-user device drift if content was viewed under a different session.
- Ingestion delay: The 1.5s delay may still be short under extreme load; optional follow-up to increase delay or add a short retry loop when zero minutes.

### Test Plan
- Unit tests
  - Accumulation clamping vs wall-time
  - Partial finalize delta computation and idempotency
  - Finalize with lock correctness (single-writer; no double-send)
- Integration tests
  - Heartbeat then navigate immediately → partial finalize recorded → TimeSpent present
  - Long dwell → finalize recorded with correct delta → TimeSpent present
  - Attempt 2 banking: eligible articles award minutes > 0
- Edge cases
  - Very short dwell (≤ 20s) → minutes round to 0 (policy expected)
  - Missing email/actor → fail fast and log (no fallback)
  - Redis lock contention → one winner; others no-op cleanly

### Acceptance Criteria
- For articles, TimeSpent events are emitted without relying on client unmount, and include `object.activity.id = <article resource id>`.
- Under fast navigation/tab close, at least a partial delta is recorded and visible in Caliper.
- In banking runs after mastery, eligible articles with non-zero read time reliably contribute minutes and award banked XP.
- Observability: logs clearly show accumulation, partial/final sends, and state updates.

### Open Questions
- Completion heuristic for articles: do we define a canonical "completion" threshold (e.g., dwell X seconds) analogous to video ≥95%? If not, we can skip completion semantics and rely solely on heartbeats + finalize triggers.
- Duration semantics for articles: if we do not have a canonical duration, use dwell-based accumulation only (leave `canonicalDurationSeconds = null`).

### Affected Areas (When Implemented)
- `src/lib/actions/tracking.ts`: add article accumulate/partial/finalize (mirror video), extract shared helpers if desired
- `src/lib/video-cache` → create `src/lib/article-cache` or a generalized `content-cache`
- `src/app/(user)/.../a/[article]/components/content.tsx`: remove unmount send; add heartbeat + finalize triggers
- No changes to `src/lib/data/fetchers/caliper.ts` (calculator already matches by `object.activity.id`)
- No changes to `src/lib/xp/service.ts` required

### Why This Fix Works
- Moves from fragile client unmount to robust server-side, stateful, idempotent emission with locking—proven by the video flow.
- Ensures events include the resource id in `object.activity.id`, enabling reliable matching in the calculator.
- Provides strong logs and metrics for production verification.


