# Title, Overview, Goals, Non-Goals:
- **Title:** React Cache Memoization for Course Bundle Data and Progress Fetchers
- **Overview:** Introduce server-only `React.cache` wrappers for the high-traffic course bundle loaders and progress fetchers. Restructure existing loaders to expose raw implementations, add dedicated cache wrapper modules under `src/lib/server-cache/`, and update all server component consumers to import the memoized variants. Optimize `getCourseResourceBundle` to avoid duplicate component fetches and tighten logging so every cache hit/miss is observable. No fallbacks or silent defaults may be introduced—missing data MUST error.
- **Goals:**
  1. Provide raw (uncached) implementations of course/unit/lesson/content/assessment loaders that retain current behaviour and safety checks.
  2. Publish memoized wrappers in a new server-only cache layer that wraps the raw loaders with `React.cache`, using only primitive argument signatures.
  3. Ensure all server components and route loaders import the memoized variants so each request performs at most one Redis GET per course bundle and per user progress map.
  4. Pass preloaded course components into `getComponentResourcesForCourse` from `getCourseResourceBundle` to eliminate duplicate component fetches.
- **Non-Goals:**
  - Changing Redis cache key formats or TTLs.
  - Introducing client-side caching or changing API responses.
  - Refactoring course-builder/admin flows (they continue using raw loaders directly).
  - Adding new fallbacks or default values; all missing/invalid data must continue to throw.

# Files Changed:

>>>> src/lib/course-bundle/course-loaders.ts
- Split existing exports into raw implementations (`fetchCoursePageDataBase`, `fetchUnitPageDataBase`, `fetchLessonLayoutDataBase`) that retain current logic and safety validations. Update internal helper imports accordingly.
- Ensure each raw loader logs an explicit `"raw"` suffix so cache-hit behaviour is observable.
- Accept a strict boolean `skipQuestions` flag (no options object) and pass that flag through all internal helpers.
- Propagate preloaded course components to downstream helpers via explicit helper variants—never optional parameters.
```ts
export async function fetchCoursePageDataBase(
  params: { subject: string; course: string },
  skipQuestions: boolean
): Promise<CoursePageData> {
  logger.info("fetchCoursePageData raw invoked", { params, skipQuestions })
  // existing logic unchanged below…
}
```

>>>> src/lib/course-bundle/content-loaders.ts
- Rename exports to raw variants (`fetchArticlePageDataBase`, `fetchExercisePageDataBase`, `fetchVideoPageDataBase`) and depend on the raw lesson loader.
- Preserve strict metadata validation and error handling (no fallbacks).
```ts
const layoutData = await fetchLessonLayoutDataBase(params)
```

>>>> src/lib/course-bundle/assessment-loaders.ts
- Mirror the raw-export pattern for quiz/unit-test/challenge loaders (`fetchQuizPageDataBase`, `fetchUnitTestPageDataBase`, `fetchCourseChallengePage_TestDataBase`, `fetchCourseChallengePage_LayoutDataBase`) and import the raw course/unit loaders.
- Keep all existing validation branches unchanged.

>>>> src/lib/course-bundle/assessment-redirect.ts
- Import the new cached bundle helper (see `server-cache/bundle.ts`) rather than calling `getCourseResourceBundle` directly.
- Ensure the resolver receives bundle lookups through the cached layer so repeated redirects within one request share work.
```ts
const bundle = await getCachedCourseResourceBundle(courseRecord.sourcedId)
```

>>>> src/lib/data/fetchers/oneroster.ts
- Introduce a dedicated `getComponentResourcesForCourseWithComponents` helper that requires a pre-fetched component array; keep `getComponentResourcesForCourse` as the public entry point that always loads components first. Never pass optional arguments.
- Pass the resolved component array through `getCourseResourceBundle` by calling the explicit helper.
- Update log lines to clarify raw invocation.
```ts
const components = await getCourseComponentsByCourseId(courseSourcedId)
const componentResources = await getComponentResourcesForCourseWithComponents(courseSourcedId, components)
```

