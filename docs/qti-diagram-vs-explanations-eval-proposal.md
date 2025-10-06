### QTI Diagram vs. Explanations Evaluation — End-to-End Proposal

This document proposes a full workflow and implementation plan to:

- Input a OneRoster course identifier (or slug)
- Fetch all relevant QTI assessment tests for that course from Timeback (via OneRoster)
- Parse each test’s XML to collect referenced QTI assessment items
- Fetch those QTI assessment items and build a local map: itemId -> raw QTI XML
- Detect and cache any inline SVGs embedded as data URIs in `<img src|href>` attributes
- Run an evaluation that compares diagram(s) to feedback/explanations for inconsistencies
  - Evaluation output is strictly binary: consistent = true/false
  - Each result includes a comprehensive explanation and an array of affected QTI interaction item ids

Constraints and guardrails:
- No Postgres reads. Only OneRoster and QTI APIs via existing clients/caching.
- No fallbacks or silent error handling; fail fast and log with `@superbuilders/slog`.
- Absolute imports only (`@/`), no relative imports.
 - Report-only workflow: no uploads, no autofixes, no API mutations. This script produces a report filtered to inconsistent items only.


## Objectives

- **Build a reproducible offline artifact set** for a course’s QTI tests and items (XML on disk).
- **Gather inline SVG diagrams** by extracting and decoding base64/URL-encoded data URIs.
- **Evaluate consistency** between diagram(s) and textual explanations/feedback.
- **Output structured reports** (JSON) that can be inspected and aggregated.


## Inputs

- `course`: either a OneRoster course `sourcedId` (e.g., `nice_6_science`) or a course slug.


## High-Level Flow

1. Resolve OneRoster course `sourcedId`.
2. Fetch course-scoped `ComponentResource`s, derive `resource.sourcedId`s.
3. Fetch `Resource`s for those IDs; filter to QTI tests (`metadata.type === "qti" && metadata.subType === "qti-test"`).
4. For each test resource:
   - Fetch the QTI AssessmentTest XML.
   - Parse the test XML to get referenced item identifiers via `<qti-assessment-item-ref identifier="..."/>`.
5. Deduplicate item identifiers across tests; fetch the QTI items.
6. Build a `Map<string, string>` for `itemId -> rawXml` and write each XML to disk.
7. For each item XML, extract inline SVGs from data URIs, decode, hash, and write to a global cache folder.
8. Run an LLM-based evaluation comparing diagram(s) to explanations/feedback; output structured JSON per item:
   - `consistent`: boolean
   - `explanation`: comprehensive free-text rationale
   - `affectedInteractionIds`: string[] of QTI interaction `response-identifier` values implicated
9. Filter the final report to include only items with `consistent === false` (inconsistent) and write per-item JSON results.


## Data Sources and Clients (Existing)

- OneRoster client and fetchers:
  - `@/lib/clients` (singleton `oneroster`)
  - `@/lib/data/fetchers/oneroster`
- QTI client and fetchers:
  - `@/lib/clients` (singleton `qti`)
  - `@/lib/data/fetchers/qti`


## Key Building Blocks (Existing Code To Reuse)

- Parse test XML to item identifiers:
```12:80:src/lib/qti-resolution.ts
export function parseAssessmentTestXml(xml: string): ParsedAssessment {
    // ...
    const itemRefRegex = /<qti-assessment-item-ref[^>]*identifier="([^"]+)"/g
    // ...
}
```

- Fetch many items with deduplication and stable ordering:
```22:43:src/lib/data/fetchers/qti.ts
export async function getAssessmentItems(identifiers: string[]): Promise<AssessmentItem[]> {
    // ... dedupe, parallel fetch, map, order-preserving return ...
}
```

- Course-scoped `ComponentResource`s (to locate QTI tests):
```385:405:src/lib/data/fetchers/oneroster.ts
export async function getComponentResourcesForCourse(courseSourcedId: string) {
    // fetch course components, then AllComponentResources filtered by component IDs
}
```

- Test XML assembly pattern (item refs), for reference while parsing:
```345:356:src/inngest/functions/qti/assemble-differentiated-items-and-create-tests.ts
`<qti-assessment-item-ref identifier="${q.id}" href="/assessment-items/${q.id}" ... />`
```

