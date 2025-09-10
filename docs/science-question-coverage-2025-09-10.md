### Science Question Coverage Report (XML and Structured JSON)

Generated: 2025-09-10

This report summarizes the coverage status of XML and structured JSON for questions in the hardcoded science courses defined in `src/lib/constants/course-mapping.ts` (`HARDCODED_SCIENCE_COURSE_IDS`). Data was produced by running `scripts/analyze-science-questions-missing.ts` against the current database (`src/db/schemas/nice.ts`).

### Executive Summary

- **Overall questions analyzed**: 4,396
- **Missing XML**: 28 (0.64%)
- **Missing structured JSON**: 28 (0.64%)
- **Exercises with questions**: 100% across all courses

### Course Breakdown

| Course | ID | Total Questions | Missing XML | Missing % |
|---|---|---:|---:|---:|
| AP/College Physics 2 | `x0e2f5a2c` | 738 | 2 | 0.27% |
| High school chemistry | `x2613d8165d88df5e` | 969 | 13 | 1.34% |
| AP/College Physics 1 | `xf557a762645cccc5` | 681 | 0 | 0.00% |
| AP/College Biology | `x16acb03e699817e9` | 621 | 11 | 1.77% |
| AP/College Chemistry | `x2eef969c74e0d802` | 785 | 1 | 0.13% |
| High school physics | `x6679aa2c65c01e53` | 602 | 1 | 0.17% |

Notes:
- Missing structured JSON equals missing XML in all observed cases for this run.
- Every course reported full exercise coverage (no exercises without questions).

### Hotspots (Highest Impact Exercises)

These exercises currently have missing XML/structured JSON and should be prioritized for backfill.

- **AP/College Physics 2 (`x0e2f5a2c`)**
  - `x754dbb7656485ca2` — Sign convention — 2/9 missing

- **High school chemistry (`x2613d8165d88df5e`)**
  - `x66b7269fab18f2d0` — Apply: naming main group ionic compounds — 3/12 missing
  - `x59b17e83c527f102` — Apply: naming acids and bases — 3/12 missing
  - `x114c66180c1b302d` — Apply: the pH scale — 2/12 missing
  - `x2c526c108852cd18` — Understand: atomic structure — 1/12 missing
  - `xb96fc32ebdf9d3d8` — Apply: atomic structure — 1/12 missing
  - `x858c5175efe48704` — Understand: energy of chemical reactions — 1/12 missing
  - `xe1d5e8f4bf28bbf3` — Apply: mole calculations with compounds — 1/12 missing
  - `xdc9f271d5079e52a` — Apply: properties of liquids — 1/12 missing

- **AP/College Biology (`x16acb03e699817e9`)** — PhET simulations cluster
  - `x7e93c6817d63eb7a` — Exploring diffusion — 3/7 missing
  - `xa5aab16888e5dcdf` — Exploring action potentials — 3/9 missing
  - `xa7a9adf6926925da` — Exploring gene expression — 3/7 missing
  - `xcd18173df3524a34` — Exploring Hardy–Weinberg equilibrium — 2/7 missing

- **AP/College Chemistry (`x2eef969c74e0d802`)**
  - 1 question missing (see script output for specific exercise)

- **High school physics (`x6679aa2c65c01e53`)**
  - 1 question missing (see script output for specific exercise)

### Prioritized Backfill Plan

- **Priority A (maximum impact/visibility):**
  - HS Chemistry: `x66b7269fab18f2d0` (3/12), `x59b17e83c527f102` (3/12), `x114c66180c1b302d` (2/12)
  - AP Bio PhET simulations listed above

- **Priority B:**
  - AP Phys 2: `x754dbb7656485ca2` (2/9)
  - AP Chem and HS Physics: resolve the single remaining missing item in each

Re-run the analysis after each batch to validate reductions and catch regressions.

### Methodology

- Source courses: `HARDCODED_SCIENCE_COURSE_IDS` in `src/lib/constants/course-mapping.ts` (only non-commented IDs).
- Schema: `src/db/schemas/nice.ts` tables `niceCourses`, `niceUnits`, `niceLessons`, `niceLessonContents`, `niceExercises`, `niceQuestions`.
- A question is considered missing XML if `niceQuestions.xml IS NULL` and missing structured JSON if `niceQuestions.structured_json IS NULL`.
- Exercise coverage is computed by joining exercises included in lesson contents for each course and aggregating question presence per exercise.
- All queries use explicit column selection and structured joins via Drizzle.

### Re-run Instructions

Run the analysis script:

```bash
bun run scripts/analyze-science-questions-missing.ts
```

The script logs:
- Overall totals for science questions and missing counts
- Per-course totals and percentages
- Per-exercise breakdowns indicating total questions and missing counts

If course mappings change, update `HARDCODED_SCIENCE_COURSE_IDS` accordingly and re-run.


