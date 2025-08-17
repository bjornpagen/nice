## qti hints/skip behavior investigation – exhaustive log

### context and objective

- objective: when a student SKIPS a question, mark it as wrong but still show the same explanations a student would see after a wrong attempt, ideally inline under every answer choice (not just a bottom paragraph), without requiring a selection.
- environment: timeback qti api (qti 3.0 style), embedded renderer at `NEXT_PUBLIC_QTI_ASSESSMENT_ITEM_PLAYER_URL` inside an iframe via `src/components/qti-renderer.tsx`.

---

### existing host-side behavior (before changes)

1) skip flow in `src/components/practice/assessment-stepper.tsx`:
   - `handleSkip()` pushes `{ qtiItemId, isCorrect: false }` to `sessionResults` and sets:
     - `isAnswerChecked = true`, `isAnswerCorrect = false`, `showFeedback = true`.
   - no `process-response` call is made for the skip.

2) iframe control in `src/components/qti-renderer.tsx`:
   - on prop `displayFeedback=true`, the host posts:
     ```ts
     postMessage({ type: "QTI_DISPLAY_FEEDBACK", displayResponseFeedback: true }, "*")
     ```
   - we also emit outbound responses from the player: the docs mention only `QTI_RESPONSE_CHANGE` (player → host).
   - we later added a host message prototype `QTI_SHOW_ALL_FEEDBACK` (host → player) but the renderer does not document/handle it.

3) observed renderer behavior before changes:
   - when feedback visibility is toggled (no selection, no outcomes): the renderer shows the bottom `qti-feedback-block` only (the generic incorrect paragraph).
   - no inline (`qti-feedback-inline`) appears without a selected response/outcomes.

---

### debug tooling added

1) manual qti item with hint experiments:
   - file: `examples/qti-generation/assessment-item/positive/limited-resource-population-growth.hints.qti.xml`
   - baseline content: 3 `qti-simple-choice` (A/B/C) each with its own `qti-feedback-inline`.

2) upload/update script:
   - file: `scripts/upload-qti-item.ts`
   - fixes:
     - use `await errors.try(fs.readFile(...))` (async) instead of `errors.trySync` to avoid passing a Promise to zod.
     - replaced IIFE lints with a named `runCli()` invoker.
   - usage:
     - create: `bun run scripts/upload-qti-item.ts <path-to-xml>`
     - update: `bun run scripts/upload-qti-item.ts <path-to-xml> <identifier>`

3) debug viewer page (host):
   - files: `src/app/debug/qti-viewer/page.tsx`, `src/app/debug/qti-viewer/content.tsx`.
   - features:
     - input item identifier + Load (reloads iframe)
     - Skip (show all): posts to a tiny proxy `POST /api/debug/qti/process` which calls timeback `process-response` with `{ identifier: "HINTREQUEST", value: "true" }`, then toggles `displayFeedback=true` and sets `showAllFeedback=true` on the iframe.
     - manual submit of arbitrary `{responseIdentifier, value}` pair.
   - server proxy route: `src/app/api/debug/qti/process/route.ts` (uses `@/lib/qti.Client.processResponse`).

4) validation gotcha that bit us (and is critical):
   - the timeback `process-response` endpoint schema requires `value` to be string | number | string[] | record<string,string>.
   - sending a raw boolean (`true`) returns zod `invalid_union` with details: "Expected string, received boolean".
   - required fix: always send STRING "true" for `HINTREQUEST`.

---

### xml variants tested and outcomes

identifier used for all uploads unless otherwise noted: `limited-resource-population-growth`.

1) baseline (original)
   - responseProcessing:
     - correct branch → `SCORE=1`, `FEEDBACK=CORRECT`
     - else → `SCORE=0`, `FEEDBACK=INCORRECT`
   - result on skip: bottom incorrect paragraph only.

2) add hint flag + multi-inline (first attempt at ideal)
   - add `<qti-response-declaration identifier="HINTREQUEST" base-type="boolean"/>`.
   - add top hint branch in `<responseProcessing>`:
     - when `HINTREQUEST=true` → `FEEDBACK=INCORRECT` (later switched to `HINT_ALL`), `FEEDBACK‑INLINE=[A,B,C]` (multi identifiers).
   - attempt to trigger via debug UI skip with `HINTREQUEST`:
     - initial bug: host sent boolean `true` → zod error (rejected). fixed to string "true".
   - observations:
     - bottom feedback updated as expected when the request was accepted.
     - inline feedback still only appeared for a single choice (always the same one on screen); multi-inline not respected by renderer.

