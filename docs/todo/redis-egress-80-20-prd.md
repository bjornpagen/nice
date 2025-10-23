Title, Overview, Goals, Non-Goals:

Title: Redis Course Bundle 80/20 Remediation

Overview: This PRD describes the mandatory 80/20 remediation that eliminates organization-wide Redis reads from the highest-traffic Nice Academy user flows (subject hub, course, unit, lesson, quiz/test). Today those routes call `getAllResources()` and `getAllComponentResources()` which download multi‑megabyte payloads for every request, causing ~900 GB/week of Redis egress. The plan introduces course-scoped bundles cached under course IDs and rewires all hot paths to the new API so each request fetches only the data it needs. All legacy helpers used by these routes are removed to prevent accidental regression—no fallbacks remain.

Goals:
- Stop `fetchCoursePageData`, quiz redirects, and interactive helpers from reading org-wide Redis keys.
- Serve course/lesson/quiz pages using course-scoped bundles cached under the new key `oneroster-course-bundle:{courseId}`.
- Provide deterministic, validated lookups for lesson content and assessments without defaulting or guessing.
- Reduce Redis egress by >80% while maintaining existing UX and data semantics.
- Maintain seamless coexistence with the currently deployed version: older pods continue to rely on the legacy `oneroster-getAllResources` / `oneroster-getAllComponentResources` keys, while the new deployment reads only the `oneroster-course-bundle:{courseId}` key. No shared keys change format, so both deployments operate safely during rollout.
- Keep the solution focused on eliminating over-fetching; we are intentionally not introducing request-scoped caches or in-memory memo layers in this 80/20 fix, and double-hitting Redis is acceptable so long as each hit targets the course-scoped bundle.

Non-Goals:
- No changes to admin-only course builder flows (they may continue using broader fetchers for now).
- No attempt to redesign assessment caching beyond swapping data sources.
- No fallback logic—every missing dataset must raise an explicit error.
- No request-level deduplication or memoisation. Avoid extra engineering for per-request cache coalescing; the only requirement is that calls hit the course-scoped bundle instead of the org-wide payload.

Files Changed:

>>>> src/lib/data/fetchers/oneroster.ts
- Rename the existing global helpers so their intent is explicit and course-builder-only:
  - `getAllResources` → `getAllResourcesForCourseBuilder`
  - `getAllComponentResources` → `getAllComponentResourcesForCourseBuilder`
  - Update JSDoc to state: “⚠️ Course Builder only. Do not call from user flows.” Keep their Redis cache keys unchanged so older deployments continue to function.
- Introduce `getCourseResourceBundle(courseSourcedId: string)`:
  ```ts
  export interface CourseResourceBundle {
    courseId: string
    courseComponents: CourseComponentReadSchemaType[]
    componentResources: ComponentResourceReadSchemaType[]
    resources: Array<Resource & { metadata: ResourceMetadata }>
  }

  export async function getCourseResourceBundle(courseSourcedId: string): Promise<CourseResourceBundle> {
    if (!courseSourcedId) {
      throw errors.new("getCourseResourceBundle: courseSourcedId required")
    }

    const cacheKey = ["oneroster-course-bundle", courseSourcedId]

    return redisCache(
      async () => {
        const components = await getCourseComponentsByCourseId(courseSourcedId)
        if (components.length === 0) {
          throw errors.new("getCourseResourceBundle: course has no components")
        }

        const componentIds = components.map((c) => c.sourcedId)
        const componentResources = await getComponentResourcesForCourse(courseSourcedId)
        if (componentResources.length === 0) {
          throw errors.new("getCourseResourceBundle: component resources missing")
        }

        const resources = await getResourcesForCourseCached(courseSourcedId)
        if (resources.length === 0) {
          throw errors.new("getCourseResourceBundle: resources missing")
        }

        const validated = resources.map((resource) => {
          const metadata = ResourceMetadataSchema.parse(resource.metadata)
          return { ...resource, metadata }
        })

        return {
          courseId: courseSourcedId,
          courseComponents: components,
          fetchedAt: new Date().toISOString(),
          componentCount: componentResources.length,
          resourceCount: validated.length,
          componentResources,
          resources: validated
        }
      },
      cacheKey,
      { revalidate: 3600 }
    )
  }
  ```
- Document the payload schema to ensure denormalised data remains backwards compatible even if we later evolve the bundle. The bundle includes counts and timestamp fields so ops can validate contents without extra fetches.
- Add helper selectors:
  ```ts
  export function findLessonResources(bundle: CourseResourceBundle, lessonId: string): ComponentResourceReadSchemaType[] {
    const matches = bundle.componentResources.filter((cr) => cr.courseComponent.sourcedId === lessonId)
    if (matches.length === 0) {
      throw errors.new("findLessonResources: no matches")
    }
    return matches
  }

  export function findResourceById(bundle: CourseResourceBundle, resourceId: string): Resource & { metadata: ResourceMetadata } {
    const match = bundle.resources.find((r) => r.sourcedId === resourceId)
    if (!match) {
      throw errors.new("findResourceById: resource not found")
    }
    return match
  }
  ```
