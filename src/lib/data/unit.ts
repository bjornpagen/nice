import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import type { UnitPageData } from "@/lib/types/page"
import { fetchCoursePageData } from "./course"

export async function fetchUnitPageData(params: {
	subject: string
	course: string
	unit: string
}): Promise<UnitPageData> {
	logger.info("fetchUnitPageData called", { params })
	const decodedUnit = decodeURIComponent(params.unit)
	logger.debug("unit page: fetching unit data", { params, decodedUnit })

	// 1. Call the course page data fetcher with ONLY subject and course params
	// This ensures the cache key is consistent across all units in the same course
	const coursePageData = await fetchCoursePageData(
		{
			subject: params.subject,
			course: params.course
		},
		{ skip: { questions: true } }
	)

	// 2. Find the specific unit within the comprehensive course data.
	// Use the decoded unit slug to handle special characters like colons
	const currentUnit = coursePageData.course.units.find((u) => u.slug === decodedUnit)

	if (!currentUnit) {
		logger.error("unit not found within course units", {
			unitSlug: decodedUnit,
			originalUnitParam: params.unit,
			courseId: coursePageData.course.id
		})
		notFound()
	}

	// 3. Calculate total XP for the unit
	let totalXP = 0

	for (const child of currentUnit.children) {
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
		course: coursePageData.course,
		allUnits: coursePageData.course.units,
		lessonCount: coursePageData.lessonCount,
		challenges: coursePageData.course.challenges,
		unit: currentUnit,
		totalXP
	}
}
