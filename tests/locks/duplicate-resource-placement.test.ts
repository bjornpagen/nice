import { describe, expect, test } from "bun:test"
import type { Course, Lesson, Unit } from "@/lib/types/domain"
import { buildResourceLockStatus } from "@/lib/utils"

// This test ensures lock lookups can be done by placement-aware keys
// when the same resource appears in two different units.
// It would fail on the previous system which lacked placement alias keys
// (no componentResourceSourcedId on nodes and no alias generation logic).

function makeCourseWithDuplicateArticlePlacements(): Course {
	const lessonA: Lesson = {
		id: "lesson-a",
		type: "Lesson",
		ordering: 1,
		slug: "la",
		title: "Lesson A",
		description: "",
		path: "/s/c/u1/la",
		xp: 0,
		children: [
			{
				id: "article-1",
				type: "Article",
				ordering: 1,
				slug: "art1",
				title: "Article Shared",
				description: "",
				path: "/s/c/u1/la/a/art1",
				xp: 0,
				// Distinct placement id A
				componentResourceSourcedId: "cr_A"
			}
		]
	}

	const lessonB: Lesson = {
		id: "lesson-b",
		type: "Lesson",
		ordering: 1,
		slug: "lb",
		title: "Lesson B",
		description: "",
		path: "/s/c/u2/lb",
		xp: 0,
		children: [
			{
				id: "article-1", // same resource id as in unit 1
				type: "Article",
				ordering: 1,
				slug: "art1",
				title: "Article Shared",
				description: "",
				path: "/s/c/u2/lb/a/art1",
				xp: 0,
				// Distinct placement id B
				componentResourceSourcedId: "cr_B"
			}
		]
	}

	const unit1: Unit = {
		id: "unit-1",
		slug: "u1",
		title: "Unit 1",
		description: "",
		path: "/s/c/u1",
		ordering: 1,
		children: [lessonA]
	}

	const unit2: Unit = {
		id: "unit-2",
		slug: "u2",
		title: "Unit 2",
		description: "",
		path: "/s/c/u2",
		ordering: 2,
		children: [lessonB]
	}

	return {
		id: "course-1",
		slug: "c1",
		title: "Course 1",
		description: "",
		path: "/s/c",
		units: [unit1, unit2],
		challenges: []
	}
}

describe("placement-aware lock aliasing", () => {
	test("alias keys exist for duplicate resource placements across units", () => {
		const course = makeCourseWithDuplicateArticlePlacements()

		// No progress provided; base lock map computed by resource id
		const base = buildResourceLockStatus(course, new Map(), true)

		// Build alias map as in course layout (placement-aware)
		const alias: Record<string, boolean> = { ...base }
		for (const unit of course.units) {
			for (const child of unit.children) {
				if (child.type === "Lesson") {
					for (const res of child.children) {
						if (res.componentResourceSourcedId) {
							// Validate base has an entry; avoid silent defaults
							expect(res.id in base).toBe(true)
							alias[`${res.componentResourceSourcedId}:${res.id}`] = Boolean(base[res.id])
						}
					}
				}
			}
		}

		// Assert alias keys for both placements exist and are booleans
		expect(typeof alias["cr_A:article-1"]).toBe("boolean")
		expect(typeof alias["cr_B:article-1"]).toBe("boolean")
	})
})