3) add native endAttemptInteraction (spec-compliant hint control)
   - `<qti-end-attempt-interaction response-identifier="HINTREQUEST" title="Show hint" count-attempt="false"/>` placed after the `choiceInteraction`.
   - server accepted; bottom feedback appeared; inline still only showed for one choice.
   - sometimes the hint button didn’t render in the debug embed (likely renderer template/theme issue); we continued testing via the debug proxy.

4) consolidated bottom hint (`HINT_ALL`) fallback
   - added `<qti-feedback-block outcome-identifier="FEEDBACK" identifier="HINT_ALL">` that concatenates all three A/B/C explanations.
   - hint branch set `FEEDBACK=HINT_ALL` in addition to `FEEDBACK‑INLINE=[A,B,C]`.
   - result: bottom shows all text (good); inline still single-choice only.

5) single-inline tests to isolate renderer behavior
   - change `FEEDBACK‑INLINE` to single value:
     - (a) single A using `<qti-base-value ...>A</qti-base-value>`;
     - (b) remove `qti-multiple` wrapper (to avoid any parser ambiguity).
   - result: inline still appeared under the same choice regardless of which id we set.

6) flip correct choice to test "correct-only" renderer logic
   - changed correct from A → B in `<qti-correct-response>`; kept `FEEDBACK‑INLINE=B`.
   - result: inline continued to appear under the same (original) choice; this suggests the renderer is not following `FEEDBACK‑INLINE` nor the correct branch; it seems to be rendering inline for a fixed choice (likely the first).

7) bogus id (planned, not run after 6 due to consistent behavior)
   - would set `FEEDBACK‑INLINE=Z` (nonexistent id). expectation: if inline still shows for one fixed choice, the renderer is not consulting `FEEDBACK‑INLINE` at all.

conclusion from xml tests:
- the api accepts `HINTREQUEST` (as string) and applies outcomes (bottom feedback proves it).
- the embedded renderer does not honor multi-value `FEEDBACK‑INLINE`, and evidence suggests it may ignore `FEEDBACK‑INLINE` entirely during hint/skip (displaying a fixed choice’s inline or the correct-only path in other themes). renderer code needs to iterate the identifiers and render each inline block even when no selection exists.

> additional renderer observations (critical)
>
> - the native `<qti-end-attempt-interaction>` button did not render in the embedded player theme we’re using (no visible control). we therefore exercised the hint branch via the debug page’s host-side call to `process-response`.
> - attempts to surface hints using `infoControl` did not render in the embedded player either (the theme appears not to support an info-control affordance). this further supports the need for a renderer PR for any in-item hint affordances.

---

### host → player custom messages (what exists vs needed)

- documented in our repo:
  - outgoing only: `QTI_RESPONSE_CHANGE` (player → host) in `docs/1EdTech Timeback Platform Integration Guides - Rendering QTI.md`.
  - inbound used by host (custom, not documented by player):
    - `QTI_DISPLAY_FEEDBACK` { displayResponseFeedback: boolean } → already observed working as a visibility toggle.
    - `QTI_SHOW_ALL_FEEDBACK` → proposed; player does not listen.

- what the renderer must implement to support ideal hint inline:
  - add a window message listener for inbound host messages (origin-checked, instance-scoped):
    - `QTI_PROCESS_RESPONSE` { responseIdentifier, value } → call backend `process-response` for current item, store outcomes, set feedback visible, re-render.
    - or support `QTI_SHOW_ALL_FEEDBACK` as shorthand to process `{ identifier: "HINTREQUEST", response: "true" }`.
  - on render, if feedback is visible and outcomes include `FEEDBACK‑INLINE` as a list or scalar, render each referenced choice’s `qti-feedback-inline` even with no selection.

---

### api behaviors confirmed

- endpoint: `POST /assessment-items/{identifier}/process-response`.
- constraints:
  - `response.response` must be string | string[] | number | record<string,string>.
  - boolean is invalid; must send STRING "true" for hint flags.
- successful responses returned `score` and an optional `feedback` object; bottom FEEDBACK is driven by outcomes in the item.

---

### options we enumerated (host/content/renderer)

