import * as React from "react"
import "server-only"
import * as logger from "@superbuilders/slog"
import {
	fetchCoursePageDataBase,
	fetchLessonLayoutDataBase,
	fetchUnitPageDataBase
} from "@/lib/course-bundle/course-loaders"

export const getCachedCoursePageData = React.cache(async (subject: string, course: string, skipQuestions: boolean) => {
	logger.debug("course page cache invoked", { subject, course, skipQuestions })
	return fetchCoursePageDataBase({ subject, course }, skipQuestions)
})

export const getCachedUnitPageData = React.cache(async (subject: string, course: string, unit: string) => {
	logger.debug("unit page cache invoked", { subject, course, unit })
	return fetchUnitPageDataBase({ subject, course, unit })
})

export const getCachedLessonLayoutData = React.cache(
	async (subject: string, course: string, unit: string, lesson: string) => {
		logger.debug("lesson layout cache invoked", { subject, course, unit, lesson })
		return fetchLessonLayoutDataBase({ subject, course, unit, lesson })
	}
)
