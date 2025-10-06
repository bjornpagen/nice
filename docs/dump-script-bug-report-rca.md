## Dump Script 403 Errors – Root Cause Analysis

### Summary
Running the dump script with explicit course paths now intermittently fails with HTTP 403 on Khan Academy internal GraphQL endpoints, specifically on getAssessmentItem requests. Content discovery calls (learnMenuTopicsQuery, ContentForPath, ContentForLearnableContent) generally succeed, while authenticated mutation/query calls tied to practice workflows (getOrCreatePracticeTask, followed by getAssessmentItem) trigger 403s in bursts. Evidence indicates authentication/anti-automation defenses are blocking our POST calls rather than a classic 429 rate-limit. The issue did not previously manifest at this frequency; it likely correlates with upstream changes in anti-abuse enforcement and/or missing dynamic CSRF/fkey handling in our client.

### What changed / When it started
- The behavior “didn’t used to happen” at current frequency. We now see multiple 403s clustered once we begin bulk fetching assessment items in parallel after practice task creation.
- No code change was required on our end to trigger it; upstream defenses or heuristics likely tightened.

### Scope of impact (from bad-log.txt)
- Successful:
  - learnMenuTopicsQuery (GET) – works
  - ContentForPath (GET) – works
  - ContentForLearnableContent (GET) – works
- Problem area:
  - getOrCreatePracticeTask (POST) – largely succeeds (we see valid userTask payloads)
  - getAssessmentItem (POST) – frequently returns 403 Forbidden in repeated retries

Representative log lines:
```16524:16542:/Users/bjorn/Documents/Code/nice/bad-log.txt
ERROR khan-api: request failed status=403 statusText=Forbidden
WARN operation failed, retrying after delay attempt=1 maxRetries=3 delayMs=1000 error=khan-api: request failed with status 403
```

### Observations from code
- Headers used for all requests (src/lib/khan-academy-api.ts):
  - Static `x-ka-fkey: "1"`
  - Browser-like UA and sec-ch-ua headers
  - Cookie string supplied from the script constant
- Workflow in scripts/dump-khan-academy.ts:
  - With path arguments, the script builds one large content map then hydrates aggressively.
  - For each exercise it does: create practice task → fetch all assessment items concurrently with `MAX_CONCURRENCY = 10`, chunking by 10 per exercise and running many exercises in parallel.
- The cookie in the script is hard-coded and may age out or be insufficient for certain internal endpoints. Khan can require a valid session + CSRF token per request. We do not fetch a fresh fkey/CSRF; we send a constant `x-ka-fkey: 1`.

### Exact GraphQL endpoints used by scripts/dump-khan-academy.ts
From `src/lib/khan-academy-api.ts` and `scripts/dump-khan-academy.ts`:

- GET `https://www.khanacademy.org/api/internal/graphql/learnMenuTopicsQuery`
  - Used by: `getLearnMenuTopics(region)`
  - Status: Observed successful in logs.

- GET `https://www.khanacademy.org/api/internal/graphql/ContentForPath`
  - Used by: `getContentForPath(path)`
  - Status: Observed successful in logs.

- GET `https://www.khanacademy.org/api/internal/graphql/ContentForLearnableContent`
  - Used by: `getContentForLearnableContent(id, kind)`
  - Status: Observed successful in logs.

- POST `https://www.khanacademy.org/api/internal/graphql/getOrCreatePracticeTask`
  - Used by: `getOrCreatePracticeTask(exerciseId, ancestorIds)`
  - Status: Generally succeeds (we see valid `userTask` payloads). No persistent 403 patterns in logs for this endpoint.

- POST `https://www.khanacademy.org/api/internal/graphql/getAssessmentItem`
  - Used by: `getAssessmentItem({ exerciseId, itemId })` (also supports problemNumber flow)
  - Status: Primary failure point; repeated 403 Forbidden during concurrent hydration.

Bottom line: 403s are concentrated on POST `getAssessmentItem`. The three GET endpoints continue to work; POST `getOrCreatePracticeTask` appears mostly OK.

### 403 vs 429
- We do not observe 429 or explicit “rate limit” messages.
- The failures are 403 Forbidden on POST to internal GraphQL endpoints used for assessment items.
- This points more to auth/CSRF/bot detection/Geo heuristics than classical rate limiting.

