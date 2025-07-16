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
	"use cache"
	// 1. Call the parent data fetcher to get all necessary context up to the unit level.
	const unitPageData = await fetchUnitPageData(params)

	// 2. Find the specific lesson from the already-fetched unit data.
	const currentLesson = unitPageData.unit.children.find(
		(child) => child.type === "Lesson" && child.slug === params.lesson
	)

	if (!currentLesson) {
		logger.error("lesson not found in unit children", { lessonSlug: params.lesson, unitId: unitPageData.unit.id })
		notFound()
	}

	// Ensure the found child is of type Lesson before returning.
	if (currentLesson.type !== "Lesson") {
		logger.error("found content is not a lesson", { lessonSlug: params.lesson, type: currentLesson.type })
		notFound()
	}

	// 3. Assemble and return the required data structure for the lesson layout.
	return {
		subject: params.subject,
		courseData: { title: unitPageData.course.title, path: unitPageData.course.path },
		unitData: unitPageData.unit,
		lessonData: currentLesson
	}
}
