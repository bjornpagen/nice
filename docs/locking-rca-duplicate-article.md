### Root Cause Analysis: Duplicate Article Appearing in Unit 2 and Unit 5 Breaks Locking/Progression

#### Summary

When the same Article appears in multiple units (Unit 2 and Unit 5), our lock/unlock logic treats that Article as a single global resource keyed by its OneRoster resource `sourcedId` (which is derived from the canonical content id). Completion for the Article is also recorded globally against that same `sourcedId`. The course-wide sequential locking then linearizes the entire course into a single ordered list. These two facts interact such that the Article’s completion state is shared across its appearances and the “previous resource completed” flag propagates along the global ordering, not per unit. This can leave the unit-level “next” item (e.g., the Unit 2 Unit Test) locked when the prior global item in the flattened sequence is considered incomplete, even though the local Unit 2 items appear complete.

The result: attempting to progress past the end of Unit 2 is blocked because the lock state is computed with a course-global ordering and a course-global resource id space. When a duplicated Article is placed later (or earlier) in that global order, its completion and the previous-complete flag do not align with the user’s local path within Unit 2.

#### Evidence and Code Paths

- Course locks are computed once per course using a fully linearized resource list:
```94:117:src/lib/utils.ts
export function getOrderedCourseResources(course: Course): CourseResource[] {
	// ... existing code ...
	const sortedUnits = [...course.units].sort((a, b) => a.ordering - b.ordering)
	for (const unit of sortedUnits) {
		const sortedUnitChildren: UnitChild[] = [...unit.children].sort((a, b) => a.ordering - b.ordering)
		for (const unitChild of sortedUnitChildren) {
			if (unitChild.type === "Lesson") {
				const sortedLessonChildren = [...unitChild.children].sort((a, b) => a.ordering - b.ordering)
				resources.push(...sortedLessonChildren)
			} else {
				resources.push(unitChild)
			}
		}
	}
	resources.push(...course.challenges)
	return resources
}
```

- Lock status uses that global ordering and a global “previous complete” accumulator; it keys completion by resource id:
```147:176:src/lib/utils.ts
export function buildResourceLockStatus(
	course: Course,
	progressMap: Map<string, AssessmentProgress>,
	lockingEnabled: boolean
): Record<string, boolean> {
	const ordered = getOrderedCourseResources(course)
	const lock: Record<string, boolean> = {}
	if (!lockingEnabled) {
		for (const r of ordered) {
			lock[r.id] = false
		}
		return lock
	}
	let previousComplete = true
	for (const r of ordered) {
		let currentComplete: boolean
		const progress = progressMap.get(r.id)
		if (r.type === "Exercise" || r.type === "Quiz" || r.type === "UnitTest" || r.type === "CourseChallenge") {
			currentComplete = typeof progress?.score === "number" && progress.score >= XP_PROFICIENCY_THRESHOLD
		} else {
			currentComplete = progress?.completed === true
		}
		lock[r.id] = !previousComplete && !currentComplete
		previousComplete = currentComplete
	}
	return lock
}
```

- Article ids are OneRoster resource ids that are canonicalized per content item (not per placement). The same article appearing in different lessons/units shares the same `id`:
```421:516:src/lib/data/course.ts
// Article resource construction
} else if (resourceMetadata.khanActivityType === "Article") {
	articles.push({
		type: "Article",
		id: resource.sourcedId, // <-- OneRoster resource id (e.g., "nice_<contentId>")
		title: resource.title,
		path: `/${params.subject}/${params.course}/${unit.slug}/${lessonComponentMeta.data.khanSlug}/a/${resourceMetadata.khanSlug}`,
		slug: resourceMetadata.khanSlug,
		description: resourceMetadata.khanDescription,
		sortOrder: componentResource.sortOrder,
		ordering: componentResource.sortOrder,
		xp: resourceMetadata.xp || 0
	})
}
```

- OneRoster payload generation also treats a content item as a single Resource keyed by `nice_<content.id>` and creates a single ALI (`_ali`) per resource. This means results are recorded against the same id regardless of where the content appears:
```577:604:src/lib/payloads/oneroster/course.ts
const contentSourcedId = `nice_${content.id}`
// ...
if (lc.contentType === "Article") {
	metadata = {
		...metadata,
		type: "interactive",
		toolProvider: "Nice Academy",
		khanActivityType: "Article",
		launchUrl: `${appDomain}${metadata.path}/a/${content.slug}`,
		url: `${appDomain}${metadata.path}/a/${content.slug}`,
		xp: 2
	}
}
// Assessment line item is per resource id
657:672
assessmentLineItems.push({
	 sourcedId: `${contentSourcedId}_ali`,
	 // ...
})
```

