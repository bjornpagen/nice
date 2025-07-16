import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import type { UnitPageData } from "@/lib/types/page"
import { fetchCoursePageData } from "./course" // Import the top-level data fetcher

export async function fetchUnitPageData(params: {
	subject: string
	course: string
	unit: string
}): Promise<UnitPageData> {
	"use cache"
	logger.debug("unit page: fetching unit data by calling parent fetcher", { params })

	// 1. Call the top-level course page data fetcher to get all data for the course.
	// Next.js caching will deduplicate this call if it's made elsewhere in the same request.
	const coursePageData = await fetchCoursePageData(params)

	// 2. Find the specific unit within the comprehensive course data.
	const currentUnit = coursePageData.course.units.find((u) => u.slug === params.unit)

	if (!currentUnit) {
		logger.error("unit page: unit not found in course data", {
			unitSlug: params.unit,
			courseId: coursePageData.course.id
		})
		notFound()
	}

	// 3. Assemble and return the required data structure for the unit page.
	// This structure is identical to before, but the data is now derived, not re-fetched.
	return {
		params,
		course: coursePageData.course,
		allUnits: coursePageData.course.units,
		lessonCount: coursePageData.lessonCount,
		challenges: coursePageData.course.challenges,
		unit: currentUnit
	}
}
