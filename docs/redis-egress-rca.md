# Redis Redis-Egress Root Cause Analysis

## Incident Context
- 60 pilot students generated ~900 GB of Redis egress in the first week, while Vercel delivered only a few hundred megabytes of HTML/JS.
- Observability shows ~145 K backend requests in that window. The busiest routes are lesson content pages (`/[subject]/[course]/[unit]/[lesson]/v|a|e/...`), followed by course/unit hubs and quiz/test flows.
- Every one of those routes hits the same Redis-backed OneRoster caches, pulling multi-megabyte payloads on each request regardless of what the page actually needs.

The remainder of this document maps those pages to the code paths responsible for the over-fetching, quantifies the payloads, and shows how the request volume multiplies into the observed egress.

## Shared Data Pipelines

| Route sample | Weekly hits | Server entrypoint | Redis keys pulled per request |
|--------------|-------------|-------------------|--------------------------------|
| `/[subject]` | ~5 K | `fetchSubjectCoursesWithUnits` | `oneroster-getAllResources`, `oneroster-getAllComponentResources` **× N courses** |
| `/[subject]/[course]/(overview)` | ~5 K | `fetchCoursePageData` | `oneroster-getAllResources`, `oneroster-getAllComponentResources` |
| `/[subject]/[course]/[unit]` | ~5.6 K | `fetchUnitPageData` (→ `fetchCoursePageData`) | same two global keys |
| `…/v|a|e/...` lesson content | 93 K (video) + 5.3 K (article) + 18 K (exercise) | `fetchLessonLayoutData` (→ `fetchUnitPageData` → `fetchCoursePageData`) | same two global keys once per page view |
| `…/quiz|test/...` redirect + page | ~10.4 K | `findAssessmentRedirectPath` + `fetchQuizPageData` / `fetchUnitTestPageData` | `oneroster-getAllResources` and `oneroster-getAllComponentResources` **twice per hit** (redirect + page + quiz helper) |

### `fetchCoursePageData`: the choke-point
Every route above flows through `fetchCoursePageData`, which unconditionally hydrates the full OneRoster catalog and component-resource join table before filtering to the course in memory:

```ts
// course layout hydration
const allResourcesInSystemResult = await errors.try(getAllResources())
// ...
const allComponentResourcesResult = await errors.try(getAllComponentResources())
const componentResources = allComponentResourcesResult.data.filter((cr) =>
  courseComponentSourcedIds.has(cr.courseComponent.sourcedId)
)
``` 
`src/lib/data/course.ts:187-207`

- `getAllResources()` issues a Redis read for key `oneroster-getAllResources`, whose value is the JSON serialization of **every** Nice Academy resource across every subject/course (`src/lib/data/fetchers/oneroster.ts:229-239`).
- `getAllComponentResources()` does the same for the global component-resource mapping (`src/lib/data/fetchers/oneroster.ts:302-312`).
- No attempt is made to scope these queries server-side; the code downloads the entire payload and then filters it in memory.

### Subject landing page multiplies reads per request
`fetchSubjectCoursesWithUnits` pulls the course layout for *each* course in the subject concurrently, so a page view with six courses fires twelve Redis `GET`s for the two giant keys:

```ts
const courseDataResults = await Promise.all(
  subject.courses.map(async (course) => {
    const data = await fetchCoursePageData(
      { subject: params.subject, course: course.slug },
      { skip: { questions: true } }
    )
    // ...
  })
)
```
`src/app/(user)/(subject-root)/[subject]/subject.queries.ts:68-83`

Because `redisCache` only wraps the fetch in Redis and does not memoize within the request, each `Promise` triggers a full `redis.get` of the same multi-megabyte value.

### Lesson content pages
Every lesson variant (video/article/exercise) calls:

1. `fetchLessonLayoutData` → `fetchUnitPageData` → `fetchCoursePageData`
2. Additional lookups for lesson-scoped resources (small).

So a single student watching a video performs at least one global-resource read and one global-component-resource read (`src/lib/data/content.ts:119-146` via `fetchLessonLayoutData`).