Ensure all throw paths log via `logger.error` before throwing.
- Store precomputed lookup helpers inside the bundle module (e.g. `const componentById = new Map(bundle.courseComponents.map((c) => [c.sourcedId, c]))`) so callers can resolve hierarchy relationships without additional network round trips.
- Add `getComponentResourcesByResourceId(resourceSourcedId: string)` that filters `oneroster.getAllComponentResources` by `resource.sourcedId='${resourceSourcedId}' AND status='active'`, applies `ensureActiveStatus`, and caches the result under a key derived from the single resource ID. This keeps reverse lookups scoped to one resource without reviving the org-wide table scan.
- Add `getResourcesForCourseCached(courseSourcedId: string)` that wraps `oneroster.getResourcesForCourse(courseSourcedId)` in `redisCache`, applies `ensureActiveStatus`, and caches under `oneroster-getResourcesForCourse:{courseId}`. This replaces the brittle `getResourcesByIds` code path and avoids oversized `@` filters.
- Document the bundle schema in this file (and in `docs/oneroster-bundle.md` if needed):
  ```ts
  type CourseResourceBundleWireFormat = {
    courseId: string
    courseComponents: CourseComponentReadSchemaType[]
    fetchedAt: string // ISO timestamp
    componentCount: number
    resourceCount: number
    componentResources: ComponentResourceReadSchemaType[]
    resources: Array<Resource & { metadata: ResourceMetadata }>
  }
  ```
- Add `invalidateCourseResourceBundle(courseSourcedId: string)` that deletes the bundle (`oneroster-course-bundle:{courseId}`), the course-scoped component-resource cache (`oneroster-getComponentResourcesForCourse:{courseId}`), and the new resource cache (`oneroster-getResourcesForCourse:{courseId}`). Use this helper wherever OneRoster data is mutated so stale bundles never survive.

>>>> src/lib/data/course.ts
- Replace the global `getAllResources` / `getAllComponentResources` usage with `getCourseResourceBundle`.
- Retrieve the bundle exactly once per `fetchCoursePageData` invocation and pass it down through local helpers—no request-level memo. Example:
  ```ts
  const bundle = await getCourseResourceBundle(courseSourcedId)
  ```
- Keep the bundle server-only by stashing it in a request-scoped `WeakMap` keyed by the returned object. Never add an enumerable `bundle` field to values that cross the RSC boundary.
- Rewrite resource filtering logic to operate on the bundle:
  ```ts
  const componentResources = bundle.componentResources.filter((cr) => courseComponentSourcedIds.has(cr.courseComponent.sourcedId))
  const resourcesById = new Map(bundle.resources.map((resource) => [resource.sourcedId, resource]))
  ```
- Update the exercise question preparation to pull IDs from the bundle instead of calling removed helpers.
- Delete any dead code referencing the old helpers; ensure all paths validate that required data exists (throw on missing data).
- When returning nested data structures (units, lessons, assessments), expose only the derived data; downstream code that needs the raw bundle must read it back out of the shared `WeakMap`.

>>>> src/app/(user)/(subject-root)/[subject]/subject.queries.ts
- When hydrating course cards, call `getCourseResourceBundle` once per course and stash it in the shared request-scoped `WeakMap` so the bundle stays server-only. If the same request needs the bundle again, reuse the stashed value rather than re-fetching, but it is acceptable to call the bundle loader multiple times; the critical change is that each call is course-scoped.
- Remove imports of deleted helpers.

>>>> src/lib/data/unit.ts
- Update the `fetchUnitPageData` signature to accept an optional `CourseResourceBundle` parameter. If provided, reuse it; if absent, call `getCourseResourceBundle`. Throw if the bundle does not contain the requested course/lesson data.
- Store any fetched bundle in the shared request-scoped `WeakMap` rather than returning it as part of `UnitPageData`.

>>>> src/lib/data/lesson.ts
- Update `fetchLessonLayoutData` to require a bundle parameter (pass-through from unit/course fetchers). Throw an explicit error if the bundle is missing.
- Validate that the requested lesson slug resolves to a lesson using bundle data; throw explicit error if not found.
- Never expose the bundle on the returned layout data; read it from the shared `WeakMap` when needed.

>>>> src/lib/data/profile.ts
- Replace the combined `getAllResources`/`getAllComponentResources` calls in `fetchUserEnrolledCourses` with per-course bundles:
  ```ts
  const bundle = await getCourseResourceBundle(courseSourcedId)
  ```
