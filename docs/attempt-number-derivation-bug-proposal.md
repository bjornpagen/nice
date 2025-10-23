# Attempt Number Derivation Bug — Proposed Fix

## Context
- Every assessment request re-derives the attempt number by calling OneRoster (`src/lib/services/attempt.ts:18` → `getNext`) through the `getNextAttemptNumber` helper exported in `src/lib/actions/assessment.ts:628`.
- The derived attempt number is then used to locate the cached Redis state (`src/lib/assessment-cache.ts:99`) or to branch into new-state creation (`src/lib/actions/assessment.ts:232`, `:293`, `:485`, `:557`, `:743`, `:1037`).
- The prod failure shows OneRoster briefly returning `existingResults=0 nextAttempt=1` even though the in-progress state had already been provisioned under attempt `>1`. That drift makes `getAssessmentState(...)` return `null`, triggering `ErrAssessmentStateNotFound`.
- Because every mutation re-derives the attempt number afresh, any transient blip in the OneRoster result set immediately strands the real state.

### Goals
1. Once an attempt state is created, all follow-on mutations must use the same attempt number, regardless of temporary inconsistencies upstream.
2. Resuming an existing in-progress attempt must not depend on OneRoster.
3. We must remain backwards compatible with active sessions while rolling out the change.
4. UX should remain identical (same question order, same pagination, same summary path).

## Proposed Design Overview
1. **Add a Redis “active attempt” pointer per user/resource.**  
   - Key: `assess:active:{userId}:{resourceId}` storing the current attempt number as a string (TTL matches `ASSESSMENT_STATE_TTL_SECONDS`).  
   - Helper API in `src/lib/assessment-cache.ts`:
     - `getActiveAttemptNumber(userId, resourceId)` → number \| null (refreshes TTL on read).
     - `setActiveAttemptNumber(userId, resourceId, attemptNumber)` (sets TTL).
     - `clearActiveAttemptNumber(userId, resourceId)` (used on reset).
     - `findLatestCachedAttemptNumber(userId, resourceId)` → optional scan fallback when the pointer is missing but state keys still exist.
2. **Centralise attempt resolution in the server actions.**
   - New helper inside `src/lib/actions/assessment.ts` (e.g., `resolveAssessmentContext`) encapsulates:
     1. Read pointer.
     2. If pointer missing or stale, call `findLatestCachedAttemptNumber` to recover any existing state and re-seed the pointer.
     3. If no cached attempt exists, derive a fresh number from OneRoster (existing `attempt.getNext`), create/return the state, and persist the pointer.
   - All mutations (`submitAnswer`, `skipQuestion`, `reportQuestion`, `finalizeAssessment`, `startNewAssessmentAttempt`) call that helper and use the returned `{ state, attemptNumber }` instead of recalculating the number themselves.
3. **Question preparation honours the pointer.**
   - `prepareInteractiveAssessment` (`src/lib/interactive-assessments.ts:22`) should:
     - Check for an active pointer via the new helper (needs a non-auth variant that accepts `userSourceId`).
     - Use the pointer attempt number when resuming.
     - Only fall back to OneRoster when no pointer/cache is available (i.e., first-ever attempt).
   - This keeps SSR question ordering aligned with the cached attempt.
4. **Reset flow uses pointer instead of OneRoster.**
   - `startNewAssessmentAttempt` should:
     1. Read pointer (or use `findLatestCachedAttemptNumber`).
     2. Delete the cached state for that attempt via `deleteAssessmentState`.
     3. Clear the pointer.
     4. Return `{ success: true, clearedAttempt: number }` so `AssessmentStepper` can log/telemetry if needed.
5. **Client changes (minimal).**
   - `AssessmentStepper` already stores `serverState` (which includes `attemptNumber`). No behaviour change is needed beyond tolerating the optional `clearedAttempt` response.
   - We may add a guard to ensure `handleReset` ignores the returned hint from the server rather than computing `serverState.attemptNumber + 1`.
6. **Telemetry & logging.**
   - Add structured logs whenever the pointer is missing but an existing cached state is recovered (to detect drift).
   - Add warnings if the pointer references a missing state (indicates a flush or TTL expiry).

## File-by-File Changes

### `src/lib/assessment-cache.ts`
- Introduce pointer helpers described above plus a small internal util `getActiveAttemptKey`.
- Extend `deleteAssessmentState` to also delete the pointer (after verifying the pointer matches the deleted attempt to avoid nuking concurrent attempts).
- Optional: expose `scanAssessmentAttempts(userId, resourceId)` implemented with `redis.scanIterator` to support diagnostics/tests.

