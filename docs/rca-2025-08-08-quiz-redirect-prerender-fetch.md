### Root Cause Analysis: Quiz Redirect – prerender fetch rejection due to duplicate concurrent requests

- **Date/Time observed**: 2025-08-08 16:24:28Z
- **Surface**: App Router page `.../(practice)/[unit]/quiz/[quiz]/page.tsx` (quiz redirect page)
- **Impact**: User-facing navigation still succeeds, but server logs emit errors. Increased load due to duplicated OneRoster calls; potential flakiness if retries differ.
- **Severity**: P2 (noise + wasted work, potential to escalate under load)

### Symptoms (from logs)

- Multiple duplicate invocations within the same second:
  - "filtered resources for course" repeated
  - "getAllComponentResources called" repeated
  - "quiz redirect page: fetching canonical path" repeated
  - "getCourseComponentByCourseAndSlug called" repeated
- Cache layer warning: "concurrent request for same cache key detected"
- Followed by: "oneroster auth: token fetch failed error=Error: During prerendering, fetch() rejects when the prerender is complete..."
- Then higher-level errors: "failed to fetch unit by course and slug" and "failed to determine quiz redirect path"

### What actually happened

1. Request hits the quiz redirect page, which starts computing the canonical redirect path:

```1:29:src/app/(user)/[subject]/[course]/(practice)/[unit]/quiz/[quiz]/page.tsx
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { notFound, redirect } from "next/navigation"
import { fetchQuizRedirectPath } from "@/lib/data/assessment"
import { normalizeParamsSync } from "@/lib/utils"

export default async function QuizRedirectPage({
    params
}: {
    params: Promise<{ subject: string; course: string; unit: string; quiz: string }>
}) {
    const resolvedParams = await params
    const normalizedParams = normalizeParamsSync(resolvedParams)
    logger.info("quiz redirect page: fetching canonical path", { params: normalizedParams })

    const redirectPathResult = await errors.try(fetchQuizRedirectPath(normalizedParams))
    if (redirectPathResult.error) {
        logger.error("failed to determine quiz redirect path", {
            error: redirectPathResult.error,
            params: normalizedParams
        })
        notFound()
    }

    redirect(redirectPathResult.data)
}
```

2. The helper dispatches multiple OneRoster-backed fetchers and resource scans:

```30:86:src/lib/utils/assessment-redirect.ts
export async function findAssessmentRedirectPath(params: AssessmentRedirectParams): Promise<string> {
    logger.info("finding assessment redirect path", {
        assessmentType: params.assessmentType,
        params
    })
    const coursesResult = await errors.try(getAllCoursesBySlug(params.course))
    ...
    const unitResult = await errors.try(getCourseComponentByCourseAndSlug(courseSourcedId, params.unit))
    ...
    const lessonsResult = await errors.try(getCourseComponentsByParentId(unitSourcedId))
    ...
    const allComponentResourcesInUnitResult = await errors.try(getAllComponentResources())
    ...
    const allResourcesResult = await errors.try(getAllResources())
    ...
}
```

3. The OneRoster fetcher `getCourseComponentByCourseAndSlug` is wrapped in our Redis cache:

```175:191:src/lib/data/fetchers/oneroster.ts
export async function getCourseComponentByCourseAndSlug(courseSourcedId: string, slug: string) {
    logger.info("getCourseComponentByCourseAndSlug called", { courseSourcedId, slug })
    const operation = async () => {
        const components = await oneroster.getCourseComponents({
            filter: `metadata.khanSlug='${slug}' AND status='active'`
        })
        const activeComponents = ensureActiveStatus(components)
        return activeComponents.filter((c) => c.course.sourcedId === courseSourcedId)
    }
    return redisCache(operation, ["oneroster-getCourseComponentByCourseAndSlug", courseSourcedId, slug], {
        revalidate: 3600 * 24
    })
}
```

4. Our cache logs stampedes but does not coalesce requests:

```41:48:src/lib/cache.ts
// Check if this key is already being fetched (potential stampede)
if (keysBeingFetched.has(key)) {
    logger.warn("concurrent request for same cache key detected", { key })
    // For now, we'll just log and continue
}
```

