## Course Cartridge → OneRoster Payload: Master Plan

### Goal
Produce a deterministic converter that reads a validated course cartridge (tar.zst), transforms it into OneRoster-compatible payload files, and writes them to `data/[course-slug]/oneroster/` so our existing upload workflow can ingest them via `oneroster/course.upload.by-slug`.

### Scope and Non-Goals
- In scope: cartridge read, OneRoster object construction, XP calculation, URL building, metrics, file output.
- Out of scope: network upload (handled by Inngest), database reads (none required), QTI uploads (not needed for this flow).

### Inputs
- Cartridge file: tar.zst archive adhering to the updated schema with required fields: `IndexV1.generator`, `IndexV1.course`, `Unit.title`, `Unit.unitNumber`, `Unit.counts`, `Lesson.title`, `Lesson.lessonNumber`.
- CLI arguments (required):
  - `--input`: absolute path to `.tar.zst` cartridge
  - `--slug`: course slug (directory name under `data/`)
  - `--course-id`: stable course id used for OneRoster `sourcedId` (prefix applied)
  - `--grades`: comma-separated grade numbers (e.g., `9,10`)
- Environment: `NEXT_PUBLIC_APP_DOMAIN` (for absolute `launchUrl`/`url`).

### Outputs (filesystem)
The converter writes JSON files to `data/[slug]/oneroster/`, matching what the upload function expects:
- `course.json`
- `class.json`
- `courseComponents.json`
- `resources.json`
- `componentResources.json`
- `assessmentLineItems.json`

These files are read by `orchestrate-course-upload-to-oneroster-by-slug` which invokes entity-specific ingestion functions in dependency order.

### Data Mapping
1) Course and Class
- Course
  - `sourcedId`: `nice_[course-id]`
  - `status`: `active`
  - `title`: `"Nice Academy - " + index.course.title`
  - `subjects`: map `index.course.subject` → OneRoster subjects
    - English → ["Reading", "Vocabulary"]
    - Math → ["Math"]
    - Science → ["Science"]
    - Arts and Humanities → ["Social Studies"]
    - Economics → ["Social Studies"]
    - Computing → ["Science"]
    - Test Prep → ["Reading", "Math"]
    - College, Careers, and More → ["Social Studies"]
    - Any unmapped subject: hard fail (no defaults)
  - `grades`: parsed from `--grades`
  - `courseCode`: `--slug`
  - `org`: constant district sourcedId
  - `academicSession`: constant term sourcedId
  - `metadata`: include generator info, plus `metrics` filled post-build (see below)
- Class
  - `sourcedId`: `nice_[course-id]`
  - `status`: `active`
  - `title`: same as Course.title
  - `classType`: `scheduled`
  - `course`, `school`, `terms`: consistent with Course

2) Course Components
- Unit → top-level `courseComponent`
  - `sourcedId`: `nice_[unit.id]`
  - `parent`: none
  - `sortOrder`: `unit.unitNumber`
  - `metadata`: `{ khanId, khanSlug, khanTitle }` using ID and title; slug derived from `index.units[i].path` or deterministically from title if needed inside the cartridge build (but converter itself does not guess - it uses cartridge-provided `path` fields).
- Lesson → child `courseComponent`
  - `sourcedId`: `nice_[lesson.id]`
  - `parent`: `nice_[unit.id]`
  - `sortOrder`: `lesson.lessonNumber`
  - `metadata`: `{ khanId, khanSlug, khanTitle }` using lesson `id`, path-derived slug, and title

3) Resources and ComponentResources
- Articles
  - `Resource`
    - `sourcedId`: `nice_[resource.id]`
    - `status`: `active`
    - `title`: from the containing Lesson title (resource titles are not given in the cartridge); bracketed display lives on the ComponentResource
    - `metadata`:
      - `type`: `interactive`, `toolProvider`: `Nice Academy`, `khanActivityType`: `Article`
      - `launchUrl`/`url`: `APP_DOMAIN/[subject]/[courseSlug]/[unitSlug]/[lessonSlug]/a/[articleSlug]`
      - `xp`: computed from article word count (see XP below)
      - `khanId`, `khanSlug`, `khanTitle`
  - `ComponentResource`
    - `sourcedId`: `nice_[lesson.id]_[resource.id]`
    - `title`: `formatResourceTitleForDisplay(lesson.title, "Article")`
    - `courseComponent`: `nice_[lesson.id]`
    - `resource`: `nice_[resource.id]`
    - `sortOrder`: array order in lesson.resources
- Quizzes
  - `Resource`
    - `sourcedId`: `nice_[quiz.id]`
    - `title`: from the containing Lesson title
    - `metadata`: `khanActivityType`: `Quiz`, `xp`: 4, `launchUrl`: `.../quiz/[quizSlug]`
  - `CourseComponent` (intermediate) and `ComponentResource`
    - Create an intermediate component for each quiz, then link it with a componentResource (consistent with existing generator)
