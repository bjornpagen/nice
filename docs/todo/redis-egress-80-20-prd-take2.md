# Redis Course Bundle 80/20 Remediation (Take 2)

## Overview
We will introduce a course-scoped Redis bundle and swap the highest-traffic user flows off the legacy OneRoster helpers in a single deploy (no feature flag). The new bundle-backed loaders cover the subject hub, course/unit/lesson pages, lesson content, and assessment flows that were responsible for the egress spike in `docs/redis-egress-rca.md`. Legacy helpers remain available for course-builder, ingestion jobs, resource redirects, and profile until dedicated follow-ups land. This document spells out the code changes, rollout plan, monitoring, tests, and commit message.

## Why Take 2 Is Better
- All bundle-aware logic lives in `src/lib/course-bundle/`, making ownership and usage boundaries explicit.
- Targeted routes move to the new loaders in one deploy, avoiding the dual-path ambiguity from the original PRD while leaving admin tooling untouched.
- Each affected route (subject hub, course/unit/lesson pages, lesson content, quizzes/tests) has explicit import and usage instructions—no guesswork while implementing.
- Logging, staging validation, and rollback requirements are captured up front so the on-call path is clear.
- Tests (parity, negative/edge cases, invalidation coverage) are specified to prevent silent regressions.
- Every hot path from the RCA is covered by bundle-backed loaders, eliminating the global Redis scans and duplicate fetches that caused the 900 GB egress incident.

## Goals
- Provide `getCourseResourceBundle` (per-course cached view + lookup maps) and helper selectors.
- Add a request-scoped store (`stashBundle` / `requireBundle`) to keep bundles on the server while sharing across chained loaders.
- Implement bundle-based course/unit/lesson loaders, lesson-content helpers, assessments, and redirect helpers in a dedicated directory, then switch the targeted user routes to them immediately.
- Ensure cache invalidation touches the new bundle keys whenever a OneRoster mutation occurs (course-builder + relevant server actions).
- Produce documentation, instrumentation, tests, and rollout guidance without disturbing untouched surfaces.

## Non-Goals
- Migrating profile pages, resource redirect fallback logic, ingestion pipelines, or CLI scripts (captured as follow-ups).
- Removing legacy OneRoster helpers or Redis keys.
- Deduplicating bundle fetches across concurrent requests (leave existing `redisCache` behaviour intact).
- Additional performance tuning beyond eliminating the org-wide reads that were causing the egress spike.

## Backward Compatibility
- Legacy Redis keys (`oneroster-getAllResources`, `oneroster-getAllComponentResources`, etc.) remain untouched so older pods continue to function until drained.
- The new invalidation helper is always invoked **in addition** to existing invalidation logic, keeping both cache families fresh during rollout.
- Course-builder/admin flows use `src/lib/data/fetchers/oneroster-course-builder.ts`, guaranteeing no behavioural change outside the targeted user routes.
- Vercel-rendered HTML/JS remains identical; only server-side data fetching changes.
- New Redis keys (`oneroster-course-bundle:*`, etc.) are additive and coexist with previous deployments—no schema changes or migrations.

## Follow-Ups / Watch-Outs (tracked separately)
- Migrate profile pages, resource redirect fallback, ingestion, and CLI consumers to bundle loaders (or document their steady-state impact).
- Evaluate whether subject hub pages need intra-request memoisation for bundle fetches once monitoring data is collected.
- Add monitoring for bundle payload size so unusually large courses surface quickly.
- Document rollback playbook entry that includes flushing `oneroster-course-bundle:*` keys after redeploying the previous commit.

## Implementation Details

### Sequence of Work
1. **Scaffold bundle primitives**
   - Implement bundle caching, lookup helpers, and invalidation in `src/lib/data/fetchers/oneroster.ts`.
   - Add request-scoped storage in `src/lib/course-bundle/store.ts`.
   - Document bundle schema/usage in `docs/oneroster-bundle.md`.
2. **Build bundle-backed loaders**
   - Port course/unit/lesson loaders to `src/lib/course-bundle/course-loaders.ts`.
   - Implement lesson content loaders in `src/lib/course-bundle/content-loaders.ts`.
   - Add assessment loaders/redirect helpers under `src/lib/course-bundle/`.
   - Provide shared interactive helpers (`interactive-helpers.ts`).
