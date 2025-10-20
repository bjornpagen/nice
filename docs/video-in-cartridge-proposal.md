# Video Support in Course Cartridges

## Summary
- Hardcoded OneRoster generation already treats videos as interactive resources with youtube metadata and computed XP (`src/lib/payloads/oneroster/course.ts:662`, `src/lib/payloads/oneroster/course.ts:699`, `src/lib/payloads/oneroster/course.ts:711`).
- Cartridge-derived payloads only understand articles and quizzes, so videos remain embedded inside article HTML and never surface as standalone resources (`scripts/convert-cartridge-to-oneroster.ts:501`, `scripts/convert-cartridge-to-oneroster.ts:525`, `scripts/convert-cartridge-to-oneroster.ts:559`).
- English cartridge stimuli still contain raw `<iframe>` embeds pointing to YouTube, blocking video progress tracking and XP parity (`data/english-2025-10-16/qti/assessmentStimuli.json:13`).
- We should extend the cartridge schema and ingestion pipeline so videos arrive as first-class resources with stable metadata and OneRoster payloads match the hardcoded math/science structure.

## Goals
- Represent every instructional video as its own `video` resource in `lesson.json`, preserving its order relative to surrounding articles, quizzes, and exercises.
- Capture enough metadata (slug, `youtubeId`, `durationSeconds`, optional transcripts) inside the cartridge so downstream tooling can compute XP, build launch URLs, and create AssessmentLineItems without external lookups.
- Remove embedded YouTube iframes from article stimuli and have `scripts/convert-cartridge-to-oneroster.ts` emit the same OneRoster shape that hardcoded courses already produce.
- Deliver changes via cartridge updates so the upload script and ingestion jobs only need minimal, well-scoped modifications.

## Non-Goals
- Packaging or serving the actual video assets.
- Reworking the front-end lesson rendering beyond consuming the new metadata.
- Changing how CASE alignments or passive resource chaining works for exercises.

## Current State & Gaps
- Hardcoded generator constructs metadata per content type, including explicit `Video` branches with XP calculation and youtube IDs (`src/lib/payloads/oneroster/course.ts:662`, `src/lib/payloads/oneroster/course.ts:699`, `src/lib/payloads/oneroster/course.ts:711`).
- Cartridge converter only iterates `article` and `quiz` resources, attaches full article HTML as QTI stimuli, and never sees discrete videos (`scripts/convert-cartridge-to-oneroster.ts:501`, `scripts/convert-cartridge-to-oneroster.ts:525`, `scripts/convert-cartridge-to-oneroster.ts:559`).
- Current English cartridge stimuli still include inline `<iframe>` tags for YouTube videos (`data/english-2025-10-16/qti/assessmentStimuli.json:13`), so the UI can show the embed but OneRoster lacks video metadata or XP.
- The cartridge schemas/types only allow `"article"` and `"quiz"` discriminants, making it impossible to ship structured video metadata inside the archive.

## Proposal
### Data Model
- Add `ResourceVideoSchema` and `ResourceVideo` to `@superbuilders/qti-assessment-item-generator` with fields:
  - `id`, `title`, `type: "video"`, `slug`.
  - `path`: JSON metadata file under `videos/{unit}/{lesson}/{video-id}.json`.
  - `youtubeId`: required string for launch and embedding.
  - `durationSeconds`: required number for XP derivation.
  - Optional `captions`: array of `{ locale: string; path: string }` pointing to VTT files.
  - Optional `thumbnailPath` and `attribution`.
- Extend `Lesson.resources` arrays to accept the new discriminant while keeping deterministic ordering rules.
- Update integrity manifest generation so video metadata JSON (and optional caption files) are checksumed like other assets.

### Cartridge Layout
- Introduce a `videos/` directory mirroring the `content/` hierarchy: `videos/{unit-slug}/{lesson-slug}/{video-id}.json`.
- Store each video metadata JSON with the structure above; include optional transcripts `videos/.../*.vtt` when available.
- Update builder validation so every `video` resource path resolves to a file in the `files` map and its contents are schema-validated.