### `src/lib/actions/assessment.ts`
- Create a private `async function getActiveState(onerosterUserSourcedId, assessmentId)` that returns `{ state, attemptNumber }` or `null`.
- Create a private `async function ensureActiveState(onerosterUserSourcedId, assessmentId)` used by `getOrCreateAssessmentState`; it encapsulates the fallback sequence:
  1. Attempt pointer lookup.
  2. Pointer-stale recovery via `findLatestCachedAttemptNumber`.
  3. Fallback to OneRoster and state creation.
- Replace all direct `getNextAttemptNumber` calls in `submitAnswer`, `skipQuestion`, `reportQuestion`, `finalizeAssessment`, and `startNewAssessmentAttempt` with the new helpers. These functions should now:
  - Use the returned state’s `attemptNumber` when calling `updateStateAndQuestion`, `markAssessmentFinalized`, etc.
  - Throw a specific error if no active attempt can be found (after trying recovery), prompting the client to reinitialise.
- Adjust `getOrCreateAssessmentState` to:
  - Try pointer / cached state first.
  - If a new attempt is created, set the pointer before returning the new state.
- Export a renamed helper `deriveNextAttemptNumber` (wrapper over `attempt.getNext`) for any remaining use cases that truly need a fresh number (e.g., admin tooling, analytics tests).

### `src/lib/services/attempt.ts`
- Keep the implementation unchanged but clarify in comments that it should only be used for **deriving** the next attempt during fresh state creation (not for resuming).
- Rename the exported function to `deriveNextAttemptNumber` to reduce accidental misuse.
- Update import sites (`src/lib/actions/assessment.ts`, `src/lib/interactive-assessments.ts`) accordingly.

### `src/lib/interactive-assessments.ts`
- Inject a dependency on the pointer helper (needs a variant that works with `userSourceId` rather than Clerk auth).
- New flow:
  1. `await getActiveAttemptNumber(userSourceId, resourceSourcedId)` to detect an in-progress attempt.
  2. If found, reuse that attempt number for question ordering.
  3. Else, call `deriveNextAttemptNumber` to seed the deterministic question list for the upcoming attempt (without persisting the pointer yet).

### `src/components/practice/assessment-stepper.tsx:347-520`
- When `startNewAssessmentAttempt` resolves, prefer the server-reported `clearedAttempt` (if present) rather than assuming `attempt + 1`.
- Add defensive UI logging if the server returns `success:false` or cannot clear the attempt (should not happen but helps debugging).

### Tests
- Update assessment action tests to mock the new pointer helpers:
  - Ensure `submitAnswer` doesn’t call `deriveNextAttemptNumber` once a pointer is in place.
  - Simulate pointer loss + cached state recovery.
  - Simulate pointer + cache missing to validate new error messaging.
- Add integration coverage for `startNewAssessmentAttempt` to verify it clears pointer and state.
- Extend existing rotation tests to use the pointer when resuming attempts, ensuring question sets stay aligned.

## Rollout & Backwards Compatibility
1. **Pointer bootstrapping:**  
   - The first request after deployment will see “pointer missing.” The new recovery path (`findLatestCachedAttemptNumber`) will rehydrate the pointer from any existing `assess:state` keys, preserving in-flight attempts.
2. **Mixed-version safety:**  
   - Old pods can continue calling `getNextAttemptNumber` during rollout; the pointer is a pure additive change. Once the new version is stable we can remove the legacy calls.
3. **Redis flush scenario:**  
   - If someone flushes Redis, both the state and pointer disappear together. The system falls back to deriving a fresh attempt, identical to today.

## Open Questions / Follow-ups
- Should we expose the pointer helper via an Inngest task for ops visibility? (e.g., an admin endpoint listing active attempts per user).
- Do we want to reject client calls if they pass an attempt number different from the pointer to guard against tampering? (Out of scope now but easier once pointer exists.)

## Next Steps
1. Implement pointer helpers and update server actions.
2. Update `interactive-assessments` and `assessment-stepper`.
3. Refresh tests + add new cases.
4. Deploy behind a feature flag if desired; monitor logs for new warnings (`pointer missing`, `pointer stale`).
5. Remove the old `getNextAttemptNumber` exports once the new approach is prove-out.