### Likely Root Causes
1) Missing/invalid CSRF (fkey) handling
   - Khan’s internal endpoints typically require a valid per-session CSRF token (often surfaced as fkey) that changes. We send a static `x-ka-fkey: 1` for all requests.
   - Content discovery (GET) may not require CSRF; assessment and practice item POSTs do.
   - Result: POSTs intermittently blocked with 403.

2) Session cookie not sufficient or expired for sensitive endpoints
   - The script embeds a long, static cookie string. Even if it works for some endpoints, getAssessmentItem may enforce stricter checks or shorter TTL.
   - If the session is stale or missing required cookies set during interactive flows, 403 can occur.

3) Anti-automation/abuse heuristics triggered by concurrency pattern
   - Hydration launches many parallel POSTs across multiple exercises (10-per-chunk × many chunks × multiple exercises concurrently). Even if CSRF is valid, bursty patterns can trip WAF/anti-bot and yield 403 (blocked), not 429.
   - We see 403s cluster around the getAssessmentItem phase after userTask creation.

### Why this started now
- Khan likely tightened protections on internal GraphQL, especially for endpoints tied to practice items.
- Our client never implemented dynamic fkey/CSRF negotiation; as enforcement increased, our static header became insufficient.
- Increased parallelization when running with explicit paths may amplify detection signals now being enforced.

Additionally, you noted the same script and frequency ran fine ~2 months ago. That points strongly to an upstream change (stricter CSRF/session validation and/or WAF heuristics) rather than a regression in our code.

### Intermittency and failure pattern (from logs)
- Not immediate at startup: the script performs a large amount of successful discovery and content hydration before 403s appear. This indicates the failures are not guaranteed at the beginning of a run.
- Bursty/intermittent: 403s show up in clusters when fetching assessment items, with repeated lines like:
  - `ERROR khan-api: request failed status=403 statusText=Forbidden`
  - `WARN operation failed, retrying after delay ... error=khan-api: request failed with status 403`
  These clusters suggest anti-abuse/WAF triggers or CSRF/session checks tripping under load rather than a permanent block.
- Not all POSTs fail: `getOrCreatePracticeTask` POST typically succeeds (we see valid `userTask` payloads before and after 403 clusters). The failures are concentrated on POST `getAssessmentItem`.
- No evidence of 429: there are no “429 Too Many Requests” signatures or "rate limit" strings. The failure mode is 403 Forbidden on specific POST calls.

### Evidence tying to each cause
- Static `x-ka-fkey` and static cookie in client code.
- GET endpoints succeed consistently; POST to sensitive endpoints fail.
- No 429; repeated 403 Forbidden suggests policy block/auth failure rather than simple throttling.

### Non-causes considered
- Network failures: logs show clean connectivity and JSON parsing for many calls.
- Schema drift: responses validate for many queries; failures are HTTP-level 403 before parsing.

### Immediate Mitigations (analysis only; no code changes made)
- Reduce concurrency during getAssessmentItem requests to lower burstiness (likely to reduce 403 frequency if WAF heuristics are involved).
- Refresh session cookies from a fresh, logged-in browser session.
- Acquire and pass a valid, current `x-ka-fkey`/CSRF token for each POST (typically scraped from DOM or a bootstrap endpoint) instead of the static "1".

### Long-term Remediation Directions (analysis only)
- Implement a proper auth bootstrap step:
  - Perform an initial GET to Khan web app pages as an authenticated user, extract dynamic CSRF/fkey and required cookies.
  - Maintain and rotate tokens per request as required.
- Introduce request pacing:
  - Global limiter (e.g., max N POSTs per second), jittered backoff on 403/blocked responses.
  - Prefer per-exercise serialization for assessment item fetches when necessary.
- Observability:
  - Log response bodies for 403 (if any) to capture upstream block reasons.
  - Tag requests with correlation IDs and record per-endpoint success/failure rates.

### Conclusion
The 403s are best explained by strengthened upstream protections and our client’s lack of dynamic CSRF/session handling, compounded by high concurrency on POST assessment-item calls. It does not appear to be classic rate-limiting (429). The failures concentrate on sensitive endpoints and present as Forbidden. Addressing CSRF/fkey acquisition and moderating concurrency should resolve or substantially reduce the 403s.