>>>> src/lib/server-cache/course-data.ts
- **New file.** Mark server-only with `import "server-only"`.
- Export React `cache`-backed wrappers for course/unit/lesson loaders that accept only primitive arguments. Each wrapper delegates to the corresponding raw loader and returns the raw result.
```ts
import * as React from "react"
import "server-only"
import { fetchCoursePageDataBase, fetchLessonLayoutDataBase, fetchUnitPageDataBase } from "@/lib/course-bundle/course-loaders"

export const getCachedCoursePageData = React.cache(async (subject: string, course: string, skipQuestionsFlag: boolean) => {
  return fetchCoursePageDataBase({ subject, course }, skipQuestionsFlag)
})

export const getCachedUnitPageData = React.cache(async (subject: string, course: string, unit: string) => {
  return fetchUnitPageDataBase({ subject, course, unit })
})

export const getCachedLessonLayoutData = React.cache(async (subject: string, course: string, unit: string, lesson: string) => {
  return fetchLessonLayoutDataBase({ subject, course, unit, lesson })
})
```

>>>> src/lib/server-cache/content-data.ts
- **New file.** Provide cached wrappers for article/exercise/video loaders that depend on `getCachedLessonLayoutData` to reuse the shared lesson bundle.
```ts
export const getCachedExercisePageData = React.cache(async (subject: string, course: string, unit: string, lesson: string, exercise: string) => {
  return fetchExercisePageDataBase({ subject, course, unit, lesson, exercise })
})
```

>>>> src/lib/server-cache/assessment-data.ts
- **New file.** Memoize quiz/unit-test/challenge loaders plus redirect helpers to avoid duplicate bundle evaluation during quiz navigation.
```ts
export const getCachedQuizPageData = React.cache(async (subject: string, course: string, unit: string, lesson: string, quiz: string) => {
  return fetchQuizPageDataBase({ subject, course, unit, lesson, quiz })
})
```

>>>> src/lib/server-cache/bundle.ts
- **New file.** Memoize `getCourseResourceBundle` and expose cached lookup helpers for resource redirects and assessment redirects.
```ts
export const getCachedCourseResourceBundle = React.cache(async (courseSourcedId: string) => {
  return getCourseResourceBundle(courseSourcedId)
})
```

>>>> src/lib/server-cache/progress.ts
- **New file.** Provide a memoized wrapper for `getUserUnitProgress` keyed by `(userId, courseId)` so progress data is fetched once per request.
```ts
export const getCachedUserUnitProgress = React.cache(async (userId: string, courseId: string) => {
  return getUserUnitProgress(userId, courseId)
})
```

>>>> src/lib/data/course.ts
- Re-export the cached course loader for existing imports while also exporting the raw loader for tests/admin flows.
```ts
export { fetchCoursePageDataBase } from "@/lib/course-bundle/course-loaders"
export { getCachedCoursePageData as fetchCoursePageData } from "@/lib/server-cache/course-data"
```

>>>> src/lib/data/unit.ts
- Mirror the re-export pattern for unit data.
```ts
export { fetchUnitPageDataBase } from "@/lib/course-bundle/course-loaders"
export { getCachedUnitPageData as fetchUnitPageData } from "@/lib/server-cache/course-data"
```

>>>> src/lib/data/lesson.ts
- Re-export cached lesson layout loader and raw fallback for tests.
```ts
export { fetchLessonLayoutDataBase } from "@/lib/course-bundle/course-loaders"
export { getCachedLessonLayoutData as fetchLessonLayoutData } from "@/lib/server-cache/course-data"
```

>>>> src/lib/data/content.ts
- Expose cached content loaders by default while keeping raw exports available for integration tests.
```ts
export {
  fetchArticlePageDataBase,
  fetchExercisePageDataBase,
  fetchVideoPageDataBase
} from "@/lib/course-bundle/content-loaders"

export {
  getCachedArticlePageData as fetchArticlePageData,
  getCachedExercisePageData as fetchExercisePageData,
  getCachedVideoPageData as fetchVideoPageData
} from "@/lib/server-cache/content-data"
```

>>>> src/lib/data/assessment.ts
- Re-export cached quiz/unit-test/challenge loaders and redirect helpers while exposing raw implementations under `Base` suffix for tests.
```ts
export {
  fetchQuizPageDataBase,
  fetchUnitTestPageDataBase,
  fetchCourseChallengePage_TestDataBase,
  fetchCourseChallengePage_LayoutDataBase
} from "@/lib/course-bundle/assessment-loaders"

export {
  getCachedQuizPageData as fetchQuizPageData,
  getCachedUnitTestPageData as fetchUnitTestPageData,
  getCachedCourseChallengeTestData as fetchCourseChallengePage_TestData,
  getCachedCourseChallengeLayoutData as fetchCourseChallengePage_LayoutData,
  getCachedQuizRedirectPath as fetchQuizRedirectPath,
  getCachedTestRedirectPath as fetchTestRedirectPath
} from "@/lib/server-cache/assessment-data"
```