3. **Swap consumer routes**
   - Update subject hub queries, course/unit/lesson layouts, lesson content routes, and assessment pages to use new imports.
   - Remove legacy helper usage from `src/lib/data/course.ts`, `src/lib/data/content.ts`, `src/lib/data/assessment.ts`, `src/lib/data/lesson.ts`, and `src/lib/data/unit.ts`.
4. **Wire invalidation**
   - Call `invalidateCourseResourceBundle` alongside existing invalidations in course-builder actions and server mutations.
5. **Docs & tests**
   - Write rollout doc (`docs/redis-bundle-rollout.md`) detailing staging validation, monitoring, rollback, and follow-up tickets.
   - Add parity + negative tests in `tests/app/course-bundle.test.ts`.
6. **Cut release**
   - Ship with commit `chore: scope oneroster redis caches to course bundles` after staging validation.

### Code Changes (per file)

#### `src/lib/data/fetchers/oneroster.ts`
- Add `CourseResourceBundle` type and lookup helpers via a `WeakMap`.
- Introduce bundle-focused fetch helpers (`getComponentResourcesByResourceId`, `getCourseResourceBundle`, `invalidateCourseResourceBundle`, `findLessonResources`, `findResourceById`).
- Rename `getAllResources` / `getAllComponentResources` to course-builder-only entry points and expose them from a new wrapper.
- Hook invalidation into existing Redis cache utility (`invalidateCache/createCacheKey`).

#### `src/lib/data/fetchers/oneroster-course-builder.ts` (new)
- Re-export legacy helper names for admin-only consumers to avoid churn.

#### `src/lib/course-bundle/store.ts` (new)
- Implement `stashBundle`/`requireBundle` using a `WeakMap<object, CourseResourceBundle>` for request-scoped storage.

#### `src/lib/course-bundle/course-loaders.ts` (new)
- Bundle-backed `fetchCoursePageData`, `fetchUnitPageData`, and `fetchLessonLayoutData`.
- Helper functions:
  - `loadCourseBySlug` (guards slug/subject alignment).
  - `buildCourseFromBundle`, `populateExerciseQuestionCounts`, `calculateCourseXP`, `calculateUnitXP`.
- Use `stashBundle` to keep bundles accessible to downstream loaders while staying server-only.

#### `src/lib/course-bundle/content-loaders.ts` (new)
- Bundle versions of article/exercise/video loaders using shared interactive helpers.
- Enforce slug/metadata validation, question fetching, and YouTube ID checks.

#### `src/lib/course-bundle/interactive-helpers.ts` (new)
- Bundle-scoped replacements for resource/component lookups with structured error logging.
- Adds `findCourseChallengeBundle` for course challenge resolution.

#### `src/lib/course-bundle/assessment-loaders.ts` (new)
- Implement quiz, unit test, course challenge loaders plus redirect path helpers using bundle data.
- Export `applyQtiSelectionAndOrdering` passthrough.

#### `src/lib/course-bundle/assessment-redirect.ts` (new)
- Resolve assessment routes purely from bundle data, handling multi-course conflicts and missing metadata with structured logs.

#### Consumer updates
- `src/app/(user)/(subject-root)/[subject]/subject.queries.ts`, `src/app/(user)/[subject]/[course]/layout.tsx`, `src/app/(user)/[subject]/[course]/(overview)/layout.tsx`, `src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/layout.tsx` now import bundle loaders.
- `src/lib/data/course.ts`, `src/lib/data/content.ts`, `src/lib/data/assessment.ts`, `src/lib/data/unit.ts`, `src/lib/data/lesson.ts`, `src/lib/utils/assessment-redirect.ts` forward to bundle implementations.

#### Mutation invalidation
- `src/lib/actions/courses.ts` and `src/app/(admin)/course-builder/actions.ts` call `invalidateCourseResourceBundle` whenever course components/resources mutate.

#### Documentation & rollout artifacts
- `docs/oneroster-bundle.md` explains schema, usage, and server-only storage rules.
- `docs/redis-bundle-rollout.md` captures staging checklist, production monitoring, rollback steps, and follow-ups.

#### Tests
- `tests/app/course-bundle.test.ts` adds parity checks, negative validation, and invalidation coverage.

## Logging & Observability
- Emit `logger.info` with context for:
  - Bundle fetch entry points (`fetchCoursePageData`, `fetchQuizPageData`, etc.) including cache usage counts.
  - Subject hub loader summarising number of bundles fetched (`subject course loader used bundle`).