- Robust inline SVG data URI detection/decoding approach:
```1059:1090:src/lib/qti-validation/rules.ts
export function validateSvgDataUris(xml: string, context: ValidationContext): void {
  const imgSvgRegex = /<img[^>]+src\s*=\s*(?:"(data:image\/svg\+xml(?:;base64|;charset=[\w-]+)?,([^"]+))"|'(data:image\/svg\+xml(?:;base64|;charset=[\w-]+)?,([^']+))')/gi
  // detect base64 vs URL-encoded, decode, parse-check
}
```


## Detailed Steps

### 1) Resolve Course

- If `course` looks like a OneRoster `sourcedId` (e.g., starts with `nice_`), use it directly.
- Otherwise treat `course` as slug:
  - `getAllCoursesBySlug(slug)` → course array
  - Use the first active course’s `sourcedId`

No Postgres access is involved.

### 2) Locate QTI Tests for Course

- `getComponentResourcesForCourse(courseSourcedId)`
- Extract unique `resource.sourcedId`s
- `getResourcesByIds(resourceIds)`
- Filter to QTI tests: `metadata.type === "qti" && metadata.subType === "qti-test"`

### 3) Fetch Tests and Parse Item References

- For each test resource ID:
  - `getAssessmentTest(resourceSourcedId)` to get `rawXml`
  - `parseAssessmentTestXml(rawXml)` to get `sections[]` and item IDs

### 4) Fetch Items and Build Map

- Collect a course-level unique set of item identifiers
- `getAssessmentItems(uniqueIds)`
- Build `Map<string, string>`: `identifier -> rawXml`

### 5) Extract and Cache Inline SVGs

- For each item XML, search for `<img ... src|href="data:image/svg+xml[;base64],...">`
- Decode payload:
  - If contains `;base64`, `Buffer.from(payload, "base64").toString("utf-8")`
  - Else `decodeURIComponent(payload)`
- Hash content (e.g., SHA-256) and write to `data/qti-feedback-inconsistency-analysis/svg-cache/<hash>.svg`
- Keep an index of which items reference which SVG hashes

### 6) Evaluation (Diagram vs. Explanations)

- Extract from each item XML:
  - Stem/body text under `<qti-item-body>` (strip XML to text)
  - Feedback/explanations: e.g., `<qti-modal-feedback>`, `<qti-feedback-inline>`
- Context for LLM:
  - `stemText`, `feedbackText[]`, and decoded `svgContents[]`
- Prompt for structured output:
  - Return `{ itemId, issues: [{ type, description, svgEvidence?, textEvidence?, severity }], overallConsistency }`
- Save results to `data/exports/qti/<courseKey>/evals/<itemId>.json`


## Disk Output Layout

- `data/qti-feedback-inconsistency-analysis/<courseKey>/tests.json`
  - `[{ resourceId, xml, itemIds[] }]`
- `data/qti-feedback-inconsistency-analysis/<courseKey>/items/xml/<itemId>.xml`
- `data/qti-feedback-inconsistency-analysis/<courseKey>/items/index.json`
  - `[{ itemId, sha256, svgHashes[] }]`
- `data/qti-feedback-inconsistency-analysis/svg-cache/<hash>.svg`
- `data/qti-feedback-inconsistency-analysis/<courseKey>/evals/<itemId>.json`
 - `data/qti-feedback-inconsistency-analysis/<courseKey>/evals/<itemId>.json`
  - Contains `{ itemId, consistent, explanation, affectedInteractionIds }`
  - A separate consolidated report file (optional) may include ONLY inconsistent items to simplify triage.


## Script Skeleton (Bun + TypeScript)

This script adheres to the project’s error-handling and logging rules, uses absolute imports, and avoids database access.

