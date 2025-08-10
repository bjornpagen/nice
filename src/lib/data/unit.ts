import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import type { UnitPageData } from "@/lib/types/page"
import { assertNoEncodedColons } from "@/lib/utils"
import { fetchCoursePageData } from "./course"

export async function fetchUnitPageData(params: {
	subject: string
	course: string
	unit: string
}): Promise<UnitPageData> {
	// Opt into dynamic rendering to ensure external fetches (e.g., OneRoster token) occur during request lifecycle
	await connection()
	// Defensive check: middleware should have normalized URLs
	assertNoEncodedColons(params.unit, "fetchUnitPageData unit parameter")

	// Fetch the course data first - this already handles subject and course decoding
	const coursePageData = await fetchCoursePageData(
		{ subject: params.subject, course: params.course },
		{ skip: { questions: true } }
	)
	const course = coursePageData.course

	// Find the specific unit
	const unit = course.units.find((unit) => unit.slug === params.unit)

	if (!unit) {
		logger.error("unit not found within course units", {
			unitSlug: params.unit,
			originalUnitParam: params.unit,
			courseId: course.id
		})
		notFound()
	}

	// 3. Calculate total XP for the unit
	let totalXP = 0

	for (const child of unit.children) {
		if (child.type === "Lesson") {
			// Add XP from lesson content (videos, articles, exercises)
			for (const content of child.children) {
				totalXP += content.xp
			}
		} else {
			// Add XP from quizzes and unit tests
			totalXP += child.xp
		}
	}

	// 4. Return the unit page data
	return {
		params,
		course: course,
		allUnits: course.units,
		lessonCount: coursePageData.lessonCount,
		challenges: course.challenges,
		unit: unit,
		totalXP
	}
}