- Emit `logger.warn`/`logger.error` before throwing/notFound in helpers (`bundle lesson lookup failed`, missing metadata, cross-course conflicts).
- Structured fields to standardise on:
  - `courseId`, `unitId`, `resourceSourcedId`, `componentResourceId`, `subjectSlug`, `courseSlug`, `bundleFetchedAt`.
  - Outcome tags: `bundle_hit`, `bundle_miss`, `bundle_missing_data`, `bundle_invalid_metadata`.
- Monitoring dashboards:
  - Redis key hit rate for `oneroster-course-bundle:*`.
  - Number of bundle fetches per route.
  - Distribution of bundle payload sizes (log field `bundleByteSize`, captured when serialising wire format).
  - Error rate for bundle loaders vs legacy baseline.

## Testing & Validation
- **Parity**: `fetchCoursePageData` (legacy vs bundle) equality for representative courses.
- **Negative cases**:
  - Missing lesson/resource, invalid metadata, mismatched slug, missing YouTube ID, component-resource mismatch.
- **Invalidation**:
  - Course-builder mutations call `invalidateCourseResourceBundle` and existing legacy invalidation helpers (verify via unit tests and integration mocks).
- **Edge cases**:
  - Courses with zero assessments (ensure bundle loader gracefully handles).
  - Lessons with only exercises or only videos.
  - Resource tied to multiple courses triggers `null` redirect (assert logs + return path).
- **Regression suites**: Ensure existing Playwright/page integration smoke tests are re-run; update snapshots if necessary.

## Deployment & Rollout
1. **Staging**
   - Deploy branch; run automated test suite, parity tests, and manual sanity (subject hub, course page, lesson content, quiz/test start).
   - Inspect Redis metrics to confirm new keys populate and legacy key usage drops for covered routes.
   - Verify logs for `bundle` events and absence of unexpected errors.
2. **Production**
   - Deploy once staging is signed off (single toggle-less deploy).
   - On-call monitors:
     - Redis egress / ops.
     - Server error rate on bundle routes.
     - Bundle payload size + fetch counts.
3. **Rollback**
   - Redeploy previous commit.
   - Flush `oneroster-course-bundle:*`, `oneroster-getComponentResourcesForCourse:*`.
   - Notify stakeholders in #eng-app and record in post-release doc.
4. **Comms**
   - Announce deployment in engineering channel with link to `docs/redis-bundle-rollout.md`.
   - Create follow-up tickets listed in watch-outs.

## Metrics & Monitoring
- **Primary SLI**: Redis egress (GB/hour) from OneRoster caches.
- **Supporting**:
  - Median/95th percentile response times for subject hub, course page, lesson content, assessment entry routes.
  - Cache hit rate for new bundle keys.
  - Rate of bundle-related warnings/errors (target zero after initial deploy).
  - Count of bundle invalidation calls vs course-builder mutations.

## Risks & Mitigations
- **Risk**: Bundle missing data due to inconsistent OneRoster records.
  - *Mitigation*: Strict logging + fail-fast `notFound` to surface issues; support manual bundle invalidation via existing tooling.
- **Risk**: Increased Redis memory usage from new bundle blobs.
  - *Mitigation*: Monitor payload size; set TTL via `redisCache` and adjust revalidation window if needed.
- **Risk**: Course-builder forgets to invalidate bundles.
  - *Mitigation*: Tests assert invalidation; document in developer onboarding; consider lint rule if regressions appear.
- **Risk**: Bundle fetch duplicates per request increase latency.
  - *Mitigation*: Use existing `redisCache` to prevent cross-request duplication; evaluate request-level memoisation in follow-up if metrics warrant.

## Dependencies
- OneRoster client reliability (no API schema change expected).
- Existing Redis cluster capacity (verified to handle additional keys).
- Structured logging pipeline (Slog) for capturing bundle events.

## Timeline & Owners
- **Implementation**: 1 engineer-week (bundle scaffolding + swaps).
- **Review & QA**: 2–3 days (code review + staging validation).
- **Target release**: Next Tuesday’s deploy window.
- **Primary owner**: @bjorn (implementation + rollout).
- **Reviewer(s)**: @data-infra for cache changes, @frontend-lead for route swaps.
- **QA**: @qa-team to run smoke checks on staging.

## Appendix
- Commit message: `chore: scope oneroster redis caches to course bundles`
- Related docs:
  - `docs/oneroster-bundle.md`
  - `docs/redis-bundle-rollout.md`
- Reference test file: `tests/app/course-bundle.test.ts`
