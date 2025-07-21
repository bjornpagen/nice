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
	logger.debug("unit page: fetching unit data", { params })

	// 1. Call the course page data fetcher with ONLY subject and course params
	// This ensures the cache key is consistent across all units in the same course
	const coursePageData = await fetchCoursePageData({
		subject: params.subject,
		course: params.course
	})

	// 2. Find the specific unit within the comprehensive course data.
	const currentUnit = coursePageData.course.units.find((u) => u.slug === params.unit)

	if (!currentUnit) {
		logger.error("unit not found within course units", {
			unitSlug: params.unit,
			courseId: coursePageData.course.id
		})
		notFound()
	}

	// 3. Return the unit page data
	return {
		params,
		course: coursePageData.course,
		allUnits: coursePageData.course.units,
		lessonCount: coursePageData.lessonCount,
		challenges: coursePageData.course.challenges,
		unit: currentUnit
	}
}
