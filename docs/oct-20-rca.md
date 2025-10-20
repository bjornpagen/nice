# Oct 20, 2024 – Assessment Stepper "Try again" RCA

## Summary
- Completing an assessment and pressing `Try again` reloads the same summary because the underlying Redis attempt state stays finalized.
- The client never calls the `startNewAssessmentAttempt` server action before refreshing, so the cached attempt (attempt 1) is still present.

## Impact
- Exercises, quizzes, and tests that render `AssessmentStepper` through the practice route wrappers cannot start a clean retake from the summary screen.
- Students see stale results (`"Keep Practicing, 2/4!"`) instead of a reset stepper and may believe no new attempt is possible.

## Timeline (buglog-take-test-from-scratch.txt)
- `INFO finalizing assessment ...` (line ~1946) – initial run finalizes attempt 1 and persists summary.
- User clicks `Try again`, the UI reloads.
- `INFO resuming an already finalized assessment state ... attemptNumber=1` (line ~2714) – the next page load immediately hydrates the finalized Redis state.
- No `startNewAssessmentAttempt` log entries appear before the reload, confirming the reset action never cleared Redis.

## Detailed Findings

### Client reset path short-circuits
```tsx
// src/components/practice/assessment-stepper.tsx:697-713
const handleReset = async () => {
    if (onRetake) {
        // Use the next attempt number as a hint to parent for UX
        onRetake(serverState.attemptNumber + 1)
        return
    }

    const result = await errors.try(startNewAssessmentAttempt(onerosterResourceSourcedId))
    if (result.error) {
        toast.error("Could not start a new attempt. Please refresh the page manually.")
        return
    }

    router.refresh()
}
```
- Because `onRetake` is truthy, `handleReset` returns **before** invoking `startNewAssessmentAttempt`.

### Practice wrappers always supply `onRetake`
```tsx
// src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/e/[exercise]/components/content.tsx:21-45
<AssessmentStepper
  key={`${exercise.id}:${retakeKey}`}
  ...
  onRetake={(_newAttemptNumber) => {
    setHasStarted(false)
    setRetakeKey((k) => k + 1)
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }}
/>
```
- Quizzes and tests use the same pattern. The callback only tweaks local state and forces a full reload; it never clears Redis.

### Server keeps serving the finalized attempt
- After the reload, `getOrCreateAssessmentState` sees the cached state and logs `resuming an already finalized assessment state ... attemptNumber=1`.
- Because the attempt state remains finalized, the stepper immediately renders the summary with the old score.

## Root Cause
1. `handleReset` is designed to clear the Redis assessment state via `startNewAssessmentAttempt`, but it exits early whenever an `onRetake` prop is provided.
2. All practice wrappers pass a non-null `onRetake` that only reloads the page, so the clearing logic never runs.
3. Without clearing Redis, a refresh simply rehydrates the finalized attempt, making "Try again" a no-op.

## Evidence
- `buglog-take-test-from-scratch.txt` lines ~1946 & 2714 show finalization followed by immediate resumption of the same attempt.
- No `startNewAssessmentAttempt` log entries appear in the log, confirming the server action was not invoked.
- Code snippets above demonstrate why the server action is bypassed.

## Next Steps (proposed)
- Rework the `onRetake` contract so the summary reset path **always** clears Redis via `startNewAssessmentAttempt` before any reload/navigation.
- Add logging or telemetry around the reset path to detect future regressions.

---

## Regression: Retake Shows Identical Question Set (Oct 20, 2024, later)

### Summary
- After fixing the "Try again" button, retakes start a new attempt but still show the identical question set.
- Attempt rotation depends on the attempt number derived from OneRoster results; exercises save results without attempt suffixes, so the system always thinks the next attempt is `1`.

### Timeline (buglog-after-incomplete-fix.txt)
- `INFO derived interactive assessment flag contentType=Exercise isInteractiveAssessment=false ...` — finalization flags the exercise as non-interactive.
- `INFO cleared previous assessment state ... attemptNumber=1 wasFinalized=true` — reset clears Redis but the attempt number coming from OneRoster is still `1`.
- `INFO oneroster: ... count=1 ...` followed by `existingResults=0 nextAttempt=1` — the attempt service sees zero interactive results because it filters on the `_attempt_` pattern.

### Detailed Findings

#### Attempt number derivation
```ts
// src/lib/services/attempt.ts:38-45
const lineItemId = getAssessmentLineItemId(resourceSourcedId)
const resultsResult = await errors.try(oneroster.getAllResults({ filter }))
const validAttempts = filterInteractiveAttemptResults(resultsResult.data, userSourcedId, lineItemId)
const count = validAttempts.length
const nextAttempt = count + 1
```
- Only results whose `sourcedId` matches `nice_${user}_${lineItem}_attempt_${n}` are counted.

#### Exercises save results without attempt suffixes
```ts
// src/lib/actions/assessment.ts:855-865
const isInteractiveAssessmentFlag = options.contentType !== "Exercise"
const command: SaveAssessmentResultCommand = {
  ...
  isInteractiveAssessment: isInteractiveAssessmentFlag,
  attemptNumber,
}

// src/lib/services/assessment.ts:51-63
const resultSourcedId = generateResultSourcedId(userId, resourceId, isInteractiveAssessment, attemptNumber)
```
- When `contentType === "Exercise"`, `isInteractiveAssessmentFlag` becomes `false`.
- `generateResultSourcedId` therefore returns `nice_${user}_${lineItem}` (no `_attempt_` suffix).
- Logs confirm the flag:  
  `INFO derived interactive assessment flag contentType=Exercise isInteractiveAssessment=false correlationId=…`

#### Filter drops exercise results
```ts
// src/lib/utils/assessment-results.ts:70-86
export function filterInteractiveAttemptResults(...) {
  return results.filter((r) => isInteractiveAttemptResult(r, userSourcedId, lineItemId))
}
```
- `isInteractiveAttemptResult` requires the `_attempt_` suffix, so the exercise result saved above is excluded.
- Consequently `validAttempts.length === 0`, so `nextAttempt` stays 1 and question selection is seeded with the same attempt number.

### Root Cause
1. Attempt rotation is keyed on `attemptNumber`, which is derived from OneRoster results using the `_attempt_` ID pattern.
2. The exercise finalization path explicitly marks exercises as non-interactive, causing gradebook results to omit the attempt suffix.
3. Without the suffix, the attempt service never increments the count, so each retake still uses `attemptNumber = 1` and regenerates the identical question set.

### Evidence
- `buglog-after-incomplete-fix.txt` lines ~659 and ~2238 show resets clearing attempt 1.
- Lines ~1947 onward show `isInteractiveAssessment=false`, confirming the gradebook write skips the attempt suffix.
- `existingResults=0 nextAttempt=1` in the same log proves the attempt service cannot see prior exercise attempts.

### Next Steps (proposed)
1. Ensure exercise results are stored with `_attempt_` suffixed IDs (either by marking exercises as interactive for result-generation purposes or by special-casing the filtering logic).
2. If proficiency updates must remain disabled for exercises, split that concern from the result-sourcing flag rather than overloading `isInteractiveAssessment`.
3. Add tests/logs that assert `getNextAttemptNumber` increments after a completed attempt for all content types.
