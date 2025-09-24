## Canvas LMS Ingestion Notes

### Module Item Sequence (REST)

- Purpose: Given a module item, return navigation context (prev/current/next) and module metadata for the course.
- Endpoint: `GET /api/v1/courses/{courseId}/module_item_sequence?asset_type=ModuleItem&asset_id={moduleItemId}&frame_external_urls=true`
- Auth: Same-origin cookie session + `x-csrf-token` header (when needed).

Example (sanitized) request:

```bash
curl "https://<base>.instructure.com/api/v1/courses/8834/module_item_sequence?asset_type=ModuleItem&asset_id=798140&frame_external_urls=true" \
  -H 'accept: application/json, text/javascript, application/json+canvas-string-ids, */*; q=0.01' \
  -H 'x-csrf-token: <CSRF_TOKEN>' \
  -H 'x-requested-with: XMLHttpRequest' \
  -b 'canvas_session=<SESSION>; _csrf_token=<TOKEN>'
```

Observed response shape (abbreviated):

```json
{
  "items": [
    {
      "current": {
        "id": "798140",
        "title": "Welcome to World History A!",
        "position": 2,
        "indent": 0,
        "quiz_lti": false,
        "type": "Page",
        "module_id": "62111",
        "html_url": "https://.../modules/items/798140",
        "page_url": "welcome-to-world-history-a-2",
        "publish_at": null,
        "url": "https://.../api/v1/courses/8834/pages/welcome-to-world-history-a-2",
        "completion_requirement": { "type": "must_view" }
      },
      "prev": {
        "id": "801758",
        "title": "Enter/Verify Student Profile",
        "type": "Assignment",
        "content_id": "107826",
        "url": "https://.../api/v1/courses/8834/assignments/107826",
        "completion_requirement": { "type": "min_score", "min_score": 0 }
      },
      "next": {
        "id": "798469",
        "title": "What is Online Learning",
        "type": "Page",
        "page_url": "what-is-online-learning",
        "url": "https://.../api/v1/courses/8834/pages/what-is-online-learning",
        "completion_requirement": { "type": "must_view" }
      }
    }
  ],
  "modules": [
    {
      "id": "62111",
      "name": "Welcome",
      "position": 2,
      "require_sequential_progress": true,
      "requirement_type": "all",
      "prerequisite_module_ids": ["62356"],
      "items_count": 11,
      "items_url": "https://.../api/v1/courses/8834/modules/62111/items"
    }
  ]
}
```

Zod schema sketch we will implement:

```ts
const CompletionRequirementSchema = z.object({
  type: z.string(),
  min_score: z.number().optional()
})

const SequenceItemRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  position: z.number().optional(),
  indent: z.number().optional(),
  quiz_lti: z.boolean().optional(),
  type: z.string(), // "Page" | "Assignment" | "Quiz" | ...
  module_id: z.string().optional(),
  html_url: z.string().url().optional(),
  url: z.string().url().optional(),
  page_url: z.string().optional(),
  content_id: z.string().optional(),
  publish_at: z.string().nullable().optional(),
  completion_requirement: CompletionRequirementSchema.optional()
})

const ModuleItemSequenceResponseSchema = z.object({
  items: z.array(
    z.object({
      current: SequenceItemRefSchema,
      prev: SequenceItemRefSchema.optional(),
      next: SequenceItemRefSchema.optional()
    })
  ),
  modules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      position: z.number(),
      unlock_at: z.string().nullable().optional(),
      require_sequential_progress: z.boolean(),
      requirement_type: z.string(),
      publish_final_grade: z.boolean().optional(),
      prerequisite_module_ids: z.array(z.string()),
      items_count: z.number(),
      items_url: z.string().url()
    })
  )
})
```

Intended use in our ingestion:
- Navigation context to walk a module linearly or to attach prev/next relationships per item.
- Derive canonical REST detail URLs per item (`url`/`html_url`) for follow-up hydration (e.g., pages, assignments, quizzes).

Planned client additions:
- `CanvasClient.getModuleItemSequence(courseId, moduleItemId)` → returns typed sequence response above.
- Extend our GraphQL modules query for coarse listing; use REST per-type detail to hydrate fields not exposed via GraphQL.

### What we still need (minimal samples)

