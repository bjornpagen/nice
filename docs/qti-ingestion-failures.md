### QTI Ingestion Failures: Root Cause Analysis and Remediation Plan

This document explains why some QTI assessment item ingestion batches intermittently fail and repeatedly retry, pinpoints the exact root cause, and proposes concrete, safe remediations.

### Executive summary

- **What fails**: Some batches in the `qti/course.upload` workflow fail during the "ingest assessment items" step with a response validation error.
- **Why**: The QTI API returns `type = "unknown"` for certain items. Our client schema rejects `unknown`, causing the step to fail. The affected items' XML lacks any recognized `<qti-*-interaction>` elements even though they include response declarations and processing.
- **Where these items come from**: The “hardcoded undifferentiated” generator uploads existing item XML without enforcing interaction presence. These items can be XSD-valid yet have no interactions, leading the QTI API to classify them as `unknown`.
- **Effect**: The orchestrator retries the failing step indefinitely since the response remains invalid for those items, causing those batches to “struggle forever.”

### Impact

- **Intermittent batch failures**: Most batches succeed; a small subset with malformed content keeps failing.
- **Operational churn**: Inngest retries repeat deterministically and will not self-heal until inputs or schema are corrected.

### Evidence from logs

The logs show the QTI client receiving `type = "unknown"` in the JSON response and failing Zod validation:

```startLine:endLine:pony.log
61683:61709:pony.log
ERROR failed to update assessment item identifier=nice_xe84a1fe027767b90 error=qti api response validation: [
  {
    "received": "unknown",
    "code": "invalid_enum_value",
    "options": [
      "choice",
      "text-entry",
      "extended-text",
      "inline-choice",
      "match",
      "order",
      "associate",
      "select-point",
      "graphic-order",
      "graphic-associate",
      "graphic-gap-match",
      "hotspot",
      "hottext",
      "slider",
      "drawing",
      "media",
      "upload",
      "gap-match"
    ],
    "path": [
      "type"
    ]
  }
]
```

Immediately above that, the same server response shows an item body with no interaction elements (only an embedded image), yet it declares and processes responses:

```startLine:endLine:pony.log
61670:61683:pony.log
                <qti-set-outcome-value identifier="SCORE"><qti-base-value base-type="float">1</qti-base-value></qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">CORRECT</qti-base-value></qti-set-outcome-value>
            </qti-response-if>
            <qti-response-else>
                <qti-set-outcome-value identifier="SCORE"><qti-base-value base-type="float">0</qti-base-value></qti-set-outcome-value>
                <qti-set-outcome-value identifier="FEEDBACK"><qti-base-value base-type="identifier">INCORRECT</qti-base-value></qti-set-outcome-value>
            </qti-response-else>
        </qti-response-condition>
    </qti-response-processing>
 </qti-assessment-item>,"content":{ ... }
```

### How the ingestion pipeline works

- **Orchestrator fan-out**: Reads JSON payloads from disk and invokes batched ingestion steps (items → stimuli → tests). Any error in a batch causes the orchestrator to throw.

```startLine:endLine:src/inngest/functions/orchestrate-course-upload-to-qti.ts
61:90:src/inngest/functions/orchestrate-course-upload-to-qti.ts
```

- **Item ingest step**: For each item, attempts an update; on 404, it tries to create; any non-404 error becomes a recorded failure. If any item fails, the step throws with identifiers for diagnostics.

```startLine:endLine:src/inngest/functions/qti/ingest-assessment-items.ts
45:71:src/inngest/functions/qti/ingest-assessment-items.ts
```

- **QTI client parsing**: On 2xx, the client parses JSON and validates it against `AssessmentItemSchema`. If validation fails (e.g., enum mismatch), it throws a response validation error.

```startLine:endLine:src/lib/qti.ts
560:608:src/lib/qti.ts
```

### Root cause

- The API returns `type = "unknown"` for items that lack recognized interaction elements. Our client-side enum for `AssessmentItem.type` does not include `unknown`, so schema validation fails.

```startLine:endLine:src/lib/qti.ts
185:223:src/lib/qti.ts
```

- Affected items are sourced by the “hardcoded undifferentiated” generator, which pushes existing XML to upload without enforcing the presence of interactions (it validates against XSD but not content semantics like interaction existence).

```startLine:endLine:src/inngest/functions/orchestrate-hardcoded-undifferentiated-qti-generation.ts
137:151:src/inngest/functions/orchestrate-hardcoded-undifferentiated-qti-generation.ts
```