5. The OneRoster client acquires an access token on demand using `fetch`:

```415:433:src/lib/oneroster.ts
async #getAccessToken(): Promise<string> {
    logger.debug("oneroster: fetching new access token")
    const result = await errors.try(
        fetch(this.#config.tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params })
    )
    if (result.error) {
        logger.error("oneroster auth: token fetch failed", { error: result.error })
        throw errors.wrap(result.error, "oneroster token fetch")
    }
    ...
}
```

6. Under duplicate invocation, once the first request completes the redirect, the prerender is considered complete. Any in-flight duplicate that subsequently attempts `fetch` (token fetch or API call) will be rejected by Next.js with:

> During prerendering, fetch() rejects when the prerender is complete ... if you move fetch() to a different context by using `setTimeout`, `after`, or similar functions you may observe this error

This matches the exact error observed in the logs.

### Why it happened (root cause)

- **Primary cause**: Duplicate concurrent execution of the same cached operation during prerender (no request coalescing). After one branch returns and the route redirects (prerender completes), the other branch continues and reaches a `fetch` call, which Next rejects post-prerender.

### Contributing factors

- **Cache stampede allowed**: `redisCache` only warns on concurrent keys; it does not share a single in-flight promise across callers.
- **Multiple upstream calls**: The redirect computation triggers several OneRoster-backed lookups (`getAllCoursesBySlug`, `getCourseComponentByCourseAndSlug`, `getCourseComponentsByParentId`, plus resource scans). The wider the fan-out, the higher the chance of concurrency overlaps.
- **RSC prefetch/double-invocation behavior**: App Router can initiate multiple overlapping work units (e.g., RSC flight and parallel invocations), increasing the likelihood of duplication.
- **Timer-based retry present in OneRoster client for 5xx**: While not implicated in this specific stack (error occurs on initial token fetch), timer usage during prerender can further risk post-prerender fetches if anything yields control and resumes later.

### Scope

- Affects any route performing multiple OneRoster-backed fetches during prerender where duplicated execution can occur (quiz/test redirect pages most notably).
- Not limited to quizzes; unit tests redirect path uses the same helper and would be susceptible.

### Reproduction (dev)

1. Start the app and ensure Redis is available.
2. Hit a quiz redirect URL like:
   `/math/cc-sixth-grade-math/cc-6th-arithmetic-operations/quiz/cc-6th-arithmetic-operations-quiz-1`
3. Observe logs:
   - Duplicate "quiz redirect page" entries
   - `concurrent request for same cache key detected`
   - Followed by `oneroster auth: token fetch failed ... During prerendering, fetch() rejects ...`

### Mitigations (no code changes applied yet)

- **Coalesce duplicate cache requests**: Upgrade `redisCache` to maintain a `Map<key, Promise>` for in-flight operations and return the same promise to all callers. This eliminates the post-prerender duplicate branch.
- **Minimize fetch fan-out during redirect**: Reduce the number of upstream calls in `findAssessmentRedirectPath` or sequence them to lower concurrency surface.
- **Mark route dynamic or ensure work stays within prerender window**: Explicitly opt-out of prerender for redirect pages (e.g., force dynamic), or guarantee no additional background/timer-based work occurs that could attempt fetch after completion.
- **Deduplicate OneRoster token acquisition**: Internally gate token fetch with a single in-flight promise to avoid parallel token fetches under load.

### Decision record

- Root cause identified as duplicate concurrent execution during prerender leading to post-prerender `fetch()` attempts.
- No edits applied in this change. Follow-up will implement request coalescing in cache and, if needed, dynamic rendering for redirect pages.

### References

- Quiz redirect page invocation and logging
```1:29:src/app/(user)/[subject]/[course]/(practice)/[unit]/quiz/[quiz]/page.tsx
```
- Redirect path computation fan-out
```30:181:src/lib/utils/assessment-redirect.ts
```
- OneRoster fetcher wrapped in Redis cache
```175:191:src/lib/data/fetchers/oneroster.ts
```
- Cache stampede warning without coalescing
```41:48:src/lib/cache.ts
```
- OneRoster token fetch location where rejection is thrown
```415:455:src/lib/oneroster.ts
```