>>>> src/lib/utils/assessment-redirect.ts
- Update internal imports to consume cached redirect helpers, ensuring redirect flows reuse bundles grabbed elsewhere in the request.

>>>> src/lib/data/resource-redirect.ts
- Replace direct bundle fetches with the cached bundle helper to prevent redundant bundle loads inside looped resource resolution.
```ts
let bundle = bundleCache.get(courseId)
if (!bundle) {
  bundle = await getCachedCourseResourceBundle(courseId)
  bundleCache.set(courseId, bundle)
}
```

>>>> src/lib/data/progress.ts
- Export both raw and cached versions, logging explicit “raw” invocation. Do not introduce default values; throw when inputs are missing.
```ts
export { getUserUnitProgressRaw as getUserUnitProgress }
export { getCachedUserUnitProgressImpl as getCachedUserUnitProgress }
```

>>>> src/app/(user)/[subject]/[course]/layout.tsx
- Switch imports to the cached course loader and cached progress helper. Remove redundant `Promise.all` branches that re-fetch identical data.
```ts
import { getCachedCoursePageData } from "@/lib/server-cache/course-data"
import { getCachedUserUnitProgress } from "@/lib/server-cache/progress"

const courseDataPromise = normalizedParamsPromise.then((params) =>
  getCachedCoursePageData(params.subject, params.course, true)
)
```

>>>> src/app/(user)/[subject]/[course]/(overview)/page.tsx
- Ensure the overview page consumes cached course data and progress helpers (shared with layout via Suspense).
```ts
const courseDataPromise = normalizedParamsPromise.then((params) =>
  getCachedCoursePageData(params.subject, params.course, false)
)
```

>>>> src/app/(user)/[subject]/[course]/(overview)/[unit]/page.tsx
- Update imports to cached unit data and cached progress.

>>>> src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx
- Import cached course, lesson, and progress loaders. Drop redundant calls that previously fetched course data for the sidebar; rely on cached course data already awaited by layout.
```ts
const dataPromise = normalizedParamsPromise.then((params) =>
  getCachedLessonLayoutData(params.subject, params.course, params.unit, params.lesson)
)
```

>>>> src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/e/[exercise]/page.tsx
- Replace imports with cached exercise loader (delegates to cached lesson loader).

>>>> src/app/(user)/[subject]/[course]/(practice)/test/[test]/page.tsx
- Import cached challenge layout/test loaders and cached progress helper.

>>>> src/lib/utils/progress.ts
- If any helper expects a raw progress map factory, update it to accept either a `Map` or a promise resolved from the cached helper without duplicating fetches.

- **Logging Requirements (applies across all file updates):**
  - Follow `structured-logging.mdc`—all statements must use `@superbuilders/slog` with terse messages and structured attributes.
  - Log every invocation of the React cache wrappers at `debug` level. Example:
    ```ts
    logger.debug("course page cache invoked", { subject, course, skipQuestions })
    ```
  - Log every execution of the raw loaders at `info` level with `"raw"` in the message so it’s obvious when the cache is bypassed:
    ```ts
    logger.info("fetchCoursePageData raw executed", {
      subject: params.subject,
      course: params.course,
      skipQuestions
    })
    ```
  - In `getComponentResourcesForCourseWithComponents`, log the component count before querying component resources:
    ```ts
    logger.debug("loading component resources", {
      courseSourcedId,
      componentCount: components.length
    })
    ```
    and log errors prior to throwing:
    ```ts
    logger.error("component resources lookup failed", {
      courseSourcedId,
      reason: "no components provided"
    })
    ```
  - Add `debug` logs around cache-aware helpers indicating the key being consulted:
    ```ts
    logger.debug("bundle cache requested", { courseId })
    logger.debug("user progress cache requested", { userId, courseId })
    ```
  - Ensure all error paths continue logging at `error` with full context before throwing—no silent failures, no fallbacks.

- After implementing all changes, commit with message: `feat: memoize course data loaders with react cache`.