- Our structured compiler path would have blocked such items by requiring each response declaration to be matched by an interaction or an embedded input and by actually rendering the interaction markup.

```startLine:endLine:src/lib/qti-generation/pre-validator.ts
275:335:src/lib/qti-generation/pre-validator.ts
```

```startLine:endLine:src/lib/qti-generation/interaction-compiler.ts
9:29:src/lib/qti-generation/interaction-compiler.ts
```

```startLine:endLine:src/lib/widgets/generators/data-table.ts
104:118:src/lib/widgets/generators/data-table.ts
```

### Why it retries forever

- The orchestrator treats any batch failure as an error and retries the step. Since the API continues to return `type = "unknown"` for the same items and our schema rejects it every time, these steps keep failing deterministically until inputs or schemas are fixed.

### Concrete remediation plan (no workarounds/mocks)

- **Align the client schema with observed API behavior**
  - Add `"unknown"` to the `AssessmentItemSchema` type enum in `src/lib/qti.ts`. This does not mask errors; it prevents a false-negative validation failure against a response shape the API actually returns. It also lets us surface item-level issues (e.g., missing interactions) at the content layer rather than by rejecting the response.

- **Block invalid items before upload in the undifferentiated generator**
  - In `orchestrate-hardcoded-undifferentiated-qti-generation.ts`, add a pre-ingest XML check: if an item declares responses (`<qti-response-declaration>`) but has no `<qti-*-interaction>` elements in `<qti-item-body>`, reject the item for upload and log a precise error with the identifier and exercise context. This mirrors the structured compiler’s safety and ensures uploaded items can be categorized by the API.

- **Keep strict failure semantics**
  - Do not swallow errors. Once the two changes above are in place, bad items will be filtered out up-front and schema alignment will avoid spurious client-side rejections, eliminating the infinite retry loop.

### Action checklist

- [ ] Update `AssessmentItemSchema.type` enum to include `"unknown"` in `src/lib/qti.ts`.
- [ ] Add pre-ingest XML validation in `orchestrate-hardcoded-undifferentiated-qti-generation.ts` to require at least one of: `qti-choice-interaction`, `qti-order-interaction`, `qti-inline-choice-interaction`, `qti-text-entry-interaction`, or other recognized interactions when responses exist.
- [ ] Re-run the upload for the affected course(s); verify that the specific identifiers listed below either succeed or are cleanly skipped with explicit logs.

### Known affected identifiers

- `nice_xe84a1fe027767b90`, `nice_x3d6adf99c5439223`, `nice_xf13d43b41d6a3e35`, `nice_x6d67c1c244395383`, `nice_x22e93a12ac3e2872`, `nice_x59752094d780c40c`, `nice_x3c94643c20b9353f`

### How to locally verify the issue in payloads

- Inspect `data/<courseSlug>/qti/assessmentItems.json` for items where:
  - The XML contains `<qti-response-declaration` but the body lacks any of the recognized `<qti-*-interaction>` tags.
  - These correlate with the identifiers in the failing logs.

### Appendix: Key code paths

- Orchestration and batch fan-out
```startLine:endLine:src/inngest/functions/orchestrate-course-upload-to-qti.ts
61:90:src/inngest/functions/orchestrate-course-upload-to-qti.ts
```

- Item ingest behavior
```startLine:endLine:src/inngest/functions/qti/ingest-assessment-items.ts
45:71:src/inngest/functions/qti/ingest-assessment-items.ts
```

- QTI client response parsing and validation
```startLine:endLine:src/lib/qti.ts
560:608:src/lib/qti.ts
```

- Enum currently missing `unknown`
```startLine:endLine:src/lib/qti.ts
185:223:src/lib/qti.ts
```

- Undifferentiated generator (source of problematic XML)
```startLine:endLine:src/inngest/functions/orchestrate-hardcoded-undifferentiated-qti-generation.ts
137:151:src/inngest/functions/orchestrate-hardcoded-undifferentiated-qti-generation.ts
```

- Structured compiler guarantees
```startLine:endLine:src/lib/qti-generation/pre-validator.ts
275:335:src/lib/qti-generation/pre-validator.ts
```

```startLine:endLine:src/lib/qti-generation/interaction-compiler.ts
9:29:src/lib/qti-generation/interaction-compiler.ts
```

```startLine:endLine:src/lib/widgets/generators/data-table.ts
104:118:src/lib/widgets/generators/data-table.ts
```


