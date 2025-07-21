import * as logger from "@superbuilders/slog"
import { notFound } from "next/navigation"
import type { LessonLayoutData } from "@/lib/types/page"
import { fetchUnitPageData } from "./unit" // Import the parent data fetcher

export async function fetchLessonLayoutData(params: {
	subject: string
	course: string
	unit: string
	lesson: string
}): Promise<LessonLayoutData> {
	logger.info("fetchLessonLayoutData called", { params })
	logger.debug("unit page: fetching unit data", { params })

	// 1. Call the parent data fetcher with ONLY the params it needs
	// This ensures cache effectiveness - all lessons in the same unit share the cache
	const unitPageData = await fetchUnitPageData({
		subject: params.subject,
		course: params.course,
		unit: params.unit
	})

	// 2. Find the specific lesson from the already-fetched unit data.
	const currentLesson = unitPageData.unit.children.find(
		(child) => child.type === "Lesson" && child.slug === params.lesson
	)

	if (!currentLesson || currentLesson.type !== "Lesson") {
		logger.error("lesson not found or is not of type 'Lesson' within unit children", {
			lessonSlug: params.lesson,
			unitSourcedId: unitPageData.unit.id,
			foundType: currentLesson?.type
		})
		notFound()
	}

	// 3. Assemble and return the required data structure for the lesson layout.
	return {
		subject: params.subject,
		courseData: { id: unitPageData.course.id, title: unitPageData.course.title, path: unitPageData.course.path },
		unitData: unitPageData.unit,
		lessonData: currentLesson
	}
}
