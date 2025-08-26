import { describe, expect, test } from "bun:test"
import type { Course, Lesson, Quiz, Unit, UnitTest } from "@/lib/types/domain"
import { buildResourceLockStatus } from "@/lib/utils"

type AssessmentProgress = { completed: boolean; score?: number }

// This test constructs a course with a single unit where the SAME Article appears in
// lesson 2 and lesson 6 (mirroring the real dataset). Both placements share the SAME id
// `nice_x218d1e03bb2ccb6a` (OneRoster resource sourcedId). We simulate completion for the
// lesson 2 occurrence only. Under current global pass logic, the later (lesson 6) incomplete
// occurrence causes the Unit Test to remain locked. The assertion encodes the intuitive per-lesson
// expectation (unit test unlocked after first completion), so it should FAIL.

function makeCourseWithDuplicateArticleSameUnit(): Course {
    const sharedArticleId = "nice_x218d1e03bb2ccb6a" // Real sourcedId

    // Build 6 lessons in a single unit; lesson 2 and lesson 6 both include the same article id
    const lessons: Lesson[] = []
    for (let i = 1; i <= 6; i++) {
        const lesson: Lesson = {
            id: `lesson-u2-${i}`,
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
                type: "Video",
                ordering: 1,
                slug: "v-u2-l2-1",
                title: "Video before article (completed)",
                description: "",
                path: `/s/c/u2/l2/v/1`,
                xp: 0,
                youtubeId: "y1"
            })
            lesson.children.push({
                id: sharedArticleId,
                type: "Article",
                ordering: 2,
                slug: "activity-what-happens-during-a-solar-or-lunar-eclipse",
                title: "Activity: What happens during a solar or lunar eclipse?",
                description: "",
                path: `/s/c/u2/l2/a/activity-what-happens-during-a-solar-or-lunar-eclipse`,
                xp: 2
            })
        } else if (i === 6) {
            // Later duplicate occurrence: put an incomplete item before it to flip previousComplete to false
            lesson.children.push({
                id: "vid-u2-l6-1",
                type: "Video",
                ordering: 1,
                slug: "v-u2-l6-1",
                title: "Video before later duplicate (incomplete)",
                description: "",
                path: `/s/c/u2/l6/v/1`,
                xp: 0,
                youtubeId: "y2"
            })
            lesson.children.push({
                id: sharedArticleId,
                type: "Article",
                ordering: 2,
                slug: "activity-what-happens-during-a-solar-or-lunar-eclipse",
                title: "Activity: What happens during a solar or lunar eclipse?",
                description: "",
                path: `/s/c/u2/l6/a/activity-what-happens-during-a-solar-or-lunar-eclipse`,
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

describe("Duplicate article within the same unit impacts locking (lesson 2 and 6)", () => {
    test("Lesson 2 article should be unlocked after preceding complete, but duplicate later overwrites to locked (expected failing)", () => {
        const course = makeCourseWhereLesson2ArticleAppearsLocked()

        // Only mark the lesson 2 video as completed
        const progress = new Map<string, AssessmentProgress>([["vid-u2-l2-1", { completed: true }]])

        const lock = buildResourceLockStatus(course, progress, true)

        // Intuitive expectation: lesson 2 article should be unlocked since its previous is complete
        // Current logic: the later duplicate occurrence writes lock[articleId]=true due to its own previous being incomplete
        expect(lock["nice_x218d1e03bb2ccb6a"]).toBe(false)
    })

    test("Completing the shared article in lesson 2 should unlock unit test, but later duplicate incomplete keeps it locked (expected failing)", () => {
        const course = makeCourseWithDuplicateArticleSameUnit()

        // Simulate user completed the shared article at its lesson 2 occurrence only
        const progress = new Map<string, AssessmentProgress>([["nice_x218d1e03bb2ccb6a", { completed: true }]])

        const lock = buildResourceLockStatus(course, progress, true)

        // Intuitive expectation: after completing the article once (lesson 2), the unit test should be unlocked
        // Current logic: lesson 6 contains the same article id but incomplete, so previousComplete becomes false
        // near the end of the unit, leaving the unit test locked. Assert the intuitive behavior to force failure.
        expect(lock["u2-test"]).toBe(false)
    })
})


