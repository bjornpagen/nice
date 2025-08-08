## QTI Upload Failures – Root Cause Analysis

Date: 2025-08-08

### Summary

Recent QTI upload runs began failing with two distinct error signatures:

- Multiple item/test uploads failing with "qti api response validation"
- Top-level upload orchestration failing with "output_too_large"

The failures are not caused by XML validation calls. They result from (1) strict response schema validation mismatches for QTI API create/update calls, and (2) overly large Inngest step outputs due to verbose error data returned by upload steps. Assessment item XML size is not the direct cause of the "output_too_large" failure.

### Symptoms (from logs)

- Per-item errors during upload:
  - `ERROR assessment items ingestion failed failedCount=... failedItems=[..., {"error": qti api response validation}, ...]`
- Orchestrator failures during fan-out:
  - `ERROR one or more qti upload steps failed error=Error: "output_too_large"`

### Technical Findings

1) QTI API response schema mismatches ("qti api response validation")

- The QTI client validates every JSON response with Zod and throws on mismatches:

  ```ts
  // src/lib/qti.ts
  // ... after response.json()
  const validation = schema.safeParse(json)
  if (!validation.success) {
    logger.error("qti api: invalid response schema", { ... })
    throw errors.wrap(validation.error, "qti api response validation")
  }
  ```

- In upload paths (e.g., `ingest-assessment-items`, `ingest-assessment-tests`, `ingest-assessment-stimuli`), when `qti.update…` or `qti.create…` return a response that does not conform to our Zod schemas, the client throws. Those thrown errors are logged as per-item failures with the message "qti api response validation".

- This is the same class of issue previously observed (e.g., undocumented `gap-match` type), i.e., the live API occasionally returns fields or values outside the published/openapi spec. Our schemas are strict and reject such responses.

2) Inngest step output exceeds size limits ("output_too_large")

- The orchestrator fans out batches to ingestion steps and awaits their results. When an ingestion step collects failures, it logs and returns an object that includes an array of failed items/tests/stimuli with `error.message` strings. Example:

  ```ts
  // src/inngest/functions/qti/ingest-assessment-items.ts
  logger.error("assessment items ingestion failed", {
    failedCount,
    failedItems: failedResults.map((r) => ({
      identifier: r.identifier,
      status: r.status,
      error: r.error?.message || "unknown error"
    }))
  })
  throw errors.new(`failed to ingest ${failedCount} assessment items: ${failedIdentifiers.join(", ")}`)
  ```

- The upstream QTI API sometimes includes large bodies in error responses. Those bodies can be embedded (directly or via `.toString()`/message) into `error.message`. Aggregating many such failures into a single step's returned/logged payload makes the step output large.

- The Inngest platform enforces a maximum step output size. When our ingestion step returns/logs a large failure object (many failures, each with large messages), the step exceeds this limit, causing the caller to see "output_too_large".

### Clarifications

- Are assessment items too large? Not for this failure. Large item XML is not the cause of "output_too_large". The size overrun comes from the ingestion step's returned/logged error payload (a large array of failure summaries containing large error messages from the QTI API), not from the items being uploaded.

- Is the Inngest function response too large? Yes. The ingestion steps return/log aggregated failure details that can exceed the platform's output limit, which triggers the "output_too_large" error at the orchestrator level.

### Contributing Factors

- Strict Zod response schemas in `src/lib/qti.ts` (necessary for type safety) surface any API schema drift as errors.
- Ingestion steps process batch items in parallel and aggregate all failure info (including large `error.message` content) into the step result/logs.
- Batch size for uploads is 200 (`QTI_BATCH_SIZE`), increasing the chance that a single step accumulates many failures at once, enlarging the returned payload.

### Impact

- Upload jobs fail even when many items succeed, due to a subset of API response mismatches.
- Orchestrators can fail entirely with "output_too_large" because a single ingestion step returns/logs too much failure data.

### Evidence Pointers

- Per-item ingestion failure logging and error propagation:
  - `src/inngest/functions/qti/ingest-assessment-items.ts`
  - `src/inngest/functions/qti/ingest-assessment-tests.ts`
  - `src/inngest/functions/qti/ingest-assessment-stimuli.ts`
- Orchestrator fan-out catching step failures:
  - `src/inngest/functions/orchestrate-course-upload-to-qti.ts`
  - `src/inngest/functions/orchestrate-hardcoded-qti-upload.ts`
- Client response validation throw path:
  - `src/lib/qti.ts` (response parsing and `schema.safeParse`)

### Recommended Next Steps (for discussion)

1) Address response schema drift
   - Investigate the exact QTI responses that fail schema validation; minimally adjust Zod schemas (where safe and documented) or coordinate with the API provider when responses violate published contracts.

2) Reduce step output size
   - Return compact failure summaries from ingestion steps (e.g., identifiers + short codes) while logging full error context server-side. Avoid embedding large `error.message` payloads in the returned result.
   - Consider smaller upload batch sizes to reduce per-step aggregate failure volume.

3) (Optional) Introduce backoff/throttle on create/update bursts
   - While not the root cause of these specific errors, controlled concurrency may reduce API error rates and downstream failure aggregation.

This document will be updated as specific failing response shapes are cataloged and the client schemas are reconciled with the API.