- Thread the bundle through the existing unit/lesson construction logic instead of filtering global arrays.
- Ensure we fetch a bundle only for courses the user is actively enrolled in; do not touch other courses.
- Make the function throw if the bundle is missing required metadata rather than continuing with partial data.

>>>> src/lib/data/resource-redirect.ts
- Eliminate the broad `getAllComponentResources` + `getAllCourses` scan. After locating the target resource (via `getResourcesBySlugAndType`), call `getComponentResourcesByResourceId(resource.sourcedId)` so you only load component-resource rows for that resource.
- For each returned component-resource:
  1. Fetch the backing course component via `getCourseComponentsBySourcedId` to read its `course.sourcedId` and parent relationships. This is the canonical course identifier—stay within the existing `ResourceMetadataSchema`.
  2. Load the bundle for that course ID (reuse the bundle for additional matches pointing at the same course).
  3. Inside the bundle, use `bundle.courseComponents` plus the component-resource entry to reconstruct the hierarchy (course component → parent unit → lesson) and build the final path segments.
- If more than one distinct course owns the resource, log and throw an explicit error so data cleanup can happen instead of falling back to the wrong course.
- Use bundle contents to locate the lesson/unit hierarchy and build the path, throwing if any component is missing.
- Remove any loops that iterate over unrelated courses.

>>>> src/lib/utils/assessment-redirect.ts
- Swap calls to `getAllComponentResources`/`getAllResources` with bundle access:
  ```ts
  const bundle = assessmentLookup.bundle ?? (await getCourseResourceBundle(courseSourcedId))
  const unitComponentResources = bundle.componentResources.filter(/* unit + lessons */)
  const assessmentResource = bundle.resources.find(/* slug + activityType */)
  ```
- Remove any legacy warnings referencing global fetchers.
- Strictly throw when the resource or component list is empty.

>>>> src/lib/data/fetchers/interactive-helpers.ts
- Update signatures to accept a `CourseResourceBundle`. Example:
  ```ts
  export async function findResourceInLessonBySlugAndType(options: {
    bundle: CourseResourceBundle
    lessonSourcedId: string
    slug: string
    activityType: "Article" | "Video" | "Exercise"
  })
  ```
- Ensure `findComponentResourceWithContext` and `findCourseChallenge` use the bundle’s `componentResources` array instead of global fetches.
- Delete redundant Redis calls and ensure each helper throws when data is missing rather than falling back.

>>>> src/lib/data/content.ts
- Ensure article/video/exercise loaders require a bundle parameter sourced from lesson/unit data. They must never call OneRoster directly.
- Validate metadata using already-parsed bundle metadata to avoid re-parsing.

>>>> src/lib/actions/courses.ts (and any other OneRoster mutation paths)
- After any mutation that changes course components, resources, or component-resources, call `invalidateCourseResourceBundle(courseId)` so subsequent requests rebuild the bundle with fresh data. This helper must wipe the bundle key, `oneroster-getComponentResourcesForCourse:{courseId}`, and `oneroster-getResourcesForCourse:{courseId}`.
- Update tests to verify invalidation occurs.

>>>> src/app/(admin)/course-builder/actions.ts
- After completing each mutation step (create/update/delete resources, course components, component resources), call `invalidateCourseResourceBundle(courseSourcedId)` so authoring changes invalidate the bundle cache, the per-course component-resource cache, and the per-course resource cache. Keep the existing legacy invalidations for backwards compatibility.
- Add targeted tests ensuring the helper runs for every mutation path.

>>>> src/lib/data/fetchers/oneroster-course-builder.ts (new optional helper module)
- If course-builder flows need the renamed global helpers, centralise their usage in a dedicated module so future audits can confirm they remain isolated from user flows.

>>>> Tests
Update existing unit/integration tests under `tests/actions` and `tests/app`:
```ts
it("fetchCoursePageData loads course-scoped bundle", async () => {
  expect(redis.get).toHaveBeenCalledWith(expect.stringContaining("oneroster-course-bundle"))
})

it("assessment redirect fails when resource missing") // ensure throws
```
Remove mocks tied to deleted helpers and assert the new bundle functions are invoked.
- Add negative tests covering:
  - Missing lesson in bundle → throws.
  - Bundle missing component resources → throws.
  - Course builder mutations → bundle invalidated.
- Add unit tests for `fetchUserEnrolledCourses` and `findResourcePath` to confirm they no longer call the deprecated global helpers and that they throw when the bundle lacks the requested course data.
- Add integration coverage ensuring course builder still functions using the renamed helpers.

Commit with message: `chore: scope oneroster redis caches to course bundles`