### Content Extraction
- During cartridge construction, detect embedded YouTube iframes in article HTML:
  - Extract the `youtubeId` and any nearby descriptive text.
  - Emit one `video` resource per iframe with the corresponding ordering index.
  - Remove the iframe from the article HTML and optionally insert a placeholder such as `<p data-nice-video="video-id"></p>` to preserve context for editors.
- If source curriculum already lists videos separately, map them straight into `video` resources and reserve iframe parsing as a legacy fallback.

### OneRoster Conversion
- Teach `scripts/convert-cartridge-to-oneroster.ts` to handle `res.type === "video"`:
  - Read the referenced metadata JSON and parse `youtubeId` plus `durationSeconds`.
  - Compute XP as `ceil(durationSeconds / 60)` to mirror hardcoded logic (`src/lib/payloads/oneroster/course.ts:711`).
  - Generate launch URLs under the `/v/` route and include `khanYoutubeId` inside resource metadata.
  - Add new helpers `orResourceIdForVideo` and `orComponentResourceIdForVideo`, and reuse `formatResourceTitleForDisplay(..., "Video")`.
  - Emit `AssessmentLineItems` with `lessonType: "video"` so reporting matches hardcoded courses.
- Keep article handling intact but ensure exported article HTML is iframe-free before generating QTI stimuli.

### QTI Output
- Do not emit QTI stimuli for videos; they are not assessment content.
- Ensure article stimuli written to `assessmentStimuli.json` are sanitized versions without `<iframe>` tags to keep the QTI validator happy.

### Downstream Consumption
- Update front-end resource loaders only if necessary; the app already understands `khanActivityType: "Video"` via OneRoster metadata.
- Ensure XP ledger logic treats videos as passive XP grants by mapping `khanActivityType === "Video"` in cartridge-backed courses.

## Implementation Plan
1. **Schema & Package Updates**
   - Modify `@superbuilders/qti-assessment-item-generator` types and Zod schemas to include the `video` discriminant.
   - Extend builder validation, add unit tests for video resources, and bump the package version.
2. **Cartridge Authoring**
   - Update the cartridge generator repo to create `video` resources from source content (iframe extraction or native declarations).
   - Add fixtures covering multiple videos per lesson and caption assets.
3. **Nice Repo Changes**
   - Update `scripts/convert-cartridge-to-oneroster.ts` with the new video branch, helper IDs, and metadata handling.
   - Add parsing helpers for video metadata JSON and XP computation.
   - Write assertions ensuring generated OneRoster payloads include video resources and line items.
4. **Repackage & Validate**
   - Rebuild the English cartridge, rerun the converter, and diff outputs against hardcoded math/science payload shapes.
   - Dry-run ingest in staging to confirm launch URLs resolve and XP awards match expectations.
5. **Deploy & Backfill**
   - Release the updated cartridge package, update dependencies, and trigger re-ingestion for all cartridge-backed courses.

## Validation
- Unit tests enforcing that missing `youtubeId` or `durationSeconds` fail cartridge validation.
- Snapshot or schema-based tests for `scripts/convert-cartridge-to-oneroster.ts` verifying that video resources produce the expected metadata and AssessmentLineItems.
- Regression test confirming article stimuli exported to QTI no longer include `<iframe>` tags.
- Manual QA checklist covering lesson sequencing, XP awards, and OneRoster ingestion for at least one cartridge-backed course.

## Risks & Mitigations
- **Missing metadata**: Source HTML might lack duration; plan to fetch durations during cartridge build or treat absence as a blocking validation error.
- **Ordering regressions**: Extracted videos must stay in place relative to surrounding content; derive sort order from DOM position and cover with automated tests.
- **Legacy courses**: Older cartridges without videos should continue to convert; converter must skip the video branch gracefully when metadata is absent.

## Open Questions
- Do we need to support non-YouTube video providers immediately (e.g., Vimeo or self-hosted files)? If so, extend metadata with a `source` union.
- Should article HTML include an explicit textual reference to the subsequent video for accessibility, or should the front-end inject that context?
- How are transcripts sourced and localized, and do we need to require them before marking a cartridge as publishable?