```ts
#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createHash } from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { getAllCoursesBySlug, getComponentResourcesForCourse, getResourcesByIds } from "@/lib/data/fetchers/oneroster"
import { getAssessmentTest, getAssessmentItems } from "@/lib/data/fetchers/qti"
import { parseAssessmentTestXml } from "@/lib/qti-resolution"

type Input = { course: string }

function isSourcedId(x: string): boolean {
  return x.startsWith("nice_")
}

async function ensureDir(dir: string) {
  const result = await errors.try(fs.mkdir(dir, { recursive: true }))
  if (result.error) {
    logger.error("failed to create directory", { dir, error: result.error })
    throw errors.wrap(result.error, "directory creation")
  }
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex")
}

function extractInlineSvgStrings(xml: string): string[] {
  const svgs: string[] = []
  const re = /<img[^>]+(?:src|href)\s*=\s*["'](data:image\/svg\+xml(?:;base64|;charset=[\w-]+)?,([^"']+))["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const full = m[1] ?? ""
    const payload = m[2] ?? ""
    if (!payload) continue
    const isBase64 = full.includes(";base64")

    const decoded = (() => {
      const r = errors.trySync(() => (isBase64 ? Buffer.from(payload, "base64").toString("utf-8") : decodeURIComponent(payload)))
      if (r.error) {
        logger.error("failed to decode svg data uri", { error: r.error })
        throw errors.wrap(r.error, "svg data uri decode")
      }
      return r.data
    })()

    svgs.push(decoded)
  }
  return svgs
}

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    logger.error("missing input", { arg })
    throw errors.new("course input required (slug or sourcedId)")
  }

  // Resolve course sourcedId (no Postgres)
  let courseSourcedId = arg
  if (!isSourcedId(arg)) {
    const coursesResult = await errors.try(getAllCoursesBySlug(arg))
    if (coursesResult.error) {
      logger.error("failed to fetch course by slug", { slug: arg, error: coursesResult.error })
      throw errors.wrap(coursesResult.error, "fetch course by slug")
    }
    const course = coursesResult.data[0]
    if (!course) {
      logger.error("course not found by slug", { slug: arg })
      throw errors.new("course not found")
    }
    courseSourcedId = course.sourcedId
  }
  logger.info("resolved course", { courseSourcedId })

  // Discover QTI tests in course
  const compResourcesResult = await errors.try(getComponentResourcesForCourse(courseSourcedId))
  if (compResourcesResult.error) {
    logger.error("failed to fetch component resources for course", { error: compResourcesResult.error, courseSourcedId })
    throw errors.wrap(compResourcesResult.error, "fetch component resources for course")
  }
  const resourceIds = Array.from(new Set(compResourcesResult.data.map(cr => cr.resource.sourcedId)))
  const resourcesResult = await errors.try(getResourcesByIds(resourceIds))
  if (resourcesResult.error) {
    logger.error("failed to fetch resources by ids", { error: resourcesResult.error, count: resourceIds.length })
    throw errors.wrap(resourcesResult.error, "fetch resources by ids")
  }
  const qtiTests = resourcesResult.data.filter(r => r.metadata?.type === "qti" && r.metadata?.subType === "qti-test")

  // Fetch tests and parse item ids
  const tests = [] as Array<{ resourceId: string; xml: string; itemIds: string[] }>
  for (const r of qtiTests) {
    const testResult = await errors.try(getAssessmentTest(r.sourcedId))
    if (testResult.error) {
      logger.error("failed to fetch qti test", { resourceId: r.sourcedId, error: testResult.error })
      throw errors.wrap(testResult.error, "qti test fetch")
    }
    const parsed = parseAssessmentTestXml(testResult.data.rawXml)
    const itemIds = Array.from(new Set(parsed.sections.flatMap(s => s.itemIds)))
    tests.push({ resourceId: r.sourcedId, xml: testResult.data.rawXml, itemIds })
  }

  const allItemIds = Array.from(new Set(tests.flatMap(t => t.itemIds)))
  const itemsResult = await errors.try(getAssessmentItems(allItemIds))
  if (itemsResult.error) {
    logger.error("failed to fetch qti items", { count: allItemIds.length, error: itemsResult.error })
    throw errors.wrap(itemsResult.error, "qti items fetch")
  }
  const items = itemsResult.data

  // Output directories
  const baseDir = path.join(process.cwd(), "data", "qti-feedback-inconsistency-analysis", courseSourcedId)
  const itemsDir = path.join(baseDir, "items", "xml")
  const svgCacheDir = path.join(process.cwd(), "data", "qti-feedback-inconsistency-analysis", "svg-cache")
  await Promise.all([ensureDir(baseDir), ensureDir(itemsDir), ensureDir(svgCacheDir)])

  // Write tests manifest
  {
    const write = await errors.try(fs.writeFile(path.join(baseDir, "tests.json"), JSON.stringify(tests, null, 2)))
    if (write.error) {
      logger.error("failed to write tests manifest", { error: write.error })
      throw errors.wrap(write.error, "file write")
    }
  }

  // Write items and extract SVGs
  const itemIndex: Array<{ itemId: string; sha256: string; svgHashes: string[] }> = []
  for (const it of items) {
    const itemId = String(it.identifier)
    const xml = it.rawXml
    const filePath = path.join(itemsDir, `${itemId}.xml`)
    const w = await errors.try(fs.writeFile(filePath, xml))
    if (w.error) {
      logger.error("failed to write item xml", { itemId, error: w.error })
      throw errors.wrap(w.error, "file write")
    }

    const svgs = extractInlineSvgStrings(xml)
    const svgHashes: string[] = []
    for (const svg of svgs) {
      const hash = sha256(svg)
      svgHashes.push(hash)
      const out = path.join(svgCacheDir, `${hash}.svg`)
      // best-effort idempotent write
      const exists = await errors.try(fs.access(out))
      if (exists.error) {
        const writeSvg = await errors.try(fs.writeFile(out, svg))
        if (writeSvg.error) {
          logger.error("failed to write svg cache file", { hash, error: writeSvg.error })
          throw errors.wrap(writeSvg.error, "svg cache write")
        }
      }
    }
    itemIndex.push({ itemId, sha256: sha256(xml), svgHashes })
  }

  {
    const writeIndex = await errors.try(
      fs.writeFile(path.join(baseDir, "items", "index.json"), JSON.stringify(itemIndex, null, 2))
    )
    if (writeIndex.error) {
      logger.error("failed to write item index", { error: writeIndex.error })
      throw errors.wrap(writeIndex.error, "file write")
    }
  }

  // Evaluation step: produce per-item structured outputs (binary consistency)
  // - For each item XML:
  //   - extract itemBodyText, feedbackTexts, interactionIds, svgContents
  //   - call evaluator (LLM) to produce { consistent, explanation, affectedInteractionIds }
  //   - write per-item eval JSON
  //   - optionally append to a consolidated report if consistent === false
}

const result = await errors.try(main())
if (result.error) {
  logger.error("script failed", { error: result.error })
  process.exit(1)
}
```


