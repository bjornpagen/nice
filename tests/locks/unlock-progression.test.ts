import { describe, expect, test } from "bun:test"
import type { Course, CourseChallenge, Lesson, Quiz, Unit } from "@/lib/types/domain"
import { buildResourceLockStatus } from "@/lib/utils"

type AssessmentProgress = { completed: boolean; score?: number }

function makeCourse(): Course {
	const lesson: Lesson = {
		id: "lesson-1",
		type: "Lesson",
		ordering: 1,
		slug: "l1",
		title: "Lesson 1",
		description: "",
		path: "/s/c/u/l/1",
		xp: 0,
		children: [
			{
				id: "video-1",
				type: "Video",
				ordering: 1,
				slug: "v1",
				title: "Video 1",
				description: "",
				path: "/s/c/u/l/v/1",
				xp: 0,
				youtubeId: "test123"
			},
			{
				id: "exercise-1",
				type: "Exercise",
				ordering: 2,
				slug: "e1",
				title: "Exercise 1",
				description: "",
				path: "/s/c/u/l/e/1",
				xp: 100,
				totalQuestions: 10,
				questionsToPass: 8
			}
		]
	}

	const quiz: Quiz = {
		id: "quiz-1",
		type: "Quiz",
		ordering: 2,
		slug: "q1",
		title: "Quiz 1",
		description: "",
		path: "/s/c/u/quiz/1",
		xp: 200,
		questions: [{ id: "q-1" }]
	}

	const unit: Unit = {
		id: "unit-1",
		slug: "u1",
		title: "Unit 1",
		description: "",
		path: "/s/c/u",
		ordering: 1,
		children: [lesson, quiz]
	}

	const challenge: CourseChallenge = {
		id: "challenge-1",
		type: "CourseChallenge",
		ordering: 999,
		slug: "cc1",
		title: "Course Challenge 1",
		description: "",
		path: "/s/c/challenge/1",
		xp: 300,
		questions: [{ id: "cc-q-1" }]
	}

	return {
		id: "course-1",
		slug: "c1",
		title: "Course 1",
		description: "",
		path: "/s/c",
		units: [unit],
		challenges: [challenge]
	}
}

describe("Resource unlocking delegation and threshold", () => {
	test("First resource is always unlocked (no progress)", () => {
		const course = makeCourse()
		const progress = new Map<string, AssessmentProgress>()
		const lock = buildResourceLockStatus(course, progress, true)
		expect(lock["video-1"]).toBe(false)
	})

	test("Next item remains locked when assessment score < threshold (79%): relies on server-provided progress", () => {
		const course = makeCourse()

		const progress = new Map<string, AssessmentProgress>([
			["video-1", { completed: true }],
			// Exercise completed but below proficiency threshold
			["exercise-1", { completed: true, score: 79 }]
			// No progress for quiz yet
		])

		const lock = buildResourceLockStatus(course, progress, true)

		// Ordered sequence: video-1 -> exercise-1 -> quiz-1
		// With 79 on exercise, quiz MUST remain locked.
		expect(lock["quiz-1"]).toBe(true)
	})

	test("Next item unlocks when assessment score >= threshold (80%): relies on server-provided progress", () => {
		const course = makeCourse()

		const progress = new Map<string, AssessmentProgress>([
			["video-1", { completed: true }],
			["exercise-1", { completed: true, score: 80 }]
		])

		const lock = buildResourceLockStatus(course, progress, true)

		// With 80 on exercise, quiz MUST be unlocked.
		expect(lock["quiz-1"]).toBe(false)
	})

	test("Locking disabled ignores thresholds and unlocks all", () => {
		const course = makeCourse()
		const progress = new Map<string, AssessmentProgress>()
		const lock = buildResourceLockStatus(course, progress, false)
		expect(lock["video-1"]).toBe(false)
		expect(lock["exercise-1"]).toBe(false)
		expect(lock["quiz-1"]).toBe(false)
	})

	test("Non-assessment items depend on completed flag: incomplete video keeps exercise locked", () => {
		const course = makeCourse()
		const progress = new Map<string, AssessmentProgress>([])
		const lock = buildResourceLockStatus(course, progress, true)
		// With no progress, exercise is locked because previous video not completed
		expect(lock["exercise-1"]).toBe(true)
	})

	test("Non-assessment items depend on completed flag: completed video unlocks exercise", () => {
		const course = makeCourse()
		const progress = new Map<string, AssessmentProgress>([["video-1", { completed: true }]])
		const lock = buildResourceLockStatus(course, progress, true)
		// Video complete -> exercise unlocked (regardless of exercise score)
		expect(lock["exercise-1"]).toBe(false)
	})

	test("Assessment with missing score does NOT unlock next (requires numeric score)", () => {
		const course = makeCourse()
		const progress = new Map<string, AssessmentProgress>([
			["video-1", { completed: true }],
			["exercise-1", { completed: true }]
		])
		const lock = buildResourceLockStatus(course, progress, true)
		// No numeric score for exercise -> quiz remains locked
		expect(lock["quiz-1"]).toBe(true)
	})

	test("Assessment with score >= threshold unlocks next even if completed=false (partial grade)", () => {
		const course = makeCourse()
		const progress = new Map<string, AssessmentProgress>([
			["video-1", { completed: true }],
			// Simulate partially graded: completed=false but score present
			["exercise-1", { completed: false, score: 85 }]
		])
		const lock = buildResourceLockStatus(course, progress, true)
		// Current logic: uses score threshold for assessments, independent of completed
		expect(lock["quiz-1"]).toBe(false)
	})

	test("Out-of-order completion: completed later assessment unlocks itself even if previous is below threshold", () => {
		const course = makeCourse()
		const progress = new Map<string, AssessmentProgress>([
			["video-1", { completed: true }],
			["exercise-1", { completed: true, score: 60 }],
			["quiz-1", { completed: true, score: 95 }]
		])
		const lock = buildResourceLockStatus(course, progress, true)
		// Even if previous (exercise) < threshold, the quiz itself is marked complete with high score -> unlocked
		expect(lock["quiz-1"]).toBe(false)
	})

	test("Course challenge remains locked until prior assessment meets threshold; then unlocks", () => {
		const course = makeCourse()
		// Only video complete and exercise below threshold
		let progress = new Map<string, AssessmentProgress>([
			["video-1", { completed: true }],
			["exercise-1", { completed: true, score: 70 }]
		])
		let lock = buildResourceLockStatus(course, progress, true)
		// quiz depends on exercise threshold; challenge depends on quiz threshold
		expect(lock["quiz-1"]).toBe(true)
		expect(lock["challenge-1"]).toBe(true)

		// Now raise exercise to exact threshold and quiz to threshold
		progress = new Map<string, AssessmentProgress>([
			["video-1", { completed: true }],
			["exercise-1", { completed: true, score: 80 }],
			["quiz-1", { completed: true, score: 80 }]
		])
		lock = buildResourceLockStatus(course, progress, true)
		// With both at threshold, challenge should be unlocked
		expect(lock["challenge-1"]).toBe(false)
	})
})