- Progress is keyed by `resourceId` (the OneRoster resource id), and only the most recent result for that resource is kept:
```41:121:src/lib/data/progress.ts
for (const result of resultsResponse.data) {
	// ... identify ALIs ...
	const resourceId = getResourceIdFromLineItem(lineItemId)
	const prev = latestByResource.get(resourceId)
	// keep most recent by scoreDate
	// ...
}
// Map<string, AssessmentProgress> keyed by resourceId
```

- The “Next” button on lesson pages uses the global `resourceLockStatus` (same map) to determine whether the next item is locked:
```120:174:src/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/components/lesson-footer.tsx
const nextLockedByServer = resourceLockStatus ? resourceLockStatus[nextItem.id] === true : false
// Disabled reason ties to server lock if true
```

#### Observable Behavior in the Edge Case

Inputs that trigger the issue:
- The same Article (same Khan/OneRoster content id) appears in two different units (Unit 2 and Unit 5). Both placements produce the same `resource.id` (e.g., `nice_<articleId>`), but distinct `path`s.
- The course-wide ordering flattens Unit 2 and Unit 5 into a single list. Depending on the `ordering` of units/lessons/resources, the duplicated Article appears twice in that list, but both entries share the same `id`.
- Progress for Articles is recorded as OneRoster results against that shared `resource.id` and merged into a single latest entry in `progressMap`.

What happens:
- While working through Unit 2, the user completes the Article at its Unit 2 placement. The system records completion against the shared `resource.id` and marks it complete in `progressMap`.
- The lock computation then walks the entire linearized list, maintaining a single `previousComplete` flag. Because the list includes all units, “previous” may refer to an item outside Unit 2.
- If any item earlier in the global sequence is incomplete, the next item (including the Unit 2 Unit Test) can be marked locked, even if all local Unit 2 items are done. Conversely, if the duplicated Article’s “latest” result flips due to later activity (e.g., doing the Unit 5 occurrence more recently), the completion state used during the course-wide pass can reflect the later context, not the earlier Unit 2 context.
- The “Next” button reads the same `resourceLockStatus` map and will disable navigation to the Unit 2 Unit Test if that entry is locked in the course-global pass.

Why it’s specifically caused by duplication:
- The same `id` for both placements collapses their progress into one entry and causes both placements to be treated as one logical resource in lock computation.
- The single, course-global ordering means the lock state for the Unit 2 boundary is impacted by unrelated earlier/later resources, including the other occurrence of the same Article and any assessments that precede it globally.

#### Exact Fault Lines

1) Identity collapse across placements
- The Article’s `id` equals the OneRoster resource id for the canonical content, so multiple placements share the same identifier.
- Progress aggregation (`getUserUnitProgress`) and lock computation (`buildResourceLockStatus`) operate solely on that identifier.

2) Global, not per-unit, sequential pass
- `getOrderedCourseResources` flattens the entire course; `previousComplete` is carried across unit boundaries.
- Locks for items at the end of Unit 2 depend on completion of whatever globally precedes them, not strictly on the items within Unit 2.

3) Latest-result wins for progress map
- When multiple results exist for the same resource id (e.g., user engaged with the same Article later in Unit 5), only the most recent is kept. This can change perceived completion at the time the lock map is computed and does not differentiate per placement.

Together, these produce the observed symptom: attempting to progress from Unit 2 into its Unit Test is blocked, because the lock state is influenced by the global sequence and the shared identity of the duplicated Article.

#### Potential Inputs that Reproduce
- An Article A with Khan id KA123 appears in both Unit 2 / Lesson X and Unit 5 / Lesson Y.
- The OneRoster resource id for A is `nice_KA123` in both places; both placements generate ALI `nice_KA123_ali`.
- The global ordering places some incomplete resource(s) before the Unit 2 Unit Test (possibly the other A placement or another assessment), so `previousComplete` becomes false right before evaluating the Unit 2 Unit Test.
- Lock map sets `lock[unit2UnitTestId] = true`, and the lesson footer’s navigation disables the Next button with “Complete the previous activity to unlock next”.

#### Where the Logic Goes Wrong
- Conceptual mismatch: resource identity is global per content, but UI progression and user expectations are per placement within a unit.
- The global sequential pass uses a single `previousComplete` across course boundaries; duplicated resources with a shared id entangle per-unit progression with out-of-unit state.

No prescriptive fixes are included per request. This document is limited to root cause analysis.