## Evaluation Design (Structured)

- Input per item:
  - `itemId`
  - `stemText`: plain text of `<qti-item-body>`
  - `feedbackText[]`: list of extracted feedback/explanations
  - `svgContents[]`: decoded SVG text(s)
  - `interactionIds[]`: QTI interaction identifiers (e.g., values from `response-identifier` attributes on interaction tags)

- Output schema (binary decision):
```json
{
  "itemId": "string",
  "consistent": true,
  "explanation": "string",
  "affectedInteractionIds": ["RESPONSE"]
}
```

- Filtering and reporting policy:
  - The script persists per-item JSON files for all evaluated items under `evals/` but produces a consolidated course report that includes ONLY items where `consistent === false`.
  - No content is uploaded or changed upstream. This is strictly an offline reporting tool.

Implementation details:
- Use `errors.try` around all external calls; log then throw with `errors.wrap`.
- Do not return defaults on failure; stop execution.
- Consider rate limiting or small batch sizes when sending many eval requests.

Extraction helpers (implementation notes):
- `extractInteractionIds(xml: string): string[]` — scan for `<qti-*-interaction ... response-identifier="..." ...>` and collect values (e.g., `RESPONSE`).
- `extractItemBodyText(xml: string): string` — capture inner text of `<qti-item-body>` (strip XML/MathML to normalized text for the prompt).
- `extractFeedbackTexts(xml: string): string[]` — collect content from feedback elements such as `<qti-feedback-block>`, `<qti-feedback-inline>`, `<qti-modal-feedback>`.
- `extractMathText(MathML)` — convert simple MathML to readable inline text to feed the evaluator.