1) host overlay (works today):
   - status: explored and validated feasibility; we used `scripts/print-qti-item.ts` to confirm the api returns both `content` and `rawXml` and that `rawXml` contains the `<qti-feedback-inline>` blocks we need. we have not yet wired the extractor into `assessment-stepper.tsx` ui, but this is the most reliable path requiring no renderer or xml changes.
   - plan: add server action `getQuestionHints(qtiItemId)` (fetch `rawXml`, parse choice feedback) and render a host panel beneath the iframe on skip showing all explanations.

2) spec-compliant in-item (ideal ux, requires renderer):
   - use `endAttemptInteraction` + hint branch in responseProcessing to set `FEEDBACK‑INLINE=[A,B,C]` and optionally `FEEDBACK=SKIPPED` / `HINT_ALL` with `count-attempt=false`.
   - renderer must re-render on hint and honor multi-inline.

3) infoControl (spec-compliant alternative):
   - surface hint content via `infoControl` (no response processing, no scoring impact). different ux (not inline choices).
   - status: attempted; the embedded renderer did not render an infoControl affordance in our theme, so this path is blocked without renderer work.

4) renderer PR (inbound protocol):
   - implement and document: `QTI_DISPLAY_FEEDBACK`, `QTI_PROCESS_RESPONSE`, optional `QTI_SHOW_ALL_FEEDBACK`.
   - update render pipeline to render multi `FEEDBACK‑INLINE` without selection.

5) dummy hidden choice (hacky; not recommended):
   - add a fake choice and auto-submit it on skip; still requires renderer to honor `FEEDBACK‑INLINE` → doesn’t solve the underlying issue.

---

### final assessment + next steps

- what works now:
  - bottom feedback shows correctly on skip/hint via `HINTREQUEST="true"` (string).
  - host visibility toggle works (`QTI_DISPLAY_FEEDBACK`).
  - we validated that the api returns `rawXml` for a reliable host overlay extraction path.

- what does not work in the renderer:
  - showing ALL per-choice inline explanations based on `FEEDBACK‑INLINE` (multi or single) when no selection exists.
  - recognizing inbound host messages beyond visibility toggling.
  - rendering of in-item hint affordances: `endAttemptInteraction` and `infoControl` were not displayed by the current embed theme.

- recommended path to ship immediately:
  - implement host overlay panel on skip with explanations extracted from `rawXml` (no renderer or xml changes required).

- recommended renderer improvements (PR scope):
  1) implement inbound messages (`QTI_PROCESS_RESPONSE`, `QTI_SHOW_ALL_FEEDBACK`).
  2) process `{ identifier: "HINTREQUEST", response: "true" }` and store outcomes.
  3) render loop over `FEEDBACK‑INLINE` identifiers; render inline blocks per choice without selection.
  4) document the inbound protocol alongside the existing `QTI_RESPONSE_CHANGE` docs.

---

### appendix – concrete artifacts & references

- host code:
  - `src/components/practice/assessment-stepper.tsx` (skip, feedback flags)
  - `src/components/qti-renderer.tsx` (iframe + `QTI_DISPLAY_FEEDBACK`, `QTI_SHOW_ALL_FEEDBACK`)
  - `src/app/debug/qti-viewer/*` (debug ui)
  - `src/app/api/debug/qti/process/route.ts` (proxy to process-response)
  - `scripts/upload-qti-item.ts` (create/update qti item)

- sample item (multiple revisions):
  - `examples/qti-generation/assessment-item/positive/limited-resource-population-growth.hints.qti.xml`
  - variants tried:
    - add `HINTREQUEST` boolean
    - `endAttemptInteraction` with `count-attempt=false`
    - hint branch: `FEEDBACK=INCORRECT` → later `HINT_ALL`, `FEEDBACK‑INLINE=[A,B,C]`
    - single inline id; removed `qti-multiple`
    - flipped correct from A → B

- docs:
  - `docs/1EdTech Timeback Platform Integration Guides - Rendering QTI.md` (only documents outgoing `QTI_RESPONSE_CHANGE`)

---

### tl;dr

bottom feedback on skip is working; inline explanations are blocked by the renderer not honoring `FEEDBACK‑INLINE` (list or single) without a selection. two paths: ship host overlay now; open a renderer PR to process hint requests and render multi-inline. the api requires `HINTREQUEST` value as a STRING, not boolean.