Please share short JSON samples (one or two each is enough) of detail responses we’ll hydrate, so we can lock schemas:
- Page detail: `GET /api/v1/courses/:course_id/pages/:page_url` (include `title`, `body`/`html_url`).
- Assignment detail: `GET /api/v1/courses/:course_id/assignments/:id` (include `name`, `points_possible`, `due_at`, `submission_types`, `html_url`).
- Quiz detail: Classic Quizzes API response (or indicate if New Quizzes/LTI 1.3 → different endpoint) with `title`, `points_possible`, `quiz_type`, `html_url`.
- ExternalUrl / ExternalTool: the module item or detail response that includes `url`/tool config and `title`.
- DiscussionTopic (if used): `GET /api/v1/courses/:course_id/discussion_topics/:id` (`title`, `message`, `html_url`).
- File (if used): `GET /api/v1/courses/:course_id/files/:id` (`display_name`, `url`/`download_url`, `html_url`).

If your GraphQL schema can return union-specific fields for module item `content` in a single call, a sample of that response would let us reduce REST calls. Otherwise we’ll proceed with REST hydration per type as above.



### Assignment Info (REST)

- Purpose: Bulk enrichment for module items across a course (points and dates) without fetching each item individually.
- Endpoint: `GET /courses/{courseId}/modules/items/assignment_info`
- Auth: Same-origin cookie session + `x-csrf-token` header (when needed).

Example (sanitized) request:

```bash
curl "https://<base>.instructure.com/courses/8834/modules/items/assignment_info" \
  -H 'accept: application/json, text/javascript, application/json+canvas-string-ids, */*; q=0.01' \
  -H 'x-csrf-token: <CSRF_TOKEN>' \
  -H 'x-requested-with: XMLHttpRequest' \
  -b 'canvas_session=<SESSION>; _csrf_token=<TOKEN>'
```

Observed response shape (abbreviated): a map keyed by module item ID → info object

```json
{
  "798417": { "points_possible": 5.0, "todo_date": null },
  "798140": { "points_possible": null, "due_date": null, "todo_date": null },
  "801758": { "points_possible": 0.0, "todo_date": null }
}
```

Zod schema sketch:

```ts
const ModuleItemAssignmentInfoSchema = z.object({
  points_possible: z.number().nullable().optional(),
  due_date: z.string().nullable().optional(),
  todo_date: z.string().nullable().optional()
})

const AssignmentInfoResponseSchema = z.record(z.string(), ModuleItemAssignmentInfoSchema)
```

Intended use in our ingestion:
- Join on module item IDs after listing items to enrich with `points_possible` and `due_date`/`todo_date` in a single call.
- Pages and non-graded items often appear with `points_possible: null`; graded items (assignments/quizzes) typically have numeric values.
- Still fetch per-type detail when we need rich fields (e.g., Page body HTML, Assignment submission types).

Open questions / samples helpful:
- Confirm whether quiz module items use the same keys and if `due_date` is populated here or only on the quiz/assignment detail endpoints.
- If New Quizzes (LTI) are present, share a corresponding module item + detail sample to see how points/dates are surfaced.

### Classic Quizzes (REST)

- Purpose: Retrieve quiz metadata and the question set for a specific submission (student-visible).
- Endpoints:
  - Quiz metadata: `GET /api/v1/courses/{courseId}/quizzes/{quizId}`
  - Submission questions: `GET /api/v1/quiz_submissions/{submissionId}/questions`

Example usage (in browser console):

```js
// From window.ENV
const submissionId = (ENV.QUIZ_SUBMISSION_EVENTS_URL || "").match(/submissions\/(\d+)/)?.[1]
fetch(`/api/v1/quiz_submissions/${submissionId}/questions`, { credentials: 'include' })
  .then(r => r.json()).then(console.log)
```

Schema sketch:

```ts
// Quiz metadata (abbreviated)
id: number
title: string
quiz_type: string
points_possible: number
question_count: number
question_types?: string[]
html_url: string

// Submission questions union
multiple_choice_question: {
  id: number
  question_name: string
  question_text: string
  answers: { id: number; text?: string | null; html?: string | null }[]
  answer: string | null // selected answer id as string
}

matching_question: {
  id: number
  question_name: string
  question_text: string
  answers: MatchingPair[] // prompts
  matches: MatchingPair[] // choices
  answer?: Array<Record<string, unknown>> | null
}

type MatchingPair = { id: number; left?: string | null; right?: string | null; text?: string | null; html?: string | null }
```

Notes:
- `managed_quiz_data` often returns 403 for students (instructor-only); rely on the submission questions endpoint.
- For modules hydration, capture the `quizId` (from module item) and, when an attempt exists, use the submission questions endpoint to fetch the question set. Otherwise, fall back to metadata only.