- Unit Tests (optional per Unit)
  - `Resource`: `khanActivityType`: `UnitTest`, `xp`: 6, `launchUrl`: canonical path using the unit’s last lesson slug
  - Intermediate `CourseComponent` and `ComponentResource` to mirror existing structure

4) Assessment Line Items (ALIs)
- For each Article: `Progress for: [Lesson.title]` → componentResource = `nice_[lesson.id]_[resource.id]`
- For each Quiz: ALI with quiz title (use lesson title), componentResource = `nice_[assessment.id]_[assessment.id]`
- For each Unit Test: ALI with test title, componentResource = `nice_[assessment.id]_[assessment.id]`

5) Metrics
- `totalXp`: sum of XP for all active componentResource placements of relevant activities: Article, Quiz, UnitTest
- `totalLessons`: count of (Articles as 1) + (Quizzes as 1) + (UnitTests as 1)
- Stored in `course.metadata.metrics = { totalXp, totalLessons }`

### XP Calculation
- Articles: strip non-readable HTML (figures, scripts, styles, math) and decode entities; compute words; XP = `max(1, ceil(wordCount / READING_WPM))`. Use `READING_WPM = 200` (deterministic constant) unless overridden in the future. Fail if HTML missing or contains no readable text.
- Quizzes: 4
- Unit Tests: 6

### URL Construction
- Base: `env.NEXT_PUBLIC_APP_DOMAIN` (must be configured; fail if missing).
- Path segments: `[subject]/[courseSlug]/[unitSlug]/[lessonSlug]/(a|quiz|test)/[resourceSlug]`
  - `subject`: from `index.course.subject` mapped to our routing segment (lowercased slug, e.g., `english`, `math`)
  - `courseSlug`: `--slug`
  - `unitSlug`: from `index.units[i].path` (last segment) or deterministic slug embedded by the cartridge
  - `lessonSlug`: from `lessons[j].path` (last segment)
  - `articleSlug`: parent folder name of `stimulus.html`
  - `quizSlug`: last folder in `quizzes/...` path
  - `testSlug`: last folder in `tests/...` path (placed under the unit’s last lesson for URL continuity as in current generator)

### SourcedId Naming
- Course: `nice_[course-id]`
- Class: `nice_[course-id]`
- CourseComponent (Unit): `nice_[unit.id]`
- CourseComponent (Lesson): `nice_[lesson.id]`
- Resource (Article): `nice_[resource.id]`
- Resource (Quiz/UnitTest): `nice_[quiz.id]` / `nice_[test.id]`
- ComponentResource: `nice_[lesson.id]_[resource.id]` or `nice_[assessment.id]_[assessment.id]` for quiz/test intermediates
- ALI: `[resource.sourcedId]_ali`

### Failure Rules (No Fallbacks)
- Missing `NEXT_PUBLIC_APP_DOMAIN` → fail
- Unknown subject mapping → fail
- Missing required unit/lesson fields (`title`, `unitNumber`, `lessonNumber`) → fail
- Missing resource files referenced by the cartridge → fail (open validates integrity; converter will still check reads)
- Missing article HTML or unreadable content → fail

### CLI Design
```
bun run scripts/convert-cartridge-to-oneroster.ts \
  --input /abs/path/to/course-cartridge.tar.zst \
  --slug english-09-part-1 \
  --course-id eng09p1-2025 \
  --grades 9
```

### End-to-End Flow
1. Run converter (above) → writes JSON files to `data/[slug]/oneroster/`.
2. Trigger upload via Inngest:
   - Event: `oneroster/course.upload.by-slug` with `{ slug: "english-09-part-1" }`
   - The orchestrator reads those files and fan-outs ingestion calls (course, resources, courseComponents, componentResources, class, assessmentLineItems).

### Compatibility and Parity
- Matches the file contract used by `orchestrate-course-upload-to-oneroster-by-slug`.
- Mirrors structural patterns from the DB-backed generator: 
  - Intermediate components for quizzes/tests
  - ALIs for articles/quizzes/tests
  - Uniform sourcedId conventions and componentResource linkages

### Edge Cases & Decisions
- Duplicate IDs: if two resources share the same `id`, converter will throw due to sourcedId collisions.
- Subject strings: must be one of the mapped values above; extend mapping if new subjects appear.
- Metrics: only Article/Quiz/UnitTest contribute to totals (consistent with current semantics).
- Last-lesson logic for unit test URLs: use the highest lessonNumber of the unit.

### Logging & Error Handling
- Use structured logging (`@superbuilders/slog`).
- Use `errors.try` for all fallible ops; log then throw (`errors.wrap`) on failures.
- No silent fallbacks; fail fast with clear context.

### Performance
- Cartridge reads stream from tar.zst via the provided reader; minimal memory overhead.
- File writes are atomic per file.
- No DB or network calls.

### Next Steps (Optional Enhancements)
- Extend subject mapping table from a central config.
- Allow `--description` override for course metadata.
- Add an optional `--prefix` for sourcedIds when bulk testing.
- Add a dry-run mode that prints computed counts and target paths without writing files.