### Quiz/test redirect + playback
Quiz routes load the same heavy caches multiple times in the same navigation:

```ts
// Redirect step
const allComponentResourcesInUnitResult = await errors.try(getAllComponentResources())
const allResourcesResult = await errors.try(getAllResources())
```
`src/lib/utils/assessment-redirect.ts:110-133`

The subsequent quiz page then repeats the pattern through `fetchLessonLayoutData` *and* `findComponentResourceWithContext`, which also calls `getAllComponentResources()` (`src/lib/data/fetchers/interactive-helpers.ts:180-214`). Net effect: a single quiz view typically downloads the global component-resource list three times and the global resource list twice.

### Redis cache behaviour exacerbates duplication

```ts
const getResult = await errors.try(redis.get(key))
// ...
const stringifiedResult = JSON.stringify(result)
await redis.set(key, stringifiedResult, setOptions)
```
`src/lib/cache.ts:49-104`

- Cache hits always pull the entire serialized JSON blob back to the server; there is no streaming, compression, or projection.
- `keysBeingFetched` only logs concurrent hits (`src/lib/cache.ts:41-46`); it does not coalesce requests, so concurrent calls (subject landing page, quiz helpers, etc.) each download the same payload from Redis.

## Payload Size & Egress Math

1. **Measured payload density.** The exported English cartridge contains 140 resources totaling 188 125 B (`≈1.34 KB/resource`) and 140 component-resource rows totaling 44 894 B (`≈0.32 KB/row`). (Computed via `node` script against `data/english-2025-10-16/oneroster/*.json`.)
2. **Production catalog scale.** The Nice Academy org currently publishes several grades × subjects × states. At ~1.34 KB per resource, a catalog with ~4 600 resources (≈330 lessons × 14 items each) already weighs **~6.2 MB** per `getAllResources` read. The matching component-resource join (same cardinality) adds another **~1.5 MB**.
3. **Per-request downloads.** A typical lesson view therefore downloads ≈7.7 MB from Redis (resource table + component-resource table). Subject landing and quiz routes inflate that further by firing the same reads multiple times in parallel.
4. **Weekly egress.** 145 K monitored requests × 6‑8 MB/read ≈ **870–1 160 GB** of egress, matching the 900 GB actually billed. Even with only 60 users, the combination of broad payloads and repeated reads per request drives egress into terabyte territory.

### Why Vercel bandwidth stays small
The HTML/JS sent to the browser is tiny compared with the server-side data pulls:
- Pages render from already-filtered course/unit structures, so the responses are a few dozen kilobytes.
- Static assets come from CDN caches.
- Almost all heavy lifting happens behind the scenes when the Next.js route handler hydrates layout data from Redis; those transfers never touch Vercel’s edge network metrics, but they are counted as Redis egress.

## Root Causes (No Prescriptions Yet)
- **Over-broad cached datasets.** `getAllResources()` and `getAllComponentResources()` return organization-wide tables on every call (`src/lib/data/fetchers/oneroster.ts:229-239`, `:302-312`), even if the caller needs a single course or lesson.
- **Repeated, per-request cache hits.** High-traffic routes invoke `fetchCoursePageData` (directly or indirectly) on every render, leading to at least two large Redis reads per request (`src/lib/data/course.ts:187-207`). Subject hub, quiz redirects, and quiz page helpers re-trigger the same reads multiple times per navigation.
- **No request-level memoization or response compression.** Redis always streams the full JSON string for those keys (`src/lib/cache.ts:49-104`), and concurrent callers each perform their own `GET`.
- **Additional helper duplication.** Quiz/test helpers (`src/lib/utils/assessment-redirect.ts:110-133`, `src/lib/data/fetchers/interactive-helpers.ts:180-214`) call the global caches again even after layout hydration, doubling the read volume for those flows.

These pathways explain both the scale (multi-megabyte payloads) and the multiplicative effect (several identical reads per page view) that produced ~900 GB of Redis egress in a week, despite the small pilot cohort and the modest size of the browser responses.
