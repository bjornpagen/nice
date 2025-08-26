import { describe, expect, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { Course, Lesson, Quiz, Unit, UnitTest } from "@/lib/types/domain"
import { buildResourceLockStatus, getFirstResourceIdForUnit } from "@/lib/utils"

type AssessmentProgress = { completed: boolean; score?: number }

// This test verifies that the componentResourceSourcedId migration fixes the duplicate article bug.
// Previously, when the same article (with id `nice_x218d1e03bb2ccb6a`) appeared in both lesson 2
// and lesson 6, completing it in lesson 2 would incorrectly affect the lock status in lesson 6.
// Now, with unique componentResourceSourcedId for each placement, each article instance has
// independent lock status based on its own prerequisites.

function makeCourseWithDuplicateArticleSameUnit(): Course {
	const sharedArticleId = "nice_x218d1e03bb2ccb6a" // Real sourcedId

	// Build 6 lessons in a single unit; lesson 2 and lesson 6 both include the same article id
	const lessons: Lesson[] = []
	for (let i = 1; i <= 6; i++) {
		const lesson: Lesson = {
			id: `lesson-u2-${i}`,
			componentResourceSourcedId: `lesson-u2-${i}`, // Use lesson id for tests
			type: "Lesson",
			ordering: i,
			slug: `l-u2-${i}`,
			title: `U2 L${i}`,
			description: "",
			path: `/s/c/u2/l${i}`,
			xp: 0,
			children: []
		}
		// Place the shared article in lesson 2 and lesson 6
		if (i === 2 || i === 6) {
			lesson.children.push({
				id: sharedArticleId,
				componentResourceSourcedId: `cr-lesson-u2-${i}-${sharedArticleId}`, // Unique per placement
				type: "Article",
				ordering: 1,
				slug: "activity-what-happens-during-a-solar-or-lunar-eclipse",
				title: "Activity: What happens during a solar or lunar eclipse?",
				description: "",
				path: `/s/c/u2/l${i}/a/activity-what-happens-during-a-solar-or-lunar-eclipse`,
				xp: 2
			})
		}
		lessons.push(lesson)
	}

	const u2GateQuiz: Quiz = {
		id: "u2-quiz-gate",
		componentResourceSourcedId: "u2-quiz-gate", // Use quiz id for tests
		type: "Quiz",
		ordering: 90,
		slug: "u2-quiz-gate",
		title: "Unit 2 Gate Quiz",
		description: "",
		path: "/s/c/u2/quiz/gate",
		xp: 50,
		questions: [{ id: "q-gate-1" }]
	}

	const u2UnitTest: UnitTest = {
		id: "u2-test",
		componentResourceSourcedId: "u2-test", // Use test id for tests
		type: "UnitTest",
		ordering: 100,
		slug: "u2-test",
		title: "Unit 2 Test",
		description: "",
		path: "/s/c/u2/test",
		xp: 200,
		questions: [{ id: "q-ut2-1" }]
	}

	const unit2: Unit = {
		id: "unit-2",
		slug: "u2",
		title: "Unit 2",
		description: "",
		path: "/s/c/u2",
		ordering: 2,
		// Global order within the unit: lessons (1..6), then an incomplete gate quiz, then the unit test
		children: [...lessons, u2GateQuiz, u2UnitTest]
	}

	const course: Course = {
		id: "course-dup-article",
		slug: "c-dup",
		title: "Course Duplicate Article",
		description: "",
		path: "/s/c",
		units: [unit2],
		challenges: []
	}
	return course
}

function makeCourseWhereLesson2ArticleAppearsLocked(): Course {
	const sharedArticleId = "nice_x218d1e03bb2ccb6a"

	const lessons: Lesson[] = []
	for (let i = 1; i <= 6; i++) {
		const lesson: Lesson = {
			id: `lesson-u2-${i}`,
			componentResourceSourcedId: `lesson-u2-${i}`, // Use lesson id for tests
			type: "Lesson",
			ordering: i,
			slug: `l-u2-${i}`,
			title: `U2 L${i}`,
			description: "",
			path: `/s/c/u2/l${i}`,
			xp: 0,
			children: []
		}
		if (i === 2) {
			// Previous item complete (video), then the shared article in lesson 2
			lesson.children.push({
				id: "vid-u2-l2-1",
				componentResourceSourcedId: "cr-lesson-u2-2-vid-u2-l2-1", // Unique per placement
				type: "Video",
				ordering: 1,
				slug: "v-u2-l2-1",
				title: "Video before article (completed)",
				description: "",
				path: "/s/c/u2/l2/v/1",
				xp: 0,
				youtubeId: "y1"
			})
			lesson.children.push({
				id: sharedArticleId,
				componentResourceSourcedId: `cr-lesson-u2-2-${sharedArticleId}`, // Unique per placement
				type: "Article",
				ordering: 2,
				slug: "activity-what-happens-during-a-solar-or-lunar-eclipse",
				title: "Activity: What happens during a solar or lunar eclipse?",
				description: "",
				path: "/s/c/u2/l2/a/activity-what-happens-during-a-solar-or-lunar-eclipse",
				xp: 2
			})
		} else if (i === 6) {
			// Later duplicate occurrence: put an incomplete item before it to flip previousComplete to false
			lesson.children.push({
				id: "vid-u2-l6-1",
				componentResourceSourcedId: "cr-lesson-u2-6-vid-u2-l6-1", // Unique per placement
				type: "Video",
				ordering: 1,
				slug: "v-u2-l6-1",
				title: "Video before later duplicate (incomplete)",
				description: "",
				path: "/s/c/u2/l6/v/1",
				xp: 0,
				youtubeId: "y2"
			})
			lesson.children.push({
				id: sharedArticleId,
				componentResourceSourcedId: `cr-lesson-u2-6-${sharedArticleId}`, // Unique per placement
				type: "Article",
				ordering: 2,
				slug: "activity-what-happens-during-a-solar-or-lunar-eclipse",
				title: "Activity: What happens during a solar or lunar eclipse?",
				description: "",
				path: "/s/c/u2/l6/a/activity-what-happens-during-a-solar-or-lunar-eclipse",
				xp: 2
			})
		}
		lessons.push(lesson)
	}

	const unit2: Unit = {
		id: "unit-2",
		slug: "u2",
		title: "Unit 2",
		description: "",
		path: "/s/c/u2",
		ordering: 2,
		children: [...lessons]
	}

	const course: Course = {
		id: "course-dup-article-appears-locked",
		slug: "c-dup-locked",
		title: "Course Duplicate Article Appears Locked",
		description: "",
		path: "/s/c",
		units: [unit2],
		challenges: []
	}
	return course
}

describe("Duplicate article within the same unit - now fixed with componentResourceSourcedId", () => {
	test("Each article placement has independent lock status based on its own prerequisites", () => {
		const course = makeCourseWhereLesson2ArticleAppearsLocked()
		const sharedArticleId = "nice_x218d1e03bb2ccb6a"

		// Only mark the lesson 2 video as completed
		const progress = new Map<string, AssessmentProgress>([["vid-u2-l2-1", { completed: true }]])

		const lock = buildResourceLockStatus(course, progress, true)

		// Now with componentResourceSourcedId, each placement has a unique lock key
		// The lesson 2 article should be unlocked since its previous video is complete
		expect(lock[`cr-lesson-u2-2-${sharedArticleId}`]).toBe(false)
		// And the lesson 6 article should be locked since its previous video is incomplete
		expect(lock[`cr-lesson-u2-6-${sharedArticleId}`]).toBe(true)
	})

	test("Unit test lock status correctly depends on all previous resources being complete", () => {
		const course = makeCourseWithDuplicateArticleSameUnit()

		// Simulate user completed all resources up to and including the shared article in lesson 2
		// Note: progress still uses resource.id (what the server tracks)
		const progress = new Map<string, AssessmentProgress>([["nice_x218d1e03bb2ccb6a", { completed: true }]])

		const lock = buildResourceLockStatus(course, progress, true)

		// With componentResourceSourcedId, the unit test's lock status depends on whether
		// all previous resources (using their unique componentResourceSourcedId) are complete.
		// Since we only marked the article as complete (not all the lessons before it),
		// the unit test should still be locked
		expect(lock["u2-test"]).toBe(true)
	})

	test("Completed resources are always unlocked, but incomplete resources depend on prerequisites", () => {
		const course = makeCourseWhereLesson2ArticleAppearsLocked()
		const sharedArticleId = "nice_x218d1e03bb2ccb6a"

		// Start with only video in lesson 2 completed
		const progress = new Map<string, AssessmentProgress>([["vid-u2-l2-1", { completed: true }]])

		const lock = buildResourceLockStatus(course, progress, true)

		// The lesson 2 article should be unlocked (previous video complete)
		expect(lock[`cr-lesson-u2-2-${sharedArticleId}`]).toBe(false)

		// The lesson 6 article should be locked (its previous video is not complete AND article not complete)
		expect(lock[`cr-lesson-u2-6-${sharedArticleId}`]).toBe(true)

		// Now complete the article (this marks it complete everywhere)
		progress.set(sharedArticleId, { completed: true })
		const lock2 = buildResourceLockStatus(course, progress, true)

		// Both article instances are now unlocked because the article is marked complete
		// (completed resources are always accessible regardless of prerequisites)
		expect(lock2[`cr-lesson-u2-2-${sharedArticleId}`]).toBe(false)
		expect(lock2[`cr-lesson-u2-6-${sharedArticleId}`]).toBe(false)

		// This demonstrates the fix: each placement has its own lock key
		// Previously, both would share the same lock status
		// Now they can have different lock statuses based on their prerequisites
		// (though in this case both are unlocked due to completion)
	})

	test("The original bug is fixed: duplicate resources have independent lock keys", () => {
		const course = makeCourseWithDuplicateArticleSameUnit()
		const sharedArticleId = "nice_x218d1e03bb2ccb6a"

		// No progress at all
		const progress = new Map<string, AssessmentProgress>()
		const lock = buildResourceLockStatus(course, progress, true)

		// The first resource in the course should be unlocked
		const firstUnit = course.units[0]
		if (!firstUnit) {
			logger.error("test course has no units", { courseId: course.id })
			throw errors.new("course has no units")
		}
		const firstResourceId = getFirstResourceIdForUnit(firstUnit)
		expect(lock[firstResourceId]).toBe(false)

		// Both article placements should have their own entries in the lock object
		const lesson2ArticleKey = `cr-lesson-u2-2-${sharedArticleId}`
		const lesson6ArticleKey = `cr-lesson-u2-6-${sharedArticleId}`

		// Verify both keys exist in the lock object (this is the key fix)
		expect(lesson2ArticleKey in lock).toBe(true)
		expect(lesson6ArticleKey in lock).toBe(true)

		// And they are independent - not sharing the same key
		expect(lesson2ArticleKey).not.toBe(lesson6ArticleKey)

		// The old bug was that both would use the same key (the resource ID)
		// which would cause the second placement to overwrite the first's lock status
		// Now each has its own key based on componentResourceSourcedId
	})
})