## Edge Cases and Safety

- Mixed item identifier shapes (e.g., `nice_...` prefixes) — always use the literal `identifier` parsed from test XML.
- Tests with multiple sections — handled by `parseAssessmentTestXml`.
- Missing items — fail fast with clear logs (no fallbacks).
- Inline SVG can be base64 or URL-encoded — support both variants.
- Large payloads — all disk writes are streamed via `fs.writeFile`, and client calls are cached in `redisCache` fetchers.


## Performance Considerations

- De-duplicate identifiers prior to fetching items.
- Chunk item fetches if QTI API rate-limits (the fetchers currently fan-out; can add throttle as needed).
- De-duplicate SVG files via content hash.


## Open Questions / Assumptions

- Course input: will we standardize on `sourcedId` (preferred) or continue to support slug resolution?
- Evaluation budget: limit to items that contain at least one decoded SVG?
- Where to persist evaluation results long-term (for now: disk only, no DB)?


## Next Steps

- Implement `scripts/build-qti-item-map.ts` per the skeleton above.
- Add the evaluation step with an LLM client (structured outputs) and SVG/text extractors.
- Add a small CLI wrapper to filter tests/items (e.g., run only N items for smoke tests).


## Concrete Example: Detecting Inconsistency (Volume Prism)

Context: Assessment Test `nice_xa18206885b30807c` ([backend JSON](https://qti.alpha-1edtech.ai/api/assessment-tests/nice_xa18206885b30807c)). The test references items including `nice_x17814ace06d69e26_10462`.

Item XML (abridged):

```xml
<qti-assessment-item identifier="nice_x17814ace06d69e26_10462" title="Volume of a rectangular prism (base area × height)">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="integer">
    <qti-correct-response>
      <qti-value>27</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-item-body>
    <p>What is the volume of the rectangular prism shown?</p>
    <div>
      <img src="data:image/svg+xml;base64,..." />
    </div>
    <p>Enter the volume: <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="2"/> <math>units^3</math></p>
    <qti-feedback-block outcome-identifier="FEEDBACK" identifier="CORRECT" show-hide="show">
      <qti-content-body>
        <p>Correct! The volume is 27 units^3.</p>
        <p>Using a base area of 12 square units and a height of 2 1/4 units: Volume = 12 × (2 + 1/4) = 27 units^3</p>
      </qti-content-body>
    </qti-feedback-block>
  </qti-item-body>
</qti-assessment-item>
```

Decoded SVG (abridged):

```xml
<svg>
  <!-- Height label -->
  <text>h = 8 units</text>
  <!-- Bottom edge labels -->
  <text>2</text>
  <text>6</text>
</svg>
```

Observed inconsistency:
- Diagram labels: height appears to be 8 units; base edge labels show 2 and 6 (suggesting a 2×6 base rectangle if interpreted as side lengths), which would imply a naïve base area of 12.
- Feedback calculation: explicitly uses base area 12 and height 2.25 to justify 27 (12 × 2.25).
- The diagram height label (8) contradicts the feedback’s height (2.25). If the diagram is authoritative, 12 × 8 = 96, not 27. Therefore, the item is inconsistent.

Evaluator output (example):

```json
{
  "itemId": "nice_x17814ace06d69e26_10462",
  "consistent": false,
  "explanation": "Diagram shows height labeled as 8 units, while the feedback computes volume using height 2 1/4 units (2.25). With base labels suggesting a 2×6 base (area 12), diagram-implied volume would be 96 (12×8), not 27. Feedback’s textual explanation contradicts diagram dimensions.",
  "affectedInteractionIds": ["RESPONSE"]
}
```

Reporting behavior:
- The per-item JSON above would be written to `data/qti-feedback-inconsistency-analysis/<courseKey>/evals/nice_x17814ace06d69e26_10462.json`.
- The consolidated course report includes this item under "inconsistent" entries (filtered view), enabling rapid triage.


